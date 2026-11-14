import { beforeEach, describe, it, expect } from 'vitest';
import {
  products,
  categories,
  filterProducts,
  furnitureParts,
} from '@/domain/catalog';
import { createRoom, axes } from '@/domain/room';
import {
  createPlacement,
  footprint,
  snapPosition,
  updatePlacement,
  validatePlacement,
} from '@/domain/placements';
import { parseScene, serializeScene } from '@/domain/scene-document';
import { useEditorStore } from '@/features/editor/editor-store';
const room = createRoom();
describe('sample catalog and normalized model envelopes', () => {
  it('covers all nine categories with sample provenance, versions, variants and original geometry', () => {
    expect(products.map((p) => p.category).sort()).toEqual(
      [...categories].sort(),
    );
    for (const product of products) {
      expect(product.assetRevisionId).toContain(':1');
      expect(product.variants.length).toBeGreaterThan(0);
      for (const axis of axes)
        expect(product.dimensions[axis].source).toBe('sample');
      const parts = furnitureParts(product.id);
      for (const axis of [0, 1, 2]) {
        const min = Math.min(
            ...parts.map((p) => p.position[axis] - p.size[axis] / 2),
          ),
          max = Math.max(
            ...parts.map((p) => p.position[axis] + p.size[axis] / 2),
          );
        expect(min).toBeCloseTo(axis === 1 ? 0 : -0.5, 5);
        expect(max).toBeCloseTo(axis === 1 ? 1 : 0.5, 5);
      }
    }
  });
  it('searches and combines filters without inventing empty results', () => {
    expect(filterProducts('sofa', 'All', 'Fabric').map((p) => p.id)).toEqual([
      'arc-sofa',
    ]);
    expect(filterProducts('', 'Desks', 'Wood').map((p) => p.id)).toEqual([
      'studio-desk',
    ]);
    expect(filterProducts('sofa', 'Appliances', 'All')).toEqual([]);
  });
});
describe('physical placements and snapping', () => {
  it('rejects fixed-item scaling, invalid variants, missing revisions, and nonfinite transforms', () => {
    const p = createPlacement(products[0], room, 'sample-one');
    expect(
      validatePlacement(updatePlacement(p, { resize: { width: 3 } }), room.id),
    ).toMatch(/Fixed/);
    expect(validatePlacement({ ...p, productRevision: 999 }, room.id)).toMatch(
      /revision/,
    );
    expect(
      validatePlacement({ ...p, materialVariantId: 'bad' }, room.id),
    ).toMatch(/variant/);
    expect(
      validatePlacement({ ...p, position: { x: NaN, y: 0, z: 1 } }, room.id),
    ).toMatch(/finite/);
  });
  it('permits only declared resize axes/ranges and records adjusted provenance', () => {
    const p = createPlacement(
      products.find((p) => p.id === 'studio-desk')!,
      room,
      'desk',
    );
    const changed = updatePlacement(p, { resize: { width: 2 } });
    expect(validatePlacement(changed, room.id)).toBeNull();
    expect(changed.dimensions.width.source).toBe('user_entered');
    expect(
      validatePlacement(updatePlacement(p, { resize: { width: 3 } }), room.id),
    ).toBeTruthy();
    expect(
      validatePlacement(
        updatePlacement(p, { resize: { depth: 0.7 } }),
        room.id,
      ),
    ).toMatch(/Fixed/);
  });
  it('snaps rotated physical bounds to walls after optional grid snapping', () => {
    const p = {
      ...createPlacement(products[0], room, 'sofa'),
      rotationYRadians: Math.PI / 2,
    };
    const { halfX, halfZ } = footprint(p);
    expect(halfX).toBeCloseTo(0.46, 8);
    expect(halfZ).toBeCloseTo(1.1, 8);
    expect(
      snapPosition(p, { x: 0.53, y: 0, z: 1.17 }, room, true, true),
    ).toEqual({ x: halfX, y: 0, z: halfZ });
    const grid = snapPosition(
      p,
      { x: 1.234, y: 0, z: 2.345 },
      room,
      true,
      false,
    );
    expect(grid.x).toBeCloseTo(1.2, 8);
    expect(grid.z).toBeCloseTo(2.3, 8);
  });
});
describe('scene boundary validation', () => {
  const p = createPlacement(products[0], room, 'sofa');
  it('round-trips exact transforms, revision pins, dimensions, units and provenance', () => {
    const scene = {
      room: {
        ...room,
        dimensions: {
          ...room.dimensions,
          width: {
            ...room.dimensions.width,
            uncertaintyMeters: 0.01,
            evidence: {
              reference: 'Guest reference',
              recordedAt: '2026-11-14T00:00:00Z',
            },
          },
        },
      },
      placements: [
        {
          ...p,
          position: { x: 1.23456789, y: 0, z: 2.3456789 },
          rotationYRadians: 0.123456,
        },
      ],
    };
    const restored = parseScene(serializeScene(scene, 'imperial'));
    expect(restored).toEqual({
      schemaVersion: 1,
      ...scene,
      displayUnits: 'imperial',
    });
  });
  it('rejects future/corrupt/oversized scenes, duplicate IDs, mismatched dimensions and untrusted revisions', () => {
    expect(() => parseScene('{bad')).toThrow();
    const good = JSON.parse(
      serializeScene({ room, placements: [p] }, 'metric'),
    );
    for (const invalid of [
      { ...good, schemaVersion: 2 },
      { ...good, placements: [p, p] },
      {
        ...good,
        placements: [{ ...p, assetRevisionId: 'https://untrusted/model.glb' }],
      },
      { ...good, room: { ...room, dimensions: {} } },
      {
        ...good,
        placements: [
          {
            ...p,
            dimensions: {
              ...p.dimensions,
              width: { meters: 99, source: 'sample' },
            },
          },
        ],
      },
    ])
      expect(() => parseScene(JSON.stringify(invalid))).toThrow();
    expect(() => parseScene(' '.repeat(1024 * 1024 + 1))).toThrow(/1 MiB/);
  });
});
describe('unified scene history and drag transactions', () => {
  beforeEach(() =>
    useEditorStore.setState(useEditorStore.getInitialState(), true),
  );
  it('commits one history entry per drag, cancels without an edit, and restores furniture with room undo', () => {
    const s = useEditorStore.getState();
    s.furniture({ type: 'add', productId: 'arc-sofa', id: 'sofa' });
    const before = useEditorStore.getState().past.length;
    s.beginDrag('sofa');
    for (let i = 0; i < 10; i++) s.moveDrag({ x: 1 + i * 0.1, y: 0, z: 2 });
    expect(useEditorStore.getState().past).toHaveLength(before);
    s.finishDrag();
    expect(useEditorStore.getState().past).toHaveLength(before + 1);
    const end = useEditorStore.getState().placements[0];
    s.undo();
    expect(useEditorStore.getState().placements[0].position.x).toBe(2);
    s.redo();
    expect(useEditorStore.getState().placements[0]).toEqual(end);
    s.beginDrag('sofa');
    s.moveDrag({ x: 3, y: 0, z: 3 });
    s.finishDrag(true);
    expect(useEditorStore.getState().placements[0]).toEqual(end);
    s.execute({ type: 'create', preset: 'studio' });
    expect(useEditorStore.getState().placements).toHaveLength(0);
    s.undo();
    expect(useEditorStore.getState().placements).toEqual([end]);
  });
  it('duplicates with independent IDs, deletes reversibly, and rejects invalid commands atomically', () => {
    const s = useEditorStore.getState();
    s.furniture({ type: 'add', productId: 'arc-sofa', id: 'sofa' });
    s.furniture({ type: 'duplicate', id: 'sofa', newId: 'copy' });
    const state = useEditorStore.getState();
    expect(state.placements).toHaveLength(2);
    expect(state.placements[1].productRevision).toBe(1);
    expect(
      s.furniture({
        type: 'update',
        id: 'sofa',
        update: { resize: { width: 6 } },
      }),
    ).toBe(false);
    expect(useEditorStore.getState().placements).toBe(state.placements);
    s.furniture({ type: 'delete', id: 'copy' });
    s.undo();
    expect(useEditorStore.getState().placements).toHaveLength(2);
  });
});
