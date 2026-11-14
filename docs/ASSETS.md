# Demo asset provenance

Phase 1 downloads no models, photographs, textures, fonts, or HDR files at runtime. Furniture, floorboards, architecture, plant, and abstract wall art are original procedural Three.js geometry in `src/scene/room-geometry.tsx`. Concept-card illustrations are original CSS artwork. Demo dimensions are illustrative samples; nothing is presented as a real retailer product or verified manufacturer specification.

The user-supplied reference images guide composition, warm neutral colors, and materials only. They are not copied into the app or assumed licensed for redistribution.

Lucide icons use the installed package's ISC license. The shared Button follows the MIT-licensed shadcn/ui component composition pattern with project-specific styling; attribution and the upstream license are retained in `THIRD_PARTY_NOTICES.md`. Dependency licenses remain in their packages. Record source, license, attribution, optimization, unit calibration, and dimension evidence here when external models or textures are introduced.

## Phase 2

The empty-room editor uses original box geometry and small deterministic grain/tile/noise textures generated in `src/scene/floor-texture.ts`. The 128 × 128 RGBA textures repeat over a two-meter surface span and are visual sample finishes, not material specifications from a manufacturer. No floor textures or models are downloaded. Dimension lines/labels use geometry and HTML rather than externally hosted fonts.

## Phase 3

Nine original sample furniture recipes live in `src/domain/catalog.ts`, rendered by `src/scene/furniture-model.tsx`. They cover sofa, chair, coffee table, bed, cabinet, shelf, desk, lamp, and a refrigerator volume. Bottom-center unit-envelope geometry is scaled using explicitly labeled sample dimensions; these are not real products, verified appliance specifications, or purchasable listings. The catalog's SVG illustrations use the same recipe extents; product dialogs provide actual interactive 3D previews at correct relative proportions.

Each product pins revision 1 and a `procedural:<product-id>:1` asset ID. Retain old recipes when creating new revisions so saved dimensions/meshes do not silently change. There are no downloaded GLB files, copied photos, third-party product textures, remote model URLs, or merchant assets in this phase. Scene imports accept only supported revision IDs; unknown assets fail validation rather than loading arbitrary URLs.

## Phase 5

`src/features/projects/thumbnail.ts` generates original PNG plan previews from validated room/furniture envelopes. These bounded 320 × 240 diagrams are private project thumbnails, not photographs or photorealistic renders. The read-only viewer reuses the existing original room/furniture geometry. No external models, photos, fonts, HDRs, merchant assets, or user image uploads were introduced. Supabase SDK/CLI dependency licenses remain in their packages.
