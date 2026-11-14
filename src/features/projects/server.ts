import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseScene, type SceneDocument } from '@/domain/scene-document';
import { ApiError, databaseError } from '@/lib/api';
import { planThumbnail } from './thumbnail';
export function scene(value: unknown) {
  try {
    return parseScene(JSON.stringify(value));
  } catch {
    throw new ApiError(
      400,
      'The scene is invalid or uses an unsupported revision. Export the original for recovery.',
    );
  }
}
export function independentScene(document: SceneDocument): SceneDocument {
  const roomId = crypto.randomUUID();
  return {
    ...document,
    room: { ...document.room, id: roomId },
    placements: document.placements.map((p) => ({
      ...p,
      id: crypto.randomUUID(),
      roomId,
    })),
  };
}
export async function ownedProject(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, 'Project unavailable.');
  return { ...data, current_scene: scene(data.current_scene) };
}
export async function thumbnail(
  db: SupabaseClient,
  owner: string,
  id: string,
  rev: number,
  document: SceneDocument,
) {
  const path = `${owner}/${id}/${rev}.png`,
    png = planThumbnail(document);
  const uploaded = await db.storage
    .from('project-thumbnails')
    .upload(path, png, { contentType: 'image/png', upsert: false });
  if (uploaded.error && String(uploaded.error.statusCode) !== '409')
    return false;
  const { error } = await db.rpc('attach_thumbnail', {
    p_id: id,
    p_revision: rev,
    p_path: path,
    p_bytes: png.length,
  });
  return !error;
}

export async function cleanupPendingAssets(db: SupabaseClient) {
  const { data, error } = await db
    .from('asset_cleanup_jobs')
    .select('id,paths')
    .order('created_at')
    .limit(100);
  databaseError(error);
  let pending = 0;
  for (const job of data!) {
    let complete = true;
    for (let i = 0; i < job.paths.length; i += 100) {
      const result = await db.storage
        .from('project-thumbnails')
        .remove(job.paths.slice(i, i + 100));
      if (result.error) {
        complete = false;
        break;
      }
    }
    if (complete) {
      const { error } = await db.rpc('finish_asset_cleanup', { p_job: job.id });
      if (error) pending++;
    } else pending++;
  }
  const remaining = await db
    .from('asset_cleanup_jobs')
    .select('id', { head: true, count: 'exact' });
  databaseError(remaining.error);
  return { pending: remaining.count ?? Math.max(pending, 1) };
}
