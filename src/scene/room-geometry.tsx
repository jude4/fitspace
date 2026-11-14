import { RoundedBox } from '@react-three/drei';
import { palettes, demoRoom, type PaletteId } from '@/domain/demo';

function Block({
  position,
  size,
  color,
  radius = 0.03,
  roughness = 0.85,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  radius?: number;
  roughness?: number;
}) {
  if (radius <= 0.03)
    return (
      <mesh position={position} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={roughness} />
      </mesh>
    );
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={3}
      bevelSegments={2}
      position={position}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={roughness} />
    </RoundedBox>
  );
}
function Plant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.18, 0.6, 20]} />
        <meshStandardMaterial color="#8c7760" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <group key={i} rotation={[0, i * 2.4, 0]}>
          <mesh
            position={[0, 0.85 + i * 0.12, 0]}
            rotation={[0, 0, 0.1]}
            castShadow
          >
            <cylinderGeometry args={[0.015, 0.022, 1.3, 6]} />
            <meshStandardMaterial color="#5d5037" />
          </mesh>
          <mesh
            position={[0.19, 0.8 + i * 0.17, 0]}
            rotation={[0, 0, -0.65]}
            scale={[0.33, 0.14, 0.17]}
            castShadow
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial
              color={i % 2 ? '#555d38' : '#74794a'}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
