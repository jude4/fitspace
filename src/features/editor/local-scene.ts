'use client';
import { useEffect, useRef, useState } from 'react';
import { parseScene, serializeScene } from '@/domain/scene-document';
import { useEditorStore } from './editor-store';
export const LOCAL_SCENE_KEY = 'fitspace.scene.v1';
export const LEGACY_SCENE_BACKUP_KEY = 'fitspace.scene.v1.backup';
export type SaveState = {
  status: 'loading' | 'saving' | 'saved' | 'error' | 'blocked';
  message: string;
  recoveryRaw: string | null;
};
// Failed writes must not cause old storage to replace newer in-memory edits on route re-entry.
let retainedSession: {
  owner: string;
  state: SaveState;
  expectedRaw: string | null;
} | null = null;
export function useLocalScene() {
  const [state, setState] = useState<SaveState>({
    status: 'loading',
    message: 'Loading local scene…',
    recoveryRaw: null,
  });
  const actions = useRef<{
    retry: () => void;
    replace: () => void;
    reload: () => void;
  } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined,
      blocked = false,
      expectedRaw: string | null = null,
      alive = true;
    let lastResult: SaveState = {
      status: 'loading',
      message: 'Loading local scene…',
      recoveryRaw: null,
    };
    const update = (next: SaveState) => {
      lastResult = next;
      if (alive) setState(next);
    };
    function save() {
      if (blocked) return;
      try {
        const previous = window.localStorage.getItem(LOCAL_SCENE_KEY);
        if (previous !== expectedRaw) {
          blocked = true;
          update({
            status: 'blocked',
            message:
              'Another tab changed this scene. Reload saved data or export your current design before replacing it.',
            recoveryRaw: previous,
          });
          return;
        }
        const s = useEditorStore.getState(),
          raw = serializeScene(
            { room: s.room, placements: s.placements, spatial: s.spatial },
            s.units,
          );
        let legacy = false;
        if (previous !== null) {
          try {
            legacy = JSON.parse(previous)?.schemaVersion === 1;
          } catch {
            /* Explicit replacement may discard malformed data after user recovery. */
          }
        }
        if (
          previous !== null &&
          legacy &&
          window.localStorage.getItem(LEGACY_SCENE_BACKUP_KEY) === null
        )
          window.localStorage.setItem(LEGACY_SCENE_BACKUP_KEY, previous);
        window.localStorage.setItem(LOCAL_SCENE_KEY, raw);
        expectedRaw = raw;
        update({
          status: 'saved',
          message: 'Saved on this device',
          recoveryRaw: null,
        });
      } catch {
        update({
          status: 'error',
          message:
            'Local save failed. Your edits are still in memory. Export a backup or retry saving.',
          recoveryRaw: null,
        });
      }
    }
    function schedule() {
      if (blocked) return;
      clearTimeout(timer);
      update({
        status: 'saving',
        message: 'Saving on this device…',
        recoveryRaw: null,
      });
      timer = setTimeout(save, 350);
    }
    function load() {
      clearTimeout(timer);
      try {
        const raw = window.localStorage.getItem(LOCAL_SCENE_KEY);
        expectedRaw = raw;
        if (raw !== null) {
          const scene = parseScene(raw);
          useEditorStore.getState().loadDocument(scene);
          blocked = false;
          update({
            status: 'saved',
            message: 'Saved on this device',
            recoveryRaw: null,
          });
        } else {
          blocked = false;
          schedule();
        }
      } catch (error) {
        blocked = true;
        update({
          status: 'blocked',
          message: `Local scene could not be restored. ${error instanceof Error ? error.message : 'Storage is unavailable.'} Existing saved data will not be overwritten.`,
          recoveryRaw: expectedRaw,
        });
      }
    }
    actions.current = {
      retry: () => {
        if (!blocked) {
          clearTimeout(timer);
          save();
        } else load();
      },
      reload: load,
      replace: () => {
        try {
          expectedRaw = window.localStorage.getItem(LOCAL_SCENE_KEY);
          blocked = false;
          save();
        } catch {
          update({
            status: 'error',
            message:
              'Local storage is unavailable. Export your current scene to keep it.',
            recoveryRaw: null,
          });
        }
      },
    };
    // Hydrate before accepting edits or subscribing to autosave; never overwrite an unread local scene.
    const boot = setTimeout(() => {
      const current = useEditorStore.getState();
      const owner = current.localSessionId ?? crypto.randomUUID();
      useEditorStore.setState({ localSessionId: owner });
      if (retainedSession?.owner === owner) {
        expectedRaw = retainedSession.expectedRaw;
        blocked = retainedSession.state.status === 'blocked';
        update(retainedSession.state);
      } else load();
      unsubscribe = useEditorStore.subscribe((next, previous) => {
        if (
          next.room !== previous.room ||
          next.placements !== previous.placements ||
          next.units !== previous.units ||
          next.spatial !== previous.spatial
        )
          schedule();
      });
    }, 0);
    let unsubscribe = () => {};
    function storage(event: StorageEvent) {
      if (event.key !== LOCAL_SCENE_KEY) return;
      clearTimeout(timer);
      blocked = true;
      update({
        status: 'blocked',
        message:
          'Another tab changed the saved scene. Reload it or export this design before replacing saved data.',
        recoveryRaw: event.newValue,
      });
    }
    window.addEventListener('storage', storage);
    const flush = () => {
      if (timer && !blocked) save();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      alive = false;
      clearTimeout(boot);
      unsubscribe();
      clearTimeout(timer);
      flush();
      const owner = useEditorStore.getState().localSessionId;
      if (lastResult.status !== 'loading')
        retainedSession =
          owner &&
          (lastResult.status === 'error' || lastResult.status === 'blocked')
            ? { owner, state: lastResult, expectedRaw }
            : null;
      actions.current = null;
      window.removeEventListener('storage', storage);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
  return {
    ...state,
    retry: () => actions.current?.retry(),
    replace: () => actions.current?.replace(),
    reload: () => actions.current?.reload(),
  };
}
export function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCurrentScene() {
  const s = useEditorStore.getState();
  downloadText(
    serializeScene(
      { room: s.room, placements: s.placements, spatial: s.spatial },
      s.units,
    ),
    'fitspace-scene.json',
  );
}
