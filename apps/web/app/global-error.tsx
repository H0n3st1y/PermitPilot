"use client";

/** Last-resort boundary for failures in the root layout itself. Uses inline styles because app CSS may not have loaded. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1rem", background: "#f6f5f1", color: "#1c1d1f" }}>
        <main style={{ maxWidth: "40rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.75rem" }}>PermitPilot couldn&apos;t load</h1>
          <p>Your projects are saved in this browser and were not changed.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 1rem", fontWeight: 600 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
