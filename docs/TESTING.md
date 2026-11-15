# Testing and verification

## Phase 0 actual results — 2026-11-14

- Repository inspected: empty README only at initial HEAD; no app or existing test runner.
- Onboarding checks passed: `git ls-remote origin refs/heads/main` matched local HEAD; `git fsck --full` succeeded; initial working tree clean.
- Documentation verification: all eight required Markdown files present and nonempty; local Markdown links resolve; all ten phase sections and acceptance gates present; `git diff --check` passed.
- Manual specification review: consistent meters/radians and coordinate conventions, measurement provenance, immutable product references, canonical scene/projection relationship, ownership boundaries, and sequential phase approval requirements.
- Application typecheck, lint, unit/component/E2E tests, production build, browser review, and 3D rendering checks **not run**: application and tooling are not initialized. No zero-test run is counted as success.

## Tooling added in Phase 1

The repository now includes pnpm scripts for development, build, typecheck, lint, formatting, Vitest unit/component runs, Playwright E2E, and performance sampling. Use the frozen lockfile; see README for exact commands and browser setup. Historical Phase 0 non-execution remains accurate for that phase only.

## Coverage by boundary

| Area             | Meaningful checks                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Units/schema     | metric/imperial round trips, finite/positive values, uncertainty/provenance, supported versions, corrupt/oversized imports                             |
| Geometry         | room bounds, normalized model scale/pivot, rotated intersections, touching tolerance, vertical separation, doorway missing data, clearance assumptions |
| Commands/history | deterministic edits, one drag per undo, redo invalidation, duplicate IDs, rejected fixed-item scaling                                                  |
| UI               | accessible names, keyboard/numeric alternatives, error/loading/fallback states, responsive panels, reduced motion                                      |
| Persistence      | local reload, quota/corruption, revision pinning, guest import retry, cloud conflicts and failed autosave                                              |
| Authorization    | two owners and anonymous sessions, every exposed table and storage path, share scope/revoke/expiry, merchant roles                                     |
| Assets           | valid GLB fixture, failed model request, units mismatch, oversized/unsafe files, external references, deletion dependencies                            |
| AI/billing       | invalid tool proposals, confirmation/undo, webhook signature/replay, server entitlements; real configured integrations distinct from fixtures          |

## Runtime and visual verification

Test landing → workspace → room editing → catalog/placement → warnings → save/reload → read-only share as phases enable them. Assert actual expected scene changes, not only an open port or canvas element. Use known geometry bounds to verify scale and a visual browser check to confirm nonblank rendering. Record browser console errors and fix introduced failures.

Check 360/768/1440 px layouts, touch and keyboard inputs, reduced motion, slow/failed asset loading, unavailable WebGL, and context loss. Software-rendered CI is useful for correctness, not proof of physical GPU performance. Record browser/device/OS/hardware, network throttle, asset transfer size, LCP, and frame-time methodology against architecture budgets. AR requires actual supported-device HTTPS tests and remains unverified without them.

## Release discipline

Run relevant checks each phase, not unrelated later integration suites. Preserve runner exit status when capturing output. For docs-only changes use link/completeness/diff checks rather than synthetic app tests. In later phases, run type/lint/test/build and representative functional tests; explain unavailable credentials or device coverage and do not claim the blocked capability works. Security, legal review, backup restoration, monitoring, and production deployment gates remain open until independently evidenced in Phase 9.

## Phase 1 actual results — 2026-11-14

Environment: Linux managed cloud machine, Node 24.22.1, pnpm 11.25.0, system Chromium 156.0.8078.79 with SwiftShader. Dependency versions are pinned in `package.json`; the official compatibility sources and direct ESLint 10 configuration are in [DEPENDENCIES.md](DEPENDENCIES.md).

