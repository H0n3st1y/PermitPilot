import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

const SECTIONS = [
  {
    title: "Requirements come from rules, not AI",
    body: "Each permit step is selected by a versioned, deterministic rule that matches your project details. The permit page shows which rule selected it and which answers matched. The same answers always produce the same steps, order, fees, and checklists. No language model decides what is required.",
  },
  {
    title: "Demo Harbor is fictional",
    body: "The municipality, its departments, local ordinance numbers, and fee schedule are demonstration data. Local provisions are labelled Fictional and have no link, because no official source exists.",
  },
  {
    title: "Sources you can check",
    body: "Model-code references (IBC, IFC, IPC, IMC, IFGC, NEC) and the FDA Food Code link to the publisher's official text. The section numbers and links were checked on the date shown. Your municipality may adopt a different edition or amend these codes, so confirm locally. Summaries are paraphrases, not quotations.",
  },
  {
    title: "Timelines are planning ranges",
    body: "Each step has a configured range in business days. The forecast starts from today, from your actual submission date, or from when prerequisites are projected to finish. A review past its maximum is flagged. None of these dates are municipal commitments.",
  },
  {
    title: "Fees say how they were determined",
    body: "Every fee is marked Official (published schedule, cited), Calculated (a configured rate times your inputs), Estimated (a planning figure), or Unknown (expected but not priced). Unknown amounts are never guessed or added to the total. Demo Harbor has no official schedule, so nothing here is marked Official.",
  },
  {
    title: "Your data stays on this device",
    body: "Projects are saved in this browser's local storage and uploaded files in its IndexedDB. Nothing is sent to a server. Clearing site data removes them. PDF, PNG, JPEG, and WebP files up to 10 MB are accepted. PermitPilot records what you uploaded but does not review the contents.",
  },
];

export default function AboutPage() {
  return (
    <AppShell>
      <main id="main" className="container-narrow pb-16 pt-10">
        <p className="meta">Methodology and limits</p>
        <h1 className="page-title mt-1">How PermitPilot works</h1>
        <div className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {SECTIONS.map((section) => (
            <section key={section.title} className="reveal py-5">
              <h2 className="h3">{section.title}</h2>
              <p className="mt-1 text-[var(--ink-2)]">{section.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/intake">
            Start a project
          </Link>
          <Link className="btn btn-secondary" href="/demo">
            Explore the sample
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
