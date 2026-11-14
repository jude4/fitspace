# Architecture

Status: architecture baseline from Phase 0. Phases 1–2 implement the Next.js shell, shared UI, demo, measured rectangular-room domain commands, and workspace. Database, furniture placements, persistence, and integrations below remain future specifications. Exact installed versions and compatibility evidence are in [DEPENDENCIES.md](DEPENDENCIES.md).

## Stack and boundaries

Use Next.js App Router, React, strict TypeScript, Tailwind, shadcn/ui, Lucide, Zustand, Three.js, stable React Three Fiber and compatible Drei. Phase 1 verified official guidance and pinned compatible renderer/framework versions; review compatibility again before upgrades. Use WebGL first. Supabase PostgreSQL/Auth/Storage begins in Phase 5; no microservices are needed initially. FastAPI/background workers are introduced only if measured processing workloads justify them. AI and Stripe remain server-only integrations in later phases.

Server-render the landing shell and ordinary navigation. Load the renderer lazily in a client boundary; handle loading, unsupported WebGL, context loss, and asset failures without removing ordinary page navigation. Keep domain calculations pure, independent of browser/GPU state.

Data flow: validated input → domain command → scene store/history → renderer and inspector. Persistence serializes scene data, never Three.js instances. Fit analysis consumes the same scene and dimensions as rendering. UI preferences, loading state, selection, camera motion, and pointer movement are transient; only committed scene edits enter history. One drag is one undo entry. Derived warnings are recomputed, not persisted as truth.

## Proposed structure

```text
src/
  app/                     # routes, layouts, boundaries, server APIs
    workspace/[projectId]/ # later cloud route; guest /workspace remains
    projects/              # Phase 5
  components/ui/           # shared accessible primitives
  features/
    landing/
    editor/                # panels, commands, Zustand state and history
    rooms/
    catalog/
    spatial/               # pure geometry and confidence reporting
    projects/              # persistence adapters and autosave
    auth/
    assets/
    assistant/             # Phase 7
    retailers/             # Phase 8
    billing/               # Phase 9
  scene/                   # R3F adapters, materials, lighting, controls
  domain/                  # schemas, units, scene versions, commands
  lib/                     # environment validation, service clients
public/demo/               # licensed optimized assets and attribution
supabase/migrations/       # Phase 5 onward
tests/                     # unit, component, E2E fixtures and suites
```

Tests live at root `tests/unit`, `tests/component`, and `tests/e2e`, with fixtures for scenes and assets. Feature tests may be colocated when that improves clarity. Avoid adding empty feature scaffolding before needed.

## Canonical geometry and measurements

- Right-handed coordinates: X = room width, Y = up/height, Z = room depth. Floor is Y=0. Interior room footprint spans X=[0,width], Z=[0,depth]. Room dimensions are clear interior dimensions.
- Units are meters and radians internally. Interface uses metric or imperial conversion; parse feet/inches explicitly. Round display only, never repeatedly round stored data.
- Assets normalize to meters with bottom-center pivot and documented forward axis +Z. Retain source unit, scale factor, pivot offset, and calibration evidence. Room origin and product pivot conventions must match import, rendering, bounds, and persistence.
- Furniture placement uses bottom-center position. MVP allows yaw around Y and vertical translation only where supported; pitch/roll are later extensions. Floor objects use Y=0.
- Bounds come from the authoritative physical dimensions in the product/placement record, not arbitrary decorative mesh extents. Distinguish visual mesh bounds from physical bounds. A model/metadata mismatch blocks verified-dimension claims until reviewed.
- Tolerances: begin with 0.001 m numeric intersection tolerance; keep clearance guidelines independently configurable. Test boundary-touching, numerical precision, rotated objects, and missing data. Tolerance is not measurement accuracy.

### Serializable scene contract (version 1 design)