| Check                                                                 | Actual result                                                                                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CI=true pnpm install --frozen-lockfile`                              | Passed; existing lockfile reproduced installation with integrity/supply-chain checks retained                                                                                 |
| `pnpm peers check`                                                    | Passed; no unresolved peer issues                                                                                                                                             |
| `pnpm typecheck`                                                      | Passed, strict TypeScript                                                                                                                                                     |
| `pnpm lint`                                                           | Passed                                                                                                                                                                        |
| `pnpm test`                                                           | 4 passed in 2 files; store behavior, WebGL fallback/controls, reduced motion                                                                                                  |
| `pnpm format:check`                                                   | Passed                                                                                                                                                                        |
| `pnpm build`                                                          | Passed; landing and future routes prerender successfully                                                                                                                      |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e` | 7 passed; actual canvas changes, orbit/reset/view, comparison by keyboard, palettes, navigation, responsive layouts, reduced motion, unsupported WebGL, context-loss fallback |
| `pnpm dev --port 3001` plus a local HTTP request                      | Passed; expected headline and primary action present in development HTML                                                                                                      |
| `git diff --check`, required-doc and local-link checks                | Passed                                                                                                                                                                        |

Browser suite captures screenshots under ignored `test-results/`; desktop and 360 px screenshots were visually reviewed. Canvas screenshots confirm a nonblank rendered scene and visible furnishing/material changes, not merely a mounted canvas. No page/console errors were observed in the primary functional journey. Responsive checks cover 360/768/1440 px without horizontal overflow. These are Chromium tests, not cross-browser or physical-device certification.

### Performance sample

Reproduce with the production server running: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm measure:demo`. The script records JSON under ignored `test-results/performance.json` and a mobile screenshot. It instruments only its test browser, not application code.

Final sample at 2026-11-14 10:14 UTC:

- Initial shell scripts: **193.5 KiB gzip**, excluding deferred renderer chunks, under the 250 KiB target. Measured by gzipping script responses listed in the initial HTML; actual network compression can differ. All loaded JS was about **403 KiB encoded** in this sample.
- External model/texture/font/HDR transfers: **0 bytes**, under the 5 MiB demo asset budget; geometry is generated locally.
- Continuous camera orbit, 1440 × 1000, 30.04 seconds, SwiftShader lower-quality path: **293 animation frames**, **9.75 average FPS**, **83.4 ms median frame interval**, approximately **9,378 submitted triangles per nonempty frame**. Submitted triangles are a test-instrumentation count including render passes, not a unique visible-mesh count.
- Original cloud sample before simplifying geometry and software quality adaptation: **2.09 average FPS**, 433.3 ms median frame interval, 131,934 submitted triangles/frame. This motivated the optimization; it is not the final result.
- Mobile lab sample: 390 × 844, 4× CPU slowdown, 150 ms network latency, 200,000 bytes/s download, **LCP 1,192 ms**, below the 2.5-second target in this single run. Unthrottled desktop LCP was 1,092 ms. This is not a field percentile or Lighthouse score.

**Limitation:** Cloud software animation remains below 30 FPS. The architecture's integrated-GPU ≥30 FPS target has **not** been validated because no physical reference device is available. Do not infer consumer GPU performance from SwiftShader. Physical-device profiling and cross-browser/mobile touch validation remain necessary before launch; the demo defaults to demand rendering with motion off.

### Failures resolved during this phase

- pnpm's default data directory was unwritable: use workspace XDG directories and the configured sibling store. Frozen installation now passes.
- The aggregated Next.js lint config brought plugins whose peers excluded ESLint 10. Configure supported ESLint 10, TypeScript, Hooks, and Next plugins directly; no peer override or deprecated temporary ESLint 9 pin is retained.
- Type checking caught camera tuple-spread and test config typing issues; both fixed.
- Lint caught synchronous effect state updates and a native internal link; use scheduled capability detection and Next Link.
- Browser tests caught camera reset treating normal canvas disposal as a context-loss error; reset the same camera and clean up listeners. The regression test passes.
- Screenshot inspection found oversized foreground plants and narrow-canvas cropping; simplify the composition and fit camera distance to aspect ratio.

No Supabase, AI, Stripe, AR, production deployment, room editing, furniture placement, or persistence tests ran: these capabilities belong to later phases and are not implemented.

## Phase 2 actual results — 2026-11-14

Same pinned Linux/Node/pnpm/Chromium environment as Phase 1; no dependencies added or verification policies relaxed.

| Check                                                                                 | Result                                                                              |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                      | Passed with strict TypeScript                                                       |
| `pnpm lint`                                                                           | Passed with the existing ESLint 10 configuration                                    |
| `pnpm test`                                                                           | 39 passed across 6 files                                                            |
| `pnpm format:check`                                                                   | Passed                                                                              |
| `pnpm build`                                                                          | Passed; `/workspace` now serves the working room editor                             |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e`                 | 15 passed: 7 existing landing tests and 8 workspace tests                           |
| `... pnpm exec playwright test tests/e2e/workspace.spec.ts` after final visual polish | All 8 workspace tests passed again                                                  |
| `pnpm dev --port 3001` and local `/workspace` request                                 | Passed; room-builder heading, Apply dimensions action, and Not saved status present |
| Documentation links/completeness and `git diff --check`                               | Passed                                                                              |

