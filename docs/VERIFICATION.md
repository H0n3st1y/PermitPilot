# Interaction and mobile verification

Latest verification October 25, 2026. Existing Next.js/React/Tailwind architecture and paper/navy palette retained; no native framework, store submission, or deployment was introduced.

## Latest pass: brand, landing and production preparation

The requested brand refresh supersedes the earlier Source Serif/Source Sans choice while preserving the permit engine, mobile workflows and established palette.

### Implemented

- Original folded permit/route logo, reusable accessible component, SVG mark/wordmark, favicon, 192/512px launcher icons, maskable and Apple touch icons, offline branding and a 1200×630 social card. Header, landing preview/footer and install assets share the same mark. Cache v4 updates the install artwork. Share-image metadata requires a configured public HTTPS `NEXT_PUBLIC_SITE_URL`; it never advertises localhost as a production origin.
- One native system sans-serif stack for body, headings and controls, using Apple system fonts on Apple platforms and system fallbacks elsewhere. Earlier Source font files/licenses remain archived but no web fonts are requested.
- A benefits-first landing page with clear project/sample entry, a preview from the real sample engine, three benefits and three process steps. Authentication stays on `/login`. Returning and anonymous browser-saved projects remain accessible, with refresh/recovery. Unsupported coverage, approval, time-saving and durable-storage guarantees were removed.
- All 57 new landing messages are translated in the eight existing catalogs. RTL preview fractions preserve their direction, and currency uses locale formatting. Remaining English permit/source content is a separate limitation.
- Patched Next 15.5.28, React 19.1.10, PostCSS 8.5.31, Sharp 0.35.5, Zod 4.6.7 and affected test tooling. Node 22.12+ is required. Complete root and web audits report **zero findings**, including development packages.
- Production password accounts require Supabase; the browser-password fallback is development-only and shared cloud demo credentials were removed. Unconfigured production login explains availability and disables password fields. Sample access is local. Cloud project operations require cloud users and filter by user ID; these guards do not replace actual database RLS.
- Paid citation calls require a verified Supabase bearer token. Requests have streamed 32KiB/schema bounds; output is restricted to requested steps and HTTP(S) source URLs. Per-process quotas, timeout/token bounds and local fallbacks are implemented; distributed quotas and provider spending controls still require configuration.
- Production headers remove `unsafe-eval`, deny framing/plugins/unused permissions and restrict origins. Supported standalone startup packages public/static assets and source excerpts, validates host/port and launches the generated server. Blank environment configuration and deployment steps are in [PRODUCTION.md](PRODUCTION.md).

### Verification

- **124 automated tests across 20 suites passed**, covering authentication/cloud guards, citation bounds/authentication, bearer headers, share-origin validation, complete landing translations and existing permit behavior. Typecheck, ESLint and optimized production build passed.
- **30 production Chromium browser journeys passed** on the supported standalone server. Coverage includes the six new branding/landing checks plus all previous dashboard/intake/mobile checks: project/sample entry, real benefit destinations, anonymous-project return, absent inline password form, production account safeguards, logo/icon responses, one system heading/body font without WOFF requests, Spanish/Arabic language selection and persistence, intake validation/resume/recovery, status/inspection persistence, attachment retry/Undo, navigation/focus, high contrast, reduced motion and offline recovery.
- Screens and page-fit checks cover **320×740, 390×844, 430×932, 768×1024, 1440×900 and 1440×1000**, with constrained-height input/navigation checks retained. Production screenshots of the landing, intake, login, methodology and all six project sections were inspected. No page-level overflow or uncaught landing errors were measured. French/Hindi/Bengali narrow layouts were also inspected.
- Manifest and Chromium installability checks reported no errors. An active worker controls the page; Cache Storage contains only seven public install/recovery assets in `permitpilot-public-v4`. Evidence: [browser/PWA result](brand-refresh/browser-evidence.json). This is localhost eligibility, not physical installation or production HTTPS acceptance.
- Supported `npm start` ran without the earlier unsupported-start warning. The copied source excerpt bundle was confirmed present. Startup argument failures were checked. Complete root/web dependency audits report zero findings.
- [Desktop before](brand-refresh/before-desktop-viewport.png) / [after](brand-refresh/after-desktop-viewport.png), [phone before](brand-refresh/before-phone-viewport.png) / [after](brand-refresh/after-phone-viewport.png), [complete landing](brand-refresh/after-desktop.png), [phone project](brand-refresh/after-phone-roadmap.png), [production login](brand-refresh/after-phone-login.png). Captures are reproducible with `node scripts/brand-review.cjs` against the production server.

