'use client';
import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Vector3, type PerspectiveCamera as ThreeCamera } from 'three';
import type { SceneDocument } from '@/domain/scene-document';
import { roomGeometry, wallMaterials, floorMaterials } from '@/domain/room';
import { frameRoom } from '@/domain/room-camera';
import { findProduct } from '@/domain/catalog';
import { FurnitureModel } from './furniture-model';
import { ContextLifecycle } from './context-lifecycle';
type Props = {
  document: SceneDocument;
  resetKey: number;
  lowQuality: boolean;
  onFailure: () => void;
};
function SharedContents({ document, resetKey, onFailure }: Props) {
  const { room, placements } = document,
    { size, camera, gl, invalidate } = useThree(),
    controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cameraRef = useRef<ThreeCamera>(null);
  const frame = useMemo(
    () => frameRoom(room, size.width / Math.max(1, size.height), 'perspective'),
    [room, size.width, size.height],
  );
  useEffect(() => {
    const ownedCamera = cameraRef.current;
    if (!ownedCamera) return;
    ownedCamera.position.set(...frame.position);
    ownedCamera.lookAt(...frame.target);
    ownedCamera.updateProjectionMatrix();
    invalidate();
  }, [frame, invalidate, resetKey]);
  useEffect(() => {
    const control = controls.current,
      canvas = gl.domElement;
    control?.listenToKeyEvents(canvas);
    const zoom = (e: KeyboardEvent) => {
      if (!['+', '=', '-'].includes(e.key)) return;
      e.preventDefault();
      const target = new Vector3(...frame.target);
      camera.position
        .sub(target)
        .multiplyScalar(e.key === '-' ? 1.1 : 0.9)
        .add(target);
      control?.update();
      invalidate();
    };
    canvas.addEventListener('keydown', zoom);
    return () => {
      control?.stopListenToKeyEvents();
      canvas.removeEventListener('keydown', zoom);
    };
  }, [camera, frame, gl, invalidate]);
  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={40}
        near={frame.near}
        far={frame.far}
        position={frame.position}
      />
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 10, 8]} intensity={2} />
      <ContextLifecycle onFailure={onFailure} />
      {roomGeometry(room)
        .filter((part) => !['east', 'south', 'ceiling'].includes(part.id))
        .map((part) => (
          <mesh key={part.id} position={part.position}>
            <boxGeometry args={part.size} />
            <meshStandardMaterial
              color={
                part.id === 'floor'
                  ? floorMaterials[room.floorMaterialId].color
                  : wallMaterials[room.wallMaterialId].color
              }
              roughness={0.85}
            />
          </mesh>
        ))}
      {placements.map((p) => {
        const product = findProduct(p.productId, p.productRevision)!;
        return (
          <group
            key={p.id}
            position={[p.position.x, p.position.y, p.position.z]}
            rotation={[0, p.rotationYRadians, 0]}
            scale={[
              p.dimensions.width.meters,
              p.dimensions.height.meters,
              p.dimensions.depth.meters,
            ]}
          >
            <FurnitureModel
              productId={p.productId}
              color={
                product.variants.find((v) => v.id === p.materialVariantId)!
                  .color
              }
            />
          </group>
        );
      })}
      <OrbitControls
        ref={controls}
        target={frame.target}
        minDistance={frame.radius * 0.3}
        maxDistance={frame.far * 0.8}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />
    </>
  );
}
export default function SharedCanvas(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={props.lowQuality ? 1 : [1, 1.5]}
      camera={{ fov: 40 }}
      gl={{ antialias: !props.lowQuality, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#e9ebe0');
        gl.domElement.tabIndex = 0;
        gl.domElement.setAttribute(
          'aria-label',
          'Read-only room preview. Arrow keys pan; plus and minus zoom.',
        );
      }}
    >
      <SharedContents {...props} />
    </Canvas>
  );
}
