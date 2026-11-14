import {
  axes,
  roomGeometry,
  type Dimensions,
  type MeasurementSource,
  type Room,
} from './room';
import type { Placement } from './placements';
import {
  corners,
  rectangleFor,
  rectanglesOverlap,
  rectangleDistance,
  intervalsOverlap,
  GEOMETRY_EPSILON,
} from './spatial-geometry';
import type { SpatialSettings } from './spatial-settings';
export type FindingCode =
  | 'within-boundary'
  | 'outside-room'
  | 'wall-overlap'
  | 'potential-overlap'
  | 'limited-clearance'
  | 'cannot-determine';
export type Finding = {
  id: string;
  code: FindingCode;
  severity: 'info' | 'warning' | 'error';
  objectIds: string[];
  message: string;
  distanceMeters?: number;
  sources: MeasurementSource[];
  assumptions: string[];
};
export const ANALYSIS_ASSUMPTIONS = [
  'Nominal rectangular dimension envelopes, not exact mesh surfaces.',
  '1 mm numeric tolerance is not measurement accuracy.',
  'Unspecified measurement uncertainty is unknown, not zero.',
];
function validDimensions(d: Dimensions | undefined): d is Dimensions {
  return (
    !!d &&
    axes.every(
      (a) =>
        Number.isFinite(d[a]?.meters) &&
        d[a].meters > 0 &&
        [
          'sample',
          'user_entered',
          'manufacturer_verified',
          'model_inferred',
          'image_estimated',
        ].includes(d[a].source) &&
        (d[a].uncertaintyMeters === undefined ||
          (Number.isFinite(d[a].uncertaintyMeters) &&
            d[a].uncertaintyMeters! >= 0)),
    )
  );
}
const sources = (...sets: Dimensions[]) => [
  ...new Set(sets.flatMap((d) => axes.map((a) => d[a].source))),
];
export function analyzeLayout(
  room: Room,
  placements: Placement[],
  settings: SpatialSettings,
) {
  const findings: Finding[] = [];
  const add = (
    code: FindingCode,
    severity: Finding['severity'],
    objectIds: string[],
    message: string,
    sets: Dimensions[],
    distanceMeters?: number,
  ) =>
    findings.push({
      id: `${code}:${objectIds.join(':')}:${findings.length}`,
      code,
      severity,
      objectIds,
      message,
      sources: sources(...sets),
      assumptions: ANALYSIS_ASSUMPTIONS,
      distanceMeters,
    });
  if (!validDimensions(room.dimensions)) {
    add(
      'cannot-determine',
      'warning',
      [],
      'Cannot determine room bounds: complete positive room measurements are required.',
      [],
    );
    return findings;
  }
  const valid: Placement[] = [];
  const w = room.dimensions.width.meters,
    d = room.dimensions.depth.meters,
    h = room.dimensions.height.meters;
  for (const p of placements) {
    if (
      !validDimensions(p.dimensions) ||
      ![p.position?.x, p.position?.y, p.position?.z, p.rotationYRadians].every(
        Number.isFinite,
      )
    ) {
      add(
        'cannot-determine',
        'warning',
        [p.id],
        'Cannot determine this object’s geometry: complete dimensions and finite transforms are required.',
        [room.dimensions],
      );
      continue;
    }
    valid.push(p);
    const points = corners(rectangleFor(p));
    const minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x)),
      minZ = Math.min(...points.map((p) => p.z)),
      maxZ = Math.max(...points.map((p) => p.z));
    const inside =
      minX >= -GEOMETRY_EPSILON &&
      maxX <= w + GEOMETRY_EPSILON &&
      minZ >= -GEOMETRY_EPSILON &&
      maxZ <= d + GEOMETRY_EPSILON &&
      p.position.y >= -GEOMETRY_EPSILON &&
      p.position.y + p.dimensions.height.meters <= h + GEOMETRY_EPSILON;
    if (!inside)
      add(
        'outside-room',
        'error',
        [p.id],
        'Dimension envelope extends beyond the entered room boundary or height.',
        [room.dimensions, p.dimensions],
      );
    else {
      const sampled = sources(room.dimensions, p.dimensions).some(
        (s) =>
          s === 'sample' || s === 'model_inferred' || s === 'image_estimated',
      );
      add(
        'within-boundary',
        'info',
        [p.id],
        sampled
          ? 'Within nominal sample/estimated boundary; verify real measurements.'
          : 'Within the entered room boundary based on nominal dimensions; not a fit guarantee.',
        [room.dimensions, p.dimensions],
      );
      const gap = Math.max(0, Math.min(minX, w - maxX, minZ, d - maxZ));
      if (
        settings.clearanceMeters > 0 &&
        gap < settings.clearanceMeters - GEOMETRY_EPSILON
      )
        add(
          'limited-clearance',
          'warning',
          [p.id],
          'Limited clearance to a room wall under the all-sides guideline.',
          [room.dimensions, p.dimensions],
          gap,
        );
    }
    for (const wall of roomGeometry(room).filter(
      (part) => !['floor', 'ceiling'].includes(part.id),
    )) {
      const [ww, wh, wd] = wall.size,
        [wx, wy, wz] = wall.position;
      if (
        intervalsOverlap(
          p.position.y,
          p.position.y + p.dimensions.height.meters,
          wy - wh / 2,
          wy + wh / 2,
        ) &&
        rectanglesOverlap(rectangleFor(p), {
          center: { x: wx, z: wz },
          width: ww,
          depth: wd,
          yaw: 0,
        })
      )
        add(
          'wall-overlap',
          'error',
          [p.id],
          `Potential intersection with the ${wall.id} wall envelope.`,
          [room.dimensions, p.dimensions],
        );
    }
  }
  for (let i = 0; i < valid.length; i++)
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i],
        b = valid[j];
      if (
        !intervalsOverlap(
          a.position.y,
          a.position.y + a.dimensions.height.meters,
          b.position.y,
          b.position.y + b.dimensions.height.meters,
        )
      )
        continue;
      if (rectanglesOverlap(rectangleFor(a), rectangleFor(b)))
        add(
          'potential-overlap',
          'error',
          [a.id, b.id],
          'Potential overlap between furniture dimension envelopes.',
          [a.dimensions, b.dimensions],
        );
      else {
        const gap = rectangleDistance(rectangleFor(a), rectangleFor(b));
        if (
          settings.clearanceMeters > 0 &&
          gap < settings.clearanceMeters - GEOMETRY_EPSILON
        )
          add(
            'limited-clearance',
            'warning',
            [a.id, b.id],
            'Limited gap between furniture under the configured guideline.',
            [a.dimensions, b.dimensions],
            gap,
          );
      }
    }
  return findings;
}
export type DoorwayResult = {
  status:
    'requires-measurements' | 'candidate-orientation' | 'no-simple-candidate';
  message: string;
  orientation?: { across: string; vertical: string; along: string };
  margins?: { width: number; height: number };
  sources: MeasurementSource[];
};
export function checkDoorway(
  dimensions: Partial<Dimensions> | undefined,
  doorway: SpatialSettings['doorway'],
): DoorwayResult {
  const width = doorway.width,
    height = doorway.height;
  const sets = dimensions as Dimensions | undefined;
  if (
    !width ||
    !height ||
    !Number.isFinite(width.meters) ||
    !Number.isFinite(height.meters) ||
    width.meters <= 0 ||
    height.meters <= 0 ||
    [width, height].some(
      (d) =>
        d.uncertaintyMeters !== undefined &&
        (!Number.isFinite(d.uncertaintyMeters) || d.uncertaintyMeters < 0),
    ) ||
    !validDimensions(sets)
  )
    return {
      status: 'requires-measurements',
      message:
        'Additional measurements required: enter clear opening width/height and complete object dimensions.',
      sources: [],
    };
  const src = [...new Set([...sources(sets), width.source, height.source])];
  for (const across of axes)
    for (const vertical of axes) {
      if (across === vertical) continue;
      const acrossValue =
          sets![across].meters + (sets![across].uncertaintyMeters ?? 0),
        verticalValue =
          sets![vertical].meters + (sets![vertical].uncertaintyMeters ?? 0);
      const availableWidth = width.meters - (width.uncertaintyMeters ?? 0),
        availableHeight = height.meters - (height.uncertaintyMeters ?? 0);
      if (acrossValue <= availableWidth && verticalValue <= availableHeight)
        return {
          status: 'candidate-orientation',
          message:
            'Dimension-only candidate in one 90° axis orientation. Actual delivery cannot be determined from these measurements alone.',
          orientation: {
            across,
            vertical,
            along: axes.find((a) => a !== across && a !== vertical)!,
          },
          margins: {
            width: availableWidth - acrossValue,
            height: availableHeight - verticalValue,
          },
          sources: src,
        };
    }
  return {
    status: 'no-simple-candidate',
    message:
      'No 90° axis-aligned candidate found. Diagonal motion, disassembly and actual delivery cannot be determined by this check.',
    sources: src,
  };
}
export const doorwayLimitations =
  'Clear opening only. Unknown uncertainty remains unknown. Packaging, handling space, approach/turns, stairs, elevators, door swing, disassembly and continuous tipping/diagonal paths are not evaluated.';
export function compareDimensions(a: Dimensions, b: Dimensions) {
  return axes.map((axis) => ({
    axis,
    a: a[axis],
    b: b[axis],
    differenceMeters: a[axis].meters - b[axis].meters,
  }));
}
