import { CloudError } from './client';
export type SaveStatus =
  'saved' | 'pending' | 'saving' | 'error' | 'conflict' | 'unauthorized';
export type SaveMemory = {
  ownerId?: string;
  raw: string;
  revision: number;
  acknowledged: string;
  pending?: { raw: string; requestId: string; expectedRevision: number };
};
export type SaveReport = SaveMemory & { status: SaveStatus; message: string };
type Write = (
  raw: string,
  expectedRevision: number,
  requestId: string,
) => Promise<{ revision: number; thumbnailSaved?: boolean }>;
export class SaveCoordinator {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private busy = false;
  private disposed = false;
  private state: SaveReport;
  constructor(
    memory: SaveMemory,
    private write: Write,
    private notify: (report: SaveReport) => void,
  ) {
    this.state = {
      ...memory,
      status:
        memory.raw === memory.acknowledged && !memory.pending
          ? 'saved'
          : 'pending',
      message: 'Cloud scene loaded.',
    };
  }
  report() {
    return {
      ...this.state,
      pending: this.state.pending ? { ...this.state.pending } : undefined,
    };
  }
  private emit() {
    if (!this.disposed) this.notify(this.report());
  }
  start() {
    this.emit();
    if (this.state.status === 'pending') this.schedule();
  }
  edit(raw: string) {
    if (this.disposed) return;
    this.state.raw = raw;
    if (['error', 'conflict', 'unauthorized'].includes(this.state.status)) {
      this.emit();
      return;
    }
    if (!this.busy) {
      clearTimeout(this.timer);
      this.state.status =
        raw === this.state.acknowledged && !this.state.pending
          ? 'saved'
          : 'pending';
      this.state.message =
        this.state.status === 'saved'
          ? 'Saved to cloud.'
          : 'Changes waiting to save.';
      this.emit();
      if (this.state.status === 'pending') this.schedule();
    }
  }
  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 800);
  }
  async flush() {
    if (
      this.busy ||
      this.disposed ||
      ['conflict', 'unauthorized'].includes(this.state.status)
    )
      return;
    clearTimeout(this.timer);
    if (this.state.raw === this.state.acknowledged && !this.state.pending) {
      this.state.status = 'saved';
      this.emit();
      return;
    }
    this.busy = true;
    this.state.pending ??= {
      raw: this.state.raw,
      expectedRevision: this.state.revision,
      requestId: crypto.randomUUID(),
    };
    const pending = this.state.pending;
    this.state.status = 'saving';
    this.state.message = 'Saving to cloud…';
    this.emit();
    try {
      const result = await this.write(
        pending.raw,
        pending.expectedRevision,
        pending.requestId,
      );
      if (this.disposed) return;
      this.state.revision = result.revision;
      this.state.acknowledged = pending.raw;
      this.state.pending = undefined;
      this.state.status = this.state.raw === pending.raw ? 'saved' : 'pending';
      this.state.message =
        this.state.status === 'saved'
          ? result.thumbnailSaved === false
            ? 'Scene saved; plan preview could not be updated.'
            : 'Saved to cloud.'
          : 'Newer edits waiting to save.';
    } catch (error) {
      if (this.disposed) return;
      this.state.status =
        error instanceof CloudError && error.status === 409
          ? 'conflict'
          : error instanceof CloudError && error.status === 401
            ? 'unauthorized'
            : 'error';
      this.state.message =
        error instanceof Error
          ? error.message
          : 'Cloud save failed. Your edits remain in memory.';
    } finally {
      this.busy = false;
      if (!this.disposed) {
        this.emit();
        if (this.state.status === 'pending') this.schedule();
      }
    }
  }
  retry() {
    if (this.state.status === 'error') {
      this.state.status = 'pending';
      void this.flush();
    }
  }
  reauthenticated() {
    if (this.state.status === 'unauthorized') {
      this.state.status = 'pending';
      void this.flush();
    }
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    return this.report();
  }
}
const retained = new Map<string, SaveMemory>();
export const cloudMemory = {
  get: (id: string) => retained.get(id),
  set: (id: string, value: SaveMemory) => retained.set(id, value),
  delete: (id: string) => retained.delete(id),
  clear: () => retained.clear(),
  retainOwner: (ownerId: string) => {
    for (const [id, memory] of retained)
      if (memory.ownerId !== ownerId) retained.delete(id);
  },
};
