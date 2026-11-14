import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  SaveCoordinator,
  type SaveReport,
} from '@/features/projects/save-coordinator';
import { CloudError } from '@/features/projects/client';
const initial = { raw: 'original', acknowledged: 'original', revision: 1 };
afterEach(() => vi.useRealTimers());
describe('cloud save coordination', () => {
  it('acknowledges only committed data and queues newer edits behind one in-flight save', async () => {
    let resolve!: (v: { revision: number }) => void;
    const write = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
      .mockResolvedValue({ revision: 3 });
    const reports: SaveReport[] = [];
    const c = new SaveCoordinator(initial, write, (r) => reports.push(r));
    c.start();
    c.edit('one');
    const pending = c.flush();
    expect(c.report().status).toBe('saving');
    c.edit('two');
    expect(write).toHaveBeenCalledTimes(1);
    resolve({ revision: 2 });
    await pending;
    expect(c.report()).toMatchObject({
      raw: 'two',
      acknowledged: 'one',
      revision: 2,
      status: 'pending',
    });
    await c.flush();
    expect(write.mock.calls[1].slice(0, 2)).toEqual(['two', 2]);
    expect(c.report().status).toBe('saved');
    c.dispose();
  });
  it('retains failed data and reuses the same idempotency key after an unknown network outcome', async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ revision: 2 });
    const c = new SaveCoordinator(initial, write, () => {});
    c.edit('changed');
    await c.flush();
    const failed = c.report();
    expect(failed.status).toBe('error');
    expect(failed.raw).toBe('changed');
    await c.flush();
    expect(write.mock.calls[0]).toEqual(write.mock.calls[1]);
    expect(c.report()).toMatchObject({
      revision: 2,
      status: 'saved',
      acknowledged: 'changed',
    });
    c.dispose();
  });
  it('preserves pending request and newer edits across route recovery', async () => {
    const write = vi.fn().mockRejectedValue(new Error('lost acknowledgement'));
    const c = new SaveCoordinator(initial, write, () => {});
    c.edit('one');
    await c.flush();
    c.edit('two');
    const memory = c.dispose();
    const restoredWrite = vi
      .fn()
      .mockResolvedValueOnce({ revision: 2 })
      .mockResolvedValueOnce({ revision: 3 });
    const restored = new SaveCoordinator(memory, restoredWrite, () => {});
    await restored.flush();
    expect(restoredWrite.mock.calls[0]).toEqual(write.mock.calls[0]);
    expect(restored.report().status).toBe('pending');
    await restored.flush();
    expect(restoredWrite.mock.calls[1][0]).toBe('two');
    expect(restored.report().status).toBe('saved');
    restored.dispose();
  });
  it.each([
    [409, 'conflict'],
    [401, 'unauthorized'],
  ] as const)('blocks blind retry after HTTP %s', async (status, expected) => {
    const write = vi.fn().mockRejectedValue(new CloudError(status, 'blocked'));
    const c = new SaveCoordinator(initial, write, () => {});
    c.edit('unsaved');
    await c.flush();
    c.edit('newer unsaved');
    c.retry();
    await c.flush();
    expect(c.report()).toMatchObject({
      status: expected,
      raw: 'newer unsaved',
      revision: 1,
    });
    expect(write).toHaveBeenCalledTimes(1);
    c.dispose();
  });
  it('undoing an in-flight edit queues the original rather than claiming it is already saved', async () => {
    let resolve!: (v: { revision: number }) => void;
    const write = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
      .mockResolvedValueOnce({ revision: 3 });
    const c = new SaveCoordinator(initial, write, () => {});
    c.edit('temporary');
    const pending = c.flush();
    c.edit('original');
    resolve({ revision: 2 });
    await pending;
    expect(c.report().status).toBe('pending');
    await c.flush();
    expect(write.mock.calls[1].slice(0, 2)).toEqual(['original', 2]);
    c.dispose();
  });
  it('disposes debounced work and suppresses late acknowledgements', async () => {
    vi.useFakeTimers();
    const notify = vi.fn(),
      write = vi.fn();
    const c = new SaveCoordinator(initial, write, notify);
    c.edit('changed');
    const memory = c.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(write).not.toHaveBeenCalled();
    expect(memory.raw).toBe('changed');
  });
  it('reports a preview failure separately from a successful scene commit', async () => {
    const c = new SaveCoordinator(
      initial,
      async () => ({ revision: 2, thumbnailSaved: false }),
      () => {},
    );
    c.edit('changed');
    await c.flush();
    expect(c.report().status).toBe('saved');
    expect(c.report().message).toContain('preview could not');
    c.dispose();
  });
});

it('resumes a retained unauthorized edit only after verified same-owner sign-in', async () => {
  const write = vi
    .fn()
    .mockRejectedValueOnce(new CloudError(401, 'sign in'))
    .mockResolvedValueOnce({ revision: 2 });
  const c = new SaveCoordinator(
    { ...initial, ownerId: 'owner-a' },
    write,
    () => {},
  );
  c.edit('retained private edit');
  await c.flush();
  expect(c.report().status).toBe('unauthorized');
  c.reauthenticated();
  await vi.waitFor(() => expect(c.report().status).toBe('saved'));
  expect(write.mock.calls[0]).toEqual(write.mock.calls[1]);
  expect(c.report().raw).toBe('retained private edit');
  c.dispose();
});
