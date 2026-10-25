# PermitPilot design decisions

This document describes the current implementation. The brand/landing refresh supersedes the earlier Source Serif/Source Sans typography decisions while retaining the warm paper, navy and rust palette.

## Identity and foundations

- Keep warm paper (`--paper`, `--paper-2`) as the page ground and cream (`--card`) as the working surface. Use navy for titles and primary actions, rust (`--seal`) for small section labels, and the existing green/amber/red/blue semantic tokens for status and feedback.
- Use one native system sans-serif stack throughout: `-apple-system`, `BlinkMacSystemFont`, Segoe UI, Helvetica, Arial, sans-serif. Apple devices use their native system font; other devices use their own matching fallback. Do not bundle Apple's proprietary font. Existing `font-serif` classes resolve to the same sans-serif token for compatibility, so page navigation does not change typefaces. Headings use weight 600 and restrained negative tracking; body text and controls retain readable sizes. Earlier font files/licenses remain in the source archive but are no longer loaded.
- Reuse `.panel`, `.button.primary`, `.button.secondary`, `.tab`, `StatusBadge`, `--radius-panel`, `--radius-control`, and the global focus/reduced-motion behavior. New dashboard styling lives in scoped project/roadmap classes in `apps/web/app/globals.css`; it does not redefine global typography or colors.
- Controls retain at least 44px touch areas. Focus outlines must remain visible in normal and high-contrast modes. Only short color/border transitions are appropriate; status comprehension must not depend on motion or hover.

## Brand identity and landing page

- The original logo is a folded permit page with an upward route arrow: navy document, rust fold, cream route. `PermitPilotLogo` is the shared accessible React component; decorative instances inside labelled home links are hidden from assistive technology. Keep its mark proportions intact and pair the wordmark with the same system font. Do not substitute the former letter-P square or civic-building icon.
- Source/export assets live in `public/brand` and `public/icon.svg`. Regenerate launcher, maskable and Apple touch icons from `scripts/generate-brand-assets.mjs`; the maskable artwork remains inside the safe central region. The same mark appears in the app header, landing preview/footer and offline recovery. Theme metadata uses the actual navy `#153a56`. Public cache v4 replaces the old install artwork without caching private content.
- The landing page leads with a short benefit headline, one primary project-planning action and a secondary sample action. Large balanced type, generous space, a real-data product preview, three concise benefits and three process steps establish hierarchy. The OpenAI reference informed the restrained composition and clear destinations; no OpenAI identity, content or product claims are copied.
- Keep authentication on `/login`, rather than inside the marketing hero. Preserve returning projects in a distinct workspace section, including projects saved without an account. Show browser-local save scope and refresh recovery; links return to Roadmap overview with at least 44px touch targets.
- The preview derives counts, statuses, next step and fees from the existing demonstration engine with a stable sample date. Label it illustrative; do not imply it is the current visitor's project or a live permit feed. Keep fixed fractions left-to-right inside RTL layouts; localize currency with `Intl.NumberFormat`.
- New landing content, section navigation, demo notice and footer labels have entries in all eight existing language catalogs. Long and RTL content must fit without horizontal scrolling. Existing English permit/source content remains a separate localization limitation.
- On phones the preview and benefits stack in reading order and hero actions wrap without shrinking touch areas. Landing navigation uses the existing Menu plus section links from 768px; full app navigation remains visible from 1280px with compact spacing, while the landing retains its restrained header until 1536px. Respect existing keyboard, contrast, safe-area and reduced-motion behavior.
- Marketing claims describe planning support, recorded progress, document organization and estimates. Do not claim complete city coverage, guaranteed approval, first-time inspection passes, time saved, automatic municipal submissions or durable file storage. Keep the demonstration/municipality-confirmation note readable.

Brand before/after evidence lives in `docs/brand-refresh/`. Production configuration and verification boundaries are in `docs/PRODUCTION.md`; unconfigured production accounts are deliberately unavailable rather than using browser password storage.

## Dashboard hierarchy

1. **Identity and progress:** project name is the sole page H1. A supporting line identifies the actual project kind, state and floor area. Save location is quiet metadata, separate from permit progress. A compact progress panel gives both a fraction and a labelled accessible progress bar; status remains readable without color.
2. **One next action:** the Roadmap section leads with one navy action button naming its destination step. Existing review flags take priority, then the engine's next eligible step. A step already submitted/in review says “Check on,” while an eligible unstarted step says “Prepare.” Buttons open the relevant existing timeline record; they do not submit an application, send a message or grant an approval.
3. **Attention before parameters:** “At a glance” gives missing required attachments, dependency blockers and estimated finish, each with direct access to the relevant document/timeline section. The permit checklist follows. Space, occupancy, zoning, trades, estimated valuation and planning warnings remain available in the native “Project details” disclosure; its summary exposes the planning-note count.

