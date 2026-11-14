# Development phases and acceptance gates

Phases execute sequentially. At each gate, update the documentation, report actual checks and limitations, and stop for explicit approval. Do not interpret this roadmap as authorization for later phases.

## Phase 0 — Planning and architecture

**Status:** Complete.

Scope: inspect repository, define MVP and journeys, architecture, database relationships, canonical scene/units/provenance, asset/performance strategy, folder structure, and complete roadmap.

Acceptance: all eight required documentation files exist and agree on scope and status; scene conventions cover dimensions/transforms/provenance/versioning; database ownership and relationships are explicit; all phases have measurable gates. Validate links, document completeness, and Git diff hygiene. No application or dependencies are required.

## Phase 1 — Foundation, design system, landing page

**Status:** Complete (2026-11-14); physical-device performance validation remains a documented limitation. Phase 2 was subsequently authorized and implemented; see its gate below.

Sequence: consult official compatibility docs → pin Node/pnpm/framework/renderer versions → initialize Next.js strict TypeScript/Tailwind/shadcn primitives → configure Vitest/RTL/Playwright/ESLint/formatting → create navigation and responsive landing → procedural live room → verify.

Deliver: elegant landing with headline, Start Designing and Explore Demo, functional before/after comparison, feature/process/example/business sections, footer, original or attributed assets, lightweight PBR room with floor/walls/furniture/lighting/shadows, constrained camera animation, loading/error/WebGL fallback. `/workspace` is a clearly identified upcoming-editor shell until Phase 2, not a fake working editor; future route shells explicitly state availability. Defer subscription pricing until Phase 9.

Acceptance:

- Frozen installation, development server, typecheck, lint, unit/component tests, browser tests, and production build succeed.
- Primary links navigate to intended routes; before/after visibly changes the actual scene and is keyboard operable.
- Browser confirms nonblank 3D rendering without console errors; reduced motion disables camera animation; WebGL failure shows usable fallback.
- At 360 px, 768 px, and 1440 px widths, primary content/actions remain accessible without horizontal overflow.
- Record landing transfer size and rendering measurements against architecture budgets; disclose unavailable hardware testing.

## Phase 2 — Interactive rectangular room builder

**Status:** Complete (2026-11-14). Phase 3 was subsequently authorized and implemented; see its gate below.

Deliver: room creation/presets; positive width/depth/height inputs; metric/imperial display; provenance; generated floor/walls/ceiling; dimension labels; wall/floor materials; perspective/overhead view; orbit/pan/zoom; room-element selection; wall visibility/grid toggles; camera reset and framing; editor panels/toolbar; command-based undo/redo.

Acceptance: entered 4 × 5 × 2.7 m room yields matching geometry bounds within 1 mm numeric tolerance; unit toggles do not change canonical values; invalid/nonfinite dimensions cannot commit; camera frames small and large supported rooms; selection/material/view controls work through representative browser interactions; undo/redo restores committed room changes. Bounds/ranges must be documented when implemented. Type/lint/unit/component/E2E/build gates pass.

## Phase 3 — Catalog and placement

**Status:** Complete (2026-11-14). Phase 4 was subsequently authorized and implemented; see its gate below.

Deliver: small curated sample catalog covering sofas/chairs/tables/beds/cabinets/shelves/desks/lamps/appliances with honest dimension labels, previews, search/category/material filters, item details, add/select/drag/rotate/numeric edit, adjustable-only resize, duplicate/delete, variants, bounds/dimensions, wall and optional grid snapping, undo/redo, local persistence. Categories lacking items must be clearly empty, not fake listings. Merchant models come later.

Acceptance: at least one sample in each named category has complete positive sample dimensions and a working preview/placement path; fixed items cannot scale; drag and numeric transformations agree; snapping is deterministic; one drag is one undo entry; save/reload preserves scene and revisions without unit drift; corruption/quota failures show recovery and no false saved status. Asset failure remains recoverable. Test filters, transforms, serialization, reload, keyboard alternatives, and all standard quality gates.

## Phase 4 — Spatial fit analysis

**Status:** Complete (2026-11-14). Nominal envelope analysis and dimension-only doorway checks passed the gate; real delivery/accessibility guarantees are excluded. Phase 5 was subsequently authorized and implemented; see its gate below.

Deliver: room boundaries, furniture/wall and furniture/furniture potential intersections, configurable clearance visualization, doorway inputs and limited dimension comparisons, object comparisons, layout summary, understandable warnings and missing-data outcomes.

