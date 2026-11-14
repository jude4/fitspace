import { create } from 'zustand';
import type { CameraView, PaletteId } from '@/domain/demo';
type DemoState = {
  palette: PaletteId;
  furnished: boolean;
  motion: boolean;
  view: CameraView;
  setPalette: (palette: PaletteId) => void;
  setFurnished: (value: boolean) => void;
  setMotion: (value: boolean) => void;
  setView: (view: CameraView) => void;
};
export const useDemoStore = create<DemoState>((set) => ({
  palette: 'warm',
  furnished: true,
  motion: false,
  view: 'perspective',
  setPalette: (palette) => set({ palette }),
  setFurnished: (furnished) => set({ furnished }),
  setMotion: (motion) => set({ motion }),
  setView: (view) => set({ view }),
}));
