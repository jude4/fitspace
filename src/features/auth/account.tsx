'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { api } from '@/features/projects/client';
import { cloudMemory } from '@/features/projects/save-coordinator';
const AUTH_TAB_ID = crypto.randomUUID();
function broadcastAuthChange(event: string, ownerId?: string) {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel('fitspace-auth');
  channel.postMessage({ event, ownerId, sender: AUTH_TAB_ID });
  channel.close();
}
export type AccountState = {
  configured: boolean;
  user: { id: string; email?: string } | null;
};
export function AccountForm({ onSignedIn }: { onSignedIn?: () => void }) {
  const [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  return (
    <form
      className="account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const result = await api<{ message?: string; userId?: string }>(
            '/api/auth',
            'POST',
            {
              action: sent ? 'verify-code' : 'request-code',
              email,
              code,
            },
          );
          if (sent) {
            if (result.userId) cloudMemory.retainOwner(result.userId);
            else cloudMemory.clear();
            broadcastAuthChange('account-changed', result.userId);
            onSignedIn?.();
          } else {
            setSent(true);
            setMessage(result.message ?? 'Check your email.');
          }
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Sign in or create an account</h2>
      <p>Use a one-time email code. No password to remember or reset.</p>
      <label>
        Email address
        <input
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          disabled={sent || busy}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {sent && (
        <label>
          Six-digit email code
          <input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy
          ? 'Please wait…'
          : sent
            ? 'Verify and sign in'
            : 'Send sign-in code'}
      </Button>
      {sent && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode('');
            setMessage('');
          }}
        >
          Request another code
        </Button>
      )}
      <Link href="/workspace">Continue in the guest workspace</Link>
    </form>
  );
}
export function SignOutButton() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('/api/auth', 'POST', { action: 'logout' });
            cloudMemory.clear();
            broadcastAuthChange('signed-out');
            // A full navigation intentionally destroys private client memory on sign-out.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Account changes must clear private stores and router caches across tabs.
            window.location.href = '/projects';
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        Sign out
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function useSignOutBroadcast(
  onChange?: (ownerId?: string) => void | boolean,
) {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('fitspace-auth');
    channel.onmessage = (event) => {
      if (event.data?.sender === AUTH_TAB_ID) return;
      const ownerId =
        typeof event.data?.ownerId === 'string'
          ? event.data.ownerId
          : undefined;
      if (ownerId) cloudMemory.retainOwner(ownerId);
      else cloudMemory.clear();
      if (onChange?.(ownerId) === false) return;
      // Clear all private memory in this tab when another tab changes account.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Account changes must clear private stores and router caches across tabs.
      window.location.href = '/projects';
    };
    return () => channel.close();
  }, [onChange]);
}
