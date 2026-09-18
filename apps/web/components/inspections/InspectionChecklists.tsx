"use client";

import type { RefObject } from "react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import { SectionHeading } from "@/components/common/SectionHeading";
import { useA11y } from "@/lib/a11y";
import { INSPECTION_LABELS, type InspectionItem, type InspectionType, type Project } from "@/lib/types";

const ORDER: InspectionType[] = ["building", "fire", "health"];

export function InspectionChecklists({
  headingRef,
  items,
  project,
  onOpenStep,
  onToggle,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  items: InspectionItem[];
  project: Project;
  onOpenStep: (stepId: string) => void;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const types = ORDER.filter((type) => items.some((item) => item.inspectionType === type));
  const done = items.filter((item) => item.completed).length;
  const stepTitle = new Map(project.roadmap.steps.map((step) => [step.id, step.shortTitle]));

  return (
    <div>
      <SectionHeading headingRef={headingRef} title={items.length ? `Inspection prep · ${done} of ${items.length} ready` : "No inspections on this roadmap"}>
        {items.length
          ? "Work through these before an inspector visits. The inspector's own checklist decides the result, so ask the department what they will check."
          : "None of your steps lead to a building, fire, or health inspection. If the city says one is needed, follow its instructions."}
      </SectionHeading>
      <div className="space-y-8">
        {types.map((type) => (
          <ChecklistGroup
            key={type}
            type={type}
            items={items.filter((item) => item.inspectionType === type)}
            stepTitle={stepTitle}
            onOpenStep={onOpenStep}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

export function ChecklistGroup({
  type,
  items,
  stepTitle,
  onOpenStep,
  onToggle,
}: {
  type: InspectionType;
  items: InspectionItem[];
  stepTitle?: Map<string, string>;
  onOpenStep?: (stepId: string) => void;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const { plainLanguage } = useA11y();
  const done = items.filter((item) => item.completed).length;
  const headingId = `inspection-${type}`;
  const stepIds = items[0]?.stepIds ?? [];

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div>
          <h3 id={headingId} className="h3">
            {INSPECTION_LABELS[type]} inspection
          </h3>
          {stepTitle && onOpenStep && stepIds.length ? (
            <p className="meta">
              For{" "}
              {stepIds.map((id, index) => (
                <span key={id}>
                  {index > 0 ? ", " : ""}
                  <button type="button" className="link font-normal underline" onClick={() => onOpenStep(id)}>
                    {stepTitle.get(id) ?? id}
                  </button>
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="progress w-20" aria-hidden>
            <span style={{ transform: `scaleX(${items.length ? done / items.length : 0})` }} />
          </div>
          <span className="meta num">
            {done}/{items.length}
          </span>
        </div>
      </div>
      <ul className="divided surface">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 px-4 py-3">
            <input
              id={`check-${item.id}`}
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)]"
              checked={item.completed}
              onChange={(event) => onToggle(item.id, event.target.checked)}
              aria-describedby={`check-${item.id}-desc`}
            />
            <div className="min-w-0 flex-1">
              <label htmlFor={`check-${item.id}`} className={`block cursor-pointer font-semibold transition-colors ${item.completed ? "text-[var(--muted)] line-through decoration-[var(--line-strong)]" : ""}`}>
                {item.title}
              </label>
              <div id={`check-${item.id}-desc`} className="text-sm">
                <p className="mt-0.5 text-[var(--ink-2)]">{plainLanguage ? item.plainLanguage : item.description}</p>
                <p className="mt-1 text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink-2)]">To pass:</span> {item.passingCriteria}
                </p>
              </div>
              {item.citation ? (
                <div className="mt-2">
                  <CodeCitationBadge citation={item.citation} />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