Acceptance: fixture tests cover disjoint/touching/overlapping/rotated furniture, vertical separation, out-of-room placements, epsilon cases, missing inputs, and estimated dimensions; changed transforms update findings; no incomplete-input result claims guaranteed fit. Doorway findings enumerate assumptions and exclude complex delivery paths. End-to-end example layouts produce expected warnings. Standard quality gates pass.

## Phase 5 — Accounts and cloud projects (MVP milestone)

**Status:** Complete (2026-11-14), validated with real local Supabase as explicitly selected. Hosted deployment/SMTP remain unverified. Phase 6 requires separate approval.

Deliver: Supabase auth (registration/login/logout/reset or supported passwordless flow), dashboard/project create/rename/duplicate/delete, local guest import, owned cloud save/load/autosave with conflict handling, thumbnails, secure asset storage, versioned scenes, expiring/revocable read-only snapshot shares, RLS and migrations.

Acceptance: data survives refresh and relogin; failed/conflicting saves retain edits without false acknowledgement; duplicate creates independent IDs; guest demo works without credentials. Automated two-user and anonymous tests prove isolation of every private table/storage path; token viewer cannot mutate or inspect unrelated data; expiry/revocation works. Migrations reproduce a test database. Auth and storage workflows plus standard quality gates pass. Real Supabase project configuration is required for integration validation, never replaced by mock-only success.

## Phase 6 — Photo reference and AR

**Status:** Not started; depends on approved Phase 5.

Deliver: validated photo upload/review, known reference measurements, manually calibrated approximate room geometry, product concept comparison; supported platform product AR at correct scale with return navigation and unsupported-device fallback.

Acceptance: upload validation rejects unsafe/oversize files; calibration never claims accurate single-photo reconstruction; reference edits update approximation. Record actual HTTPS device/browser/OS tests for each claimed AR platform and compare known object scale; denied permissions and unsupported devices fall back gracefully. Without supported device access, AR remains unverified and the phase gate stays open. Standard quality gates pass.

## Phase 7 — Constrained AI assistance

**Status:** Not started; depends on approved Phase 6.

Deliver: allowlisted structured scene commands for arrangement, spacing, catalog recommendations, explanations, and natural-language edits; proposal UI; destructive-change confirmation; undo; deterministic spatial re-analysis; labeled rules-based mode without an API key.

Acceptance: supported requests produce valid proposals; unknown IDs, invalid transforms, oversized batches, forbidden actions, and malicious text cannot mutate the scene or execute code. Confirmed edits are reversible; warnings reflect post-edit geometry; missing measurements stay explicit. Test deterministic demo and configured service independently; no claim of live AI validation without credentials. Standard quality gates pass.

## Phase 8 — Retailer integration

**Status:** Not started; depends on approved Phase 7.

Deliver: merchant accounts/roles, dashboard, validated metadata/catalog imports, licensed GLB/GLTF uploads, verifier-controlled dimension provenance, authentic prices/URLs, usage events, branding, preview embeds and Visualize in FitSpace entry points. No unnecessary cart/marketplace payment system.

Acceptance: authorized merchant can publish a validated licensed product, embed a working preview on an approved origin, and link to its authentic listing; other tenants cannot edit/read private merchant data. Invalid models/references/URLs/import rows are rejected with actionable errors. Usage events do not leak private designs. Test upload limits, role escalation, cross-tenant access, embed origin checks, and standard quality gates.

## Phase 9 — Billing, hardening, deployment

**Status:** Not started; depends on approved Phase 8.

Deliver: configurable Free/Pro/Business entitlements, Stripe test-mode checkout/portal/webhooks, server-enforced limits, security/authorization reviews, rate limits, asset deletion and retention controls, monitoring, privacy documents clearly flagged for legal review, migration/backup/restore/runbooks, deployment configuration, cross-browser/accessibility/performance coverage and optimized assets/rendering.

Acceptance: signed idempotent webhook tests and real test-mode lifecycle cover purchase/change/cancel/replay; limits are server enforced. Full guest→room→placement→warnings→save→share journey passes plus retailer preview and supported AR device matrix. Production build/deployment smoke succeeds; database restore is rehearsed; no unresolved critical security issues. Publish measured performance and accessibility findings with target browsers/devices. Deployment, credentials, legal, DNS/HTTPS, monitoring, and backup prerequisites are explicitly resolved or launch remains blocked. Never enable live billing without deliberate configuration.

## Post-launch — separate approval

After Phases 0–9 are stable: multi-image/video reconstruction, splatting, automatic segmentation/floor plans, nonrectangular/multi-room/multi-floor projects, collaboration, detailed lighting, delivery-path planning, renovation comparisons, advanced analytics/exports, and expanded mobile AR. Each needs its own uncertainty disclosures and acceptance plan.
