import { FEE_SCHEDULE } from "@/fixtures/fees";
import type { FeeBreakdown, FeeLineItem, PermitStep, ProjectConfig } from "@/lib/types";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateFees(config: ProjectConfig, steps: PermitStep[]): FeeBreakdown {
  const ids = new Set(steps.map((step) => step.id));
  const lineItems: FeeLineItem[] = [];
  const thousands = Math.max(1, Math.ceil(config.estimatedValuation / 1000));

  const add = (
    id: string,
    label: string,
    department: string,
    amount: number,
    basis: string,
    kind: FeeLineItem["kind"] = "base",
  ) => {
    if (amount <= 0) return;
    lineItems.push({ id, label, department, amount: roundCurrency(amount), basis, kind });
  };

  if (ids.has("zoning-review")) {
    add("fee-zoning", "Zoning compatibility review", "Zoning", FEE_SCHEDULE.zoningReview, "Fixed demonstration review fee");
  }
  if (ids.has("conservation-review")) {
    add("fee-conservation", "Waterfront conservation review", "Conservation", FEE_SCHEDULE.conservationReview, "Waterfront overlay surcharge");
  }
  if (ids.has("building-permit")) {
    const amount = FEE_SCHEDULE.buildingPermitBase + FEE_SCHEDULE.buildingPermitPerThousand * thousands;
    add(
      "fee-building",
      "Building permit",
      "Building",
      amount,
      `$${FEE_SCHEDULE.buildingPermitBase} base + $${FEE_SCHEDULE.buildingPermitPerThousand} per $1,000 of valuation`,
    );
  }
  if (ids.has("plan-review")) {
    const building = lineItems.find((item) => item.id === "fee-building")?.amount
      ?? FEE_SCHEDULE.buildingPermitBase + FEE_SCHEDULE.buildingPermitPerThousand * thousands;
    add(
      "fee-plan-review",
      "Plan review",
      "Building",
      building * FEE_SCHEDULE.planReviewRate,
      `${Math.round(FEE_SCHEDULE.planReviewRate * 100)}% of the building permit fee`,
    );
  }
  if (ids.has("fire-review")) {
    const occupancySurcharge =
      config.occupancy === "assembly" || config.foodPreparation || config.projectType === "food_business"
        ? FEE_SCHEDULE.fireReviewPerSqft * config.squareFootage
        : 0;
    add(
      "fee-fire",
      "Fire-prevention review",
      "Fire Prevention",
      FEE_SCHEDULE.fireReviewBase + occupancySurcharge,
      occupancySurcharge
        ? `$${FEE_SCHEDULE.fireReviewBase} base + $${FEE_SCHEDULE.fireReviewPerSqft}/sq ft`
        : `Fixed review fee of $${FEE_SCHEDULE.fireReviewBase}`,
    );
  }
  if (ids.has("health-permit")) {
    add("fee-health", "Health permit", "Public Health", FEE_SCHEDULE.healthPermit, "Food establishment permit");
    if (config.homeBased) {
      add(
        "fee-health-home",
        "Home-based inspection surcharge",
        "Public Health",
        FEE_SCHEDULE.homeBasedHealthSurcharge,
        "Additional site inspection for a residence",
        "surcharge",
      );
    }
  }
  if (ids.has("electrical-permit")) {
    add(
      "fee-electrical",
      "Electrical permit",
      "Building",
      FEE_SCHEDULE.electricalBase + FEE_SCHEDULE.electricalPerSqft * config.squareFootage,
      `$${FEE_SCHEDULE.electricalBase} + $${FEE_SCHEDULE.electricalPerSqft}/sq ft`,
    );
  }
  if (ids.has("plumbing-permit")) {
    add(
      "fee-plumbing",
      "Plumbing permit",
      "Building",
      FEE_SCHEDULE.plumbingBase + FEE_SCHEDULE.plumbingPerSqft * config.squareFootage,
      `$${FEE_SCHEDULE.plumbingBase} + $${FEE_SCHEDULE.plumbingPerSqft}/sq ft`,
    );
  }
  if (ids.has("mechanical-permit")) {
    add(
      "fee-mechanical",
      "Mechanical / HVAC permit",
      "Building",
      FEE_SCHEDULE.mechanicalBase + FEE_SCHEDULE.mechanicalPerSqft * config.squareFootage,
      `$${FEE_SCHEDULE.mechanicalBase} + $${FEE_SCHEDULE.mechanicalPerSqft}/sq ft`,
    );
  }
  if (ids.has("gas-permit")) {
    add("fee-gas", "Fuel-gas permit", "Building", FEE_SCHEDULE.gasPermit, "Fixed fuel-gas permit");
  }
  if (ids.has("business-license")) {
    add("fee-business", "Business registration", "City Clerk", FEE_SCHEDULE.businessLicense, "Local registration");
  }
  if (ids.has("event-permit")) {
    const extra = Math.max(0, (config.visitorCount ?? 0) - 50) * FEE_SCHEDULE.eventPerAttendeeOver50;
    add(
      "fee-event",
      "Temporary event application",
      "City Clerk",
      FEE_SCHEDULE.eventPermit + extra,
      extra ? `$${FEE_SCHEDULE.eventPermit} + $1 per attendee over 50` : `Fixed application fee of $${FEE_SCHEDULE.eventPermit}`,
    );
  }
  if (ids.has("public-works")) {
    add("fee-works", "Public-way review", "Public Works", FEE_SCHEDULE.publicWorks, "Street and sidewalk occupancy review");
  }
  if (ids.has("occupancy-certificate")) {
    add("fee-c-of-o", "Certificate of occupancy", "Building", FEE_SCHEDULE.occupancyCertificate, "Close-out certificate");
  }
  if (ids.has("final-inspection")) {
    add("fee-final-insp", "Final building inspection", "Building", FEE_SCHEDULE.finalInspection, "Close-out inspection");
  }

  const baseFees = roundCurrency(
    lineItems.filter((item) => item.kind === "base").reduce((sum, item) => sum + item.amount, 0),
  );
  const departmentalSurcharges = roundCurrency(
    lineItems.filter((item) => item.kind === "surcharge").reduce((sum, item) => sum + item.amount, 0),
  );
  const subtotal = roundCurrency(baseFees + departmentalSurcharges);
  const permitCount = lineItems.filter((item) => item.kind === "base").length;
  const technology = roundCurrency(subtotal * FEE_SCHEDULE.technologySurchargeRate);
  const state = roundCurrency(permitCount * FEE_SCHEDULE.stateSurchargePerPermit);

  add(
    "fee-tech",
    "Technology surcharge",
    "City Clerk",
    technology,
    `${(FEE_SCHEDULE.technologySurchargeRate * 100).toFixed(1)}% of departmental fees`,
    "surcharge",
  );
  add(
    "fee-state",
    "State permit surcharge",
    "Commonwealth",
    state,
    `$${FEE_SCHEDULE.stateSurchargePerPermit.toFixed(2)} per departmental permit (demonstration)`,
    "surcharge",
  );

  const surcharges = roundCurrency(
    lineItems.filter((item) => item.kind === "surcharge").reduce((sum, item) => sum + item.amount, 0),
  );
  const total = roundCurrency(baseFees + surcharges);

  return {
    lineItems,
    baseFees,
    surcharges,
    total,
    currency: "USD",
    notes: [
      "Fees are demonstration estimates for Demo Harbor and are not an official invoice.",
      "Valuation, square footage, occupancy, and selected trades change both which fees apply and their amounts.",
    ],
  };
}
