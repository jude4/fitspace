# Progress

## Current phase

**Phase 5 — accounts and cloud projects complete.** The user's next-phase request authorized Phase 5 and explicitly selected local Supabase for development/testing. Phases 0–5 are complete. Phase 6 (photo reference and AR) is next and requires separate approval; it has not started.

## Completed

- Preserved the working guest landing, rectangular-room editor, catalog/placement, spatial analysis, history, scene migration and local recovery. Guest editing still needs no account or backend configuration.
- Added real Supabase passwordless email-code registration/login, resend and sign-out with verified server-side user sessions, HttpOnly/SameSite cookies, HTTPS configuration checks, and no application service-role client.
- Replaced the `/projects` shell with owned project create/open/rename/duplicate/delete, explicit guest import, independent copied room/placement IDs, private generated plan thumbnails, loading/error/empty states, and responsive controls.
- Added cloud workspaces that reuse the existing editor while disabling guest saving, preserving/restoring guest state, and keeping private scenes out of localStorage. Serialized autosaves use expected revisions and stable request UUIDs, retain edits through failures/conflicts, and expose export/retry/reload/save-copy actions. Same-owner reauthentication resumes retained work; sign-out/different-owner changes clear private caches across tabs.
- Added PostgreSQL migrations for eight private RLS tables, validated schema-2 canonical scenes, atomic normalized room/placement projections, immutable versions, narrowly granted owner-checked transaction functions, and idempotent creates/saves. Existing Auth accounts receive empty owned profiles without copied personal metadata.
- Added private bounded PNG plan previews and secure owner/project storage policies. Project deletion atomically queues asset cleanup, cascades rows/versions/shares, attempts file removal, and retains owner-scoped cleanup jobs for automatic/explicit dashboard retry.
- Added expiring/revocable immutable snapshot links with 256-bit tokens stored hashed, fragment/POST token transport, no private metadata/path exposure, and a separate read-only 3D viewer with keyboard controls, labeled sources and graphics fallbacks. Subsequent project edits do not alter existing shares.
- Pinned compatible Supabase dependencies, prepared a real local Docker stack, repaired managed local proxy/health and public-template permissions, and documented reproducible setup/hosted prerequisites in [SUPABASE.md](SUPABASE.md). No external project credentials or Phase 6+ dependencies were introduced.

## Verification

- Strict typecheck, lint, 82 unit/component tests across 11 files, local Supabase health/setup, and production build passed. Final formatting/document/diff results are in [TESTING.md](TESTING.md).
- **9 integration tests against real local Supabase** passed: two independent users plus anonymous access, every private table, storage paths, direct-write restrictions, invalid scenes, atomic projections/versions, expected revisions/idempotent retries, snapshot scope/revocation/expiry, cascaded deletion and cleanup ownership.
- **35 Chromium browser tests passed** (the five cloud journeys also passed again against the final build), retaining all 30 earlier journeys and adding five real cloud journeys. Cloud checks cover email codes/cookie flags, explicit guest import, save/refresh/relogin, independent duplication/rename/delete, two-tab conflicts and export/reload, lost acknowledgement retry without a duplicate revision, same-owner reauthentication, cross-tab sign-out, immutable furnished snapshots/keyboard viewing/revocation, API isolation, and 360px cloud controls.
- A separate production server with Supabase configuration explicitly removed passed the guest-only check: account availability, real canonical room edits/local saving, graphics fallback and unavailable private APIs.
- A fresh local database reset applied the scene/project migrations, followed by the cleanup migration. The real SDK integration suite passed on that reproduced schema. No mock-only backend success is counted.
- Project dashboard, cloud workspace, mobile cloud controls and furnished shared-view screenshots were visually inspected. Plan cards were bounded to normal grid columns; cloud/local acknowledgements remain distinct. Development/hosted/device limitations are recorded below.

## Known limitations

- Backend validation is for the real **local** Supabase stack selected by the user. Hosted Supabase, SMTP deliverability, Vercel redeployment, production HTTPS/DNS and production load remain unverified; configure and verify them before deployment claims.
- Private cloud edits are retained in tab memory, not silently persisted on the device. Export unsaved edits before closing/reloading the tab or signing out. Basic optimistic concurrency is not live collaboration. BroadcastChannel provides immediate cross-tab account-change clearing where supported; other clients still require server authorization on every request.
- Private cleanup jobs retry when their owner uses the dashboard. A background worker for deleted accounts or owners who never return remains Phase 9 operational/retention work. Physical file deletion failures are reported and queued rather than falsely marked complete.
- Share links intentionally reveal their selected scene, including entered content. Revocation/expiry prevent future reads, not access to downloaded copies. Shares use original procedural assets only and do not grant general project/storage access.
- Sample dimensions/geometry are not manufacturer verification. Spatial analysis remains nominal envelopes, not exact mesh intersection, delivery-route planning, physical-fit guarantees or accessibility certification. Existing room/furniture bounds and 100-object limits remain.
- Physical-device GPU/touch performance, Safari/Firefox and a complete accessibility/security audit remain unverified. Photo assistance, AR, AI, merchant models, billing and launch hardening remain later phases.

## Next recommended task

After approval, implement **Phase 6 only**: validated photo-reference upload, known measurements and manual approximate calibration, plus supported-platform AR at validated scale with fallback/return navigation. Keep uncertainty explicit and validate on actual supported HTTPS devices before claiming AR works. Preserve guest/cloud ownership, storage validation, snapshots and recovery; do not start AI/retailer/billing work.

## Reusable cloud configuration

Frozen installation and local startup instructions are updated for Phase 5 and its health checks. Draft persistence is confirmed; publication/fresh-task restoration remain unverified. Review/save in environment settings, then publish to reuse the prepared environment. Do not automatically reset a local database containing designs; export/backup before destructive test resets.

## Vercel configuration retained

Root `vercel.json` continues to select native `nextjs` and `.next`. The production build passes with the new dynamic API routes. README still documents removing an incorrect `dist` override. Actual redeployment remains unverified and does not imply Phase 9 completion.
