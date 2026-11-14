import { Html, Line } from '@react-three/drei';
import { formatLength } from '@/domain/units';
import { useEditorStore } from '@/features/editor/editor-store';
export function RoomDimensions() {
  const { room, units, measurements } = useEditorStore();
  if (!measurements) return null;
  const w = room.dimensions.width.meters,
    d = room.dimensions.depth.meters,
    h = room.dimensions.height.meters;
  return (
    <group>
      <Line
        points={[
          [0, 0.04, d + 0.35],
          [w, 0.04, d + 0.35],
        ]}
        color="#667655"
        lineWidth={1}
        depthTest={false}
      />
      <Line
        points={[
          [-0.35, 0.04, 0],
          [-0.35, 0.04, d],
        ]}
        color="#667655"
        lineWidth={1}
        depthTest={false}
      />
      <Line
        points={[
          [w + 0.3, 0, 0],
          [w + 0.3, h, 0],
        ]}
        color="#667655"
        lineWidth={1}
        depthTest={false}
      />
      {[0, w].map((x) => (
        <Line
          key={`w${x}`}
          points={[
            [x, 0.04, d + 0.25],
            [x, 0.04, d + 0.45],
          ]}
          color="#667655"
          depthTest={false}
        />
      ))}
      {[0, d].map((z) => (
        <Line
          key={`d${z}`}
          points={[
            [-0.45, 0.04, z],
            [-0.25, 0.04, z],
          ]}
          color="#667655"
          depthTest={false}
        />
      ))}
      <Html
        center
        position={[w / 2, 0.04, d + 0.5]}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span className="dimension-tag">Width · {formatLength(w, units)}</span>
      </Html>
      <Html
        center
        position={[-0.55, 0.04, d / 2]}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span className="dimension-tag">Depth · {formatLength(d, units)}</span>
      </Html>
      <Html
        center
        position={[w + 0.4, h / 2, 0]}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span className="dimension-tag">Height · {formatLength(h, units)}</span>
      </Html>
    </group>
  );
}
