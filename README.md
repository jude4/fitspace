# FitSpace

**See it. Place it. Know it fits.**

FitSpace is a planned 3D interior planning application for exploring furniture layouts with explicit measurement sources and understandable spatial warnings.

## Current state

Phase 0 (planning and architecture) is complete. This repository contains documentation only: no application, installed project dependencies, database migrations, or running demo. Phase 1 requires explicit approval before implementation.

## Project documentation

- [Agent instructions](AGENTS.md)
- [Product vision and user journeys](docs/PROJECT_VISION.md)
- [Architecture, database, and scene model](docs/ARCHITECTURE.md)
- [Roadmap and acceptance gates](docs/PHASES.md)
- [Progress and next task](docs/PROGRESS.md)
- [Decisions](docs/DECISIONS.md)
- [Testing strategy and actual results](docs/TESTING.md)

## Development

Use the existing `/workspace/fitspace` checkout. Each cloud task is already isolated; do not create a worktree unless requested. No installation or startup command exists yet. Node 24.22.1 and npm 11.9.0 were observed in the onboarding environment; these are observations, not project version pins.

Phase 1 will verify current official compatibility guidance, select and pin supported versions of Node, pnpm, Next.js, React, React Three Fiber, Drei, and Three.js, and add a frozen lockfile and reproducible commands. Do not treat proposed checks as already available scripts.

No credentials are needed for planning or the intended guest demo. Supabase, AI, and Stripe configuration belongs to their respective later phases. Never put secret values in Git or chat.

## Accuracy and assets

Meters are canonical; metric and imperial display are planned. Demo furniture uses explicitly labeled sample dimensions. Simplified checks cannot guarantee fit, delivery, or accessibility compliance. Use only licensed assets and retain attribution.
