# PermitPilot

PermitPilot turns a short project description into a permit roadmap: which permits and reviews apply, in what order, which documents each one needs, what it may cost, how long it may take, how to prepare for inspection, and where each requirement comes from. You then track the project to completion.

> **Demo data.** The bundled municipality, Demo Harbor, MA, is fictional. Its local ordinances and fee schedule are demonstration data. Model-code citations (IBC, IFC, IPC, IMC, IFGC, NEC, FDA Food Code) link to the real publisher text and were checked on 2026-09-17, but local adoption is not verified. Nothing here is a legal determination.

## Main flow

Landing → Start project → 3-step intake → Roadmap → Timeline → Permit details → Documents → Fees → Inspection prep → Update status → Complete

The dashboard always shows your next step, why it is next, and what is blocking progress. Views are URL-addressable (`/projects/<id>?view=timeline&step=health-permit`), so the back button and deep links work.

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
| Accessibility | Skip link, focus-visible styles, labelled controls, live-region feedback, 44px touch targets, a high-contrast mode, a Plain English mode, and reduced-motion support. Responsive down to 360px. |

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

`apps/api` is an optional FastAPI prototype with its own smaller data set and an in-memory store. The web app does not call it.

## Run locally

Prerequisites: Node.js 20+ (Python 3.12+ only for the optional API).

```bash
npm --prefix apps/web install
npm run dev
```

Then open http://localhost:3000. To also run the API prototype: `pip install -r apps/api/requirements.txt`, then `npm run dev:all`.

## Verify

```bash
npm run typecheck
npm run lint
npm test          # vitest: rules, dependencies, forecast, progress, fees, inspections, migration, .ics
npm run build
npm run test:api  # optional, pytest
```

## Authoring

See [docs/RULES_AND_SOURCES.md](docs/RULES_AND_SOURCES.md) for adding rules, citations (verification policy), and fees, and [docs/STORAGE_SECURITY.md](docs/STORAGE_SECURITY.md) for storage details.

## Known limitations

- Single-device storage. There are no accounts or sync, and clearing site data removes projects and files.
- The upload check covers the declared type and size, not the file's byte signature. Files are not scanned.
- Durations and fees are demonstration configuration and have not been checked against a real municipality.
- An AI explainer is not included. If one is added, it must only paraphrase retrieved verified sources and must never add or remove requirements.
