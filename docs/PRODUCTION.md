# PermitPilot production preparation

Updated October 25, 2026. The public sample and local planning tools can run without cloud credentials. A production build is not evidence that account-backed storage or jurisdiction coverage is ready for real applicants.

## Implemented safeguards

- Patched the existing Next.js 15.5 and React 19.1 lines, PostCSS, Sharp, Zod and affected transitive dependencies. The root and web application's complete npm audits reported **zero findings** after installation. Vitest was upgraded to 5 to remove actual development-tool vulnerabilities; its test-only JSX configuration was updated. Runtime and setup now require **Node.js 22.12 or newer**; verification used Node 24.19.
- Production email/password accounts require configured Supabase authentication. Unconfigured or malformed/insecure production cloud URLs leave account fields disabled with a clear explanation. Legacy browser-local password sessions are ignored in production. Development-only local test accounts remain labelled accordingly. The sample identity is always local; the shared cloud sample password was removed.
- Anonymous/sample sessions do not read or write cloud project rows. Signed-in cloud project reads/list queries filter by `user_id`; writes carry that authenticated user's ID. These client-side guards supplement, and never replace, database row-level security.
- Paid citation requests require a bearer token verified through Supabase `auth.getUser(token)`. Missing/invalid authentication and missing model configuration retain local guidance without spending the model key. Requests enforce JSON/schema validation, a **32 KiB actual streamed body** limit, bounded step/string lengths and two-letter states before source-file access. Output accepts only requested step IDs and HTTP(S) source URLs.
- A bounded in-process quota allows ten model requests per verified user per minute; refusals include `Retry-After`. Upstream calls have a 15-second timeout and a 1,200-token output limit per attempt, with at most two model attempts. Quotas reset on process restart and are independent across replicas: they are **not a global cost/abuse control**.
- Production security headers deny framing/plugins, restrict form/base origins, disable unused camera/microphone/location permissions, remove script `unsafe-eval`, and limit connections to this origin plus the configured Supabase origin. Development retains its local compiler connections. Inline scripts/styles remain allowed for the current Next.js/style architecture; a nonce-based CSP would be separate work. HTTPS responses advertise one-year HSTS.
- The supported standalone server entry point is used by `npm start`. Its startup helper includes the public install assets and generated static assets that Next intentionally omits from standalone output. Host and port are validated; no shell command interpolation is used.

## Configuration

Copy `apps/web/.env.example` to `apps/web/.env.local` for local use, or configure the same variables on the deployment host. Never commit real values. `NEXT_PUBLIC_*` values are embedded at build time; rebuild after changing them.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Actual public HTTPS deployment origin; used for absolute Open Graph/Twitter image URLs. Leave blank for local previews. Local/IP/placeholder origins and custom ports are rejected; rebuild after setting the real domain. The generated 1200×630 image remains available at `/brand/social-card.png` without this setting. |
| `NEXT_PUBLIC_SUPABASE_URL` | HTTPS project base URL, without `/rest/v1`; standard and custom cloud domains are reflected in the CSP at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key; never a service-role key |
| `ANTHROPIC_API_KEY` | Optional server-only model key; leave blank until authenticated access, host-level distributed quotas, provider spending limits and monitoring are configured |
| `ANTHROPIC_WORKSPACE_ID` | Optional server-only workspace header, only if required by that Anthropic account |
| `PORT` | Runtime port, 1–65535; defaults to 3000 |
| `HOSTNAME` | Runtime listening host; defaults to `127.0.0.1` for preview. Set `0.0.0.0` when the hosting platform requires external/container ingress |

Do not set a model key on an unreviewed public deployment. The local summary and fixture citations remain available when it is blank. Configure shared rate limits/request timeouts at the host/gateway and provider spending alerts before enabling paid explanations on multiple instances.

## Build and deployment

1. Install Node 22.12+ (current supported LTS recommended), then run `npm ci` in the repository root and `apps/web`.
2. Set the public cloud variables before building. Run `npm run typecheck`, `npm run lint`, `npm test`, both root/web dependency audits, and `npm run build` from the root.
3. For a managed Next.js host, use `apps/web` as the app root, its `npm run build` command, and the provider's Next.js runtime integration. Set production environment variables in that host. Do not export this app as a static-only website: it includes a server API route.
4. For a Node host using this repository checkout, run `npm start` at the root after building. The helper copies `public/`, `.next/static/` and the bundled `legal-sources/` into `.next/standalone/`, then launches `.next/standalone/server.js`. Use a process supervisor and HTTPS reverse proxy. The build directory must be writable during this preparation step.
5. For an immutable/minimal container, perform those two asset copies during image assembly, retain the generated `legal-sources` bundle, and run `node server.js` from the completed standalone directory. Set `PORT` and `HOSTNAME=0.0.0.0` in the runtime environment. No development dependencies are required in that final standalone package.
6. Verify the deployed origin, security headers, deep routes, static assets, install manifest/icons, service worker update/offline recovery and the local citation fallback. Run the existing browser journeys against the production build; repeat device acceptance in [MOBILE_DISTRIBUTION.md](MOBILE_DISTRIBUTION.md).

Next documents the standalone asset-copy requirement in its [output configuration guide](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

## Required before real accounts and private uploads

- [ ] Provision and review the actual database migration. The current client expects `projects` with `id` (unique project ID), `user_id` (authenticated user UUID), `owner_email`, `name`, JSON `config`, `roadmap`, `documents`, `inspections`, `fees`, and timestamp `created_at` / `updated_at` columns. No database migration was applied or verified in this workspace.
- [ ] Enable RLS on `projects`; restrict SELECT/INSERT/UPDATE/DELETE to the authenticated role and `auth.uid() = user_id`. UPDATE requires both the existing-row policy and the new-row check. Never authorize by a client-supplied email alone. Deny anonymous project access and verify two independent users cannot read/write each other's IDs. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [ ] Configure the exact production site/redirect URLs, email confirmation delivery, password policy and SMTP; exercise real signup/confirmation, login, token refresh, expiry and sign-out. Implement and test password recovery plus account/data deletion before offering real-user accounts. See [Supabase redirect settings](https://supabase.com/docs/guides/auth/redirect-urls).
- [ ] Review local project-cache ownership and retention on a shared browser. Browser storage is not encrypted/private storage, and the existing local planning cache is not a security boundary. Define clearing/export/recovery behavior before handling sensitive applicant information.
- [ ] Implement authenticated private file storage, durable upload IDs, signed access URLs, storage RLS, type/size checks, deletion and retry/recovery. Current attachments up to 400 KB can retain browser previews; larger files retain details only. Project JSON is not a durable file-storage service.
- [ ] Apply shared gateway quotas, provider spending limits, monitoring and redacted error reporting for the optional citation service. Live Supabase/model credentials were unavailable, so paid requests were tested with mocks, not an actual provider.
- [ ] Review current jurisdiction/rule/source coverage with the responsible permit office. Demo Harbor content is fictional; estimates and recorded statuses are not official determinations or a live municipal feed.
- [ ] Supply privacy/retention terms and a support contact for the actual operator; verify backups/restoration and an incident/update process. Complete real iOS/Android installation, keyboard, safe-area, session and assistive-technology testing before a mobile launch.

The branding/interaction verification report records the local checks actually performed in [VERIFICATION.md](VERIFICATION.md). No production service, signed package, domain, database, deployment or store release was created by this preparation work.
