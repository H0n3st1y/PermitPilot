"use client";

import { Suspense, use } from "react";
import { ProjectDashboard } from "@/components/project/ProjectDashboard";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <ProjectDashboard id={decodeURIComponent(id)} />
    </Suspense>
  );
}
