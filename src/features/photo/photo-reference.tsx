'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { axes, type Axis } from '@/domain/room';
import { parseMetric } from '@/domain/units';
import {
  estimatePhotoDimension,
  type PhotoSegment,
} from '@/domain/photo-calibration';
import { useEditorStore } from '@/features/editor/editor-store';
import { products } from '@/domain/catalog';
import { preparePhoto, type PhotoPreview } from './photo-file';
import './photo-reference.css';
import { PhotoMarkers } from './photo-markers';
const initialReference: PhotoSegment = [
  { x: 0.1, y: 0.3 },
  { x: 0.4, y: 0.3 },
];
const initialTarget: PhotoSegment = [
  { x: 0.1, y: 0.6 },
  { x: 0.7, y: 0.6 },
];
export function PhotoReference() {
  const dialog = useRef<HTMLDialogElement>(null);
  const photoRef = useRef<PhotoPreview | null>(null),
    request = useRef(0);
  const [photo, setPhoto] = useState<PhotoPreview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [reference, setReference] = useState<PhotoSegment>(initialReference),
    [target, setTarget] = useState<PhotoSegment>(initialTarget);
  const [known, setKnown] = useState('2'),
    [axis, setAxis] = useState<Axis>('width'),
    [comparison, setComparison] = useState(products[0].id);
  useEffect(
    () => () => {
      request.current++;
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
      photoRef.current = null;
    },
    [],
  );
  let estimate: number | null = null,
    issue = '';
  try {
    estimate = estimatePhotoDimension(
      reference,
      target,
      parseMetric(known) ?? NaN,
      axis,
    );
  } catch (e) {
    issue = (e as Error).message;
  }
  const product = products.find((p) => p.id === comparison)!;
  return (
    <>
      <Button variant="outline" onClick={() => dialog.current?.showModal()}>
        Photo reference & calibration
      </Button>
      <dialog
        ref={dialog}
        className="photo-dialog"
        aria-labelledby="photo-title"
      >
        <div className="photo-heading">
          <div>
            <p className="eyebrow">YOUR SPACE · APPROXIMATE</p>
            <h2 id="photo-title">A reference, not a reconstruction.</h2>
          </div>
          <Button variant="outline" onClick={() => dialog.current?.close()}>
            Return to room
          </Button>
        </div>
        <p>
          Review your photo and compare a known length with a room edge in the
          same plane, at the same distance from the camera. Perspective, lens
          distortion and point selection can change the result. No automatic
          depth or camera reconstruction is performed.
        </p>
        <p className="photo-privacy">
          Photos stay in this workspace session, are never uploaded or included
          in cloud projects, exports or shared links, and are cleared when you
          leave or reload. Only applied dimensions are saved. Use photos you
          have permission to use.
        </p>
        <label className="photo-upload">
          Choose room photo (JPEG or PNG, up to 8 MiB)
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const id = ++request.current;
              setBusy(true);
              setError('');
              setMessage('');
              try {
                const next = await preparePhoto(file);
                if (id !== request.current) {
                  URL.revokeObjectURL(next.url);
                  return;
                }
                if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
                photoRef.current = next;
                setPhoto(next);
                const lx = next.width / Math.max(next.width, next.height),
                  ly = next.height / Math.max(next.width, next.height);
                setReference([
                  { x: lx * 0.1, y: ly * 0.3 },
                  { x: lx * 0.4, y: ly * 0.3 },
                ]);
                setTarget([
                  { x: lx * 0.1, y: ly * 0.6 },
                  { x: lx * 0.7, y: ly * 0.6 },
                ]);
              } catch (e) {
                if (id === request.current) setError((e as Error).message);
              } finally {
                if (id === request.current) setBusy(false);
              }
            }}
          />
        </label>
        {busy && <p role="status">Checking and preparing photo…</p>}
        {error && (
          <p role="alert" className="editor-error">
            {error}
          </p>
        )}
        {photo && (
          <div className="photo-calibration">
            <PhotoMarkers
              key={photo.url}
              photo={photo}
              reference={reference}
              target={target}
              onChange={(nextReference, nextTarget) => {
                setReference(nextReference);
                setTarget(nextTarget);
                setMessage('');
              }}
            />
            <div className="photo-settings">
              <h3>Calibrate one dimension</h3>
              <label>
                Known reference length (meters)
                <input
                  value={known}
                  inputMode="decimal"
                  onChange={(e) => {
                    setKnown(e.target.value);
                    setMessage('');
                  }}
                />
              </label>
              <label>
                Target room dimension
                <select
                  value={axis}
                  onChange={(e) => {
                    setAxis(e.target.value as Axis);
                    setMessage('');
                  }}
                >
                  {axes.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <p role="status" data-testid="photo-estimate">
                {estimate === null
                  ? issue
                  : `Approximate ${axis}: ${Number(estimate.toFixed(3))} m · photo estimate · uncertainty unknown.`}
              </p>
              <p>
                Calibrate each axis separately using a suitable same-plane
                reference. A single reference cannot establish room depth.
                Measure in person before relying on any estimate.
              </p>
              <Button
                disabled={estimate === null || busy}
                onClick={() => {
                  if (
                    estimate !== null &&
                    useEditorStore.getState().execute({
                      type: 'photo-dimension',
                      axis,
                      meters: estimate,
                    })
                  )
                    setMessage(
                      `Approximate ${axis} applied. Undo is available in the room. Other dimensions are unchanged.`,
                    );
                }}
              >
                Apply approximate {axis}
              </Button>
              <p role="status">{message}</p>
              <h3>Compare a sample concept</h3>
              <label>
                Sample furniture
                <select
                  value={comparison}
                  onChange={(e) => setComparison(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                {product.name}: {product.dimensions.width.meters} m W ×{' '}
                {product.dimensions.depth.meters} m D ×{' '}
                {product.dimensions.height.meters} m H. Sample dimensions, not
                manufacturer verified.
              </p>
              {estimate !== null && (
                <p>
                  The sample {axis} is{' '}
                  {Number(product.dimensions[axis].meters.toFixed(3))} m
                  compared with the estimated room {axis} of{' '}
                  {Number(estimate.toFixed(3))} m. This comparison does not
                  establish physical fit.
                </p>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  request.current++;
                  if (photoRef.current)
                    URL.revokeObjectURL(photoRef.current.url);
                  photoRef.current = null;
                  setPhoto(null);
                  setBusy(false);
                  setError('');
                  setMessage('');
                }}
              >
                Remove photo
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
