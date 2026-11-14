'use client';
import { Canvas } from '@react-three/fiber';
import { useEditorStore } from '@/features/editor/editor-store';
import { EditorCamera } from './editor-camera';
import { EditorRoom } from './editor-room';
import { RoomDimensions } from './room-dimensions';
import { ContextLifecycle } from './context-lifecycle';
export default function EditorCanvas({
  lowQuality,
  onReady,
  onFailure,
}: {
  lowQuality: boolean;
  onReady: () => void;
  onFailure: () => void;
}) {
  const select = useEditorStore((s) => s.select);
  return (
    <Canvas
      frameloop="demand"
      dpr={lowQuality ? 0.85 : [1, 1.5]}
      shadows={!lowQuality}
      gl={{ antialias: true, alpha: false }}
      onCreated={() => onReady()}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#e8e9e1']} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#fff7e4', '#a3a88f', 1.8]} />
      <directionalLight
        position={[10, 16, 10]}
        intensity={2}
        castShadow={!lowQuality}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      <EditorRoom />
      <RoomDimensions />
      <EditorCamera />
      <ContextLifecycle onFailure={onFailure} />
    </Canvas>
  );
}
