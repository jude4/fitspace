# FitSpace

**See it. Place it. Know it fits.**

An interactive 3D interior-planning project, developed in explicitly approved phases. Phases 1–4 provide a responsive landing, measured rectangular rooms, a sample furniture catalog, interactive placement, nominal spatial analysis, and versioned local saving. Accounts, cloud projects, and commercial integrations follow later.

## Run locally

Use Node **24.22.1** (`.node-version`) and pnpm **11.25.0** (`packageManager`). In the existing checkout:

```bash
cd /workspace/fitspace
# These writable locations are useful in the managed cloud environment.
export XDG_DATA_HOME=/workspace/.local/share
export XDG_CACHE_HOME=/workspace/.cache
export XDG_STATE_HOME=/workspace/.local/state
pnpm install --frozen-lockfile
pnpm dev
```

pnpm's store/cache/state use sibling directories configured in `.npmrc`; no secrets or external services are needed. Normal local machines may use their standard XDG locations. Cloud tasks are already isolated: use the existing checkout rather than creating a worktree unless requested.

`pnpm build` produces the production bundle; `pnpm start` serves it. Stop your development server before running the production browser suite on the default port, or choose a separate dev port with `pnpm dev --port 3001`.

## Working functionality

- Responsive landing with a live sample living room, concept collection, feature/process sections, and professional vision.
- Three palettes change actual room materials; Before/After removes and restores demo furniture.
- Drag to orbit, wheel/pinch to zoom, front view, camera reset, and optional slow camera motion. Motion pauses offscreen and is disabled by reduced-motion preference.
- Lazy-loaded WebGL renderer, loading/error states, unavailable-WebGL and context-loss fallbacks, capped resolution, and automatic lower rendering quality for detected software renderers or low-core devices.
- `/workspace` creates a rectangular room from sample templates or your interior measurements. Add, drag, rotate, inspect, and arrange original sample furniture; recover the scene after refresh using local device storage.
- `/projects` and `/business` still describe future functionality; accounts and commercial integrations are not available.

## Room builder and furniture editor (Phases 2–4)

Choose **Start Designing** or open `/workspace`. Select a sample template and create an empty room, or edit the current room dimensions and apply them. Width/depth support **1–30 m** and height **1.8–6 m**. Geometry uses meters internally, with 0.12 m structural thickness extending outside the measured interior. Template measurements are labeled samples; only edited axes become user-entered, never independently verified.

Use **m** or **ft / in** to change display. Imperial entry uses whole feet plus decimal inches in [0, 12). Unedited axes retain their original precision; apply pending edits before switching units. Change wall/ceiling color and oak/walnut/stone/concrete sample floor finishes. Select a surface directly in 3D or through the scene list; eye controls hide or show each wall, floor, or ceiling. Two walls and the ceiling start hidden for a cutaway view.

Switch perspective/overhead views, drag to orbit, right-drag to pan, and scroll/pinch to zoom. Equivalent camera buttons support keyboard users. Frame/reset fits the supported room size and viewport aspect ratio. Measurement labels and a 0.5 m grid can be toggled. Undo/redo buttons and Ctrl/⌘ Z, Ctrl/⌘ Shift Z (or Ctrl Y) restore committed room edits; text inputs retain their native editing shortcuts. Camera, unit, selection, and visibility changes do not enter history.

On small screens, use **Room & scene**, **Properties**, and **Analysis** to switch panels. Numeric editing remains available without WebGL. A graphics retry preserves the current scene. Valid scenes save automatically on this device; cloud saving is not available.

## Sample furniture and local saving

Use **Browse furniture** to reach the catalog. Search and combine category/material filters across nine original sample concepts: sofa, chair, table, bed, cabinet, shelf, desk, lamp, and refrigerator volume. Open a card for an orbitable 3D preview and details, then **Add … to room**, or drag the card onto the viewport. These are FitSpace concepts with **sample dimensions**, not retailer listings, verified specifications, prices, or purchase links.

Select furniture in 3D or the placed-object list. Drag it across the floor, or edit exact X/Z coordinates and yaw in the inspector. Metric entries use meters; imperial furniture coordinate/resize entries use explicitly labeled **decimal feet**, while read-only dimensions use feet/inches. Apply pending edits before changing selection or units. Fixed products cannot resize; the sample shelf/desk permit width changes only within their displayed ranges. Change material variants, duplicate, delete, and undo/redo. One drag is one history step. Selected bounds/dimensions are contextual; select a room surface to see room measurement labels again.

Optional drag snapping uses a 0.1 m grid and a 0.2 m near-wall threshold; explicit wall alignment uses the rotated physical envelope. Positions are limited to ±100 m and Y=0; scenes support at most 100 objects. Objects may overlap or extend beyond the room: **snapping and bounds are positioning aids, not fit checks**. Open **Layout analysis** (or the **Analysis** tab on smaller screens) to review nominal collision/clearance findings.

