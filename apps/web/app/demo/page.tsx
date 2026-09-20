"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { isPhraseKey } from "@/lib/i18n/labels";
import { useCopy } from "@/lib/i18n/useCopy";
import { SAMPLE_PROJECT_ID, sampleProject } from "@/lib/sample";
import { deleteFiles } from "@/lib/storage/files";
import { loadProject, saveProject } from "@/lib/storage/projects";

/** Opens the sample project, creating it on first visit. `?reset=1` restores the original sample. */
function DemoLoader() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useCopy();
  const reset = params.get("reset") === "1";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function open() {
      try {
        const existing = loadProject(SAMPLE_PROJECT_ID);
        if (reset || existing.status !== "ok") {
          if (existing.status === "ok") {
            await deleteFiles(existing.project.documents.map((doc) => doc.id)).catch((cause) =>
              console.error("PermitPilot: could not clear sample uploads", cause),
            );
          }
          saveProject(sampleProject());
        }
        // Carry any view or step through the redirect, so a link straight to
        // the graph or a single permit still lands where it points.
        const forwarded = new URLSearchParams(params.toString());
        forwarded.delete("reset");
        const query = forwarded.toString();
        router.replace(`/projects/${SAMPLE_PROJECT_ID}${query ? `?${query}` : ""}`);
      } catch (cause) {
        console.error("PermitPilot: could not open the sample project", cause);
        setError(cause instanceof Error ? cause.message : "demo.failedBody");
      }
    }
    void open();
  }, [reset, params, router]);

  return (
    <main id="main" className="container-narrow py-16">
      {error ? (
        <>
          <h1 className="page-title">{t("demo.failed")}</h1>
          <p className="callout callout-blocked mt-4" role="alert">
            {isPhraseKey(error) ? t(error) : error}
          </p>
          <Link className="btn btn-primary mt-6" href="/">
            {t("demo.backHome")}
          </Link>
        </>
      ) : (
        <p role="status" className="meta inline-flex items-center gap-2">
          <Loader2 size={16} className="spin" aria-hidden /> {t("demo.opening")}
        </p>
      )}
    </main>
  );
}

export default function DemoPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <DemoLoader />
      </Suspense>
    </AppShell>
  );
}
