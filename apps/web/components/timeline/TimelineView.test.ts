// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TimelineView } from "@/components/timeline/TimelineView";
import { sampleProject } from "@/lib/store";
import { translate } from "@/lib/i18n";

vi.mock("@/lib/a11y", () => ({ useA11y: () => ({ plainLanguage: false, t: (key: string) => translate("en", key) }) }));
vi.mock("@/components/citations/CodeCitationBadge", () => ({ CodeCitationBadge: () => null }));

// give the components a react global in this jsdom env
beforeEach(() => { vi.stubGlobal("React", React); });
// unmount and restore mocks between tests
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

// two steps, and the second one waits on the first
function fixture() {
  const project = sampleProject();
  const first = { ...project.roadmap.steps[0], status: "not_started" as const, dependencies: [], parallelWith: [] };
  const second = { ...project.roadmap.steps[1], status: "not_started" as const, dependencies: [first.id], parallelWith: [] };
  project.roadmap.steps = [first, second];
  return { project, first, second };
}

describe("timeline phone navigation and recorded status", () => {
  // a prerequisite button focuses that step and says it is waiting
  it("navigates to exact prerequisite articles without requiring graph gestures", () => {
    const { project, first, second } = fixture();
    render(React.createElement(TimelineView, { project, bottlenecks: [{ stepId: second.id, kind: "blocked_dependency", message: "Waiting", plainLanguage: "Waiting" }], onStatusChange: vi.fn() }));
    const target = document.getElementById(`step-${first.id}`)!;
    target.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: `View prerequisite: ${first.shortTitle}` }));
    expect(document.activeElement).toBe(target);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
    expect(screen.getByText("Waiting on earlier approvals")).toBeTruthy();
    expect(screen.getByText(/1 waiting on prerequisites/)).toBeTruthy();
  });

  // the jump menu resets, and a status change still calls back
  it("resets the jump selector so any step can be selected again and preserves the status callback", () => {
    const { project, second } = fixture();
    const onStatusChange = vi.fn();
    render(React.createElement(TimelineView, { project, bottlenecks: [], onStatusChange }));
    const target = document.getElementById(`step-${second.id}`)!;
    target.scrollIntoView = vi.fn();
    const jump = screen.getByRole("combobox", { name: "Jump to a permit step" }) as HTMLSelectElement;
    fireEvent.change(jump, { target: { value: second.id } });
    expect(document.activeElement).toBe(target);
    expect(jump.value).toBe("");
    fireEvent.change(screen.getByRole("combobox", { name: `Status: ${second.shortTitle}` }), { target: { value: "submitted" } });
    expect(onStatusChange).toHaveBeenCalledWith(second.id, "submitted");
    expect(screen.getByText(/not live permit-office updates/)).toBeTruthy();
    expect(screen.getAllByText(/Estimated:/)).toHaveLength(2);
  });

  // in review is not the same message as waiting to start
  it("distinguishes a recorded review from a step waiting to start", () => {
    const { project, second } = fixture();
    project.roadmap.steps[1] = { ...second, status: "in_review" };
    render(React.createElement(TimelineView, { project, bottlenecks: [], onStatusChange: vi.fn() }));
    expect(screen.queryByText("Waiting on earlier approvals")).toBeNull();
    expect(screen.getByText(/Recorded as in review/)).toBeTruthy();
    expect(screen.getByText("Approval not recorded")).toBeTruthy();
  });

  // no steps shows the empty heading, not an approved count
  it("keeps an empty roadmap distinct from completed approvals", () => {
    const { project } = fixture();
    project.roadmap.steps = [];
    render(React.createElement(TimelineView, { project, bottlenecks: [], onStatusChange: vi.fn() }));
    expect(screen.getByRole("heading", { name: "No permit steps yet" })).toBeTruthy();
    expect(screen.queryByText(/marked approved/)).toBeNull();
  });
});
