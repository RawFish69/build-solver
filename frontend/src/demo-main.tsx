import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import '@/app/theme.css';
import HeroDitheringCardDemo from '@/components/ui/hero-dithering-card.demo';
import HeroControlRoomCardDemo from '@/components/ui/hero-control-room-card.demo';

// Registry of standalone component demos, viewable at demo.html?demo=<key>.
// Add an entry here for each new component pulled in for comparison.
const demos: Record<string, ComponentType> = {
  'hero-dithering-card': HeroDitheringCardDemo,
  'hero-control-room-card': HeroControlRoomCardDemo,
};

function DemoIndex() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', color: 'var(--wb-text)' }}>
      <h1>Component demos</h1>
      <ul>
        {Object.keys(demos).map((key) => (
          <li key={key}>
            <a href={`?demo=${key}`}>{key}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const requestedDemo = new URLSearchParams(window.location.search).get('demo');
const Demo = requestedDemo ? demos[requestedDemo] : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>{Demo ? <Demo /> : <DemoIndex />}</StrictMode>,
);
