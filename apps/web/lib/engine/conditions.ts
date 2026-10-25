import type { ConditionNode } from "@/lib/types";

// true when this node is an all / any / none group
function isGroup(node: ConditionNode): node is Extract<ConditionNode, { all?: unknown }> {
  return "all" in node || "any" in node || "none" in node;
}

// just the operators the rule json uses
function compare(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    // same value
    case "equals":
      return actual === expected;
    // different value
    case "not_equals":
      return actual !== expected;
    // actual is one of the expected list
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    // actual is not in the expected list
    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual);
    // both numbers, and actual is greater
    case "greater_than":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    // both numbers, and actual is greater or equal
    case "greater_than_or_equal":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    // both numbers, and actual is smaller
    case "less_than":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    // both numbers, and actual is smaller or equal
    case "less_than_or_equal":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    // actual is a list that contains the expected item
    case "contains":
      return Array.isArray(actual) && actual.includes(expected);
    // field is present when expected is true, missing when expected is false
    case "exists":
      return (actual !== undefined && actual !== null) === Boolean(expected);
    // anything else isn't an operator we know
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

export function evaluateCondition(
  node: ConditionNode,
  context: Record<string, unknown>,
): [boolean, string[]] {
  // groups can be all / any / none
  if (isGroup(node)) {
    // every child has to match
    if (node.all) {
      const results = node.all.map((item) => evaluateCondition(item, context));
      return [results.every(([matched]) => matched), results.flatMap(([, fields]) => fields)];
    }
    // any one child is enough, and we only report the ones that hit
    if (node.any) {
      const results = node.any.map((item) => evaluateCondition(item, context));
      const matched = results.some(([ok]) => ok);
      return [
        matched,
        results.filter(([ok]) => ok).flatMap(([, fields]) => fields),
      ];
    }
    // none of the children may match
    if (node.none) {
      const results = node.none.map((item) => evaluateCondition(item, context));
      return [!results.some(([matched]) => matched), results.flatMap(([, fields]) => fields)];
    }
  }

  const leaf = node as { field: string; operator: string; value?: unknown };
  const matched = compare(context[leaf.field], leaf.operator, leaf.value);
  // a hit also records which field comparison matched
  return matched ? [true, [`${leaf.field} ${leaf.operator} ${String(leaf.value)}`]] : [false, []];
}
