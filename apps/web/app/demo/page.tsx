"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getOrSeedHarborKitchen } from "@/lib/store";
import { getCurrentUser, signInAsDemoJudge } from "@/lib/supabase";

// open the harbor kitchen sample and hop into its project page
export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // sign in if needed, seed the sample, then replace this route
  useEffect(() => {
    // ignore the result if we already left the page
    let active = true;
    async function launchDemo() {
      // Seed the sample, then preserve a requested supporting section.
      // demo judge account when nobody is signed in yet
      if (!getCurrentUser()) {
        await signInAsDemoJudge();
      }
      // effect cleaned up, so don't navigate
      if (!active) return;
      const project = getOrSeedHarborKitchen();
      const params =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const tour = params?.get("tour") === "1" ? "&tour=1" : "";
      const requestedTab = params?.get("tab") ?? "graph";
      // keep a known tab, otherwise land on the graph
      const tab = !tour && ["overview", "graph", "timeline", "documents", "fees", "inspections"].includes(requestedTab) ? requestedTab : "graph";
      router.replace(`/projects/${project.id}?tab=${tab}${tour}`);
    }
    // show the error panel if seeding or sign-in throws
    void launchDemo().catch(() => { if (active) setError(true); });
    return () => {
      active = false;
    };
  }, [router, attempt]);

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-xl px-4 py-16">
        {/* error panel, or the loading line while the sample opens */}
        {error ? <div role="alert">
          <h1 className="font-serif text-2xl text-[var(--navy)]">The demonstration could not open</h1>
          <p className="mt-2">Check that browser storage is available, then try again.</p>
          {/* clear the error and bump attempt so the effect runs again */}
          <button type="button" className="button primary mt-4" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Try again</button>
        </div> : <p role="status" aria-live="polite">Loading the Harbor Kitchen demonstration project…</p>}
      </main>
    </AppShell>
  );
}
