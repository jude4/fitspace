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
