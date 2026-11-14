'use client';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect } from 'react';
import { Vector3 } from 'three';
import { cameraViews, type CameraView, type PaletteId } from '@/domain/demo';
import { RoomGeometry } from './room-geometry';

function Camera({ view, resetKey }: { view: CameraView; resetKey: number }) {
  const { camera, invalidate, size } = useThree();
  useEffect(() => {
    const [x, y, z] = cameraViews[view];
    const scale = Math.max(1, 1.1 / (size.width / size.height));
    camera.position.set(
      3 + (x - 3) * scale,
      0.9 + (y - 0.9) * scale,
      2 + (z - 2) * scale,
    );
    camera.lookAt(new Vector3(3, 0.9, 2));
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, view, invalidate, resetKey, size.width, size.height]);
  return null;
}
function ContextLifecycle({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onFailure);
    return () => canvas.removeEventListener('webglcontextlost', onFailure);
  }, [gl, onFailure]);
  return null;
}
export default function RoomCanvas({
  palette,
  furnished,
  motion,
  view,
  onReady,
  onFailure,
  resetKey,
  lowQuality,
}: {
  palette: PaletteId;
  furnished: boolean;
  motion: boolean;
  view: CameraView;
  onReady: () => void;
  onFailure: () => void;
  resetKey: number;
  lowQuality: boolean;
}) {
  return (
    <Canvas
      shadows={!lowQuality}
      dpr={lowQuality ? 0.75 : [1, 1.5]}
      frameloop={motion ? 'always' : 'demand'}
      camera={{
        position: [...cameraViews.perspective],
        fov: 40,
        near: 0.1,
        far: 150,
      }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#e4e3d9');
        onReady();
      }}
    >
      <color attach="background" args={['#e4e3d9']} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#fff4db', '#a9ab94', 1.7]} />
      <directionalLight
        position={[7, 8, 5]}
        intensity={3.2}
        castShadow={!lowQuality}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-normalBias={0.03}
      />
      <RoomGeometry palette={palette} furnished={furnished} />
      <Camera view={view} resetKey={resetKey} />
      <ContextLifecycle onFailure={onFailure} />
      <OrbitControls
        makeDefault
        target={[3, 0.9, 2]}
        enablePan={false}
        minDistance={5}
        maxDistance={22}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-0.18}
        maxAzimuthAngle={1.25}
        autoRotate={motion}
        autoRotateSpeed={0.3}
        enableDamping={false}
      />
    </Canvas>
  );
}
