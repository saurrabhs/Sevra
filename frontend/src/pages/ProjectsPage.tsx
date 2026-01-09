import { FiChevronRight, FiFolder, FiGitBranch, FiGithub, FiPlus, FiSearch } from 'react-icons/fi';

type ProjectStatus = 'Scanned' | 'Pending';

type ProjectCard = {
  id: string;
  name: string;
  repo: string;
  branch: string;
  files: number;
  issues: number;
  updated: string;
  status: ProjectStatus;
};

function statusBadge(status: ProjectStatus) {
  if (status === 'Scanned') {
    return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25';
  }
  return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25';
}

export default function ProjectsPage({
  onScanDemo,
}: {
  onScanDemo: () => void;
}) {
  const projects: ProjectCard[] = [
    {
      id: 'demo-1',
      name: 'demo-project',
      repo: 'local/demo-project',
      branch: 'main',
      files: 12,
      issues: 3,
      updated: 'Just now',
      status: 'Scanned',
    },
    {
      id: 'demo-2',
      name: 'api-service',
      repo: 'github.com/user/api-service',
      branch: 'develop',
      files: 156,
      issues: 5,
      updated: '1 day ago',
      status: 'Scanned',
    },
    {
      id: 'demo-3',
      name: 'mobile-app',
      repo: 'github.com/user/mobile-app',
      branch: 'main',
      files: 287,
      issues: 8,
      updated: '3 days ago',
      status: 'Pending',
    },
  ];

  return (
    <div>
      <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/0 p-6 ring-1 ring-white/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Your Projects</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Manage and scan repositories with ease. This MVP scans a built-in demo project on the backend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                window.location.hash = '#/scan';
                onScanDemo();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <FiSearch className="h-4 w-4" />
              Scan Project
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-emerald-400"
              onClick={() => {
                window.location.hash = '#/scan';
              }}
            >
              <FiPlus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {projects.map((p) => (
          <div
            key={p.id}
            className="group rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/[0.07]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/25">
                  <FiFolder className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{p.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
                    <span className="inline-flex items-center gap-1">
                      <FiGithub className="h-3.5 w-3.5" />
                      {p.repo}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 ring-1 ring-white/10">
                      <FiGitBranch className="h-3.5 w-3.5" />
                      {p.branch}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
                    <span>{p.files} files</span>
                    <span>{p.issues} issues</span>
                    <span>{p.updated}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${statusBadge(p.status)}`}>
                  {p.status === 'Scanned' ? '✓ Scanned' : '⏳ Pending'}
                </div>
                <button
                  className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
                  onClick={() => {
                    window.location.hash = '#/scan';
                    onScanDemo();
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    View
                    <FiChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
