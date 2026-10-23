"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useA11y } from "@/lib/a11y";
import { createProject, saveProject } from "@/lib/store";
import { useAuth } from "@/lib/supabase";
import {
  TRADE_LABELS,
  type OccupancyGroup,
  type ProjectConfig,
  type Trade,
  type ZoneDistrict,
} from "@/lib/types";
import { DEFAULT_STATE, US_STATES } from "@/fixtures/states";
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

export default function IntakePage() {
  return (
    <Suspense fallback={null}>
      <IntakeForm />
    </Suspense>
  );
}

function IntakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useA11y();
  const welcome = searchParams.get("welcome") === "1";
  const showPresets = Boolean(user?.isDemoJudge);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectConfig>(initial);
  const [useCaseChosen, setUseCaseChosen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("permitpilot:draft");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ProjectConfig & { typeChosen?: boolean };
      setDraft({ ...initial, ...parsed });
      if (parsed.useCase) setUseCaseChosen(true);
    } catch {
      localStorage.removeItem("permitpilot:draft");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("permitpilot:draft", JSON.stringify(draft));
  }, [draft]);

  function toggleTrade(trade: Trade) {
    setDraft((current) => ({
      ...current,
      trades: current.trades.includes(trade)
        ? current.trades.filter((item) => item !== trade)
        : [...current.trades, trade],
    }));
  }

  function applyPreset(presetConfig: ProjectConfig, launchImmediately: boolean) {
    setError("");
    setUseCaseChosen(true);
    setDraft(presetConfig);
    if (launchImmediately) {
      const project = createProject({
        ...presetConfig,
        desiredStartDate: presetConfig.desiredStartDate || undefined,
      });
      saveProject(project);
      localStorage.removeItem("permitpilot:draft");
      router.push(`/projects/${project.id}?tab=graph`);
    } else {
      setStep(3);
    }
  }

  function next() {
    if (step === 1 && (!draft.state || !useCaseChosen)) {
      setError(t("intake.errState"));
      return;
    }
    if (step === 2 && (draft.squareFootage <= 0 || draft.estimatedValuation < 0)) {
      setError(t("intake.errSize"));
      return;
    }
    if (step === 3 && !draft.name.trim()) {
      setError(t("intake.errName"));
      return;
    }
    setError("");
    if (step < 3) {
      setStep((value) => value + 1);
      return;
    }
    const project = createProject({
      ...draft,
      name: draft.name.trim(),
      state: draft.state || DEFAULT_STATE,
      visitorCount: draft.projectType === "public_event" ? draft.visitorCount : undefined,
      desiredStartDate: draft.desiredStartDate || undefined,
    });
    saveProject(project);
    localStorage.removeItem("permitpilot:draft");
    router.push(`/projects/${project.id}?tab=graph`);
  }

  return (
    <AppShell eyebrow={welcome ? t("intake.welcomeEyebrow") : t("intake.yourProject")}>
      <main id="main" className="mx-auto max-w-2xl px-4 py-8">
        {welcome ? (
          <section className="panel mb-5">
            <p className="eyebrow inline-flex items-center gap-1.5">
              <Sparkles size={14} aria-hidden />
              {t("intake.aboutMinute")}
            </p>
            <h1 className="mt-1 font-serif text-2xl text-[var(--navy)]">
              {t("intake.welcomeTitle")}
            </h1>
            <p className="mt-2 text-sm text-[var(--ink)]">{t("intake.welcomeBody")}</p>
          </section>
        ) : null}

        {showPresets ? (
          <section className="panel mb-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow inline-flex items-center gap-1.5">
                  <Sparkles size={14} aria-hidden />
                  {t("intake.presetsTitle")}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{t("intake.presetsBody")}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {QUICK_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="flex flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--navy)]">{preset.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{preset.summary}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="button primary !min-h-[34px] !px-2.5 text-xs"
                      onClick={() => applyPreset(preset.config, true)}
                    >
                      {t("intake.launch")}
                    </button>
                    <button
                      type="button"
                      className="button secondary !min-h-[34px] !px-2.5 text-xs"
                      onClick={() => applyPreset(preset.config, false)}
                    >
                      {t("intake.fillForm")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{t("intake.stepOf", { step })}</p>
            <div className="mt-2 flex gap-1" aria-label={t("intake.stepOf", { step })}>
              {[1, 2, 3].map((value) => (
                <span
                  key={value}
                  className={`h-1.5 w-10 rounded-full ${value <= step ? "bg-[var(--navy)]" : "bg-[var(--line)]"}`}
                />
              ))}
            </div>
          </div>
          <Link className="nav-link" href="/">
            {t("intake.saveExit")}
          </Link>
        </div>
        <div className="panel">
          {error ? (
            <div className="demo-banner mb-4 rounded-lg border border-[var(--line)]" role="alert">
              {error}
            </div>
          ) : null}
          {step === 1 ? (
            <>
              <h1 className="font-serif text-3xl text-[var(--navy)]">{t("intake.step1Title")}</h1>
              <p className="mt-2 text-[var(--muted)]">{t("intake.step1Body")}</p>
              <div className="field">
                <label htmlFor="state">{t("intake.whichState")}</label>
                <select
                  id="state"
                  value={draft.state ?? DEFAULT_STATE}
                  onChange={(event) => setDraft({ ...draft, state: event.target.value })}
                >
                  {US_STATES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-5 space-y-5">
                {USE_CASE_GROUPS.map((group) => (
                  <div key={group}>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--seal)]">{group}</p>
                    <div className="mt-2 grid gap-2">
                      {USE_CASES.filter((option) => option.group === group).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`choice ${useCaseChosen && draft.useCase === option.id ? "selected" : ""}`}
                          onClick={() => {
                            setUseCaseChosen(true);
                            setDraft(applyUseCase(draft, option));
                          }}
                        >
                          <strong>{option.label}</strong>
                          <span className="mt-1 block text-sm text-[var(--muted)]">{option.detail}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <h1 className="font-serif text-3xl text-[var(--navy)]">{t("intake.step2Title")}</h1>
              <p className="mt-2 text-[var(--muted)]">{t("intake.step2Body")}</p>
              <div className="field">
                <label htmlFor="sqft">{t("intake.sqft")}</label>
                <input
                  id="sqft"
                  type="number"
                  min={1}
                  max={1000000}
                  value={draft.squareFootage}
                  onChange={(event) => setDraft({ ...draft, squareFootage: Number(event.target.value) })}
                />
              </div>
              <div className="field">
                <label htmlFor="occupancy">{t("intake.kindOfSpace")}</label>
                <select
                  id="occupancy"
                  value={draft.occupancy}
                  onChange={(event) => setDraft({ ...draft, occupancy: event.target.value as OccupancyGroup })}
                >
                  {(Object.keys(SPACE_LABELS) as OccupancyGroup[]).map((key) => (
                    <option key={key} value={key}>
                      {SPACE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="zone">{t("intake.partOfTown")}</label>
                <select
                  id="zone"
                  value={draft.zone}
                  onChange={(event) => setDraft({ ...draft, zone: event.target.value as ZoneDistrict })}
                >
                  {(Object.keys(AREA_LABELS) as ZoneDistrict[]).map((key) => (
                    <option key={key} value={key}>
                      {AREA_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="valuation">{t("intake.roughCost")}</label>
                <input
                  id="valuation"
                  type="number"
                  min={0}
                  max={10000000}
                  value={draft.estimatedValuation}
                  onChange={(event) => setDraft({ ...draft, estimatedValuation: Number(event.target.value) })}
                />
              </div>
              <label className="field-check mt-4">
                <input
                  type="checkbox"
                  checked={Boolean(draft.changingSpace)}
                  onChange={(event) => setDraft({ ...draft, changingSpace: event.target.checked })}
                />
                {t("intake.remodeling")}
              </label>
              <fieldset className="mt-4">
                <legend className="font-semibold">{t("intake.whatWork")}</legend>
                {(Object.keys(TRADE_LABELS) as Trade[]).map((trade) => (
                  <label key={trade} className="field-check">
                    <input
                      type="checkbox"
                      checked={draft.trades.includes(trade)}
                      onChange={() => toggleTrade(trade)}
                    />
                    {TRADE_LABELS[trade]}
                  </label>
                ))}
              </fieldset>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <h1 className="font-serif text-3xl text-[var(--navy)]">{t("intake.step3Title")}</h1>
              <p className="mt-2 text-[var(--muted)]">{t("intake.step3Body")}</p>
              <div className="field">
                <label htmlFor="name">{t("intake.projectName")}</label>
                <input
                  id="name"
                  maxLength={120}
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="e.g., Maya’s Home Bakery"
                />
              </div>
              <div className="field">
                <label htmlFor="start">{t("intake.startDate")}</label>
                <input
                  id="start"
                  type="date"
                  value={draft.desiredStartDate ?? ""}
                  onChange={(event) => setDraft({ ...draft, desiredStartDate: event.target.value })}
                />
              </div>
              {draft.foodPreparation || findUseCase(draft.useCase)?.group === "Food" ? (
                <label className="field-check">
                  <input
                    type="checkbox"
                    checked={draft.homeBased}
                    onChange={(event) => setDraft({ ...draft, homeBased: event.target.checked })}
                  />
                  {t("intake.homeBased")}
                </label>
              ) : null}
              {draft.projectType === "public_event" ? (
                <>
                  <label className="field-check">
                    <input
                      type="checkbox"
                      checked={draft.foodPreparation}
                      onChange={(event) => setDraft({ ...draft, foodPreparation: event.target.checked })}
                    />
                    {t("intake.foodServed")}
                  </label>
                  <label className="field-check">
                    <input
                      type="checkbox"
                      checked={draft.publicAttendance}
                      onChange={(event) => setDraft({ ...draft, publicAttendance: event.target.checked })}
                    />
                    {t("intake.publicAttend")}
                  </label>
                  <div className="field">
                    <label htmlFor="visitors">{t("intake.attendance")}</label>
                    <input
                      id="visitors"
                      type="number"
                      min={0}
                      value={draft.visitorCount ?? 0}
                      onChange={(event) => setDraft({ ...draft, visitorCount: Number(event.target.value) })}
                    />
                  </div>
                </>
              ) : null}
              <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
                <strong>{t("intake.beforeTitle")}</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("intake.beforeBody", { state: draft.state || "NH" })}
                </p>
              </div>
            </>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button
              className="button secondary"
              type="button"
              onClick={() => (step > 1 ? setStep((value) => value - 1) : router.push("/"))}
            >
              <ArrowLeft size={17} aria-hidden /> {t("intake.back")}
            </button>
            <button className="button primary" type="button" onClick={next}>
              {step === 3 ? t("intake.build") : t("intake.continue")}
              <ArrowRight size={17} aria-hidden />
            </button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
