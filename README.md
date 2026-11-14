# FitSpace

**See it. Place it. Know it fits.**

An interactive 3D interior-planning project, developed in explicitly approved phases. Phase 1 provides a responsive landing page and working procedural room demo. The measured room editor is Phase 2; furniture placement, fit analysis, accounts, and cloud saving follow later.

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
- `/workspace`, `/projects`, and `/business` clearly describe future functionality; they do not pretend to create, save, or sell anything.

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
