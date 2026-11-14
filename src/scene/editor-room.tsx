import { useMemo, useEffect } from 'react';
import { createFloorTexture } from './floor-texture';
import { Edges } from '@react-three/drei';
import { floorMaterials, roomGeometry, wallMaterials } from '@/domain/room';
import { useEditorStore } from '@/features/editor/editor-store';
export function EditorRoom() {
  const { room, visibility, selected, select, grid } = useEditorStore();
  const w = room.dimensions.width.meters,
    d = room.dimensions.depth.meters;
  const floorTexture = useMemo(
    () => createFloorTexture(room.floorMaterialId, w, d),
    [room.floorMaterialId, w, d],
  );
  useEffect(() => () => floorTexture.dispose(), [floorTexture]);
  const lines = useMemo(() => {
    const points: number[] = [];
    for (let x = 0; x <= w; x += 0.5) points.push(x, 0.005, 0, x, 0.005, d);
    for (let z = 0; z <= d; z += 0.5) points.push(0, 0.005, z, w, 0.005, z);
    return new Float32Array(points);
  }, [w, d]);
  return (
    <group name="measured-room">
      {roomGeometry(room).map(
        (part) =>
          visibility[part.id] && (
            <mesh
              key={part.id}
              name={part.id}
              position={part.position}
              onClick={(event) => {
                event.stopPropagation();
                select(part.id);
              }}
              receiveShadow
              castShadow
            >
              <boxGeometry args={part.size} />
              <meshStandardMaterial
                color={
                  part.id === 'floor'
                    ? floorMaterials[room.floorMaterialId].color
                    : wallMaterials[room.wallMaterialId].color
                }
                map={part.id === 'floor' ? floorTexture : undefined}
                roughness={
                  part.id === 'floor' &&
                  (room.floorMaterialId === 'oak' ||
                    room.floorMaterialId === 'walnut')
                    ? 0.72
                    : 0.94
                }
              />
              {selected === part.id && <Edges color="#627a44" threshold={15} />}
            </mesh>
          ),
      )}
      {grid && visibility.floor && (
        <lineSegments raycast={() => {}}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[lines, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#786f5f" transparent opacity={0.27} />
        </lineSegments>
      )}
    </group>
  );
}
