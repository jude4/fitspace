# Decision log

D01–D16 are Phase 0 design decisions dated 2026-11-14. Later entries record implemented phase decisions; future capabilities remain specifications.

| ID  | Decision                                                                                         | Rationale and consequence                                                                                                |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| D01 | Begin with documentation only and require approval at every phase boundary.                      | Matches the build brief; no Phase 1 initialization yet.                                                                  |
| D02 | Useful MVP ends at Phase 5; complete requested launch scope ends at Phase 9.                     | Avoid confusing early editor readiness with commercial launch.                                                           |
| D03 | Use the requested Next.js/React/TypeScript/pnpm stack with stable WebGL/R3F.                     | Single application initially; exact compatibility and versions verified in Phase 1 before installation.                  |
| D04 | Canonical meters/radians, Y-up, interior-origin rectangular room, bottom-center product pivots.  | Keeps rendering, geometry, imports, and persistence consistent; convert units at UI boundaries.                          |
| D05 | Record provenance per dimension; unknown uncertainty never means zero.                           | Mixed measured/estimated data must not imply manufacturer verification or guaranteed fit.                                |
| D06 | Persist versioned plain scene documents and pin product/asset revisions and physical dimensions. | Supports migration, reload, history, and stable old layouts after catalog updates.                                       |
| D07 | Canonical cloud scene plus transactional normalized projections.                                 | Supports queryable relational ownership without competing mutable sources of scene truth.                                |
| D08 | Pure command/geometry domain, transient UI state separate from history.                          | Test behavior without a GPU; undo committed edits coherently.                                                            |
| D09 | Procedural original sample assets first; licensed optimized glTF later.                          | Avoid blocked progress, broken links, invented product specifications, and rights violations.                            |
| D10 | Guest/local workflow precedes Supabase.                                                          | First useful interactions require no signup or credentials; cloud persistence still requires real authorization testing. |
| D11 | Revocable read-only snapshot shares through a scoped server endpoint.                            | No anonymous general project access; private assets require explicit authorized sharing.                                 |
| D12 | Oriented bounds and clearance heuristics, not delivery guarantees.                               | Useful early conflict signals with stated geometric and measurement limits.                                              |
| D13 | Photo calibration and platform AR are distinct later experiences.                                | A single photo cannot supply exact geometry; supported-device validation is mandatory.                                   |
| D14 | AI proposes validated allowlisted commands; rules mode is labeled.                               | Preserves user control, undo, deterministic analysis, and secret isolation.                                              |
| D15 | Warm neutral architectural aesthetic, viewport-first responsive editing.                         | Incorporates user references without copying unlicensed imagery or faking functionality.                                 |
| D16 | Defer services, credential requirements, pricing, and billing until their phase.                 | Avoid unnecessary setup and misleading product promises.                                                                 |

Revisit decisions with evidence and record supersession; do not silently change the scene contract or phase scope. Initial performance budgets are targets, not measurements. Cloud hardware alone cannot validate real-device performance.

## Phase 1 — 2026-11-14

- **D17:** User explicitly authorized the next incomplete phase. Implement Phase 1 only; stop before the room builder. Future routes remain truthful upcoming-feature pages.
- **D18:** Pin React 19.3.1/Fiber 9.8.2/Drei 10.7.9/Three 0.187.0 with Next 16.4.6 after official-doc and peer checks. Use TypeScript 5.9.3 and pnpm 11.25.0. See dependency evidence for exact tooling and the direct ESLint 10 plugin configuration.
- **D19:** Build original procedural geometry and CSS concept illustrations without model downloads, reference-photo copying, or external fonts/HDR. This establishes the interactive foundation without claiming photorealistic or manufacturer-verified assets.
- **D20:** Opt-in camera animation, demand rendering at rest, reduced-motion enforcement, responsive framing, and software-renderer quality reduction balance interaction and resource use. Actual physical-device performance remains unverified.
- **D21:** Reset the existing camera and clean up context-loss subscriptions. Browser testing exposed a false failure when a reset recreated the canvas; the implementation and regression check now avoid that lifecycle error.
- **D22:** Keep shell server-rendered and defer Three.js to a client dynamic import. No credentials, backend services, persistence, room editor, or catalog are introduced ahead of their phase.

## Phase 2 — 2026-11-14

- **D23:** The user's next-phase request authorizes the rectangular room builder only. Keep catalog, placements, fit checks, and saving out of scope until their respective phases; update landing availability copy to reflect the working room editor.
- **D24:** Limit width/depth to 1–30 m and height to 1.8–6 m for bounded geometry and predictable input/camera behavior. Use clear interior dimensions; fixed 0.12 m structural thickness extends outward.
- **D25:** Start with sample presets and mark only manually edited axes as user-entered. Display conversion never mutates room dimensions; imperial input uses whole feet and decimal inches below 12. Do not round canonical values through the display representation.
- **D26:** Use validated immutable room-command results and a bounded 100-snapshot history. Creating another empty room is undoable. Keep presentation/camera preferences out of room history and preserve native undo in text inputs.
- **D27:** Select surfaces by raycasting or a keyboard-accessible hierarchy. Wall/ceiling finish is shared across those surfaces in this phase, explicitly labeled; floor finish is separate. Per-wall finish assignment is not claimed.
- **D28:** Use perspective sphere framing and orthographic overhead bounds at every supported size/aspect ratio. Reset existing camera objects instead of recreating WebGL. Mutate owned engine objects through refs, keeping React state immutable.
- **D29:** Reuse Phase 1 capability/error/context handling through shared components/hooks. A failed renderer can retry without discarding the room. Do not reload the page as the editor's recovery action because this phase has no persistence.
- **D30:** Generate lightweight original floor finish textures rather than add external assets/dependencies. Retain demand rendering and software-renderer quality reduction; hardware/cross-browser performance remains unverified.

## Vercel output repair

- **D31:** Override the mistaken static-site output configuration with root `vercel.json` (`framework: nextjs`, `outputDirectory: .next`). Keep the existing Next.js build and rendering model; prerendered routes do not require `output: export`. Verified Vercel's official Next.js builder uses `config.outputDirectory || '.next'`. This does not authorize unrelated Phase 9 implementation.
