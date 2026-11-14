import {
  authenticated,
  body,
  databaseError,
  json,
  route,
  revision,
  title,
  uuid,
} from '@/lib/api';
import {
  cleanupPendingAssets,
  ownedProject,
  scene,
  thumbnail,
} from '@/features/projects/server';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return route(async () => {
    const { db } = await authenticated();
    return json(await ownedProject(db, uuid((await params).id)));
  });
}
export async function PATCH(request: Request, { params }: Context) {
  return route(async () => {
    const input = await body(request),
      id = uuid((await params).id),
      { db, user } = await authenticated();
    const document =
      input.document === undefined ? null : scene(input.document);
    const { data, error } = await db.rpc('save_project', {
      p_id: id,
      p_expected_revision: revision(input.expectedRevision),
      p_document: document,
      p_title: input.title === undefined ? null : title(input.title),
      p_request_id: uuid(input.requestId),
    });
    databaseError(error);
    // Only use the committed revision's own snapshot, including after idempotent retries.
    const version = await db
      .from('scene_versions')
      .select('document')
      .eq('project_id', id)
      .eq('revision', data.revision)
      .single();
    databaseError(version.error);
    return json({
      ...data,
      thumbnailSaved: await thumbnail(
        db,
        user.id,
        id,
        data.revision,
        scene(version.data!.document),
      ),
    });
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return route(async () => {
    const input = await body(request),
      id = uuid((await params).id),
      { db } = await authenticated();
    await ownedProject(db, id);
    const { error } = await db.rpc('delete_project', {
      p_id: id,
      p_expected_revision: revision(input.expectedRevision),
    });
    databaseError(error);
    const cleanup = await cleanupPendingAssets(db).catch(() => ({
      pending: 1,
    }));
    return json({ ok: true, cleanupComplete: cleanup.pending === 0 });
  });
}
