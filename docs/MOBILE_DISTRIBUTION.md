# Mobile distribution readiness

Reviewed against the code and official platform guidance on October 24, 2026. This is preparation for an installable web app, not a signed or submitted store release.

## Recommended path

Ship and test the responsive PWA first. The existing Next.js 15 / React 19 / TypeScript / Tailwind 4 app already uses web routes, browser file selection, local storage, Supabase and a React Flow graph. No current feature requires a native rewrite. This recommendation is an engineering judgment based on those capabilities.

| Option | Reuse and maintenance | Device features and authentication | Decision |
| --- | --- | --- | --- |
| Responsive website | All current code; one web deployment | Browser file upload and web authentication; runs in a browser tab | Foundation, but does not itself establish installation or a store listing |
| Installable PWA | All current code; one web deployment plus manifest/worker | Home-screen launch; available browser capabilities; test installed authentication and storage separately | Recommended first distribution target |
| Android Trusted Web Activity | Keeps hosted web UI; adds Android package/signing/release work | Browser-backed website; validate identity with Digital Asset Links; test auth and external navigation | Consider after PWA device acceptance if Play distribution is required |
| Native wrapper such as Capacitor | Potentially reuses much React UI; adds native projects, plugins, builds and bridge maintenance | Useful if requirements need native camera/push/deep links; auth redirect and secure storage need a separate design | Obtain agreement and a feature requirement first. Current Next.js server/standalone output is not an embedded native bundle; choose hosted-web versus static-compatible architecture explicitly |
| Native implementation | Business types/rules may be shared; screens and navigation largely rebuilt | Most platform control; separate accessibility, authentication and device integrations | Not justified by current requirements |

Browser installation support and promotion vary. Chromium install promotion uses a suitable manifest and HTTPS; localhost is a development exception. iPhone users can add the site from Safari to their Home Screen. These are browser installation paths, distinct from submitting a native package to a store. Sources: [Chrome installation criteria](https://web.dev/articles/install-criteria), [PWA installation](https://web.dev/learn/pwa/installation), [Apple Home Screen instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

The requirements that would justify revisiting this decision are specific: a contractual Play/App Store listing requirement; reliable work while disconnected with queued document uploads and conflict recovery; background tasks beyond tested browser support; or a proven need for device integrations that the supported web browsers cannot meet. A camera/file picker alone does not establish that need. Define and test the requirement first, then choose TWA for Android store discovery or a wrapper/native implementation for capabilities. The current Next.js server routes, web authentication redirects and browser-local persistence would still need explicit deployment/authentication/storage decisions.

## Current implementation

- Manifest defines a stable ID, root scope/start URL, standalone display, theme/background colors and language.
- PNG launcher icons at 192 and 512 pixels, a separate 512-pixel maskable icon with inset artwork, and a 180-pixel Apple touch icon derive from the new folded permit/route logo. Header, offline recovery and social artwork share the same identity.
- Apple web-app and icon metadata, application name and `viewport-fit=cover` enable installed presentation and safe-area layout support.
- Typography now uses a single native system sans-serif stack throughout, including offline recovery. No web-font download is needed. Earlier Source font assets/licenses remain archived in the source but are not loaded.
- Service worker registration runs only in production and checks worker updates without using the HTTP cache for the worker script. Returning to a visible app also checks for an update.
- Worker caches only public install assets and an accessible offline recovery page. Navigation remains network-first. It does not cache project HTML, API/auth responses, documents or Next.js navigation payloads. It cleans up earlier PermitPilot caches on activation and leaves unrelated caches alone.
- Offline fallback offers a retry on the current route; it does not promise offline editing, synchronization or successful saves.
- The navigation's **Install app** disclosure explains browser installation and device-local storage. It offers a native install button only when the browser supplies `beforeinstallprompt`; dismissal/errors keep manual instructions available. Safari instructions explain Share → Add to Home Screen. Standalone presentation is detected from display mode or iOS's standalone flag, with no repeated install prompt. This is browser feature detection, not a guarantee that every browser supports installation. [Install prompt API](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent).
- A waiting worker update is visible in the same disclosure. **Update and reload** is explicit; intake asks the user to Save & exit first, and pending actions block refresh. A first worker installation, update availability, or another tab's worker activation never automatically reloads this page. The worker activates early only after the supported update message; failure gives recovery instructions. No offline editing or private-page cache was added. [Worker activation lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting).

The PWA still needs a successful production HTTPS device test before claiming it is installable in the supported browser matrix. No push, background sync, native framework, signing identity or store account was added.

## Shared release blockers

- [ ] Configure a stable HTTPS production origin and monitoring; deploy the Next.js server/standalone runtime and required static/public assets. Do not deploy only a static folder and assume API routes work.
- [ ] Configure production Supabase URL/key, database schema, storage policies and row-level access. Never put a service-role secret in client environment variables.
- [x] Disable browser-password account fallback in production and remove shared cloud demo credentials. Sample access is local only; unconfigured production sign-in explains its availability instead of storing passwords. Development-only local accounts are explicitly labelled. Verify real cloud authentication before enabling real-user accounts.
- [ ] Verify email confirmation, password recovery, session refresh, sign-out, account deletion and data deletion against the configured production Supabase service. Cloud sign-up failure handling has been corrected to prevent silently creating a local account; live authentication/service configuration remains unverified.
- [ ] Configure Supabase allowed site/redirect URLs for the chosen deployed origin and any future native callback URI. A wrapper must implement and test deep-link handling instead of assuming web redirects work.
- [ ] Confirm whether projects/documents should sync across devices. Existing browser persistence is device/profile scoped; installation must not be advertised as cloud synchronization. Test browser-to-installed state transfer and communicate storage clearing/uninstall effects.
- [ ] Publish accurate privacy, support and retention/deletion information. Clarify fictional Demo Harbor content and intended production permit data.
- [ ] Validate the manifest in Chromium DevTools, all icon responses and safe masks, worker install/update, old-cache migration, offline deep-route fallback, reconnection and retry. Confirm private content is absent from Cache Storage.
- [ ] Test Safari/iPhone and Chrome/Android on physical devices: install/launch/uninstall, portrait/landscape, display cutouts, software keyboard, 200% text, VoiceOver/TalkBack, file picker/preview, large uploads, external links and browser back.
- [ ] Test sign-in, intake creation, project switching, status changes, document attachment, export and recovery from lost network on both browser and installed launches.

## Android / Google Play checklist (if selected)

- [ ] Agree on Play distribution and TWA versus wrapper; register a verified developer account and final package name.
- [ ] For a TWA, create a Bubblewrap/native Android project after agreement; host `/.well-known/assetlinks.json` on the production origin with the final package and Play app-signing certificate fingerprint. Validate every origin expected to remain trusted. [Android TWA guide](https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2).
- [ ] Create and securely retain upload credentials; enroll/configure Play App Signing, build the signed app bundle, and verify installed release builds rather than only debug builds. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756).
- [ ] Check the target SDK and other current Play requirements in Play Console at submission time; meet account-specific testing/verification requirements. Run internal/closed device testing and Play pre-launch checks.
- [ ] Prepare launcher/adaptive/store icons, feature graphic, phone/tablet screenshots as applicable, description, support contact/URL, privacy policy, content rating, audience, reviewer login/demo instructions and Data safety declarations for the actual deployed services/SDKs. [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469).
- [ ] Verify update, authentication, file selection, permission denial, external navigation and offline behavior from the Play-signed build; do not claim a hosted TWA is a fully offline app.

