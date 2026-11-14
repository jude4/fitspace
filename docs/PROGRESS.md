# Progress

## Current phase

**Phase 4 — spatial fit analysis complete.** The user's next-phase request authorized Phase 4. Phase 5 (accounts and cloud projects) is next and requires explicit approval; it has not started.

## Completed

- Retained the working landing, measured rectangular-room editor, nine sample furniture concepts, placement/variants/snapping/history, local recovery, toolchain, and Vercel configuration.
- Added deterministic room-boundary/height, furniture/wall, and furniture/furniture findings using yaw-oriented physical rectangles and vertical intervals. Shared room geometry keeps rendered walls and analysis consistent; hidden walls still count. Touching/sub-millimeter contacts use an explicit 1 mm numeric tolerance.
- Added a configurable all-sides clearance guideline (0–3 m, default 0.8 m; zero disables), nominal minimum gaps, red/amber warning bounds, selected clearance envelopes, textual warning labels, clickable findings, and layout summaries. Findings derive from the current scene, including draft drags; they are never persisted as truth. Long reports count all findings and progressively display the most severe first.
- Added nullable clear doorway width/height inputs and six 90° dimension-orientation comparisons, including possible tipping and declared uncertainty. Results enumerate candidate axes/margins or missing/no-simple-candidate outcomes, and always exclude delivery approval. Doorway references do not create wall cutouts or routes. Added selected/other object dimension comparisons.
- Included applied spatial settings in unified history and version 2 local/import/export documents. Version 1 scenes migrate with defaults without moving/resizing furniture or changing revisions/provenance. Exact original local bytes are backed up before migration replacement and can be downloaded; backup failure preserves the original and unsaved edits. Explicit malformed-JSON replacement remains usable.
- Added responsive Analysis navigation, input validation, assumptions/provenance/unknown-uncertainty wording, and updated available-feature copy. Numeric analysis works independently of WebGL.
- No packages, credentials, remote models, real merchant specifications, accounts, cloud services, or later-phase features were introduced.

## Verification

- Strict typecheck, lint, 71 unit/component tests across 9 files, and the final production build passed. Formatting and documentation/diff verification results are recorded in [TESTING.md](TESTING.md).
- The final full 30-case Chromium suite passed, retaining all 24 earlier landing/room/furniture journeys plus six spatial journeys. A targeted analysis run also passed all 6 cases. These cover real warning/clearance canvas changes, progressive disclosure of crowded-layout findings, and desktop document-height containment; see [TESTING.md](TESTING.md).
- Tests cover Three.js-compatible rotations, disjoint/touching/contained/rotated rectangles, epsilon contacts, vertical separation, room height/bounds and wall intersections, configurable gaps, missing/nonfinite and estimated inputs, doorway limits/uncertainty, settings history, schema migration, exact backup download, backup-write failures, and explicit corrupt-data replacement.
- Desktop/mobile analysis screenshots were inspected; controls, clear error states, warning bounds, source/limit text, and panel navigation remain visible/reachable at 360/768/1440 px. Production and development verification are distinguished in [TESTING.md](TESTING.md).

## Known limitations

- All furniture remains illustrative original geometry with sample dimensions, not photorealistic captures, licensed retailer products, verified manufacturer specifications, prices, or purchase links.
- Analysis uses nominal rectangular envelopes, not exact mesh surfaces or measurement-error bounds. Results can overestimate mesh intersections. Unknown uncertainty is not zero; no finding guarantees physical fit, a continuous walking route, building-code compliance, or accessibility.
- Doorway checks use a clear dimension reference only, not located openings. Packaging, handling space, approach/turns, stairs, elevators, door swing, disassembly, and continuous tipping/diagonal paths are not evaluated. A candidate does not prove delivery; no simple candidate does not rule out other methods.
- Rectangular rooms remain width/depth 1–30 m and height 1.8–6 m. Up to 100 placements, Y=0 and X/Z within ±100 m; only declared shelf/desk width ranges can resize. Warnings do not prevent edits or automatically resolve conflicts.
- Local saving holds one scene per browser origin. Storage may be cleared, denied, or full; export portable backups. Original migration backup consumes additional local storage and retains the first pre-upgrade copy. Corrupt/future files remain untouched until explicit replacement. Cross-tab detection is not transactional collaboration.
- Apply draft form edits before changing selection/units. Camera, history, selection, visibility, snapping, warning/clearance display toggles, and drag drafts remain transient; committed room/furniture/spatial settings and display units persist.
- Cloud/auth/sharing, photo assistance, AR, AI, retailer models/imports, billing, and production hardening remain later phases. Physical-device GPU FPS/touch feel, Safari/Firefox, and actual Vercel redeployment remain unverified; earlier landing performance measurements are not furniture-workspace benchmarks.

## Next recommended task

After approval, implement **Phase 5 only**: accounts and owned cloud projects, explicit guest import, durable/conflict-aware cloud saving, project operations, thumbnails/storage, immutable snapshots and revocable/expiring read-only sharing, migrations and RLS. Preserve the credential-free guest workflow and existing schema migration/recovery. Real Supabase configuration and two-user/anonymous integration validation are required for that phase's gate; do not claim cloud functionality from mocks alone.

## Reusable cloud configuration

The existing frozen install remains applicable. Startup instructions are updated for Phase 4, schema 2/migration backups, nominal spatial limits, and current checks. Draft persistence is confirmed; publication and restoration in a fresh task remain unverified. Review/save in environment settings, then publish to reuse the prepared environment.

## Vercel configuration repair retained

Root `vercel.json` selects the native `nextjs` framework and `.next` output. README documents removing an incorrect `dist` override in Vercel settings. Local production builds pass; actual Vercel redeployment remains unverified here. This scoped repair does not implement Phase 9.
