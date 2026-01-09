import fs from 'node:fs/promises';
import path from 'node:path';

import { getGeminiExplanation } from './gemini.js';

const DEMO_PROJECT_DIR = path.resolve(process.cwd(), 'demo-project');

function severityWeight(severity) {
  switch (severity) {
    case 'Critical':
      return 30;
    case 'High':
      return 20;
    case 'Medium':
      return 10;
    default:
      return 5;
  }
}

function scoreFromFindings(findings) {
  let score = 100;
  for (const f of findings) score -= severityWeight(f.severity);
  return Math.max(0, Math.min(100, score));
}

async function listFilesRecursively(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await listFilesRecursively(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

function relDemoPath(filePath) {
  return path.relative(DEMO_PROJECT_DIR, filePath).replaceAll('\\', '/');
}

function findUnprotectedExpressEndpoints(content, filePath) {
  const findings = [];

  const lines = content.split(/\r?\n/);

  // Heuristic: routes like app.get('/x', handler) or router.post('/x', handler)
  // If there isn't a middleware argument that looks like auth/requireAuth before the handler.
  const routeRe = /(app|router)\.(get|post|put|delete|patch)\(\s*(["'`][^"'`]+["'`])\s*,\s*([^\n;]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    routeRe.lastIndex = 0;
    let m;
    while ((m = routeRe.exec(line)) !== null) {
      const routePath = m[3].slice(1, -1);
      const args = m[4];

      // Consider protected if auth-like middleware appears before handler
      // Common patterns: requireAuth, auth, authenticate, ensureAuthenticated
      const looksProtected = /\b(requireAuth|auth|authenticate|ensureAuthenticated)\b/.test(args);
      if (!looksProtected) {
        findings.push({
          id: `unprotected-endpoint:${relDemoPath(filePath)}:${i + 1}:${routePath}`,
          title: 'Unprotected API endpoint',
          severity: 'High',
          file: relDemoPath(filePath),
          line: i + 1,
          snippet: line.trim().slice(0, 240),
          meta: { route: routePath },
        });
      }
    }
  }

  return findings;
}

function findHardcodedSecrets(content, filePath) {
  const findings = [];
  const lines = content.split(/\r?\n/);

  const secretVarRe = /\b(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY)\b/i;
  const assignRe = /(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(["'`])([^\3\n]{12,})\3/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const am = line.match(assignRe);
    if (am) {
      const varName = am[2];
      const value = am[4];
      const looksLikeKey =
        secretVarRe.test(varName) ||
        /^(sk-|AKIA|AIza)/.test(value) ||
        /[A-Za-z0-9_\-]{20,}/.test(value);

      if (looksLikeKey) {
        findings.push({
          id: `hardcoded-secret:${relDemoPath(filePath)}:${i + 1}:${varName}`,
          title: 'Hardcoded secret in source code',
          severity: 'Critical',
          file: relDemoPath(filePath),
          line: i + 1,
          snippet: line.trim().slice(0, 240),
          meta: { variable: varName },
        });
      }
    }

    // Also detect common key shapes in string literals
    if (/(sk-[A-Za-z0-9]{16,})|(AKIA[0-9A-Z]{16})|(AIza[0-9A-Za-z\-_]{20,})/.test(line)) {
      findings.push({
        id: `hardcoded-secret-pattern:${relDemoPath(filePath)}:${i + 1}`,
        title: 'Potential hardcoded API key',
        severity: 'High',
        file: relDemoPath(filePath),
        line: i + 1,
        snippet: line.trim().slice(0, 240),
        meta: {},
      });
    }
  }

  return findings;
}

function findDangerousFunctions(content, filePath) {
  const findings = [];
  const lines = content.split(/\r?\n/);

  const patterns = [
    { re: /\beval\s*\(/, title: 'Dangerous function usage: eval()', severity: 'High' },
    { re: /\bFunction\s*\(/, title: 'Dangerous function usage: Function()', severity: 'High' },
    { re: /\bchild_process\s*\.\s*exec(Sync)?\s*\(/, title: 'Command execution via child_process.exec', severity: 'Critical' },
    { re: /\bexec(Sync)?\s*\(/, title: 'Potential command execution (exec/execSync)', severity: 'High' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const p of patterns) {
      if (p.re.test(line)) {
        const severity = p.severity;
        findings.push({
          id: `dangerous:${relDemoPath(filePath)}:${i + 1}:${p.title}`,
          title: p.title,
          severity,
          file: relDemoPath(filePath),
          line: i + 1,
          snippet: line.trim().slice(0, 240),
          meta: {},
        });
      }
    }

    // Lightweight "unsanitized input" signal if req.query/body flows into eval/exec in same line
    if (/\b(req\.(query|body|params)\b)/.test(line) && /(eval\s*\(|exec(Sync)?\s*\()/.test(line)) {
      findings.push({
        id: `unsanitized-input:${relDemoPath(filePath)}:${i + 1}`,
        title: 'Unsanitized input used in dangerous sink',
        severity: 'Critical',
        file: relDemoPath(filePath),
        line: i + 1,
        snippet: line.trim().slice(0, 240),
        meta: {},
      });
    }
  }

  return findings;
}

function scanFile(filePath, content) {
  const findings = [];

  findings.push(...findUnprotectedExpressEndpoints(content, filePath));
  findings.push(...findHardcodedSecrets(content, filePath));
  findings.push(...findDangerousFunctions(content, filePath));

  return findings;
}

function pickFindingForAI(findings) {
  const order = { Critical: 3, High: 2, Medium: 1 };
  return [...findings].sort((a, b) => (order[b.severity] ?? 0) - (order[a.severity] ?? 0))[0] ?? null;
}

export async function runScan() {
  const files = await listFilesRecursively(DEMO_PROJECT_DIR);
  const scanTargets = files.filter((f) => /\.(js|ts|jsx|tsx|json|env|yml|yaml)$/i.test(f));

  const findings = [];
  for (const filePath of scanTargets) {
    const content = await fs.readFile(filePath, 'utf8');
    findings.push(...scanFile(filePath, content));
  }

  const score = scoreFromFindings(findings);
  const aiTarget = pickFindingForAI(findings);

  const aiExplanation = aiTarget
    ? await getGeminiExplanation({
        title: aiTarget.title,
        severity: aiTarget.severity,
        file: aiTarget.file,
        line: aiTarget.line,
        snippet: aiTarget.snippet,
      })
    : null;

  return {
    scannedPath: 'demo-project',
    fileCount: scanTargets.length,
    score,
    findings,
    aiExplanation,
  };
}
