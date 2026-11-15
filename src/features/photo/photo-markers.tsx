'use client';
import { useState } from 'react';
import type { PhotoSegment } from '@/domain/photo-calibration';
import type { PhotoPreview } from './photo-file';
export function PhotoMarkers({
  photo,
  reference,
  target,
  onChange,
}: {
  photo: PhotoPreview;
  reference: PhotoSegment;
  target: PhotoSegment;
  onChange: (reference: PhotoSegment, target: PhotoSegment) => void;
}) {
  const [point, setPoint] = useState(0);
  const longest = Math.max(photo.width, photo.height);
  const maxX = photo.width / longest,
    maxY = photo.height / longest;
  const allPoints = [...reference, ...target];
  function updatePoint(index: number, x: number, y: number) {
    const next = allPoints.map((p, i) => (i === index ? { x, y } : p));
    onChange([next[0], next[1]], [next[2], next[3]]);
  }
  return (
    <div>
      <div
        className="photo-stage"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      >
        {/* A local, re-encoded object URL; Next image optimization would upload private photo data. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="Your private room reference" />
        <svg
          viewBox={`0 0 ${maxX} ${maxY}`}
          role="img"
          aria-label="Calibration markers on your photo"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            updatePoint(
              point,
              Math.max(
                0,
                Math.min(maxX, ((e.clientX - rect.left) / rect.width) * maxX),
              ),
              Math.max(
                0,
                Math.min(maxY, ((e.clientY - rect.top) / rect.height) * maxY),
              ),
            );
            setPoint((point + 1) % 4);
          }}
        >
          {[reference, target].map((segment, i) => (
            <line
              key={i}
              x1={segment[0].x}
              y1={segment[0].y}
              x2={segment[1].x}
              y2={segment[1].y}
              stroke={i ? '#ffdd84' : '#9ce6d0'}
              strokeWidth={0.005}
            />
          ))}
          {allPoints.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={0.014}
                fill={i < 2 ? '#9ce6d0' : '#ffdd84'}
                stroke="#23362d"
                strokeWidth={0.002}
              />
              <text
                x={p.x + 0.018}
                y={p.y}
                fontSize={0.035}
                fill="white"
                stroke="#23362d"
                strokeWidth={0.001}
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p>
        Choose the next marker, then click the photo, or edit marker coordinates
        below. Green 1–2: known reference. Gold 3–4: target room edge.
      </p>
      <label>
        Next marker
        <select
          value={point}
          onChange={(e) => setPoint(Number(e.target.value))}
        >
          {allPoints.map((_, i) => (
            <option key={i} value={i}>
              Marker {i + 1}
            </option>
          ))}
        </select>
      </label>
      <div className="photo-point-grid">
        {allPoints.map((p, i) => (
          <fieldset key={i}>
            <legend>Marker {i + 1}</legend>
            {(['x', 'y'] as const).map((coord) => (
              <label key={coord}>
                {coord.toUpperCase()} (%)
                <input
                  aria-label={`Marker ${i + 1} ${coord.toUpperCase()} percent`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={Number(
                    ((p[coord] / (coord === 'x' ? maxX : maxY)) * 100).toFixed(
                      3,
                    ),
                  )}
                  onChange={(e) => {
                    const value =
                      (Math.max(0, Math.min(100, Number(e.target.value))) /
                        100) *
                      (coord === 'x' ? maxX : maxY);
                    updatePoint(
                      i,
                      coord === 'x' ? value : p.x,
                      coord === 'y' ? value : p.y,
                    );
                  }}
                />
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
