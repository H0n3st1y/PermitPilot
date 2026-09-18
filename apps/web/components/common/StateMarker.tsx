import { AlertTriangle, Check, Lock } from "lucide-react";
import type { DisplayState } from "@/lib/engine/progress";

export const DISPLAY_STATE_LABELS: Record<DisplayState, string> = {
  completed: "Completed",
  current: "Current",
  attention: "Needs attention",
  blocked: "Blocked",
  upcoming: "Upcoming",
};

/**
 * Roadmap state marker. Shape and color both encode state; the label is always
 * available to assistive technology, and visible when `showLabel` is set.
 */
export function StateMarker({ state, showLabel = false }: { state: DisplayState; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`marker marker-${state}`} aria-hidden>
        {state === "completed" ? <Check size={13} strokeWidth={3} /> : null}
        {state === "attention" ? <AlertTriangle size={12} strokeWidth={2.5} /> : null}
        {state === "blocked" ? <Lock size={11} strokeWidth={2.5} /> : null}
      </span>
      <span className={showLabel ? `text-sm font-semibold state-text-${state}` : "sr-only"}>{DISPLAY_STATE_LABELS[state]}</span>
    </span>
  );
}
