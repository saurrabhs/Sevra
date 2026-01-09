import path from 'node:path';

import { runScan } from '../backend/src/scan.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const originalCwd = process.cwd();
    const backendDir = path.resolve(originalCwd, 'backend');

    // scan.js uses process.cwd() to locate demo-project. Switch into backend for the duration.
    process.chdir(backendDir);
    try {
      const explainFindingId = typeof req.body?.explainFindingId === 'string' ? req.body.explainFindingId : null;
      const result = await runScan({ explainFindingId });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    } finally {
      process.chdir(originalCwd);
    }
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Scan failed',
        details: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
