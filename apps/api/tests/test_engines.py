from datetime import date

import pytest

from app.rule_engine import evaluate, evaluate_condition
from app.schemas import DurationEstimate, ProjectIntake, Requirement
from app.timeline_engine import add_business_days, generate


def intake(**values):
    return ProjectIntake(name="Test project", project_type="food_business", **values)


def test_nested_conditions_and_operators():
    condition = {"all":[{"field":"count","operator":"greater_than_or_equal","value":5},{"any":[{"field":"kind","operator":"equals","value":"food"},{"field":"temp","operator":"equals","value":True}]},{"none":[{"field":"blocked","operator":"equals","value":True}]}]}
    assert evaluate_condition(condition, {"count":5,"kind":"food","temp":False,"blocked":False})[0]


def test_priority_and_duplicate_prevention():
    result = evaluate(intake(home_based=True, food_preparation=True))
    ids = [r.id for r in result.requirements]
    assert len(ids) == len(set(ids))
    assert result.traces[0].matched_rule_id == "home-food-business"


def test_parallel_schedule_and_business_days():
    result = evaluate(intake(home_based=True))
    milestones = {m.requirement_id:m for m in generate(result.requirements, date(2026, 7, 24))}
    assert milestones["health-review"].estimated_start_date == milestones["fire-review"].estimated_start_date
    assert add_business_days(date(2026, 7, 24), 1) == date(2026, 7, 27)


def test_circular_dependency_detection():
    base = dict(title="x", short_title="x", department="x", category="other", description="x", plain_language_explanation="x", why_required="x", duration_estimate=DurationEstimate(minimum_days=1, maximum_days=2))
    one = Requirement(id="one", dependencies=["two"], **base)
    two = Requirement(id="two", dependencies=["one"], **base)
    with pytest.raises(ValueError, match="Circular"):
        generate([one, two])
