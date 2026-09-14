import type { CodeCitation } from "@/lib/types";

/**
 * Demonstration references to published model codes.
 * These are not Demo Harbor law and are not a legal determination.
 */
export const CITATIONS: Record<string, CodeCitation> = {
  ibc105: {
    id: "ibc105",
    code: "IBC § 105.1",
    title: "Permits required",
    summary:
      "A permit is required before erecting, constructing, enlarging, altering, or changing the occupancy of a building, except where the code lists a specific exemption.",
    plainLanguage:
      "You generally need a building permit before you build, enlarge, or change how a space is used.",
    url: "https://codes.iccsafe.org/content/IBC2021P2/chapter-1-scope-and-administration#IBC2021P2_Ch01_Sec105",
    verificationStatus: "demo",
  },
  ibc107: {
    id: "ibc107",
    code: "IBC § 107.2.1",
    title: "Information on construction documents",
    summary:
      "Construction documents must be drawn to scale and describe the location, nature, and extent of the proposed work so reviewers can determine code compliance.",
    plainLanguage:
      "Your drawings need enough detail for the building department to check that the work follows the code.",
    url: "https://codes.iccsafe.org/content/IBC2021P2/chapter-1-scope-and-administration#IBC2021P2_Ch01_Sec107",
    verificationStatus: "demo",
  },
  ibc110: {
    id: "ibc110",
    code: "IBC § 110.3",
    title: "Required inspections",
    summary:
      "The building official is authorized to inspect work at required stages, including footing, framing, and final inspections, before a certificate of occupancy is issued.",
    plainLanguage:
      "Inspectors check the work at set points. A final inspection is usually required before you can occupy the space.",
    url: "https://codes.iccsafe.org/content/IBC2021P2/chapter-1-scope-and-administration#IBC2021P2_Ch01_Sec110",
    verificationStatus: "demo",
  },
  ibc111: {
    id: "ibc111",
    code: "IBC § 111.1",
    title: "Certificate of occupancy",
    summary:
      "A building or structure shall not be used or occupied until the building official has issued a certificate of occupancy as provided herein.",
    plainLanguage:
      "Do not open or live in the finished space until the city issues a certificate of occupancy.",
    url: "https://codes.iccsafe.org/content/IBC2021P2/chapter-1-scope-and-administration#IBC2021P2_Ch01_Sec111",
    verificationStatus: "demo",
  },
  ibc1004: {
    id: "ibc1004",
    code: "IBC § 1004.1",
    title: "Design occupant load",
    summary:
      "The number of occupants is computed from the floor area and the occupant-load factor in Table 1004.5, unless a more specific occupancy calculation applies.",
    plainLanguage:
      "How many people the space is designed for is based on its size and use. That number drives exits, restrooms, and fire review.",
    url: "https://codes.iccsafe.org/content/IBC2021P2/chapter-10-means-of-egress#IBC2021P2_Ch10_Sec1004",
    verificationStatus: "demo",
  },
  ifc105: {
    id: "ifc105",
    code: "IFC § 105.5",
    title: "Required operational permits",
    summary:
      "Operational permits may be required for activities such as public assemblies, hot-work, and certain hazardous operations as determined by the fire code official.",
    plainLanguage:
      "The fire department may need to approve events, cooking, or other activities before they start.",
    url: "https://codes.iccsafe.org/content/IFC2021P2/chapter-1-scope-and-administration#IFC2021P2_Ch01_Sec105",
    verificationStatus: "demo",
  },
  ifc904: {
    id: "ifc904",
    code: "IFC § 904.12",
    title: "Commercial cooking systems",
    summary:
      "Commercial cooking appliances that produce grease-laden vapors must be protected by an approved automatic fire-extinguishing system.",
    plainLanguage:
      "If you cook with grease, you typically need a hood and a fire-suppression system over the cooking equipment.",
    url: "https://codes.iccsafe.org/content/IFC2021P2/chapter-9-fire-protection-and-life-safety-systems#IFC2021P2_Ch09_Sec904",
    verificationStatus: "demo",
  },
  nec210: {
    id: "nec210",
    code: "NEC Art. 210",
    title: "Branch circuits",
    summary:
      "Branch-circuit wiring must be installed to serve the intended loads, with required receptacles, GFCI/AFCI protection, and conductor sizing per NFPA 70.",
    plainLanguage:
      "New electrical circuits must be sized and protected for the equipment you plan to use.",
    url: "https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70",
    verificationStatus: "demo",
  },
  ipc403: {
    id: "ipc403",
    code: "IPC § 403.1",
    title: "Minimum number of fixtures",
    summary:
      "Plumbing fixtures must be provided for the occupant load of each occupancy in accordance with Table 403.1.",
    plainLanguage:
      "The number of restrooms and sinks depends on how many people the space is designed to hold.",
    url: "https://codes.iccsafe.org/content/IPC2021P3/chapter-4-fixtures-faucets-and-fixture-fittings#IPC2021P3_Ch04_Sec403",
    verificationStatus: "demo",
  },
  imc507: {
    id: "imc507",
    code: "IMC § 507.1",
    title: "Commercial kitchen hoods",
    summary:
      "Type I hoods are required for appliances that produce grease or smoke; Type II hoods apply to heat and moisture producing equipment that does not produce grease.",
    plainLanguage:
      "Commercial cooking usually needs a special exhaust hood so grease, heat, and steam are removed safely.",
    url: "https://codes.iccsafe.org/content/IMC2021P2/chapter-5-exhaust-systems#IMC2021P2_Ch05_Sec507",
    verificationStatus: "demo",
  },
  ifgc106: {
    id: "ifgc106",
    code: "IFGC § 106.1",
    title: "Fuel-gas permits",
    summary:
      "A permit is required to install, enlarge, alter, repair, or replace fuel-gas piping or appliances, except as exempted by the code.",
    plainLanguage:
      "Work on gas piping or gas appliances usually needs its own permit.",
    url: "https://codes.iccsafe.org/content/IFGC2021P2/chapter-1-scope-and-administration#IFGC2021P2_Ch01_Sec106",
    verificationStatus: "demo",
  },
  zoning42: {
    id: "zoning42",
    code: "DHZO § 4.2",
    title: "Use compatibility (demonstration)",
    summary:
      "Demonstration Harbor Zoning Ordinance § 4.2 requires a zoning checkpoint before a change of use or an addition that increases floor area.",
    plainLanguage:
      "The zoning office checks that your project is allowed at this address before later permits move forward.",
    url: null,
    verificationStatus: "demo",
  },
  foodcode: {
    id: "foodcode",
    code: "Food Code § 8-301.11",
    title: "Prerequisite for operation",
    summary:
      "A person may not operate a food establishment without a valid permit issued by the regulatory authority.",
    plainLanguage:
      "You need a health permit before you prepare or sell food to the public.",
    url: "https://www.fda.gov/food/fda-food-code/food-code-2022",
    verificationStatus: "demo",
  },
  clerk12: {
    id: "clerk12",
    code: "DHMC § 12-18",
    title: "Business registration (demonstration)",
    summary:
      "Demonstration Harbor Municipal Code § 12-18 requires local registration of businesses operating within city limits.",
    plainLanguage:
      "Most businesses need to register with the city clerk before opening.",
    url: null,
    verificationStatus: "demo",
  },
  event9: {
    id: "event9",
    code: "DHMC § 9-4",
    title: "Temporary events (demonstration)",
    summary:
      "Demonstration Harbor Municipal Code § 9-4 requires a temporary-event application for gatherings using public space or expecting public attendance.",
    plainLanguage:
      "Public events need an application that covers date, layout, and crowd size.",
    url: null,
    verificationStatus: "demo",
  },
  works7: {
    id: "works7",
    code: "DHMC § 7-11",
    title: "Public-way occupancy (demonstration)",
    summary:
      "Demonstration Harbor Municipal Code § 7-11 requires Public Works review when an activity affects a street, sidewalk, or public facility.",
    plainLanguage:
      "If your project uses a street, sidewalk, or park, Public Works has to review access and safety.",
    url: null,
    verificationStatus: "demo",
  },
  coastal3: {
    id: "coastal3",
    code: "DHWR § 3.1",
    title: "Waterfront overlay (demonstration)",
    summary:
      "Demonstration Harbor Waterfront Regulations § 3.1 require conservation review for construction or events within the waterfront overlay.",
    plainLanguage:
      "Projects near the water get an extra environmental review.",
    url: null,
    verificationStatus: "demo",
  },
};

export function citationsFor(ids: string[]): CodeCitation[] {
  return ids.map((id) => {
    const citation = CITATIONS[id];
    if (!citation) {
      throw new Error(`Unknown citation id: ${id}`);
    }
    return citation;
  });
}
