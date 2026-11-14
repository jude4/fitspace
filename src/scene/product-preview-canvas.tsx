'use client';
import { useState } from 'react';
import { ContextLifecycle } from './context-lifecycle';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Product } from '@/domain/catalog';
import { FurnitureModel } from './furniture-model';
export default function ProductPreviewCanvas({
  product,
  lowQuality,
}: {
  product: Product;
  lowQuality: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const dims = product.dimensions;
  const longest = Math.max(
    dims.width.meters,
    dims.depth.meters,
    dims.height.meters,
  );
  const radius =
    Math.hypot(
      dims.width.meters / longest,
      dims.height.meters / longest,
      dims.depth.meters / longest,
    ) / 2;
  const distance = (radius / Math.sin((18 * Math.PI) / 180)) * 1.1;
  const norm = Math.hypot(1, 0.65, 1.2);
  if (failed)
    return (
      <p role="status">
        The 3D preview lost its graphics context. Close and reopen it to retry;
        sample details and the Add button still work.
      </p>
    );
  return (
    <Canvas
      frameloop="demand"
      dpr={lowQuality ? 0.8 : [1, 1.5]}
      camera={{
        position: [
          distance / norm,
          (distance * 0.65) / norm,
          (distance * 1.2) / norm,
        ],
        fov: 36,
      }}
    >
      <color attach="background" args={['#e9eade']} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 4]} intensity={2} />
      <group
        position={[0, -dims.height.meters / longest / 2, 0]}
        scale={[
          dims.width.meters / longest,
          dims.height.meters / longest,
          dims.depth.meters / longest,
        ]}
      >
        <FurnitureModel
          productId={product.id}
          color={product.variants[0].color}
        />
      </group>
      <ContextLifecycle onFailure={() => setFailed(true)} />
      <OrbitControls
        enablePan={false}
        enableDamping={false}
        minDistance={radius * 1.3}
        maxDistance={6}
      />
    </Canvas>
  );
}
