import { useEffect, useMemo, useState } from 'react';

type Severity = 'Critical' | 'High' | 'Medium';

type Finding = {
  id: string;
  title: string;
  severity: Severity;
  file: string;
  line: number;
  snippet: string;
  meta?: Record<string, unknown>;
};

type AiExplanation = {
  ok: boolean;
  model: string | null;
  prompt: string | null;
  responseText: string;
  finding: {
    title: string;
    severity: Severity;
    file: string;
    line: number;
    snippet: string;
  };
} | null;

type ScanResponse = {
  scannedPath: string;
  fileCount: number;
  score: number;
  findings: Finding[];
  aiExplanation: AiExplanation;
};

function severityClasses(sev: Severity) {
  switch (sev) {
    case 'Critical':
      return 'bg-red-500/15 text-red-200 ring-1 ring-red-500/30';
    case 'High':
      return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30';
    case 'Medium':
      return 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30';
    default:
      return 'bg-white/10 text-white/80 ring-1 ring-white/20';
  }
}

function scoreLabel(score: number) {
  if (score >= 90) return { text: 'Strong', cls: 'text-emerald-300' };
  if (score >= 70) return { text: 'Needs review', cls: 'text-amber-200' };
  return { text: 'At risk', cls: 'text-red-200' };
}

export default function ScanPage({ autoRun }: { autoRun: number }) {
  const [loading, setLoading] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScanResponse | null>(null);
  const [aiOpen, setAiOpen] = useState(true);

  const stats = useMemo(() => {
    const score = data?.score ?? 0;
    const label = scoreLabel(score);
    const total = data?.findings?.length ?? 0;
    const critical = data?.findings?.filter((f: Finding) => f.severity === 'Critical').length ?? 0;
    const high = data?.findings?.filter((f: Finding) => f.severity === 'High').length ?? 0;
    const medium = data?.findings?.filter((f: Finding) => f.severity === 'Medium').length ?? 0;
    return { score, label, total, critical, high, medium };
  }, [data]);

  async function runScan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ScanResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function explainFinding(findingId: string) {
    setAiLoadingId(findingId);
    setError(null);
    try {
      const res = await fetch('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explainFindingId: findingId }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ScanResponse;
      setData(json);
      setAiOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoadingId(null);
    }
  }

  // autoRun changes when Projects page triggers scan
  useEffect(() => {
    if (autoRun > 0) void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  return (
    <div>
      <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/0 p-6 ring-1 ring-white/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Demo Scan</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Run a real static scan on the backend demo project. AI explanation is best-effort and may be rate-limited on free tier.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runScan}
              disabled={loading}
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Scanning…' : 'Scan Demo Project'}
              <span className="transition group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-white/50">Security Score</div>
                <div className="mt-2 flex items-baseline gap-3">
                  <div className="text-4xl font-semibold text-white">{data ? stats.score : '—'}</div>
                  <div className={`text-sm ${stats.label.cls}`}>{data ? stats.label.text : 'Run scan'}</div>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/5 ring-1 ring-white/10" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-xs text-white/50">Critical</div>
                <div className="mt-1 text-lg font-semibold text-white">{data ? stats.critical : '—'}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-xs text-white/50">High</div>
                <div className="mt-1 text-lg font-semibold text-white">{data ? stats.high : '—'}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-xs text-white/50">Medium</div>
                <div className="mt-1 text-lg font-semibold text-white">{data ? stats.medium : '—'}</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-white/50">
              {data ? (
                <div>
                  Scanned <span className="text-white/70">{data.fileCount}</span> files in{' '}
                  <span className="text-white/70">{data.scannedPath}</span>
                </div>
              ) : (
                <div>Scanner reads files from backend demo folder.</div>
              )}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-500/25">
              {error}
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">AI explanation</div>
                <div className="mt-1 text-xs text-white/60">Gemini analyzes one detected issue and suggests fixes.</div>
              </div>
              <button
                className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
                onClick={() => setAiOpen((v) => !v)}
                disabled={!data}
              >
                {aiOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {data ? (
              aiOpen ? (
                <div className="mt-4">
                  <div className="rounded-xl bg-black/30 p-3 text-xs text-white/70 ring-1 ring-white/10">
                    <div className="font-medium text-white">Targeted finding</div>
                    <div className="mt-1">
                      <span className="text-white/80">{data.aiExplanation?.finding.title ?? '—'}</span>
                    </div>
                    <div className="mt-1 text-white/50">
                      {data.aiExplanation?.finding.file}:{data.aiExplanation?.finding.line}
                    </div>
                  </div>

                  <div className="mt-3 whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-sm text-white/80 ring-1 ring-white/10">
                    {data.aiExplanation?.responseText ?? 'No AI explanation returned.'}
                  </div>
                </div>
              ) : null
            ) : (
              <div className="mt-4 text-sm text-white/60">Run a scan to see Gemini output.</div>
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Detected vulnerabilities</div>
                <div className="mt-1 text-xs text-white/60">Rule-based static analysis on the demo project.</div>
              </div>
              <div className="text-xs text-white/50">{data ? `${stats.total} findings` : '—'}</div>
            </div>

            <div className="mt-4 space-y-3">
              {data ? (
                data.findings.length ? (
                  data.findings.map((f: Finding) => (
                    <div
                      key={f.id}
                      className="rounded-xl bg-black/30 p-4 ring-1 ring-white/10 transition hover:bg-black/40"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-white">{f.title}</div>
                          <div className="text-xs text-white/55">
                            {f.file}:{f.line}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs ${severityClasses(
                              f.severity
                            )}`}
                          >
                            {f.severity}
                          </div>
                          <button
                            className="inline-flex items-center justify-center rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => explainFinding(f.id)}
                            disabled={aiLoadingId === f.id || loading}
                          >
                            {aiLoadingId === f.id ? 'Asking Gemini…' : 'Fix with Gemini'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-lg bg-black/40 p-3 font-mono text-xs text-white/70 ring-1 ring-white/10">
                        {f.snippet}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-200 ring-1 ring-emerald-500/25">
                    No issues detected in demo project.
                  </div>
                )
              ) : (
                <div className="rounded-xl bg-white/5 p-4 text-sm text-white/60 ring-1 ring-white/10">
                  Click <span className="text-white/80">Scan Demo Project</span> to run a real static analysis on backend files.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-10 text-xs text-white/40">MVP demo only. No uploads. No history. Local scan of backend demo folder.</footer>
    </div>
  );
}
