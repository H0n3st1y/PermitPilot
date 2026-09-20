"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ChangePreview } from "@/components/intake/ChangePreview";
import { DetailsStep } from "@/components/intake/DetailsStep";
import { ProjectTypeStep } from "@/components/intake/ProjectTypeStep";
import { SpaceStep } from "@/components/intake/SpaceStep";
import { AppShell } from "@/components/layout/AppShell";
import { useIntakeForm } from "@/lib/hooks/useIntakeForm";
import { isPhraseKey } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import { INTAKE_STEP_KEYS } from "@/lib/intake";

/**
 * The intake wizard's shell: progress, the current step, and the controls.
 *
 * All state lives in useIntakeForm and each page is its own component, so this
 * file only decides what to show, never how answers are stored or validated.
 */
function IntakeForm() {
  const form = useIntakeForm();
  const { t } = useCopy();
  const { config, errors, headingRef, preview, page } = form;

  if (!form.loaded) {
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
        <p className="meta">
          {form.existing ? t("intake.editing", { name: form.existing.config.name }) : t("intake.newProject")}
        </p>
        <Link className="nav-link text-sm" href={form.cancelHref}>
          {form.existing ? t("intake.cancel") : t("intake.saveExit")}
        </Link>
      </div>

      <ol className="stepper" aria-label={t("intake.progress")}>
        {INTAKE_STEP_KEYS.map((key, index) => (
          <li
            key={key}
            className={index < page ? "is-done" : index === page ? "is-current" : ""}
            aria-current={index === page ? "step" : undefined}
          >
            <span className="num">{index + 1}</span> <span className="stepper-label">{t(key)}</span>
            <span className="sr-only">{index < page ? t("intake.stepDone") : ""}</span>
          </li>
        ))}
      </ol>

      <form
        ref={form.formRef}
        className="mt-8"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          form.next();
        }}
      >
        {form.formError ? (
          <div className="callout callout-blocked mb-6" role="alert">
            {isPhraseKey(form.formError) ? t(form.formError) : form.formError}
          </div>
        ) : null}

        <div key={preview ? "preview" : page} className="fade-in">
          {preview ? (
            <ChangePreview preview={preview} headingRef={headingRef} />
          ) : (
            <>
              {page === 0 ? (
                <ProjectTypeStep
                  config={config}
                  errors={errors}
                  headingRef={headingRef}
                  typeChosen={form.typeChosen}
                  onChooseType={form.chooseType}
                />
              ) : null}
              {page === 1 ? (
                <SpaceStep config={config} errors={errors} headingRef={headingRef} update={form.update} />
              ) : null}
              {page === 2 ? (
                <DetailsStep
                  config={config}
                  errors={errors}
                  headingRef={headingRef}
                  update={form.update}
                  onJumpToPage={form.setPage}
                />
              ) : null}
            </>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <button className="btn btn-quiet" type="button" onClick={form.back}>
            <ArrowLeft size={16} aria-hidden /> {t("action.back")}
          </button>
          <button
            className={`btn btn-primary btn-lg min-w-[11rem] ${form.submitting ? "is-busy" : ""}`}
            type="submit"
            aria-disabled={form.submitting}
          >
            {form.submitting ? <Loader2 size={17} className="spin" aria-hidden /> : null}
            {form.submitting ? t("intake.building") : form.submitLabel}
          </button>
        </div>

        {form.existing && form.isLast && !preview && form.formError === null ? (
          <p className="meta mt-3 text-right">{t("intake.nothingChanges")}</p>
        ) : null}
      </form>
    </main>
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
