import { beforeEach, describe, it, expect } from 'vitest';
import { useEditorStore, HISTORY_LIMIT } from '@/features/editor/editor-store';
const initial = useEditorStore.getInitialState();
beforeEach(() => useEditorStore.setState(initial, true));
describe('room editing history', () => {
  it('undoes and redoes dimensions, materials, and room creation in order', () => {
    const s = useEditorStore.getState();
    s.execute({ type: 'dimensions', values: { width: 6 } });
    s.execute({ type: 'floor-material', id: 'walnut' });
    s.execute({ type: 'create', preset: 'studio' });
    s.undo();
    expect(useEditorStore.getState().room.dimensions.width.meters).toBe(6);
    expect(useEditorStore.getState().room.floorMaterialId).toBe('walnut');
    s.undo();
    expect(useEditorStore.getState().room.floorMaterialId).toBe('oak');
    s.undo();
    expect(useEditorStore.getState().room.dimensions.width.meters).toBe(4);
    s.redo();
    expect(useEditorStore.getState().room.dimensions.width.source).toBe(
      'user_entered',
    );
    s.redo();
    s.redo();
    expect(useEditorStore.getState().room.name).toBe('Compact studio');
  });
  it('invalid edits and view preferences do not enter history or clear redo', () => {
    const s = useEditorStore.getState();
    s.execute({ type: 'wall-material', id: 'sage' });
    s.undo();
    s.setUnits('imperial');
    s.setView('overhead');
    s.toggleElement('ceiling');
    s.setGrid(false);
    s.resetCamera();
    expect(s.execute({ type: 'dimensions', values: { width: Infinity } })).toBe(
      false,
    );
    expect(useEditorStore.getState().past).toHaveLength(0);
    expect(useEditorStore.getState().future).toHaveLength(1);
    s.redo();
    expect(useEditorStore.getState().room.wallMaterialId).toBe('sage');
  });
  it('limits history and invalidates redo after a new valid command', () => {
    const s = useEditorStore.getState();
    for (let i = 0; i < 120; i++)
      s.execute({ type: 'floor-material', id: i % 2 ? 'oak' : 'walnut' });
    expect(useEditorStore.getState().past).toHaveLength(HISTORY_LIMIT);
    s.undo();
    s.execute({ type: 'wall-material', id: 'clay' });
    expect(useEditorStore.getState().future).toHaveLength(0);
  });
  it('never rewrites dimensions when toggling display units repeatedly', () => {
    const s = useEditorStore.getState();
    s.execute({ type: 'dimensions', values: { width: 4.123456789 } });
    const room = useEditorStore.getState().room;
    for (let i = 0; i < 30; i++) {
      s.setUnits('imperial');
      s.setUnits('metric');
    }
    expect(useEditorStore.getState().room).toBe(room);
  });
});
