import type { Metadata } from 'next';
import { Workspace } from '@/features/editor/workspace';
export const metadata: Metadata = {
  title: 'Room builder — FitSpace',
  description:
    'Plan a measured rectangular room with sample furniture, exact transforms, nominal spatial analysis, and local saving.',
};
export default function WorkspacePage() {
  return <Workspace />;
}
