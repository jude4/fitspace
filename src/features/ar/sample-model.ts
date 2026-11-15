import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { furnitureParts, partColor, type Product } from '@/domain/catalog';
/** Same unit-envelope recipes as the editor, scaled in meters, with the pivot on the floor. */
export function createSampleModel(product: Product): Group {
  const group = new Group();
  for (const part of furnitureParts(product.id)) {
    const geometry =
      part.kind === 'sphere'
        ? new SphereGeometry(0.5, 20, 12)
        : part.kind === 'cylinder'
          ? new CylinderGeometry(0.5, 0.5, 1, 24)
          : part.rounded
            ? new RoundedBoxGeometry(
                ...part.size,
                2,
                Math.min(...part.size) / 5,
              )
            : new BoxGeometry(...part.size);
    const mesh = new Mesh(
      geometry,
      new MeshStandardMaterial({
        color: partColor(part.role, product.variants[0].color),
        roughness: part.role === 'metal' ? 0.4 : 0.82,
        metalness: part.role === 'metal' ? 0.35 : 0,
      }),
    );
    mesh.position.set(...part.position);
    if (part.kind === 'sphere' || part.kind === 'cylinder')
      mesh.scale.set(...part.size);
    group.add(mesh);
  }
  group.scale.set(
    product.dimensions.width.meters,
    product.dimensions.height.meters,
    product.dimensions.depth.meters,
  );
  return group;
}
export function disposeModel(group: Group) {
  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((m) => m.dispose());
    }
  });
}