### Coverage and functional evidence

- **Actual scale:** construct Three.js `BoxGeometry` meshes from the same room descriptors used by rendering; inspect `Box3` bounds. For a 4 × 5 × 2.7 m interior, floor top = Y0, ceiling underside = Y2.7, north/south inner faces = Z0/Z5, west/east = X0/X4. Assertions are tighter than 1 mm. Structural thickness extends outward.
- **Validation/provenance:** zero/negative/nonfinite/oversized widths, low height, unknown material IDs including prototype keys, and missing verification evidence are rejected. Only edited axes become user-entered; room serialization retains source data.
- **Units:** whole feet plus decimal inches; reject inches ≥12, fractional feet, empty/nonfinite/malformed numbers; normalize rounded display carry. Repeated display toggles and unchanged imperial form submissions preserve canonical precision. Explicitly edited display parts round-trip within 0.013 mm; this is conversion tolerance, not physical measurement accuracy.
- **History:** room creation, dimensions, and materials undo/redo in order; bounded to 100 snapshots; new edits invalidate redo. Invalid edits and presentation controls do not change scene history. Keyboard shortcuts work outside text inputs.
- **Camera math:** sphere/frustum tests cover 1 × 1 × 1.8 m, 4 × 5 × 2.7 m, 30 × 30 × 6 m, and long narrow rooms at aspect ratios 0.4, 1, and 2.4. Orthographic bounds contain the floor footprint and margins. Browser tests reframe minimum/maximum sizes and verify visible indicators.
- **Rendered behavior:** browser screenshots change after material edits, zoom, and pan; actual floor raycasting updates selection. Perspective/overhead controls, dimensions/grid, all-wall and ceiling visibility, invalid-input feedback, presets, imperial input, undo/redo, and room creation work through the UI. Primary journey reports no page/console errors.
- **Responsive/accessibility:** viewport/panels checked at 360/768/1440 px with no horizontal overflow. Native input labels, error associations, keyboard camera controls, visible focus, live edit status, and alternate hierarchy selection are provided. This is targeted coverage, not a complete accessibility audit or physical touch-device certification.
- **Graphics failure:** unsupported WebGL leaves numeric editing usable. A real `WEBGL_lose_context` extension event triggers the fallback; renderer retry restores the preview with the edited 6 m width intact.
- **Materials/resources:** procedural wood/stone/concrete data textures differ, repeat at a consistent scale, use mipmap/linear filtering to reduce aliasing, and are disposed on replacement/unmount. No external assets are fetched.

Desktop perspective and overhead screenshots, 360 px full-page layout, and the 30 m size extreme were visually inspected. Final inspection led to reserving viewport space below the canvas for navigation/labels and adding mipmapped texture filtering. Screenshot artifacts and Playwright traces remain in ignored `test-results/`.

The first full run had 13 passes and one failure caused by an overly broad alert locator matching Next.js's route announcer. The test now scopes to the inspector without weakening the error assertion; the full suite passes. Type/lint errors encountered during implementation were corrected, including missing texture filter imports and moving mutable engine camera ownership to refs. No assertions were disabled.

