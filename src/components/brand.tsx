import Link from 'next/link';
import { Box } from 'lucide-react';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="FitSpace home">
      <Box strokeWidth={1.4} aria-hidden="true" />
      <span>
        fitspace<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
