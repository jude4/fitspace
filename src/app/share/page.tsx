import { SharedView } from '@/features/projects/shared-view';
export const metadata = {
  title: 'Shared snapshot — FitSpace',
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default function SharePage() {
  return <SharedView />;
}
