/**
 * Demo Harbor fee configuration.
 *
 * Demo Harbor is fictional, so no rate here is "official". Rates are planning
 * figures used to demonstrate how fees are itemized. Amounts that depend only on
 * a flat rate are labelled "estimated"; amounts derived from a rate formula and
 * the project's inputs are labelled "calculated". Fees we know exist but cannot
 * price are "unknown" and never contribute to totals.
 */
export const FEE_SCHEDULE = {
  buildingPermitBase: 75,
  buildingPermitPerThousand: 12,
  planReviewRate: 0.65,
  zoningReview: 125,
  conservationReview: 200,
  fireReviewBase: 90,
  fireReviewPerSqft: 0.08,
  healthPermit: 250,
  homeBasedHealthSurcharge: 50,
  electricalBase: 85,
  electricalPerSqft: 0.05,
  plumbingBase: 85,
  plumbingPerSqft: 0.04,
  mechanicalBase: 75,
  mechanicalPerSqft: 0.04,
  gasPermit: 60,
  businessLicense: 50,
  eventPermit: 75,
  eventPerAttendeeOver50: 1,
  publicWorks: 150,
  occupancyCertificate: 40,
  finalInspection: 85,
  technologySurchargeRate: 0.035,
} as const;

/** IBC 2021 Table 1004.5 occupant-load factors (gross sq ft per occupant). */
export const OCCUPANT_LOAD_FACTORS: Record<string, { factor: number; basis: string }> = {
  residential: { factor: 200, basis: "IBC Table 1004.5 residential" },
  business: { factor: 150, basis: "IBC Table 1004.5 business" },
  assembly: { factor: 15, basis: "IBC Table 1004.5 assembly, unconcentrated" },
  mercantile: { factor: 60, basis: "IBC Table 1004.5 mercantile" },
  storage: { factor: 300, basis: "IBC Table 1004.5 storage" },
};
