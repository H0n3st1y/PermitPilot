"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { sampleProject, saveProject } from "@/lib/store";

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    const project = sampleProject();
    saveProject(project);
    router.replace(`/projects/${project.id}`);
  }, [router]);

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-xl px-4 py-16">
        <p>Loading the Harbor Kitchen demonstration project…</p>
      </main>
    </AppShell>
  );
}
