import { findProduct, type Product } from './catalog';
import { axes, type Axis, type Dimensions, type Room } from './room';
export type Vec3 = { x: number; y: number; z: number };
export type Placement = {
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
export const MAX_PLACEMENTS = 100;
export function createPlacement(
  product: Product,
  room: Room,
  id: string,
): Placement {
  return {
    id,
    roomId: room.id,
    productId: product.id,
    productRevision: product.revision,
    assetRevisionId: product.assetRevisionId,
    dimensions: structuredClone(product.dimensions),
    position: {
      x: room.dimensions.width.meters / 2,
      y: 0,
      z: room.dimensions.depth.meters / 2,
    },
    rotationYRadians: 0,
    materialVariantId: product.variants[0].id,
  };
}
export function normalizeYaw(value: number) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
export function footprint(placement: Placement) {
  const w = placement.dimensions.width.meters,
    d = placement.dimensions.depth.meters,
    a = placement.rotationYRadians;
  return {
    halfX: (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * d) / 2,
    halfZ: (Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * d) / 2,
  };
}
export function snapPosition(
  placement: Placement,
  position: Vec3,
  room: Room,
  grid: boolean,
  walls: boolean,
): Vec3 {
  let { x, z } = position;
  const bounds = footprint(placement);
  if (grid) {
    x = Math.round(x / 0.1) * 0.1;
    z = Math.round(z / 0.1) * 0.1;
  }
  if (walls) {
    const threshold = 0.2,
      w = room.dimensions.width.meters,
      d = room.dimensions.depth.meters;
    const xTargets = [bounds.halfX, w - bounds.halfX],
      zTargets = [bounds.halfZ, d - bounds.halfZ];
    const nearest = (value: number, targets: number[]) =>
      targets.reduce(
        (best, target) =>
          Math.abs(target - value) < Math.abs(best - value) ? target : best,
        targets[0],
      );
    const targetX = nearest(x, xTargets),
      targetZ = nearest(z, zTargets);
    if (Math.abs(x - targetX) <= threshold) x = targetX;
    if (Math.abs(z - targetZ) <= threshold) z = targetZ;
  }
  return { x, y: 0, z };
}
export function validatePlacement(p: Placement, roomId: string): string | null {
  const product = findProduct(p.productId, p.productRevision);
  if (!product || p.assetRevisionId !== product.assetRevisionId)
    return 'Unknown product or asset revision.';
  if (!/^[\w-]{1,80}$/.test(p.id) || p.roomId !== roomId)
    return 'Invalid placement identity.';
  if (!product.variants.some((v) => v.id === p.materialVariantId))
    return 'Unknown material variant.';
  if (
    !Number.isFinite(p.rotationYRadians) ||
    Math.abs(p.rotationYRadians) > Math.PI + 0.000001
  )
    return 'Invalid furniture rotation.';
  if (
    ![p.position.x, p.position.y, p.position.z].every(
      (v) => Number.isFinite(v) && Math.abs(v) <= 100,
    ) ||
    p.position.y !== 0
  )
    return 'Furniture positions must be finite, within ±100 meters, and on the floor.';
  for (const axis of axes) {
    const dim = p.dimensions[axis],
      range = product.adjustable[axis];
    if (!Number.isFinite(dim.meters) || dim.meters <= 0)
      return 'Invalid product dimensions.';
    if (range) {
      if (
        dim.meters < range.min ||
        dim.meters > range.max ||
        !['sample', 'user_entered'].includes(dim.source)
      )
        return `${axis} is outside this sample’s adjustable range.`;
    } else if (
      dim.meters !== product.dimensions[axis].meters ||
      dim.source !== 'sample'
    )
      return 'Fixed product dimensions cannot be resized or relabeled.';
  }
  return null;
}
export type PlacementUpdate = {
  position?: Vec3;
  rotationYRadians?: number;
  materialVariantId?: string;
  resize?: Partial<Record<Axis, number>>;
};
export function updatePlacement(
  placement: Placement,
  update: PlacementUpdate,
): Placement {
  const next = {
    ...placement,
    position: update.position ?? placement.position,
    rotationYRadians:
      update.rotationYRadians === undefined
        ? placement.rotationYRadians
        : normalizeYaw(update.rotationYRadians),
    materialVariantId: update.materialVariantId ?? placement.materialVariantId,
    dimensions: { ...placement.dimensions },
  };
  if (update.resize)
    for (const axis of axes)
      if (update.resize[axis] !== undefined)
        next.dimensions[axis] = {
          meters: update.resize[axis]!,
          source: 'user_entered',
        };
  return next;
}
