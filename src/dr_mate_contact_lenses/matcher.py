from __future__ import annotations

from decimal import Decimal, InvalidOperation
from enum import StrEnum
from typing import Any, Iterable

from dr_mate_contact_lenses.models import (
    ConditionOperator,
    LifecycleStatus,
    MatchContext,
    MatchFinding,
    MatchResult,
    MatchStatus,
    MatchingRule,
    ProductRecord,
    RuleOutcome,
    RulePhase,
    RuleSet,
    RuleStatus,
)

DEFAULT_PREFIT_PHASES = {
    RulePhase.CANDIDATE_RELEVANCE,
    RulePhase.PARAMETER_COMPATIBILITY,
    RulePhase.INITIAL_TRIAL,
}


class TruthValue(StrEnum):
    TRUE = "true"
    FALSE = "false"
    UNKNOWN = "unknown"


_MISSING = object()


def _resolve_field(context: MatchContext, field: str) -> Any:
    current: Any = context.model_dump(mode="python")
    for part in field.split("."):
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return _MISSING
    return current


def _as_decimal(value: Any) -> Decimal:
    if isinstance(value, bool):
        raise InvalidOperation
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _compare_numeric(actual: Any, expected: Any, operator: ConditionOperator) -> bool:
    actual_decimal = _as_decimal(actual)
    expected_decimal = _as_decimal(expected)
    if operator == ConditionOperator.LESS_THAN:
        return actual_decimal < expected_decimal
    if operator == ConditionOperator.LESS_THAN_OR_EQUAL:
        return actual_decimal <= expected_decimal
    if operator == ConditionOperator.GREATER_THAN:
        return actual_decimal > expected_decimal
    if operator == ConditionOperator.GREATER_THAN_OR_EQUAL:
        return actual_decimal >= expected_decimal
    raise ValueError(f"unsupported numeric operator: {operator}")


def evaluate_condition(rule: MatchingRule, index: int, context: MatchContext) -> TruthValue:
    condition = rule.conditions[index]
    actual = _resolve_field(context, condition.field)

    if condition.operator == ConditionOperator.ABSENT:
        return TruthValue.TRUE if actual is _MISSING or actual is None else TruthValue.FALSE
    if condition.operator == ConditionOperator.PRESENT:
        return TruthValue.FALSE if actual is _MISSING or actual is None else TruthValue.TRUE
    if actual is _MISSING or actual is None:
        return TruthValue.UNKNOWN

    expected = condition.value
    try:
        if condition.operator == ConditionOperator.EQUALS:
            matched = actual == expected
        elif condition.operator == ConditionOperator.NOT_EQUALS:
            matched = actual != expected
        elif condition.operator in {
            ConditionOperator.CONTAINS_ANY,
            ConditionOperator.CONTAINS_ALL,
        }:
            if not isinstance(expected, list) or not isinstance(
                actual, (set, list, tuple)
            ):
                return TruthValue.FALSE
            actual_values = set(actual)
            expected_values = set(expected)
            if condition.operator == ConditionOperator.CONTAINS_ANY:
                matched = bool(actual_values & expected_values)
            else:
                matched = expected_values <= actual_values
        elif condition.operator == ConditionOperator.BETWEEN_INCLUSIVE:
            if not isinstance(expected, list) or len(expected) != 2:
                return TruthValue.FALSE
            actual_decimal = _as_decimal(actual)
            matched = _as_decimal(expected[0]) <= actual_decimal <= _as_decimal(
                expected[1]
            )
        elif condition.operator in {
            ConditionOperator.LESS_THAN,
            ConditionOperator.LESS_THAN_OR_EQUAL,
            ConditionOperator.GREATER_THAN,
            ConditionOperator.GREATER_THAN_OR_EQUAL,
        }:
            matched = _compare_numeric(actual, expected, condition.operator)
        else:
            raise ValueError(f"unsupported condition operator: {condition.operator}")
    except (InvalidOperation, TypeError, ValueError):
        return TruthValue.FALSE

    return TruthValue.TRUE if matched else TruthValue.FALSE


def evaluate_rule(rule: MatchingRule, context: MatchContext) -> TruthValue:
    values = [
        evaluate_condition(rule, index, context)
        for index in range(len(rule.conditions))
    ]

    if rule.match_mode == "all":
        if any(value == TruthValue.FALSE for value in values):
            return TruthValue.FALSE
        if any(value == TruthValue.UNKNOWN for value in values):
            return TruthValue.UNKNOWN
        return TruthValue.TRUE

    if any(value == TruthValue.TRUE for value in values):
        return TruthValue.TRUE
    if any(value == TruthValue.UNKNOWN for value in values):
        return TruthValue.UNKNOWN
    return TruthValue.FALSE


def _outcome_for(rule: MatchingRule, value: TruthValue) -> RuleOutcome | None:
    if value == TruthValue.TRUE:
        return rule.on_true
    if value == TruthValue.FALSE:
        return rule.on_false
    return rule.on_unknown


def _overall_status(findings: list[MatchFinding]) -> MatchStatus:
    priority = {
        MatchStatus.INFORMATION: 0,
        MatchStatus.SUPPORTED_CANDIDATE: 1,
        MatchStatus.INSUFFICIENT_DATA: 2,
        MatchStatus.MANUAL_REVIEW: 3,
        MatchStatus.OUTSIDE_PUBLISHED_SPEC: 4,
        MatchStatus.CONTRAINDICATED: 5,
    }
    if not findings:
        return MatchStatus.MANUAL_REVIEW
    return max((finding.status for finding in findings), key=priority.__getitem__)


def match_product(
    product: ProductRecord,
    ruleset: RuleSet,
    context: MatchContext,
    phases: Iterable[RulePhase] | None = None,
) -> MatchResult:
    if product.status == LifecycleStatus.DRAFT:
        raise ValueError("draft product records cannot participate in matching")
    if ruleset.product_id != product.product_id:
        raise ValueError("ruleset product_id does not match product")
    if ruleset.status != RuleStatus.ACTIVE:
        raise ValueError("only an active ruleset can be evaluated")

    selected_phases = set(phases or DEFAULT_PREFIT_PHASES)
    findings: list[MatchFinding] = []
    evaluated_rule_ids: list[str] = []
    skipped_rule_ids: list[str] = []
    used_sources = set(product.source_revision_ids)

    for rule in ruleset.rules:
        if rule.status != RuleStatus.ACTIVE or rule.phase not in selected_phases:
            skipped_rule_ids.append(rule.rule_id)
            continue

        evaluated_rule_ids.append(rule.rule_id)
        used_sources.update(rule.source_revision_ids)
        truth = evaluate_rule(rule, context)
        outcome = _outcome_for(rule, truth)
        if outcome is None:
            continue
        findings.append(
            MatchFinding(
                rule_id=rule.rule_id,
                phase=rule.phase,
                status=outcome.status,
                code=outcome.code,
                message=outcome.message,
                details=outcome.details,
                source_revision_ids=rule.source_revision_ids,
            )
        )

    return MatchResult(
        product_id=product.product_id,
        product_record_version=product.record_version,
        catalog_version=product.catalog_version,
        ruleset_id=ruleset.ruleset_id,
        ruleset_version=ruleset.ruleset_version,
        overall_status=_overall_status(findings),
        findings=findings,
        evaluated_rule_ids=evaluated_rule_ids,
        skipped_rule_ids=skipped_rule_ids,
        source_revision_ids=sorted(used_sources),
    )
