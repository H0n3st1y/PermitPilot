"use client";

import { FieldError, NumberField, StepHeading } from "@/components/intake/fields";
import type { IntakeStepProps } from "@/components/intake/shared";
import {
  OCCUPANCY_LABELS,
  PROJECT_TYPE_LABELS,
  TRADE_LABELS,
  ZONE_LABELS,
} from "@/lib/types";

/** Naming, the type-specific questions, optional dates, and a final review. */
export function DetailsStep({
  config,
  errors,
  headingRef,
  update,
  onJumpToPage,
}: IntakeStepProps & { onJumpToPage: (page: number) => void }) {
  return (
    <div className="space-y-6">
      <StepHeading headingRef={headingRef} title="A few details" />

      <div className="field">
        <label htmlFor="name">Project name</label>
        <input
          id="name"
          name="name"
          maxLength={120}
          value={config.name}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : "name-hint"}
          onChange={(event) => update("name", event.target.value)}
          placeholder="e.g. Harbor Kitchen"
        />
        <p id="name-hint" className="field-hint">
          Only you see this.
        </p>
        {errors.name ? <FieldError id="name-error" message={errors.name} /> : null}
      </div>

      <TypeSpecificQuestions config={config} errors={errors} update={update} headingRef={headingRef} />

      <fieldset>
        <legend className="field-label">
          Dates <span className="font-normal text-[var(--muted)]">(optional)</span>
        </legend>
        <p className="field-hint">
          We use these to plan the timeline and warn you if permits could run past your date.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="desiredStartDate" className="text-sm">
              Earliest you can apply
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
              Opening, move-in, or event date
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
            {errors.targetDate ? <FieldError id="targetDate-error" message={errors.targetDate} /> : null}
          </div>
        </div>
      </fieldset>

      <section aria-labelledby="review-heading" className="border-t border-[var(--line)] pt-5">
        <h2 id="review-heading" className="h3">
          Your answers
        </h2>
        <dl className="mt-2 divide-y divide-[var(--line)] text-sm">
          <ReviewRow
            label="Project"
            value={PROJECT_TYPE_LABELS[config.projectType]}
            onChange={() => onJumpToPage(0)}
          />
          <ReviewRow
            label="The space"
            value={`${Number.isFinite(config.squareFootage) ? config.squareFootage.toLocaleString() : "—"} sq ft · ${ZONE_LABELS[config.zone]} · ${OCCUPANCY_LABELS[config.occupancy]}`}
            onChange={() => onJumpToPage(1)}
          />
          <ReviewRow
            label="Trade work"
            value={config.trades.length ? config.trades.map((trade) => TRADE_LABELS[trade]).join(", ") : "None"}
            onChange={() => onJumpToPage(1)}
          />
        </dl>
        <p className="meta mt-4">
          Requirements come from fixed rules for Demo Harbor, a fictional town. Code references link to real model
          codes, but local adoption isn&apos;t verified. This is not a legal determination.
        </p>
      </section>
    </div>
  );
}

/** Only the questions this project type actually changes the rules with. */
function TypeSpecificQuestions({ config, errors, update }: IntakeStepProps) {
  if (config.projectType === "food_business") {
    return (
      <label className="check-row">
        <input
          type="checkbox"
          checked={config.homeBased}
          onChange={(event) => update("homeBased", event.target.checked)}
        />
        <span>
          Food will be prepared in a home kitchen
          <span className="meta block">Home kitchens have extra restrictions and an inspection surcharge.</span>
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
        The space will prepare or serve food
      </label>
    );
  }

  if (config.projectType === "public_event") {
    return (
      <fieldset className="space-y-1">
        <legend className="field-label mb-1">About the event</legend>
        <label className="check-row">
          <input
            type="checkbox"
            checked={config.foodPreparation}
            onChange={(event) => update("foodPreparation", event.target.checked)}
          />
          Food will be prepared or served
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={config.publicAttendance}
            onChange={(event) => update("publicAttendance", event.target.checked)}
          />
          The public can attend
        </label>
        <div className="pt-2">
          <NumberField
            name="visitorCount"
            label="Expected attendance"
            suffix="people"
            value={config.visitorCount ?? 0}
            min={0}
            error={errors.visitorCount}
            onChange={(value) => update("visitorCount", value)}
          />
        </div>
      </fieldset>
    );
  }

  return null;
}

function ReviewRow({ label, value, onChange }: { label: string; value: string; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <dt className="label">{label}</dt>
        <dd className="mt-0.5 text-[var(--ink)]">{value}</dd>
      </div>
      <button type="button" className="btn btn-quiet btn-sm shrink-0" onClick={onChange}>
        Change<span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>
  );
}
