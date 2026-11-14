'use client';
import { useEffect, useState } from 'react';
/** Browser-only capability check shared by the landing demo and measured editor. */
export function useWebGL(retryKey = 0) {
  const [capability, setCapability] = useState<{
    supported: boolean | null;
    lowQuality: boolean;
  }>({ supported: null, lowQuality: false });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = document.createElement('canvas');
      let gl: WebGL2RenderingContext | null = null;
      try {
        gl = canvas.getContext('webgl2');
        const debug = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer =
          gl && debug
            ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
            : '';
        setCapability({
          supported: Boolean(gl),
          lowQuality:
            /swiftshader|llvmpipe|software/i.test(renderer) ||
            navigator.hardwareConcurrency <= 4,
        });
      } catch {
        setCapability({ supported: false, lowQuality: true });
      } finally {
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [retryKey]);
  return capability;
}