Physical-GPU frame rates and cross-browser/mobile-device behavior remain unverified. The Phase 1 performance numbers above are historical landing-demo samples, not new benchmarks of the room builder. No persistence, catalog, collision, auth, or later integration tests were run or claimed in this phase.

## Vercel output-directory repair

`pnpm build` passed after adding `vercel.json`. Verified its `nextjs` framework and `.next` output match generated `.next/BUILD_ID` and prerendered home/workspace HTML artifacts. `git diff --check` passed. No application logic changed, so unit/E2E suites were not repeated for this configuration-only fix. The native Vercel builder's official source confirms its `.next` default; actual deployment in the user's Vercel project remains unverified.

## Phase 3 actual results — 2026-11-14

The existing pinned Node/pnpm/Linux/Chromium toolchain is unchanged. No new dependencies, external assets, or credentials are required.

| Check                                                                                                   | Result                                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm typecheck`                                                                                        | Passed, strict TypeScript                                                |
| `pnpm lint`                                                                                             | Passed                                                                   |
| `pnpm test`                                                                                             | 52 passed across 8 files                                                 |
| `pnpm format:check`                                                                                     | Passed                                                                   |
| `pnpm build`                                                                                            | Passed; existing routes retained                                         |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e`                                   | 24 passed: 9 furniture/storage cases plus 15 retained landing/room cases |
| Focused `... pnpm exec playwright test tests/e2e/furniture.spec.ts` after final preview recovery checks | 9 passed                                                                 |
| Development `/workspace` request                                                                        | Passed; catalog and export controls rendered                             |
| Required documentation, local links, `git diff --check`                                                 | Passed                                                                   |

### Meaningful coverage

- All nine categories have complete positive sample dimensions, supported asset revisions/variants, and original procedural recipes. Recipe extents occupy the expected bottom-center normalized envelope. Preview and rendered placement scales use physical dimensions; thumbnails use the same proportions.
- Search combines text/category/material filters, including genuine empty results. Browser tests open live previews and add every sample asset.
- Numeric transforms and yaw preserve meter/radian precision. Fixed concepts cannot resize or acquire altered sample dimensions; permitted shelf/desk widths validate ranges and provenance. Unknown variants/revisions, nonfinite transforms, invalid room links, duplicate IDs, oversized files/scenes, unsupported versions, and corrupt data fail validation.
- Rotated planar extents drive wall alignment. Grid/near-wall snapping is deterministic. Physical mouse dragging changes the saved position, remains one undo step, and can redo without deleting the object. Draft updates/cancellation do not create scene history. Native catalog DataTransfer/drop events project through the current camera onto the floor and produce one undoable add.
- Duplicate/delete and room recreation preserve reversible scene snapshots and revision pins. Imports validate before replacing; valid imports undo and invalid imports leave the design unchanged.
- Local persistence hydrates before subscription/autosave, then acknowledges only after a successful write. Exact placement coordinates/rotations, sizes, variants, source/uncertainty/evidence, and asset/product revisions survive JSON round trips/reload.
- Storage tests simulate quota failures and incompatible/future data. In-memory edits survive errors; no false saved status is reported. The old raw data remains until explicit replacement and is downloadable unchanged. An exported in-memory backup contains the unsaved objects. A second real browser tab receives a storage event, pauses overwrites, and explicitly reloads the newer scene. This does not test or guarantee transactional simultaneous writes.
- Graphics/context recovery remains available. A product-preview graphics loss displays a recovery message and supports close/reopen/Add; the primary editor's retained context-loss tests still pass. There are no remote model fetches to fail in this phase; arbitrary imported asset IDs are rejected, not loaded. Remote GLB/merchant ingestion is not claimed.
- Desktop/mobile catalog and furniture inspector controls remain reachable; viewport layouts stay within 360/768/1440 px. Modal focus is restored, keyboard users can add/select/edit without dragging, and existing reduced-motion checks pass. Targeted accessibility coverage is not a complete audit or actual touch-device certification.

