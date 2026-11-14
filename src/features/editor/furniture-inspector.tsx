'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { findProduct } from '@/domain/catalog';
import { axes, type Axis } from '@/domain/room';
import {
  footprint,
  type Placement,
  type PlacementUpdate,
} from '@/domain/placements';
import { formatLength } from '@/domain/units';
import { useEditorStore } from './editor-store';
function TransformForm({ p }: { p: Placement }) {
  const { units, furniture } = useEditorStore(),
    product = findProduct(p.productId, p.productRevision)!;
  const factor = units === 'metric' ? 1 : 0.3048;
  const initial: Record<string, string> = {
    x: String(Number((p.position.x / factor).toFixed(6))),
    z: String(Number((p.position.z / factor).toFixed(6))),
    rotation: String(Number(((p.rotationYRadians * 180) / Math.PI).toFixed(4))),
  };
  for (const axis of axes)
    initial[axis] = String(
      Number((p.dimensions[axis].meters / factor).toFixed(6)),
    );
  const [draft, setDraft] = useState(initial),
    [dirty, setDirty] = useState<Record<string, boolean>>({}),
    [error, setError] = useState('');
  const field = (key: string, label: string) => (
    <label key={key} className="transform-field">
      {label}
      <input
        aria-label={label}
        value={draft[key]}
        type="text"
        inputMode="decimal"
        onChange={(e) => {
          setDraft((s) => ({ ...s, [key]: e.target.value }));
          setDirty((s) => ({ ...s, [key]: true }));
          setError('');
        }}
      />
    </label>
  );
  return (
    <form
      className="furniture-transform"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const numbers: Record<string, number> = {};
        for (const key of Object.keys(dirty)) {
          const raw = draft[key].trim();
          const number = Number(raw);
          if (!/^-?\d+(\.\d*)?$/.test(raw) || !Number.isFinite(number)) {
            setError(
              'Enter finite decimal coordinates, dimensions, or degrees.',
            );
            return;
          }
          numbers[key] = number;
        }
        const update: PlacementUpdate = {};
        if (dirty.x || dirty.z)
          update.position = {
            x: dirty.x ? numbers.x * factor : p.position.x,
            y: 0,
            z: dirty.z ? numbers.z * factor : p.position.z,
          };
        if (dirty.rotation)
          update.rotationYRadians = (numbers.rotation * Math.PI) / 180;
        const resize: Partial<Record<Axis, number>> = {};
        for (const axis of axes)
          if (dirty[axis]) resize[axis] = numbers[axis] * factor;
        if (Object.keys(resize).length) update.resize = resize;
        if (furniture({ type: 'update', id: p.id, update })) {
          setDirty({});
          setError('');
        }
      }}
    >
      <h3>Position & rotation</h3>
      <p className="editor-help">
        Bottom-center pivot. Y is fixed to the floor.{' '}
        {units === 'metric'
          ? 'Coordinates are meters.'
          : 'Coordinates and adjustable sizes are decimal feet.'}{' '}
        Apply edits before changing units.
      </p>
      <div className="transform-grid">
        {field('x', `Position X (${units === 'metric' ? 'm' : 'decimal ft'})`)}
        {field('z', `Position Z (${units === 'metric' ? 'm' : 'decimal ft'})`)}
        {field('rotation', 'Rotation (degrees)')}
      </div>
      <h3>Physical sample dimensions</h3>
      <dl className="object-dimensions">
        {axes.map((axis) => (
          <div key={axis}>
            <dt>{axis}</dt>
            <dd>
              {formatLength(p.dimensions[axis].meters, units)} ·{' '}
              {p.dimensions[axis].source === 'sample'
                ? 'sample'
                : 'user-adjusted'}
            </dd>
          </div>
        ))}
      </dl>
      {Object.entries(product.adjustable).map(([axis, range]) => (
        <div key={axis}>
          {field(
            axis,
            `Adjustable ${axis} (${units === 'metric' ? 'm' : 'decimal ft'})`,
          )}
          <p className="editor-help">
            Allowed: {formatLength(range.min, units)}–
            {formatLength(range.max, units)}
          </p>
        </div>
      ))}
      {!Object.keys(product.adjustable).length && (
        <p className="editor-help">Fixed-size concept. Resizing is disabled.</p>
      )}
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      <Button type="submit" className="apply-dimensions">
        Apply furniture changes
      </Button>
    </form>
  );
}
export function FurnitureInspector() {
  const {
    placements,
    selectedPlacementId,
    furniture,
    units,
    error,
    room,
    snapGrid,
    setSnapGrid,
    snapWalls,
    setSnapWalls,
    showBounds,
    setShowBounds,
  } = useEditorStore();
  const p = placements.find((p) => p.id === selectedPlacementId);
  const [wall, setWall] = useState('north');
  if (!p) return null;
  const product = findProduct(p.productId, p.productRevision)!;
  return (
    <aside
      className="editor-panel inspector-panel"
      aria-label="Furniture properties"
    >
      <div className="panel-heading">
        <span className="eyebrow">FITSPACE CONCEPT · SAMPLE</span>
        <h2>{product.name}</h2>
        <p>{product.description}</p>
      </div>
      <div className="panel-section">
        <TransformForm key={`${JSON.stringify(p)}-${units}`} p={p} />
        {error && (
          <p role="alert" className="editor-error">
            {error}
          </p>
        )}
      </div>
      <div className="panel-section">
        <label className="editor-field-label" htmlFor="furniture-variant">
          Material variant
        </label>
        <select
          id="furniture-variant"
          value={p.materialVariantId}
          onChange={(e) =>
            furniture({
              type: 'update',
              id: p.id,
              update: { materialVariantId: e.target.value },
            })
          }
        >
          {product.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <div className="furniture-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              furniture({
                type: 'duplicate',
                id: p.id,
                newId: crypto.randomUUID(),
              })
            }
          >
            Duplicate object
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => furniture({ type: 'delete', id: p.id })}
          >
            Delete object
          </Button>
        </div>
      </div>
      <div className="panel-section">
        <h3>Placement aids</h3>
        <label className="editor-checkbox">
          <input
            type="checkbox"
            checked={snapGrid}
            onChange={(e) => setSnapGrid(e.target.checked)}
          />{' '}
          Snap dragging to 0.1 m grid
        </label>
        <label className="editor-checkbox">
          <input
            type="checkbox"
            checked={snapWalls}
            onChange={(e) => setSnapWalls(e.target.checked)}
          />{' '}
          Snap dragging near walls (0.2 m)
        </label>
        <label className="editor-checkbox">
          <input
            type="checkbox"
            checked={showBounds}
            onChange={(e) => setShowBounds(e.target.checked)}
          />{' '}
          Show selected bounding box
        </label>
        <label className="editor-field-label" htmlFor="snap-wall">
          Align to room wall
        </label>
        <select
          id="snap-wall"
          value={wall}
          onChange={(e) => setWall(e.target.value)}
        >
          {['north', 'east', 'south', 'west'].map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <Button
          className="create-room"
          variant="outline"
          onClick={() => {
            const { halfX, halfZ } = footprint(p);
            const position = { ...p.position };
            if (wall === 'north') position.z = halfZ;
            if (wall === 'south')
              position.z = room.dimensions.depth.meters - halfZ;
            if (wall === 'west') position.x = halfX;
            if (wall === 'east')
              position.x = room.dimensions.width.meters - halfX;
            furniture({ type: 'update', id: p.id, update: { position } });
          }}
        >
          Snap selected to wall
        </Button>
        <p className="editor-help">
          Aligns the rotated sample’s bounds. This is positioning assistance,
          not a collision or fit check.
        </p>
      </div>
      <div className="panel-section">
        <h3>Product information</h3>
        <p className="editor-help">
          Sample dimensions only · Product revision {p.productRevision} ·
          Original procedural asset revision 1. No manufacturer verification,
          price, or retailer purchase link.
        </p>
      </div>
    </aside>
  );
}
