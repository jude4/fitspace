import { useMemo } from 'react';
import { useEditorStore } from '@/features/editor/editor-store';
import { analyzeLayout } from '@/domain/spatial-analysis';
export function useSpatialAnalysis() {
  const { room, placements, spatial, dragDraft } = useEditorStore();
  return useMemo(
    () =>
      analyzeLayout(
        room,
        dragDraft
          ? placements.map((p) =>
              p.id === dragDraft.id
                ? { ...p, position: dragDraft.position }
                : p,
            )
          : placements,
        spatial,
      ),
    [room, placements, spatial, dragDraft],
  );
}
