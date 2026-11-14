import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
export function Header() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Main navigation">
        <Link href="/#possibilities">The possibilities</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/business">For professionals</Link>
        <Link href="/projects">Projects</Link>
      </nav>
      <Button asChild size="sm">
        <Link href="/workspace">
          Start designing <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </Button>
    </header>
  );
}
