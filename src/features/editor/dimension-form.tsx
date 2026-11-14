'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { axes, type Axis, type Room, type Units } from '@/domain/room';
import {
  formatLength,
  imperialParts,
  parseImperial,
  parseMetric,
} from '@/domain/units';
import { useEditorStore } from './editor-store';

type Draft = Record<Axis, { metric: string; feet: string; inches: string }>;
/** Remounted by the parent only on canonical dimension/unit changes, never on selection. */
export function DimensionForm({ room, units }: { room: Room; units: Units }) {
  const execute = useEditorStore((s) => s.execute);
  const commandError = useEditorStore((s) => s.error);
  const [draft, setDraft] = useState<Draft>(
    () =>
      Object.fromEntries(
        axes.map((axis) => {
          const meters = room.dimensions[axis].meters;
          const { feet, inches } = imperialParts(meters);
          return [
            axis,
            {
              metric: String(meters),
              feet: String(feet),
              inches: String(inches),
            },
          ];
        }),
      ) as Draft,
  );
  const [dirty, setDirty] = useState<Partial<Record<Axis, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  function change(
    axis: Axis,
    field: 'metric' | 'feet' | 'inches',
    value: string,
  ) {
    setDraft((s) => ({ ...s, [axis]: { ...s[axis], [field]: value } }));
    setDirty((s) => ({ ...s, [axis]: true }));
    setError(null);
    setMessage('');
  }
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const values: Partial<Record<Axis, number>> = {};
        for (const axis of axes) {
          if (!dirty[axis]) continue;
          const value =
            units === 'metric'
              ? parseMetric(draft[axis].metric)
              : parseImperial(draft[axis].feet, draft[axis].inches);
          if (value === null) {
            setError(
              `${axis[0].toUpperCase() + axis.slice(1)}: enter a valid ${units === 'metric' ? 'decimal measurement' : 'whole feet value and inches from 0 up to, but not including, 12'}.`,
            );
            return;
          }
          values[axis] = value;
        }
        if (!Object.keys(values).length) {
          setMessage('No dimension changes to apply.');
          return;
        }
        if (execute({ type: 'dimensions', values })) {
          setDirty({});
          setMessage('Dimensions updated.');
        }
      }}
      className="dimension-form"
    >
      <div className="inspector-label">
        <h3>Room dimensions</h3>
        <span>{units === 'metric' ? 'METERS' : 'FEET + INCHES'}</span>
      </div>
      <p className="editor-help" id="dimension-guidance">
        Clear interior measurements. Width/depth 1–30 m; height 1.8–6 m. Only
        edited axes are marked as user-entered.
      </p>
      {axes.map((axis) => (
        <fieldset key={axis} className="dimension-field">
          <legend>{axis[0].toUpperCase() + axis.slice(1)}</legend>
          <div className="dimension-inputs">
            {units === 'metric' ? (
              <label>
                <span className="sr-only">{axis} in meters</span>
                <input
                  aria-label={`${axis} in meters`}
                  aria-describedby="dimension-guidance dimension-error room-command-error"
                  aria-invalid={Boolean(error || commandError)}
                  inputMode="decimal"
                  type="text"
                  value={draft[axis].metric}
                  onChange={(e) => change(axis, 'metric', e.target.value)}
                />
                <span aria-hidden="true">m</span>
              </label>
            ) : (
              <>
                <label>
                  <span className="sr-only">{axis} feet</span>
                  <input
                    aria-label={`${axis} feet`}
                    aria-describedby="dimension-guidance dimension-error room-command-error"
                    aria-invalid={Boolean(error || commandError)}
                    inputMode="numeric"
                    type="text"
                    value={draft[axis].feet}
                    onChange={(e) => change(axis, 'feet', e.target.value)}
                  />
                  <span aria-hidden="true">ft</span>
                </label>
                <label>
                  <span className="sr-only">{axis} inches</span>
                  <input
                    aria-label={`${axis} inches`}
                    aria-describedby="dimension-guidance dimension-error room-command-error"
                    aria-invalid={Boolean(error || commandError)}
                    inputMode="decimal"
                    type="text"
                    value={draft[axis].inches}
                    onChange={(e) => change(axis, 'inches', e.target.value)}
                  />
                  <span aria-hidden="true">in</span>
                </label>
              </>
            )}
          </div>
          <small>
            {room.dimensions[axis].source === 'sample'
              ? 'Sample dimension'
              : 'User-entered · not independently verified'}{' '}
            · {formatLength(room.dimensions[axis].meters, units)}
          </small>
        </fieldset>
      ))}
      <p
        id="dimension-error"
        role={error ? 'alert' : undefined}
        className="editor-error"
      >
        {error}
      </p>
      <Button type="submit" className="apply-dimensions">
        Apply dimensions
      </Button>
      <p className="editor-help" role="status">
        {message}
      </p>
    </form>
  );
}
