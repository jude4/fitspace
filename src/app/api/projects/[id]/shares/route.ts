import { createHash, randomBytes } from 'node:crypto';
import {
  ApiError,
  authenticated,
  body,
  databaseError,
  json,
  revision,
  route,
  uuid,
} from '@/lib/api';
import { ownedProject } from '@/features/projects/server';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return route(async () => {
    const { db } = await authenticated(),
      id = uuid((await params).id);
    await ownedProject(db, id);
    const { data, error } = await db
      .from('sharing_permissions')
      .select('id,revision,expires_at,revoked_at,created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    databaseError(error);
    return json(data);
  });
}
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const input = await body(request),
      { db } = await authenticated(),
      id = uuid((await params).id);
    await ownedProject(db, id);
    if (input.action === 'revoke') {
      const share = uuid(input.shareId);
      const row = await db
        .from('sharing_permissions')
        .select('id')
        .eq('project_id', id)
        .eq('id', share)
        .maybeSingle();
      databaseError(row.error);
      if (!row.data) throw new ApiError(404, 'Share unavailable.');
      const { error } = await db.rpc('revoke_share', { p_share: share });
      databaseError(error);
      return json({ ok: true });
    }
    const days = Number(input.days);
    if (!Number.isInteger(days) || days < 1 || days > 30)
      throw new ApiError(400, 'Choose an expiry from 1 to 30 days.');
    const token = randomBytes(32).toString('base64url'),
      expires = new Date(Date.now() + days * 86400000).toISOString();
    const { data, error } = await db.rpc('create_share', {
      p_id: id,
      p_revision: revision(input.revision),
      p_hash: createHash('sha256').update(token).digest('hex'),
      p_expires: expires,
    });
    databaseError(error);
    return json({ id: data, path: `/share#${token}`, expiresAt: expires }, 201);
  });
}
