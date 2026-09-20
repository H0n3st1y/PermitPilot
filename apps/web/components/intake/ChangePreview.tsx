"use client";

import { Minus, Plus } from "lucide-react";
import { StepHeading } from "@/components/intake/fields";
import type { RoadmapChange } from "@/lib/engine/project";
import { useCopy } from "@/lib/i18n/useCopy";
import type { RefObject } from "react";

export type RoadmapPreview = RoadmapChange & { droppedDocuments: number };

/**
 * What re-running the rules would do before it is applied.
 *
 * Editing a project's answers can add or drop permits, and dropping a permit
 * discards its uploads, so nothing is saved until the applicant sees this.
 */
export function ChangePreview({
  preview,
  headingRef,
}: {
  preview: RoadmapPreview;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const { t } = useCopy();
  const unchanged = preview.added.length === 0 && preview.removed.length === 0;
  return (
    <div className="space-y-5">
      <StepHeading headingRef={headingRef} title={t("intake.preview.title")}>
        {t("intake.preview.lede")}
      </StepHeading>

      {unchanged ? <div className="callout callout-neutral">{t("intake.preview.unchanged")}</div> : null}

      {preview.added.length ? (
        <ChangeList title={t("intake.preview.added")} steps={preview.added.map((step) => step.title)} icon="add" />
      ) : null}

      {preview.removed.length ? (
        <ChangeList title={t("intake.preview.removed")} steps={preview.removed.map((step) => step.title)} icon="remove" />
      ) : null}

      {preview.droppedDocuments ? (
        <div className="callout callout-attention">
          {preview.droppedDocuments === 1
            ? t("intake.preview.droppedOne")
            : t("intake.preview.droppedMany", { count: preview.droppedDocuments })}
        </div>
      ) : null}
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
            {icon === "add" ? (
              <Plus size={16} className="text-[var(--ok)]" aria-hidden />
            ) : (
              <Minus size={16} className="text-[var(--blocked)]" aria-hidden />
            )}
            {step}
          </li>
        ))}
      </ul>
    </section>
  );
}
