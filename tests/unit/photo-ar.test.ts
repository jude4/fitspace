import { beforeEach, describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import {
  estimatePhotoDimension,
  type PhotoSegment,
} from '@/domain/photo-calibration';
import { inspectPhoto, MAX_PHOTO_BYTES } from '@/features/photo/photo-file';
import { createRoom, applyRoomCommand } from '@/domain/room';
import { parseScene, serializeScene } from '@/domain/scene-document';
import { useEditorStore } from '@/features/editor/editor-store';
import { createSampleModel, disposeModel } from '@/features/ar/sample-model';
import { products } from '@/domain/catalog';
const reference: PhotoSegment = [
  { x: 0.1, y: 0.3 },
  { x: 0.4, y: 0.3 },
];
const target: PhotoSegment = [
  { x: 0.1, y: 0.5 },
  { x: 0.7, y: 0.5 },
];
describe('photo calibration and persisted provenance', () => {
  beforeEach(() =>
    useEditorStore.setState(useEditorStore.getInitialState(), true),
  );
  it('uses a same-plane length ratio and recalculates when reference or target changes', () => {
    expect(estimatePhotoDimension(reference, target, 2, 'width')).toBeCloseTo(
      4,
    );
    expect(estimatePhotoDimension(reference, target, 3, 'width')).toBeCloseTo(
      6,
    );
    expect(
      estimatePhotoDimension(
        reference,
        [target[0], { x: 0.4, y: 0.5 }],
        2,
        'width',
      ),
    ).toBeCloseTo(2);
    // Longest-side coordinates preserve pixel aspect ratio in a landscape photo.
    expect(
      estimatePhotoDimension(
        reference,
        [
          { x: 0.5, y: 0.1 },
          { x: 0.5, y: 0.4 },
        ],
        2,
        'height',
      ),
    ).toBeCloseTo(2);
  });
  it('rejects degenerate points, nonfinite values and estimates outside supported room limits', () => {
    for (const known of [0, -1, NaN, Infinity, 101])
      expect(() =>
        estimatePhotoDimension(reference, target, known, 'width'),
      ).toThrow();
    expect(() =>
      estimatePhotoDimension([reference[0], reference[0]], target, 2, 'width'),
    ).toThrow();
    expect(() =>
      estimatePhotoDimension(
        reference,
        [target[0], { x: 1.1, y: 0.5 }],
        2,
        'width',
      ),
    ).toThrow();
    expect(() =>
      estimatePhotoDimension(reference, target, 0.1, 'height'),
    ).toThrow();
    expect(() =>
      estimatePhotoDimension(reference, target, 20, 'width'),
    ).toThrow();
  });
  it('applies only one axis, preserves unknown uncertainty, and supports undo/redo and scene round trips', () => {
    const before = useEditorStore.getState().room;
    expect(
      useEditorStore
        .getState()
        .execute({ type: 'photo-dimension', axis: 'width', meters: 6 }),
    ).toBe(true);
    const room = useEditorStore.getState().room;
    expect(room.dimensions.width).toEqual({
      meters: 6,
      source: 'image_estimated',
    });
    expect(room.dimensions.depth).toBe(before.dimensions.depth);
    const saved = parseScene(
      serializeScene({ room, placements: [] }, 'metric'),
    );
    expect(saved.room.dimensions.width).toEqual(room.dimensions.width);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().room).toEqual(before);
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().room).toEqual(room);
    expect(
      applyRoomCommand(room, {
        type: 'photo-dimension',
        axis: 'height',
        meters: 100,
      }).room,
    ).toBe(room);
  });
  it('does not accept imported verification authority', () => {
    const room = createRoom();
    const raw = JSON.parse(serializeScene({ room, placements: [] }, 'metric'));
    raw.room.dimensions.width.source = 'manufacturer_verified';
    expect(() => parseScene(JSON.stringify(raw))).toThrow(
      'Unsupported measurement provenance',
    );
  });
});
function png(width: number, height: number) {
  const bytes = new Uint8Array(33),
    data = new DataView(bytes.buffer);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  data.setUint32(8, 13);
  data.setUint32(12, 0x49484452);
  data.setUint32(16, width);
  data.setUint32(20, height);
  return bytes;
}
describe('bounded raster inspection before decode', () => {
  it('checks file signatures, declared MIME and compressed/pixel limits', () => {
    expect(inspectPhoto(png(1200, 800), 'image/png')).toEqual({
      width: 1200,
      height: 800,
    });
    for (const [width, height] of [
      [0, 1],
      [9000, 1],
      [6000, 6000],
    ])
      expect(() => inspectPhoto(png(width, height), 'image/png')).toThrow();
    expect(() =>
      inspectPhoto(new Uint8Array(MAX_PHOTO_BYTES + 1), 'image/png'),
    ).toThrow('8 MiB');
    expect(() => inspectPhoto(png(10, 10), 'image/jpeg')).toThrow();
    expect(() =>
      inspectPhoto(
        new TextEncoder().encode('<svg onload="alert(1)"/>'),
        'image/png',
      ),
    ).toThrow();
  });
  it('finds bounded JPEG frame sizes and rejects truncated segments', () => {
    const bytes = new Uint8Array([
      255, 216, 255, 224, 0, 4, 0, 0, 255, 192, 0, 8, 8, 1, 0, 2, 0, 3,
    ]);
    expect(inspectPhoto(bytes, 'image/jpeg')).toEqual({
      width: 512,
      height: 256,
    });
    expect(() => inspectPhoto(bytes.slice(0, 15), 'image/jpeg')).toThrow();
  });
});
describe('AR sample scale', () => {
  it.each(products.map((p) => [p.id, p] as const))(
    'builds %s with the editor recipe in canonical meters',
    (_id, product) => {
      const model = createSampleModel(product);
      const box = new Box3().setFromObject(model),
        size = box.getSize(new Vector3());
      expect(model.scale.toArray()).toEqual([
        product.dimensions.width.meters,
        product.dimensions.height.meters,
        product.dimensions.depth.meters,
      ]);
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(size.x).toBeCloseTo(product.dimensions.width.meters, 5);
      expect(size.y).toBeCloseTo(product.dimensions.height.meters, 5);
      expect(size.z).toBeCloseTo(product.dimensions.depth.meters, 5);
      disposeModel(model);
    },
  );
});
