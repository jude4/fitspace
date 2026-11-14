'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_SCENE_BYTES, parseScene } from '@/domain/scene-document';
import { useEditorStore } from './editor-store';
import {
  downloadText,
  exportCurrentScene,
  useLocalScene,
  LEGACY_SCENE_BACKUP_KEY,
} from './local-scene';
export function SceneStorageControls({
  storage,
}: {
  storage: ReturnType<typeof useLocalScene>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [legacyBackup, setLegacyBackup] = useState<string | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setLegacyBackup(localStorage.getItem(LEGACY_SCENE_BACKUP_KEY));
      } catch {
        setLegacyBackup(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [storage.status]);
  return (
    <section className="scene-storage" aria-label="Local scene storage">
      <div className="storage-tools">
        <Button size="sm" variant="outline" onClick={exportCurrentScene}>
          Export scene
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => input.current?.click()}
        >
          Import scene
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import scene file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            if (file.size > MAX_SCENE_BYTES) {
              setError('Scene files are limited to 1 MiB.');
              return;
            }
            try {
              const scene = parseScene(await file.text());
              useEditorStore.getState().loadDocument(scene, true);
              setError('');
            } catch {
              setError(
                'This scene file is invalid or incompatible. The current design was not changed.',
              );
            }
          }}
        />
      </div>
      {legacyBackup !== null && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            downloadText(legacyBackup, 'fitspace-schema1-backup.json')
          }
        >
          Download pre-upgrade backup
        </Button>
      )}
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      {(storage.status === 'blocked' || storage.status === 'error') && (
        <div className="storage-recovery" role="alert">
          <p>{storage.message}</p>
          <Button size="sm" variant="outline" onClick={storage.retry}>
            Retry / reload saved scene
          </Button>
          {storage.recoveryRaw !== null && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadText(
                  storage.recoveryRaw!,
                  'fitspace-saved-recovery.json',
                )
              }
            >
              Download saved data
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={storage.replace}>
            Replace saved data with this scene
          </Button>
          <p>
            Export your current design before reloading. Replacing saved data
            overwrites the stored copy.
          </p>
        </div>
      )}
    </section>
  );
}
