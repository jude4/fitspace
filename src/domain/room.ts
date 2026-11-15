export type MeasurementSource =
  | 'sample'
  | 'user_entered'
  | 'manufacturer_verified'
  | 'model_inferred'
  | 'image_estimated';
export type Dimension = {
  meters: number;
  source: MeasurementSource;
  evidence?: { reference: string; recordedAt: string };
  uncertaintyMeters?: number;
};
export type Axis = 'width' | 'depth' | 'height';
export type Dimensions = Record<Axis, Dimension>;
export type Units = 'metric' | 'imperial';
export const wallMaterials = {
  plaster: { name: 'Warm plaster', color: '#e1d9ca' },
  chalk: { name: 'Chalk white', color: '#efeee7' },
  sage: { name: 'Soft sage', color: '#a4ad94' },
  clay: { name: 'Muted clay', color: '#c79e83' },
  charcoal: { name: 'Charcoal', color: '#60635c' },
} as const;
export const floorMaterials = {
  oak: { name: 'Natural oak', color: '#bc9d75' },
  walnut: { name: 'Dark walnut', color: '#77553b' },
  stone: { name: 'Limestone', color: '#cbc7ba' },
  concrete: { name: 'Concrete', color: '#a9ada7' },
} as const;
export type WallMaterialId = keyof typeof wallMaterials;
export type FloorMaterialId = keyof typeof floorMaterials;
export type Room = {
  id: string;
  name: string;
  dimensions: Dimensions;
  wallMaterialId: WallMaterialId;
  floorMaterialId: FloorMaterialId;
  openings: [];
};
export type RoomElement =
  'floor' | 'north' | 'east' | 'south' | 'west' | 'ceiling';
export const elements: RoomElement[] = [
  'floor',
  'north',
  'east',
  'south',
  'west',
  'ceiling',
];
export const elementNames: Record<RoomElement, string> = {
  floor: 'Floor',
  north: 'North wall',
  east: 'East wall',
  south: 'South wall',
  west: 'West wall',
  ceiling: 'Ceiling',
};
export const axes: Axis[] = ['width', 'depth', 'height'];
export const roomLimits: Record<Axis, { min: number; max: number }> = {
  width: { min: 1, max: 30 },
  depth: { min: 1, max: 30 },
  height: { min: 1.8, max: 6 },
};
export const presets = {
  studio: { name: 'Compact studio', width: 3, depth: 4, height: 2.5 },
  living: { name: 'Living room', width: 4, depth: 5, height: 2.7 },
  open: { name: 'Open-plan room', width: 8, depth: 10, height: 3 },
} as const;
export type PresetId = keyof typeof presets;
export function createRoom(preset: PresetId = 'living'): Room {
  const p = presets[preset];
  return {
    id: 'guest-room',
    name: p.name,
    dimensions: {
      width: { meters: p.width, source: 'sample' },
      depth: { meters: p.depth, source: 'sample' },
      height: { meters: p.height, source: 'sample' },
    },
    wallMaterialId: 'plaster',
    floorMaterialId: 'oak',
    openings: [],
  };
}
export function validateDimensions(dimensions: Dimensions): string | null {
  for (const axis of axes) {
    const value = dimensions[axis];
    const { min, max } = roomLimits[axis];
    if (
      !Number.isFinite(value.meters) ||
      value.meters < min ||
      value.meters > max
    )
      return `${axis[0].toUpperCase() + axis.slice(1)} must be between ${min} and ${max} meters.`;
    if (
      ![
        'sample',
        'user_entered',
        'manufacturer_verified',
        'model_inferred',
        'image_estimated',
      ].includes(value.source)
    )
      return 'Unknown measurement source.';
    if (
      value.uncertaintyMeters !== undefined &&
      (!Number.isFinite(value.uncertaintyMeters) || value.uncertaintyMeters < 0)
    )
      return 'Measurement uncertainty must be finite and nonnegative.';
    if (
      value.source === 'manufacturer_verified' &&
      (!value.evidence?.reference || !value.evidence.recordedAt)
    )
      return 'Verified dimensions need evidence.';
  }
  return null;
}
export type RoomCommand =
  | { type: 'dimensions'; values: Partial<Record<Axis, number>> }
  | { type: 'photo-dimension'; axis: Axis; meters: number }
  | { type: 'wall-material'; id: WallMaterialId }
  | { type: 'floor-material'; id: FloorMaterialId }
  | { type: 'create'; preset: PresetId };
export function applyRoomCommand(
  room: Room,
  command: RoomCommand,
): { room: Room; error: string | null } {
  let next: Room;
  switch (command.type) {
    case 'photo-dimension':
      if (!axes.includes(command.axis))
        return { room, error: 'Unknown room axis.' };
      next = {
        ...room,
        dimensions: {
          ...room.dimensions,
          [command.axis]: { meters: command.meters, source: 'image_estimated' },
        },
      };
      break;
    case 'create':
      if (!Object.hasOwn(presets, command.preset))
        return { room, error: 'Unknown room preset.' };
      next = { ...createRoom(command.preset), id: room.id };
      break;
    case 'dimensions': {
      const dimensions = { ...room.dimensions };
      for (const axis of axes)
        if (command.values[axis] !== undefined)
          dimensions[axis] = {
            meters: command.values[axis]!,
            source: 'user_entered',
          };
      next = { ...room, dimensions };
      break;
    }
    case 'wall-material':
      if (!Object.hasOwn(wallMaterials, command.id))
        return { room, error: 'Unknown wall material.' };
      next = { ...room, wallMaterialId: command.id };
      break;
    case 'floor-material':
      if (!Object.hasOwn(floorMaterials, command.id))
        return { room, error: 'Unknown floor material.' };
      next = { ...room, floorMaterialId: command.id };
      break;
    default:
      return { room, error: 'Unsupported room command.' };
  }
  const error = validateDimensions(next.dimensions);
  return { room: error ? room : next, error };
}
export type RoomGeometryPart = {
  id: RoomElement;
  size: [number, number, number];
  position: [number, number, number];
};
export const WALL_THICKNESS = 0.12;
/** Inner faces bound [0,width] × [0,height] × [0,depth]; thickness extends outside. */
export function roomGeometry(room: Room): RoomGeometryPart[] {
  const w = room.dimensions.width.meters,
    d = room.dimensions.depth.meters,
    h = room.dimensions.height.meters,
    t = WALL_THICKNESS;
  return [
    { id: 'floor', size: [w, t, d], position: [w / 2, -t / 2, d / 2] },
    { id: 'ceiling', size: [w, t, d], position: [w / 2, h + t / 2, d / 2] },
    { id: 'north', size: [w + 2 * t, h, t], position: [w / 2, h / 2, -t / 2] },
    {
      id: 'south',
      size: [w + 2 * t, h, t],
      position: [w / 2, h / 2, d + t / 2],
    },
    { id: 'west', size: [t, h, d], position: [-t / 2, h / 2, d / 2] },
    { id: 'east', size: [t, h, d], position: [w + t / 2, h / 2, d / 2] },
  ];
}