The header reports **Saving**, **Saved on this device**, or **Not saved locally**. Saving is debounced, so wait for acknowledgement before closing. The local format pins product/asset revisions and dimensions. Export a JSON backup; import validates the file before replacing the design and can be undone. Schema versions 1 and 2, supported sample asset revisions, and files ≤1 MiB are accepted; exports use version 2, including spatial settings. Version 1 scenes migrate with a default 0.8 m guideline and unknown doorway dimensions. Before rewriting a version 1 local scene, the exact original is backed up and can be downloaded with **Download pre-upgrade backup**. If that backup fails, saving stops and preserves the original. Imported sample/user-entered provenance never becomes manufacturer verification.

Corrupt, future-version, or incompatible saved data is preserved until you explicitly replace it. Recovery controls let you download the saved data, export the in-memory scene, retry/reload, or replace the stored copy. Quota/permission errors retain edits in memory and do not claim success. Another-tab changes pause autosaving until resolved; this is basic conflict detection, not collaborative locking. Browser storage can be cleared or unavailable; exported backups are the portable recovery path. Cloud/account saving remains Phase 5.

## Spatial analysis (Phase 4)

**Layout analysis** reports room-boundary/height violations, potential furniture/wall and furniture/furniture overlap, and limited clearance. Findings update with dimensions, transforms, room changes, and live drag previews. Click a finding to select its object. Red/amber bounds show conflicts/guidelines, with text in the analysis panel and on selected objects; these display aids can be toggled.

Set the all-sides clearance guideline to **0–3 m** (default **0.8 m**, 0 disables it). Show the selected expanded envelope to inspect spacing. This uses nominal yaw-oriented rectangles and vertical intervals, not exact meshes or a continuous walking route. Contacts/penetrations ≤1 mm are treated as touching; this numeric tolerance is not measurement accuracy. Hidden walls still participate. Samples, estimates, user-entered values, and unknown uncertainty remain explicit; no result guarantees physical fit or accessibility compliance.

Enter clear doorway width **0.2–5 m** and height **0.5–4 m**, or leave either blank for unknown. Metric inputs use meters; imperial spatial inputs explicitly use decimal feet. The dimension-only check considers six 90° axis orientations, including tipping, and accounts for declared uncertainty. A candidate is not delivery approval; a missing candidate does not rule out diagonal motion or disassembly. Packaging, approach/turns, stairs, elevators, door swing, handling space, and continuous tipping paths are excluded. The doorway is a dimension reference, not a located wall opening or a route.

Compare selected/other object width, depth, and height in the comparison table. The summary counts every finding; long reports initially display the 60 most severe entries, with **Show more findings** for the remainder. Applied spatial settings participate in undo/redo, JSON import/export, and local saving. Warning visibility and clearance-outline toggles remain transient.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
# Use an installed compatible Playwright browser, or the environment's Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e
# With the production server running, record a 30-second lab rendering sample:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm measure:demo
```

For a standard local setup, install Playwright Chromium with `pnpm exec playwright install chromium` and omit the executable override. System Chromium is tested in the managed cloud machine; other browsers and physical devices are not yet validated. See [actual results and limitations](docs/TESTING.md).

## Deploy to Vercel

Deploy this repository using the **Next.js** framework preset. The root directory must be the repository directory containing `package.json` and `vercel.json` (the repository root, not `/workspace/fitspace` as an absolute path).

The repository’s `vercel.json` selects the native Next.js builder and `.next` output. In Vercel **Project Settings → Build and Deployment**, select **Next.js** and remove the custom Output Directory override `dist` (leave framework defaults). The build command is `pnpm build`; use the existing pnpm lockfile for installation. Redeploy the commit containing this configuration.

The `○ (Static) prerendered as static content` build summary is normal: it describes how Next.js rendered routes, not a standalone static export. This app does not configure `output: 'export'`, so it does not produce `dist` or `out`. Do not rename build folders or change the app to static export to resolve `STATIC_BUILD_NO_OUT_DIR`.

## Documentation

- [Agent instructions](AGENTS.md)
- [Product vision](docs/PROJECT_VISION.md)
- [Architecture, database, and scene model](docs/ARCHITECTURE.md)
- [Roadmap and acceptance gates](docs/PHASES.md)
- [Progress and next task](docs/PROGRESS.md)
- [Decisions](docs/DECISIONS.md)
- [Dependency compatibility evidence](docs/DEPENDENCIES.md)
- [Asset provenance](docs/ASSETS.md) and [third-party notices](THIRD_PARTY_NOTICES.md)

Meters are the canonical geometry unit. Demo furniture and dimensions are samples, not verified retailer products. Simplified checks do not guarantee physical fit or delivery. No supplied reference photos are redistributed. Supabase, AI, AR, and Stripe configuration is deferred to the relevant phase; never store secrets in Git or chat.
