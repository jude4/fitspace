# FitSpace

**See it. Place it. Know it fits.**

An interactive 3D interior-planning project, developed in explicitly approved phases. Phases 1–2 provide a responsive landing page, procedural room demo, and a working measured rectangular-room editor. Furniture placement, fit analysis, accounts, and saving follow later.

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
- `/workspace` creates an empty rectangular room from sample templates or your own interior measurements. Edit dimensions, materials, visibility, and camera views with undo/redo.
- `/projects` and `/business` still describe future functionality; accounts and commercial integrations are not available.

## Room builder (Phase 2)

Choose **Start Designing** or open `/workspace`. Select a sample template and create an empty room, or edit the current room dimensions and apply them. Width/depth support **1–30 m** and height **1.8–6 m**. Geometry uses meters internally, with 0.12 m structural thickness extending outside the measured interior. Template measurements are labeled samples; only edited axes become user-entered, never independently verified.

Use **m** or **ft / in** to change display. Imperial entry uses whole feet plus decimal inches in [0, 12). Unedited axes retain their original precision; apply pending edits before switching units. Change wall/ceiling color and oak/walnut/stone/concrete sample floor finishes. Select a surface directly in 3D or through the scene list; eye controls hide or show each wall, floor, or ceiling. Two walls and the ceiling start hidden for a cutaway view.

Switch perspective/overhead views, drag to orbit, right-drag to pan, and scroll/pinch to zoom. Equivalent camera buttons support keyboard users. Frame/reset fits the supported room size and viewport aspect ratio. Measurement labels and a 0.5 m grid can be toggled. Undo/redo buttons and Ctrl/⌘ Z, Ctrl/⌘ Shift Z (or Ctrl Y) restore committed room edits; text inputs retain their native editing shortcuts. Camera, unit, selection, and visibility changes do not enter history.

On small screens, use **Room & scene** and **Properties** to switch panels. Numeric editing remains available without WebGL. A graphics retry preserves the current room, but **refresh resets it**: this phase has no local/cloud saving. There is no furniture catalog or fit analysis yet.

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

Meters are the canonical geometry unit. Demo furniture and dimensions are samples, not verified retailer products. Simplified checks in future phases will not guarantee physical fit or delivery. No supplied reference photos are redistributed. Supabase, AI, AR, and Stripe configuration is deferred to the relevant phase; never store secrets in Git or chat.
