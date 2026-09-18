"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Minus, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { createProjectFromConfig, regenerateProject, type RoadmapChange } from "@/lib/engine/project";
import { estimateOccupantLoad } from "@/lib/engine/rules";
import {
  defaultsForType,
  EMPTY_CONFIG,
  finalizeConfig,
  INTAKE_STEPS,
  usesValuation,
  validateIntake,
  type IntakeErrors,
} from "@/lib/intake";
import { deleteFiles } from "@/lib/storage/files";
import { clearDraft, loadDraft, loadProject, saveDraft, saveProject } from "@/lib/storage/projects";
import {
  OCCUPANCY_LABELS,
  PROJECT_TYPE_LABELS,
  TRADE_LABELS,
  ZONE_LABELS,
  type OccupancyGroup,
  type Project,
  type ProjectConfig,
  type ProjectType,
  type Trade,
  type ZoneDistrict,
} from "@/lib/types";

const TYPES: { id: ProjectType; detail: string }[] = [
  { id: "food_business", detail: "Selling prepared food, including from a home kitchen" },
  { id: "room_addition", detail: "Adding or enlarging rooms on a house" },
  { id: "commercial_renovation", detail: "Fitting out or changing the use of a commercial space" },
  { id: "public_event", detail: "A temporary event that uses public space or is open to the public" },
];

interface Draft {
  config: ProjectConfig;
  page: number;
  typeChosen: boolean;
}