```ts
type Vec3 = { x: number; y: number; z: number };
type Dimension = {
  meters: number;
  source:
    | 'user_entered'
    | 'manufacturer_verified'
    | 'model_inferred'
    | 'image_estimated'
    | 'sample';
  evidence?: { reference: string; recordedAt: string };
  uncertaintyMeters?: number;
};
type Dimensions = { width: Dimension; depth: Dimension; height: Dimension };
type Opening = {
  id: string;
  wall: 'north' | 'east' | 'south' | 'west';
  offsetMeters: number;
  width: Dimension;
  height: Dimension;
  sillMeters: number;
  kind: 'door' | 'window';
};
type Room = {
  id: string;
  dimensions: Dimensions;
  openings: Opening[];
  wallMaterialId: string;
  floorMaterialId: string;
};
type Placement = {
  id: string;
  roomId: string;
  productId: string;
  productRevision: number;
  assetRevisionId: string;
  dimensions: Dimensions;
  position: Vec3;
  rotationYRadians: number;
  materialVariantId: string;
};
type SceneDocument = {
  schemaVersion: 1;
  id: string;
  title: string;
  room: Room;
  placements: Placement[];
  displayUnits: 'metric' | 'imperial';
  walkingClearanceMeters: number;
};
```

A project initially contains one room; database relations permit future rooms without enabling multi-room UI. North is Z=0, south is Z=depth, west X=0, east X=width. Opening offsets run along positive X for north/south and positive Z for east/west. Validate openings against their wall spans and heights; door swing and traversability are not implied by an opening rectangle.

Unknown dimensions are absent in product metadata and block placement/analysis that requires them; do not substitute zero. Placeable sample objects must have all three positive dimensions and source `sample`. Manufacturer verification requires a reference, timestamp, and authorized verifier; a user-entered label is not verification. Uncertainty must be finite and nonnegative; absent uncertainty means unknown, not zero. Measurement provenance is per axis.

Products define adjustable axes and allowed ranges; placements copy resolved physical dimensions and pin product/asset revisions so catalog updates cannot silently resize saved layouts. Fixed products cannot be freely scaled. Bounds use the copied dimensions; renderer scaling is an adapter detail. Save/import validators enforce IDs, references, valid variants, ranges, unique placement IDs, finite numbers, supported schema version, and bounded collection sizes. Version migrations are explicit and tested; preserve original data before migration and reject unsupported future versions safely.

## Commands, persistence, and conflicts

Commands include set room dimensions, add/update/delete/duplicate placement, change material, and update clearance guideline. Validate commands before commit; changing room size recalculates warnings instead of silently moving furniture. Keep bounded undo history (initially 100 commands), redo clearing on a new edit. Camera and panel settings do not pollute history.

Phase 3 uses versioned local storage with debounced writes, quota/corruption handling, export/recovery strategy, and explicit local-save status. Phase 5 adds an authenticated persistence adapter. Cloud save includes an expected revision; update the scene document and derived room/placement rows atomically in one authorized transaction. On conflict, retain local edits and offer reload or save a copy; do not silently overwrite another session. Acknowledge saved status only after success. A guest import is explicit, owned, and idempotent to avoid duplicates after retries.

The versioned scene document is the canonical persisted layout. Normalized room and placement rows are transactional projections for querying; clients cannot independently mutate those projections. Products/assets are separately authoritative catalog records. Immutable scene versions pin the exact document and catalog/asset revisions used.

## Database entities and relationships (Phase 5+)

Use UUID primary keys, timestamps, foreign keys, validated JSONB, indexed ownership keys, and integer revisions. Units and provenance use the same schema as the scene contract.

| Entity              | Essential fields and relationships                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| profiles            | id → auth.users, display_name; no client-writable role escalation                                                                                                                               |
| projects            | id, owner_id → profiles, title, current_revision, current_scene JSONB, thumbnail_asset_id nullable, deleted_at                                                                                  |
| rooms               | id, project_id → projects, dimensions/provenance JSONB, openings JSONB, materials; initially one per project                                                                                    |
| products            | id, merchant_id nullable, current_revision, active status; stable catalog identity                                                                                                              |
| product_revisions   | product_id → products + revision composite primary key; immutable name, category, optional dimensions/provenance, adjustable_axes/ranges, variants, authentic external URL/price metadata later |
| assets              | id, owner_id nullable, merchant_id nullable, storage_path, immutable revision, type, license/attribution, source units/pivot/scale, validation status, byte count, hash                         |
| product_assets      | product_id + product_revision → product_revisions, asset_revision_id → assets, variant association                                                                                              |
| placements          | id, project_id → projects, room_id → rooms, product/revision → product_revisions, asset revision → assets, dimensions snapshot, transform, variant                                              |
| scene_versions      | id, project_id → projects, revision, schema_version, document JSONB, creator_id, created_at; unique project/revision                                                                            |
| sharing_permissions | id, project_id → projects, scene_version_id, token_hash unique, expires_at, revoked_at; read-only snapshot scope                                                                                |
| merchants           | id, name, verified external domain; Phase 8                                                                                                                                                     |
| merchant_members    | merchant_id + user_id, role; Phase 8                                                                                                                                                            |
| subscriptions       | account scope, provider IDs/status/plan, entitlement revision; Phase 9, server managed                                                                                                          |
| webhook_events      | provider event ID unique, processing status; Phase 9 replay protection                                                                                                                          |

