"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { useA11y } from "@/lib/a11y";
import { INSPECTION_LABELS, type InspectionItem, type InspectionType } from "@/lib/types";

const ORDER: InspectionType[] = ["building", "fire", "health"];

export function InspectionChecklists({
  items,
  onToggle,
}: {
  items: InspectionItem[];
  onToggle: (id: string, completed: boolean) => void;
}) {
  const { plainLanguage } = useA11y();
  const types = ORDER.filter((type) => items.some((item) => item.inspectionType === type));

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
                {done} of {group.length} passing criteria checked
              </p>
            </div>
            <ul className="mt-4 space-y-2">
              {group.map((item) => (
                <li key={item.id}>
                  <label className={`inspection-item ${item.completed ? "is-complete" : ""}`}>
                    <input
                      type="checkbox"
                      className="inspection-check"
                      checked={item.completed}
                      onChange={(event) => onToggle(item.id, event.target.checked)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {item.completed ? (
                          <CheckCircle2 className="shrink-0 text-[var(--ok)]" size={18} aria-hidden />
                        ) : (
                          <Circle className="shrink-0 text-[var(--muted)]" size={18} aria-hidden />
                        )}
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--ink)]">
                        {plainLanguage ? item.plainLanguage : item.description}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--muted)]">
                        Passing: {item.passingCriteria}
                      </span>
                      {item.citation ? (
                        <span className="mt-2 inline-flex">
                          <CodeCitationBadge citation={item.citation} />
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
