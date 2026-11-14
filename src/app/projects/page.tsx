import { Header } from '@/components/header';
import { ProjectsDashboard } from '@/features/projects/projects-dashboard';
import '@/features/projects/projects.css';
export const metadata = { title: 'Your projects — FitSpace' };
export default function Projects() {
  return (
    <>
      <Header />
      <main id="main" className="projects-page section-wrap">
        <p className="eyebrow">YOUR SPACE, SAVED</p>
        <h1>Your projects.</h1>
        <p>
          Keep your guest design on this device, or sign in to save owned cloud
          projects.
        </p>
        <ProjectsDashboard />
      </main>
    </>
  );
}