Project-to-room-to-placement links must enforce same-project membership via composite constraints or the transaction function. Keep referenced catalog/asset revisions immutable; soft-delete catalog entries and retain pinned revisions. Project deletion removes private derived rows and versions, revokes shares, and schedules unreferenced asset cleanup; never remove an asset still referenced by another project. Auth-user deletion and retention require an explicit policy before launch.

### Authorization and sharing

Enable RLS on every exposed table. Owners alone access private projects, rooms, placements, versions, and uploaded assets; test two different users and anonymous sessions. Public catalog reads expose only approved entries. Merchant writes require membership and appropriate role; verification privileges are server controlled. Never ship Supabase service-role credentials to browsers. Use server auth verification and secure session handling for mutation APIs; do not trust posted user IDs.

Share tokens are high-entropy bearer credentials, stored hashed, revocable and optionally expiring. A server endpoint resolves a token to one sanitized immutable scene snapshot. Anonymous users do not receive general project-table reads. Share only approved public assets or explicitly authorized sanitized asset copies via short-lived access; no leakage of private object paths, owner emails, or unrelated files. Do not log share tokens. Revoke future access; previously downloaded content cannot be recalled.

## Rendering, assets, and performance

Procedural original demo furniture is the default until licensed optimized models are available. Track attribution and dimension source separately. Use glTF/GLB loading later with cached assets, per-asset progress/error fallbacks, and decoder versions compatible with the selected Three.js release. Start with packaged lighting so the guest demo does not require an external HDR host; add licensed HDR environments after measurement.

Use physically based materials, bounded soft shadows, limited dynamic lights, reusable geometry/materials, and instancing where useful. Dispose owned GPU resources on removal without disposing shared cached assets still in use. Lazy-load the canvas, respect reduced motion, stop idle continuous rendering when possible, cap device pixel ratio (initial range 1–1.5), and adapt quality on constrained devices. Keyboard/numeric edits must remain usable if WebGL is unavailable.

Initial budgets, to validate rather than assume: landing initial compressed JS excluding deferred 3D ≤250 KiB; demo asset transfers ≤5 MiB; ≤200k visible triangles; median ≥30 FPS during a 30-second orbit on a recorded integrated-GPU reference device. Aim for LCP ≤2.5 s under a recorded mobile throttling profile. Record hardware/browser/network and adjust scope explicitly if budgets fail; CPU-only cloud rendering is not proof of consumer GPU performance.

## Spatial intelligence (Phase 4)

Use floor-plane oriented rectangles for yawed furniture, with vertical intervals for 3D overlap. Room checks use interior bounds. Clearance uses configured guideline envelopes and explicitly reports the heuristic; it is not a navigation/pathfinding or accessibility certification. Door checks compare entered clear opening dimensions and limited candidate orientations to known furniture dimensions. They cannot validate delivery through stairs, turns, elevators, packaging, assembly steps, or irregular shapes.

Return structured findings with code, severity, object IDs, assumptions, measurement provenance, missing inputs, and optional distance. UI wording: within entered boundary, potential overlap, limited clearance, additional measurements required, or cannot determine. Unknown inputs do not produce a passing fit claim.

## Later integration boundaries

Photo assistance retains a visual reference and manual calibration, labeled approximate. AR uses feature-detected WebXR/platform viewers with validated scale and HTTPS; actual device validation is required. AI produces a schema-validated allowlisted command proposal, never executable code, with preview/confirmation for destructive changes, undo, and deterministic re-analysis. Rules-based mode is explicitly labeled when no API is configured.

