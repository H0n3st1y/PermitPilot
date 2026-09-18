# Rule and source authoring guide

The web app's rules engine is the source of truth for roadmaps. Everything it uses lives in `apps/web/fixtures/`:

| File | Holds |
| --- | --- |
| `rules.ts` | Selection rules: nested `all` / `any` / `none` conditions over project fields, the steps each rule adds, warnings, and a plain reason. Higher priority runs first; steps are deduplicated. |
| `steps.ts` | Step catalog: department, descriptions, dependencies, parallel hints, document requirements, citation IDs, and min/max business-day durations. Object order is the tie-break order for steps that can run together. |
| `citations.ts` | Citation registry. |
| `fees.ts` | Fee rates and IBC occupant-load factors. |
| `inspections.ts` | Inspection checklist templates, each with an optional `appliesWhen` condition. |

Pipeline: `ProjectConfig -> evaluateRules -> steps + dependencies + trace -> scheduleSteps (baseline) -> forecastTimeline / calculateFees / inspectionsFor / detectBottlenecks`. All stages are pure functions in `apps/web/lib/engine/`.

## Adding or changing a rule

1. Add or reuse a step in `steps.ts`. Dependencies must reference step IDs and stay acyclic; the scheduler throws on cycles.
2. Add a rule in `rules.ts` with the narrowest conditions and a plain-language `reason`. The reason and matched conditions are shown to users on the permit page.
3. If it changes what is required, bump `RULES_VERSION` in `lib/engine/rules.ts`.
4. Add positive and negative tests in `lib/engine/rules.test.ts`, then run `npm test`. The configuration-integrity tests fail on unknown step, dependency, or citation IDs.

## Citations: never fabricate

- `verified`: the section number, title, and URL were opened and checked against the publisher. Set `verifiedOn` to the check date. A test enforces that verified entries have an https URL and a date.
- `needs_review`: a real source exists but the section has not been checked. Shown with a "Needs review" label.
- `demo`: fictional Demo Harbor provisions. They must have `url: null` (enforced by a test).
- Summaries are paraphrases. Never present them as quotations.
- Model-code citations show which code a requirement relates to. They do not establish that a municipality adopted that edition. The UI says so.

## Fees: never invent exact amounts

Each line item carries a `basisType`:

- `official`: only with a published municipal fee schedule you can cite.
- `calculated`: a configured rate formula applied to project inputs.
- `estimated`: a planning figure.
- `unknown`: the fee is expected but not priced. `amount` is `null`, and it is excluded from totals and counted in `unknownCount`.

## Swapping in a real municipality

Replace the fixtures with verified data, set citation statuses honestly, mark fee lines `official` only with a cited schedule, and update the demo notice in `components/DemoNotice.tsx`.
