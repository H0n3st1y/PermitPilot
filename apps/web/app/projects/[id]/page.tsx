"use client";

import { use } from "react";
import { ProjectDashboard } from "@/components/project/ProjectDashboard";

// pull the id and query out of the promises, then render the dashboard
export default function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; tour?: string; created?: string }>;
}) {
  // next 15 gives params as a promise now
  const { id } = use(params);
  const { tab, tour, created } = use(searchParams);
  return <ProjectDashboard id={id} initialTab={tab} initialTour={tour === "1"} initialCreated={created === "1"} />;
}
