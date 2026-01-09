import express from 'express';
import { exec } from 'node:child_process';

const app = express();
app.use(express.json());

// Hardcoded secret (intentional for demo)
const API_KEY = "AIzaSyDUMMY_DEMO_KEY_SHOULD_NOT_BE_HARDCODED";

// Unprotected endpoint (no auth middleware)
app.get('/admin/export', (req, res) => {
  res.json({ ok: true, apiKeyPreview: API_KEY.slice(0, 6) + '...' });
});

// Dangerous usage (intentional)
app.post('/utils/eval', (req, res) => {
  const expression = req.body.expression;
  const result = eval(expression); // DO NOT DO THIS
  res.json({ result });
});

// Command execution with unsanitized input (intentional)
app.get('/diagnostics/ping', (req, res) => {
  const host = req.query.host;
  exec(`ping -n 1 ${host}`, (err, stdout) => {
    if (err) return res.status(500).send(String(err));
    res.type('text/plain').send(stdout);
  });
});

app.listen(3001, () => {
  console.log('Demo app running on http://localhost:3001');
});
