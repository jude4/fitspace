import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Header } from './header';
import { Button } from './ui/button';
export function FuturePage({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <>
      <Header />
      <main id="main" className="future-page section-wrap">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="future-description">{description}</p>
        <div className="future-details">
          <h2>What’s ahead</h2>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="hero-actions">
          <Button asChild>
            <Link href="/#demo">
              Explore the live demo{' '}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft size={17} aria-hidden="true" /> Back to home
            </Link>
          </Button>
        </div>
        <p className="quiet-note">
          No signup, cloud saving, or furniture editing is available yet.
        </p>
      </main>
    </>
  );
}
