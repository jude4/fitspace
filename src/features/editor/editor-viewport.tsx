'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SceneBoundary } from '@/components/scene-boundary';
import { useWebGL } from '@/lib/use-webgl';
import { elementNames } from '@/domain/room';
import { findProduct } from '@/domain/catalog';
import { useEditorStore, type CameraAction } from './editor-store';
const EditorCanvas = dynamic(() => import('@/scene/editor-canvas'), {
  ssr: false,
  loading: () => <ViewportLoading />,
});
function ViewportLoading() {
  return (
    <div role="status" className="scene-message">
      <Box size={28} aria-hidden="true" />
      <p>Preparing your room…</p>
    </div>
  );
}
const actions: { type: CameraAction; label: string; icon: typeof Plus }[] = [
  { type: 'zoom-in', label: 'Zoom in', icon: Plus },
  { type: 'zoom-out', label: 'Zoom out', icon: Minus },
  { type: 'pan-left', label: 'Pan left', icon: ArrowLeft },
  { type: 'pan-right', label: 'Pan right', icon: ArrowRight },
  { type: 'pan-up', label: 'Pan up', icon: ArrowUp },
  { type: 'pan-down', label: 'Pan down', icon: ArrowDown },
  { type: 'rotate-left', label: 'Rotate view left', icon: RotateCcw },
  { type: 'rotate-right', label: 'Rotate view right', icon: RotateCw },
];
export function EditorViewport() {
  const {
    room,
    selected,
    selectedPlacementId,
    placements,
    view,
    visibility,
    grid,
    measurements,
    navigateCamera,
  } = useEditorStore();
  const [generation, setGeneration] = useState(0),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const { supported, lowQuality } = useWebGL(generation);
  const fallback = (
    <div className="scene-message editor-fallback" role="status">
      <Box size={30} aria-hidden="true" />
      <h2>Preview unavailable</h2>
      <p>
        The 3D renderer couldn’t start or lost its graphics context. You can
        keep editing room measurements, materials, and scene controls below.
        Retrying preserves your room.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setReady(false);
          setFailed(false);
          setGeneration((g) => g + 1);
        }}
      >
        Retry 3D preview
      </Button>
    </div>
  );
  return (
    <div
      className="editor-viewport"
      onDragOver={(event) => {
        if (
          event.dataTransfer.types.includes('application/x-fitspace-product')
        ) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(event) => {
        const productId = event.dataTransfer.getData(
          'application/x-fitspace-product',
        );
        if (!findProduct(productId)) return;
        event.preventDefault();
        const canvas = event.currentTarget.querySelector('canvas');
        if (canvas)
          canvas.dispatchEvent(
            new CustomEvent('fitspace-product-drop', {
              detail: { productId, x: event.clientX, y: event.clientY },
            }),
          );
      }}
      data-testid="editor-viewport"
      data-ready={ready && !failed}
      data-view={view}
      data-width={room.dimensions.width.meters}
      data-depth={room.dimensions.depth.meters}
      data-height={room.dimensions.height.meters}
      data-wall-material={room.wallMaterialId}
      data-floor-material={room.floorMaterialId}
      data-grid={grid}
      data-placement-count={placements.length}
      data-measurements={measurements}
      aria-label="Interactive measured room"
    >
      <div className="viewport-caption">
        <p className="eyebrow">A BLANK CANVAS, BUILT AROUND YOU</p>
        <span>
          {view === 'overhead' ? 'Overhead plan' : 'Perspective view'} ·{' '}
          {selectedPlacementId
            ? findProduct(
                placements.find((p) => p.id === selectedPlacementId)
                  ?.productId ?? '',
              )?.name
            : selected
              ? elementNames[selected]
              : 'No selection'}
          {selected && !visibility[selected] ? ' (hidden)' : ''}
        </span>
      </div>
      {supported === false || failed ? (
        fallback
      ) : supported === null ? (
        <ViewportLoading />
      ) : (
        <SceneBoundary key={generation} fallback={fallback}>
          <EditorCanvas
            lowQuality={lowQuality}
            onReady={() => setReady(true)}
            onFailure={() => setFailed(true)}
          />
        </SceneBoundary>
      )}
      <div
        className="viewport-navigation"
        role="group"
        aria-label="Accessible camera navigation"
      >
        {actions.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            size="icon"
            variant="outline"
            aria-label={label}
            disabled={
              !ready ||
              failed ||
              supported === false ||
              (view === 'overhead' && type.startsWith('rotate'))
            }
            onClick={() => navigateCamera(type)}
          >
            <Icon size={15} />
          </Button>
        ))}
      </div>
      <p className="viewport-hint">
        Drag furniture to place · drag room to orbit · right-drag to pan
      </p>
    </div>
  );
}
