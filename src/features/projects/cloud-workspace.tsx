'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { parseScene, serializeScene } from '@/domain/scene-document';
import { useEditorStore } from '@/features/editor/editor-store';
import { Workspace } from '@/features/editor/workspace';
import { downloadText } from '@/features/editor/local-scene';
import { useSignOutBroadcast } from '@/features/auth/account';
import { api, type ProjectRecord } from './client';
import {
  SaveCoordinator,
  cloudMemory,
  type SaveReport,
} from './save-coordinator';
import './projects.css';
function currentRaw() {
  const s = useEditorStore.getState();
  return serializeScene(
    { room: s.room, placements: s.placements, spatial: s.spatial },
    s.units,
  );
}
type Share = {
  id: string;
  revision: number;
  expires_at: string;
  revoked_at: string | null;
};
function CloudControls({
  project,
  report,
  coordinator,
  reload,
}: {
  project: ProjectRecord;
  report: SaveReport;
  coordinator: SaveCoordinator;
  reload: () => void;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [shares, setShares] = useState<Share[]>([]),
    [days, setDays] = useState('7'),
    [link, setLink] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const copyAttempt = useRef<{ raw: string; requestId: string } | null>(null);
  const loadShares = async () => {
    setShares(await api<Share[]>(`/api/projects/${project.id}/shares`));
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      void api<Share[]>(`/api/projects/${project.id}/shares`)
        .then(setShares)
        .catch((e) => setError(e.message));
    }, 0);
    return () => clearTimeout(timer);
  }, [project.id]);
  const unsaved = report.status !== 'saved';
  return (
    <section className="cloud-controls" aria-label="Cloud save and sharing">
      <h3>Cloud project</h3>
      <p role="status" data-testid="cloud-save-message">
        {report.message}
      </p>
      <p>
        Saved revision: {report.revision}. Guest storage is separate. Unsaved
        changes remain in memory while this tab is open; export them before
        closing.
      </p>
      <div className="project-actions">
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadText(report.raw, 'fitspace-cloud-scene.json')}
        >
          Export current scene
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void coordinator.flush()}
          disabled={
            report.status === 'saving' ||
            report.status === 'conflict' ||
            report.status === 'unauthorized'
          }
        >
          Save now
        </Button>
        {report.status === 'error' && (
          <Button size="sm" onClick={() => coordinator.retry()}>
            Retry cloud save
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (
              !unsaved ||
              window.confirm(
                'Reload the cloud copy and discard these in-memory edits? Export them first to keep a backup.',
              )
            )
              reload();
          }}
        >
          Reload cloud copy
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || report.status === 'unauthorized'}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              if (
                !copyAttempt.current ||
                copyAttempt.current.raw !== report.raw
              )
                copyAttempt.current = {
                  raw: report.raw,
                  requestId: crypto.randomUUID(),
                };
              const attempt = copyAttempt.current;
              const copy = await api<{ id: string }>('/api/projects', 'POST', {
                title: `${project.title.slice(0, 110)} copy`,
                requestId: attempt.requestId,
                document: parseScene(attempt.raw),
              });
              router.push(`/workspace/${copy.id}`);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          Save as new project
        </Button>
      </div>
      {report.status === 'unauthorized' && (
        <p>
          <Link href="/projects">Sign in again</Link>. Export first if this tab
          has unsaved changes.
        </p>
      )}
      <h3>Read-only snapshot links</h3>
      <p>
        Share only saved revision {report.revision}. Later edits are private
        until you create another link. Anyone holding a link can read that
        snapshot until expiry or revocation. Previously downloaded content
        cannot be recalled.
      </p>
      <label htmlFor="share-days">Link expiry</label>
      <select
        id="share-days"
        value={days}
        onChange={(e) => setDays(e.target.value)}
      >
        <option value="1">1 day</option>
        <option value="7">7 days</option>
        <option value="30">30 days</option>
      </select>
      <Button
        size="sm"
        disabled={unsaved || busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const share = await api<{ path: string }>(
              `/api/projects/${project.id}/shares`,
              'POST',
              { revision: report.revision, days: Number(days) },
            );
            setLink(new URL(share.path, window.location.origin).href);
            await loadShares();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Create snapshot link
      </Button>
      {link && (
        <>
          <label htmlFor="new-share-link">Copy this link now</label>
          <input
            id="new-share-link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
          />
          <p>
            Only its hash is saved. Existing raw links cannot be retrieved
            later.
          </p>
        </>
      )}
      <ul>
        {shares.map((s) => (
          <li key={s.id}>
            Revision {s.revision} ·{' '}
            {s.revoked_at
              ? 'Revoked'
              : new Date(s.expires_at).getTime() <= now
                ? 'Expired'
                : `Expires ${new Date(s.expires_at).toLocaleString()}`}{' '}
            {!s.revoked_at && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`/api/projects/${project.id}/shares`, 'POST', {
                      action: 'revoke',
                      shareId: s.id,
                    });
                    await loadShares();
                    setLink('');
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Revoke revision {s.revision} link
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function CloudWorkspace({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<{
      project: ProjectRecord;
      report: SaveReport;
      coordinator: SaveCoordinator;
    } | null>(null),
    [error, setError] = useState(''),
    [generation, setGeneration] = useState(0);
  const coordinatorRef = useRef<SaveCoordinator | null>(null);
  const discardOnCleanup = useRef(false);
  const ownerRef = useRef<string | null>(null);
  const clearPrivate = useCallback((ownerId?: string) => {
    if (ownerId && ownerId === ownerRef.current) {
      coordinatorRef.current?.reauthenticated();
      return false;
    }
    discardOnCleanup.current = true;
    coordinatorRef.current?.dispose();
    coordinatorRef.current = null;
    cloudMemory.clear();
    useEditorStore.setState(useEditorStore.getInitialState(), true);
    setLoaded(null);
  }, []);
  useSignOutBroadcast(clearPrivate);
  useEffect(() => {
    let active = true,
      restore: (() => void) | undefined;
    const abort = new AbortController();
    void api<ProjectRecord>(
      `/api/projects/${id}`,
      'GET',
      undefined,
      abort.signal,
    )
      .then((project) => {
        if (!active) return;
        ownerRef.current = project.owner_id;
        const guest = useEditorStore.getState(),
          raw = serializeScene(
            project.current_scene,
            project.current_scene.displayUnits,
          ),
          retained = cloudMemory.get(id);
        const memory =
          retained &&
          retained.ownerId === project.owner_id &&
          retained.raw !== raw
            ? retained
            : {
                raw,
                acknowledged: raw,
                revision: project.current_revision,
                ownerId: project.owner_id,
              };
        useEditorStore.getState().loadDocument(parseScene(memory.raw));
        useEditorStore.setState({ localSessionId: `cloud:${id}` });
        const coordinator = new SaveCoordinator(
          memory,
          async (document, expectedRevision, requestId) =>
            api(
              `/api/projects/${id}`,
              'PATCH',
              { document: parseScene(document), expectedRevision, requestId },
              abort.signal,
            ),
          (report) => {
            if (active) {
              if (report.status === 'saved') cloudMemory.delete(id);
              else cloudMemory.set(id, report);
              setLoaded({ project, report, coordinator });
            }
          },
        );
        coordinatorRef.current = coordinator;
        const unsubscribe = useEditorStore.subscribe((next, previous) => {
          if (
            next.room !== previous.room ||
            next.placements !== previous.placements ||
            next.spatial !== previous.spatial ||
            next.units !== previous.units
          )
            coordinator.edit(currentRaw());
        });
        restore = () => {
          unsubscribe();
          const report = coordinator.dispose();
          if (!discardOnCleanup.current && report.status !== 'saved')
            cloudMemory.set(id, report);
          else cloudMemory.delete(id);
          discardOnCleanup.current = false;
          useEditorStore.setState(guest, true);
          coordinatorRef.current = null;
        };
        coordinator.start();
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      abort.abort();
      restore?.();
    };
  }, [id, generation]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      const report = coordinatorRef.current?.report();
      if (report && report.status !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, []);
  if (!loaded)
    return (
      <main id="main" className="projects-page section-wrap">
        <h1>Your cloud room</h1>
        <p role={error ? 'alert' : 'status'}>
          {error || 'Loading owned cloud project…'}
        </p>
        <Link href="/projects">Back to projects / sign in</Link>
      </main>
    );
  const { project, report, coordinator } = loaded;
  return (
    <Workspace
      session={{
        status:
          report.status === 'saved'
            ? 'saved'
            : report.status === 'pending' || report.status === 'saving'
              ? 'saving'
              : report.status === 'conflict'
                ? 'blocked'
                : 'error',
        message: report.message,
        recoveryRaw: null,
        label: 'Cloud',
        name: project.title,
        controls: (
          <CloudControls
            project={project}
            report={report}
            coordinator={coordinator}
            reload={() => {
              discardOnCleanup.current = true;
              cloudMemory.delete(id);
              setLoaded(null);
              setError('');
              setGeneration((g) => g + 1);
            }}
          />
        ),
      }}
    />
  );
}
