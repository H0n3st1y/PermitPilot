import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <main id="main" className="container-narrow py-16">
        <h1 className="page-title">Page not found</h1>
        <p className="mt-3 text-[var(--ink-2)]">That address doesn&apos;t match anything in PermitPilot.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/">
            Go to your projects
          </Link>
          <Link className="btn btn-secondary" href="/intake">
            Start a project
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