### Release boundary

The hardened local demonstration build is verified. No live domain, Supabase database/RLS, email delivery, account recovery/deletion, durable private file service, paid-model provider or physical mobile device was available. Browser-local cache ownership/retention still needs a shared-device privacy review. Configure shared gateway/provider spending controls before enabling paid calls across instances. Real jurisdiction coverage, operator privacy/support details, installed iOS/Android keyboards/session behavior and assistive technology remain unverified. [PRODUCTION.md](PRODUCTION.md) records the concrete release checklist; no deployment or store release was performed.

## Previous pass: everyday mobile tasks and PWA controls

Completed October 24, 2026, after inspecting the production phone/desktop implementation and the earlier verification/design records. Existing intake, graph alternatives, responsive shell, touch controls, typography, permit rules and save connections were retained.

### Implemented

- Every project section is visible in a compact three-column phone navigation grid. It stays available while scrolling long content, begins the newly selected section below the navigation, and keeps target focus visible. Short viewports and text/select focus release the sticky placement; checkbox focus does not. Desktop tabs and arrow/Home/End behavior remain. Saved-project links now open Roadmap status/next action and have 44px targets. Compact phone spacing retains the sample's primary action in the 390×844 initial viewport.
- Timeline now leads with recorded progress, prerequisite waits, a real next action and a native step jump. Prerequisite buttons focus the actual step without graph gestures. Date estimates, recorded submission/review and earlier approvals have distinct wording.
- Upload/Replace is the primary attachment task; demonstration samples are secondary. Failed/interrupted reads and failed saves retain the chosen file for retry, with focus on an enabled recovery action. Failed replacement retains the old attachment. Removal has Undo until leaving the section, including restoration of its original preview.
- Asynchronous attachments merge against the current project snapshot and callback. Two file reads completing out of order cannot overwrite each other's saved records.
- Fee estimates lead with the calculated total and compact supporting totals before itemization. Inspection preparation leads with overall progress and a Continue checklist action that focuses, without checking, the next incomplete item.
- Install help is an optional disclosure in Menu, with a native browser prompt only when supplied and an accurate standalone explanation. Waiting updates require an explicit action; intake and pending actions prevent refresh. First installation and updates from another tab never force this page to reload. The public-only cache policy and offline recovery remain.

### Verification

- **98 automated tests across 17 suites passed.** New checks cover timeline jumps/dependencies, retained-file retry after interrupted reads/save failure, replacement preservation, Undo with preview restoration, concurrent reads finishing out of order, the current upload callback, inspection focus, fee hierarchy, install prompt/standalone semantics and explicit worker activation. The affected six mobile-task component checks passed again after the final rendered cleanup.
- **24 production Chromium browser journeys passed on the final build.** Typecheck, ESLint and optimized production build passed. No dependency or permit-engine changes were introduced.
- Main routes and all six project sections fit **320×740, 430×932, 768×1024 and 1440×900** without page-level horizontal overflow. Dashboard/intake journeys also passed at **390×844** and **1440×1000**. Touch-emulated checks at 320px/430px cover all-section visibility, 44px targets, step/prerequisite focus below sticky navigation, section-switch scroll reset, fee visibility, next unchecked inspection focus and persistence. Short **320×460, 430×460 and 390×460** browser checks cover navigation release and usable input/action layout.
- Full intake validation, correction, Back, review edits, draft resume, conditional attendance, Save & exit, single-project creation, failed-save recovery and roadmap handoff passed again. Status and inspection changes persisted after reload. Attachment storage failure recovered using the retained file, long filenames wrapped, and removal/Undo retained saved content after reload. Project-storage denial displayed recovery instead of a false not-found result. Saved-project entry opened Roadmap status/next action with a 44px link; the sample primary action fit entirely within 390×844.
- Keyboard tab/Home/End controls, Menu and nested install-help Escape/focus restoration, citation details, guide navigation, high contrast and reduced motion passed. Local/browser loading/error recovery was exercised; real production service failures were not simulated as live-service verification.
- Production localhost Chromium parsed the manifest with **no errors**, reported **no installability errors**, and had an active controlling worker. Cache inspection contained only the seven public install/recovery assets. Offline deep-route recovery and reconnect passed. Evidence: [local PWA result](mobile-refinement/pwa-local-check.json). This is browser eligibility on localhost's secure-context exception, not production HTTPS or physical installation.
- The production dependency audit was rerun: **7 findings — 1 critical, 5 high, 1 moderate**. These remain open for a dedicated security/compatibility pass.
- Before/after captures use the same Harbor Kitchen sample at **390×844** and **1440×1000** in `docs/mobile-refinement/`. Final production screenshots are inspected after the build, including timeline, attachments, fees, inspection preparation and overview.
- Examples: [phone status/next action](mobile-refinement/after-phone-overview-viewport.png), [phone timeline before](mobile-refinement/before-phone-timeline.png) / [after](mobile-refinement/after-phone-timeline.png), [phone fees before](mobile-refinement/before-phone-fees.png) / [after](mobile-refinement/after-phone-fees.png), [desktop fees](mobile-refinement/after-desktop-fees.png), [install help](mobile-refinement/after-phone-install.png). Screenshot review caught and fixed the primary action slipping below the 390×844 viewport and the redundant inspection-circle decoration.
- Browser automation uses isolated Chromium contexts; touch capability is emulated. No physical Android/iOS device, software keyboard, Safari, VoiceOver or TalkBack was connected. Shortened viewport and simulated standalone checks are fixtures, not installed-device acceptance.

