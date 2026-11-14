import {
  authenticated,
  body,
  databaseError,
  json,
  route,
  title,
  uuid,
  ApiError,
} from '@/lib/api';
import {
  independentScene,
  ownedProject,
  scene,
  thumbnail,
} from '@/features/projects/server';
export async function GET(request: Request) {
  return route(async () => {
    const { db } = await authenticated(),
      offset = Number(new URL(request.url).searchParams.get('offset') ?? 0);
    if (!Number.isInteger(offset) || offset < 0)
      throw new ApiError(400, 'Invalid page.');
    const { data, error } = await db
      .from('projects')
      .select(
        'id,title,current_revision,created_at,updated_at,thumbnail_asset_id',
      )
      .order('updated_at', { ascending: false })
      .order('id')
      .range(offset, offset + 24);
    databaseError(error);
    return json({ projects: data!.slice(0, 24), hasMore: data!.length > 24 });
  });
}
export async function POST(request: Request) {
  return route(async () => {
    const input = await body(request),
      { db, user } = await authenticated(),
      requestId = uuid(input.requestId),
      name = title(input.title);
    const source = input.sourceProjectId
      ? (await ownedProject(db, uuid(input.sourceProjectId))).current_scene
      : scene(input.document);
    const document = independentScene(source),
      id = crypto.randomUUID();
    const { data, error } = await db.rpc('create_project', {
      p_id: id,
      p_title: name,
      p_document: document,
      p_request_id: requestId,
    });
    databaseError(error);
    const existing = await ownedProject(db, data.id);
    const hasThumbnail = await thumbnail(
      db,
      user.id,
      data.id,
      existing.current_revision,
      existing.current_scene,
    );
    return json({ ...data, thumbnailSaved: hasThumbnail }, 201);
  });
}
