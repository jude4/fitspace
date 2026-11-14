'use client';
import { Grid2X2, Layers3, RotateCcw, Ruler, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from './editor-store';
export function HistoryControls() {
  const { undo, redo, past, future } = useEditorStore();
  return (
    <div className="history-controls" role="group" aria-label="Edit history">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Undo room edit"
        disabled={!past.length}
        onClick={undo}
        title="Undo (Ctrl/⌘ Z)"
      >
        <Undo2 size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Redo room edit"
        disabled={!future.length}
        onClick={redo}
        title="Redo (Ctrl/⌘ Shift Z)"
      >
        <Redo2 size={18} />
      </Button>
    </div>
  );
}
export function WorkspaceToolbar() {
  const {
    view,
    setView,
    units,
    setUnits,
    grid,
    setGrid,
    measurements,
    setMeasurements,
    visibility,
    setWalls,
    resetCamera,
  } = useEditorStore();
  const wallsVisible = (['north', 'south', 'east', 'west'] as const).every(
    (id) => visibility[id],
  );
  return (
    <div className="workspace-toolbar">
      <div className="editor-segment" role="group" aria-label="Camera view">
        <button
          aria-pressed={view === 'perspective'}
          onClick={() => setView('perspective')}
        >
          3D perspective
        </button>
        <button
          aria-pressed={view === 'overhead'}
          onClick={() => setView('overhead')}
        >
          2D overhead
        </button>
      </div>
      <div className="toolbar-tools" role="group" aria-label="Viewport display">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Measurement grid"
          aria-pressed={grid}
          onClick={() => setGrid(!grid)}
        >
          <Grid2X2 size={17} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Dimension indicators"
          aria-pressed={measurements}
          onClick={() => setMeasurements(!measurements)}
        >
          <Ruler size={17} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="All walls"
          aria-pressed={wallsVisible}
          onClick={() => setWalls(!wallsVisible)}
        >
          <Layers3 size={17} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Frame room and reset camera"
          onClick={resetCamera}
        >
          <RotateCcw size={17} />
        </Button>
      </div>
      <div
        className="editor-segment units-control"
        role="group"
        aria-label="Display units"
      >
        <button
          aria-pressed={units === 'metric'}
          onClick={() => setUnits('metric')}
        >
          m
        </button>
        <button
          aria-pressed={units === 'imperial'}
          onClick={() => setUnits('imperial')}
        >
          ft / in
        </button>
      </div>
    </div>
  );
}
