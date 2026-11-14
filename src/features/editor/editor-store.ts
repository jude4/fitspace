import { create } from 'zustand';
import {
  applyRoomCommand,
  createRoom,
  type Room,
  type RoomCommand,
  type RoomElement,
  type Units,
} from '@/domain/room';
import type { EditorView } from '@/domain/room-camera';
export const HISTORY_LIMIT = 100;
export type CameraAction =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'rotate-left'
  | 'rotate-right';
type EditorState = {
  room: Room;
  past: Room[];
  future: Room[];
  error: string | null;
  announcement: string;
  selected: RoomElement | null;
  units: Units;
  view: EditorView;
  visibility: Record<RoomElement, boolean>;
  grid: boolean;
  measurements: boolean;
  resetKey: number;
  cameraAction: { type: CameraAction; sequence: number } | null;
  navigateCamera: (type: CameraAction) => void;
  execute: (command: RoomCommand) => boolean;
  undo: () => void;
  redo: () => void;
  select: (element: RoomElement | null) => void;
  setUnits: (units: Units) => void;
  setView: (view: EditorView) => void;
  toggleElement: (element: RoomElement) => void;
  setWalls: (visible: boolean) => void;
  setGrid: (visible: boolean) => void;
  setMeasurements: (visible: boolean) => void;
  resetCamera: () => void;
};
export const useEditorStore = create<EditorState>((set, get) => ({
  room: createRoom(),
  past: [],
  future: [],
  error: null,
  announcement: '',
  selected: 'floor',
  units: 'metric',
  view: 'perspective',
  visibility: {
    floor: true,
    north: true,
    east: false,
    south: false,
    west: true,
    ceiling: false,
  },
  grid: true,
  measurements: true,
  resetKey: 0,
  cameraAction: null,
  navigateCamera: (type) =>
    set((s) => ({
      cameraAction: { type, sequence: (s.cameraAction?.sequence ?? 0) + 1 },
    })),
  execute: (command) => {
    const current = get();
    const result = applyRoomCommand(current.room, command);
    if (result.error) {
      set({ error: result.error, announcement: '' });
      return false;
    }
    if (JSON.stringify(result.room) === JSON.stringify(current.room)) {
      set({ error: null, announcement: 'No room changes to apply.' });
      return true;
    }
    set({
      announcement:
        command.type === 'dimensions'
          ? 'Room dimensions updated.'
          : command.type === 'create'
            ? 'Empty room created with sample dimensions.'
            : 'Room materials updated.',
      room: result.room,
      past: [...current.past, current.room].slice(-HISTORY_LIMIT),
      future: [],
      error: null,
    });
    return true;
  },
  undo: () => {
    const { past, room, future } = get();
    if (!past.length) return;
    set({
      announcement: 'Undid room edit.',
      room: past[past.length - 1],
      past: past.slice(0, -1),
      future: [room, ...future],
      error: null,
    });
  },
  redo: () => {
    const { future, past, room } = get();
    if (!future.length) return;
    set({
      announcement: 'Redid room edit.',
      room: future[0],
      past: [...past, room].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      error: null,
    });
  },
  select: (selected) => set({ selected }),
  setUnits: (units) => set({ units }),
  setView: (view) => set({ view, cameraAction: null }),
  toggleElement: (element) =>
    set((s) => ({
      visibility: { ...s.visibility, [element]: !s.visibility[element] },
    })),
  setWalls: (visible) =>
    set((s) => ({
      visibility: {
        ...s.visibility,
        north: visible,
        east: visible,
        south: visible,
        west: visible,
      },
    })),
  setGrid: (grid) => set({ grid }),
  setMeasurements: (measurements) => set({ measurements }),
  resetCamera: () =>
    set((s) => ({ resetKey: s.resetKey + 1, cameraAction: null })),
}));
