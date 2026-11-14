import { authenticated, body, json, route } from '@/lib/api';
import { cleanupPendingAssets } from '@/features/projects/server';
export async function POST(request: Request) {
  return route(async () => {
    await body(request);
    const { db } = await authenticated();
    return json(await cleanupPendingAssets(db));
  });
}
