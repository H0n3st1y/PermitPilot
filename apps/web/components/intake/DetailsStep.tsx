"use client";

import { FieldError, NumberField, StepHeading } from "@/components/intake/fields";
import type { IntakeStepProps } from "@/components/intake/shared";
import { useLabels } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";

/** Naming, the type-specific questions, optional dates, and a final review. */
export function DetailsStep({
  config,
  errors,
  headingRef,
  update,
  onJumpToPage,
}: IntakeStepProps & { onJumpToPage: (page: number) => void }) {
  const { t } = useCopy();
  const labels = useLabels();
  const spaceValue = `${Number.isFinite(config.squareFootage) ? config.squareFootage.toLocaleString() : "—"} ${t("intake.space.sqft")} · ${labels.zone(config.zone)} · ${labels.occupancy(config.occupancy)}`;
  const tradesValue = config.trades.length ? config.trades.map((trade) => labels.trade(trade)).join(", ") : t("common.none");

  return (
    <div className="space-y-6">
      <StepHeading headingRef={headingRef} title={t("intake.details.title")} />

      <div className="field">
        <label htmlFor="name">{t("intake.details.name")}</label>
        <input
          id="name"
          name="name"
          maxLength={120}
          value={config.name}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : "name-hint"}
          onChange={(event) => update("name", event.target.value)}
          placeholder={t("intake.details.namePlaceholder")}
        />
        <p id="name-hint" className="field-hint">
          {t("intake.details.nameHint")}
        </p>
        {errors.name ? <FieldError id="name-error" message={t(errors.name)} /> : null}
      </div>

      <TypeSpecificQuestions config={config} errors={errors} update={update} headingRef={headingRef} />

      <fieldset>
        <legend className="field-label">
          {t("intake.details.dates")} <span className="font-normal text-[var(--muted)]">{t("intake.details.optional")}</span>
        </legend>
        <p className="field-hint">{t("intake.details.datesHint")}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="desiredStartDate" className="text-sm">
              {t("intake.details.startDate")}
            </label>
            <input
              id="desiredStartDate"
              name="desiredStartDate"
              type="date"
              value={config.desiredStartDate ?? ""}
              onChange={(event) => update("desiredStartDate", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="targetDate" className="text-sm">
              {t("intake.details.targetDate")}
            </label>
            <input
              id="targetDate"
              name="targetDate"
              type="date"
              value={config.targetDate ?? ""}
              aria-invalid={Boolean(errors.targetDate)}
              aria-describedby={errors.targetDate ? "targetDate-error" : undefined}
              onChange={(event) => update("targetDate", event.target.value)}
            />
            {errors.targetDate ? <FieldError id="targetDate-error" message={t(errors.targetDate)} /> : null}
          </div>
        </div>
      </fieldset>

      <section aria-labelledby="review-heading" className="border-t border-[var(--line)] pt-5">
        <h2 id="review-heading" className="h3">
          {t("intake.details.reviewHeading")}
        </h2>
        <dl className="mt-2 divide-y divide-[var(--line)] text-sm">
          <ReviewRow label={t("intake.step.project")} value={labels.projectType(config.projectType)} onChange={() => onJumpToPage(0)} />
          <ReviewRow label={t("intake.step.space")} value={spaceValue} onChange={() => onJumpToPage(1)} />
          <ReviewRow label={t("field.trades")} value={tradesValue} onChange={() => onJumpToPage(1)} />
        </dl>
        <p className="meta mt-4">{t("intake.details.disclaimer")}</p>
      </section>
    </div>
  );
}

/** Only the questions this project type actually changes the rules with. */
function TypeSpecificQuestions({ config, errors, update }: IntakeStepProps) {
  const { t } = useCopy();
  if (config.projectType === "food_business") {
    return (
      <label className="check-row">
        <input
          type="checkbox"
          checked={config.homeBased}
          onChange={(event) => update("homeBased", event.target.checked)}
        />
        <span>
          {t("intake.details.homeKitchen")}
          <span className="meta block">{t("intake.details.homeKitchenHint")}</span>
        </span>
      </label>
    );
  }

  if (config.projectType === "commercial_renovation") {
    return (
      <label className="check-row">
        <input
          type="checkbox"
          checked={config.foodPreparation}
          onChange={(event) => update("foodPreparation", event.target.checked)}
        />
        {t("intake.details.foodPrep")}
      </label>
    );
  }

  if (config.projectType === "public_event") {
    return (
      <fieldset className="space-y-1">
        <legend className="field-label mb-1">{t("intake.details.eventLegend")}</legend>
        <label className="check-row">
          <input
            type="checkbox"
            checked={config.foodPreparation}
            onChange={(event) => update("foodPreparation", event.target.checked)}
          />
          {t("intake.details.eventFood")}
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={config.publicAttendance}
            onChange={(event) => update("publicAttendance", event.target.checked)}
          />
          {t("intake.details.eventPublic")}
        </label>
        <div className="pt-2">
          <NumberField
            name="visitorCount"
            label={t("intake.details.attendance")}
            suffix={t("intake.details.people")}
            value={config.visitorCount ?? 0}
            min={0}
            error={errors.visitorCount ? t(errors.visitorCount) : undefined}
            onChange={(value) => update("visitorCount", value)}
          />
        </div>
      </fieldset>
    );
  }

  return null;
}

function ReviewRow({ label, value, onChange }: { label: string; value: string; onChange: () => void }) {
  const { t } = useCopy();
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <dt className="label">{label}</dt>
        <dd className="mt-0.5 text-[var(--ink)]">{value}</dd>
      </div>
      <button type="button" className="btn btn-quiet btn-sm shrink-0" onClick={onChange}>
        {t("intake.details.change")}
        <span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>
  );
}