### Remaining release priorities

1. Resolve the existing dependency/security and browser-local demonstration-account limitations before real-user deployment.
2. Implement authenticated durable file storage and cross-device document recovery. Current files above 400KB still save details only, not file contents; local previews are not durable cloud storage.
3. Configure and verify production HTTPS, Supabase authentication/redirects/access policies, cloud synchronization and model-backed services. Those credentials/services were unavailable here.
4. Complete physical Safari/iPhone and Chrome/Android installed-device acceptance: launch/storage/session continuity, offline/update behavior, keyboard, safe areas, file picker and assistive technology.
5. Translate the new English guidance before claiming complete localization. Signing, store assets and any Android/iOS package work remain conditional on an agreed store requirement; no native framework or wrapper was added.

Reusable decisions are in [DESIGN.md](../DESIGN.md); platform requirements are in [MOBILE_DISTRIBUTION.md](MOBILE_DISTRIBUTION.md). Next unfinished product priority: durable document storage and account-backed recovery.

## Previous pass: intake to roadmap

Completed October 24, 2026. This pass inspected the existing three-stage intake and generated-project journey before editing; it retained the established palette, typography, field/button patterns, permit engine and persistence connections.

### Implemented

- Named Project / Space & work / Review & build progress, clear required-answer instructions, completed-step navigation, consistent Back/Continue actions and a checked Save & exit action.
- Grouped space/cost/location fields and trade-work choices. Suggested trades remain editable. Event attendance appears only for public attendance and keeps its entered value when hidden/revealed.
- Inline field errors with `aria-invalid`/`aria-describedby`, linked summary feedback and focus management that leaves focus in corrected inputs. Empty numeric controls stay empty until validated; optional dates are checked without inventing deadlines.
- Versioned draft configuration plus stage resume, including compatibility with earlier flat drafts. Storage failures keep answers visible. A pending submission guard and cached project ID support recovery without duplicate creation for an unchanged retry; draft cleanup failure does not turn a successful save into a failure.
- A final review of the real project/state/space/cost/work answers with edit actions, plus an explanation of what generation saves and that nothing is sent to a permit office.
- Creation now opens the Roadmap overview with a focused, dismissible “Your roadmap is ready” orientation. It names the actual first recommended step and links to dependencies, while retaining existing document/detail actions. First-step copy no longer implies prior approvals exist; critical-path preparation messages use the existing neutral plain-language explanation.
- Phone text controls are 48px tall with 16px input text. The long selection stage keeps a persistent action row; input-heavy stages use normal scrolling so the actions do not cover fields. No new dependency or permit-rule/fee/scheduling change was introduced.

### Verification

