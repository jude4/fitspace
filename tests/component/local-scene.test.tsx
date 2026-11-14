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

it('backs up a valid schema-1 scene before the first schema-2 write', async () => {
  const original = JSON.stringify({
    schemaVersion: 1,
    room: useEditorStore.getState().room,
    placements: [],
    displayUnits: 'metric',
  });
  localStorage.setItem(LOCAL_SCENE_KEY, original);
  render(<Probe />);
  await screen.findByText('saved');
  act(() =>
    useEditorStore.getState().setSpatial({
      clearanceMeters: 1.2,
      doorway: {
        width: { meters: 0.9, source: 'user_entered' },
        height: null,
      },
    }),
  );
  await screen.findByText('saved');
  expect(localStorage.getItem('fitspace.scene.v1.backup')).toBe(original);
  const stored = JSON.parse(localStorage.getItem(LOCAL_SCENE_KEY)!);
  expect(stored.schemaVersion).toBe(2);
  expect(stored.spatial.clearanceMeters).toBe(1.2);
});

it('preserves schema-1 data if its required backup cannot be stored', async () => {
  const original = JSON.stringify({
    schemaVersion: 1,
    room: useEditorStore.getState().room,
    placements: [],
    displayUnits: 'metric',
  });
  localStorage.setItem(LOCAL_SCENE_KEY, original);
  const setter = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (key === 'fitspace.scene.v1.backup')
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    return setter.call(this, key, value);
  });
  render(<Probe />);
  await screen.findByText('saved');
  act(() =>
    useEditorStore.getState().setSpatial({
      clearanceMeters: 1.2,
      doorway: { width: null, height: null },
    }),
  );
  await screen.findByText('error');
  expect(localStorage.getItem(LOCAL_SCENE_KEY)).toBe(original);
  expect(useEditorStore.getState().spatial.clearanceMeters).toBe(1.2);
});

it('can explicitly replace malformed JSON without migration inspection blocking recovery', async () => {
  localStorage.setItem(LOCAL_SCENE_KEY, '{broken');
  render(<Probe />);
  await screen.findByText('blocked');
  act(() =>
    useEditorStore
      .getState()
      .execute({ type: 'dimensions', values: { width: 6 } }),
  );
  act(() => screen.getByRole('button', { name: /^Replace$/ }).click());
  await screen.findByText('saved');
  expect(
    JSON.parse(localStorage.getItem(LOCAL_SCENE_KEY)!).room.dimensions.width
      .meters,
  ).toBe(6);
});
