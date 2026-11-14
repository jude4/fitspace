# Testing and verification

## Phase 0 actual results — 2026-11-14

- Repository inspected: empty README only at initial HEAD; no app or existing test runner.
- Onboarding checks passed: `git ls-remote origin refs/heads/main` matched local HEAD; `git fsck --full` succeeded; initial working tree clean.
- Documentation verification: all eight required Markdown files present and nonempty; local Markdown links resolve; all ten phase sections and acceptance gates present; `git diff --check` passed.
- Manual specification review: consistent meters/radians and coordinate conventions, measurement provenance, immutable product references, canonical scene/projection relationship, ownership boundaries, and sequential phase approval requirements.
- Application typecheck, lint, unit/component/E2E tests, production build, browser review, and 3D rendering checks **not run**: application and tooling are not initialized. No zero-test run is counted as success.

## Planned tooling (Phase 1, not available commands yet)

Configure pnpm scripts for development, build, typecheck, lint, formatting checks, Vitest unit/component runs, and Playwright E2E. Commit a lockfile and use frozen installation. Record exact commands, versions, exit statuses, executed test counts, and skips when implemented. Keep check outcomes distinct from target specifications.

## Coverage by boundary

| Area | Meaningful checks |
| --- | --- |
| Units/schema | metric/imperial round trips, finite/positive values, uncertainty/provenance, supported versions, corrupt/oversized imports |
| Geometry | room bounds, normalized model scale/pivot, rotated intersections, touching tolerance, vertical separation, doorway missing data, clearance assumptions |
| Commands/history | deterministic edits, one drag per undo, redo invalidation, duplicate IDs, rejected fixed-item scaling |
| UI | accessible names, keyboard/numeric alternatives, error/loading/fallback states, responsive panels, reduced motion |
| Persistence | local reload, quota/corruption, revision pinning, guest import retry, cloud conflicts and failed autosave |
| Authorization | two owners and anonymous sessions, every exposed table and storage path, share scope/revoke/expiry, merchant roles |
| Assets | valid GLB fixture, failed model request, units mismatch, oversized/unsafe files, external references, deletion dependencies |
| AI/billing | invalid tool proposals, confirmation/undo, webhook signature/replay, server entitlements; real configured integrations distinct from fixtures |

## Runtime and visual verification

Test landing → workspace → room editing → catalog/placement → warnings → save/reload → read-only share as phases enable them. Assert actual expected scene changes, not only an open port or canvas element. Use known geometry bounds to verify scale and a visual browser check to confirm nonblank rendering. Record browser console errors and fix introduced failures.

Check 360/768/1440 px layouts, touch and keyboard inputs, reduced motion, slow/failed asset loading, unavailable WebGL, and context loss. Software-rendered CI is useful for correctness, not proof of physical GPU performance. Record browser/device/OS/hardware, network throttle, asset transfer size, LCP, and frame-time methodology against architecture budgets. AR requires actual supported-device HTTPS tests and remains unverified without them.

## Release discipline

Run relevant checks each phase, not unrelated later integration suites. Preserve runner exit status when capturing output. For docs-only changes use link/completeness/diff checks rather than synthetic app tests. In later phases, run type/lint/test/build and representative functional tests; explain unavailable credentials or device coverage and do not claim the blocked capability works. Security, legal review, backup restoration, monitoring, and production deployment gates remain open until independently evidenced in Phase 9.
