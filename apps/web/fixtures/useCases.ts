import { PROJECT_TYPE_LABELS, type OccupancyGroup, type ProjectConfig, type ProjectType, type Trade } from "@/lib/types";

export interface UseCaseDefinition {
  id: string;
  group: string;
  label: string;
  detail: string;
  projectType: ProjectType;
  occupancy: OccupancyGroup;
  foodPreparation: boolean;
  personalCare: boolean;
  homeBased: boolean;
  publicAttendance: boolean;
  changingSpace: boolean;
  suggestedTrades: Trade[];
}

export const USE_CASE_GROUPS = [
  "Food",
  "Personal care",
  "Shop and services",
  "Home and building",
  "Events",
] as const;

// cards on the intake page
export const USE_CASES: UseCaseDefinition[] = [
  {
    id: "restaurant",
    group: "Food",
    label: "Restaurant",
    detail: "A sit-down or take-out restaurant",
    projectType: "food_business",
    occupancy: "assembly",
    foodPreparation: true,
    personalCare: false,
    homeBased: false,
    publicAttendance: true,
    changingSpace: false,
    suggestedTrades: ["electrical", "plumbing", "mechanical", "gas"],
  },
  {
    id: "cafe",
    group: "Food",
    label: "Cafe",
    detail: "Coffee shop, bakery cafe, or similar",
    projectType: "food_business",
    occupancy: "assembly",
    foodPreparation: true,
    personalCare: false,
    homeBased: false,
    publicAttendance: true,
    changingSpace: false,
    suggestedTrades: ["electrical", "plumbing"],
  },
  {
    id: "home-bakery",
    group: "Food",
    label: "Home bakery",
    detail: "Selling food you make in a home kitchen",
    projectType: "food_business",
    occupancy: "residential",
    foodPreparation: true,
    personalCare: false,
    homeBased: true,
    publicAttendance: false,
    changingSpace: false,
    suggestedTrades: ["electrical", "plumbing"],
  },
  {
    id: "catering",
    group: "Food",
    label: "Catering",
    detail: "Preparing food to serve off-site",
    projectType: "food_business",
    occupancy: "business",
    foodPreparation: true,
    personalCare: false,
    homeBased: false,
    publicAttendance: false,
    changingSpace: false,
    suggestedTrades: ["electrical", "plumbing"],
  },
  {
    id: "barbershop",
    group: "Personal care",
    label: "Barbershop",
    detail: "Haircuts in a shop",
    projectType: "storefront_business",
    occupancy: "business",
    foodPreparation: false,
    personalCare: true,
    homeBased: false,
    publicAttendance: true,
    changingSpace: false,
    suggestedTrades: ["electrical", "plumbing"],
  },
  {
    id: "hair-salon",
    group: "Personal care",
    label: "Hair salon",
    detail: "Hair styling, color, or similar services",
    projectType: "storefront_business",
    occupancy: "business",
    foodPreparation: false,
    personalCare: true,
    homeBased: false,
    publicAttendance: true,
    changingSpace: false,
    suggestedTrades: ["electrical", "plumbing"],
  },
  {
    id: "nail-salon",
    group: "Personal care",
    label: "Nail salon",
    detail: "Manicure, pedicure, or nail services",
    projectType: "storefront_business",
    occupancy: "business",
    foodPreparation: false,
    personalCare: true,
    homeBased: false,
    publicAttendance: true,
    changingSpace: false,
    suggestedTrades: ["electrical", "plumbing", "mechanical"],
  },
  {
    id: "retail",
    group: "Shop and services",
    label: "Retail store",
    detail: "Selling goods in a shop, no food prep",
    projectType: "storefront_business",
    occupancy: "mercantile",
    foodPreparation: false,
    personalCare: false,
    homeBased: false,
    publicAttendance: true,
    changingSpace: false,
    suggestedTrades: ["electrical"],
  },
  {
    id: "office",
    group: "Shop and services",
    label: "Office",
    detail: "Professional services in a workplace",
    projectType: "storefront_business",
    occupancy: "business",
    foodPreparation: false,
    personalCare: false,
    homeBased: false,
    publicAttendance: false,
    changingSpace: false,
    suggestedTrades: ["electrical"],
  },
  {
    id: "room-addition",
    group: "Home and building",
    label: "Room addition",
    detail: "Adding a room, porch, or expanding a house",
    projectType: "room_addition",
    occupancy: "residential",
    foodPreparation: false,
    personalCare: false,
    homeBased: false,
    publicAttendance: false,
    changingSpace: true,
    suggestedTrades: ["electrical", "plumbing"],
  },
  {
    id: "interior-remodel",
    group: "Home and building",
    label: "Interior remodel",
    detail: "Changing the inside of a shop or home",
    projectType: "commercial_renovation",
    occupancy: "business",
    foodPreparation: false,
    personalCare: false,
    homeBased: false,
    publicAttendance: false,
    changingSpace: true,
    suggestedTrades: ["electrical", "plumbing", "mechanical"],
  },
  {
    id: "neighborhood-event",
    group: "Events",
    label: "Neighborhood event",
    detail: "A block party, festival, or outdoor gathering",
    projectType: "public_event",
    occupancy: "assembly",
    foodPreparation: true,
    personalCare: false,
    homeBased: false,
    publicAttendance: true,
    changingSpace: false,
    suggestedTrades: ["electrical"],
  },
];

export const USE_CASE_LABELS: Record<string, string> = Object.fromEntries(
  USE_CASES.map((item) => [item.id, item.label]),
);

export function findUseCase(id: string | undefined): UseCaseDefinition | undefined {
  return USE_CASES.find((item) => item.id === id);
}

export function applyUseCase(current: ProjectConfig, useCase: UseCaseDefinition): ProjectConfig {
  // flipping the card fills in the flags the rules look at
  return {
    ...current,
    useCase: useCase.id,
    projectType: useCase.projectType,
    occupancy: useCase.occupancy,
    foodPreparation: useCase.foodPreparation,
    personalCare: useCase.personalCare,
    homeBased: useCase.homeBased,
    publicAttendance: useCase.publicAttendance,
    changingSpace: useCase.changingSpace,
    trades: useCase.suggestedTrades,
  };
}

export function displayProjectKind(config: ProjectConfig): string {
  if (config.useCase && USE_CASE_LABELS[config.useCase]) {
    return USE_CASE_LABELS[config.useCase];
  }
  return PROJECT_TYPE_LABELS[config.projectType];
}
