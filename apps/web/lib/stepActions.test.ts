import { describe, expect, it } from "vitest";
import { makeStep } from "@/lib/engine/testUtils";
import { PHRASES, type PhraseKey } from "@/lib/i18n/phrases";
import { resolveCopy, type CopyVars } from "@/lib/i18n/types";
import { recommendAction, type StepSituation, type Translate } from "@/lib/stepActions";
import type { PermitStepStatus } from "@/lib/types";

const clear: StepSituation = { pendingNames: [], missingDocuments: [], overdue: false, blocked: false };
const step = (status: PermitStepStatus) => makeStep("fire", [], { status, department: "Fire Prevention", title: "Fire review" });

const en: Translate = (key: PhraseKey, vars?: CopyVars) =>
  resolveCopy(PHRASES[key], { locale: "en", plainLanguage: false }, vars);
const es: Translate = (key: PhraseKey, vars?: CopyVars) =>
  resolveCopy(PHRASES[key], { locale: "es", plainLanguage: false }, vars);

describe("recommendAction", () => {
  it("asks for missing documents before submission", () => {
    const action = recommendAction(step("preparing"), { ...clear, missingDocuments: ["Fire plan"] }, en);
    expect(action.headline).toBe("Upload 1 required document");
    expect(action.primary?.action).toEqual({ kind: "documents" });
    expect(action.tone).toBe("attention");
  });

  it("offers submission once documents are complete", () => {
    expect(recommendAction(step("preparing"), clear, en).primary?.action).toEqual({ kind: "status", status: "submitted" });
  });

  it("waits on prerequisites and never offers submission early", () => {
    const action = recommendAction(step("not_started"), { ...clear, pendingNames: ["Zoning review"], missingDocuments: ["Fire plan"] }, en);
    expect(action.headline).toBe("Starts after Zoning review");
    expect(action.primary?.action).toEqual({ kind: "status", status: "preparing" });
    const blocked = recommendAction(step("not_started"), { ...clear, pendingNames: ["Health permit"], blocked: true }, en);
    expect(blocked.tone).toBe("blocked");
    expect(blocked.primary).toBeUndefined();
  });

  it("moves reviews forward and escalates overdue ones", () => {
    expect(recommendAction(step("submitted"), clear, en).primary?.action).toEqual({ kind: "status", status: "in_review" });
    const review = recommendAction(step("in_review"), clear, en);
    expect(review.primary?.action).toEqual({ kind: "status", status: "approved" });
    expect(review.secondary?.action).toEqual({ kind: "status", status: "needs_changes" });
    const overdue = recommendAction(step("in_review"), { ...clear, overdue: true }, en);
    expect(overdue.tone).toBe("attention");
    expect(overdue.primary?.action).toEqual({ kind: "follow-up" });
  });

  it("routes requested changes to resubmission", () => {
    expect(recommendAction(step("needs_changes"), clear, en).primary?.action).toEqual({ kind: "status", status: "submitted" });
    const approved = recommendAction(step("approved"), clear, en);
    expect(approved.tone).toBe("done");
    expect(approved.primary).toBeUndefined();
  });

  it("translates chrome without changing the recommended move", () => {
    const situation: StepSituation = { ...clear, missingDocuments: ["Fire plan"] };
    const english = recommendAction(step("preparing"), situation, en);
    const spanish = recommendAction(step("preparing"), situation, es);
    expect(english.primary?.action).toEqual(spanish.primary?.action);
    expect(spanish.headline).toBe("Suba 1 documento requerido");
    expect(spanish.primary?.label).toBe("Subir documentos");
  });
});
