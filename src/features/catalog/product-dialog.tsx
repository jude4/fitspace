'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/domain/catalog';
import { formatLength } from '@/domain/units';
import { SceneBoundary } from '@/components/scene-boundary';
import { Button } from '@/components/ui/button';
import { useWebGL } from '@/lib/use-webgl';
import { useEditorStore } from '@/features/editor/editor-store';
const Preview = dynamic(() => import('@/scene/product-preview-canvas'), {
  ssr: false,
  loading: () => <p>Loading 3D preview…</p>,
});
export function ProductDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    { supported, lowQuality } = useWebGL();
  const units = useEditorStore((s) => s.units);
  const [addError, setAddError] = useState('');
  useEffect(() => {
    const dialog = ref.current,
      previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="product-dialog"
      onCancel={onClose}
      aria-labelledby="product-dialog-title"
    >
      <button
        className="dialog-close"
        aria-label="Close product details"
        onClick={onClose}
      >
        ×
      </button>
      <p className="eyebrow">FITSPACE CONCEPT · NOT FOR SALE</p>
      <h2 id="product-dialog-title">{product.name}</h2>
      <div className="product-live-preview">
        {supported === false ? (
          <p>WebGL preview unavailable. Dimensions and placement still work.</p>
        ) : supported === null ? (
          <p>Preparing preview…</p>
        ) : (
          <SceneBoundary
            fallback={
              <p>
                Preview could not load. You can still add this sample or close
                the preview.
              </p>
            }
          >
            <Preview product={product} lowQuality={lowQuality} />
          </SceneBoundary>
        )}
      </div>
      <p>{product.description}</p>
      <p className="sample-dimensions">
        Sample dimensions:{' '}
        {formatLength(product.dimensions.width.meters, units)} W ×{' '}
        {formatLength(product.dimensions.depth.meters, units)} D ×{' '}
        {formatLength(product.dimensions.height.meters, units)} H
      </p>
      <p>
        Original procedural model, revision {product.revision}. These are
        illustrative sample dimensions, not manufacturer specifications.{' '}
        {Object.keys(product.adjustable).length
          ? 'Adjustable dimensions are allowed only within the listed sample ranges.'
          : 'Fixed dimensions; scaling is disabled.'}
      </p>
      {Object.entries(product.adjustable).map(([axis, range]) => (
        <p key={axis}>
          Adjustable {axis}: {formatLength(range.min, units)}–
          {formatLength(range.max, units)} (sample range).
        </p>
      ))}
      {addError && (
        <p role="alert" className="editor-error">
          {addError}
        </p>
      )}
      <Button
        onClick={() => {
          if (
            useEditorStore.getState().furniture({
              type: 'add',
              id: crypto.randomUUID(),
              productId: product.id,
            })
          )
            onClose();
          else
            setAddError(
              useEditorStore.getState().error ??
                'This sample could not be added.',
            );
        }}
      >
        Add {product.name} to room
      </Button>
    </dialog>
  );
}
