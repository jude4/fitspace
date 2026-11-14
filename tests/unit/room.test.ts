import { describe, it, expect } from 'vitest';
import { BoxGeometry, Box3, Mesh, Vector3 } from 'three';
import {
  applyRoomCommand,
  createRoom,
  roomGeometry,
  validateDimensions,
  type RoomCommand,
} from '@/domain/room';
import { frameRoom } from '@/domain/room-camera';
import {
  formatLength,
  imperialParts,
  parseImperial,
  parseMetric,
  METERS_PER_INCH,
} from '@/domain/units';
describe('canonical dimensions and actual room geometry', () => {
  it('bounds the 4 × 5 × 2.7 m interior with wall thickness outside', () => {
    const room = createRoom();
    const parts = roomGeometry(room);
    const bounds = Object.fromEntries(
      parts.map((part) => {
        const geometry = new BoxGeometry(...part.size);
        const mesh = new Mesh(geometry);
        mesh.position.set(...part.position);
        mesh.updateMatrixWorld();
        const box = new Box3().setFromObject(mesh);
        geometry.dispose();
        return [part.id, box];
      }),
    );
    expect(parts).toHaveLength(6);
    expect(bounds.floor.getSize(new Vector3()).x).toBeCloseTo(4, 6);
    expect(bounds.floor.getSize(new Vector3()).z).toBeCloseTo(5, 6);
    expect(bounds.floor.max.y).toBeCloseTo(0, 6);
    expect(bounds.north.max.z).toBeCloseTo(0, 6);
    expect(bounds.south.min.z).toBeCloseTo(5, 6);
    expect(bounds.west.max.x).toBeCloseTo(0, 6);
    expect(bounds.east.min.x).toBeCloseTo(4, 6);
    expect(bounds.ceiling.min.y).toBeCloseTo(2.7, 6);
    expect(bounds.north.getSize(new Vector3()).y).toBeCloseTo(2.7, 6);
  });
  it.each([0, -1, NaN, Infinity, 31])(
    'rejects invalid width %s without changing the room',
    (value) => {
      const room = createRoom(),
        result = applyRoomCommand(room, {
          type: 'dimensions',
          values: { width: value },
        });
      expect(result.error).toBeTruthy();
      expect(result.room).toBe(room);
    },
  );
  it('rejects low and excessive height, invalid materials, and missing evidence', () => {
    const room = createRoom();
    expect(
      applyRoomCommand(room, { type: 'dimensions', values: { height: 1.7 } })
        .error,
    ).toBeTruthy();
    expect(
      applyRoomCommand(room, {
        type: 'wall-material',
        id: 'constructor',
      } as unknown as RoomCommand).error,
    ).toBeTruthy();
    expect(
      validateDimensions({
        ...room.dimensions,
        height: { meters: 2.7, source: 'manufacturer_verified' },
      }),
    ).toMatch(/evidence/);
  });
  it('changes only supplied dimension provenance and stays serializable', () => {
    const original = createRoom(),
      { room } = applyRoomCommand(original, {
        type: 'dimensions',
        values: { width: 4.123456 },
      });
    expect(room.dimensions.width).toEqual({
      meters: 4.123456,
      source: 'user_entered',
    });
    expect(room.dimensions.depth).toBe(original.dimensions.depth);
    expect(JSON.parse(JSON.stringify(room))).toEqual(room);
    expect(original.dimensions.width.source).toBe('sample');
  });
});
describe('unit conversion', () => {
  it('parses whole feet and decimal inches and normalizes display carry', () => {
    expect(parseImperial('10', '6')).toBeCloseTo(3.2004, 9);
    expect(parseImperial('1', '12')).toBeNull();
    expect(parseImperial('1.5', '0')).toBeNull();
    expect(parseImperial('-1', '0')).toBeNull();
    expect(formatLength(11.999 * METERS_PER_INCH, 'imperial')).toBe('1′ 0″');
  });
  it.each(['', 'NaN', 'Infinity', '-2', '1e3', '4abc'])(
    'rejects malformed metric input %s',
    (value) => expect(parseMetric(value)).toBeNull(),
  );
  it('round-trips display parts within 0.013 mm without mutating canonical data', () => {
    for (const m of [1, 2.7, 4.123456789, 30]) {
      const { feet, inches } = imperialParts(m);
      expect(
        Math.abs(parseImperial(String(feet), String(inches))! - m),
      ).toBeLessThan(0.000013);
    }
  });
});
describe('camera framing', () => {
  for (const [width, depth, height] of [
    [1, 1, 1.8],
    [4, 5, 2.7],
    [30, 30, 6],
    [1, 30, 6],
  ])
    for (const aspect of [0.4, 1, 2.4])
      it(`frames ${width}×${depth}×${height} at aspect ${aspect}`, () => {
        const { room } = applyRoomCommand(createRoom(), {
          type: 'dimensions',
          values: { width, depth, height },
        });
        const perspective = frameRoom(room, aspect, 'perspective'),
          overhead = frameRoom(room, aspect, 'overhead');
        const distance = new Vector3(...perspective.position).distanceTo(
          new Vector3(...perspective.target),
        );
        const halfAngle = Math.min(
          (40 * Math.PI) / 360,
          Math.atan(Math.tan((40 * Math.PI) / 360) * aspect),
        );
        expect(distance * Math.sin(halfAngle)).toBeGreaterThan(
          perspective.radius,
        );
        expect(perspective.far).toBeGreaterThan(distance + perspective.radius);
        expect(overhead.halfWidth).toBeGreaterThan(width / 2 + 0.35);
        expect(overhead.halfHeight).toBeGreaterThan(depth / 2 + 0.35);
        expect(overhead.position[0]).toBe(width / 2);
        expect(overhead.position[2]).toBe(depth / 2);
      });
});
