"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SAMPLE_PROJECT_ID, sampleProject } from "@/lib/sample";
import { deleteFiles } from "@/lib/storage/files";
import { loadProject, saveProject } from "@/lib/storage/projects";

/** Opens the sample project, creating it on first visit. `?reset=1` restores the original sample. */
function DemoLoader() {
  const router = useRouter();
  const reset = useSearchParams().get("reset") === "1";
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
        router.replace(`/projects/${SAMPLE_PROJECT_ID}`);
      } catch (cause) {
        console.error("PermitPilot: could not open the sample project", cause);
        setError(cause instanceof Error ? cause.message : "The sample project could not be created.");
      }
    }
    void open();
  }, [reset, router]);

  return (
    <main id="main" className="container-narrow py-16">
      {error ? (
        <>
          <h1 className="page-title">The sample project couldn&apos;t open</h1>
          <p className="callout callout-blocked mt-4" role="alert">
            {error}
          </p>
          <Link className="btn btn-primary mt-6" href="/">
            Back to home
          </Link>
        </>
      ) : (
        <p role="status" className="meta inline-flex items-center gap-2"><Loader2 size={16} className="spin" aria-hidden /> Opening the Harbor Kitchen sample…</p>
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
