import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseServer } from './supabase/server';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function route(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (e) {
    return json(
      {
        error:
          e instanceof ApiError
            ? e.message
            : 'The request could not be completed. Your edits have not been discarded.',
      },
      e instanceof ApiError ? e.status : 500,
    );
  }
}
export function sameOrigin(request: Request) {
  const incoming = new URL(request.url);
  // Next's internal URL can use localhost behind a reverse proxy. The actual
  // Host header and configured canonical origin preserve the browser boundary.
  if (request.headers.get('host')) incoming.host = request.headers.get('host')!;
  const canonical = process.env.FITSPACE_SITE_URL
    ? new URL(process.env.FITSPACE_SITE_URL).origin
    : null;
  const origin = request.headers.get('origin');
  if (!origin || (origin !== incoming.origin && origin !== canonical))
    throw new ApiError(
      403,
      'Use FitSpace in the same browser tab to make changes.',
    );
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  sameOrigin(request);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, 'Send JSON data.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Request data is missing.');
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 1150000) {
      await reader.cancel();
      throw new ApiError(413, 'Scene request is too large.');
    }
    parts.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new ApiError(400, 'Invalid JSON request.');
  }
}
export function uuid(v: unknown) {
  if (
    typeof v !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v,
    )
  )
    throw new ApiError(400, 'Invalid identifier.');
  return v;
}
export function revision(v: unknown) {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1)
    throw new ApiError(400, 'Invalid project revision.');
  return v;
}
export function title(v: unknown) {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > 120)
    throw new ApiError(400, 'Project names need 1–120 characters.');
  return v.trim();
}
export async function authenticated() {
  const db = await supabaseServer();
  if (!db)
    throw new ApiError(
      503,
      'Cloud projects are not configured. The guest workspace remains available.',
    );
  const { data, error } = await db.auth.getUser();
  if (error || !data.user)
    throw new ApiError(
      401,
      'Sign in again. Your current edits are still available for export.',
    );
  return { db, user: data.user };
}
export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  throw new ApiError(
    error.code === '40001'
      ? 409
      : error.code === '42501'
        ? 404
        : error.code === '22023' || error.code?.startsWith('23')
          ? 400
          : 500,
    error.code === '40001'
      ? 'A newer cloud revision exists. Export your edits, reload the cloud copy, or save a new project.'
      : error.code === '42501'
        ? 'Project unavailable.'
        : 'Cloud changes could not be saved. Your current edits are retained.',
  );
}
