import type { Dimension } from './room';
export type SpatialSettings = {
  clearanceMeters: number;
  doorway: { width: Dimension | null; height: Dimension | null };
};
export const defaultSpatialSettings = (): SpatialSettings => ({
  clearanceMeters: 0.8,
  doorway: { width: null, height: null },
});
export function validateSpatialSettings(s: SpatialSettings): string | null {
  if (
    !Number.isFinite(s.clearanceMeters) ||
    s.clearanceMeters < 0 ||
    s.clearanceMeters > 3
  )
    return 'Clearance guideline must be between 0 and 3 meters.';
  for (const axis of ['width', 'height'] as const) {
    const d = s.doorway[axis];
    if (d === null) continue;
    const min = axis === 'width' ? 0.2 : 0.5,
      max = axis === 'width' ? 5 : 4;
    if (!d || !Number.isFinite(d.meters) || d.meters < min || d.meters > max)
      return `Doorway ${axis} must be between ${min} and ${max} meters, or blank if unknown.`;
    if (d.source !== 'sample' && d.source !== 'user_entered')
      return 'Guest doorway dimensions must be sample or user-entered.';
    if (
      d.uncertaintyMeters !== undefined &&
      (!Number.isFinite(d.uncertaintyMeters) || d.uncertaintyMeters < 0)
    )
      return 'Doorway uncertainty must be finite and nonnegative.';
  }
  return null;
}