function IntakeForm() {
  const router = useRouter();
  const editId = useSearchParams().get("edit");
  const [page, setPage] = useState(0);
  const [config, setConfig] = useState<ProjectConfig>(EMPTY_CONFIG);
  const [typeChosen, setTypeChosen] = useState(false);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Project | null>(null);
  const [preview, setPreview] = useState<(RoadmapChange & { droppedDocuments: number }) | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    try {
      if (editId) {
        const result = loadProject(editId);
        if (result.status !== "ok") {
          setFormError("That project couldn't be found in this browser. You can start a new one below.");
        } else {
          setExisting(result.project);
          setConfig({ ...EMPTY_CONFIG, ...result.project.config });
          setTypeChosen(true);
        }
      } else {
        const draft = loadDraft<Draft>();
        if (draft?.config) {
          setConfig({ ...EMPTY_CONFIG, ...draft.config });
          setTypeChosen(Boolean(draft.typeChosen));
          setPage(Math.min(Math.max(0, draft.page ?? 0), INTAKE_STEPS.length - 1));
        }
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Saved answers couldn't be read.");
    }
    setLoaded(true);
  }, [editId]);

  // Autosave new-project drafts (debounced) so a refresh or "Save & exit" keeps answers.
  useEffect(() => {
    // Stop autosaving once submitted, so a pending save can't resurrect the cleared draft.
    if (!loaded || editId || submitting) return;
    const timer = window.setTimeout(() => {
      try {
        saveDraft({ config, page, typeChosen } satisfies Draft);
      } catch (error) {
        console.error("PermitPilot: draft autosave failed", error);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [config, page, typeChosen, loaded, editId, submitting]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [page, preview]);

  const update = <K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    setPreview(null);
  };

  function focusFirstError(found: IntakeErrors) {
    const key = Object.keys(found)[0];
    if (key) formRef.current?.querySelector<HTMLElement>(`[name="${key}"]`)?.focus();
  }

  function next() {
    if (submitting) return;
    if (page === 0 && !typeChosen) {
      setErrors({ projectType: "Choose the option that best describes your project." });
      formRef.current?.querySelector<HTMLElement>('input[name="projectType"]')?.focus();
      return;
    }
    const found = validateIntake(config, page);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }
    if (page < INTAKE_STEPS.length - 1) {
      setPage(page + 1);
      return;
    }
    finish();
  }

  function finish() {
    const final = finalizeConfig(config);
    setFormError(null);
    try {
      if (existing) {
        const result = regenerateProject(existing, final);
        if (!preview) {
          setPreview({ ...result.change, droppedDocuments: result.droppedDocumentIds.length });
          return;
        }
        setSubmitting(true);
        saveProject(result.project);
        void deleteFiles(result.droppedDocumentIds).catch((error) => console.error("PermitPilot: file cleanup failed", error));
        router.push(`/projects/${encodeURIComponent(existing.id)}`);
        return;
      }
      setSubmitting(true);
      const project = createProjectFromConfig(final);
      saveProject(project);
      clearDraft();
      router.push(`/projects/${encodeURIComponent(project.id)}`);
    } catch (error) {
      // Answers stay in the form; nothing is lost when a save fails.
      console.error("PermitPilot: could not save project", error);
      setSubmitting(false);
      setFormError(error instanceof Error ? error.message : "The project couldn't be saved. Your answers are still here.");
    }
  }

  const occupantLoad = estimateOccupantLoad(config.squareFootage || 0, config.occupancy);
  const cancelHref = existing ? `/projects/${encodeURIComponent(existing.id)}` : "/";
  const isLast = page === INTAKE_STEPS.length - 1;
  const submitLabel = !isLast ? "Continue" : existing ? (preview ? "Apply changes" : "Preview changes") : "Build my roadmap";

  if (!loaded) {
    return (
      <main id="main" className="container-narrow py-8" aria-busy="true">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton mt-8 h-8 w-2/3" />
        <div className="skeleton mt-6 h-64 w-full" />
      </main>
    );
  }

  return (
    <main id="main" className="container-narrow pb-16 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="meta">{existing ? `Editing ${existing.config.name}` : "New project · answers save as you go"}</p>
        <Link className="nav-link text-sm" href={cancelHref}>
          {existing ? "Cancel" : "Save & exit"}
        </Link>
      </div>

      <ol className="stepper" aria-label="Progress">
        {INTAKE_STEPS.map((label, index) => (
          <li key={label} className={index < page ? "is-done" : index === page ? "is-current" : ""} aria-current={index === page ? "step" : undefined}>
            <span className="num">{index + 1}</span> <span className="stepper-label">{label}</span>
            <span className="sr-only">{index < page ? " (done)" : ""}</span>
          </li>
        ))}
      </ol>

      <form
        ref={formRef}
        className="mt-8"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          next();
        }}
      >
        {formError ? (
          <div className="callout callout-blocked mb-6" role="alert">
            {formError}
          </div>
        ) : null}

        <div key={preview ? "preview" : page} className="fade-in">
          {page === 0 ? (
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
                      onChange={() => {
                        setTypeChosen(true);
                        setErrors({});
                        setPreview(null);
                        setConfig((current) => ({ ...current, projectType: option.id, ...defaultsForType(option.id) }));
                      }}
                    />
                    <span>
                      <span className="block font-semibold">{PROJECT_TYPE_LABELS[option.id]}</span>
                      <span className="meta block">{option.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {page === 1 ? (
            <div className="space-y-6">
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="page-title">
                  About the space
                </h1>
                <p className="mt-2 text-[var(--ink-2)]">Size, location, and the work involved decide which reviews and fees apply.</p>
              </div>
              <NumberField
                name="squareFootage"
                label="Floor area"
                suffix="sq ft"
                hint={Number.isFinite(config.squareFootage) && config.squareFootage > 0 ? `Sized for about ${occupantLoad} ${occupantLoad === 1 ? "person" : "people"} at this use.` : "The area of the space you're using or building."}
                value={config.squareFootage}
                min={1}
                error={errors.squareFootage}
                onChange={(value) => update("squareFootage", value)}
              />
              <SelectField
                name="zone"
                label="Zoning district"
                hint="Check your parcel on the city's zoning map. Waterfront parcels get an extra review."
                value={config.zone}
                options={ZONE_LABELS}
                onChange={(value) => update("zone", value as ZoneDistrict)}
              />
              <details className="disclosure">
                <summary>
                  Building use: {OCCUPANCY_LABELS[config.occupancy]}
                  <span className="font-normal text-[var(--muted)]"> · change</span>
                </summary>
                <div className="mt-2">
                  <SelectField
                    name="occupancy"
                    label="Occupancy group"
                    hint="Set from your project type. Change it only if the space is classified differently."
                    value={config.occupancy}
                    options={OCCUPANCY_LABELS}
                    onChange={(value) => update("occupancy", value as OccupancyGroup)}
                  />
                </div>
              </details>
              {usesValuation(config.projectType) ? (
                <NumberField
                  name="estimatedValuation"
                  label="Estimated construction cost"
                  prefix="$"
                  hint="Used to calculate the building permit fee. A contractor's estimate is fine."
                  value={config.estimatedValuation}
                  min={0}
                  step={500}
                  error={errors.estimatedValuation}
                  onChange={(value) => update("estimatedValuation", value)}
                />
              ) : null}
              {config.projectType === "public_event" && config.trades.length === 0 ? (
                <details className="disclosure">
                  <summary>Any electrical, plumbing, HVAC, or gas work?</summary>
                  <TradeChecks trades={config.trades} onChange={(trades) => update("trades", trades)} />
                </details>
              ) : (
                <TradeChecks trades={config.trades} onChange={(trades) => update("trades", trades)} />
              )}
            </div>
          ) : null}

          {page === 2 && !preview ? (
            <div className="space-y-6">
              <h1 ref={headingRef} tabIndex={-1} className="page-title">
                A few details
              </h1>
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

              {config.projectType === "food_business" ? (
                <label className="check-row">
                  <input type="checkbox" checked={config.homeBased} onChange={(event) => update("homeBased", event.target.checked)} />
                  <span>
                    Food will be prepared in a home kitchen
                    <span className="meta block">Home kitchens have extra restrictions and an inspection surcharge.</span>
                  </span>
                </label>
              ) : null}
              {config.projectType === "commercial_renovation" ? (
                <label className="check-row">
                  <input type="checkbox" checked={config.foodPreparation} onChange={(event) => update("foodPreparation", event.target.checked)} />
                  The space will prepare or serve food
                </label>
              ) : null}
              {config.projectType === "public_event" ? (
                <fieldset className="space-y-1">
                  <legend className="field-label mb-1">About the event</legend>
                  <label className="check-row">
                    <input type="checkbox" checked={config.foodPreparation} onChange={(event) => update("foodPreparation", event.target.checked)} />
                    Food will be prepared or served
                  </label>
                  <label className="check-row">
                    <input type="checkbox" checked={config.publicAttendance} onChange={(event) => update("publicAttendance", event.target.checked)} />
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
              ) : null}

              <fieldset>
                <legend className="field-label">
                  Dates <span className="font-normal text-[var(--muted)]">(optional)</span>
                </legend>
                <p className="field-hint">We use these to plan the timeline and warn you if permits could run past your date.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor="desiredStartDate" className="text-sm">
                      Earliest you can apply
                    </label>
                    <input id="desiredStartDate" name="desiredStartDate" type="date" value={config.desiredStartDate ?? ""} onChange={(event) => update("desiredStartDate", event.target.value)} />
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
                  <ReviewRow label="Project" value={PROJECT_TYPE_LABELS[config.projectType]} onChange={() => setPage(0)} />
                  <ReviewRow
                    label="The space"
                    value={`${Number.isFinite(config.squareFootage) ? config.squareFootage.toLocaleString() : "—"} sq ft · ${ZONE_LABELS[config.zone]} · ${OCCUPANCY_LABELS[config.occupancy]}`}
                    onChange={() => setPage(1)}
                  />
                  <ReviewRow label="Trade work" value={config.trades.length ? config.trades.map((trade) => TRADE_LABELS[trade]).join(", ") : "None"} onChange={() => setPage(1)} />
                </dl>
                <p className="meta mt-4">
                  Requirements come from fixed rules for Demo Harbor, a fictional town. Code references link to real
                  model codes, but local adoption isn&apos;t verified. This is not a legal determination.
                </p>
              </section>
            </div>
          ) : null}

          {preview ? (
            <div className="space-y-5">
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="page-title">
                  Review roadmap changes
                </h1>
                <p className="mt-2 text-[var(--ink-2)]">We re-ran the rules with your edits. Progress on steps that stay is kept.</p>
              </div>
              {preview.added.length === 0 && preview.removed.length === 0 ? (
                <div className="callout callout-neutral">The same steps still apply. Dates and fees will update.</div>
              ) : null}
              {preview.added.length ? (
                <ChangeList title="New steps" steps={preview.added.map((step) => step.title)} icon="add" />
              ) : null}
              {preview.removed.length ? (
                <ChangeList title="No longer required" steps={preview.removed.map((step) => step.title)} icon="remove" />
              ) : null}
              {preview.droppedDocuments ? (
                <div className="callout callout-attention">
                  {preview.droppedDocuments} uploaded document{preview.droppedDocuments === 1 ? " belongs" : "s belong"} to removed steps and will be deleted.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <button
            className="btn btn-quiet"
            type="button"
            onClick={() => {
              if (preview) setPreview(null);
              else if (page > 0) setPage(page - 1);
              else router.push(cancelHref);
            }}
          >
            <ArrowLeft size={16} aria-hidden /> Back
          </button>
          <button className={`btn btn-primary btn-lg min-w-[11rem] ${submitting ? "is-busy" : ""}`} type="submit" aria-disabled={submitting}>
            {submitting ? <Loader2 size={17} className="spin" aria-hidden /> : null}
            {submitting ? "Building…" : submitLabel}
          </button>
        </div>
        {existing && page === 2 && !preview && formError === null ? (
          <p className="meta mt-3 text-right">Nothing changes until you apply.</p>
        ) : null}
      </form>
    </main>
  );
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

function ChangeList({ title, steps, icon }: { title: string; steps: string[]; icon: "add" | "remove" }) {
  return (
    <section>
      <h2 className="h3">{title}</h2>
      <ul className="mt-2 divided surface">
        {steps.map((step) => (
          <li key={step} className="flex items-center gap-3 px-4 py-2.5">
            {icon === "add" ? <Plus size={16} className="text-[var(--ok)]" aria-hidden /> : <Minus size={16} className="text-[var(--blocked)]" aria-hidden />}
            {step}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TradeChecks({ trades, onChange }: { trades: Trade[]; onChange: (trades: Trade[]) => void }) {
  return (
    <fieldset>
      <legend className="field-label">Trade work included</legend>
      <p className="field-hint">Each trade usually needs its own permit. Leave blank if none.</p>
      <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
        {(Object.keys(TRADE_LABELS) as Trade[]).map((trade) => (
          <label key={trade} className="check-row">
            <input
              type="checkbox"
              checked={trades.includes(trade)}
              onChange={() => onChange(trades.includes(trade) ? trades.filter((item) => item !== trade) : [...trades, trade])}
            />
            {TRADE_LABELS[trade]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="field-error mt-1">
      {message}
    </p>
  );
}

function NumberField({
  name,
  label,
  hint,
  prefix,
  suffix,
  value,
  min,
  step,
  error,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  value: number;
  min: number;
  step?: number;
  error?: string;
  onChange: (value: number) => void;
}) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="relative max-w-xs">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">{prefix}</span> : null}
        <input
          id={name}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          step={step ?? 1}
          className={`num ${prefix ? "!pl-7" : ""} ${suffix ? "!pr-16" : ""}`}
          value={Number.isFinite(value) ? value : ""}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">{suffix}</span> : null}
      </div>
      {hint ? (
        <p id={`${name}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${name}-error`} message={error} /> : null}
    </div>
  );
}

function SelectField({
  name,
  label,
  hint,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} className="max-w-sm" value={value} aria-describedby={hint ? `${name}-hint` : undefined} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={`${name}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function IntakePage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <IntakeForm />
      </Suspense>
    </AppShell>
  );
}

