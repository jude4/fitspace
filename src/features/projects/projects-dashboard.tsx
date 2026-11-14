'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  AccountForm,
  SignOutButton,
  useSignOutBroadcast,
  type AccountState,
} from '@/features/auth/account';
import { createRoom } from '@/domain/room';
import { parseScene, serializeScene } from '@/domain/scene-document';
import { useEditorStore } from '@/features/editor/editor-store';
import { LOCAL_SCENE_KEY } from '@/features/editor/local-scene';
import { api, type ProjectSummary } from './client';
export function ProjectsDashboard() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountState | null>(null),
    [projects, setProjects] = useState<ProjectSummary[]>([]),
    [hasMore, setHasMore] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [name, setName] = useState('My room'),
    [pending, setPending] = useState<{
      requestId: string;
      input: Record<string, unknown>;
    } | null>(null);
  const load = useCallback(async () => {
    try {
      const auth = await api<AccountState>('/api/auth');
      setAccount(auth);
      if (auth.user) {
        const cleanup = await api<{ pending: number }>(
          '/api/projects/cleanup',
          'POST',
          {},
        );
        if (cleanup.pending)
          setError(
            'Some private preview files are waiting for cleanup. You can retry below.',
          );
        const data = await api<{
          projects: ProjectSummary[];
          hasMore: boolean;
        }>('/api/projects');
        setProjects(data.projects);
        setHasMore(data.hasMore);
      } else setProjects([]);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  const accountChanged = useCallback(
    (ownerId?: string) => {
      setProjects([]);
      if (ownerId) {
        void load();
        return false;
      }
    },
    [load],
  );
  useSignOutBroadcast(accountChanged);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  async function create(
    input: Record<string, unknown>,
    requestId = crypto.randomUUID(),
  ) {
    setBusy(true);
    setError('');
    setPending({ requestId, input });
    try {
      const result = await api<{ id: string }>('/api/projects', 'POST', {
        ...input,
        requestId,
      });
      setPending(null);
      router.push(`/workspace/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function action(
    p: ProjectSummary,
    kind: 'rename' | 'duplicate' | 'delete',
  ) {
    if (kind === 'duplicate') {
      await create({
        title: `${p.title.slice(0, 110)} copy`,
        sourceProjectId: p.id,
      });
      return;
    }
    const next =
      kind === 'rename' ? window.prompt('Project name', p.title) : null;
    if (kind === 'rename' && next === null) return;
    if (
      kind === 'delete' &&
      !window.confirm(
        `Delete “${p.title}”, its versions and all share links? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ cleanupComplete?: boolean }>(
        `/api/projects/${p.id}`,
        kind === 'rename' ? 'PATCH' : 'DELETE',
        {
          expectedRevision: p.current_revision,
          ...(kind === 'rename'
            ? { title: next, requestId: crypto.randomUUID() }
            : {}),
        },
      );
      await load();
      if (result.cleanupComplete === false)
        setError(
          'Project deleted. Some private preview files need cleanup; they remain private.',
        );
    } catch (e) {
      setError((e as Error).message);
      await load();
    } finally {
      setBusy(false);
    }
  }
  if (!account) return <p role="status">{error || 'Loading your account…'}</p>;
  if (!account.configured)
    return (
      <section className="account-form">
        <h2>Cloud projects aren’t enabled here</h2>
        <p>
          Accounts are not enabled on this installation. Your guest room remains
          available and saves on this device.
        </p>
        <Button asChild>
          <Link href="/workspace">Open guest workspace</Link>
        </Button>
      </section>
    );
  if (!account.user) return <AccountForm onSignedIn={() => void load()} />;
  return (
    <>
      <div className="project-account">
        <p>Signed in as {account.user.email}</p>
        <SignOutButton />
      </div>
      <section className="project-create">
        <h2>Start a cloud project</h2>
        <label>
          Project name
          <input
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="project-actions">
          <Button
            disabled={busy}
            onClick={() =>
              void create({
                title: name,
                document: parseScene(
                  serializeScene(
                    { room: createRoom(), placements: [] },
                    'metric',
                  ),
                ),
              })
            }
          >
            Create empty project
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              try {
                const s = useEditorStore.getState(),
                  raw = s.localSessionId
                    ? serializeScene(
                        {
                          room: s.room,
                          placements: s.placements,
                          spatial: s.spatial,
                        },
                        s.units,
                      )
                    : localStorage.getItem(LOCAL_SCENE_KEY);
                if (!raw)
                  throw new Error(
                    'No guest design was found. Create one in the guest workspace first.',
                  );
                void create({ title: name, document: parseScene(raw) });
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Import guest design
          </Button>
        </div>
        <p>
          Import copies your current guest design into a new owned project.
          Signing in does not import or overwrite it.
        </p>
      </section>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api<{ pending: number }>(
                  '/api/projects/cleanup',
                  'POST',
                  {},
                );
                setError(
                  result.pending
                    ? 'Some preview files are still waiting for cleanup.'
                    : '',
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Retry preview cleanup
          </Button>
          {pending && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void create(pending.input, pending.requestId)}
            >
              Retry project creation
            </Button>
          )}
        </div>
      )}
      <section aria-label="Your projects">
        <h2>Your projects</h2>
        {!projects.length && (
          <p>No projects yet. Create one or import your guest design.</p>
        )}
        <div className="project-grid">
          {projects.map((p) => (
            <article className="project-card" key={p.id}>
              {p.thumbnail_asset_id && (
                <Image
                  unoptimized
                  src={`/api/projects/${p.id}/thumbnail?revision=${p.current_revision}`}
                  width={320}
                  height={240}
                  alt={`Plan preview of ${p.title}`}
                />
              )}
              <h3>
                <Link href={`/workspace/${p.id}`}>{p.title}</Link>
              </h3>
              <p>
                Revision {p.current_revision} · Updated{' '}
                {new Date(p.updated_at).toLocaleDateString()}
              </p>
              <div className="project-actions">
                {(['rename', 'duplicate', 'delete'] as const).map((kind) => (
                  <Button
                    key={kind}
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void action(p, kind)}
                  >
                    {kind[0].toUpperCase() + kind.slice(1)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
        {hasMore && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const data = await api<{
                  projects: ProjectSummary[];
                  hasMore: boolean;
                }>(`/api/projects?offset=${projects.length}`);
                setProjects([...projects, ...data.projects]);
                setHasMore(data.hasMore);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Load more projects
          </Button>
        )}
      </section>
    </>
  );
}
