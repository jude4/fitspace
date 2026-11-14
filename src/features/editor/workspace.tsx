'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { SaveState } from './local-scene';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { formatArea } from '@/domain/units';
import { useEditorStore } from './editor-store';
import { RoomPanel, Inspector } from './room-panels';
import { HistoryControls, WorkspaceToolbar } from './workspace-toolbar';
import { EditorViewport } from './editor-viewport';
import { FurnitureInspector } from './furniture-inspector';
import { useLocalScene } from './local-scene';
import { SceneStorageControls } from './scene-storage-controls';
import './workspace.css';
import { AnalysisPanel } from '@/features/spatial/analysis-panel';
export type WorkspaceSession = SaveState & {
  label: string;
  name: string;
  controls: ReactNode;
};
export function Workspace({ session }: { session?: WorkspaceSession }) {
  const { room, units, undo, redo, announcement, selectedPlacementId } =
    useEditorStore();
  const localStorage = useLocalScene(!session);
  const storage = session ?? localStorage;
  const [panel, setPanel] = useState<'room' | 'properties' | 'analysis'>(
    'properties',
  );
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return;
      const value = event.key.toLowerCase();
      if (value === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (value === 'y') {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [undo, redo]);
  return (
    <div className="workspace-shell" inert={storage.status === 'loading'}>
      <header className="workspace-header">
        <Brand />
        <div className="project-heading">
          <span>{session?.name ?? room.name}</span>
          <small data-testid="save-status" role="status" aria-live="polite">
            {session?.label ?? 'Guest'} ·{' '}
            {storage.status === 'saved'
              ? session
                ? 'Saved to cloud'
                : 'Saved on this device'
              : storage.status === 'saving'
                ? 'Saving…'
                : storage.status === 'loading'
                  ? 'Loading…'
                  : session
                    ? 'Not saved to cloud'
                    : 'Not saved locally'}
          </small>
        </div>
        <HistoryControls />
        <Button
          className="desktop-analysis-button"
          size="sm"
          variant="outline"
          aria-pressed={panel === 'analysis'}
          onClick={() =>
            setPanel(panel === 'analysis' ? 'properties' : 'analysis')
          }
        >
          Layout analysis
        </Button>
        <Link className="cloud-project-link" href="/projects">
          Projects
        </Link>
      </header>
      <main id="main" className="workspace-main">
        <h1 className="sr-only">FitSpace room builder</h1>
        <p className="sr-only" role="status">
          {announcement}
        </p>
        <div
          className="mobile-panel-switch"
          role="group"
          aria-label="Workspace panels"
        >
          <Button
            variant={panel === 'room' ? 'default' : 'outline'}
            aria-pressed={panel === 'room'}
            onClick={() => setPanel('room')}
          >
            Room & scene
          </Button>
          <Button
            variant={panel === 'properties' ? 'default' : 'outline'}
            aria-pressed={panel === 'properties'}
            onClick={() => setPanel('properties')}
          >
            Properties
          </Button>
          <Button
            variant={panel === 'analysis' ? 'default' : 'outline'}
            aria-pressed={panel === 'analysis'}
            onClick={() => setPanel('analysis')}
          >
            Analysis
          </Button>
        </div>
        <div className={`workspace-layout mobile-panel-${panel}`}>
          <RoomPanel />
          <section
            className="workspace-center"
            aria-label="Room viewport and controls"
          >
            <WorkspaceToolbar />
            <EditorViewport />
            <div className="workspace-status">
              <span className="status-dot" />
              <span>
                {formatArea(
                  room.dimensions.width.meters * room.dimensions.depth.meters,
                  units,
                )}{' '}
                interior floor area
              </span>
              <span>
                {session ? 'Cloud project' : 'Local save'} · Nominal-envelope
                guidance, not a fit guarantee
              </span>
            </div>
          </section>
          <div className="inspector-stack">
            {panel === 'analysis' ? (
              <AnalysisPanel />
            ) : selectedPlacementId ? (
              <FurnitureInspector />
            ) : (
              <Inspector />
            )}
            {session ? (
              session.controls
            ) : (
              <SceneStorageControls storage={localStorage} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
