'use client';
import { useState } from 'react';
import { Box, Eye, EyeOff, Layers3, Plus, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  elementNames,
  elements,
  floorMaterials,
  presets,
  wallMaterials,
  type PresetId,
  type FloorMaterialId,
  type WallMaterialId,
} from '@/domain/room';
import { formatArea, formatLength } from '@/domain/units';
import { useEditorStore } from './editor-store';
import { DimensionForm } from './dimension-form';
export function RoomPanel() {
  const { room, selected, select, visibility, toggleElement, execute } =
    useEditorStore();
  const [preset, setPreset] = useState<PresetId>('living');
  return (
    <aside
      className="editor-panel rooms-panel"
      aria-label="Room and scene controls"
    >
      <div className="panel-heading">
        <span className="eyebrow">YOUR SPACE</span>
        <h2>Room to begin.</h2>
        <p>A measured foundation for your next idea.</p>
      </div>
      <div className="panel-section">
        <label className="editor-field-label" htmlFor="room-preset">
          Room template
        </label>
        <select
          id="room-preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value as PresetId)}
        >
          {Object.entries(presets).map(([id, p]) => (
            <option key={id} value={id}>
              {p.name} · {p.width} × {p.depth} m
            </option>
          ))}
        </select>
        <Button
          className="create-room"
          variant="outline"
          onClick={() => execute({ type: 'create', preset })}
        >
          <Plus size={15} aria-hidden="true" /> Create empty room
        </Button>
        <p className="editor-help">
          Templates use sample dimensions. Creating a room replaces the current
          room and can be undone.
        </p>
      </div>
      <div className="panel-section">
        <h3>
          <Layers3 size={16} aria-hidden="true" /> Scene elements
        </h3>
        <p className="editor-help">
          Select a surface to inspect it. Eye controls change visibility only.
        </p>
        <ul className="element-list">
          {elements.map((id) => (
            <li key={id}>
              <button
                className="element-select"
                aria-pressed={selected === id}
                onClick={() => select(id)}
              >
                <span
                  className={`element-marker ${id === 'floor' ? 'floor-marker' : ''}`}
                />
                {elementNames[id]}
              </button>
              <button
                className="element-visibility"
                aria-label={`${visibility[id] ? 'Hide' : 'Show'} ${elementNames[id].toLowerCase()}`}
                onClick={() => toggleElement(id)}
              >
                {visibility[id] ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="next-phase-note">
        <Box size={22} strokeWidth={1.3} aria-hidden="true" />
        <h3>First, make room.</h3>
        <p>
          Furniture browsing and placement arrive in Phase 3. This editor
          creates an empty room.
        </p>
      </div>
      <div className="room-scale-note">
        <Ruler size={15} aria-hidden="true" />
        <span>1 scene unit = 1 meter</span>
      </div>
      <p className="editor-help room-name">Current room: {room.name}</p>
    </aside>
  );
}
export function Inspector() {
  const { room, units, selected, execute, error } = useEditorStore();
  return (
    <aside
      className="editor-panel inspector-panel"
      aria-label="Room properties"
    >
      <div className="panel-heading">
        <span className="eyebrow">THE DETAILS MATTER</span>
        <h2>{selected ? elementNames[selected] : 'Room properties'}</h2>
        <p>
          {selected === 'floor'
            ? 'The foundation of your space.'
            : selected === 'ceiling'
              ? 'The room’s upper boundary.'
              : 'Refine your room, one surface at a time.'}
        </p>
      </div>
      <div className="panel-section">
        <DimensionForm
          key={`${JSON.stringify(room.dimensions)}-${units}`}
          room={room}
          units={units}
        />
        <p
          id="room-command-error"
          role={error ? 'alert' : undefined}
          className="editor-error"
        >
          {error}
        </p>
      </div>
      <div className="panel-section material-fields">
        <h3>Material & color</h3>
        <label className="editor-field-label" htmlFor="wall-finish">
          Wall & ceiling finish
        </label>
        <div className="material-select">
          <span
            style={{ background: wallMaterials[room.wallMaterialId].color }}
          />
          <select
            id="wall-finish"
            value={room.wallMaterialId}
            onChange={(e) =>
              execute({
                type: 'wall-material',
                id: e.target.value as WallMaterialId,
              })
            }
          >
            {Object.entries(wallMaterials).map(([id, m]) => (
              <option key={id} value={id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <label className="editor-field-label" htmlFor="floor-finish">
          Floor finish
        </label>
        <div className="material-select">
          <span
            style={{ background: floorMaterials[room.floorMaterialId].color }}
          />
          <select
            id="floor-finish"
            value={room.floorMaterialId}
            onChange={(e) =>
              execute({
                type: 'floor-material',
                id: e.target.value as FloorMaterialId,
              })
            }
          >
            {Object.entries(floorMaterials).map(([id, m]) => (
              <option key={id} value={id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <p className="editor-help">
          Wall finish applies to all four walls and the ceiling. Colors are
          visual samples.
        </p>
      </div>
      <div className="panel-section room-facts">
        <h3>At a glance</h3>
        <dl>
          <div>
            <dt>Floor area</dt>
            <dd>
              {formatArea(
                room.dimensions.width.meters * room.dimensions.depth.meters,
                units,
              )}
            </dd>
          </div>
          <div>
            <dt>Interior height</dt>
            <dd>{formatLength(room.dimensions.height.meters, units)}</dd>
          </div>
          <div>
            <dt>Measurement source</dt>
            <dd>
              {Object.values(room.dimensions).every(
                (d) => d.source === 'sample',
              )
                ? 'Sample dimensions'
                : Object.values(room.dimensions).every(
                      (d) => d.source === 'user_entered',
                    )
                  ? 'User-entered'
                  : 'Mixed sources'}
            </dd>
          </div>
        </dl>
        <p className="editor-help">
          Dimensions are not independently verified. Measure your actual room
          before making decisions.
        </p>
      </div>
    </aside>
  );
}
