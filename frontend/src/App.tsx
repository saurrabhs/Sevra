import { useEffect, useMemo, useState } from 'react';

import AppShell from './components/AppShell';
import ProjectsPage from './pages/ProjectsPage';
import ScanPage from './pages/ScanPage';

function getRoute() {
  const h = (window.location.hash || '').trim();
  if (h === '#/scan') return 'scan' as const;
  if (h === '#/projects') return 'projects' as const;
  if (!h || h === '#/') return 'projects' as const;
  return 'projects' as const;
}

export default function App() {
  const [route, setRoute] = useState(getRoute());
  const [scanTrigger, setScanTrigger] = useState(0);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.location.hash = '#/projects';
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const nav = useMemo(
    () => [
      { label: 'Projects', href: '#/projects' },
      { label: 'Demo Scan', href: '#/scan' },
    ],
    []
  );

  return (
    <AppShell
      title="Sevra"
      nav={nav}
      right={
        <a
          href="#/projects"
          className="hidden rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 md:inline-flex"
        >
          Import from GitHub
        </a>
      }
    >
      {route === 'projects' ? (
        <ProjectsPage onScanDemo={() => setScanTrigger((v) => v + 1)} />
      ) : (
        <ScanPage autoRun={scanTrigger} />
      )}
    </AppShell>
  );
}