Screenshot artifacts in ignored `test-results/` include product previews, the furnished desktop workspace, and the mobile furniture inspector. Visual review led to closer preview framing, a catalog shortcut, contextual object/room dimension labels to avoid overlap, and contained desktop panel scrolling. Procedural samples are deliberately labeled rather than presented as real retailer assets or photorealistic capture.

Type/lint checks caught pointer-capture target typing and a mutable declaration; both were corrected. All implemented assertions remain enabled. Browser checks reported no errors in the primary furniture journey; expected storage/graphics failures were tested separately. No spatial-fit, auth, cloud, AR, AI, retailer, billing, live deployment, physical-GPU, or cross-browser functionality is claimed as tested in this phase.

A final regression test additionally covers failed-save route re-entry: a quota failure leaves a newer 7 m in-memory room and an older 4 m stored copy. Unmounting and remounting under React Strict Mode retains the newer room and error status instead of hydrating the older copy. The tab-local retention marker is excluded from exports and history.

## Phase 4 actual results — 2026-11-14

Environment retained: Node 24.22.1, pnpm 11.25.0, Linux cloud machine, system Chromium 156 with SwiftShader. No dependencies or external services were added.

- `pnpm typecheck` and `pnpm lint` passed with strict types and all rules retained.
- `pnpm test`: **71 tests passed across 9 files**. The 19 added checks cover geometry matching actual Three.js yaw transforms, disjoint/touching/contained/rotated rectangles, minimum distances and 1 mm thresholds, vertical intervals, boundary/height/wall findings, clearance settings, missing/nonfinite data, estimate qualifications, doorway tipping/uncertainty/thresholds, comparisons, version 1 migration/version 2 validation, settings across history/room recreation, original migration backup, backup failure retention, and malformed JSON explicit replacement.
- `pnpm build` passed after the final source changes; all existing routes compile and prerender. Native Next.js `.next` output is retained.
- The **final full 30-case browser suite passed**: all 24 retained landing/room/furniture journeys plus six spatial journeys. These exercise nominal initial results, duplicate overlap, visible bounds toggling, undo/redo, outside/west-wall findings, guideline/doorway changes, unknown inputs, dimension comparisons, persistence, exact legacy backup download, and Analysis controls/error states at 360/768 px.
- The final targeted spatial run passed **all 6 cases** against the final build, additionally asserting real clearance-envelope canvas changes and that a crowded 12-object report retains all 66 overlap findings plus 12 boundary findings behind progressive disclosure. After fixing desktop paint containment, the full 30-case suite passed again against the final production build, including the new document-height assertion. The resulting desktop screenshot is 1440 × 1000 without the previous blank overflow area.

Visual review caught a long-panel scroll-overflow issue: desktop paint containment now keeps the document within the viewport while inspector content scrolls independently. A browser assertion guards the document height.

Desktop/mobile artifacts in ignored `test-results/spatial-{desktop,360,768}.png` were visually reviewed. The inspector provides labeled inputs, explicit unknown values, readable limitation text and responsive navigation; viewport warning bounds correspond to potential envelope conflicts. A keyboard-focused skip link visible in the mobile capture is the normal focus state. Selected warnings also have text, so severity is not color-only.

Review caught and fixed a migration edge case: attempting to inspect the version of malformed JSON must not prevent explicit replacement. A new regression proves the old raw remains blocked until the Replace action and then correctly saves the current in-memory scene. An invalid testing-library option was corrected during strict typechecking; no assertions were removed.

Geometry tests validate deterministic numeric behavior, not physical measurements. Boundary and clearance results are nominal, absent uncertainty is unknown, and rectangular envelopes can overestimate real mesh overlap. Doorway results compare six axis orientations only; they never certify delivery. Located openings, route planning, accessibility certification, Supabase/auth, cloud sharing, AR, AI, retailers, billing, real Vercel deployment, physical GPU/touch performance, and Safari/Firefox remain unverified or future scope.

