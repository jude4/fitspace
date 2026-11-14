import { authenticated, ApiError, databaseError, route, uuid } from '@/lib/api';
import { ownedProject } from '@/features/projects/server';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    const { db } = await authenticated(),
      p = await ownedProject(db, uuid((await params).id));
    if (!p.thumbnail_asset_id) throw new ApiError(404, 'Preview unavailable.');
    const { data, error } = await db
      .from('assets')
      .select('storage_path')
      .eq('id', p.thumbnail_asset_id)
      .eq('project_id', p.id)
      .single();
    databaseError(error);
    const file = await db.storage
      .from('project-thumbnails')
      .download(data!.storage_path);
    if (file.error) throw new ApiError(404, 'Preview unavailable.');
    return new Response(await file.data.arrayBuffer(), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
}
