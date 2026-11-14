# Demo asset provenance

Phase 1 downloads no models, photographs, textures, fonts, or HDR files at runtime. Furniture, floorboards, architecture, plant, and abstract wall art are original procedural Three.js geometry in `src/scene/room-geometry.tsx`. Concept-card illustrations are original CSS artwork. Demo dimensions are illustrative samples; nothing is presented as a real retailer product or verified manufacturer specification.

The user-supplied reference images guide composition, warm neutral colors, and materials only. They are not copied into the app or assumed licensed for redistribution.

Lucide icons use the installed package's ISC license. The shared Button follows the MIT-licensed shadcn/ui component composition pattern with project-specific styling; attribution and the upstream license are retained in `THIRD_PARTY_NOTICES.md`. Dependency licenses remain in their packages. Record source, license, attribution, optimization, unit calibration, and dimension evidence here when external models or textures are introduced.

## Phase 2

The empty-room editor uses original box geometry and small deterministic grain/tile/noise textures generated in `src/scene/floor-texture.ts`. The 128 × 128 RGBA textures repeat over a two-meter surface span and are visual sample finishes, not material specifications from a manufacturer. No floor textures or models are downloaded. Dimension lines/labels use geometry and HTML rather than externally hosted fonts.
