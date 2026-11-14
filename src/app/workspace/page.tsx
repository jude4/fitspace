import type { Metadata } from 'next';
import { Workspace } from '@/features/editor/workspace';
export const metadata: Metadata = {
  title: 'Room builder — FitSpace',
  description:
    'Create and inspect an empty rectangular room with your measurements.',
};
export default function WorkspacePage() {
  return <Workspace />;
}
