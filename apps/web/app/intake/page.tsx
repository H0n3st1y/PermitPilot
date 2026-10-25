"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Save, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useA11y } from "@/lib/a11y";
import { createProject, saveProject } from "@/lib/store";
import { useAuth } from "@/lib/supabase";
import { validateIntakeStep, type IntakeDraft, type IntakeErrors, type IntakeField } from "@/lib/intakeValidation";
import {
  TRADE_LABELS,
  type OccupancyGroup,
  type ProjectConfig,
  type Project,
  type Trade,
  type ZoneDistrict,
} from "@/lib/types";
import { DEFAULT_STATE, US_STATES, stateName } from "@/fixtures/states";
import { USE_CASE_GROUPS, USE_CASES, applyUseCase, findUseCase } from "@/fixtures/useCases";

const SPACE_LABELS: Record<OccupancyGroup, string> = {
  residential: "A home or apartment",
  business: "An office or workplace",
  assembly: "A place where people gather",
  mercantile: "A shop or store",
  storage: "Storage or warehouse space",
};

const AREA_LABELS: Record<ZoneDistrict, string> = {
  residential: "A neighborhood",
  downtown: "Downtown",
  commercial: "A commercial area",
  waterfront: "The waterfront",
  industrial: "An industrial area",
};

// shortcuts if they dont want to fill the whole form
const QUICK_PRESETS: {
  id: string;
  label: string;
  summary: string;
  config: ProjectConfig;
}[] = [
  {
    id: "home-bakery",
    label: "Home Bakery",
    summary: "320 sq ft cottage kitchen · Residential zone",
    config: {
      name: "Sunrise Sourdough Cottage Bakery",
      projectType: "food_business",
      squareFootage: 320,
      occupancy: "residential",
      zone: "residential",
      estimatedValuation: 8500,
      trades: ["electrical", "plumbing"],
      homeBased: true,
      foodPreparation: true,
      publicAttendance: false,
      visitorCount: 0,
      desiredStartDate: "",
      state: "NH",
      useCase: "home-bakery",
      personalCare: false,
      changingSpace: false,
    },
  },
  {
    id: "corner-cafe",
    label: "Corner Cafe Buildout",
    summary: "1,650 sq ft tenant buildout · Downtown · 4 trades",
    config: {
      name: "Beacon Corner Cafe & Roastery",
      projectType: "commercial_renovation",
      squareFootage: 1650,
      occupancy: "assembly",
      zone: "downtown",
      estimatedValuation: 95000,
      trades: ["electrical", "plumbing", "mechanical", "gas"],
      homeBased: false,
      foodPreparation: true,
      publicAttendance: true,
      visitorCount: 65,
      desiredStartDate: "",
      state: "NH",
      useCase: "cafe",
      personalCare: false,
      changingSpace: true,
    },
  },
  {
    id: "block-party",
    label: "Neighborhood Block Party",
    summary: "250 visitors · Food booths & public attendance",
    config: {
      name: "Wharf Street Autumn Block Party",
      projectType: "public_event",
      squareFootage: 4500,
      occupancy: "assembly",
      zone: "commercial",
      estimatedValuation: 12000,
      trades: ["electrical"],
      homeBased: false,
      foodPreparation: true,
      publicAttendance: true,
      visitorCount: 250,
      desiredStartDate: "",
      state: "NH",
      useCase: "neighborhood-event",
      personalCare: false,
      changingSpace: false,
    },
  },
];

const initial: ProjectConfig = {
  name: "",
  projectType: "food_business",
  squareFootage: 400,
  occupancy: "residential",
  zone: "residential",
  estimatedValuation: 15000,
  trades: [],
  homeBased: false,
  foodPreparation: false,
  publicAttendance: false,
  visitorCount: 0,
  desiredStartDate: "",
  state: DEFAULT_STATE,
  useCase: "",
  personalCare: false,
  changingSpace: false,
};

// suspense wrapper so the search-params hook can load
export default function IntakePage() {
  return <Suspense fallback={<p className="mx-auto max-w-2xl px-4 py-8" role="status">Loading project form…</p>}><IntakeForm /></Suspense>;
}

