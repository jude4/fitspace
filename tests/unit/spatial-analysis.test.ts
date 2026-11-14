import { describe, it, expect } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { products } from '@/domain/catalog';
import { createRoom, type Dimensions } from '@/domain/room';
import { createPlacement, type Placement } from '@/domain/placements';
import {
  corners,
  rectanglesOverlap,
  rectangleDistance,
  rectangleFor,
  intervalsOverlap,
} from '@/domain/spatial-geometry';
import {
  analyzeLayout,
  checkDoorway,
  compareDimensions,
} from '@/domain/spatial-analysis';
import { defaultSpatialSettings } from '@/domain/spatial-settings';
import { parseScene, serializeScene } from '@/domain/scene-document';
const room = createRoom(),
  base = createPlacement(products[0], room, 'a');
const p = (id: string, x = 2, z = 2.5, yaw = 0): Placement => ({
  ...structuredClone(base),
  id,
  position: { x, y: 0, z },
  rotationYRadians: yaw,
});
const settings = defaultSpatialSettings();
describe('oriented geometry', () => {
  it('agrees with actual Three.js positive-Y corner transforms', () => {
    const placed = p('a', 2, 3, 0.63);
    const points = corners(rectangleFor(placed));
    const matrix = new Matrix4().makeRotationY(0.63);
    matrix.setPosition(2, 0, 3);
    const expected = [
      [-1.1, 0, -0.46],
      [1.1, 0, -0.46],
      [1.1, 0, 0.46],
      [-1.1, 0, 0.46],
    ].map((v) =>
      new Vector3(...(v as [number, number, number])).applyMatrix4(matrix),
    );
    points.forEach((point, i) => {
      expect(point.x).toBeCloseTo(expected[i].x, 9);
      expect(point.z).toBeCloseTo(expected[i].z, 9);
    });
  });
  it('distinguishes disjoint, touching, containment and penetration around 1 mm', () => {
    const a = { center: { x: 0, z: 0 }, width: 2, depth: 1, yaw: 0 };
    expect(rectanglesOverlap(a, { ...a, center: { x: 2, z: 0 } })).toBe(false);
    expect(rectanglesOverlap(a, { ...a, center: { x: 1.9995, z: 0 } })).toBe(
      false,
    );
    expect(rectanglesOverlap(a, { ...a, center: { x: 1.998, z: 0 } })).toBe(
      true,
    );
    expect(rectanglesOverlap(a, { ...a, width: 0.5, depth: 0.2 })).toBe(true);
    expect(rectangleDistance(a, { ...a, center: { x: 3, z: 0 } })).toBeCloseTo(
      1,
      9,
    );
    expect(rectangleDistance(a, { ...a, center: { x: 2, z: 1 } })).toBe(0);
  });
  it('rejects AABB false positives for parallel rotated thin rectangles', () => {
    const a = {
        center: { x: 0, z: 0 },
        width: 3,
        depth: 0.2,
        yaw: Math.PI / 4,
      },
      b = { ...a, center: { x: 0.4, z: 0.4 } };
    expect(rectanglesOverlap(a, b)).toBe(false);
    expect(rectangleDistance(a, b)).toBeCloseTo(Math.hypot(0.4, 0.4) - 0.2, 8);
  });
  it('handles vertical separation and touching intervals', () => {
    expect(intervalsOverlap(0, 1, 1, 2)).toBe(false);
    expect(intervalsOverlap(0, 1, 0.5, 2)).toBe(true);
    expect(intervalsOverlap(0, 1, 0.9995, 2)).toBe(false);
  });
});
describe('layout findings', () => {
  it('reports safe nominal boundaries without promising fit for samples', () => {
    const findings = analyzeLayout(room, [p('a')], {
      ...settings,
      clearanceMeters: 0,
    });
    expect(findings.map((f) => f.code)).toEqual(['within-boundary']);
    expect(findings[0].message).toMatch(/sample/);
    expect(findings[0].sources).toContain('sample');
    expect(findings[0].assumptions.join(' ')).toMatch(/unknown/);
  });
  it('detects overlaps and wall intersections separately from full out-of-room placement', () => {
    let f = analyzeLayout(room, [p('a'), p('b', 2.1)], settings);
    expect(
      f.some(
        (v) =>
          v.code === 'potential-overlap' && v.objectIds.join(',') === 'a,b',
      ),
    ).toBe(true);
    f = analyzeLayout(room, [p('a', -0.1)], settings);
    expect(f.some((v) => v.code === 'outside-room')).toBe(true);
    expect(
      f.some((v) => v.code === 'wall-overlap' && v.message.includes('west')),
    ).toBe(true);
    f = analyzeLayout(room, [p('a', -3)], settings);
    expect(f.some((v) => v.code === 'outside-room')).toBe(true);
    expect(f.some((v) => v.code === 'wall-overlap')).toBe(false);
  });
  it('updates boundary behavior for rotation and ceiling height', () => {
    const edge = p('a', 1.2, 0.6);
    expect(
      analyzeLayout(room, [edge], settings).some(
        (f) => f.code === 'outside-room',
      ),
    ).toBe(false);
    edge.rotationYRadians = Math.PI / 2;
    expect(
      analyzeLayout(room, [edge], settings).some(
        (f) => f.code === 'outside-room',
      ),
    ).toBe(true);
    const tall = {
      ...p('a'),
      dimensions: {
        ...base.dimensions,
        height: { meters: 3, source: 'sample' as const },
      },
    };
    expect(
      analyzeLayout(room, [tall], settings).some(
        (f) => f.code === 'outside-room',
      ),
    ).toBe(true);
  });
  it('ignores vertically separated overlaps and catches configurable nominal gaps', () => {
    const a = p('a', 1.15, 2),
      b = p('b', 3.65, 2);
    const f = analyzeLayout(room, [a, b], {
      ...settings,
      clearanceMeters: 0.5,
    });
    expect(
      f.some(
        (v) =>
          v.code === 'limited-clearance' &&
          v.objectIds.length === 2 &&
          Math.abs(v.distanceMeters! - 0.3) < 1e-9,
      ),
    ).toBe(true);
    expect(
      analyzeLayout(room, [a, b], { ...settings, clearanceMeters: 0 }).some(
        (v) => v.code === 'limited-clearance',
      ),
    ).toBe(false);
    const lifted = { ...p('b'), position: { x: 2, y: 1, z: 2.5 } };
    expect(
      analyzeLayout(room, [p('a'), lifted], settings).some(
        (v) => v.code === 'potential-overlap',
      ),
    ).toBe(false);
  });
  it('returns cannot-determine for missing/nonfinite inputs, never a passing result', () => {
    const broken = { ...p('a'), dimensions: {} as Dimensions };
    expect(analyzeLayout(room, [broken], settings).map((f) => f.code)).toEqual([
      'cannot-determine',
    ]);
    expect(
      analyzeLayout(
        { ...room, dimensions: {} as Dimensions },
        [p('a')],
        settings,
      ).map((f) => f.code),
    ).toEqual(['cannot-determine']);
    expect(
      analyzeLayout(room, [{ ...p('a'), rotationYRadians: NaN }], settings).map(
        (f) => f.code,
      ),
    ).toEqual(['cannot-determine']);
  });
  it('keeps image/model estimates explicitly qualified', () => {
    const estimated = structuredClone(p('a'));
    estimated.dimensions.width.source = 'image_estimated';
    const f = analyzeLayout(room, [estimated], {
      ...settings,
      clearanceMeters: 0,
    })[0];
    expect(f.message).toMatch(/estimated/);
    expect(f.sources).toContain('image_estimated');
  });
});
describe('limited doorway and dimension comparisons', () => {
  it('requires missing inputs, finds tipping candidates, and never guarantees delivery', () => {
    expect(checkDoorway(base.dimensions, settings.doorway).status).toBe(
      'requires-measurements',
    );
    const d = {
      width: { meters: 0.9, source: 'user_entered' as const },
      height: { meters: 2.1, source: 'user_entered' as const },
    };
    const result = checkDoorway(base.dimensions, d);
    expect(result.status).toBe('candidate-orientation');
    expect(result.orientation?.across).toBe('height');
    expect(result.message).toMatch(/delivery cannot be determined/);
    expect(
      checkDoorway(base.dimensions, {
        ...d,
        width: { meters: 0.8, source: 'user_entered' },
      }).status,
    ).toBe('no-simple-candidate');
  });
  it('does not accept narrow thresholds or invalid/declared uncertainty as positive evidence', () => {
    const d = {
      width: { meters: 0.8195, source: 'user_entered' as const },
      height: { meters: 2.1, source: 'user_entered' as const },
    };
    expect(checkDoorway(base.dimensions, d).status).toBe('no-simple-candidate');
    expect(
      checkDoorway(base.dimensions, {
        ...d,
        width: { meters: 0.9, source: 'user_entered', uncertaintyMeters: 0.2 },
      }).status,
    ).toBe('no-simple-candidate');
    expect(
      checkDoorway(base.dimensions, {
        ...d,
        width: { meters: 0.9, source: 'user_entered', uncertaintyMeters: -1 },
      }).status,
    ).toBe('requires-measurements');
  });
  it('compares physical size independently of placement yaw', () => {
    const dims = {
      ...base.dimensions,
      width: { meters: 1, source: 'sample' as const },
    };
    expect(
      compareDimensions(base.dimensions, dims)[0].differenceMeters,
    ).toBeCloseTo(1.2, 9);
  });
});
describe('version 1 migration and version 2 validation', () => {
  it('migrates legacy scenes without changing their room, transforms or revisions', () => {
    const legacy = {
      schemaVersion: 1,
      room,
      placements: [p('a')],
      displayUnits: 'imperial',
    };
    const next = parseScene(JSON.stringify(legacy));
    expect(next.schemaVersion).toBe(2);
    expect(next.spatial).toEqual(defaultSpatialSettings());
    expect(next.placements).toEqual(legacy.placements);
    expect(next.room).toEqual(room);
  });
  it('round-trips explicit settings and rejects malformed v2 without silently defaulting', () => {
    const spatial = {
      clearanceMeters: 0.65,
      doorway: {
        width: { meters: 0.9, source: 'user_entered' as const },
        height: null,
      },
    };
    expect(
      parseScene(
        serializeScene({ room, placements: [p('a')], spatial }, 'metric'),
      ).spatial,
    ).toEqual(spatial);
    const v = JSON.parse(serializeScene({ room, placements: [] }, 'metric'));
    for (const invalid of [
      { ...v, spatial: null },
      { ...v, spatial: { ...spatial, clearanceMeters: -1 } },
      {
        ...v,
        spatial: {
          ...spatial,
          doorway: {
            width: { meters: 0, source: 'user_entered' },
            height: null,
          },
        },
      },
    ])
      expect(() => parseScene(JSON.stringify(invalid))).toThrow();
  });
});