`ProjectHeader` and `ProjectPriorities` in `components/project/ProjectSummary.tsx` establish these reusable patterns. `RoadmapOverview` uses numbered permit cards with department, title, recorded status, explanation, duration, attachment count, bottleneck details and citations. Reset is a quiet secondary action in the toolbar; navigation back to the project list uses the working home route.

## Data and wording rules

- Permit statuses are recorded planning statuses, not a live municipal feed. Say “steps marked approved.” An empty roadmap must say “No permit steps,” never “all approved.” Missing attachment records remain independent from recorded approvals.
- Missing required attachments count `(stepId, requirementId)` pairs against required checklist entries. Duplicate, orphan and optional uploads do not inflate completion. “Attached” does not mean verified, submitted or permanently stored file contents.
- Count each blocked dependency step once, even if other attention flags also exist. A review flag means follow-up may be useful; it does not establish an overdue legal deadline.
- The app stores estimated dates, not filing deadlines. Display “Estimated finish” with the year and “Planning estimate, not a deadline.” No deadline badges, overdue claims or invented due dates.
- Preserve local/cloud/sync-failed save feedback and retry behavior. Do not use a save badge as a permit status.

The derivations are centralized in `lib/dashboardSummary.ts`, with edge-case tests. New dashboard copy follows the existing English content; it still needs translation before claiming full localization.

## Responsive composition and navigation

- From 900px, identity/progress and action/attention use balanced two-column layouts. The checklist occupies the main column; project details use a 19rem supporting column aligned to the top.
- Below 900px the same information stacks in reading order. Below 640px the primary action fills the card width, permit status wraps below its title, and descriptions/citations drop the desktop indent to retain useful text width.
- Below 640px, show all six project sections in a three-column, two-row grid with 44px controls. Labels carry meaning without icons or sideways gestures. Keep this navigation at the top while reading long checklists; switching from the pinned row scrolls to the new section's beginning. It returns to normal flow below 541px viewport height or while a text/select control is focused. Checkbox focus keeps navigation available. Above 639px, retain the existing horizontal tab row. Preserve arrow keys, Home/End, URL selection, high contrast, reduced motion and safe areas.
- Focus/scroll destinations account for the phone navigation's height. Do not add a global bottom action bar: project sections, intake progression and item-specific actions have different purposes.
- Saved-project links open Roadmap overview so returning users reach status and their next action first. Keep explicit Graph/demo-tour links available. Saved-project targets are at least 44px; compact progress/card spacing accommodates the two-row navigation while retaining the sample project's main action in the 390×844 initial viewport.
- Summary actions switch tabs and focus/scroll the actual target record. Timeline targets use `step-{id}`; document targets use `documents-{id}`. The document targets are programmatically focusable without adding unnecessary stops to the Tab sequence.
- Sample entry links honor a validated `tab` query. Explicit `overview` entry stays on the dashboard; automatic introductory tours remain attached to Graph entry, and the Guide button can start the tour from any section. A requested tour still opens Graph. Invalid tab values retain the existing Graph fallback.
- Project details uses native `<details>/<summary>` so Enter/Space and open-state semantics work without a custom dialog or keyboard implementation.

## Intake and roadmap handoff

