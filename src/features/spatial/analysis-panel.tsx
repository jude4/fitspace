'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { findProduct } from '@/domain/catalog';
import {
  checkDoorway,
  compareDimensions,
  doorwayLimitations,
} from '@/domain/spatial-analysis';
import { formatArea, formatLength } from '@/domain/units';
import { useEditorStore } from '@/features/editor/editor-store';
import { useSpatialAnalysis } from './use-spatial-analysis';
import { SpatialSettingsForm } from './spatial-settings-form';
export function AnalysisPanel() {
  const {
    room,
    placements,
    spatial,
    units,
    selectedPlacementId,
    selectPlacement,
    showSpatialWarnings,
    setShowSpatialWarnings,
    showClearance,
    setShowClearance,
  } = useEditorStore();
  const findings = useSpatialAnalysis();
  const [compareId, setCompareId] = useState('');
  const [findingLimit, setFindingLimit] = useState(60);
  const selected =
    placements.find((p) => p.id === selectedPlacementId) ?? placements[0];
  const other = placements.find((p) => p.id === compareId);
  const doorway = checkDoorway(selected?.dimensions, spatial.doorway);
  const warnings = findings.filter((f) => f.severity !== 'info');
  const name = (id: string) => {
    const p = placements.find((p) => p.id === id);
    return p
      ? `${findProduct(p.productId, p.productRevision)?.name ?? 'Object'} ${placements.indexOf(p) + 1}`
      : 'Room';
  };
  return (
    <aside
      className="editor-panel inspector-panel analysis-panel"
      aria-label="Spatial analysis"
    >
      <div className="panel-heading">
        <span className="eyebrow">SPACE, WITH CONTEXT</span>
        <h2>Layout analysis</h2>
        <p>
          Dimension-envelope guidance. Verify real measurements before purchase
          or delivery.
        </p>
      </div>
      <div className="panel-section">
        <h3>Layout summary</h3>
        <dl className="object-dimensions">
          <div>
            <dt>Objects</dt>
            <dd>{placements.length}</dd>
          </div>
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
            <dt>Findings to review</dt>
            <dd data-testid="spatial-warning-count">{warnings.length}</dd>
          </div>
        </dl>
        <p className="editor-help">
          Sample, inferred, estimated and user-entered dimensions are not
          independently verified. Unknown measurement uncertainty is not zero.
          No finding guarantees physical fit.
        </p>
        <label className="editor-checkbox">
          <input
            type="checkbox"
            checked={showSpatialWarnings}
            onChange={(e) => setShowSpatialWarnings(e.target.checked)}
          />{' '}
          Show spatial warning bounds
        </label>
        <label className="editor-checkbox">
          <input
            type="checkbox"
            checked={showClearance}
            onChange={(e) => setShowClearance(e.target.checked)}
          />{' '}
          Show selected clearance envelope
        </label>
      </div>
      <div className="panel-section">
        <SpatialSettingsForm />
      </div>
      <div className="panel-section spatial-findings">
        <h3>Room & furniture findings</h3>
        {!placements.length && (
          <p>Add a sample object to analyze its dimensions.</p>
        )}
        {[...findings]
          .sort(
            (a, b) =>
              ({ error: 0, warning: 1, info: 2 })[a.severity] -
              { error: 0, warning: 1, info: 2 }[b.severity],
          )
          .slice(0, findingLimit)
          .map((f) => (
            <article
              key={f.id}
              className={`spatial-finding finding-${f.severity}`}
              data-code={f.code}
            >
              <strong>{f.code.replaceAll('-', ' ')}</strong>
              <p>{f.message}</p>
              {f.distanceMeters !== undefined && (
                <p>
                  Nominal gap: {formatLength(f.distanceMeters, units)} ·
                  guideline {formatLength(spatial.clearanceMeters, units)}
                </p>
              )}
              <small>
                Sources:{' '}
                {f.sources.length
                  ? f.sources.join(', ').replaceAll('_', ' ')
                  : 'incomplete data'}
              </small>
              {f.objectIds.map((id) => (
                <button
                  key={id}
                  onClick={() => selectPlacement(id)}
                  aria-label={`Inspect finding for ${name(id)}`}
                >
                  {name(id)} ↗
                </button>
              ))}
            </article>
          ))}
        {findings.length > findingLimit && (
          <>
            <p className="editor-help">
              Showing {findingLimit} of {findings.length} findings, most severe
              first. Summary counts include all findings.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFindingLimit((n) => n + 60)}
            >
              Show more findings
            </Button>
          </>
        )}
        <details>
          <summary>Assumptions and limits</summary>
          <p>
            Yaw-oriented rectangular bounds plus vertical intervals; exact
            meshes are not tested. Walls remain occupied even when hidden.
            Boundary height is included. Contacts/penetration ≤1 mm are treated
            as touching, not overlap. Clearance uses the minimum planar gap and
            an all-sides guideline, not a continuous walking route. A selected
            outline expands the rectangle conservatively, including its corners.
            Measurement error can change every result.
          </p>
        </details>
      </div>
      <div className="panel-section">
        <h3>Doorway dimension check</h3>
        <label className="editor-field-label" htmlFor="doorway-object">
          Object to compare with opening
        </label>
        <select
          id="doorway-object"
          value={selected?.id ?? ''}
          onChange={(e) => selectPlacement(e.target.value)}
        >
          {!placements.length && <option value="">No objects</option>}
          {placements.map((p) => (
            <option key={p.id} value={p.id}>
              {name(p.id)}
            </option>
          ))}
        </select>
        <p
          className="doorway-result"
          data-testid="doorway-result"
          data-status={doorway.status}
        >
          {doorway.message}
        </p>
        <p className="editor-help">
          Sources:{' '}
          {doorway.sources.length
            ? doorway.sources.join(', ').replaceAll('_', ' ')
            : 'additional measurements required'}
          . Unknown measurement error is not bounded.
        </p>
        {doorway.orientation && (
          <p className="editor-help">
            Across opening: object {doorway.orientation.across}; vertical:
            object {doorway.orientation.vertical}; along opening: object{' '}
            {doorway.orientation.along}. This may require tipping the object.
          </p>
        )}
        {doorway.margins && (
          <p className="editor-help">
            Nominal margins (declared uncertainty included):{' '}
            {formatLength(doorway.margins.width, units)} across,{' '}
            {formatLength(doorway.margins.height, units)} vertically.
          </p>
        )}
        <p className="editor-help">{doorwayLimitations}</p>
      </div>
      <div className="panel-section">
        <h3>Compare object dimensions</h3>
        <p className="editor-help">
          Reference: {selected ? name(selected.id) : 'Select an object'}. Axes
          compare physical size, independent of placement rotation.
        </p>
        <label className="editor-field-label" htmlFor="compare-object">
          Compare against
        </label>
        <select
          id="compare-object"
          value={compareId}
          onChange={(e) => setCompareId(e.target.value)}
        >
          <option value="">Choose another object</option>
          {placements
            .filter((p) => p.id !== selected?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {name(p.id)}
              </option>
            ))}
        </select>
        {selected && other && selected.id !== other.id && (
          <table className="dimension-comparison">
            <caption>
              {name(selected.id)} minus {name(other.id)}
            </caption>
            <thead>
              <tr>
                <th>Axis</th>
                <th>Selected</th>
                <th>Other</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {compareDimensions(selected.dimensions, other.dimensions).map(
                (row) => (
                  <tr key={row.axis}>
                    <th>{row.axis}</th>
                    <td>{formatLength(row.a.meters, units)}</td>
                    <td>{formatLength(row.b.meters, units)}</td>
                    <td>
                      {row.differenceMeters < 0 ? '−' : '+'}
                      {formatLength(Math.abs(row.differenceMeters), units)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="panel-section">
        <Button
          variant="outline"
          size="sm"
          onClick={() => useEditorStore.getState().select('floor')}
        >
          Select room floor
        </Button>
      </div>
    </aside>
  );
}
