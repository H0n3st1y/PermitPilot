import type { RuleDefinition } from "@/lib/types";

export const RULES: RuleDefinition[] = [
  {
    id: "food-business",
    name: "Food business",
    priority: 90,
    conditions: {
      all: [{ field: "projectType", operator: "equals", value: "food_business" }],
    },
    actions: {
      addSteps: ["zoning-review", "health-permit", "fire-review", "business-license"],
      addWarnings: [],
    },
    reason: "The project is a food business.",
  },
  {
    id: "home-food-business",
    name: "Home-based food business",
    priority: 100,
    conditions: {
      all: [
        { field: "projectType", operator: "equals", value: "food_business" },
        { field: "homeBased", operator: "equals", value: true },
      ],
    },
    actions: {
      addSteps: ["zoning-review", "health-permit", "fire-review", "business-license"],
      addWarnings: [
        "Home-based food preparation may be restricted by municipal and state cottage-food rules. Confirm what you may sell from a residence.",
      ],
    },
    reason: "The project includes food preparation from a residence.",
  },
  {
    id: "room-addition",
    name: "Room addition or renovation",
    priority: 100,
    conditions: {
      all: [
        {
          field: "projectType",
          operator: "in",
          value: ["room_addition", "commercial_renovation"],
        },
      ],
    },
    actions: {
      addSteps: [
        "zoning-review",
        "building-permit",
        "plan-review",
        "fire-review",
        "final-inspection",
        "occupancy-certificate",
      ],
      addWarnings: [],
    },
    reason: "The project includes construction, addition, or renovation.",
  },
  {
    id: "public-event",
    name: "Public event",
    priority: 100,
    conditions: {
      all: [{ field: "projectType", operator: "equals", value: "public_event" }],
    },
    actions: {
      addSteps: ["event-permit", "fire-review", "public-works", "event-approval"],
      addWarnings: [
        "Temporary-event lead times vary. Confirm the required filing date directly with the clerk.",
      ],
    },
    reason: "The project is a temporary public event.",
  },
  {
    id: "event-food",
    name: "Event food service",
    priority: 110,
    conditions: {
      all: [
        { field: "projectType", operator: "equals", value: "public_event" },
        { field: "foodPreparation", operator: "equals", value: true },
      ],
    },
    actions: {
      addSteps: ["health-permit"],
      addWarnings: [],
    },
    reason: "Food will be prepared or served at the public event.",
  },
  {
    id: "waterfront-overlay",
    name: "Waterfront overlay",
    priority: 80,
    conditions: {
      all: [{ field: "zone", operator: "equals", value: "waterfront" }],
    },
    actions: {
      addSteps: ["conservation-review"],
      addWarnings: [
        "Waterfront overlay review can run in parallel with zoning but may extend the overall timeline.",
      ],
    },
    reason: "The project is located in the waterfront overlay.",
  },
  {
    id: "electrical-trade",
    name: "Electrical trade",
    priority: 70,
    conditions: {
      all: [{ field: "trades", operator: "contains", value: "electrical" }],
    },
    actions: {
      addSteps: ["electrical-permit"],
      addWarnings: [],
    },
    reason: "Electrical work was included in the project trades.",
  },
  {
    id: "plumbing-trade",
    name: "Plumbing trade",
    priority: 70,
    conditions: {
      all: [{ field: "trades", operator: "contains", value: "plumbing" }],
    },
    actions: {
      addSteps: ["plumbing-permit"],
      addWarnings: [],
    },
    reason: "Plumbing work was included in the project trades.",
  },
  {
    id: "mechanical-trade",
    name: "Mechanical trade",
    priority: 70,
    conditions: {
      all: [{ field: "trades", operator: "contains", value: "mechanical" }],
    },
    actions: {
      addSteps: ["mechanical-permit"],
      addWarnings: [],
    },
    reason: "Mechanical or HVAC work was included in the project trades.",
  },
  {
    id: "gas-trade",
    name: "Fuel-gas trade",
    priority: 70,
    conditions: {
      all: [{ field: "trades", operator: "contains", value: "gas" }],
    },
    actions: {
      addSteps: ["gas-permit"],
      addWarnings: [],
    },
    reason: "Fuel-gas work was included in the project trades.",
  },
  {
    id: "assembly-occupancy",
    name: "Assembly occupancy",
    priority: 85,
    conditions: {
      any: [
        { field: "occupancy", operator: "equals", value: "assembly" },
        { field: "occupantLoad", operator: "greater_than_or_equal", value: 50 },
        { field: "publicAttendance", operator: "equals", value: true },
      ],
    },
    actions: {
      addSteps: ["fire-review"],
      addWarnings: [
        "Occupant load of 50 or more typically triggers a fire-prevention review of exits and occupant load posting.",
      ],
    },
    reason: "Assembly use, public attendance, or occupant load of 50 or more was selected.",
  },
  {
    id: "commercial-use",
    name: "Commercial occupancy",
    priority: 60,
    conditions: {
      any: [
        { field: "occupancy", operator: "in", value: ["business", "mercantile"] },
        { field: "projectType", operator: "equals", value: "commercial_renovation" },
      ],
    },
    actions: {
      addSteps: ["business-license", "fire-review"],
      addWarnings: [],
    },
    reason: "A commercial occupancy or renovation was selected.",
  },
];