- Use three named stages: **Project**, **Space & work**, **Review & build**. An ordered progress list marks the current step with `aria-current="step"`; completed stages allow returning to edit. Keep Back and Continue in a consistent action row, and focus the new stage heading after navigation.
- State which answers are required in a short sentence. Keep space/estimated cost/location together and trade work in its own fieldset. Explain that suggested trades can be unchecked; do not silently remove selections when a disclosure is hidden. Event attendance appears only while public attendance is enabled, retaining its entered value if toggled off and on.
- Numeric editing preserves empty strings. Convert to the existing numeric `ProjectConfig` only after validation; an empty cost is not silently accepted as zero. Optional dates must be real calendar dates and are labelled as scheduling preferences, not filing deadlines. Hidden, irrelevant attendance is omitted from the generated configuration.
- Pair a focused error summary with actionable links and inline messages. Inputs use `aria-invalid` and `aria-describedby`; correcting a field must keep focus in that input. Repeated submit attempts refocus the summary when errors remain. Validation lives in `lib/intakeValidation.ts`; permit rules, fees and scheduling remain in their existing engine modules.
- Save draft configuration **and stage** in a versioned browser record (`permitpilot:draft`, version 2). Read the prior flat configuration format for compatibility. Save & exit checks storage before navigating; failure retains the form and focuses a recovery message. Draft-save feedback refers only to this browser.
- Before generation, show the actual selected project/state/space/cost/work with edit actions, and explain that the output contains permit steps, attachments, estimated fees and planning dates. Nothing is sent to a permit office. Retain a name field and an optional planning start date.
- Use the existing synchronous rule engine and save connections. A pending guard prevents repeated creation; retrying an unchanged failed save reuses the in-memory project ID. Draft cleanup failure must not be reported as failure of an already-saved project.
- At 560px and above, project choices and related fields use two columns. Phones use one column, 48px text controls and 16px input text. Only the long project-selection stage keeps its action row sticky; input-heavy stages use normal document flow. Release that sticky positioning while a text/select control is focused so it does not compete with the software keyboard. The shortened-viewport browser check is not a physical keyboard certification.
- Successful creation opens `tab=overview&created=1`, not a graph tour. The focused, dismissible **Your roadmap is ready** panel names the real recommended first step, explains dependencies and the Timeline/Documents sections, and states that this is a planning guide. Dismiss removes `created` from the URL while preserving the selected tab and focuses the recommended action.
- First steps without prerequisites say so; they must not imply earlier approvals already exist. For critical-path preparation messages, the overview and timeline reuse the existing plain-language explanation rather than presenting a fresh, unstarted roadmap as already late. No permit logic or dependency detection is changed.

Intake screenshots are in `docs/intake-polish/`. These patterns remain intact in the mobile task pass.

## Everyday phone tasks

- Timeline starts with recorded progress, prerequisite waits, one real recommended action and a native step selector. Every prerequisite is a 44px button that focuses the existing `step-{id}` article. Approval labels describe the recorded prerequisite state; submitted/in-review records have their own follow-up explanation. Label dates as estimates and status controls as recorded status. Essential information must remain available outside the graph.
- Document rows lead with Upload/Replace; Attach sample PDF is a secondary demonstration action, never the primary task or a destructive-colored control. Include file-type/size limits beside each row. Explain metadata-only attachments and keep-original requirements without claiming submission or verification.
- Failed file reads/saves retain the selected file for **Retry attachment**. Put focus on an enabled recovery action after loading ends. Preserve an existing attachment if replacement fails. Removal offers a local **Undo removal** until leaving the section; restore the original record and preview. Use the latest callback and saved project snapshot when asynchronous reads finish, so concurrent uploads and intervening changes are retained.
- Fees lead with the actual estimated total, then base fees/surcharges together and itemized cards on phones. Retain desktop tables and the existing calculation engine. Estimates are not bills.
- Inspection preparation starts with an overall count and **Continue checklist**, which focuses the next unchecked item without toggling it. Existing per-department progress and citation controls follow. Checked preparation is neither a passed inspection nor an appointment.

## Install and update controls

- Keep installation optional in the primary navigation's native disclosure. Show the browser install action only after a supported install event; otherwise give concise Safari/Android/browser instructions. Detect standalone presentation separately from an installation event, because installing does not change the current browser tab's display mode.
- Put waiting-update feedback in the same disclosure. Only an explicit update action activates a waiting worker and reloads this page. Ask users to Save & exit from intake first and block refresh during busy actions. Do not auto-reload because an update appears or another tab activates a worker.
- Retain the public-only cache and network-first offline recovery. Installation does not establish offline editing, cross-device synchronization or store distribution. See `docs/MOBILE_DISTRIBUTION.md` for supported architecture and release requirements.

## Visual evidence and checks

Before/after captures use the same Harbor Kitchen sample, recorded statuses and viewport sizes: 1440×1000 desktop and 390×844 phone. Full-page and same-viewport comparison images are in `docs/dashboard-polish/`. The original development captures include the Next.js development indicator; it is not a product control.

Mobile task captures are in `docs/mobile-refinement/`, using the same sample at 390×844 and 1440×1000 before and after. The current verification results and remaining release limitations are recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md). Next unfinished product priority: durable document storage and account-backed cross-device recovery, followed by physical installed-device acceptance. The existing 400KB preview/metadata behavior is still a release limitation.
