const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const REQUEST_TIMEOUT_MS = 5000;

const normalizeBase = (url) => (url || DEFAULT_OLLAMA_URL).trim().replace(/\/+$/, '');

const withTimeout = (signal, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal && typeof AbortSignal.any === 'function'
    ? AbortSignal.any([signal, timeout])
    : signal || timeout;
};

const ollamaError = (error, baseUrl) => {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return new Error(`Ollama did not respond at ${baseUrl} within ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
  }
  return new Error(`Could not reach Ollama at ${baseUrl}. Start Ollama and check the URL.`);
};

export const listOllamaModels = async (baseUrl, { signal } = {}) => {
  const normalized = normalizeBase(baseUrl);
  try {
    const res = await fetch(`${normalized}/api/tags`, {
      signal: withTimeout(signal),
    });
    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status}.`);
    }
    const data = await res.json();
    return (data.models || []).map((model) => model.name).filter(Boolean);
  } catch (error) {
    if (/Ollama returned HTTP/.test(error?.message || '')) throw error;
    throw ollamaError(error, normalized);
  }
};

export const testOllama = async ({ baseUrl, model, signal }) => {
  const normalized = normalizeBase(baseUrl);
  const models = await listOllamaModels(normalized, { signal });
  if (!models.length) {
    return {
      ok: false,
      detail: 'Ollama is running, but no models are installed. Run: ollama pull llama3.2',
      models,
    };
  }

  const selected = String(model || '').trim();
  const matched = models.some((name) => (
    name === selected
    || name.startsWith(`${selected}:`)
    || selected.startsWith(`${name}:`)
  ));
  if (!selected || !matched) {
    return {
      ok: false,
      detail: selected
        ? `Model "${selected}" is not installed. Choose one of the detected models.`
        : 'Choose an installed Ollama model.',
      models,
    };
  }

  return {
    ok: true,
    detail: `Connected · ${selected} is installed`,
    models,
  };
};

export const completeOllamaJson = async ({ prompt, system, model, baseUrl, signal }) => {
  const normalized = normalizeBase(baseUrl);
  let res;
  try {
    res = await fetch(`${normalized}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: withTimeout(signal, 120000),
      body: JSON.stringify({
        model: model || 'llama3.2',
        stream: false,
        format: 'json',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });
  } catch (error) {
    throw ollamaError(error, normalized);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama error (${res.status}): ${body.slice(0, 180)}`);
  }

  const data = await res.json();
  return data?.message?.content || '';
};
