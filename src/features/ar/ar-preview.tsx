'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/domain/catalog';
import type { ARHandle } from './xr-session';
import './ar-preview.css';
export function ARPreview({ product }: { product: Product }) {
  const [supported, setSupported] = useState(false),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [active, setActive] = useState(false),
    [status, setStatus] = useState('Checking AR support…');
  const handle = useRef<ARHandle | null>(null),
    pendingSession = useRef<XRSession | null>(null),
    mounted = useRef(false),
    overlay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const element = overlay.current;
    const preventControlPlacement = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('button'))
        event.preventDefault();
    };
    element?.addEventListener('beforexrselect', preventControlPlacement);
    if (!window.isSecureContext || !navigator.xr) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setStatus(
            'AR is unavailable here. Use the interactive 3D preview and labeled sample dimensions. AR needs HTTPS and a compatible WebXR AR browser/device.',
          );
          setChecking(false);
        }
      });
    } else
      void navigator.xr
        .isSessionSupported('immersive-ar')
        .then((value) => {
          if (!cancelled) {
            setSupported(value);
            setChecking(false);
            setStatus(
              value
                ? 'AR is available to request. Camera permission and horizontal surface detection are required.'
                : 'AR is unavailable on this device. Use the interactive 3D preview and labeled sample dimensions.',
            );
          }
        })
        .catch(() => {
          if (!cancelled) {
            setChecking(false);
            setStatus(
              'AR capability could not be checked. The 3D preview and dimensions remain available.',
            );
          }
        });
    return () => {
      element?.removeEventListener('beforexrselect', preventControlPlacement);
      cancelled = true;
      mounted.current = false;
      void (handle.current?.end() ?? pendingSession.current?.end())?.catch(
        () => {},
      );
    };
  }, []);
  return (
    <section className="ar-preview" aria-label="Augmented reality preview">
      <h3>See this sample in your space</h3>
      <p>
        Experimental WebXR AR · {product.dimensions.width.meters} ×{' '}
        {product.dimensions.depth.meters} × {product.dimensions.height.meters} m
        (W × D × H). Sample dimensions; physical device scale remains
        unverified. No fit or delivery guarantee. Scaling is disabled.
      </p>
      <p role="status">{status}</p>
      <Button
        variant="outline"
        disabled={!supported || checking || busy || active}
        onClick={async () => {
          if (!navigator.xr) return;
          setBusy(true);
          try {
            // Request immediately from the user gesture, before loading renderer code.
            const session = await navigator.xr.requestSession('immersive-ar', {
              requiredFeatures: ['hit-test', 'local-floor'],
              optionalFeatures: ['dom-overlay'],
              domOverlay: overlay.current
                ? { root: overlay.current }
                : undefined,
            });
            pendingSession.current = session;
            if (!mounted.current) {
              await session.end();
              return;
            }
            setActive(true);
            const { startAR } = await import('./xr-session');
            if (!mounted.current) {
              await session.end();
              return;
            }
            handle.current = await startAR(
              session,
              product,
              (text) => {
                if (mounted.current) setStatus(text);
              },
              () => {
                handle.current = null;
                pendingSession.current = null;
                if (mounted.current) {
                  setActive(false);
                  setStatus(
                    'Returned from AR. Your room design is unchanged; the 3D preview remains available.',
                  );
                }
              },
            );
          } catch (error) {
            try {
              await pendingSession.current?.end();
            } catch {
              /* The session may already have ended. */
            }
            pendingSession.current = null;
            if (mounted.current) {
              setActive(false);
              setStatus(
                (error instanceof DOMException &&
                error.name === 'NotAllowedError'
                  ? 'AR permission was denied. '
                  : 'AR could not start or surface detection is unsupported. ') +
                  'You can retry or continue with the 3D preview and dimensions.',
              );
            }
          } finally {
            if (mounted.current) setBusy(false);
          }
        }}
      >
        Try AR at sample scale
      </Button>
      <div
        ref={overlay}
        className={active ? 'ar-overlay ar-overlay-active' : 'ar-overlay'}
      >
        {active && (
          <>
            <p>{status}</p>
            <Button
              onClick={() =>
                void (
                  handle.current?.end() ?? pendingSession.current?.end()
                )?.catch(() => {})
              }
            >
              Return from AR
            </Button>
            <Button onClick={() => handle.current?.rotate()}>
              Rotate sample 45°
            </Button>
            <Button onClick={() => handle.current?.reset()}>
              Reset AR placement
            </Button>
            <p>
              Device system controls can also end AR. Nominal meter scale ·
              device verification pending.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