export function RoomGeometry({
  palette,
  furnished,
}: {
  palette: PaletteId;
  furnished: boolean;
}) {
  const p = palettes[palette];
  return (
    <group>
      <Block
        position={[3, -0.12, 2.5]}
        size={[6.1, 0.24, 5.1]}
        color="#b49a76"
      />
      {Array.from({ length: 24 }, (_, i) => (
        <Block
          key={i}
          position={[i * 0.25 + 0.125, 0.006, 2.5]}
          size={[0.243, 0.018, 5]}
          color={i % 3 === 0 ? '#b89b78' : i % 3 === 1 ? '#c2a583' : '#bda07e'}
          radius={0.002}
        />
      ))}
      <Block position={[3, 1.5, -0.08]} size={[6.1, 3, 0.16]} color={p.wall} />
      <Block position={[-0.08, 1.5, 2.5]} size={[0.16, 3, 5]} color={p.wall} />
      <Block
        position={[6.03, 0.15, 2.5]}
        size={[0.1, 0.3, 5]}
        color="#494b40"
      />
      {[0.1, 1.7, 3.3, 4.95].map((z) => (
        <Block
          key={z}
          position={[6, 1.6, z]}
          size={[0.065, 2.8, 0.065]}
          color="#393d34"
          radius={0.005}
        />
      ))}
      <Block position={[6, 2.98, 2.5]} size={[0.08, 0.06, 5]} color="#393d34" />
      <mesh position={[6.03, 1.6, 2.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5, 2.7]} />
        <meshStandardMaterial
          color="#d9e5c8"
          transparent
          opacity={0.11}
          roughness={0.15}
          depthWrite={false}
          side={2}
        />
      </mesh>
      <Block
        position={[3, 0.09, 0.015]}
        size={[6, 0.13, 0.03]}
        color="#e9e3d6"
        radius={0.005}
      />
      {/* Original abstract wall art, no external textures or commercial models. */}
      <Block
        position={[2.35, 1.9, 0.04]}
        size={[1.3, 1.45, 0.07]}
        color={p.wood}
      />
      <Block
        position={[2.35, 1.9, 0.085]}
        size={[1.19, 1.34, 0.025]}
        color="#eee8d9"
        radius={0.002}
      />
      <mesh
        position={[2.2, 2.03, 0.105]}
        rotation={[0, 0, -0.3]}
        scale={[0.27, 0.43, 0.01]}
      >
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#7d735b" />
      </mesh>
      <mesh position={[2.54, 1.65, 0.11]} scale={[0.29, 0.2, 0.01]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#b7a78a" />
      </mesh>
      {furnished && (
        <group name="furnished-interior">
          <Block
            position={[3, 0.045, 2.8]}
            size={[4.4, 0.045, 3.25]}
            color={p.rug}
            radius={0.02}
          />
          {/* Sofa: original sample geometry; sample dimensions, not a real product. */}
          <group position={[2.7, 0, 1.1]}>
            <Block
              position={[0, 0.29, 0]}
              size={[2.85, 0.34, 1.05]}
              color={p.sofa}
              radius={0.14}
            />
            <Block
              position={[0, 0.78, -0.43]}
              size={[2.85, 0.73, 0.28]}
              color={p.sofa}
              radius={0.13}
            />
            {[-1.32, 1.32].map((x) => (
              <Block
                key={x}
                position={[x, 0.62, 0]}
                size={[0.28, 0.65, 1.03]}
                color={p.sofa}
                radius={0.13}
              />
            ))}
            {[-0.63, 0.63].map((x) => (
              <Block
                key={x}
                position={[x, 0.52, 0.03]}
                size={[1.2, 0.22, 0.78]}
                color={p.sofa}
                radius={0.1}
              />
            ))}
            <group rotation={[0.15, 0, 0.15]}>
              <Block
                position={[-0.85, 0.82, -0.15]}
                size={[0.5, 0.49, 0.17]}
                color={p.accent}
                radius={0.07}
              />
            </group>
            <Block
              position={[0.86, 0.81, -0.18]}
              size={[0.48, 0.45, 0.18]}
              color="#c7bda7"
              radius={0.07}
            />
            {[-1.1, 1.1].flatMap((x) =>
              [-0.34, 0.34].map((z) => (
                <Block
                  key={`${x}-${z}`}
                  position={[x, 0.1, z]}
                  size={[0.07, 0.2, 0.07]}
                  color={p.wood}
                  radius={0.01}
                />
              )),
            )}
          </group>
          <group position={[3, 0, 2.9]}>
            <mesh
              position={[0, 0.48, 0]}
              scale={[1.12, 0.1, 0.68]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[1, 1, 1, 64]} />
              <meshStandardMaterial color={p.wood} roughness={0.65} />
            </mesh>
            {[-0.6, 0.6].map((x) => (
              <Block
                key={x}
                position={[x, 0.23, 0]}
                size={[0.16, 0.46, 0.65]}
                color={p.wood}
              />
            ))}
            <Block
              position={[0.3, 0.55, 0.07]}
              size={[0.4, 0.04, 0.3]}
              color="#ddd5c3"
              radius={0.003}
            />
            <Block
              position={[0.31, 0.58, 0.08]}
              size={[0.35, 0.025, 0.27]}
              color="#464c40"
              radius={0.003}
            />
            <mesh position={[-0.32, 0.64, 0]} castShadow>
              <sphereGeometry args={[0.14, 20, 16]} />
              <meshStandardMaterial color="#4f5240" roughness={0.8} />
            </mesh>
            <mesh position={[-0.32, 0.81, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.25, 6]} />
              <meshStandardMaterial color="#6d754c" />
            </mesh>
          </group>
          <group position={[0.95, 0, 3.3]} rotation={[0, 0.6, 0]}>
            <Block
              position={[0, 0.44, 0]}
              size={[0.85, 0.18, 0.8]}
              color="#a29c86"
              radius={0.09}
            />
            <Block
              position={[0, 0.8, -0.33]}
              size={[0.85, 0.65, 0.13]}
              color="#a29c86"
              radius={0.06}
            />
            {[-0.43, 0.43].map((x) => (
              <Block
                key={x}
                position={[x, 0.67, 0]}
                size={[0.07, 0.09, 0.9]}
                color={p.wood}
              />
            ))}
            {[-0.34, 0.34].flatMap((x) =>
              [-0.3, 0.3].map((z) => (
                <Block
                  key={`${x}-${z}`}
                  position={[x, 0.23, z]}
                  size={[0.06, 0.46, 0.06]}
                  color={p.wood}
                  radius={0.01}
                />
              )),
            )}
          </group>
          <Plant position={[5.2, 0, 0.8]} scale={1.15} />
          <group position={[0.65, 0, 0.75]}>
            <Block
              position={[0, 0.58, 0]}
              size={[0.55, 0.06, 0.55]}
              color={p.wood}
            />
            <Block
              position={[0, 0.28, 0]}
              size={[0.08, 0.56, 0.08]}
              color={p.wood}
            />
            <mesh position={[0, 0.83, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.45, 20]} />
              <meshStandardMaterial color="#d8ccb6" />
            </mesh>
            <mesh position={[0, 1.1, 0]}>
              <sphereGeometry
                args={[0.28, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
              />
              <meshStandardMaterial color="#e9dfc9" />
            </mesh>
          </group>
        </group>
      )}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[3, -0.26, 2.5]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#dddcd1" roughness={1} />
      </mesh>
      <group name={`sample-room-${demoRoom.width}x${demoRoom.depth}`} />
    </group>
  );
}
