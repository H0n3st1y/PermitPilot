import type { ConditionNode } from "@/lib/types";

function isGroup(node: ConditionNode): node is Extract<ConditionNode, { all?: unknown }> {
  return "all" in node || "any" in node || "none" in node;
}

function compare(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual);
    case "greater_than":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "greater_than_or_equal":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "less_than":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "less_than_or_equal":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "contains":
      return Array.isArray(actual) && actual.includes(expected);
    case "exists":
      return (actual !== undefined && actual !== null) === Boolean(expected);
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

export function evaluateCondition(
  node: ConditionNode,
  context: Record<string, unknown>,
): [boolean, string[]] {
  if (isGroup(node)) {
    if (node.all) {
      const results = node.all.map((item) => evaluateCondition(item, context));
      return [results.every(([matched]) => matched), results.flatMap(([, fields]) => fields)];
    }
    if (node.any) {
      const results = node.any.map((item) => evaluateCondition(item, context));
      const matched = results.some(([ok]) => ok);
      return [
        matched,
        results.filter(([ok]) => ok).flatMap(([, fields]) => fields),
      ];
    }
    if (node.none) {
      const results = node.none.map((item) => evaluateCondition(item, context));
      return [!results.some(([matched]) => matched), results.flatMap(([, fields]) => fields)];
    }
  }

  const leaf = node as { field: string; operator: string; value?: unknown };
  const matched = compare(context[leaf.field], leaf.operator, leaf.value);
  return matched ? [true, [`${leaf.field} ${leaf.operator} ${String(leaf.value)}`]] : [false, []];
}
