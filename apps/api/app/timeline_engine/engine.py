from __future__ import annotations

from datetime import date, timedelta

from app.schemas import Milestone, Requirement, Status


def add_business_days(start: date, days: int) -> date:
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:
            added += 1
    return current


def _validate_dependencies(requirements: list[Requirement]) -> None:
    graph = {r.id: [d for d in r.dependencies if d in {x.id for x in requirements}] for r in requirements}
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visiting:
            raise ValueError("Circular dependency detected")
        if node in visited:
            return
        visiting.add(node)
        for dependency in graph[node]:
            visit(dependency)
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        visit(node)


def generate(requirements: list[Requirement], start: date | None = None) -> list[Milestone]:
    _validate_dependencies(requirements)
    start = start or date.today()
    by_id = {r.id: r for r in requirements}
    scheduled: dict[str, Milestone] = {}

    def schedule(requirement: Requirement) -> Milestone:
        if requirement.id in scheduled:
            return scheduled[requirement.id]
        dependencies = [schedule(by_id[d]) for d in requirement.dependencies if d in by_id]
        begin = max((d.estimated_end_date for d in dependencies), default=start)
        maximum_end = add_business_days(begin, requirement.duration_estimate.maximum_days)
        milestone = Milestone(
            id=f"milestone-{requirement.id}", requirement_id=requirement.id,
            title=requirement.title, department=requirement.department,
            dependency_ids=[f"milestone-{d}" for d in requirement.dependencies if d in by_id],
            parallel_group_id=("parallel-" + "-".join(sorted(requirement.parallel_with + [requirement.id]))) if requirement.parallel_with else None,
            estimated_duration_minimum_days=requirement.duration_estimate.minimum_days,
            estimated_duration_maximum_days=requirement.duration_estimate.maximum_days,
            estimated_start_date=begin,
            estimated_end_date=maximum_end,
            next_action=f"Prepare the materials for {requirement.short_title}.",
            source_ids=requirement.source_ids,
        )
        scheduled[requirement.id] = milestone
        return milestone

    for item in requirements:
        schedule(item)
    milestones = list(scheduled.values())
    if milestones:
        latest = max(m.estimated_end_date for m in milestones)
        for milestone in milestones:
            milestone.is_critical_path = milestone.estimated_end_date == latest or any(
                child.is_critical_path and milestone.id in child.dependency_ids for child in milestones
            )
        roots = [m for m in milestones if not m.dependency_ids and m.status != Status.APPROVED]
        if roots:
            roots[0].is_blocking = True
    return milestones


def recalculate(milestones: list[Milestone], changed_id: str | None = None) -> list[Milestone]:
    by_id = {m.id: m for m in milestones}
    pending = set(by_id)
    while pending:
        progressed = False
        for milestone_id in list(pending):
            milestone = by_id[milestone_id]
            if all(dep not in pending for dep in milestone.dependency_ids):
                deps = [by_id[d] for d in milestone.dependency_ids if d in by_id]
                if deps:
                    milestone.estimated_start_date = max(d.estimated_end_date for d in deps)
                    milestone.estimated_end_date = add_business_days(milestone.estimated_start_date, milestone.estimated_duration_maximum_days)
                pending.remove(milestone_id)
                progressed = True
        if not progressed:
            raise ValueError("Circular milestone dependencies")
    for m in milestones:
        m.is_blocking = m.status not in {Status.APPROVED, Status.NA} and all(by_id[d].status in {Status.APPROVED, Status.NA} for d in m.dependency_ids)
    return milestones
