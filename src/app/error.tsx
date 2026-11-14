'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="future-page section-wrap">
      <p className="eyebrow">SOMETHING INTERRUPTED THE VIEW</p>
      <h1>Let’s try that again.</h1>
      <p>
        The page could not finish loading. Your browser’s graphics settings or a
        temporary connection issue may be involved.
      </p>
      <Button onClick={reset}>Try again</Button>
      <Link href="/">Return home</Link>
    </main>
  );
}
