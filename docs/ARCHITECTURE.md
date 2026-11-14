# Architecture

Status: architecture baseline from Phase 0. Phases 1–5 implement the shell/demo, measured rooms, catalog/placements, spatial analysis, local saving, and optional Supabase accounts/cloud projects. Later integrations remain future specifications. Exact installed versions and compatibility evidence are in [DEPENDENCIES.md](DEPENDENCIES.md).

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
    spatial/               # analysis UI and derived-state hook
    projects/              # persistence adapters and autosave
    auth/
    assets/
    assistant/             # Phase 7
    retailers/             # Phase 8
    billing/               # Phase 9
  scene/                   # R3F adapters, materials, lighting, controls
  domain/                  # schemas, units, geometry/analysis, versions, commands
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

### Serializable guest scene contract (implemented version 2; imports version 1)

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
  name: string;
  dimensions: Dimensions;
  openings: []; // Versions 1–2 have no located openings; Opening is a future design.
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
  schemaVersion: 2;
  room: Room;
  placements: Placement[];
  spatial: {
    clearanceMeters: number;
    doorway: { width: Dimension | null; height: Dimension | null };
  };
  displayUnits: 'metric' | 'imperial';
};
```

A project initially contains one room; database relations permit future rooms without enabling multi-room UI. North is Z=0, south is Z=depth, west X=0, east X=width. Opening offsets run along positive X for north/south and positive Z for east/west. Validate openings against their wall spans and heights; door swing and traversability are not implied by an opening rectangle.

Unknown dimensions are absent in product metadata and block placement/analysis that requires them; do not substitute zero. Placeable sample objects must have all three positive dimensions and source `sample`. Manufacturer verification requires a reference, timestamp, and authorized verifier; a user-entered label is not verification. Uncertainty must be finite and nonnegative; absent uncertainty means unknown, not zero. Measurement provenance is per axis.

Products define adjustable axes and allowed ranges; placements copy resolved physical dimensions and pin product/asset revisions so catalog updates cannot silently resize saved layouts. Fixed products cannot be freely scaled. Bounds use the copied dimensions; renderer scaling is an adapter detail. Save/import validators enforce IDs, references, valid variants, ranges, unique placement IDs, finite numbers, supported schema version, and bounded collection sizes. Version migrations are explicit and tested; preserve original data before migration and reject unsupported future versions safely.

## Commands, persistence, and conflicts

Commands include set room dimensions, add/update/delete/duplicate placement, change material, and update clearance guideline. Validate commands before commit; changing room size recalculates warnings instead of silently moving furniture. Keep bounded undo history (initially 100 commands), redo clearing on a new edit. Camera and panel settings do not pollute history.

The guest editor uses versioned local storage with debounced writes, quota/corruption handling, export/recovery strategy, and explicit local-save status. Phase 5 adds an authenticated persistence adapter. Cloud save includes an expected revision; update the scene document and derived room/placement rows atomically in one authorized transaction. On conflict, retain local edits and offer reload or save a copy; do not silently overwrite another session. Acknowledge saved status only after success. A guest import is explicit, owned, and idempotent to avoid duplicates after retries.

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

Historical state at Phase 2 completion; the Phase 3 notes below supersede the history/persistence details.

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

## Phase 3 implementation notes

### Catalog and assets

`src/domain/catalog.ts` defines nine original sample concepts (one per required category), complete sample dimensions, material variants, allowed width ranges, immutable product revision 1, and exact procedural asset revision IDs. `furnitureParts` is the normalized bottom-center-pivot recipe shared by the renderer and illustrative SVG thumbnails. Real dimensions scale those recipes; previews retain physical aspect ratios. Fixed objects cannot scale; shelf/desk width changes must remain in declared ranges and are labeled user-adjusted. Keep old product/asset revision definitions when adding new revisions; never silently reinterpret saved revision 1.

`src/features/catalog` owns filtering, cards, and a native modal with lazy 3D preview, focus restoration, loading/failure handling, sample details, and Add action. The scene has no remote asset requests; glTF uploads/merchant products are not implemented or claimed. Procedural geometry is disposed by R3F; preview/context errors remain recoverable without disabling numeric scene editing.

### Placements and history

`src/domain/placements.ts` owns immutable placements, revision/variant/size validation, yaw normalization, rotated planar extents, and deterministic snapping. Physical coordinates use bottom-center X/Z and floor Y=0. Positions must be finite within ±100 m; at most 100 placements are allowed. Rotation is radians internally and degrees in the UI. Bounds are a dimension envelope, not a mesh collision or delivery guarantee.

Phase 3 introduced `{room, placements}` snapshots (Phase 4 adds `spatial`) in its bounded history. Room creation clears placements atomically and can be undone. Add/update/duplicate/delete commands validate before commit. Surface and furniture selections are mutually exclusive. Presentation state and temporary `dragDraft` remain outside persisted scene/history. Drag movement previews a draft; release commits one update, cancellation drops it. Autosave sees only committed state, never intermediate frames. Invalid edits do not mutate the canonical scene or clear redo.

`src/scene/placed-furniture.tsx` projects captured pointer rays onto Y=0 while disabling OrbitControls during a furniture drag. `CatalogDrop` converts actual viewport drop coordinates through the current camera and commits one add command at the projected point. Numeric transforms bypass drag snapping to preserve exact intent; optional 0.1 m grid and 0.2 m near-wall snapping apply to dragging/dropping. Explicit alignment uses rotated extents at a chosen wall. Neither clamping, collisions, nor fit claims are added ahead of Phase 4.

### Local format and recovery

Phase 3 introduced schema 1: schema version, room, placements, and display units. The current schema 2 adds spatial settings as described below. Project IDs/titles, scene versions, and located openings remain later additions requiring explicit compatible migrations/versioning. Current guest imports accept sample/user-entered measurements, optional bounded evidence and nonnegative uncertainty; they do not accept invented manufacturer verification. Unknown object URLs are not loaded: asset IDs must match supported catalog revisions.

`src/domain/scene-document.ts` reconstructs validated plain data from untrusted JSON. It rejects unsupported versions, malformed dimensions/positions, invalid variants/revisions, fixed-item resizing, duplicate IDs, room-reference mismatches, unknown materials, >100 placements, and >1 MiB files. Imports are atomic; successful user imports enter history. No arbitrary data is executed or inserted as HTML.

`useLocalScene` reads `fitspace.scene.v1` before enabling editing or autosaving. Valid data hydrates the store before subscriptions; the default scene cannot overwrite an unread saved scene. Autosave is debounced 350 ms, flushes pending committed state on pagehide/unmount, and acknowledges only after `setItem` succeeds. Units persist without entering history. History, camera, selection, visibility, snapping preferences, and transient drag state do not persist.

Corrupt/future/incompatible data blocks writes and is retained for download. The user can export the current scene, retry/reload saved data, or explicitly replace it. Quota/permission failures retain memory and show an error. Storage events plus expected-raw comparison detect common other-tab changes and pause overwrites; localStorage does not provide transactional compare-and-swap, so this is not a concurrent-editing guarantee. Users should export before conflict resolution. Browser clearing/private-mode limitations remain; no cloud protection is implied.

A tab-local session marker also retains failed/blocked save state across route unmount/remount. Newer unsaved in-memory edits must not be replaced by an older stored copy when returning to the editor, including React development remounts. This marker is not persisted, is not authentication, and cannot recover memory after a full browser refresh.

## Phase 4 implementation notes

### Deterministic geometry and findings

`src/domain/spatial-geometry.ts` implements oriented rectangles, separating-axis intersection, point-to-edge minimum planar distance, and vertical interval overlap. Yaw matches Three.js positive-Y rotation. Numeric penetration must exceed 0.001 m to count as overlap; touching/sub-millimeter contact is not an overlap. Room checks use inner X/Z and height; wall envelopes come from the same `roomGeometry` as rendering, regardless of display visibility. No furniture is automatically moved or blocked by warnings.

`src/domain/spatial-analysis.ts` returns derived structured findings with severity, IDs, provenance, assumptions, and optional nominal gap. Incomplete/nonfinite dimensions or transforms yield cannot-determine outcomes. Rectangular envelopes can overestimate real mesh conflicts. Boundary/clearance results use nominal values and disclose unknown uncertainty; they do not establish a guaranteed clearance under measurement error. Pair clearance uses minimum planar distance only when vertical intervals overlap. The selected outline expands all rectangle sides by the full guideline, conservatively including its corners; it is a spacing visualization, not an accessibility or pathfinding test.

`src/features/spatial/use-spatial-analysis.ts` substitutes draft drag positions without persisting derived findings or polluting history. The same domain engine drives the panel and viewport. Warning bounds use red/amber plus text labels for selected objects and textual findings. The layout summary counts all findings; reports initially render the 60 most severe and expose more on request to bound initial DOM cost at the existing 100-object limit. Presentation toggles remain transient. Desktop paint containment clips offscreen panel overflow to the workspace while each side panel scrolls independently; mobile layouts retain normal document scrolling.

### Spatial settings and doorway scope

Settings contain a validated 0–3 m clearance guideline (default 0.8 m, zero disables it) and nullable clear doorway width/height. Width supports 0.2–5 m; height 0.5–4 m. Settings forms apply only dirty fields so display precision cannot drift untouched canonical values. Spatial input uses meters or explicitly labeled decimal feet. Applied settings join `{room, placements, spatial}` history snapshots; creating an empty room resets settings atomically and is undoable.

Doorway comparison enumerates all six ordered choices of across/vertical physical axes (90° orientations, possibly tipped). It adds declared object uncertainty and subtracts declared opening uncertainty; absent uncertainty stays explicitly unknown. There is no tolerance that widens a clear opening. Results show the candidate axes/margins or no-simple-candidate/additional-measurements-required, always excluding actual delivery determination. The remaining object axis, handling, approach, turns, packaging, door swing, stairs, elevators, diagonal motion, and disassembly require further information. Doorway settings do not create located wall cutouts; `room.openings` stays empty.

### Version 2 and migration recovery

The decoder accepts schema 1 or 2, returning validated version 2 in memory. Version 1 receives default settings; version 2 must supply all valid settings fields. Export/save writes version 2. The historical `fitspace.scene.v1` local-storage key is retained so existing designs are discovered. Before replacing valid version 1 raw storage, save its exact bytes once at `fitspace.scene.v1.backup`; a backup write failure aborts replacement and retains edits in memory. A download control exposes that original backup. Malformed JSON remains blocked until explicit replacement and must not be mistaken for a migration failure. Existing hydration, quota recovery, unsupported-version preservation, cross-tab detection, and failed-save route re-entry behavior remain in force.

## Phase 5 implementation notes

### Authenticated API boundary

`src/lib/supabase/server.ts` creates a fresh SSR client per request using only the configured publishable/anonymous key and HttpOnly/SameSite=Lax cookies. It rejects service/secret keys and non-HTTPS remote configuration. The application uses no administrative credential. Private APIs call Auth `getUser()` and rely on the user's database/storage role. Static page shells contain no private data; authenticated APIs deliver uncached DTOs, so no private RSC data cache or auth-only proxy is needed. Cookie refresh can be written in Route Handlers. Mutations validate JSON size, scene data, identifiers and the browser origin, accommodating Next's internal reverse-proxy URL through the Host header/configured application origin.

`/api/auth` implements request/verify email OTP and local-session sign-out. New and existing users follow the same passwordless flow. Account changes carry only the verified user ID to other tabs, never auth tokens. Explicit sign-out/different-owner changes clear private memory and hard-navigate to clear router caches. Same-owner sign-in keeps that owner's unsaved scenes and resumes unauthorized writes with their original request UUID/revision. Server authorization is still checked on every request; broadcasts confer no server permission.

### Canonical cloud records and transactions

`supabase/migrations` creates eight private RLS tables: profiles, projects, rooms, placements, scene_versions, assets, sharing_permissions and asset_cleanup_jobs. Direct project/scene/projection writes are revoked. Security-definer transaction functions use empty search paths, explicit `auth.uid()` ownership and narrow role grants. A frozen schema-2 JSON contract checks dimensions, sources, material/catalog revisions, ranges and object shapes in the database; an additional check enforces room links and unique placement IDs. API parsing retains the existing stricter guest decoder and compatible version-1 migration.

Create/import retries use an owner-scoped request UUID and advisory transaction lock. Saves lock the owned project, acknowledge an existing request before checking its original expected revision, then update canonical scene, normalized room/placement projections and an immutable version atomically. Rename creates another revision of the same scene. Idempotent retries return their own committed revision, not a newer unrelated revision that would permit stale overwrites. Duplicate/import copy scene content with new room/placement IDs and separately generated assets. Catalog revision pins remain unchanged.

### Editor isolation and recovery

The existing `Workspace` accepts a cloud session; its guest hook is disabled in that mode. `CloudWorkspace` temporarily loads the cloud document into the existing editor, preserves/restores the guest store on route exit, and subscribes only to committed changes. Private cloud scenes never enter guest localStorage. `SaveCoordinator` serializes debounced writes and retains pending request data until acknowledgement. Newer edits queue behind the exact in-flight snapshot. Errors/conflicts/auth failures retain memory and block unsafe retries. Export, explicit reload, save-copy, and same-tab route recovery remain available; closing a tab can lose unsaved memory.

### Assets, snapshots, and deletion

The server creates original bounded PNG plan diagrams from validated numeric geometry; it does not decode arbitrary uploads. A private PNG/size-limited bucket scopes reads/deletes to owner paths and inserts to existing owned projects. Metadata ties paths to exact scene versions. Authenticated uncached routes serve thumbnails. The owner may read/delete their own orphan paths solely to finish cleanup; another owner/anonymous caller cannot.

Deleting a project queues its asset paths before cascading private projections, versions, metadata and shares. The application attempts file removal and acknowledges the difference between project deletion and incomplete file cleanup. Durable owner-scoped jobs retry on the dashboard or an explicit action. A background worker for deleted accounts/never-returning owners remains a Phase 9 retention/operations task; it is not implemented or claimed.

Shares pin an immutable project revision and store only a SHA-256 token hash with expiry/revocation. The sole anonymous resolver returns the validated scene document, never owner/project/storage metadata. Raw 256-bit tokens stay in URL fragments and an uncached POST body. The separate read-only renderer uses the same room geometry, sample furniture recipes and camera-framing domain logic, without the mutable editor store or mutation controls. It supports orbit, keyboard pan/zoom/reset, labeled dimension sources and graphics fallback/retry. Downloaded snapshots cannot be recalled by revocation.
