# Accounts and cloud projects

Phase 5 uses real Supabase Auth, PostgreSQL/PostgREST and private Storage. The application uses a publishable (or legacy anonymous) key and verified user sessions; it has no service-role client. The guest editor works without a Supabase connection.

## Local setup

Use the pinned Node/pnpm versions and an accessible Docker daemon. In the existing checkout:

```bash
export XDG_DATA_HOME=/workspace/.local/share
export XDG_CACHE_HOME=/workspace/.cache
export XDG_STATE_HOME=/workspace/.local/state
export SUPABASE_HOME=/workspace/.supabase
export SUPABASE_TELEMETRY_DISABLED=true
pnpm install --frozen-lockfile
pnpm supabase:start
pnpm dev
```

`supabase:start` starts only the needed local services, verifies actual container/Auth API health, applies pending local migrations, and writes `.env.local` with the local API URL, anonymous key, and application origin. It also writes ignored `supabase/.temp/test-status.json` for integration tests. That test binding contains local administrative credentials; never commit or share it. No secret key is added to the application's environment. Existing nonlocal configuration is not overwritten.

The CLI initially probes an ECR mirror that can be blocked by managed egress policy; the official Docker Hub fallback worked in this environment. Managed Docker can inject proxies into local containers. The narrowly scoped repair script preserves those proxy addresses, adds only local peer exceptions, and makes local loopback health requests without proxies. It recreates only this project's Auth/Storage containers while preserving their configuration, networks and volumes. It does not recreate Kong, whose generated startup files must be retained. The wrapper does not consider the initial ignored CLI health failure a success: actual service and API health must subsequently pass. Ordinary Docker installations that are already healthy skip the proxy repair. A separate narrow fix ensures that only the public HTML email templates are readable by Kong; CLI 3.1 can copy them with root-only permissions under rootless Docker. Private keys/configuration are untouched. Auth reloads after a permissions change, and template HTTP access is checked before readiness is reported.

Local mail goes to the stack's Mailpit inbox, not the Internet. `pnpm exec supabase status` identifies its local address. Request a code through `/projects`, read the six-digit code from the local inbox, then verify it in FitSpace. New and existing accounts use the same passwordless flow. Both confirmation and magic-link templates display `{{ .Token }}`. There is no password-reset UI because passwords are not used by the application.

## Database and tests

The following commands target the isolated local stack with CLI 3.1.0. **Reset deletes that local database**, including local projects/accounts. Export anything you want to keep first. Never point these tests at production.

```bash
pnpm exec supabase db reset --yes
pnpm supabase:start
pnpm test:integration
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:guest-only
pnpm typecheck
pnpm lint
pnpm test
pnpm build
FITSPACE_SUPABASE_E2E=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e
```

The integration harness refuses nonloopback Supabase URLs. It creates two independent users, verifies owner/anonymous isolation through real SDK requests, then removes its users. Browser checks use real email codes from local Mailpit and real project APIs. Only the lost-acknowledgement test deliberately interrupts a browser response after the server has committed it. Normal guest suites remain runnable without enabling cloud tests; a skip is not cloud integration success.

Migrations create profiles, projects, normalized room/placement projections, immutable scene versions, private asset metadata, snapshot shares, and durable asset-cleanup jobs. RLS is enabled on every private table. Direct scene/project writes are revoked; narrowly scoped transaction functions authorize `auth.uid()`, validate the pinned schema-2 scene contract, check expected revisions, and commit the canonical scene/projections/version atomically. Request UUIDs deduplicate creates and save retries. Duplicate/import remap room and placement IDs while preserving measurements/transforms and catalog revisions.

`scene-schema.json` and the first migration capture the schema-2 sample-catalog contract. The generator is an implementation aid before deployment, not a migration strategy: do not rewrite an applied migration. Future catalog/scene changes need compatible new revisions and migrations retaining old documents.

## Application behavior

