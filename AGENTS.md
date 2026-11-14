# FitSpace agent instructions

Before changes, read `README.md`, `docs/PROJECT_VISION.md`, `docs/ARCHITECTURE.md`, `docs/PHASES.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, and `docs/TESTING.md`, then inspect relevant source files.

## Phase discipline

- Work only on the approved phase. Phases 0–2 are complete; Phase 3 requires explicit approval. See `docs/PROGRESS.md` for current evidence and limitations.
- Explain scope, files, dependencies, checks, and risks before implementation.
- Complete the phase in small tasks, run relevant checks, update progress/roadmap/decisions/testing, report results, and stop for explicit approval before the next phase.
- Never mark planned features or unrun checks as complete. Keep the app runnable once initialized.
- Use the existing checkout: cloud tasks are isolated. Do not create a Git worktree unless explicitly requested. Preserve existing user changes.

## Engineering constraints

- Strict TypeScript; clear feature boundaries; no giant components or duplicated spatial logic.
- Before dependency installation, consult official compatibility documentation and pin compatible stable versions using pnpm and a lockfile.
- Serializable, versioned scene data is independent of Three.js objects and React. Canonical units are meters; Y is up.
- Validate untrusted data at persistence, import, API, and AI boundaries. Reject nonfinite numbers and invalid dimensions. Track measurement provenance per dimension and disclose estimates.
- Never invent manufacturer specifications or promise guaranteed physical fit from simplified geometry.
- Guest workflows remain available without credentials. Keep secrets server-side; enforce ownership and RLS in cloud persistence.
- Use legally usable assets with recorded licenses; validate uploads before publication. Do not scrape commercial models.
- Support keyboard controls, reduced motion, responsive layouts, loading/error states, and WebGL failure fallbacks.
- Add meaningful tests for behavior, geometry, serialization, authorization, and important user journeys. Do not weaken assertions to pass.
- Before phase completion, run available type/lint/test/build checks; visually verify implemented UI and 3D when browser access permits. Record exact limitations.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
