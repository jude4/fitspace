import { FuturePage } from '@/components/future-page';
export default function NotFound() {
  return (
    <FuturePage
      eyebrow="404 · ROOM NOT FOUND"
      title="A different space, perhaps?"
      description="This page doesn’t exist. Return to the live demo to explore FitSpace."
      items={[
        'Explore the sample living room.',
        'Try a different palette or camera angle.',
      ]}
    />
  );
}
