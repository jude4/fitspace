import { describe, expect, it, beforeEach } from 'vitest';
import { useDemoStore } from '@/features/landing/demo-store';
import { palettes } from '@/domain/demo';
describe('demo scene state', () => {
  beforeEach(() =>
    useDemoStore.setState({
      palette: 'warm',
      furnished: true,
      motion: false,
      view: 'perspective',
    }),
  );
  it('changes material without resetting furnishing or camera choice', () => {
    const state = useDemoStore.getState();
    state.setFurnished(false);
    state.setView('front');
    state.setPalette('earthy');
    expect(useDemoStore.getState()).toMatchObject({
      palette: 'earthy',
      furnished: false,
      view: 'front',
    });
    expect(palettes[useDemoStore.getState().palette].sofa).not.toBe(
      palettes.warm.sofa,
    );
  });
  it('restores furnishing independently of palette and motion', () => {
    const state = useDemoStore.getState();
    state.setPalette('contrast');
    state.setFurnished(false);
    state.setMotion(true);
    state.setFurnished(true);
    expect(useDemoStore.getState()).toMatchObject({
      palette: 'contrast',
      furnished: true,
      motion: true,
    });
  });
});
