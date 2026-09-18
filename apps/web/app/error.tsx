"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Route-level error boundary: keeps the page shell usable and offers recovery. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("PermitPilot: unexpected rendering error", error);
  }, [error]);

  return (
    <main id="main" className="container-narrow py-16">
      <h1 className="page-title">Something went wrong on this page</h1>
      <p className="mt-3 text-[var(--ink-2)]">
        Your projects are saved in this browser and were not changed. Try again, or go back to your projects.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link className="btn btn-secondary" href="/">
          Your projects
        </Link>
      </div>
      {error.digest ? <p className="meta mt-6">Reference: {error.digest}</p> : null}
    </main>
  );
}
