import { describe, expect, it } from "vitest";
import {
  PERMIT_TOUR_STEPS,
  placeTourCard,
  tourHoleFromRect,
} from "@/lib/tour";

// spotlight hole math and the four judge steps
describe("tour spotlight geometry & steps", () => {
  // the walkthrough hits bottleneck, why, status, then the tabs
  it("defines a 4-step judge walkthrough", () => {
    expect(PERMIT_TOUR_STEPS).toHaveLength(4);
    expect(PERMIT_TOUR_STEPS.map((s) => s.target)).toEqual([
      "bottleneck-node",
      "why-trace",
      "status-control",
      "project-tabs",
    ]);
  });

  // padding grows the hole, and it stays inside the viewport
  it("pads and clamps the spotlight hole within viewport bounds", () => {
    const hole = tourHoleFromRect(
      { top: 100, left: 200, width: 160, height: 80 },
      { width: 1280, height: 800 },
    );
    expect(hole.left).toBe(188);
    expect(hole.top).toBe(88);
    expect(hole.width).toBe(184);
    expect(hole.height).toBe(104);
  });

  // with room below, the card sits under the hole
  it("places the coach card below or beside the spotlight hole without overlapping it", () => {
    const hole = { top: 80, left: 120, width: 200, height: 90 };
    const pos = placeTourCard(
      hole,
      { width: 320, height: 180 },
      { width: 1280, height: 800 },
    );
    expect(pos.top).toBeGreaterThanOrEqual(hole.top + hole.height);
  });
});