## iOS / App Store checklist (if selected)

- [ ] Agree on a native wrapper and substantive app value before introducing Xcode/native projects. Apple's minimum-functionality rule expects more than a repackaged website; acceptance cannot be assumed. [App Review Guidelines, section 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).
- [ ] Enroll in Apple Developer Program; choose bundle ID, team, signing certificates/profiles and App Store Connect record. Build with the currently required Xcode/iOS SDK and test signed builds using TestFlight on physical iPhones/iPads in the supported matrix.
- [ ] Design callback/deep-link authentication and secure token persistence for the wrapper; configure associated domains/universal links only if used. Verify session restoration and provider sign-in policies if social login is introduced.
- [ ] Implement any declared camera/file/push capabilities and permission descriptions with clear denial recovery. Do not request device permissions that existing web functionality does not need.
- [ ] Provide privacy policy, app privacy disclosures, support URL, age rating, required export-compliance answers, final app icon and required screenshots; check privacy manifests/required-reason APIs for any future native SDKs.
- [ ] Implement account deletion if account creation remains supported; provide reviewer access and a functioning backend, and remove misleading placeholders. [Apple review guidance](https://developer.apple.com/app-store/review/guidelines/).
- [ ] Complete TestFlight acceptance, crash/accessibility checks, offline/update tests and App Review submission. A Home Screen PWA does not require this native signing/store workflow.

## Verification boundary

Icon dimensions and formats were inspected after generation. Automated worker policy tests cover public-only precaching, network-first navigation fallback, same-origin checks, pass-through API/document/data requests, and legacy-cache cleanup. Whole-app checks and viewport screenshots are reported in the task's verification report. Physical-device installation, software keyboard behavior, production Supabase authentication, signed binaries and store acceptance require the deployment/accounts/devices listed above; this change does not verify them.

The current production localhost baseline was inspected in an isolated mobile Chromium browser: the manifest parsed with no errors, Chromium's installability-error list was empty, and the page was controlled by an activated worker with only `permitpilot-public-v4` in Cache Storage. It was running in browser display mode, not as an installed app. This establishes local browser eligibility and registration only; localhost's secure-context exception is not evidence of production HTTPS deployment. Ten focused automated checks cover the worker policy/explicit activation and the new controls' unsupported/manual path, one-use install prompt with dismissal, simulated standalone display, installation without mislabelling a browser tab, and intake-safe explicit update request. The simulated install prompt and display mode are test fixtures, not a physical installation or an actual installed-session test. See [VERIFICATION.md](VERIFICATION.md) for the final whole-app results.
