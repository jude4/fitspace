import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scene } from 'three';
const state = vi.hoisted(() => ({
  loop: null as ((time: number, frame: XRFrame) => void) | null,
  scene: null as Scene | null,
  dispose: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement('canvas');
      xr = {
        enabled: false,
        setReferenceSpaceType: vi.fn(),
        setSession: async () => {},
        getReferenceSpace: () => ({}),
      };
      setAnimationLoop(loop: typeof state.loop) {
        state.loop = loop;
      }
      render(scene: Scene) {
        state.scene = scene;
      }
      dispose() {
        state.dispose();
      }
    },
  };
});
import { startAR } from '@/features/ar/xr-session';
import { products } from '@/domain/catalog';
function sessionFixture(fail = false) {
  const events = new EventTarget();
  const session = Object.assign(events, {
    requestReferenceSpace: vi.fn(async () => ({})),
    requestHitTestSource: vi.fn(async () => {
      if (fail) throw new Error('No hit-test support');
      return { cancel: state.cancel };
    }),
    end: vi.fn(async () => {
      events.dispatchEvent(new Event('end'));
    }),
  });
  return session;
}
const frame = (matrix: number[] | null) =>
  ({
    getHitTestResults: () =>
      matrix ? [{ getPose: () => ({ transform: { matrix } }) }] : [],
  }) as unknown as XRFrame;
describe('WebXR placement lifecycle (simulated APIs, not device validation)', () => {
  beforeEach(() => {
    state.loop = null;
    state.scene = null;
    vi.clearAllMocks();
  });
  it('places on horizontal hits, rejects walls/stale hits, rotates without scaling and cleans up on exit', async () => {
    const session = sessionFixture(),
      ended = vi.fn(),
      status = vi.fn();
    const handle = await startAR(
      session as unknown as XRSession,
      products[0],
      status,
      ended,
    );
    const floor = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0, -3, 1];
    state.loop!(0, frame(floor));
    const placement = state.scene!.children[0],
      model = placement.children[0];
    expect(placement.visible).toBe(false);
    session.dispatchEvent(new Event('select'));
    expect(placement.visible).toBe(true);
    expect(placement.position.toArray()).toEqual([2, 0, -3]);
    const scale = model.scale.toArray();
    handle.rotate();
    expect(model.rotation.y).toBeCloseTo(Math.PI / 4);
    expect(model.scale.toArray()).toEqual(scale);
    handle.reset();
    expect(placement.visible).toBe(false);
    const wall = [...floor];
    wall[5] = 0;
    state.loop!(0, frame(wall));
    session.dispatchEvent(new Event('select'));
    expect(placement.visible).toBe(false);
    state.loop!(0, frame(null));
    session.dispatchEvent(new Event('select'));
    expect(placement.visible).toBe(false);
    await handle.end();
    expect(ended).toHaveBeenCalledTimes(1);
    expect(state.dispose).toHaveBeenCalledTimes(1);
    expect(state.cancel).toHaveBeenCalledTimes(1);
    expect(state.loop).toBeNull();
    expect(document.querySelector('.ar-canvas')).toBeNull();
  });
  it('ends the camera session and releases the renderer when hit-test initialization fails', async () => {
    const session = sessionFixture(true),
      ended = vi.fn();
    await expect(
      startAR(session as unknown as XRSession, products[0], vi.fn(), ended),
    ).rejects.toThrow('No hit-test support');
    expect(session.end).toHaveBeenCalledTimes(1);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(state.dispose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.ar-canvas')).toBeNull();
  });
});
