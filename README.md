# PermitPilot

PermitPilot turns a short project description into a permit roadmap: which permits and reviews apply, in what order, which documents each one needs, what it may cost, how long it may take, how to prepare for inspection, and where each requirement comes from. You then track the project to completion.

> **Demo data.** The bundled municipality, Demo Harbor, MA, is fictional. Its local ordinances and fee schedule are demonstration data. Model-code citations (IBC, IFC, IPC, IMC, IFGC, NEC, FDA Food Code) link to the real publisher text and were checked on 2026-09-17, but local adoption is not verified. Nothing here is a legal determination.

The engines do not change if you point them at a real city: replace the fixtures in `apps/web/fixtures/` with verified local rules, steps, citations, fees, and inspection checklists. Mark a fee Official only when you can cite a published schedule. See [docs/RULES_AND_SOURCES.md](docs/RULES_AND_SOURCES.md).

## Main flow

Landing → Start project → 3-step intake → Roadmap → Timeline → Permit details → Documents → Fees → Inspection prep → Update status → Complete

The dashboard always shows your next step, why it is next, and what is blocking progress. Views are URL-addressable (`/projects/<id>?view=timeline&step=health-permit`), so the back button and deep links work.

## 3-minute walkthrough (sample project)

1. Open **Explore a sample** (Harbor Kitchen). Zoning is approved; the health permit is stuck in review.
2. Open the health permit, or the graph's **Why this step?** drawer: the firing rule, the matched answers, and a verified citation. Requirements come from deterministic rules, not a language model.
3. From the bottleneck radar, draft the follow-up email (nothing is sent). Change a status and watch the timeline and critical-path flag re-forecast from the real dates.
4. Open **Fees**: calculated vs estimated vs unknown. Unknown amounts are excluded from the total. Try recording a submission with a missing document to see the warning.

## Features

| Area | What works |
| --- | --- |
| Intake | Three-step form with inline validation, focus management, and a local draft autosave. Includes an optional start date and target date. |
| Roadmap | Deterministic rules select the steps, departments, dependencies, and order. Each permit page shows the rule and the matched answers that selected it. |
| Edit & re-run | Change project details, preview the added and removed steps, then apply. Progress carries over for steps that remain. |
| Timeline | Six statuses: Not Started, Preparing, Submitted, In Review, Needs Changes, Approved. Each step is classified completed, current, blocked, or upcoming. The forecast (earliest and latest dates) re-projects from actual submission and approval dates, and the view flags the critical path, overdue reviews, and target-date risk. |
| Status updates | Add an optional note with each change, keep a per-step history, and get warnings when submitting with missing documents or unapproved prerequisites. |
| Documents | Required and optional documents per step, with uploaded or missing status. Files are stored in IndexedDB and can be downloaded again. |
| Fees | Itemized per step. Each line is marked Official, Calculated, Estimated, or Unknown. Unknown fees are never priced or added to the total. |
| Inspections | Building, fire, and health checklists chosen by project facts, with completion toggles and a citation per item where one applies. |
| Citations | Verified links to official model-code text. Fictional local provisions are labelled and have no link. |
| Stretch | `.ics` calendar export (projected starts, decisions, inspection prep, target date). Follow-up email drafts you review and send yourself; nothing is sent automatically. |
| Accessibility | Skip link, focus-visible styles, labelled controls, live-region feedback, 44px touch targets, a high-contrast mode, a Plain English mode, eight interface languages (English, Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese), and reduced-motion support. Responsive down to 360px. Permit titles and cited legal text stay in the source language. |

## Architecture (web app)

```text
apps/web/
  fixtures/          Municipality configuration: rules, step catalog, citations, fees, inspection templates
  lib/types.ts       Shared domain types (Project, PermitStep, Status, Document, Fee, Citation, Inspection…)
  lib/status.ts      Status list, labels, guidance, and predicates
  lib/engine/        Pure, tested logic
    rules.ts         config → steps + dependencies + trace   (deterministic, no AI)
    timeline.ts      baseline schedule, live forecast, critical path
    progress.ts      step states, bottlenecks, next actions, document progress
    fees.ts          itemized fees with basis types
    inspections.ts   applicable checklist items
    project.ts       create / regenerate a project, derive the view model
  lib/projectActions.ts  Pure project updates (status, documents, checklist)
  lib/storage/       localStorage project repository (versioned, migrated) and IndexedDB file store
  lib/hooks/useProject.ts  The single client owner of project state, saves, and errors
  lib/ics.ts, lib/followUp.ts  Calendar export and email drafts
  components/        UI only; no business rules
```

Only user progress is persisted (statuses and history, uploads, checklist ticks). Forecasts, fees, inspections, and bottlenecks are always derived from config plus steps, so there is one source of truth.

## Run locally

Prerequisites: Node.js 20+.

```bash
npm --prefix apps/web install
npm run dev
```

Then open http://localhost:3000.

## Verify

```bash
npm run typecheck
npm run lint
npm test          # vitest: rules, dependencies, forecast, progress, fees, inspections, migration, copy
npm run build
```

## Authoring

See [docs/RULES_AND_SOURCES.md](docs/RULES_AND_SOURCES.md) for adding rules, citations (verification policy), and fees, and [docs/STORAGE_SECURITY.md](docs/STORAGE_SECURITY.md) for storage details.

## Known limitations

- Single-device storage. There are no accounts or sync, and clearing site data removes projects and files.
- Uploads are checked for declared type, size, and matching file signatures (PDF, PNG, JPEG, WebP). Files are not malware-scanned.
- Durations and fees are demonstration configuration and have not been checked against a real municipality.
- An AI explainer is not included. If one is added, it must only paraphrase retrieved verified sources and must never add or remove requirements.
