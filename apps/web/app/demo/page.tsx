"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getOrSeedHarborKitchen } from "@/lib/store";
import { getCurrentUser, signInAsDemoJudge } from "@/lib/supabase";

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function launchDemo() {
      // /demo just dumps you on harbor kitchen
      if (!getCurrentUser()) {
        await signInAsDemoJudge();
      }
      if (!active) return;
      const project = getOrSeedHarborKitchen();
      const params =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const tour = params?.get("tour") === "1" ? "&tour=1" : "";
      router.replace(`/projects/${project.id}?tab=graph${tour}`);
    }
    void launchDemo();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-xl px-4 py-16">
        <p>Loading the Harbor Kitchen demonstration project…</p>
      </main>
    </AppShell>
  );
}