Final handoff checks: formatting, local Markdown links, phase-status/document consistency, and `git diff --check` passed. The development `/workspace` route also served successfully with Layout analysis available. Reusable cloud startup instructions were saved as a draft; publication and fresh-task restoration have not been tested.

## Phase 5 actual results — 2026-11-14

Environment: existing Node 24.22.1/pnpm 11.25.0/Next 16.4.6/Chromium 156 with SwiftShader; added Supabase JS 2.119.0, SSR 0.12.7, server-only 0.0.1 and dev CLI 3.1.0. Real local services use Docker 29.9.2/rootless, PostgreSQL 17, Auth, PostgREST, private Storage, Kong and Mailpit. No hosted Supabase project or external email service was used.

- Strict `pnpm typecheck` and `pnpm lint` passed with all existing rules retained. The explicit hard-navigation lint exceptions document why account changes destroy private stores/router caches instead of preserving the current client document.
- `pnpm test`: **82 tests passed across 11 files**. New tests cover serialized/queued saves, truthful acknowledgement, retained/lost-response requests and stable UUIDs, conflicts/401 blocking, in-flight undo, disposal, preview failure distinction, verified same-owner resumption, deterministic PNG output, and guest-hook disabling so cloud content cannot hydrate/write guest storage.
- `pnpm test:integration`: **9 tests passed against real local Supabase**. Two independently authenticated users and an unauthenticated client exercise all eight private RLS tables, denied direct mutations/role changes, schema validation, transactional projections, immutable versions, stale revisions, idempotent create/save and original-revision acknowledgement, thumbnail MIME/path isolation, bearer snapshot scope, revocation, database-clock expiry, deletion and cleanup-job isolation.
- `pnpm build` passed; the original routes remain, with dynamic authenticated APIs, owned `/workspace/[id]` and static public `/projects`/`share` shells. Private data is fetched through uncached authorized APIs rather than embedded in static HTML.
- Full Chromium suite with `FITSPACE_SUPABASE_E2E=1`: **35 tests passed**. All 30 earlier tests remain enabled. Five cloud journeys use real email codes from Mailpit and real APIs for guest import, save/refresh/relogin, HttpOnly/SameSite cookies, independent copies, rename/delete/thumbnails, two-tab conflict/export/reload, interrupted acknowledgements after a real commit, same-owner reauthentication without losing edits, cross-tab sign-out, furnished immutable read-only snapshots, keyboard pan/reset, revocation, other-owner/anonymous API isolation, wrong-code rejection, unrelated-origin rejection and 360px account/workspace/share controls.
- `pnpm test:guest-only` passed against an isolated production server with Supabase URL/key explicitly empty. Account availability, numeric guest editing/local saving without a GPU, and private API unavailability were verified. This establishes credential-free guest operation separately from the configured cloud suite.
- Fresh local `supabase db reset --yes` applied scene/project migrations; the cleanup migration then applied successfully through local `db push`. The real integration suite passed on that schema. Startup verifies actual container/Auth health and email-template access; an initial ignored CLI health check is not treated as backend success.

Visual artifacts in ignored `test-results/` include `cloud-projects.png`, `cloud-workspace.png`, `cloud-mobile.png` and `shared-snapshot.png`. Review confirmed distinct cloud/local save targets, reachable project/recovery/share controls, normal-sized plan cards, a furnished read-only viewer and responsive layouts. Keyboard focus can leave the normal skip link visible in screenshots. Targeted coverage is not a complete accessibility audit or physical touch-device validation.

Failures found and corrected:

