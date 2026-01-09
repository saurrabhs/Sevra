import { ReactNode } from 'react';

type NavItem = {
  label: string;
  href: string;
};

export default function AppShell({
  title,
  right,
  nav,
  children,
}: {
  title: string;
  right?: ReactNode;
  nav: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold tracking-tight text-white">{title}</div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = window.location.hash === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={
                    'rounded-lg px-3 py-2 text-sm transition ' +
                    (active
                      ? 'bg-white/10 text-white ring-1 ring-white/15'
                      : 'text-white/70 hover:bg-white/5 hover:text-white')
                  }
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">{right}</div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
