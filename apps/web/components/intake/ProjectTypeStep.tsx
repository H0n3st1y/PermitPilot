"use client";

import { FieldError } from "@/components/intake/fields";
import type { IntakeStepProps } from "@/components/intake/shared";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import type { PhraseKey } from "@/lib/i18n/phrases";
import type { ProjectType } from "@/lib/types";

/** The four project shapes the rules can tell apart, with plain descriptions. */
const TYPES: { id: ProjectType; detail: PhraseKey }[] = [
  { id: "food_business", detail: "intake.type.food_business" },
  { id: "room_addition", detail: "intake.type.room_addition" },
  { id: "commercial_renovation", detail: "intake.type.commercial_renovation" },
  { id: "public_event", detail: "intake.type.public_event" },
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
  const { t } = useCopy();
  const labels = useLabels();
  return (
    <fieldset aria-describedby={errors.projectType ? "projectType-error" : "projectType-hint"}>
      <legend className="w-full">
        <h1 ref={headingRef} tabIndex={-1} className="page-title">
          {t("intake.type.title")}
        </h1>
      </legend>
      <p id="projectType-hint" className="mt-2 text-[var(--ink-2)]">
        {t("intake.type.hint")}
      </p>
      {errors.projectType ? <FieldError id="projectType-error" message={t(errors.projectType)} /> : null}
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
              <span className="block font-semibold">{labels.projectType(option.id)}</span>
              <span className="meta block">{t(option.detail)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
