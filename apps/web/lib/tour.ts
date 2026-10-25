export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourStep {
  id: string;
  tab: "graph" | "overview" | "timeline" | "documents" | "fees" | "inspections";
  target: string;
  actionTarget?: string;
  titleKey: string;
  bodyKey: string;
  ctaKey?: string;
}

const TOUR_STORAGE_KEY = "permitpilot:tour_v1";
export const TOUR_START_EVENT = "permitpilot:start-tour";

let startHandler: (() => void) | null = null;
let startQueued = false;

// remember who should start the tour, and run it if a click already happened
export function registerTourStartHandler(handler: () => void): () => void {
  startHandler = handler;
  // a start was requested before this component mounted
  if (startQueued) {
    startQueued = false;
    handler();
  }
  // drop the handler only if it's still the one we registered
  return () => {
    if (startHandler === handler) startHandler = null;
  };
}

export function requestProductTour(): void {
  // homepage button can fire this before the tour component is even up
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(TOUR_START_EVENT));
  }
  // component is ready, start now
  if (startHandler) {
    startHandler();
    return;
  }
  // otherwise remember to start once it mounts
  startQueued = true;
}

// true only when this browser already finished the tour
export function isTourComplete(): boolean {
  try {
    // no window or storage means we haven't finished it
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return false;
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === "done";
  } catch { return false; }
}

// remember that the tour was finished
export function markTourComplete(): void {
  try {
    // nothing to write when storage isn't there
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
    window.localStorage.setItem(TOUR_STORAGE_KEY, "done");
  } catch { /* Closing the guide must still work without browser storage. */ }
}

// keep a number inside min and max
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const HOLE_PAD = 12;
export const HOLE_EDGE = 8;

export function tourHoleFromRect(
  rect: { top: number; left: number; width: number; height: number },
  viewport: { width: number; height: number },
  options?: { pad?: number; edge?: number },
): TourRect {
  // cut a hole in the dim overlay around the thing we are pointing at
  const pad = options?.pad ?? HOLE_PAD;
  const edge = options?.edge ?? HOLE_EDGE;
  // inset from the left, but don't run off the screen
  const left = clamp(rect.left - pad, edge, Math.max(edge, viewport.width - edge - 44));
  const right = Math.min(viewport.width - edge, rect.left + rect.width + pad);
  const top = Math.max(edge, rect.top - pad);
  const bottom = rect.top + rect.height + pad;
  return {
    top,
    left,
    // hole stays at least 44px so it is still visible
    width: Math.max(44, right - left),
    height: Math.max(44, bottom - top),
  };
}

// pick a spot for the coach card that doesn't cover the hole
export function placeTourCard(
  hole: TourRect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  options?: { margin?: number; gap?: number },
): { top: number; left: number } {
  const margin = options?.margin ?? 16;
  const gap = options?.gap ?? 14;
  const maxLeft = Math.max(margin, viewport.width - card.width - margin);
  const maxTop = Math.max(margin, viewport.height - card.height - margin);
  const centerLeft = clamp((viewport.width - card.width) / 2, margin, maxLeft);

  // no hole, so just center the card
  if (!hole) {
    return {
      top: clamp((viewport.height - card.height) / 2, margin, maxTop),
      left: centerLeft,
    };
  }

  const alignedLeft = clamp(hole.left + hole.width / 2 - card.width / 2, margin, maxLeft);
  const belowTop = hole.top + hole.height + gap;
  // how much room is left on each side of the hole
  const belowSpace = viewport.height - margin - belowTop;
  const aboveSpace = hole.top - gap - margin;
  const leftSpace = hole.left - gap - margin;
  const rightSpace = viewport.width - margin - (hole.left + hole.width + gap);
  const sideTop = clamp(hole.top, margin, maxTop);

  // prefer below, then above, then right, then left
  if (belowSpace >= card.height) {
    return { top: belowTop, left: alignedLeft };
  }
  if (aboveSpace >= card.height) {
    return { top: hole.top - gap - card.height, left: alignedLeft };
  }
  if (rightSpace >= card.width) {
    return { top: sideTop, left: hole.left + hole.width + gap };
  }
  if (leftSpace >= card.width) {
    return { top: sideTop, left: hole.left - gap - card.width };
  }
  // nothing fits cleanly, so use whichever vertical side has more room
  if (belowSpace >= aboveSpace) {
    return { top: clamp(belowTop, margin, maxTop), left: alignedLeft };
  }
  return { top: clamp(hole.top - gap - card.height, margin, maxTop), left: alignedLeft };
}

// the 4 spots we walk judges thru
export const PERMIT_TOUR_STEPS: TourStep[] = [
  {
    id: "bottleneck",
    tab: "graph",
    target: "bottleneck-node",
    actionTarget: "bottleneck-node",
    titleKey: "tour.step1Title",
    bodyKey: "tour.step1Body",
    ctaKey: "tour.step1Cta",
  },
  {
    id: "why-trace",
    tab: "graph",
    target: "why-trace",
    titleKey: "tour.step2Title",
    bodyKey: "tour.step2Body",
  },
  {
    id: "status-handoff",
    tab: "graph",
    target: "status-control",
    actionTarget: "status-control",
    titleKey: "tour.step3Title",
    bodyKey: "tour.step3Body",
    ctaKey: "tour.step3Cta",
  },
  {
    id: "project-tabs",
    tab: "graph",
    target: "project-tabs",
    titleKey: "tour.step4Title",
    bodyKey: "tour.step4Body",
  },
];