const STEP_LABELS = ["Project", "Space & work", "Review & build"];
const FIELD_IDS: Record<IntakeField, string> = { state: "state", useCase: "use-case-choices", squareFootage: "sqft", estimatedValuation: "valuation", name: "name", visitorCount: "visitors", desiredStartDate: "start" };

// turn the form strings into the config the roadmap builder expects
function asConfig(draft: IntakeDraft): ProjectConfig {
  return { ...draft, name: draft.name.trim(), squareFootage: Number(draft.squareFootage), estimatedValuation: Number(draft.estimatedValuation), visitorCount: draft.projectType === "public_event" && draft.publicAttendance ? Number(draft.visitorCount ?? 0) : undefined, desiredStartDate: draft.desiredStartDate || undefined };
}

// small error under a field, or nothing if that field is fine
function FieldError({ field, errors }: { field: IntakeField; errors: IntakeErrors }) {
  return errors[field] ? <p className="intake-field-error" id={`${field}-error`}>{errors[field]}</p> : null;
}

// three-step form that ends by saving a roadmap
function IntakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useA11y();
  const welcome = searchParams.get("welcome") === "1";
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<IntakeDraft>(initial);
  const [useCaseChosen, setUseCaseChosen] = useState(false);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [generationError, setGenerationError] = useState("");
  const [errorAttempt, setErrorAttempt] = useState(0);
  const [building, setBuilding] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftWarning, setDraftWarning] = useState("");
  const pendingRef = useRef(false);
  const createdRef = useRef<{ key: string; project: Project } | null>(null);
  const draftWriteFailed = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const warningRef = useRef<HTMLDivElement>(null);
  const initialStepRef = useRef(true);
  const choice = findUseCase(draft.useCase);
  const hasErrors = Object.keys(errors).length > 0;

  // pull a saved draft on first load, or warn if it is unreadable
  useEffect(() => {
    try {
      const raw = localStorage.getItem("permitpilot:draft");
      if (raw) {
        const saved = JSON.parse(raw);
        // version 2 wraps the config; older drafts are the config itself
        const parsed = saved.version === 2 ? saved.config : saved;
        // reject anything that is not a plain object
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid draft");
        const restored = { ...initial, ...parsed } as IntakeDraft;
        // trades, occupancy, and zone have to be values we know
        if (typeof restored.name !== "string" || !Array.isArray(restored.trades) || restored.trades.some((trade) => !(trade in TRADE_LABELS)) || !(restored.occupancy in SPACE_LABELS) || !(restored.zone in AREA_LABELS)) throw new Error("Invalid draft fields");
        setDraft(restored);
        setUseCaseChosen(Boolean(findUseCase(restored.useCase)));
        // only a version 2 draft remembers which step they were on
        if (saved.version === 2 && [1, 2, 3].includes(saved.step)) setStep(saved.step);
      }
    } catch { setDraftWarning("Your saved draft couldn't be read. You can start a new project below."); }
    setDraftReady(true);
  }, []);

  // keep the draft in local storage as they type
  useEffect(() => {
    // wait until the first read finishes, and don't overwrite during a build
    if (!draftReady || building) return;
    try {
      localStorage.setItem("permitpilot:draft", JSON.stringify({ version: 2, step, config: draft }));
      setDraftSaved(true);
      // a later successful write clears the earlier storage warning
      if (draftWriteFailed.current) { setDraftWarning(""); draftWriteFailed.current = false; }
    } catch {
      draftWriteFailed.current = true;
      setDraftSaved(false);
      setDraftWarning("Your browser couldn't save this draft. Keep this page open while you finish, or free some browser storage and try saving again.");
    }
  }, [draft, step, draftReady, building]);

  // move focus to the step heading after they change steps, not on first paint
  useEffect(() => {
    if (initialStepRef.current) { initialStepRef.current = false; return; }
    headingRef.current?.focus();
  }, [step]);
  // focus the error summary when a new failed attempt comes in
  useEffect(() => { if (errorAttempt) errorRef.current?.focus(); }, [errorAttempt]);

  // write one field and clear that field's error
  function change<K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => { const next = { ...current }; delete next[field as IntakeField]; return next; });
  }

  // clear errors, then step back or leave for the home page
  function goBack() {
    setErrors({}); setGenerationError("");
    if (step > 1) setStep((current) => current - 1);
    else router.push("/");
  }

  // save what they have and go home, or focus the warning if storage is full
  function saveAndExit() {
    try {
      localStorage.setItem("permitpilot:draft", JSON.stringify({ version: 2, step, config: draft }));
      router.push("/");
    } catch {
      draftWriteFailed.current = true;
      setDraftWarning("Your draft could not be saved. Your answers are still here. Free some browser storage, then use Save & exit again.");
      window.setTimeout(() => warningRef.current?.focus(), 0);
    }
  }

  // build the roadmap and open it, reusing the same project if they retry
  async function launchProject(config: ProjectConfig) {
    // ignore a second click while the first save is running
    if (pendingRef.current) return;
    pendingRef.current = true; setBuilding(true); setErrors({}); setGenerationError("");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    try {
      const key = JSON.stringify(config);
      // only create a new project when the answers actually changed
      if (createdRef.current?.key !== key) createdRef.current = { key, project: createProject(config) };
      const project = createdRef.current.project;
      saveProject(project);
      // Draft cleanup is not part of a successful project save.
      try { localStorage.removeItem("permitpilot:draft"); } catch { /* Keep the saved roadmap available. */ }
      router.push(`/projects/${project.id}?tab=overview&created=1`);
    } catch {
      setGenerationError("Your roadmap couldn't be saved. Your answers are still here. Free some browser storage, then try Build my checklist again.");
      setErrorAttempt((attempt) => attempt + 1);
      pendingRef.current = false; setBuilding(false);
    }
  }

  // check this step, or all three on review, then move forward or build
  function next() {
    // don't advance while a build is running or the draft is still loading
    if (pendingRef.current || !draftReady) return;
    // the last step rechecks steps 1, 2, and 3
    for (const currentStep of step === 3 ? [1, 2, 3] : [step]) {
      const nextErrors = validateIntakeStep(currentStep, draft, useCaseChosen);
      // first problem sends them back to that step
      if (Object.keys(nextErrors).length) { setStep(currentStep); setErrors(nextErrors); setGenerationError(""); setErrorAttempt((attempt) => attempt + 1); return; }
    }
    setErrors({}); setGenerationError("");
    if (step < 3) setStep((current) => current + 1);
    else void launchProject(asConfig(draft));
  }

  // apply a project type's defaults but keep the numbers they already typed
  function selectUseCase(id: string) {
    const option = findUseCase(id);
    if (!option) return;
    setUseCaseChosen(true);
    setDraft((current) => ({ ...applyUseCase(asConfig(current), option), name: current.name, squareFootage: current.squareFootage, estimatedValuation: current.estimatedValuation, visitorCount: current.visitorCount, desiredStartDate: current.desiredStartDate }));
    setErrors((current) => { const next = { ...current }; delete next.useCase; return next; });
  }

  // a sample preset either jumps to review or builds the roadmap now
  function applyPreset(config: ProjectConfig, immediately: boolean) {
    setErrors({}); setGenerationError(""); setUseCaseChosen(true); setDraft(config);
    if (immediately) void launchProject(config); else setStep(3);
  }

  // tie the hint and any error text to the input
  const fieldA11y = (field: IntakeField, hint?: string) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": [hint, errors[field] ? `${field}-error` : ""].filter(Boolean).join(" ") || undefined });

  return (
    <AppShell eyebrow={welcome ? t("intake.welcomeEyebrow") : t("intake.yourProject")}>
      <main id="main" className="intake-page mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="intake-topbar"><p className="eyebrow">{welcome ? "Your first project" : "New project"}</p><button type="button" className="intake-save-exit" disabled={building || !draftReady} onClick={saveAndExit}><Save size={15} aria-hidden />{t("intake.saveExit")}</button></div>
        <nav aria-label="Project setup progress" className="intake-progress">
          <ol>{STEP_LABELS.map((label, index) => <li key={label} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-complete" : ""} aria-current={index + 1 === step ? "step" : undefined}>
            {index + 1 < step ? <button type="button" disabled={building} onClick={() => { setErrors({}); setGenerationError(""); setStep(index + 1); }} aria-label={`Back to ${label}`}><span className="intake-step-dot"><Check size={14} aria-hidden /></span><span>{label}</span></button> : <span><span className="intake-step-dot">{index + 1}</span><span>{label}</span></span>}
          </li>)}</ol>
        </nav>
        <div className="intake-save-line"><span>{t("intake.stepOf", { step })}</span><span>{draftSaved ? "Draft saved in this browser" : "Your answers stay here while you work"}</span></div>
        {draftWarning ? <div ref={warningRef} tabIndex={-1} className="panel panel-warn mb-4 text-sm" role="status"><p>{draftWarning}</p></div> : null}
        {/* sample setups only for the demo judge, and only on step 1 */}
        {user?.isDemoJudge && step === 1 ? <details className="intake-presets panel mb-4"><summary><Sparkles size={16} aria-hidden />Try a sample setup</summary><p className="mt-2 text-sm text-[var(--muted)]">Fill the form with an example, or generate its demo checklist immediately.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{QUICK_PRESETS.map((preset) => <div key={preset.id} className="rounded-lg border border-[var(--line)] p-3"><strong>{preset.label}</strong><p className="mt-1 text-xs text-[var(--muted)]">{preset.summary}</p><div className="mt-3 flex flex-wrap gap-2"><button className="button secondary text-xs" type="button" disabled={building} onClick={() => applyPreset(preset.config, false)}>Fill form</button><button className="button primary text-xs" type="button" disabled={building} onClick={() => applyPreset(preset.config, true)}>Launch roadmap</button></div></div>)}</div></details> : null}
        {/* submit runs the same next-step check as the continue button */}
        <form className="panel intake-form" data-step={step} noValidate aria-busy={building} onSubmit={(event) => { event.preventDefault(); next(); }}>
          {/* summary of field errors, or the save failure */}
          {hasErrors || generationError ? <div ref={errorRef} tabIndex={-1} className="intake-error-summary" role="alert">
            <p className="font-semibold">{generationError || "Check the highlighted answers to continue."}</p>
            {hasErrors ? <ul>{Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#${FIELD_IDS[field as IntakeField]}`} onClick={(event) => { event.preventDefault(); document.getElementById(FIELD_IDS[field as IntakeField])?.focus(); }}>{message}</a></li>)}</ul> : null}
          </div> : null}
          <fieldset disabled={building || !draftReady} className="min-w-0">
            <div className="intake-step-heading"><h1 ref={headingRef} tabIndex={-1}>{step === 1 ? t("intake.step1Title") : step === 2 ? t("intake.step2Title") : "Review and name your project"}</h1><p>{step === 1 ? "Choose your state and the closest project type. These answers select the permit checklist." : step === 2 ? "Tell us about the space and planned work. Estimates are fine; they help calculate requirements and fees." : "Check your answers, add a project name, then build your planning checklist."}</p><p className="intake-required-note">{step === 1 ? "State and project type are required." : step === 2 ? "All space fields are required. Work types are optional." : "Project name is required. A start date is optional."}</p></div>
            {/* step 1: state and project type */}
            {step === 1 ? <>
              <div className="field"><label htmlFor="state">{t("intake.whichState")}</label><select id="state" required value={draft.state ?? DEFAULT_STATE} {...fieldA11y("state", "state-hint")} onChange={(event) => change("state", event.target.value)}>{US_STATES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><p id="state-hint" className="intake-hint">Use the state where the project will take place.</p><FieldError field="state" errors={errors} /></div>
              <fieldset id="use-case-choices" tabIndex={-1} className="intake-project-types" aria-invalid={Boolean(errors.useCase)} aria-describedby={errors.useCase ? "useCase-error" : undefined}><legend>What are you opening, changing or planning?</legend><FieldError field="useCase" errors={errors} />
                {USE_CASE_GROUPS.map((group) => <div key={group} className="intake-choice-group"><h2>{group}</h2><div className="intake-choice-grid">{USE_CASES.filter((option) => option.group === group).map((option) => <button key={option.id} type="button" aria-pressed={useCaseChosen && draft.useCase === option.id} className={`choice intake-choice ${useCaseChosen && draft.useCase === option.id ? "selected" : ""}`} onClick={() => selectUseCase(option.id)}><span><strong>{option.label}</strong><span className="intake-hint">{option.detail}</span></span>{useCaseChosen && draft.useCase === option.id ? <CheckCircle2 size={18} aria-hidden /> : null}</button>)}</div></div>)}
              </fieldset>
            </> : null}
            {/* step 2: space size, area, and trades */}
            {step === 2 ? <>
              <fieldset className="intake-field-group"><legend>About the space</legend><div className="intake-field-grid">
                <div className="field"><label htmlFor="sqft">{t("intake.sqft")}</label><input id="sqft" type="number" inputMode="decimal" step="any" min={0} max={1000000} required value={draft.squareFootage} {...fieldA11y("squareFootage", "sqft-hint")} onChange={(event) => change("squareFootage", event.target.value)} /><p id="sqft-hint" className="intake-hint">An approximate area is fine.</p><FieldError field="squareFootage" errors={errors} /></div>
                <div className="field"><label htmlFor="valuation">{t("intake.roughCost")}</label><input id="valuation" type="number" inputMode="decimal" step="any" min={0} max={10000000} required value={draft.estimatedValuation} {...fieldA11y("estimatedValuation", "valuation-hint")} onChange={(event) => change("estimatedValuation", event.target.value)} /><p id="valuation-hint" className="intake-hint">Enter 0 if no construction or trade work is planned.</p><FieldError field="estimatedValuation" errors={errors} /></div>
                <div className="field"><label htmlFor="occupancy">{t("intake.kindOfSpace")}</label><select id="occupancy" required value={draft.occupancy} onChange={(event) => change("occupancy", event.target.value as OccupancyGroup)}>{(Object.keys(SPACE_LABELS) as OccupancyGroup[]).map((key) => <option key={key} value={key}>{SPACE_LABELS[key]}</option>)}</select></div>
                <div className="field"><label htmlFor="zone">{t("intake.partOfTown")}</label><select id="zone" required value={draft.zone} onChange={(event) => change("zone", event.target.value as ZoneDistrict)}>{(Object.keys(AREA_LABELS) as ZoneDistrict[]).map((key) => <option key={key} value={key}>{AREA_LABELS[key]}</option>)}</select></div>
              </div></fieldset>
              <fieldset className="intake-field-group"><legend>Work and services</legend><label className="intake-check"><input type="checkbox" checked={Boolean(draft.changingSpace)} onChange={(event) => change("changingSpace", event.target.checked)} /><span>{t("intake.remodeling")}</span></label><p className="intake-hint">Select all work that applies. Suggested work types are preselected for your project; uncheck any you do not plan.</p><div className="intake-trade-grid">{(Object.keys(TRADE_LABELS) as Trade[]).map((trade) => <label key={trade} className={`intake-check ${draft.trades.includes(trade) ? "is-checked" : ""}`}><input type="checkbox" checked={draft.trades.includes(trade)} onChange={() => change("trades", draft.trades.includes(trade) ? draft.trades.filter((item) => item !== trade) : [...draft.trades, trade])} /><span>{TRADE_LABELS[trade]}</span></label>)}</div></fieldset>
            </> : null}
            {/* step 3: name, extras, and the review */}
            {step === 3 ? <>
              <div className="field"><label htmlFor="name">{t("intake.projectName")}</label><input id="name" required maxLength={120} autoComplete="off" value={draft.name} {...fieldA11y("name", "name-hint")} onChange={(event) => change("name", event.target.value)} placeholder="e.g., Maya’s Home Bakery" /><p id="name-hint" className="intake-hint">Choose a name you will recognize in your project list.</p><FieldError field="name" errors={errors} /></div>
              <div className="field"><label htmlFor="start">{t("intake.startDate")}</label><input id="start" type="date" value={draft.desiredStartDate ?? ""} {...fieldA11y("desiredStartDate", "start-hint")} onChange={(event) => change("desiredStartDate", event.target.value)} /><p id="start-hint" className="intake-hint">Starts the estimated schedule. Leave blank to plan from today; this is not a filing deadline.</p><FieldError field="desiredStartDate" errors={errors} /></div>
              {/* home-based question only for food projects */}
              {draft.foodPreparation || choice?.group === "Food" ? <label className="intake-check mt-4"><input type="checkbox" checked={draft.homeBased} onChange={(event) => change("homeBased", event.target.checked)} /><span>{t("intake.homeBased")}</span></label> : null}
              {/* attendance questions only for a public event */}
              {draft.projectType === "public_event" ? <fieldset className="intake-field-group"><legend>Event details</legend><label className="intake-check"><input type="checkbox" checked={draft.foodPreparation} onChange={(event) => change("foodPreparation", event.target.checked)} /><span>{t("intake.foodServed")}</span></label><label className="intake-check"><input type="checkbox" checked={draft.publicAttendance} aria-controls="event-attendance" aria-expanded={draft.publicAttendance} onChange={(event) => { change("publicAttendance", event.target.checked); setErrors((current) => { const next = { ...current }; delete next.visitorCount; return next; }); }} /><span>{t("intake.publicAttend")}</span></label>{draft.publicAttendance ? <div className="field intake-conditional" id="event-attendance"><label htmlFor="visitors">{t("intake.attendance")}</label><input id="visitors" type="number" inputMode="numeric" step={1} min={0} required value={draft.visitorCount ?? ""} {...fieldA11y("visitorCount", "visitors-hint")} onChange={(event) => change("visitorCount", event.target.value)} /><p id="visitors-hint" className="intake-hint">Use your best estimate of the number of visitors.</p><FieldError field="visitorCount" errors={errors} /></div> : null}</fieldset> : null}
              <section className="intake-review" aria-labelledby="intake-review-title"><div className="intake-review-heading"><h2 id="intake-review-title">Your answers</h2><button type="button" className="intake-edit" onClick={() => { setErrors({}); setStep(1); }}>Edit project type</button></div><dl><div><dt>Project</dt><dd>{choice?.label || "Not selected"} · {stateName(draft.state)}</dd></div><div><dt>Space</dt><dd>{Number(draft.squareFootage).toLocaleString()} sq ft · {SPACE_LABELS[draft.occupancy]} · {AREA_LABELS[draft.zone]}</dd></div><div><dt>Estimated work cost</dt><dd>${Number(draft.estimatedValuation).toLocaleString()}</dd></div><div><dt>Work types</dt><dd>{draft.trades.length ? draft.trades.map((trade) => TRADE_LABELS[trade]).join(", ") : "None selected"}</dd></div></dl><button type="button" className="intake-edit" onClick={() => { setErrors({}); setStep(2); }}>Edit space and work</button></section>
              <aside className="intake-build-note"><h2>What happens next</h2><p>We’ll save a roadmap with permit steps, required documents, estimated fees and planning dates based on these answers.</p><p>You’ll see which step to review first and which permits depend on earlier approvals. Nothing is sent to a permit office.</p></aside>
            </> : null}
            <div className="intake-actions"><button className="button secondary" type="button" onClick={goBack}><ArrowLeft size={17} aria-hidden />{t("intake.back")}</button><button className="button primary" type="submit" disabled={building || !draftReady}>{building ? "Building your roadmap…" : step === 3 ? t("intake.build") : t("intake.continue")}<ArrowRight size={17} aria-hidden /></button></div>
          </fieldset>
          <p className="intake-build-status" role="status">{building ? "Building and saving your roadmap… You’ll open its Roadmap overview next." : ""}</p>
        </form>
      </main>
    </AppShell>
  );
}
