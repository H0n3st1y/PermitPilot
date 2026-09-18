"use client";

import { FieldError } from "@/components/intake/fields";
import type { IntakeStepProps } from "@/components/intake/shared";
import { PROJECT_TYPE_LABELS, type ProjectType } from "@/lib/types";

/** The four project shapes the rules can tell apart, with plain descriptions. */
const TYPES: { id: ProjectType; detail: string }[] = [
  { id: "food_business", detail: "Selling prepared food, including from a home kitchen" },
  { id: "room_addition", detail: "Adding or enlarging rooms on a house" },
  { id: "commercial_renovation", detail: "Fitting out or changing the use of a commercial space" },
  { id: "public_event", detail: "A temporary event that uses public space or is open to the public" },
];

export function ProjectTypeStep({
  config,
  errors,
  headingRef,
  typeChosen,
  onChooseType,
}: Pick<IntakeStepProps, "config" | "errors" | "headingRef"> & {
  typeChosen: boolean;
  onChooseType: (type: ProjectType) => void;
}) {
  return (
    <fieldset aria-describedby={errors.projectType ? "projectType-error" : "projectType-hint"}>
      <legend className="w-full">
        <h1 ref={headingRef} tabIndex={-1} className="page-title">
          What are you planning?
        </h1>
      </legend>
      <p id="projectType-hint" className="mt-2 text-[var(--ink-2)]">
        We&apos;ll ask only the questions that change which permits you need. It takes about two minutes.
      </p>
      {errors.projectType ? <FieldError id="projectType-error" message={errors.projectType} /> : null}
      <div className="choice-list mt-5">
        {TYPES.map((option) => (
          <label key={option.id} className="choice-row">
            <input
              type="radio"
              name="projectType"
              value={option.id}
              checked={typeChosen && config.projectType === option.id}
              onChange={() => onChooseType(option.id)}
            />
            <span>
              <span className="block font-semibold">{PROJECT_TYPE_LABELS[option.id]}</span>
              <span className="meta block">{option.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
