'use client';
import { useEffect, useState } from 'react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { formatArea } from '@/domain/units';
import { useEditorStore } from './editor-store';
import { RoomPanel, Inspector } from './room-panels';
import { HistoryControls, WorkspaceToolbar } from './workspace-toolbar';
import { EditorViewport } from './editor-viewport';
import './workspace.css';
export function Workspace() {
  const { room, units, undo, redo, announcement } = useEditorStore();
  const [panel, setPanel] = useState<'room' | 'properties'>('properties');
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
    <div className="workspace-shell">
      <header className="workspace-header">
        <Brand />
        <div className="project-heading">
          <span>{room.name}</span>
          <small>Guest workspace · Not saved</small>
        </div>
        <HistoryControls />
        <span className="phase-badge">ROOM BUILDER</span>
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
              <span>Edits stay in this tab. Refresh resets the room.</span>
            </div>
          </section>
          <Inspector />
        </div>
      </main>
    </div>
  );
}