- Signing in does not silently import guest data. **Import guest design** explicitly creates a separate owned project, retaining the browser's guest copy. Cloud documents are not saved into guest local storage.
- Cloud writes are debounced and serialized, with one in-flight request. Acknowledgement applies only to the document actually committed. Edits made during a save queue behind it. Network retries reuse their request UUID; stale revisions pause saving rather than overwrite another tab.
- Failed/conflicting writes retain edits in memory and expose export, retry where appropriate, explicit cloud reload, and save-as-new-project actions. Route re-entry can recover unsaved memory in the same tab. Closing/reloading a tab can lose unsaved memory; export first. Applied room/furniture/spatial changes still use the existing undo/redo behavior.
- Verified same-owner sign-in preserves owner-scoped retained edits and can resume a 401-blocked save. Changing accounts/signing out clears the previous private state.
- Passwordless sessions use HttpOnly, SameSite=Lax cookies. HTTPS origins use secure cookies. Auth is verified server-side for each private operation. A sign-out/account-change broadcast clears other tabs' private state and navigates them to the account page; a new document clears private router caches. Browsers without BroadcastChannel cannot receive that immediate broadcast; subsequent API calls still require valid authentication.
- Plan previews are original bounded PNG diagrams generated from validated geometry. They are not 3D captures or uploaded merchant images. Storage is private, owner-scoped and PNG/size limited. The application serves previews through an authenticated, uncached endpoint.
- Project deletion revokes access to its rows/versions/shares and queues its file paths atomically. Normal requests remove the files immediately; failures leave owner-scoped durable cleanup work. The dashboard retries pending cleanup and offers an explicit retry. A background worker for deleted accounts or owners who never return remains an operational hardening task before launch.

## Read-only snapshot links

A link intentionally discloses one immutable saved scene, including its entered content. Tokens contain 256 random bits, are returned only at creation, and are stored only as SHA-256 hashes. The raw token stays in the URL fragment and is sent in an uncached POST body, not a query/path or referrer. Do not add request-body/token logging.

A scoped database resolver returns only that snapshot; it exposes no owner email, project-table access, private asset path, or mutation permission. Links expire in 1, 7 or 30 days in the UI and can be revoked. Server/database time controls expiry. Editing a project does not change an existing shared snapshot. Revocation prevents future reads; previously downloaded data cannot be recalled. The viewer has its own read-only renderer and never hydrates the mutable editor store.

## Hosted configuration and deployment

Local validation does not establish hosted deployment or email deliverability. For a designated Supabase development project, apply the reviewed migrations using the pinned CLI's explicit `--remote` target. Configure these values in the application hosting environment, never in Git:

- `SUPABASE_URL`: that project's HTTPS API URL.
- `SUPABASE_PUBLISHABLE_KEY`: its publishable key or legacy anonymous key. Secret/service-role keys are rejected by application configuration.
- `FITSPACE_SITE_URL`: the actual HTTPS application origin. Only localhost/127.0.0.1 may use HTTP in development.

Configure six-digit email OTPs and the provided confirmation/magic-link email templates. Configure production SMTP and appropriate Auth rate limits/expiry settings in Supabase; the high local mail limit is for isolated tests, not production. Rerun the account/save/storage/share journeys against the designated project before deploying or claiming hosted validation. Launch security/rate limiting, monitoring, legal/retention policy, and background orphan cleanup remain Phase 9 work.

## Phase 6 photo estimates

Run the existing `pnpm supabase:start` wrapper to apply `20261115000000_photo_estimates.sql` without resetting local data. It additively permits `image_estimated` for room dimensions in the existing scene-2 validator and leaves catalog, doorway, ownership, size and atomic-write rules unchanged. Apply this migration to a designated hosted development project before using photo estimates there; hosted application remains unverified. Photos themselves remain browser-session-only and never enter Supabase storage or shared snapshots. The integration suite verifies estimate persistence/share provenance and rejects furniture photo or manufacturer-verification relabeling.
