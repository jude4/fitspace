import {
  defaultSpatialSettings,
  validateSpatialSettings,
  type SpatialSettings,
} from './spatial-settings';
import {
  axes,
  createRoom,
  floorMaterials,
  wallMaterials,
  validateDimensions,
  type Dimensions,
  type Room,
  type Units,
} from './room';
import {
  validatePlacement,
  MAX_PLACEMENTS,
  type Placement,
} from './placements';
export type SceneSnapshot = {
  room: Room;
  placements: Placement[];
  spatial?: SpatialSettings;
};
export type SceneDocument = SceneSnapshot & {
  schemaVersion: 2;
  spatial: SpatialSettings;
  displayUnits: Units;
};
export const MAX_SCENE_BYTES = 1024 * 1024;
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 80): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
function dimensionSet(value: unknown): Dimensions {
  if (!record(value)) throw new Error('Dimensions are missing.');
  const dimensions = {} as Dimensions;
  for (const axis of axes) {
    const d = value[axis];
    if (
      !record(d) ||
      typeof d.meters !== 'number' ||
      !Number.isFinite(d.meters) ||
      ![
        'sample',
        'user_entered',
        'manufacturer_verified',
        'model_inferred',
        'image_estimated',
      ].includes(String(d.source))
    )
      throw new Error('Invalid measurement data.');
    // Current guest files accept only sample or user-entered measurements. No verification authority exists yet.
    if (d.source !== 'sample' && d.source !== 'user_entered')
      throw new Error(
        'Unsupported measurement provenance in this guest scene.',
      );
    dimensions[axis] = { meters: d.meters, source: d.source };
    if (d.uncertaintyMeters !== undefined) {
      if (
        typeof d.uncertaintyMeters !== 'number' ||
        !Number.isFinite(d.uncertaintyMeters) ||
        d.uncertaintyMeters < 0
      )
        throw new Error('Invalid measurement uncertainty.');
      dimensions[axis].uncertaintyMeters = d.uncertaintyMeters;
    }
    if (d.evidence !== undefined) {
      if (
        !record(d.evidence) ||
        !text(d.evidence.reference, 500) ||
        !text(d.evidence.recordedAt) ||
        !Number.isFinite(Date.parse(d.evidence.recordedAt))
      )
        throw new Error('Invalid measurement evidence.');
      dimensions[axis].evidence = {
        reference: d.evidence.reference,
        recordedAt: d.evidence.recordedAt,
      };
    }
  }
  return dimensions;
}
export function parseScene(raw: string): SceneDocument {
  if (new TextEncoder().encode(raw).length > MAX_SCENE_BYTES)
    throw new Error('Scene files are limited to 1 MiB.');
  const v: unknown = JSON.parse(raw);
  if (!record(v) || (v.schemaVersion !== 1 && v.schemaVersion !== 2))
    throw new Error(
      'Unsupported scene version. Keep the original file for recovery.',
    );
  const r = v.room;
  if (
    !record(r) ||
    !text(r.id) ||
    !text(r.name, 120) ||
    !Object.hasOwn(wallMaterials, String(r.wallMaterialId)) ||
    !Object.hasOwn(floorMaterials, String(r.floorMaterialId)) ||
    !Array.isArray(r.openings) ||
    r.openings.length
  )
    throw new Error('Invalid or unsupported room data.');
  const room: Room = {
    ...createRoom(),
    id: r.id,
    name: r.name,
    dimensions: dimensionSet(r.dimensions),
    wallMaterialId: r.wallMaterialId as Room['wallMaterialId'],
    floorMaterialId: r.floorMaterialId as Room['floorMaterialId'],
  };
  const error = validateDimensions(room.dimensions);
  if (error) throw new Error(error);
  if (!Array.isArray(v.placements) || v.placements.length > MAX_PLACEMENTS)
    throw new Error('Scene must contain at most 100 placements.');
  const ids = new Set<string>();
  const placements: Placement[] = v.placements.map((entry: unknown) => {
    if (
      !record(entry) ||
      !text(entry.id) ||
      !text(entry.roomId) ||
      !text(entry.productId) ||
      !text(entry.assetRevisionId) ||
      !text(entry.materialVariantId) ||
      typeof entry.productRevision !== 'number' ||
      typeof entry.rotationYRadians !== 'number' ||
      !record(entry.position)
    )
      throw new Error('Invalid placement data.');
    const pos = entry.position;
    if (
      typeof pos.x !== 'number' ||
      typeof pos.y !== 'number' ||
      typeof pos.z !== 'number'
    )
      throw new Error('Invalid placement position.');
    const p: Placement = {
      id: entry.id,
      roomId: entry.roomId,
      productId: entry.productId,
      productRevision: entry.productRevision,
      assetRevisionId: entry.assetRevisionId,
      materialVariantId: entry.materialVariantId,
      rotationYRadians: entry.rotationYRadians,
      position: { x: pos.x, y: pos.y, z: pos.z },
      dimensions: dimensionSet(entry.dimensions),
    };
    const issue = validatePlacement(p, room.id);
    if (issue) throw new Error(issue);
    if (ids.has(p.id)) throw new Error('Duplicate placement IDs.');
    ids.add(p.id);
    return p;
  });
  if (v.displayUnits !== 'metric' && v.displayUnits !== 'imperial')
    throw new Error('Unknown display units.');
  let spatial = defaultSpatialSettings();
  if (v.schemaVersion === 2) {
    const config = v.spatial;
    if (
      !record(config) ||
      typeof config.clearanceMeters !== 'number' ||
      !record(config.doorway)
    )
      throw new Error('Invalid spatial settings.');
    const dim = (raw: unknown) =>
      raw === null
        ? null
        : dimensionSet({ width: raw, depth: raw, height: raw }).width;
    spatial = {
      clearanceMeters: config.clearanceMeters,
      doorway: {
        width: dim(config.doorway.width),
        height: dim(config.doorway.height),
      },
    };
    const issue = validateSpatialSettings(spatial);
    if (issue) throw new Error(issue);
  }
  return {
    schemaVersion: 2,
    room,
    placements,
    spatial,
    displayUnits: v.displayUnits,
  };
}
export function serializeScene(snapshot: SceneSnapshot, displayUnits: Units) {
  return JSON.stringify({
    schemaVersion: 2,
    ...snapshot,
    spatial: snapshot.spatial ?? defaultSpatialSettings(),
    displayUnits,
  });
}
