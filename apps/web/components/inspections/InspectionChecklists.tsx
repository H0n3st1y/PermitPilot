"use client";

import { useRef } from "react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { useA11y } from "@/lib/a11y";
import { INSPECTION_LABELS, type InspectionItem, type InspectionType } from "@/lib/types";

const ORDER: InspectionType[] = ["building", "fire", "health"];

// grouped checklists for building, fire, and health prep
export function InspectionChecklists({
  items,
  onToggle,
}: {
  items: InspectionItem[];
  onToggle: (id: string, completed: boolean) => void;
}) {
  const { plainLanguage } = useA11y();
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>());
  // only the inspection types that actually have items
  const types = ORDER.filter((type) => items.some((item) => item.inspectionType === type));
  const completed = items.filter((item) => item.completed).length;
  // first unchecked item, in the same order as the groups
  const next = types.flatMap((type) => items.filter((item) => item.inspectionType === type)).find((item) => !item.completed);

  // empty roadmap gets a short note instead of empty groups
  if (items.length === 0) {
    return (
      <section className="panel">
        <h2 className="font-serif text-2xl text-[var(--navy)]">Inspection preparation</h2>
        <p className="mt-2 text-[var(--muted)]">
          This demonstration roadmap does not include a building, fire, or health inspection. If your municipality requires one, confirm directly with the department.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="panel">
        <p className="eyebrow">Inspection preparation</p>
        <h2 className="font-serif text-2xl text-[var(--navy)]">{completed} of {items.length} preparation items checked</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Use these checklists to prepare. Checking an item does not record a passed inspection or book an appointment.</p>
        {/* jump to the next unchecked box, or say they are all checked */}
        {next ? <button type="button" className="button primary mt-4" onClick={() => {
          // focus the checkbox and scroll its row into view
          const checkbox = checkboxRefs.current.get(next.id);
          checkbox?.focus({ preventScroll: true });
          checkbox?.closest("li")?.scrollIntoView({ block: "center", behavior: "instant" });
        }}>Continue checklist<span className="sr-only">: {next.title}</span></button> : <p className="mt-3 font-semibold text-[var(--ok)]">All preparation items checked. Confirm inspection arrangements with the department.</p>}
      </section>
      {/* one panel per inspection type */}
      {types.map((type) => {
        const group = items.filter((item) => item.inspectionType === type);
        const done = group.filter((item) => item.completed).length;
        return (
          <section key={type} className="panel">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="eyebrow">{group[0]?.department} inspection</p>
                <h2 className="font-serif text-2xl text-[var(--navy)]">{INSPECTION_LABELS[type]} readiness</h2>
              </div>
              <p className="text-sm font-medium text-[var(--muted)]" aria-live="polite">
                {done} of {group.length} preparation items checked
              </p>
            </div>
            <ul className="mt-4 space-y-2">
              {/* each prep item is a checkbox plus its passing criteria */}
              {group.map((item) => (
                <li key={item.id}>
                  <label className={`inspection-item ${item.completed ? "is-complete" : ""}`}>
                    <input
                      type="checkbox"
                      className="inspection-check"
                      aria-label={item.title}
                      aria-describedby={`inspection-${item.id}-description inspection-${item.id}-criteria`}
                      ref={(element) => {
                        // remember the input so Continue checklist can focus it
                        if (element) checkboxRefs.current.set(item.id, element); else checkboxRefs.current.delete(item.id);
                      }}
                      checked={item.completed}
                      onChange={(event) => onToggle(item.id, event.target.checked)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {item.title}
                      </span>
                      <span id={`inspection-${item.id}-description`} className="mt-1 block text-sm text-[var(--ink)]">
                        {/* plain wording when that setting is on */}
                        {plainLanguage ? item.plainLanguage : item.description}
                      </span>
                      <span id={`inspection-${item.id}-criteria`} className="mt-1 block text-sm text-[var(--muted)]">
                        Passing: {item.passingCriteria}
                      </span>
                    </span>
                  </label>
                  {/* citation chip when this item has one */}
                  {item.citation ? <div className="mt-2 ms-3"><CodeCitationBadge citation={item.citation} /></div> : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