Uploads use allowlisted formats, size/geometry/texture limits, quarantine, authorized paths, server validation, and rejection of unsafe external references. Expensive decoding belongs in a constrained worker when needed. Embeds restrict allowed origins and validate postMessage origins. Outbound product URLs must be validated HTTPS links. Billing uses verified, idempotent webhooks and server-side entitlements; Stripe test mode precedes live configuration. Rate limiting, monitoring, privacy/legal review, backup restoration, and incident response are Phase 9 launch gates.

## Phase 1 implementation notes

`src/domain/demo.ts` holds plain sample palette, room, and camera definitions. `src/features/landing/demo-store.ts` owns demo-only UI state; this is not the future persistent scene/history store. `RoomPreview` checks browser capabilities, lazy-loads the client-only renderer, and retains accessible controls and status. `RoomGeometry` builds original procedural furniture and architecture; no external models or textures are fetched. These concept materials are simple PBR colors, not photographic reproductions.

Demand rendering is the default. Camera motion is opt-in, slow, offscreen-paused, and disabled for reduced motion. Camera reset updates the existing camera rather than recreating the GPU context. A context-loss listener is registered with cleanup. Responsive camera distance adjusts with canvas aspect ratio.

Thin structural shapes use simple boxes; upholstered shapes use modest rounded geometry. WebGL renderer detection uses the optional debug extension where available; detected software renderers and devices reporting ≤4 logical cores receive 0.75 DPR and disabled dynamic shadows. Otherwise DPR is capped at 1.5 and bounded 1024px directional shadows are enabled. Detection is a heuristic; it does not establish universal performance. Reference-device profiling remains required.

## Phase 2 implementation notes

- `src/domain/room.ts` defines the independent, serializable rectangular room, per-axis provenance, material IDs, presets, validation, commands, and six geometry descriptors. The implemented room has a guest ID/name and no openings. The broader versioned scene/placement contract above remains a future persistence design; it is not an implemented import API.
- `src/domain/units.ts` handles explicit metric and feet/inches conversion; canonical values are never rewritten by display toggles. Dimension forms commit only edited axes, preserving full precision elsewhere. Unapplied form edits reset on a unit or canonical-dimension change; users are instructed to apply first.
- `src/features/editor/editor-store.ts` holds the current room plus at most 100 prior snapshots. Valid dimension, material, and preset-creation commands are atomic and undoable. Invalid/no-op commands do not enter history; a valid new edit clears redo. Camera/navigation, units, visibility, grid, selection, and announcements are transient. No persistence is added before Phase 3.
- `src/scene/editor-room.tsx` consumes the same pure geometry descriptors that the Three.js bounding-box tests exercise. Floor/ceiling thickness is 0.12 m with interior faces at Y=0/height. Walls extend outward, with north at Z=0, south Z=depth, west X=0, east X=width. The measured interior remains exactly width × depth × height. Two walls and ceiling start hidden for a cutaway; all six surfaces can be shown/selected.
- `src/scene/floor-texture.ts` generates deterministic original 128px textures with a two-meter repeat scale. Wood grain, stone seams, and concrete noise distinguish finishes. Owned textures are disposed on replacement/unmount; R3F owns mesh geometry/material cleanup. No downloads or manufacturer claims are involved.
- `src/domain/room-camera.ts` computes a bounding-sphere fit using the limiting horizontal/vertical perspective field of view, or an orthographic footprint with margin. Supported widths/depths are 1–30 m and heights 1.8–6 m. Framing is recalculated on dimensions, aspect ratio, view, and explicit reset, not material/selection changes.
- `src/scene/editor-camera.tsx` owns mutable Three cameras through refs and exposes orbit/pan/zoom plus accessible navigation buttons. Overhead is an orthographic top-down view with north up. Individual navigation events are consumed once; editing dimensions cannot replay an old pan/zoom action.
- `src/features/editor` separates workspace chrome, toolbar, room hierarchy/presets, dimension form, inspector, and viewport. Below 1231px one side panel is shown at a time; at ≤760px the scene precedes the chosen panel. Keyboard order follows the visible panel switch. Camera controls do not require dragging.
- The landing and editor share WebGL capability/quality detection, error boundaries, and context-loss lifecycle handling. Rendering remains on demand. Unsupported graphics retain numeric editing; retrying the renderer keeps the room store intact. Software rendering still cannot establish physical-device FPS.

Measurement validity is not measurement accuracy: samples and user-entered dimensions remain labeled. This phase does not check collisions, delivery, real-world fit, doors, or accessibility compliance.
