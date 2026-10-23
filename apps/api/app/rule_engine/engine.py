from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.schemas import EvaluationResult, EvaluationTrace, ProjectIntake, Requirement

DATA = Path(__file__).parents[1] / "data"


def _compare(actual: Any, operator: str, expected: Any) -> bool:
    operations = {
        "equals": lambda: actual == expected,
        "not_equals": lambda: actual != expected,
        "in": lambda: actual in expected,
        "not_in": lambda: actual not in expected,
        "greater_than": lambda: actual is not None and actual > expected,
        "greater_than_or_equal": lambda: actual is not None and actual >= expected,
        "less_than": lambda: actual is not None and actual < expected,
        "less_than_or_equal": lambda: actual is not None and actual <= expected,
        "contains": lambda: actual is not None and expected in actual,
        "exists": lambda: (actual is not None) == bool(expected),
    }
    if operator not in operations:
        raise ValueError(f"Unsupported operator: {operator}")
    return operations[operator]()


def evaluate_condition(node: dict[str, Any], context: dict[str, Any]) -> tuple[bool, list[str]]:
    for group, reducer in (("all", all), ("any", any)):
        if group in node:
            results = [evaluate_condition(item, context) for item in node[group]]
            return reducer(result[0] for result in results), [x for r in results for x in r[1]]
    if "none" in node:
        results = [evaluate_condition(item, context) for item in node["none"]]
        return not any(result[0] for result in results), [x for r in results for x in r[1]]
    field, operator, expected = node["field"], node["operator"], node.get("value")
    matched = _compare(context.get(field), operator, expected)
    return matched, [f"{field} {operator} {expected}"] if matched else []


def evaluate(intake: ProjectIntake) -> EvaluationResult:
    rules = json.loads((DATA / "rules.json").read_text())
    definitions = {r["id"]: Requirement.model_validate(r) for r in json.loads((DATA / "requirements.json").read_text())}
    selected: dict[str, Requirement] = {}
    traces: list[EvaluationTrace] = []
    warnings: list[str] = []
    context = intake.model_dump(mode="json")
    for rule in sorted(rules, key=lambda item: item["priority"], reverse=True):
        matched, conditions = evaluate_condition(rule["conditions"], context)
        if not matched:
            continue
        warnings.extend(w for w in rule["actions"].get("add_warnings", []) if w not in warnings)
        for requirement_id in rule["actions"]["add_requirements"]:
            if requirement_id not in selected:
                selected[requirement_id] = definitions[requirement_id]
                traces.append(EvaluationTrace(requirement_id=requirement_id, matched_rule_id=rule["id"], reason=rule["reason"], matched_conditions=conditions))
    return EvaluationResult(requirements=list(selected.values()), traces=traces, warnings=warnings)
