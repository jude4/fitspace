import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Layers3,
  Move3D,
  Ruler,
  ScanLine,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { RoomPreview } from '@/features/landing/room-preview';
import { RoomCollection } from '@/features/landing/room-collection';

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero section-wrap">
          <div className="hero-heading">
            <div>
              <p className="eyebrow">
                <span className="tiny-line" /> A NEW PERSPECTIVE ON HOME
              </p>
              <h1>
                See it. Place it.
                <br />
                <em>Know it fits.</em>
              </h1>
            </div>
            <div className="hero-intro">
              <p>
                Good spaces start with a little imagination.
                <br className="desktop-break" /> Explore yours in 3D, one
                thoughtful piece at a time.
              </p>
              <div className="hero-actions">
                <Button asChild>
                  <Link href="/workspace">
                    Start Designing{' '}
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <a href="#demo">
                    Explore Demo <ArrowDown size={16} aria-hidden="true" />
                  </a>
                </Button>
              </div>
              <span className="quiet-note">
                Explore the demo. No account needed.
              </span>
            </div>
          </div>
          <RoomPreview />
        </section>
        <div className="principles section-wrap">
          <span>
            A little less guesswork.
            <br />
            <strong>A lot more possibility.</strong>
          </span>
          <span>
            <Move3D size={19} aria-hidden="true" /> A new dimension of design
          </span>
          <span>
            <Ruler size={19} aria-hidden="true" /> Thoughtful about space
          </span>
          <span>
            <Layers3 size={19} aria-hidden="true" /> Your home, your perspective
          </span>
        </div>
        <section id="possibilities" className="section-wrap content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ROOM TO REIMAGINE</p>
              <h2>
                Same space.
                <br />
                <em>Entirely new feeling.</em>
              </h2>
            </div>
            <p>
              Start with a mood, then make it your own. Explore three material
              palettes in our live sample room.
            </p>
          </div>
          <RoomCollection />
          <div className="feature-grid">
            {[
              {
                icon: Move3D,
                title: 'Look from every angle',
                text: 'Orbit the live room, move closer, or switch to a front view. A different perspective can change everything.',
              },
              {
                icon: Layers3,
                title: 'Find your material language',
                text: 'Warm woods, soft neutrals, earthy accents. Change the palette and watch the whole room come together.',
              },
              {
                icon: ScanLine,
                title: 'See the difference',
                text: 'Switch between an empty room and a furnished concept. Explore the possibilities before making a commitment.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon size={26} strokeWidth={1.3} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="how-section">
          <div className="section-wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">FROM A THOUGHT TO A THOUGHTFUL SPACE</p>
                <h2>
                  A clearer picture.
                  <br />
                  <em>One step at a time.</em>
                </h2>
              </div>
              <p>
                Explore the live demo, then create your own measured room.
                Furniture placement and spatial analysis are next.
              </p>
            </div>
            <ol className="steps">
              <li>
                <span>01</span>
                <h3>Discover your direction</h3>
                <p>
                  Explore the room above. Try a different palette, change your
                  perspective, and see what feels like home.
                </p>
                <small>AVAILABLE IN THE DEMO</small>
              </li>
              <li>
                <span>02</span>
                <h3>Make room for your ideas</h3>
                <p>
                  Enter your room measurements and build a space that reflects
                  your own. Metric and imperial, with clear measurement sources.
                </p>
                <small>AVAILABLE · ROOM BUILDER</small>
              </li>
              <li>
                <span>03</span>
                <h3>Place with perspective</h3>
                <p>
                  Arrange furniture, inspect dimensions, and understand
                  potential overlaps. Useful guidance, with honest limitations.
                </p>
                <small>PLANNED · PLACEMENT & ANALYSIS</small>
              </li>
            </ol>
          </div>
        </section>
        <section className="section-wrap business-section">
          <div>
            <p className="eyebrow">FOR PEOPLE WHO THINK IN SPACES</p>
            <h2>
              Better spaces.
              <br />
              <em>Built together.</em>
            </h2>
            <p>
              We’re building FitSpace for designers, studios, and furniture
              retailers, too. A shared language between an idea and the room it
              could become.
            </p>
            <Button asChild variant="outline">
              <Link href="/business">
                Explore the professional vision{' '}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="business-note">
            <Ruler size={36} strokeWidth={1} aria-hidden="true" />
            <blockquote>
              Beautiful is a feeling.
              <br />
              Fit is a measurement.
              <br />
              <em>Both deserve care.</em>
            </blockquote>
            <p>
              Manufacturer dimensions, user measurements, and estimates will
              always be clearly distinguished. Visualization should inspire
              confidence without pretending to guarantee fit.
            </p>
          </div>
        </section>
        <section className="closing section-wrap">
          <p className="eyebrow">A FRESH PERSPECTIVE STARTS HERE</p>
          <h2>
            Your space.
            <br />
            <em>Full of possibility.</em>
          </h2>
          <Button asChild>
            <Link href="/workspace">
              Start Designing <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="site-footer section-wrap">
        <Brand />
        <p>See it. Place it. Know it fits.</p>
        <div>
          <Link href="/business">For professionals</Link>
          <a href="#demo">Explore demo</a>
        </div>
        <small>
          © {new Date().getFullYear()} FitSpace · An evolving design tool.
        </small>
      </footer>
    </>
  );
}
