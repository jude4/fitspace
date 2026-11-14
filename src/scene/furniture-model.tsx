import { RoundedBox } from '@react-three/drei';
import { furnitureParts, partColor } from '@/domain/catalog';
export function FurnitureModel({
  productId,
  color,
}: {
  productId: string;
  color: string;
}) {
  return (
    <group>
      {furnitureParts(productId).map((part, i) => {
        const material = (
          <meshStandardMaterial
            color={partColor(part.role, color)}
            roughness={part.role === 'metal' ? 0.4 : 0.82}
            metalness={part.role === 'metal' ? 0.35 : 0}
          />
        );
        if (part.rounded)
          return (
            <RoundedBox
              key={i}
              args={part.size}
              position={part.position}
              radius={Math.min(...part.size) / 5}
              smoothness={3}
              bevelSegments={2}
              castShadow
              receiveShadow
            >
              {material}
            </RoundedBox>
          );
        return (
          <mesh
            key={i}
            position={part.position}
            scale={
              part.kind === 'cylinder' || part.kind === 'sphere'
                ? part.size
                : undefined
            }
            castShadow
            receiveShadow
          >
            {part.kind === 'cylinder' ? (
              <cylinderGeometry args={[0.5, 0.5, 1, 24]} />
            ) : part.kind === 'sphere' ? (
              <sphereGeometry args={[0.5, 20, 12]} />
            ) : (
              <boxGeometry args={part.size} />
            )}
            {material}
          </mesh>
        );
      })}
    </group>
  );
}
