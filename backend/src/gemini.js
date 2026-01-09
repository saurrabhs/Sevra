import { GoogleGenerativeAI } from '@google/generative-ai';

function getCandidateModels() {
  const fromEnv = (process.env.GEMINI_MODEL || '').trim();
  const candidates = [
    fromEnv,
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.0-pro',
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function isModelNotSupportedError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /404/.test(msg) ||
    /not found/i.test(msg) ||
    /not supported/i.test(msg) ||
    /models\//i.test(msg)
  );
}

async function discoverGenerateContentModel(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `ListModels failed (HTTP ${res.status})`);
  }

  const json = await res.json();
  const models = Array.isArray(json?.models) ? json.models : [];

  const supported = models
    .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => m?.name)
    .filter(Boolean);

  // Prefer stable (non-preview/non-experimental) flash for faster UX.
  const stable = supported.filter((n) => !/(preview|experimental|exp|image-preview)/i.test(n));
  const preferred =
    stable.find((n) => /gemini-.*flash/i.test(n)) ??
    stable.find((n) => /gemini/i.test(n)) ??
    supported.find((n) => /gemini-.*flash/i.test(n)) ??
    supported.find((n) => /gemini/i.test(n)) ??
    null;
  // API returns names like "models/gemini-..."; SDK expects "gemini-..."
  return preferred ? String(preferred).replace(/^models\//, '') : null;
}

function isRateLimitError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b/.test(msg) || /quota/i.test(msg) || /rate limit/i.test(msg) || /RESOURCE_EXHAUSTED/i.test(msg);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function generateWithRetry(model, prompt) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      if (!isRateLimitError(err) || attempt === maxAttempts) throw err;
      const backoffMs = 400 * 2 ** (attempt - 1);
      await sleep(backoffMs);
    }
  }
  throw new Error('Gemini call failed after retries.');
}

function safeSnippet(snippet) {
  const s = String(snippet ?? '');
  const oneLine = s.replace(/\s+/g, ' ').trim();
  // Keep prompt small to avoid TPM pressure on free tier.
  return oneLine.slice(0, 240);
}

export async function getGeminiExplanation(finding) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      model: null,
      prompt: null,
      responseText:
        'GEMINI_API_KEY is not set. Add it to backend/.env to enable AI explanations.',
      finding,
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const candidateModels = getCandidateModels();

  const snippet = safeSnippet(finding.snippet);

  const prompt = `You are an internal security analyst. Explain the issue and give fixes.

Return Markdown with headings:
## Why this is dangerous
## How to fix

Issue:
${finding.title} (${finding.severity}) at ${finding.file}:${finding.line}
Snippet: ${snippet}
`;

  try {
    let lastErr = null;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 512),
            temperature: 0.2,
          },
        });
        const result = await generateWithRetry(model, prompt);
        const responseText = result?.response?.text?.() ?? '';

        return {
          ok: true,
          model: modelName,
          prompt,
          responseText: responseText || 'No response text returned by Gemini.',
          finding,
        };
      } catch (err) {
        lastErr = err;
        if (!isModelNotSupportedError(err)) throw err;
      }
    }

    // As a last resort, ask the API what models are available for this key and retry once.
    try {
      const discovered = await discoverGenerateContentModel(apiKey);
      if (discovered) {
        const model = genAI.getGenerativeModel({
          model: discovered,
          generationConfig: {
            maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 512),
            temperature: 0.2,
          },
        });
        const result = await generateWithRetry(model, prompt);
        const responseText = result?.response?.text?.() ?? '';

        return {
          ok: true,
          model: discovered,
          prompt,
          responseText: responseText || 'No response text returned by Gemini.',
          finding,
        };
      }
    } catch (err) {
      lastErr = err;
    }

    throw lastErr ?? new Error('Gemini call failed for unknown reasons.');
  } catch (err) {
    const attempted = candidateModels.join(', ');

    if (isRateLimitError(err)) {
      return {
        ok: false,
        model: candidateModels[0] ?? null,
        prompt,
        responseText:
          'Gemini API rate limit/quota reached for this project (free tier). ' +
          'The scan results are available, but AI explanation is temporarily unavailable. ' +
          'Try again later or reduce request frequency / enable billing for higher limits.',
        finding,
      };
    }

    return {
      ok: false,
      model: candidateModels[0] ?? null,
      prompt,
      responseText:
        (err instanceof Error ? err.message : String(err)) +
        `\n\nAttempted models: ${attempted}`,
      finding,
    };
  }
}