- **81 automated tests across 14 suites passed.** New coverage includes 12 validation cases, eight intake interaction/recovery cases, and three additional roadmap handoff/first-step cases.
- **18 production Chromium browser tests passed**, including the previous 13 regressions and five new complete-journey cases. Typecheck, ESLint and the optimized production build passed.
- Complete intake-to-roadmap journeys passed at **390×844** and **1440×1000**: missing choices, inline validation, correction without focus theft, Back, review edits, Save & exit/resume, creation of exactly one project, overview arrival, first-step explanation, dependency navigation, dismissal and document access.
- A **320×740** event journey passed conditional attendance validation and value retention. A forced project-storage failure at **390×844** preserved the name/form and recovered on retry without an extra project. Unit checks also cover legacy draft migration, Save & exit failure/recovery and cleanup-only failure.
- A **390×460** reduced-height browser viewport kept a focused numeric input usable and confirmed normal-flow action positioning. This simulates a constrained viewport; it does not operate a real mobile software keyboard.
- Previous screen-fit, keyboard/focus, high-contrast/reduced-motion, persistence and offline-worker checks pass again at **320×740, 430×932, 768×1024 and 1440×900**. No page-level horizontal overflow was measured.
- Rendered desktop/phone screenshots of all three stages and the generated roadmap were inspected. The initial mobile rendering exposed a persistent action bar covering part of the space form; the final implementation restricts it to selection and leaves input stages in normal flow.
- [Phone space/work](intake-polish/after-phone-2.png), [phone review](intake-polish/after-phone-3.png), [desktop review](intake-polish/after-desktop-3.png), [generated roadmap](intake-polish/after-desktop-roadmap.png). Before/after captures for each intake stage are in `docs/intake-polish/`. Reusable decisions are recorded in [DESIGN.md](../DESIGN.md).

### Limits and next unfinished priority

Local rule-based generation and browser saving were verified. Production Supabase authentication/cloud sync, real cross-device access and model-backed citation explanations were not verified because production service credentials/API keys were unavailable. Real iOS/Android keyboards, device installation, Safari and assistive technologies remain unverified; no physical mobile device was connected. Existing release security/authentication/document-storage/localization limitations below remain open.

Next unfinished product priority: **Timeline dependency and status clarity**, especially distinguishing prerequisite waits, recorded review state and estimated planning dates when following the dashboard's next action.

## Previous pass: project dashboard composition

Completed October 24, 2026, building on the interaction/mobile implementation below. The three issues resolved were weak project/progress hierarchy, an understated generic next-action link, and actionable information buried beneath a large parameter grid.

- Project identity now includes the real project kind/state/area; recorded progress has an explicit fraction, status, accessible progress bar and submitted/review/not-started counts. Save location remains separate.
- One prominent next-action card prioritizes flagged review follow-ups before the next eligible engine step. The button names the actual step and opens/focuses its timeline record.
- Missing required attachments, unique dependency-blocked steps and the estimated finish appear before the checklist, with direct links. Supporting parameters and warnings remain in a native Project details disclosure; its collapsed summary shows the planning-note count.
- Sample links now honor valid section queries, including `/demo?tab=overview`. Explicit overview entry does not auto-switch into a graph tour; manual Guide and requested-tour behavior still work.
- The existing paper/cream/navy/rust palette, Source typography, semantic statuses, routes, persistence feedback, tab keyboard controls, responsive navigation and PWA behavior are preserved. No new dependency was added.

### Dashboard verification

- **58 tests across 12 suites passed**, including five new summary-data cases and three new summary-component cases for empty/completed roadmaps, attachment pair matching, duplicate/orphan flags and correct action destinations.
- **13 production Chromium E2E tests passed**, including four dashboard-focused tests plus the prior nine mobile/interaction/offline checks. New checks cover step focus, attachment destination/count updates, blocker navigation, native disclosure keyboard operation, long/completed projects at 320px, and direct overview entry with the manual guide still available.
- **Typecheck, ESLint and optimized production build passed.**
- Before/after screenshots use the same sample project and recorded statuses at **1440×1000** and **390×844**. Full-page screenshots and same-viewport comparisons were inspected. At 390×844 the primary review button fits within the initial viewport; before, the same area led into the large parameter grid. Development indicators in the original captures are tool UI, not product controls.
- The previous screen-fit checks pass again at **320×740, 430×932, 768×1024 and 1440×900**, alongside the added dashboard checks at 390px and 1440px. No page-level horizontal overflow was measured, including a long project name at 320px.
- [Desktop comparison](dashboard-polish/comparison-desktop.png), [phone comparison](dashboard-polish/comparison-phone.png), [full desktop after](dashboard-polish/after-desktop.png), [full phone after](dashboard-polish/after-phone.png). Reusable decisions are in [DESIGN.md](../DESIGN.md).

No physical-device or production-service validation was added in this composition pass. The prior release/security, cloud authentication, file-storage and localization limitations below remain open. Next recommended screen: Timeline, the destination for the dashboard's review and blocker actions.

## Earlier interaction/mobile implementation

