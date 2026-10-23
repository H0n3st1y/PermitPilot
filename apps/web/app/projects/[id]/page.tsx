"use client";

import { use } from "react";
import { ProjectDashboard } from "@/components/project/ProjectDashboard";

export default function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; tour?: string }>;
}) {
  // next 15 gives params as a promise now
  const { id } = use(params);
  const { tab, tour } = use(searchParams);
  return <ProjectDashboard id={id} initialTab={tab} initialTour={tour === "1"} />;
}