- CLI 3.1 tried writing to a read-only home; use its supported task-scoped `SUPABASE_HOME`.
- Managed Docker proxies broke local health checks/internal template requests. Repair only this stack's Auth/Storage configuration, preserve proxy addresses/volumes, and verify actual service/API health afterward. Recreating Kong loses generated files, so the repair excludes it.
- Rootless CLI template copying gave Kong unreadable public HTML files. Fix only the public template directory/file modes, reload Auth as needed, and verify template access. No private key permissions were widened. Real code verification now passes.
- Next's internal `localhost` URL differed from the browser host. Origin validation now checks the actual Host/configured origin, and a negative unrelated-origin assertion remains enabled.
- Missing imports, a removed Vitest sequential helper, a test-scope insertion and ambiguous global Next route-announcer alerts were corrected during validation. Assertions remain enabled and correctly scoped to application controls.
- Review fixed explicit reload retaining an old conflict draft and same-account reauthentication discarding retained memory. Save-coordination tests also verify that in-flight edits are not falsely acknowledged. Owner-scoped recovery and real cross-tab renewal/sign-out tests cover the resulting behavior.

Hosted Supabase/SMTP, actual Vercel deployment, physical GPU/touch measurements, Safari/Firefox and complete production security/performance audits were not run. Cleanup for users who never return/deleted accounts needs a background operational worker before launch. No photo/AR/AI/retailer/billing functionality is claimed.

Final handoff: frozen installation, peer checks, typecheck, lint, formatting, production build, local health/migration startup, the no-cloud guest check (including mobile navigation), Markdown links and `git diff --check` passed. After the last cleanup-status change, all five cloud browser journeys passed again against the final build; cleanup reports count every remaining owned job after a bounded batch. Reusable startup instructions were saved as a draft; publication/fresh-task restoration remain unverified.

## Phase 6 actual results — 2026-11-15

The user authorized Phase 6. Local environment remains Node 24.22.1, pnpm 11.25.0, managed Linux Chromium and real local Supabase. No dependencies, manifest pins or lockfile entries changed.

| Check                                                                                                                 | Actual result                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build                                                                                                      | Passed on final sources without CSS parser warnings; four photo/AR browser checks passed again against this build                                                |
| Formatting, documentation links and Git diff hygiene                                                                  | Passed                                                                                                                                                           |
| Typecheck and ESLint                                                                                                  | Passed                                                                                                                                                           |
| `pnpm test`                                                                                                           | **99 passed across 13 files**: previous 82 plus calibration/provenance, file boundaries, all nine sample model bounds and two simulated XR lifecycle checks      |
| `pnpm supabase:start`                                                                                                 | Passed; applied new additive photo-estimate migration, existing data retained, actual local health verified                                                      |
| `pnpm test:integration`                                                                                               | **10 passed** against local Supabase; estimate persistence/share provenance and ownership verified; unsupported verification/furniture provenance still rejected |
| Full production `CI=true FITSPACE_SUPABASE_E2E=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e` | **40 passed, zero skipped**; previous 35 journeys plus four photo/AR journeys and one cloud calibration journey                                                  |
| Schema generation                                                                                                     | Generated JSON equals the new migration's embedded schema; generator refuses an existing SQL output path. Three original applied migrations remain unchanged     |
| Visual review                                                                                                         | Desktop and 360 px calibration screenshots inspected; marker labels, responsive photo stage, keyboard coordinate controls and scrollable dialog reviewed         |

New browser checks cover known-reference/marker edits, live estimates, explicit one-axis application, visible estimated provenance, undo/redo, local refresh recovery, transient photo removal on reload, corrupt/disguised/oversized/extreme-pixel file rejection preserving a valid photo, mobile layout, unavailable-AR fallback and simulated permission denial/retry. A real cloud user applies an estimate, saves/reloads it with provenance and returns to an independent guest room. No test counts a mock service as real backend success.

AR engineering tests verify nominal software model bounds/pivot for every sample, horizontal hit placement, rejection of wall/missing hits, rotation without scaling, reset and renderer/session cleanup on normal exit or initialization failure. **The XR APIs are simulated for these lifecycle tests. Physical-device AR, HTTPS deployment, hardware scale/tracking, platform permission UX, Safari/Firefox and phone performance have not been verified.** Phase 6's device acceptance gate remains open; see [PHOTO_AR.md](PHOTO_AR.md). No hosted Supabase/SMTP or later-phase functionality is claimed.
