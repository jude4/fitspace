import { useRef } from 'react';
import { Plane, Vector3 } from 'three';
import { Edges, Html, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { findProduct } from '@/domain/catalog';
import type { Placement } from '@/domain/placements';
import { formatLength } from '@/domain/units';
import { useEditorStore } from '@/features/editor/editor-store';
import { useSpatialAnalysis } from '@/features/spatial/use-spatial-analysis';
import { FurnitureModel } from './furniture-model';
const floor = new Plane(new Vector3(0, 1, 0), 0);
function PlacedObject({
  placement: p,
  severity,
}: {
  placement: Placement;
  severity?: 'warning' | 'error';
}) {
  const {
    selectedPlacementId,
    selectPlacement,
    beginDrag,
    moveDrag,
    finishDrag,
    dragDraft,
    showBounds,
    measurements,
    units,
    showSpatialWarnings,
    showClearance,
    spatial,
  } = useEditorStore();
  const offset = useRef<{ x: number; z: number } | null>(null);
  const product = findProduct(p.productId, p.productRevision);
  if (!product) return null;
  const variant = product.variants.find((v) => v.id === p.materialVariantId)!;
  const position = dragDraft?.id === p.id ? dragDraft.position : p.position;
  const w = p.dimensions.width.meters,
    h = p.dimensions.height.meters,
    d = p.dimensions.depth.meters;
  const selected = selectedPlacementId === p.id;
  function point(event: ThreeEvent<PointerEvent>) {
    return event.ray.intersectPlane(floor, new Vector3());
  }
  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[0, p.rotationYRadians, 0]}
      onClick={(e) => {
        e.stopPropagation();
        selectPlacement(p.id);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const hit = point(e);
        if (!hit) return;
        offset.current = { x: p.position.x - hit.x, z: p.position.z - hit.z };
        beginDrag(p.id);
        (
          e.target as unknown as Pick<Element, 'setPointerCapture'>
        ).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!offset.current) return;
        e.stopPropagation();
        const hit = point(e);
        if (hit)
          moveDrag({
            x: hit.x + offset.current.x,
            y: 0,
            z: hit.z + offset.current.z,
          });
      }}
      onPointerUp={(e) => {
        if (!offset.current) return;
        e.stopPropagation();
        offset.current = null;
        finishDrag();
        (
          e.target as unknown as Pick<Element, 'releasePointerCapture'>
        ).releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={(e) => {
        offset.current = null;
        finishDrag(true);
        (
          e.target as unknown as Pick<Element, 'releasePointerCapture'>
        ).releasePointerCapture(e.pointerId);
      }}
    >
      <group scale={[w, h, d]}>
        <FurnitureModel productId={p.productId} color={variant.color} />
      </group>
      {((selected && showBounds) || (showSpatialWarnings && severity)) && (
        <mesh position={[0, h / 2, 0]} raycast={() => {}}>
          <boxGeometry args={[w, h, d]} />
          <meshBasicMaterial visible={false} />
          <Edges
            color={
              showSpatialWarnings && severity
                ? severity === 'error'
                  ? '#b3503f'
                  : '#ae853a'
                : '#526b38'
            }
            threshold={10}
          />
        </mesh>
      )}
      {selected && showClearance && spatial.clearanceMeters > 0 && (
        <Line
          points={[
            [
              -w / 2 - spatial.clearanceMeters,
              0.018,
              -d / 2 - spatial.clearanceMeters,
            ],
            [
              w / 2 + spatial.clearanceMeters,
              0.018,
              -d / 2 - spatial.clearanceMeters,
            ],
            [
              w / 2 + spatial.clearanceMeters,
              0.018,
              d / 2 + spatial.clearanceMeters,
            ],
            [
              -w / 2 - spatial.clearanceMeters,
              0.018,
              d / 2 + spatial.clearanceMeters,
            ],
            [
              -w / 2 - spatial.clearanceMeters,
              0.018,
              -d / 2 - spatial.clearanceMeters,
            ],
          ]}
          color="#b18a43"
          lineWidth={1.5}
          dashed
          dashSize={0.1}
          gapSize={0.08}
          raycast={() => {}}
        />
      )}
      {selected && measurements && (
        <Html
          center
          position={[0, h + 0.15, 0]}
          zIndexRange={[11, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="dimension-tag">
            {product.name} · {formatLength(w, units)} × {formatLength(d, units)}{' '}
            × {formatLength(h, units)}
            {severity && (
              <small
                style={{ display: 'block', fontSize: '9px', marginTop: '4px' }}
              >
                {severity === 'error'
                  ? 'Potential geometry conflict'
                  : 'Clearance guideline to review'}{' '}
                · see Analysis
              </small>
            )}
          </span>
        </Html>
      )}
    </group>
  );
}
export function PlacedFurniture() {
  const placements = useEditorStore((s) => s.placements);
  const findings = useSpatialAnalysis();
  const severities = new Map<string, 'warning' | 'error'>();
  for (const f of findings)
    if (f.severity !== 'info')
      for (const id of f.objectIds)
        if (severities.get(id) !== 'error') severities.set(id, f.severity);
  return (
    <group name="placed-furniture">
      {placements.map((p) => (
        <PlacedObject
          key={p.id}
          placement={p}
          severity={severities.get(p.id)}
        />
      ))}
    </group>
  );
}
