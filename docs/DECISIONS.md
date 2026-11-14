# Decision log

All entries below are Phase 0 design decisions dated 2026-11-14; they do not assert implementation.

| ID | Decision | Rationale and consequence |
| --- | --- | --- |
| D01 | Begin with documentation only and require approval at every phase boundary. | Matches the build brief; no Phase 1 initialization yet. |
| D02 | Useful MVP ends at Phase 5; complete requested launch scope ends at Phase 9. | Avoid confusing early editor readiness with commercial launch. |
| D03 | Use the requested Next.js/React/TypeScript/pnpm stack with stable WebGL/R3F. | Single application initially; exact compatibility and versions verified in Phase 1 before installation. |
| D04 | Canonical meters/radians, Y-up, interior-origin rectangular room, bottom-center product pivots. | Keeps rendering, geometry, imports, and persistence consistent; convert units at UI boundaries. |
| D05 | Record provenance per dimension; unknown uncertainty never means zero. | Mixed measured/estimated data must not imply manufacturer verification or guaranteed fit. |
| D06 | Persist versioned plain scene documents and pin product/asset revisions and physical dimensions. | Supports migration, reload, history, and stable old layouts after catalog updates. |
| D07 | Canonical cloud scene plus transactional normalized projections. | Supports queryable relational ownership without competing mutable sources of scene truth. |
| D08 | Pure command/geometry domain, transient UI state separate from history. | Test behavior without a GPU; undo committed edits coherently. |
| D09 | Procedural original sample assets first; licensed optimized glTF later. | Avoid blocked progress, broken links, invented product specifications, and rights violations. |
| D10 | Guest/local workflow precedes Supabase. | First useful interactions require no signup or credentials; cloud persistence still requires real authorization testing. |
| D11 | Revocable read-only snapshot shares through a scoped server endpoint. | No anonymous general project access; private assets require explicit authorized sharing. |
| D12 | Oriented bounds and clearance heuristics, not delivery guarantees. | Useful early conflict signals with stated geometric and measurement limits. |
| D13 | Photo calibration and platform AR are distinct later experiences. | A single photo cannot supply exact geometry; supported-device validation is mandatory. |
| D14 | AI proposes validated allowlisted commands; rules mode is labeled. | Preserves user control, undo, deterministic analysis, and secret isolation. |
| D15 | Warm neutral architectural aesthetic, viewport-first responsive editing. | Incorporates user references without copying unlicensed imagery or faking functionality. |
| D16 | Defer services, credential requirements, pricing, and billing until their phase. | Avoid unnecessary setup and misleading product promises. |

Revisit decisions with evidence and record supersession; do not silently change the scene contract or phase scope. Initial performance budgets are targets, not measurements. Cloud hardware alone cannot validate real-device performance.
