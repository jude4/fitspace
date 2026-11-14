'use client';
import { useCallback, useEffect, useState } from 'react';
import { useWebGL } from '@/lib/use-webgl';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { SceneDocument } from '@/domain/scene-document';
import { parseScene } from '@/domain/scene-document';
import { findProduct } from '@/domain/catalog';
import { formatLength } from '@/domain/units';
import { SceneBoundary } from '@/components/scene-boundary';
import { api } from './client';
import './projects.css';
const SharedCanvas = dynamic(() => import('@/scene/shared-canvas'), {
  ssr: false,
  loading: () => <p>Loading read-only 3D view…</p>,
});
export function SharedView() {
  const [resetKey, setResetKey] = useState(0);
  const [generation, setGeneration] = useState(0),
    [failed, setFailed] = useState(false);
  const { supported, lowQuality } = useWebGL(generation);
  const onFailure = useCallback(() => setFailed(true), []);
  const fallback = (
    <div role="status">
      <p>
        3D view unavailable. Snapshot dimensions and objects remain available
        below.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setFailed(false);
          setGeneration((n) => n + 1);
        }}
      >
        Retry shared preview
      </Button>
    </div>
  );
  const [document, setDocument] = useState<SceneDocument | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    const token = window.location.hash.slice(1);
    void api<{ document: SceneDocument }>(
      '/api/share/resolve',
      'POST',
      { token },
      abort.signal,
    )
      .then((value) => setDocument(parseScene(JSON.stringify(value.document))))
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, []);
  return (
    <main id="main" className="shared-page">
      <Link href="/">FitSpace</Link>
      <h1>Shared room snapshot</h1>
      <p>
        Read-only. Changes to the owner's project are not reflected here. This
        link can expire or be revoked; downloaded content cannot be recalled.
      </p>
      {error && <p role="alert">{error}</p>}
      {!document && !error && <p role="status">Opening shared snapshot…</p>}
      {document && (
        <>
          <h2>{document.room.name}</h2>
          <p>
            {(['width', 'depth', 'height'] as const)
              .map(
                (axis) =>
                  `${axis}: ${formatLength(document.room.dimensions[axis].meters, document.displayUnits)} (${document.room.dimensions[axis].source.replaceAll('_', ' ')})`,
              )
              .join(' · ')}
          </p>
          <div className="shared-canvas">
            {supported === false || failed ? (
              fallback
            ) : supported === null ? (
              <p>Checking 3D support…</p>
            ) : (
              <SceneBoundary key={generation} fallback={fallback}>
                <SharedCanvas
                  document={document}
                  resetKey={resetKey}
                  lowQuality={lowQuality}
                  onFailure={onFailure}
                />
              </SceneBoundary>
            )}
          </div>
          <Button variant="outline" onClick={() => setResetKey((n) => n + 1)}>
            Reset shared view
          </Button>
          <p>
            Focus the preview to pan with arrow keys and zoom with + / −. Drag
            to orbit.
          </p>
          <p>
            Sample geometry and nominal dimensions. No physical-fit or delivery
            guarantee. Orbit or zoom to inspect the view.
          </p>
          <ul className="shared-list">
            {document.placements.map((p) => (
              <li key={p.id}>
                <strong>
                  {findProduct(p.productId, p.productRevision)?.name}
                </strong>
                <br />
                {(['width', 'depth', 'height'] as const)
                  .map((axis) =>
                    formatLength(
                      p.dimensions[axis].meters,
                      document.displayUnits,
                    ),
                  )
                  .join(' × ')}
                <br />
                Sources:{' '}
                {(['width', 'depth', 'height'] as const)
                  .map(
                    (axis) =>
                      `${axis}: ${p.dimensions[axis].source.replaceAll('_', ' ')}`,
                  )
                  .join(' · ')}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
