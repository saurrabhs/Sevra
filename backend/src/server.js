import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { runScan } from './scan.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/scan', async (_req, res) => {
  try {
    const result = await runScan();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: 'Scan failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

const port = Number(process.env.PORT || 5050);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
