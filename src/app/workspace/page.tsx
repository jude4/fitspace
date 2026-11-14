import { FuturePage } from '@/components/future-page';
export default function Workspace() {
  return (
    <FuturePage
      eyebrow="THE WORKSPACE · COMING IN PHASE 2"
      title="A place for your next idea."
      description="The interactive room editor is the next development phase. For now, explore the sample room on the home page. This page does not create or save a design."
      items={[
        'Create a rectangular room with your measurements.',
        'Change room materials and explore overhead and perspective views.',
        'Use clear dimension labels and undoable editing controls.',
      ]}
    />
  );
}
