import { FEE_SCHEDULE } from "@/fixtures/fees";
import type { FeeBasisType, FeeBreakdown, FeeLineItem, PermitStep, ProjectConfig } from "@/lib/types";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(items: FeeLineItem[]): number {
  return roundCurrency(items.reduce((total, item) => total + (item.amount ?? 0), 0));
}

/**
 * Deterministically itemizes fees for the selected roadmap steps.
 * Every line is tied to the step that triggers it (or null for project-wide surcharges)
 * and carries a basis type so the UI never presents an estimate as an official amount.
 */
export function calculateFees(config: ProjectConfig, steps: Pick<PermitStep, "id">[]): FeeBreakdown {
  const ids = new Set(steps.map((step) => step.id));
  const lineItems: FeeLineItem[] = [];
  const thousands = Math.max(1, Math.ceil(config.estimatedValuation / 1000));

  const add = (item: Omit<FeeLineItem, "kind" | "amount"> & { amount: number | null; kind?: FeeLineItem["kind"] }) => {
    if (item.amount !== null && item.amount <= 0) return;
    lineItems.push({
      ...item,
      kind: item.kind ?? "base",
      amount: item.amount === null ? null : roundCurrency(item.amount),
    });
  };
  const flat = (stepId: string, id: string, label: string, department: string, amount: number, basis: string) => {
    if (!ids.has(stepId)) return;
    add({ id, stepId, label, department, amount, basis, basisType: "estimated" });
  };

  flat("zoning-review", "fee-zoning", "Zoning compatibility review", "Zoning", FEE_SCHEDULE.zoningReview, "Flat review fee");
  flat(
    "conservation-review",
    "fee-conservation",
    "Waterfront conservation review",
    "Conservation",
    FEE_SCHEDULE.conservationReview,
    "Flat overlay review fee",
  );

  const buildingFee = FEE_SCHEDULE.buildingPermitBase + FEE_SCHEDULE.buildingPermitPerThousand * thousands;
  if (ids.has("building-permit")) {
    add({
      id: "fee-building",
      stepId: "building-permit",
      label: "Building permit",
      department: "Building",
      amount: buildingFee,
      basis: `$${FEE_SCHEDULE.buildingPermitBase} base + $${FEE_SCHEDULE.buildingPermitPerThousand} per $1,000 of valuation (${thousands} × $1,000)`,
      basisType: "calculated",
    });
  }
  if (ids.has("plan-review")) {
    add({
      id: "fee-plan-review",
      stepId: "plan-review",
      label: "Plan review",
      department: "Building",
      amount: buildingFee * FEE_SCHEDULE.planReviewRate,
      basis: `${Math.round(FEE_SCHEDULE.planReviewRate * 100)}% of the building permit fee`,
      basisType: "calculated",
    });
  }
  if (ids.has("fire-review")) {
    const perSqft =
      config.occupancy === "assembly" || config.foodPreparation || config.projectType === "food_business";
    add({
      id: "fee-fire",
      stepId: "fire-review",
      label: "Fire-prevention review",
      department: "Fire Prevention",
      amount: FEE_SCHEDULE.fireReviewBase + (perSqft ? FEE_SCHEDULE.fireReviewPerSqft * config.squareFootage : 0),
      basis: perSqft
        ? `$${FEE_SCHEDULE.fireReviewBase} base + $${FEE_SCHEDULE.fireReviewPerSqft}/sq ft for cooking or assembly use`
        : `Flat review fee of $${FEE_SCHEDULE.fireReviewBase}`,
      basisType: perSqft ? "calculated" : "estimated",
    });
  }
  if (ids.has("health-permit")) {
    add({
      id: "fee-health",
      stepId: "health-permit",
      label: config.projectType === "public_event" ? "Temporary food service permit" : "Food establishment permit",
      department: "Public Health",
      amount: FEE_SCHEDULE.healthPermit,
      basis: "Flat permit fee",
      basisType: "estimated",
    });
    if (config.homeBased) {
      add({
        id: "fee-health-home",
        stepId: "health-permit",
        label: "Home-based inspection surcharge",
        department: "Public Health",
        amount: FEE_SCHEDULE.homeBasedHealthSurcharge,
        basis: "Additional site inspection at a residence",
        basisType: "estimated",
        kind: "surcharge",
      });
    }
  }

  const trade = (stepId: string, id: string, label: string, base: number, perSqft: number) => {
    if (!ids.has(stepId)) return;
    add({
      id,
      stepId,
      label,
      department: "Building",
      amount: base + perSqft * config.squareFootage,
      basis: `$${base} + $${perSqft}/sq ft`,
      basisType: "calculated",
    });
  };
  trade("electrical-permit", "fee-electrical", "Electrical permit", FEE_SCHEDULE.electricalBase, FEE_SCHEDULE.electricalPerSqft);
  trade("plumbing-permit", "fee-plumbing", "Plumbing permit", FEE_SCHEDULE.plumbingBase, FEE_SCHEDULE.plumbingPerSqft);
  trade(
    "mechanical-permit",
    "fee-mechanical",
    "Mechanical / HVAC permit",
    FEE_SCHEDULE.mechanicalBase,
    FEE_SCHEDULE.mechanicalPerSqft,
  );
  flat("gas-permit", "fee-gas", "Fuel-gas permit", "Building", FEE_SCHEDULE.gasPermit, "Flat permit fee");
  flat("business-license", "fee-business", "Business registration", "City Clerk", FEE_SCHEDULE.businessLicense, "Flat registration fee");

  if (ids.has("event-permit")) {
    const over = Math.max(0, (config.visitorCount ?? 0) - 50);
    add({
      id: "fee-event",
      stepId: "event-permit",
      label: "Temporary event application",
      department: "City Clerk",
      amount: FEE_SCHEDULE.eventPermit + over * FEE_SCHEDULE.eventPerAttendeeOver50,
      basis: over
        ? `$${FEE_SCHEDULE.eventPermit} + $${FEE_SCHEDULE.eventPerAttendeeOver50} per attendee over 50 (${over} attendees)`
        : `Flat application fee of $${FEE_SCHEDULE.eventPermit}`,
      basisType: over ? "calculated" : "estimated",
    });
  }
  flat("public-works", "fee-works", "Public-way review", "Public Works", FEE_SCHEDULE.publicWorks, "Flat street and sidewalk review fee");
  flat(
    "occupancy-certificate",
    "fee-c-of-o",
    "Certificate of occupancy",
    "Building",
    FEE_SCHEDULE.occupancyCertificate,
    "Flat close-out fee",
  );
  flat("final-inspection", "fee-final-insp", "Final building inspection", "Building", FEE_SCHEDULE.finalInspection, "Flat inspection fee");

  const departmental = sum(lineItems);
  if (departmental > 0) {
    add({
      id: "fee-tech",
      stepId: null,
      label: "Technology surcharge",
      department: "City Clerk",
      amount: departmental * FEE_SCHEDULE.technologySurchargeRate,
      basis: `${(FEE_SCHEDULE.technologySurchargeRate * 100).toFixed(1)}% of departmental fees (${formatPlain(departmental)})`,
      basisType: "calculated",
      kind: "surcharge",
    });
  }
  if (ids.has("building-permit") || ids.has("electrical-permit") || ids.has("plumbing-permit")) {
    add({
      id: "fee-state",
      stepId: null,
      label: "State-mandated permit surcharges",
      department: "State",
      amount: null,
      basis: "Some states add per-permit surcharges. The amount is not configured, so ask the Building department.",
      basisType: "unknown",
      kind: "surcharge",
    });
  }

  const known = lineItems.filter((item) => item.amount !== null);
  const baseFees = sum(known.filter((item) => item.kind === "base"));
  const surcharges = sum(known.filter((item) => item.kind === "surcharge"));

  return {
    lineItems,
    baseFees,
    surcharges,
    total: roundCurrency(baseFees + surcharges),
    unknownCount: lineItems.length - known.length,
    currency: "USD",
    notes: [
      "Demo Harbor is fictional, so no amount here is an official fee. Treat the total as a planning estimate, not an invoice.",
      "Valuation, square footage, occupancy, and selected trades change which fees apply and how much they are.",
    ],
  };
}

export function feesForStep(fees: FeeBreakdown, stepId: string): FeeLineItem[] {
  return fees.lineItems.filter((item) => item.stepId === stepId);
}

export const FEE_BASIS_LABELS: Record<FeeBasisType, string> = {
  official: "Official",
  calculated: "Calculated",
  estimated: "Estimated",
  unknown: "Unknown",
};

export const FEE_BASIS_DESCRIPTIONS: Record<FeeBasisType, string> = {
  official: "Published by the municipality, with a cited fee schedule.",
  calculated: "Computed from a configured rate formula and your project details.",
  estimated: "A planning figure, not a published rate.",
  unknown: "A fee is expected but its amount is not known. It is left out of the total.",
};

function formatPlain(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
