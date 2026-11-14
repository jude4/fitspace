'use client';
import { ArrowUpRight } from 'lucide-react';
import { palettes, type PaletteId } from '@/domain/demo';
import { useDemoStore } from './demo-store';
export function RoomCollection() {
  const setPalette = useDemoStore((s) => s.setPalette);
  return (
    <div className="collection-grid">
      {(Object.keys(palettes) as PaletteId[]).map((id, i) => (
        <button
          key={id}
          className={`concept-card concept-${id}`}
          onClick={() => {
            setPalette(id);
            document.getElementById('demo')?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'instant'
                : 'smooth',
            });
          }}
        >
          <div className="concept-art" aria-hidden="true">
            <div className="art-window" />
            <div className="art-picture" />
            <div className="art-sofa" />
            <div className="art-table" />
            <div className="art-rug" />
          </div>
          <div className="concept-caption">
            <span>
              <small>CONCEPT 0{i + 1}</small>
              <strong>{palettes[id].name}</strong>
            </span>
            <ArrowUpRight size={22} />
          </div>
        </button>
      ))}
    </div>
  );
}
