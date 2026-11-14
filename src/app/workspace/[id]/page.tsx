import { CloudWorkspace } from '@/features/projects/cloud-workspace';
export const metadata = {
  title: 'Cloud workspace — FitSpace',
  robots: { index: false, follow: false },
};
export default async function CloudProject({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CloudWorkspace key={id} id={id} />;
}
