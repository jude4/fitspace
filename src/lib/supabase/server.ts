import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function supabaseConfig() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (process.env.FITSPACE_SITE_URL) {
    const site = new URL(process.env.FITSPACE_SITE_URL);
    if (
      site.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(site.hostname)
    )
      throw new Error(
        'The application origin requires HTTPS outside local development.',
      );
  }
  if (
    parsed.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(parsed.hostname)
  )
    throw new Error('Supabase requires HTTPS outside local development.');
  // The application deliberately has no service-role client: every request is subject to RLS.
  if (key.startsWith('sb_secret_'))
    throw new Error('Use a publishable Supabase key.');
  if (key.split('.').length === 3) {
    const claims = JSON.parse(
      Buffer.from(key.split('.')[1], 'base64url').toString(),
    );
    if (claims.role !== 'anon')
      throw new Error('Use a publishable or anonymous Supabase key.');
  }
  return { url, key };
}
export async function supabaseServer() {
  const config = supabaseConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.FITSPACE_SITE_URL
        ? new URL(process.env.FITSPACE_SITE_URL).protocol === 'https:'
        : process.env.NODE_ENV === 'production',
      path: '/',
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        for (const { name, value, options } of items)
          jar.set(name, value, options);
      },
    },
  });
}
