# Progress

## Current phase

**Phase 3 — catalog and furniture placement complete.** The user's next-phase request authorized Phase 3. Phase 4 (spatial fit analysis) is next and requires explicit approval; it has not started.

## Completed

- Retained the working landing/demo, measured rectangular-room editor, existing toolchain, Vercel configuration, and verification infrastructure.
- Added nine original sample concepts covering sofas, chairs, tables, beds, cabinets, shelves, desks, lamps, and appliances. Every item has complete labeled sample dimensions, revision-pinned procedural assets, variants, searchable/filterable details, illustrative thumbnails, and an interactive 3D preview.
- Added catalog-to-room dropping, Add buttons, raycast/hierarchy selection, floor dragging, exact X/Z coordinates, yaw rotation, restricted adjustable-width concepts, material variants, duplicate/delete, contextual dimension labels/bounds, optional grid/near-wall snapping, and explicit rotated wall alignment.
- Extended history to immutable room-plus-placement snapshots. A drag previews transiently and commits one undo step; cancellation drops the draft. Recreating an empty room clears its furniture atomically and is reversible.
- Added validated schema-1 local persistence after hydration, clear pending/saved/error status, debounced writes, exact revision/dimension round trips, JSON export/import, and preservation/recovery of corrupt or incompatible data. Quota failures retain edits in memory; common other-tab changes pause overwrites.
- Added accessible numeric controls, native preview dialogs/focus restoration, keyboard Add/selection alternatives, graphics fallback/retry, visible catalog shortcuts, and responsive inspector/catalog layouts. Removed obsolete future-feature copy for available placement functionality.
- No new packages, credentials, remote models, commercial product specifications, cloud services, or Phase 4 fit logic were introduced.

## Verification

- Typecheck, lint, formatting, production build, unit/component tests, Chromium browser checks, and documentation/diff checks passed; details are in [TESTING.md](TESTING.md).
- **52 unit/component tests across 8 files** cover the retained room workflow plus catalog coverage/geometry envelopes, transforms and resize restrictions, rotated snapping, unified history, exact scene serialization, revision/provenance validation, hydration, quota errors, and preservation of incompatible data.
- **24 browser tests** cover the full landing/room/furniture workflow, all nine assets, real pointer dragging with one undo step, catalog floor drop, exact transforms/variants, restricted resize, save/reload, import/export, invalid/future data recovery, quota backup, and other-tab conflict handling. The 9 furniture cases were rerun after final preview recovery checks.
- Desktop/mobile workspace and product-preview screenshots were visually inspected; preview framing, contextual labels, catalog discoverability, and desktop scroll containment were refined.
- Development `/workspace` serves the catalog and export controls. No actual Vercel deployment or physical-device performance test is claimed.

## Known limitations

- Sample furniture is illustrative original geometry, not photorealistic captures, licensed retailer products, verified manufacturer dimensions, operational appliance specifications, prices, or purchase links.
- Rectangular rooms remain width/depth 1–30 m and height 1.8–6 m. Furniture positions are floor-based (Y=0), bounded to ±100 m; up to 100 placements per scene. Only declared shelf/desk width ranges can resize. Geometry and snapping do not detect collisions or guarantee fit.
- Local saving holds one scene per browser origin. Browser storage can be cleared, denied, or full; export portable backups. Corrupt/future files remain untouched until explicit replacement. Cross-tab detection is not transactional locking or collaboration.
- Apply draft form edits before changing selection/units. Camera, history, selection, visibility, snapping preferences, and draft drag state are not persisted; committed scene data and display units are.
- Cloud projects/auth/sharing, photo assistance, AR, AI, retailer models/imports, billing, and production hardening remain later phases. Current asset IDs are procedural; no remote GLB loading or user model uploads are claimed.
- Physical-device GPU FPS, Safari/Firefox, and actual mobile touch feel remain unverified. Earlier landing performance measurements are not benchmarks of this larger furniture workspace.

## Next recommended task

After approval, implement **Phase 4 only**: deterministic furniture/wall/furniture overlap and room-boundary findings, conservative clearance envelopes/guidelines, doorway inputs and limited dimension comparisons, visual warnings and layout summaries, with missing-data/provenance-aware wording and geometry edge-case tests. Reuse current placements, normalized asset bounds, transforms, selection/history, and persistence; version saved data explicitly if required fields change. Do not turn simplified checks into delivery/accessibility guarantees.

## Reusable cloud configuration

The existing frozen install remains applicable. Startup instructions are updated for Phase 3, local hydration/recovery, the working catalog/placement workflow, and current checks. Draft persistence is confirmed; publication and restoration in a fresh task remain unverified. Review/save in environment settings, then publish to reuse the prepared environment.

## Vercel configuration repair retained

Root `vercel.json` selects the native `nextjs` framework and `.next` output. README documents removing an incorrect `dist` override in Vercel settings. Local production builds pass; actual Vercel redeployment remains unverified here. This scoped repair does not implement Phase 9.
