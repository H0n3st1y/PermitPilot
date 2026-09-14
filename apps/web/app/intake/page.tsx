"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { createProject, saveProject } from "@/lib/store";
import {
  OCCUPANCY_LABELS,
  PROJECT_TYPE_LABELS,
  TRADE_LABELS,
  ZONE_LABELS,
  type OccupancyGroup,
  type ProjectConfig,
  type ProjectType,
  type Trade,
  type ZoneDistrict,
} from "@/lib/types";

const TYPES: { id: ProjectType; detail: string }[] = [
  { id: "food_business", detail: "Including home-based food activity" },
  { id: "room_addition", detail: "Residential construction or addition" },
  { id: "commercial_renovation", detail: "Tenant improvement or change of occupancy" },
  { id: "public_event", detail: "A temporary event with public attendance" },
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
};

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectConfig>(initial);
  const [typeChosen, setTypeChosen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("permitpilot:draft");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ProjectConfig & { typeChosen?: boolean };
      setDraft({ ...initial, ...parsed });
      if (parsed.projectType) setTypeChosen(true);
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

  function next() {
    if (step === 1 && !typeChosen) {
      setError("Choose a project type to continue.");
      return;
    }
    if (step === 2 && (draft.squareFootage <= 0 || draft.estimatedValuation < 0)) {
      setError("Enter square footage and an estimated valuation.");
      return;
    }
    if (step === 3 && !draft.name.trim()) {
      setError("Give your project a name to continue.");
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
      foodPreparation: draft.projectType === "food_business" ? true : draft.foodPreparation,
      visitorCount: draft.projectType === "public_event" ? draft.visitorCount : undefined,
      desiredStartDate: draft.desiredStartDate || undefined,
    });
    saveProject(project);
    localStorage.removeItem("permitpilot:draft");
    router.push(`/projects/${project.id}`);
  }

  return (
    <AppShell eyebrow="Saved automatically on this device">
      <main id="main" className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Project intake · Step {step} of 3</p>
            <div className="mt-2 flex gap-1" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((value) => (
                <span
                  key={value}
                  className={`h-1.5 w-10 rounded-full ${value <= step ? "bg-[var(--navy)]" : "bg-[var(--line)]"}`}
                />
              ))}
            </div>
          </div>
          <Link className="nav-link" href="/">
            Save & exit
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
              <h1 className="font-serif text-3xl text-[var(--navy)]">What are you planning?</h1>
              <p className="mt-2 text-[var(--muted)]">
                We only ask questions that change the demonstration roadmap.
              </p>
              <div className="mt-4 grid gap-3">
                {TYPES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`choice ${typeChosen && draft.projectType === option.id ? "selected" : ""}`}
                    onClick={() => {
                      setTypeChosen(true);
                      setDraft({
                        ...draft,
                        projectType: option.id,
                        occupancy:
                          option.id === "public_event"
                            ? "assembly"
                            : option.id === "commercial_renovation"
                              ? "business"
                              : option.id === "food_business"
                                ? "residential"
                                : "residential",
                        foodPreparation: option.id === "food_business",
                        publicAttendance: option.id === "public_event",
                      });
                    }}
                  >
                    <strong>{PROJECT_TYPE_LABELS[option.id]}</strong>
                    <span className="mt-1 block text-sm text-[var(--muted)]">{option.detail}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <h1 className="font-serif text-3xl text-[var(--navy)]">Site, size, and trades</h1>
              <div className="field">
                <label htmlFor="sqft">Square footage</label>
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
                <label htmlFor="occupancy">Occupancy group</label>
                <select
                  id="occupancy"
                  value={draft.occupancy}
                  onChange={(event) => setDraft({ ...draft, occupancy: event.target.value as OccupancyGroup })}
                >
                  {(Object.keys(OCCUPANCY_LABELS) as OccupancyGroup[]).map((key) => (
                    <option key={key} value={key}>
                      {OCCUPANCY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="zone">Zoning district</label>
                <select
                  id="zone"
                  value={draft.zone}
                  onChange={(event) => setDraft({ ...draft, zone: event.target.value as ZoneDistrict })}
                >
                  {(Object.keys(ZONE_LABELS) as ZoneDistrict[]).map((key) => (
                    <option key={key} value={key}>
                      {ZONE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="valuation">Estimated construction or project valuation (USD)</label>
                <input
                  id="valuation"
                  type="number"
                  min={0}
                  max={10000000}
                  value={draft.estimatedValuation}
                  onChange={(event) => setDraft({ ...draft, estimatedValuation: Number(event.target.value) })}
                />
              </div>
              <fieldset className="mt-4">
                <legend className="font-semibold">Trades included</legend>
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
              <h1 className="font-serif text-3xl text-[var(--navy)]">Name and details</h1>
              <div className="field">
                <label htmlFor="name">Project name</label>
                <input
                  id="name"
                  maxLength={120}
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="e.g., Harbor Kitchen"
                />
              </div>
              <div className="field">
                <label htmlFor="start">Desired start date (optional)</label>
                <input
                  id="start"
                  type="date"
                  value={draft.desiredStartDate ?? ""}
                  onChange={(event) => setDraft({ ...draft, desiredStartDate: event.target.value })}
                />
              </div>
              {draft.projectType === "food_business" ? (
                <label className="field-check">
                  <input
                    type="checkbox"
                    checked={draft.homeBased}
                    onChange={(event) => setDraft({ ...draft, homeBased: event.target.checked })}
                  />
                  This activity will be home-based
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
                    Food will be prepared or served
                  </label>
                  <label className="field-check">
                    <input
                      type="checkbox"
                      checked={draft.publicAttendance}
                      onChange={(event) => setDraft({ ...draft, publicAttendance: event.target.checked })}
                    />
                    The public will attend
                  </label>
                  <div className="field">
                    <label htmlFor="visitors">Expected attendance</label>
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
                <strong>Before we generate your roadmap</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  This uses fictional demonstration rules, model-code citations, and planning ranges. It does not
                  determine what is legally required.
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
              <ArrowLeft size={17} aria-hidden /> Back
            </button>
            <button className="button primary" type="button" onClick={next}>
              {step === 3 ? "Generate roadmap" : "Continue"}
              <ArrowRight size={17} aria-hidden />
            </button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
