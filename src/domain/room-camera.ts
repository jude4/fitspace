import type { Room } from './room';
export type EditorView = 'perspective' | 'overhead';
export type CameraFrame = {
  target: [number, number, number];
  position: [number, number, number];
  near: number;
  far: number;
  halfWidth: number;
  halfHeight: number;
  radius: number;
};
/** Fit a bounding sphere of the room including thickness and label margin. */
export function frameRoom(
  room: Pick<Room, 'dimensions'>,
  aspect: number,
  view: EditorView,
): CameraFrame {
  const w = room.dimensions.width.meters,
    d = room.dimensions.depth.meters,
    h = room.dimensions.height.meters;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const target: [number, number, number] = [w / 2, h / 2, d / 2];
  const radius = Math.hypot(w + 0.9, h + 0.4, d + 0.9) / 2;
  const halfVertical = (40 * Math.PI) / 360,
    halfHorizontal = Math.atan(Math.tan(halfVertical) * safeAspect);
  const distance =
    (radius / Math.sin(Math.min(halfVertical, halfHorizontal))) * 1.1;
  const direction = [0.9, 0.8, 1.1];
  const magnitude = Math.hypot(...direction);
  const position: [number, number, number] =
    view === 'overhead'
      ? [w / 2, h + distance, d / 2]
      : [
          target[0] + (direction[0] / magnitude) * distance,
          target[1] + (direction[1] / magnitude) * distance,
          target[2] + (direction[2] / magnitude) * distance,
        ];
  const halfHeight = Math.max((d + 0.9) / 2, (w + 0.9) / 2 / safeAspect) * 1.12;
  return {
    target,
    position,
    near: 0.01,
    far: distance + radius * 5 + 100,
    halfWidth: halfHeight * safeAspect,
    halfHeight,
    radius,
  };
}
