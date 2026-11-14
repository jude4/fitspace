import type { Placement } from './placements';
export type Point2 = { x: number; z: number };
export type Rectangle = {
  center: Point2;
  width: number;
  depth: number;
  yaw: number;
};
export const GEOMETRY_EPSILON = 0.001;
export function rectangleFor(p: Placement): Rectangle {
  return {
    center: { x: p.position.x, z: p.position.z },
    width: p.dimensions.width.meters,
    depth: p.dimensions.depth.meters,
    yaw: p.rotationYRadians,
  };
}
/** Three.js Y rotation: local +X -> (cos, -sin), local +Z -> (sin, cos). */
export function corners(r: Rectangle, expand = 0): Point2[] {
  const w = r.width / 2 + expand,
    d = r.depth / 2 + expand,
    c = Math.cos(r.yaw),
    s = Math.sin(r.yaw);
  return [
    [-w, -d],
    [w, -d],
    [w, d],
    [-w, d],
  ].map(([x, z]) => ({
    x: r.center.x + c * x + s * z,
    z: r.center.z - s * x + c * z,
  }));
}
export function rectanglesOverlap(
  a: Rectangle,
  b: Rectangle,
  epsilon = GEOMETRY_EPSILON,
): boolean {
  const ac = corners(a),
    bc = corners(b);
  const axes = [
    { x: Math.cos(a.yaw), z: -Math.sin(a.yaw) },
    { x: Math.sin(a.yaw), z: Math.cos(a.yaw) },
    { x: Math.cos(b.yaw), z: -Math.sin(b.yaw) },
    { x: Math.sin(b.yaw), z: Math.cos(b.yaw) },
  ];
  return axes.every((axis) => {
    const ap = ac.map((p) => p.x * axis.x + p.z * axis.z),
      bp = bc.map((p) => p.x * axis.x + p.z * axis.z);
    return (
      Math.min(Math.max(...ap), Math.max(...bp)) -
        Math.max(Math.min(...ap), Math.min(...bp)) >
      epsilon
    );
  });
}
function pointSegmentDistance(p: Point2, a: Point2, b: Point2) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    l = dx * dx + dz * dz;
  const t =
    l === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l));
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function rectangleDistance(a: Rectangle, b: Rectangle): number {
  if (rectanglesOverlap(a, b, 0)) return 0;
  const ac = corners(a),
    bc = corners(b);
  let min = Infinity;
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      min = Math.min(
        min,
        pointSegmentDistance(ac[i], bc[j], bc[(j + 1) % 4]),
        pointSegmentDistance(bc[j], ac[i], ac[(i + 1) % 4]),
      );
    }
  return min;
}
export function intervalsOverlap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
  epsilon = GEOMETRY_EPSILON,
) {
  return Math.min(a1, b1) - Math.max(a0, b0) > epsilon;
}