- Shared hover, active, focus, disabled and busy feedback; comfortable controls, responsive navigation disclosure, current-route indication, safe-area spacing and reduced-motion overrides. Rust and warning text were darkened within the existing palette for contrast.
- Guarded authentication and roadmap submissions, native form/Enter handling, saved-draft restoration, loading messages, inline recovery errors, email-confirmation feedback, and visible action confirmations.
- Cloud signup errors no longer silently create local accounts. Duplicate local signup no longer authenticates an existing account. Cloud sign-out errors allow retry.
- Honest local/cloud/sync-failed dashboard feedback, retry, blocked-storage recovery, stale-cloud-data protection, actionable next step, keyboard tabs with retained URL selection.
- Accessible attachment buttons, file validation/read/save errors, success/removal messages, wrapping filenames, and accurate attachment status. Files over 400 KB retain metadata only; attachments do not represent official verification/submission.
- Keyboard/touch citation details, Escape and focus restoration, guide dismissal on navigation, graph request/copy recovery and phone scrolling, linear step selection, mobile fee cards, and separate checklist/citation controls.
- PNG install icons, maskable icon, Apple metadata, public-only worker cache and offline retry page. Private project/auth/API pages are not cached. Existing Source fonts are bundled locally with their licenses to eliminate the failing external-font build request.

## Earlier interaction/mobile checks

- `npm run test`: 50 tests across 10 suites. Includes authentication, duplicate submission, attachment validation/read errors, draft/intake flow, persistence failures, blocked storage, and worker policy regressions.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run build`: optimized production build passed with local fonts.
- Production browser run: `$env:PLAYWRIGHT_PRODUCTION='1'; npm run e2e` — 9 tests passed using Chromium.
- Screenshots and page-width assertions cover home, login, intake, methodology, missing project and all six project sections at **320×740, 430×932, 768×1024, 1440×900**. Screenshot contact sheets were inspected at each size, with full-page samples inspected for the graph, roadmap, fees and document checklist. No page-level horizontal overflow was measured; project tabs intentionally scroll within their own row.
- Additional **390×844** checks cover mobile menu/Escape focus, Home/End tabs, invalid then valid attachment/removal, timeline status and inspection persistence after reload, guide dismissal, high contrast, reduced-motion mode, language keyboard navigation, and offline/reconnect behavior.
- **320×740** full intake passes through all three steps, submits using Enter, creates exactly one project and handles a long project name. Citation details stay within the viewport and return focus on close/Escape.
- Production worker registers, precaches public assets, serves offline recovery for a deep project route, avoids caching private routes, and returns to normal navigation after reconnecting. This checks browser behavior, not installation on a physical phone.

Screenshots are under `apps/web/test-results/` after an E2E run.

## Verification limits

- No physical iPhone/iPad/Android device or native build was available. Safari/WebKit, VoiceOver/TalkBack, software keyboard, device cutouts, browser installation prompts, installed-session storage, signing and store acceptance are unverified.
- No production Supabase credentials/database/storage or model API key were supplied. Cloud auth/sync failures are tested with mocks; real cloud confirmation emails, cross-device access, row-level security and model-backed explanations remain unverified. The local/sample journey and citation fallback were exercised.
- This was a focused accessibility review, not a full WCAG conformance audit. Keyboard/focus checks, high-contrast mode and normal text token contrast were verified; all combinations of content/theme, assistive technology and localization were not exhaustively audited.

## Remaining issues, ordered by impact

1. **Live production services:** configure and verify Supabase schema/RLS, redirects, confirmation/recovery, session handling, account/data deletion and operator privacy/support details. Browser-password fallback is now disabled in production; no real account service was configured here.
2. **Private documents and cache privacy:** files above 400KB still save details only. Implement authenticated durable storage/recovery and define retention/clearing on shared devices; browser project caching is not a private-data security boundary.
3. **Paid service controls:** shared gateway quotas, provider spending limits and monitoring are required before enabling model keys. The implemented quota is per process, not a global spending cap.
4. **Device/store acceptance:** complete production HTTPS, physical iOS/Android testing and any agreed signing/store work in [MOBILE_DISTRIBUTION.md](MOBILE_DISTRIBUTION.md). This is a prepared PWA, not a signed store release or a fully offline editor.
5. **Content/localization:** validate jurisdiction coverage with the municipality and translate remaining English permit/recovery/source text before claiming full localization. New landing content is translated in all eight locales.

The earlier seven dependency findings were patched; complete root/web audits now report zero findings.

## Recommended distribution

Start with a production-tested PWA for maximum code reuse. A responsive website adapts its layout; installation also requires browser/platform acceptance and working mobile metadata. A store release adds packaging, signing, disclosures, review and platform testing. Android TWA or a native wrapper can be evaluated once store distribution or native capabilities are required and agreed; a native rewrite is not justified by the current feature set. See the linked distribution checklist for current official platform references and separate Android/iOS steps.
