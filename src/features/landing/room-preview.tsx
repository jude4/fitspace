'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { SceneBoundary } from '@/components/scene-boundary';
import { useWebGL } from '@/lib/use-webgl';
import {
  ArrowUpRight,
  Box,
  Expand,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { palettes, type PaletteId } from '@/domain/demo';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { Button } from '@/components/ui/button';
import { useDemoStore } from './demo-store';

const RoomCanvas = dynamic(() => import('@/scene/room-canvas'), {
  ssr: false,
  loading: () => <Loading />,
});
function Loading() {
  return (
    <div className="scene-message" role="status">
      <Box size={24} aria-hidden="true" />
      <span>Bringing the room to life…</span>
    </div>
  );
}
export function RoomPreview() {
  const {
    palette,
    furnished,
    motion,
    view,
    setPalette,
    setFurnished,
    setMotion,
    setView,
  } = useDemoStore();
  const reducedMotion = useReducedMotion();
  const { supported, lowQuality } = useWebGL();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [generation, setGeneration] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '100px' },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
    };
  }, []);
  const fallback = (
    <div className="scene-message scene-fallback" role="status">
      <Box size={34} aria-hidden="true" />
      <h3>The room needs WebGL</h3>
      <p>
        3D preview is unavailable. Try a browser with graphics acceleration
        enabled. You can still explore how FitSpace works below.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Reload preview
      </Button>
    </div>
  );
  return (
    <div
      ref={ref}
      className="preview"
      id="demo"
      aria-label="Interactive sample living room"
    >
      <div className="preview-topline">
        <span className="live-dot" /> A little room. A world of possibilities.
        <span className="preview-code">DEMO / 001</span>
      </div>
      <div
        className="scene"
        data-testid="room-scene"
        data-ready={ready && !failed}
        data-palette={palette}
        data-furnished={furnished}
        data-motion={motion && !reducedMotion && visible}
      >
        {supported === false || failed ? (
          fallback
        ) : supported === null ? (
          <Loading />
        ) : (
          <SceneBoundary fallback={fallback}>
            <RoomCanvas
              resetKey={generation}
              lowQuality={lowQuality}
              palette={palette}
              furnished={furnished}
              motion={motion && !reducedMotion && visible}
              view={view}
              onReady={() => setReady(true)}
              onFailure={() => setFailed(true)}
            />
          </SceneBoundary>
        )}
        <div className="scene-label">
          <span className="eyebrow">THE DEMO ROOM</span>
          <strong>{palettes[palette].name}</strong>
          <span>6 × 5 m · illustrative dimensions</span>
        </div>
        <div className="view-buttons" aria-label="Camera controls">
          <Button
            variant="outline"
            size="icon"
            aria-label="Reset camera"
            onClick={() => {
              setView('perspective');
              setGeneration((g) => g + 1);
            }}
          >
            <RotateCcw size={17} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Front camera view"
            aria-pressed={view === 'front'}
            onClick={() => setView(view === 'front' ? 'perspective' : 'front')}
          >
            <Expand size={17} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={reducedMotion}
            aria-label={
              reducedMotion
                ? 'Camera motion disabled by reduced-motion preference'
                : motion
                  ? 'Pause camera motion'
                  : 'Animate camera'
            }
            aria-pressed={motion && !reducedMotion}
            onClick={() => setMotion(!motion)}
          >
            {motion && !reducedMotion ? (
              <Pause size={17} />
            ) : (
              <Play size={17} />
            )}
          </Button>
        </div>
      </div>
      <div className="preview-controls">
        <div className="material-picker">
          <span>Make it yours</span>
          <div role="group" aria-label="Room material palette">
            {(Object.keys(palettes) as PaletteId[]).map((id) => (
              <button
                key={id}
                className={`swatch swatch-${id}`}
                aria-label={palettes[id].name}
                aria-pressed={palette === id}
                onClick={() => setPalette(id)}
              >
                <span />
              </button>
            ))}
          </div>
        </div>
        <div
          className="comparison"
          role="group"
          aria-label="Furniture comparison"
        >
          <button aria-pressed={!furnished} onClick={() => setFurnished(false)}>
            Before
          </button>
          <button aria-pressed={furnished} onClick={() => setFurnished(true)}>
            After <ArrowUpRight size={13} aria-hidden="true" />
          </button>
        </div>
        <span className="orbit-hint">
          <MousePointer2 size={14} aria-hidden="true" /> Drag to explore
        </span>
      </div>
      <p className="sample-note">
        An original, procedural concept room. Furniture and dimensions are
        samples, not retailer products.
      </p>
    </div>
  );
}
