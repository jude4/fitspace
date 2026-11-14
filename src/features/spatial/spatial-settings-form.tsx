'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SpatialSettings } from '@/domain/spatial-settings';
import { useEditorStore } from '@/features/editor/editor-store';
export function SpatialSettingsForm() {
  const { spatial, units } = useEditorStore();
  return (
    <SettingsDraft
      key={`${JSON.stringify(spatial)}-${units}`}
      spatial={spatial}
    />
  );
}
function SettingsDraft({ spatial }: { spatial: SpatialSettings }) {
  const { units, setSpatial } = useEditorStore(),
    factor = units === 'metric' ? 1 : 0.3048;
  const [draft, setDraft] = useState({
    clearance: String(Number((spatial.clearanceMeters / factor).toFixed(6))),
    width: spatial.doorway.width
      ? String(Number((spatial.doorway.width.meters / factor).toFixed(6)))
      : '',
    height: spatial.doorway.height
      ? String(Number((spatial.doorway.height.meters / factor).toFixed(6)))
      : '',
  });
  const [dirty, setDirty] = useState<Record<string, boolean>>({}),
    [error, setError] = useState('');
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const next = structuredClone(spatial);
        for (const key of Object.keys(dirty)) {
          const value = draft[key as keyof typeof draft].trim();
          if (key !== 'clearance' && !value) {
            next.doorway[key as 'width' | 'height'] = null;
            continue;
          }
          if (!/^\d+(\.\d*)?$/.test(value) || !Number.isFinite(Number(value))) {
            setError(
              'Use finite positive decimal lengths; leave unknown doorway measurements blank.',
            );
            return;
          }
          const meters = Number(value) * factor;
          if (key === 'clearance') next.clearanceMeters = meters;
          else
            next.doorway[key as 'width' | 'height'] = {
              meters,
              source: 'user_entered',
            };
        }
        if (!setSpatial(next))
          setError(useEditorStore.getState().error ?? 'Invalid settings.');
        else setError('');
      }}
    >
      <h3>Clearance guideline</h3>
      <p className="editor-help">
        All sides, nominal envelopes. Set to 0 to disable the guideline. This is
        not a building-code or accessible-route assessment.
      </p>
      {(['clearance', 'width', 'height'] as const).map((key) => (
        <label key={key} className="transform-field spatial-field">
          {key === 'clearance'
            ? 'Walking clearance guideline'
            : `Clear doorway ${key}`}{' '}
          ({units === 'metric' ? 'm' : 'decimal ft'})
          <input
            aria-label={`${key === 'clearance' ? 'Walking clearance guideline' : `Clear doorway ${key}`} (${units === 'metric' ? 'm' : 'decimal ft'})`}
            type="text"
            inputMode="decimal"
            value={draft[key]}
            placeholder={key === 'clearance' ? '0.8' : 'Unknown'}
            onChange={(e) => {
              setDraft((s) => ({ ...s, [key]: e.target.value }));
              setDirty((s) => ({ ...s, [key]: true }));
              setError('');
            }}
          />
        </label>
      ))}
      <p className="editor-help">
        Use the unobstructed opening, not the door-leaf size. Blank means
        unknown. Doorways here are dimension references, not a located route or
        a wall cutout.
      </p>
      {error && (
        <p role="alert" className="editor-error">
          {error}
        </p>
      )}
      <Button className="apply-dimensions" type="submit">
        Apply spatial settings
      </Button>
    </form>
  );
}
