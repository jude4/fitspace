import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
export function ContextLifecycle({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onFailure);
    return () => canvas.removeEventListener('webglcontextlost', onFailure);
  }, [gl, onFailure]);
  return null;
}
