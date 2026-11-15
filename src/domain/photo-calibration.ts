import { roomLimits, type Axis } from './room';
export type PhotoPoint = { x: number; y: number };
export type PhotoSegment = [PhotoPoint, PhotoPoint];
export function estimatePhotoDimension(
  reference: PhotoSegment,
  target: PhotoSegment,
  knownMeters: number,
  axis: Axis,
): number {
  if (!Object.hasOwn(roomLimits, axis))
    throw new Error('Choose a room dimension.');
  for (const point of [...reference, ...target]) {
    if (
      ![point.x, point.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
    )
      throw new Error('Points must stay inside the photo.');
  }
  // Coordinates are normalized against the same longest image side, preserving aspect ratio.
  const length = (segment: PhotoSegment) =>
    Math.hypot(segment[1].x - segment[0].x, segment[1].y - segment[0].y);
  const ref = length(reference),
    measured = length(target);
  if (
    !Number.isFinite(knownMeters) ||
    knownMeters <= 0 ||
    knownMeters > 100 ||
    ref < 0.01 ||
    measured < 0.01
  )
    throw new Error(
      'Enter a known length greater than 0 and at most 100 m, and separate each pair of points by at least 1% of the image’s longest side.',
    );
  // Remove floating point ratio noise; this is not a claim of measurement precision.
  const result = Number(((knownMeters * measured) / ref).toPrecision(12));
  const { min, max } = roomLimits[axis];
  if (!Number.isFinite(result) || result < min || result > max)
    throw new Error(
      `Estimated ${axis} must be between ${min} and ${max} m. Recheck the reference and points.`,
    );
  return result;
}
