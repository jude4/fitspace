import { FuturePage } from '@/components/future-page';
export default function Projects() {
  return (
    <FuturePage
      eyebrow="YOUR PROJECTS · PLANNED FOR PHASE 5"
      title="Good ideas deserve a home."
      description="Accounts and cloud projects are planned for a later phase. There is no sign-in or cloud storage in this release."
      items={[
        'Save and reopen your own projects.',
        'Manage project versions and clear save status.',
        'Share a read-only snapshot with a revocable link.',
      ]}
    />
  );
}
