import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'FitSpace — See it. Place it. Know it fits.',
  description:
    'Explore a new perspective on your home. An interactive 3D interior design demo, built around honest measurements and thoughtful spaces.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
