import { StrictMode } from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { useLocalScene, LOCAL_SCENE_KEY } from '@/features/editor/local-scene';
import { useEditorStore } from '@/features/editor/editor-store';
function Probe() {
  const state = useLocalScene();
  return (
    <>
      <output>{state.status}</output>
      <p>{state.message}</p>
      <button onClick={state.replace}>Replace</button>
    </>
  );
}
beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true);
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('hydrates and saves actual scene edits, then restores exact placement data on remount', async () => {
  const view = render(<Probe />);
  await screen.findByText('saved');
  act(() =>
    useEditorStore
      .getState()
      .furniture({ type: 'add', id: 'sofa', productId: 'arc-sofa' }),
  );
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem(LOCAL_SCENE_KEY)!).placements,
    ).toHaveLength(1),
  );
  const scene = useEditorStore.getState().placements;
  view.unmount();
  useEditorStore.setState(useEditorStore.getInitialState(), true);
  render(<Probe />);
  await screen.findByText('saved');
  expect(useEditorStore.getState().placements).toEqual(scene);
});
it('preserves incompatible saved data until explicit replacement', async () => {
  localStorage.setItem(LOCAL_SCENE_KEY, '{"schemaVersion":999}');
  render(<Probe />);
  await screen.findByText('blocked');
  act(() =>
    useEditorStore
      .getState()
      .execute({ type: 'dimensions', values: { width: 6 } }),
  );
  await new Promise((resolve) => setTimeout(resolve, 450));
  expect(localStorage.getItem(LOCAL_SCENE_KEY)).toBe('{"schemaVersion":999}');
  expect(screen.getByText(/will not be overwritten/)).toBeInTheDocument();
});
it('does not report saved on quota failure and retains in-memory changes', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
  render(<Probe />);
  await screen.findByText('error');
  act(() =>
    useEditorStore
      .getState()
      .execute({ type: 'dimensions', values: { width: 7 } }),
  );
  await screen.findByText('error');
  expect(useEditorStore.getState().room.dimensions.width.meters).toBe(7);
  expect(screen.getByText(/still in memory/)).toBeInTheDocument();
});

it('retains unsaved memory across route re-entry instead of loading an older stored scene', async () => {
  const { serializeScene } = await import('@/domain/scene-document');
  const initial = useEditorStore.getState();
  localStorage.setItem(
    LOCAL_SCENE_KEY,
    serializeScene({ room: initial.room, placements: [] }, 'metric'),
  );
  const view = render(<Probe />);
  await screen.findByText('saved');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
  act(() =>
    useEditorStore
      .getState()
      .execute({ type: 'dimensions', values: { width: 7 } }),
  );
  await screen.findByText('error');
  view.unmount();
  render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  );
  await screen.findByText('error');
  expect(useEditorStore.getState().room.dimensions.width.meters).toBe(7);
  expect(
    JSON.parse(localStorage.getItem(LOCAL_SCENE_KEY)!).room.dimensions.width
      .meters,
  ).toBe(4);
});
