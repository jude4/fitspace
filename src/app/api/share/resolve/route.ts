import { createHash } from 'node:crypto';
import { ApiError, body, databaseError, json, route } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';
import { scene } from '@/features/projects/server';
export async function POST(request: Request) {
  return route(async () => {
    const input = await body(request);
    if (
      typeof input.token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(input.token)
    )
      throw new ApiError(
        404,
        'This share is unavailable, expired, or revoked.',
      );
    const db = await supabaseServer();
    if (!db) throw new ApiError(503, 'Sharing is not configured.');
    const { data, error } = await db.rpc('resolve_share', {
      p_hash: createHash('sha256').update(input.token).digest('hex'),
    });
    databaseError(error);
    if (!data)
      throw new ApiError(
        404,
        'This share is unavailable, expired, or revoked.',
      );
    return json({ document: scene(data) });
  });
}
