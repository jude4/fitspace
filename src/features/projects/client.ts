export class CloudError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers:
      data === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal,
  });
  const value = await response.json();
  if (!response.ok)
    throw new CloudError(
      response.status,
      value.error ?? 'Cloud request failed.',
    );
  return value as T;
}
export type ProjectSummary = {
  id: string;
  title: string;
  current_revision: number;
  created_at: string;
  updated_at: string;
  thumbnail_asset_id: string | null;
};
export type ProjectRecord = ProjectSummary & {
  owner_id: string;
  current_scene: import('@/domain/scene-document').SceneDocument;
};
