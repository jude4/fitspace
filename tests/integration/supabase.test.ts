import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createRoom } from '@/domain/room';
import { createPlacement } from '@/domain/placements';
import { products } from '@/domain/catalog';
import {
  parseScene,
  serializeScene,
  type SceneDocument,
} from '@/domain/scene-document';
import { planThumbnail } from '@/features/projects/thumbnail';
const config = JSON.parse(
  readFileSync('supabase/.temp/test-status.json', 'utf8'),
);
if (!['localhost', '127.0.0.1'].includes(new URL(config.API_URL).hostname))
  throw new Error('Integration tests require the isolated local stack.');
const client = (key: string) =>
  createClient(config.API_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const admin = client(config.SERVICE_ROLE_KEY),
  anonymous = client(config.ANON_KEY);
let a: SupabaseClient,
  b: SupabaseClient,
  owner: string,
  other: string,
  id: string,
  initial: SceneDocument;
const users: string[] = [];
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
async function makeUser() {
  const email = `fitspace-${crypto.randomUUID()}@example.test`,
    password = randomBytes(24).toString('base64url');
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (result.error) throw result.error;
  users.push(result.data.user.id);
  const db = client(config.ANON_KEY);
  const login = await db.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  return { db, id: result.data.user.id };
}
beforeAll(async () => {
  const first = await makeUser(),
    second = await makeUser();
  a = first.db;
  owner = first.id;
  b = second.db;
  other = second.id;
  const room = createRoom();
  room.id = crypto.randomUUID();
  initial = parseScene(
    serializeScene(
      {
        room,
        placements: [createPlacement(products[0], room, crypto.randomUUID())],
      },
      'metric',
    ),
  );
  const result = await a.rpc('create_project', {
    p_id: crypto.randomUUID(),
    p_title: 'Integration room',
    p_document: initial,
    p_request_id: crypto.randomUUID(),
  });
  expect(result.error).toBeNull();
  id = result.data.id;
});
afterAll(async () => {
  for (const user of users) await admin.auth.admin.deleteUser(user);
});
describe('real local Supabase ownership, transactions and shares', () => {
  it('persists and shares photo estimates without accepting verified or furniture photo provenance', async () => {
    const doc = structuredClone(initial);
    doc.room.dimensions.width = { meters: 6, source: 'image_estimated' };
    const projectId = crypto.randomUUID();
    const created = await a.rpc('create_project', {
      p_id: projectId,
      p_title: 'Photo calibration',
      p_document: doc,
      p_request_id: crypto.randomUUID(),
    });
    expect(created.error).toBeNull();
    const record = await a
      .from('projects')
      .select('current_scene')
      .eq('id', projectId)
      .single();
    expect(record.data?.current_scene.room.dimensions.width).toEqual(
      doc.room.dimensions.width,
    );
    expect(
      (await b.from('projects').select('*').eq('id', projectId)).data,
    ).toEqual([]);
    const token = randomBytes(32).toString('base64url');
    expect(
      (
        await a.rpc('create_share', {
          p_id: projectId,
          p_revision: 1,
          p_hash: hash(token),
          p_expires: new Date(Date.now() + 60000).toISOString(),
        })
      ).error,
    ).toBeNull();
    const shared = await anonymous.rpc('resolve_share', {
      p_hash: hash(token),
    });
    expect(shared.data.room.dimensions.width).toEqual(
      doc.room.dimensions.width,
    );
    for (const edit of [
      (d: SceneDocument) => {
        d.room.dimensions.width.source = 'manufacturer_verified';
      },
      (d: SceneDocument) => {
        d.placements[0].dimensions.width.source = 'image_estimated';
      },
    ]) {
      const invalid = structuredClone(doc);
      edit(invalid);
      expect(
        (
          await a.rpc('save_project', {
            p_id: projectId,
            p_expected_revision: 1,
            p_document: invalid,
            p_title: null,
            p_request_id: crypto.randomUUID(),
          })
        ).error?.code,
      ).toBe('22023');
    }
    expect(
      (
        await a.rpc('delete_project', {
          p_id: projectId,
          p_expected_revision: 1,
        })
      ).error,
    ).toBeNull();
  });
  it('creates canonical data, normalized rows and an immutable version atomically', async () => {
    const p = await a.from('projects').select('*').eq('id', id).single();
    expect(p.error).toBeNull();
    expect(p.data.current_scene).toEqual(initial);
    for (const table of ['rooms', 'placements', 'scene_versions']) {
      const r = await a.from(table).select('*').eq('project_id', id);
      expect(r.error).toBeNull();
      expect(r.data).toHaveLength(1);
    }
  });
  it('isolates every private table from another owner and anonymous clients', async () => {
    for (const table of [
      'profiles',
      'projects',
      'rooms',
      'placements',
      'scene_versions',
      'assets',
      'sharing_permissions',
      'asset_cleanup_jobs',
    ]) {
      const column =
        table === 'profiles'
          ? 'id'
          : table === 'projects'
            ? 'id'
            : 'project_id';
      const target = table === 'profiles' ? owner : id;
      const second = await b.from(table).select('*').eq(column, target);
      expect(second.error, table).toBeNull();
      expect(second.data, table).toEqual([]);
      const guest = await anonymous.from(table).select('*').eq(column, target);
      expect(guest.error !== null || guest.data?.length === 0, table).toBe(
        true,
      );
    }
    expect((await b.from('profiles').select('id')).data).toEqual([
      { id: other },
    ]);
    const write = await a
      .from('projects')
      .update({ title: 'direct overwrite' })
      .eq('id', id);
    expect(write.error?.code).toBe('42501');
    const roleChange = await a
      .from('profiles')
      .update({ id: other })
      .eq('id', owner);
    expect(roleChange.error?.code).toBe('42501');
  });
  it('deduplicates an explicitly retried guest import', async () => {
    const request = crypto.randomUUID(),
      first = await a.rpc('create_project', {
        p_id: crypto.randomUUID(),
        p_title: 'Guest import',
        p_document: initial,
        p_request_id: request,
      }),
      retry = await a.rpc('create_project', {
        p_id: crypto.randomUUID(),
        p_title: 'Guest import',
        p_document: initial,
        p_request_id: request,
      });
    expect(first.error).toBeNull();
    expect(retry.error).toBeNull();
    expect(retry.data).toEqual(first.data);
    await a.rpc('delete_project', {
      p_id: first.data.id,
      p_expected_revision: 1,
    });
  });
  it('rejects malformed, relabeled, resized, duplicate and cross-room scenes at the DB boundary', async () => {
    const variants = [
      (d: SceneDocument) => {
        d.room.dimensions.width.meters = 0;
      },
      (d: SceneDocument) => {
        d.placements[0].dimensions.width.meters = 99;
      },
      (d: SceneDocument) => {
        d.placements[0].dimensions.width.source = 'manufacturer_verified';
      },
      (d: SceneDocument) => {
        d.placements.push(d.placements[0]);
      },
      (d: SceneDocument) => {
        d.placements[0].roomId = 'another-room';
      },
    ];
    for (const edit of variants) {
      const doc = structuredClone(initial);
      edit(doc);
      const invalid = await a.rpc('save_project', {
        p_id: id,
        p_expected_revision: 1,
        p_document: doc,
        p_title: null,
        p_request_id: crypto.randomUUID(),
      });
      expect(invalid.error?.code).toBe('22023');
    }
    expect(
      (
        await a
          .from('projects')
          .select('current_revision')
          .eq('id', id)
          .single()
      ).data?.current_revision,
    ).toBe(1);
  });
  it('rejects unauthorized writes and stale revisions while acknowledging idempotent saves', async () => {
    const document = structuredClone(initial);
    document.room.dimensions.width.meters = 6;
    const request = crypto.randomUUID();
    const params = {
      p_id: id,
      p_expected_revision: 1,
      p_document: document,
      p_title: null,
      p_request_id: request,
    };
    expect((await b.rpc('save_project', params)).error?.code).toBe('42501');
    expect((await anonymous.rpc('save_project', params)).error).not.toBeNull();
    expect((await a.rpc('save_project', params)).data?.revision).toBe(2);
    expect((await a.rpc('save_project', params)).data?.revision).toBe(2);
    expect(
      (
        await a.rpc('save_project', {
          ...params,
          p_request_id: crypto.randomUUID(),
        })
      ).error?.code,
    ).toBe('40001');
    expect(
      (await a.from('rooms').select('document').eq('project_id', id).single())
        .data?.document.dimensions.width.meters,
    ).toBe(6);
    expect(
      (
        await a
          .from('scene_versions')
          .select('document')
          .eq('project_id', id)
          .eq('revision', 1)
          .single()
      ).data?.document,
    ).toEqual(initial);
    expect(
      (await a.from('scene_versions').update({ document }).eq('project_id', id))
        .error?.code,
    ).toBe('42501');
    const rename = await a.rpc('save_project', {
      p_id: id,
      p_expected_revision: 2,
      p_document: null,
      p_title: 'Renamed room',
      p_request_id: crypto.randomUUID(),
    });
    expect(rename.data?.revision).toBe(3);
    expect((await a.rpc('save_project', params)).data?.revision).toBe(2); // Lost acknowledgement must not hand out revision 3 for stale local data.
  });
  it('protects stored previews and metadata across owners and paths', async () => {
    const path = `${owner}/${id}/1.png`,
      png = planThumbnail(initial);
    expect(
      (
        await b.storage
          .from('project-thumbnails')
          .upload(path, png, { contentType: 'image/png' })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.storage
          .from('project-thumbnails')
          .upload(path, png, { contentType: 'image/png' })
      ).error,
    ).toBeNull();
    expect(
      (
        await a.rpc('attach_thumbnail', {
          p_id: id,
          p_revision: 1,
          p_path: path,
          p_bytes: png.length,
        })
      ).error,
    ).toBeNull();
    expect(
      (await b.storage.from('project-thumbnails').download(path)).error,
    ).not.toBeNull();
    expect(
      (await anonymous.storage.from('project-thumbnails').download(path)).error,
    ).not.toBeNull();
    expect(
      (await a.storage.from('project-thumbnails').download(path)).error,
    ).toBeNull();
    expect(
      (await b.from('assets').select('*').eq('project_id', id)).data,
    ).toEqual([]);
    expect(
      (
        await b.rpc('attach_thumbnail', {
          p_id: id,
          p_revision: 1,
          p_path: path,
          p_bytes: png.length,
        })
      ).error?.code,
    ).toBe('42501');
    const bad = await a.storage
      .from('project-thumbnails')
      .upload(`${owner}/${id}/bad.svg`, Buffer.from('<svg/>'), {
        contentType: 'image/svg+xml',
      });
    expect(bad.error).not.toBeNull();
  });
  it('resolves only the intentionally shared immutable snapshot and enforces revocation', async () => {
    const token = randomBytes(32).toString('base64url'),
      params = {
        p_id: id,
        p_revision: 1,
        p_hash: hash(token),
        p_expires: new Date(Date.now() + 86400000).toISOString(),
      };
    expect((await b.rpc('create_share', params)).error?.code).toBe('42501');
    const share = await a.rpc('create_share', params);
    expect(share.error).toBeNull();
    const value = await anonymous.rpc('resolve_share', {
      p_hash: hash(token),
    });
    expect(value.error).toBeNull();
    expect(value.data).toEqual(initial);
    expect(value.data.owner_id).toBeUndefined();
    expect(value.data.current_scene).toBeUndefined();
    expect(
      (await b.from('sharing_permissions').select('*').eq('project_id', id))
        .data,
    ).toEqual([]);
    expect(
      (await b.rpc('revoke_share', { p_share: share.data })).error?.code,
    ).toBe('42501');
    expect(
      (await a.rpc('revoke_share', { p_share: share.data })).error,
    ).toBeNull();
    expect(
      (await anonymous.rpc('resolve_share', { p_hash: hash(token) })).data,
    ).toBeNull();
    expect(
      (await anonymous.rpc('resolve_share', { p_hash: hash('unknown') })).data,
    ).toBeNull();
  });
  it('enforces expiry in the database rather than trusting the viewer clock', async () => {
    const token = randomBytes(32).toString('base64url');
    expect(
      (
        await a.rpc('create_share', {
          p_id: id,
          p_revision: 1,
          p_hash: hash(token),
          p_expires: new Date(Date.now() + 1500).toISOString(),
        })
      ).error,
    ).toBeNull();
    expect(
      (await anonymous.rpc('resolve_share', { p_hash: hash(token) })).data,
    ).toEqual(initial);
    await new Promise((r) => setTimeout(r, 1700));
    expect(
      (await anonymous.rpc('resolve_share', { p_hash: hash(token) })).data,
    ).toBeNull();
  });
  it('deletes private projections, versions, metadata and shares; owners can clean up files', async () => {
    expect(
      (await b.rpc('delete_project', { p_id: id, p_expected_revision: 3 }))
        .error?.code,
    ).toBe('42501');
    expect(
      (await a.rpc('delete_project', { p_id: id, p_expected_revision: 2 }))
        .error?.code,
    ).toBe('40001');
    const assets = await a
      .from('assets')
      .select('storage_path')
      .eq('project_id', id);
    expect(
      (await a.rpc('delete_project', { p_id: id, p_expected_revision: 3 }))
        .error,
    ).toBeNull();
    for (const table of [
      'projects',
      'rooms',
      'placements',
      'scene_versions',
      'assets',
      'sharing_permissions',
    ]) {
      const rows = await a
        .from(table)
        .select('*')
        .eq(table === 'projects' ? 'id' : 'project_id', id);
      expect(rows.error).toBeNull();
      expect(rows.data, table).toEqual([]);
    }
    expect(
      (
        await a.storage
          .from('project-thumbnails')
          .remove(assets.data!.map((v) => v.storage_path))
      ).error,
    ).toBeNull();
    const jobs = await a
      .from('asset_cleanup_jobs')
      .select('*')
      .eq('project_id', id);
    expect(jobs.error).toBeNull();
    expect(jobs.data).toHaveLength(1);
    expect(
      (await b.from('asset_cleanup_jobs').select('*').eq('project_id', id))
        .data,
    ).toEqual([]);
    const guestJobs = await anonymous.from('asset_cleanup_jobs').select('*');
    expect(guestJobs.error !== null || guestJobs.data?.length === 0).toBe(true);
    expect(
      (await b.rpc('finish_asset_cleanup', { p_job: jobs.data![0].id })).error
        ?.code,
    ).toBe('42501');
    expect(
      (await a.rpc('finish_asset_cleanup', { p_job: jobs.data![0].id })).error,
    ).toBeNull();
  });
});
