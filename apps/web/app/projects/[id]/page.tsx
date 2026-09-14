"use client";

import { use } from "react";
import { ProjectDashboard } from "@/components/project/ProjectDashboard";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectDashboard id={id} />;
}
