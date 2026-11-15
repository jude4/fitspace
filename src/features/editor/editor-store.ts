import { create } from 'zustand';
import {
  applyRoomCommand,
  createRoom,
  type Room,
  type RoomCommand,
  type RoomElement,
  type Units,
} from '@/domain/room';
import {
  defaultSpatialSettings,
  validateSpatialSettings,
  type SpatialSettings,
} from '@/domain/spatial-settings';
import type { EditorView } from '@/domain/room-camera';
import { findProduct } from '@/domain/catalog';
import {
  createPlacement,
  updatePlacement,
  validatePlacement,
  snapPosition,
  MAX_PLACEMENTS,
  type Placement,
  type PlacementUpdate,
  type Vec3,
} from '@/domain/placements';
import type { SceneDocument, SceneSnapshot } from '@/domain/scene-document';
export type FurnitureCommand =
  | { type: 'add'; productId: string; id: string; position?: Vec3 }
  | { type: 'update'; id: string; update: PlacementUpdate }
  | { type: 'delete'; id: string }
  | { type: 'duplicate'; id: string; newId: string };

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
  spatial: SpatialSettings;
  setSpatial: (settings: SpatialSettings) => boolean;
  showSpatialWarnings: boolean;
  showClearance: boolean;
  setShowSpatialWarnings: (value: boolean) => void;
  setShowClearance: (value: boolean) => void;
  localSessionId: string | null;
  placements: Placement[];
  past: SceneSnapshot[];
  future: SceneSnapshot[];
  selectedPlacementId: string | null;
  dragDraft: { id: string; position: Vec3 } | null;
  snapGrid: boolean;
  snapWalls: boolean;
  showBounds: boolean;
  selectPlacement: (id: string) => void;
  furniture: (command: FurnitureCommand) => boolean;
  beginDrag: (id: string) => void;
  moveDrag: (position: Vec3) => void;
  finishDrag: (cancel?: boolean) => void;
  setSnapGrid: (value: boolean) => void;
  setSnapWalls: (value: boolean) => void;
  setShowBounds: (value: boolean) => void;
  loadDocument: (document: SceneDocument, remember?: boolean) => void;
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
  spatial: defaultSpatialSettings(),
  showSpatialWarnings: true,
  showClearance: false,
  setShowSpatialWarnings: (showSpatialWarnings) => set({ showSpatialWarnings }),
  setShowClearance: (showClearance) => set({ showClearance }),
  setSpatial: (spatial) => {
    const issue = validateSpatialSettings(spatial);
    if (issue) {
      set({ error: issue });
      return false;
    }
    const s = get();
    if (JSON.stringify(s.spatial) === JSON.stringify(spatial)) {
      set({ error: null });
      return true;
    }
    set({
      spatial,
      past: [
        ...s.past,
        { room: s.room, placements: s.placements, spatial: s.spatial },
      ].slice(-HISTORY_LIMIT),
      future: [],
      error: null,
      announcement: 'Spatial guidelines updated.',
    });
    return true;
  },
  localSessionId: null,
  placements: [],
  selectedPlacementId: null,
  dragDraft: null,
  snapGrid: false,
  snapWalls: true,
  showBounds: true,
  selectPlacement: (id) => {
    if (get().placements.some((p) => p.id === id))
      set({ selected: null, selectedPlacementId: id });
  },
  setSnapGrid: (snapGrid) => set({ snapGrid }),
  setSnapWalls: (snapWalls) => set({ snapWalls }),
  setShowBounds: (showBounds) => set({ showBounds }),
  furniture: (command) => {
    const state = get();
    const placements = [...state.placements];
    let selection = state.selectedPlacementId;
    if (command.type === 'add') {
      const product = findProduct(command.productId);
      if (!product) {
        set({ error: 'Unknown sample product.' });
        return false;
      }
      const added = createPlacement(product, state.room, command.id);
      placements.push(
        command.position ? { ...added, position: command.position } : added,
      );
      selection = command.id;
    } else {
      const index = placements.findIndex((p) => p.id === command.id);
      if (index < 0) {
        set({ error: 'Select an existing furniture object.' });
        return false;
      }
      const original = placements[index];
      if (command.type === 'delete') {
        placements.splice(index, 1);
        selection = null;
      } else if (command.type === 'duplicate') {
        placements.push({
          ...structuredClone(original),
          id: command.newId,
          position: {
            ...original.position,
            x: original.position.x + 0.25,
            z: original.position.z + 0.25,
          },
        });
        selection = command.newId;
      } else placements[index] = updatePlacement(original, command.update);
    }
    if (
      placements.length > MAX_PLACEMENTS ||
      new Set(placements.map((p) => p.id)).size !== placements.length
    ) {
      set({ error: 'Scene limit reached or duplicate object ID.' });
      return false;
    }
    for (const p of placements) {
      const error = validatePlacement(p, state.room.id);
      if (error) {
        set({ error });
        return false;
      }
    }
    if (JSON.stringify(placements) === JSON.stringify(state.placements)) {
      set({ error: null });
      return true;
    }
    set({
      placements,
      past: [
        ...state.past,
        {
          room: state.room,
          placements: state.placements,
          spatial: state.spatial,
        },
      ].slice(-HISTORY_LIMIT),
      future: [],
      selected: null,
      selectedPlacementId: selection,
      error: null,
      announcement: 'Furniture updated.',
    });
    return true;
  },
  beginDrag: (id) => {
    const p = get().placements.find((p) => p.id === id);
    if (p)
      set({
        selected: null,
        selectedPlacementId: id,
        dragDraft: { id, position: p.position },
      });
  },
  moveDrag: (position) => {
    const s = get(),
      p = s.placements.find((p) => p.id === s.dragDraft?.id);
    if (p)
      set({
        dragDraft: {
          id: p.id,
          position: snapPosition(p, position, s.room, s.snapGrid, s.snapWalls),
        },
      });
  },
  finishDrag: (cancel = false) => {
    const draft = get().dragDraft;
    set({ dragDraft: null });
    if (draft && !cancel)
      get().furniture({
        type: 'update',
        id: draft.id,
        update: { position: draft.position },
      });
  },
  loadDocument: (document, remember = false) => {
    const s = get();
    set({
      room: document.room,
      spatial: document.spatial,
      placements: document.placements,
      units: document.displayUnits,
      past: remember
        ? [
            ...s.past,
            { room: s.room, placements: s.placements, spatial: s.spatial },
          ].slice(-HISTORY_LIMIT)
        : [],
      future: [],
      selected: 'floor',
      selectedPlacementId: null,
      dragDraft: null,
      error: null,
      resetKey: s.resetKey + 1,
      announcement: 'Local scene loaded.',
    });
  },
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
        command.type === 'photo-dimension'
          ? 'Approximate photo dimension applied. Uncertainty is unknown.'
          : command.type === 'dimensions'
            ? 'Room dimensions updated.'
            : command.type === 'create'
              ? 'Empty room created with sample dimensions.'
              : 'Room materials updated.',
      room: result.room,
      past: [
        ...current.past,
        {
          room: current.room,
          placements: current.placements,
          spatial: current.spatial,
        },
      ].slice(-HISTORY_LIMIT),
      placements: command.type === 'create' ? [] : current.placements,
      spatial:
        command.type === 'create' ? defaultSpatialSettings() : current.spatial,
      selectedPlacementId:
        command.type === 'create' ? null : current.selectedPlacementId,
      dragDraft: null,
      future: [],
      error: null,
    });
    return true;
  },
  undo: () => {
    const { past, room, placements, spatial, future } = get();
    if (!past.length) return;
    set({
      announcement: 'Undid room edit.',
      ...past[past.length - 1],
      selectedPlacementId: null,
      selected: 'floor',
      dragDraft: null,
      past: past.slice(0, -1),
      future: [{ room, placements, spatial }, ...future],
      error: null,
    });
  },
  redo: () => {
    const { future, past, room, placements, spatial } = get();
    if (!future.length) return;
    set({
      announcement: 'Redid room edit.',
      ...future[0],
      selectedPlacementId: null,
      selected: 'floor',
      dragDraft: null,
      past: [...past, { room, placements, spatial }].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      error: null,
    });
  },
  select: (selected) => set({ selected, selectedPlacementId: null }),
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
