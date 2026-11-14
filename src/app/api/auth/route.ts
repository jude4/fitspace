import { ApiError, body, json, route } from '@/lib/api';
import { supabaseConfig, supabaseServer } from '@/lib/supabase/server';
export async function GET() {
  return route(async () => {
    if (!supabaseConfig()) return json({ configured: false, user: null });
    const db = (await supabaseServer())!;
    const { data } = await db.auth.getUser();
    return json({
      configured: true,
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    });
  });
}
export async function POST(request: Request) {
  return route(async () => {
    const input = await body(request),
      db = await supabaseServer();
    if (!db)
      throw new ApiError(
        503,
        'Accounts are not configured. You can keep using the guest workspace.',
      );
    if (input.action === 'logout') {
      const { error } = await db.auth.signOut({ scope: 'local' });
      if (error)
        throw new ApiError(503, 'Sign-out could not be confirmed. Try again.');
      return json({ ok: true });
    }
    if (
      typeof input.email !== 'string' ||
      input.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
    )
      throw new ApiError(400, 'Enter a valid email address.');
    if (input.action === 'request-code') {
      const { error } = await db.auth.signInWithOtp({
        email: input.email,
        options: { shouldCreateUser: true },
      });
      if (error)
        throw new ApiError(
          429,
          'A code could not be sent. Wait a moment and try again.',
        );
      return json({
        message:
          'If this address can receive mail, a one-time sign-in code has been sent.',
      });
    }
    if (input.action === 'verify-code') {
      if (typeof input.code !== 'string' || !/^\d{6}$/.test(input.code))
        throw new ApiError(400, 'Enter the six-digit email code.');
      const { data, error } = await db.auth.verifyOtp({
        email: input.email,
        token: input.code,
        type: 'email',
      });
      if (error || !data.user)
        throw new ApiError(
          400,
          'The code is invalid or expired. Request a new code.',
        );
      return json({ ok: true, userId: data.user!.id });
    }
    throw new ApiError(400, 'Unknown account action.');
  });
}
