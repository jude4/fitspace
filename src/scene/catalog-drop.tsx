import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { findProduct } from '@/domain/catalog';
import { createPlacement, snapPosition } from '@/domain/placements';
import { useEditorStore } from '@/features/editor/editor-store';
export const PRODUCT_DRAG_TYPE = 'application/x-fitspace-product';
export function CatalogDrop() {
  const { gl, camera } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    function drop(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail;
      if (typeof detail !== 'object' || detail === null) return;
      const data = detail as Record<string, unknown>;
      if (
        typeof data.productId !== 'string' ||
        typeof data.x !== 'number' ||
        typeof data.y !== 'number' ||
        !Number.isFinite(data.x) ||
        !Number.isFinite(data.y)
      )
        return;
      const product = findProduct(data.productId);
      if (!product) return;
      const rect = canvas.getBoundingClientRect(),
        raycaster = new Raycaster();
      raycaster.setFromCamera(
        new Vector2(
          ((data.x - rect.left) / rect.width) * 2 - 1,
          (-(data.y - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const point = raycaster.ray.intersectPlane(
        new Plane(new Vector3(0, 1, 0), 0),
        new Vector3(),
      );
      if (!point) return;
      const s = useEditorStore.getState(),
        id = crypto.randomUUID(),
        p = createPlacement(product, s.room, id);
      s.furniture({
        type: 'add',
        productId: product.id,
        id,
        position: snapPosition(
          p,
          { x: point.x, y: 0, z: point.z },
          s.room,
          s.snapGrid,
          s.snapWalls,
        ),
      });
    }
    canvas.addEventListener('fitspace-product-drop', drop);
    return () => canvas.removeEventListener('fitspace-product-drop', drop);
  }, [camera, gl]);
  return null;
}
