import { CHARS_PER_TOKEN, PROVIDER_BUDGET_CHARS } from '../budget.js';

const CHROME_OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/** Leaves room for the response and for tokenizer drift in our char estimate. */
const SAFETY = 0.8;

export const getPromptApi = () => {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.LanguageModel ?? globalThis.ai?.languageModel ?? null;
};

export const getChromeAvailability = async () => {
  const api = getPromptApi();
  if (!api) return 'unsupported';
  try {
    if (typeof api.availability === 'function') {
      const status = await api.availability(CHROME_OPTIONS);
      if (['available', 'downloadable', 'downloading', 'unavailable'].includes(status)) {
        return status;
      }
      return 'unavailable';
    }
    if (typeof api.capabilities === 'function') {
      const caps = await api.capabilities();
      if (caps.available === 'readily') return 'available';
      if (caps.available === 'after-download') return 'downloadable';
      return 'unavailable';
    }
    return 'unsupported';
  } catch {
    return 'unavailable';
  }
};

export const describeChromeAvailability = (status) => {
  switch (status) {
    case 'available':
      return 'Gemini Nano is ready on this device.';
    case 'downloadable':
      return 'Gemini Nano can be downloaded. The first download may take several minutes.';
    case 'downloading':
      return 'Gemini Nano is downloading in the background.';
    case 'unavailable':
      return 'This device does not currently meet Chrome’s on-device AI requirements.';
    default:
      return 'Chrome’s Prompt API is not exposed in this browser profile.';
  }
};

export const downloadChromeModel = async ({ onProgress, signal } = {}) => {
  const api = getPromptApi();
  if (!api) {
    throw new Error('Chrome built-in AI is not available in this browser profile.');
  }

  let session;
  try {
    session = await api.create({
      ...CHROME_OPTIONS,
      signal,
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', (event) => {
          if (typeof event.loaded === 'number') onProgress?.(event.loaded);
        });
      },
    });
    onProgress?.(1);
    cachedBudget = null;
    return getChromeAvailability();
  } finally {
    try {
      session?.destroy?.();
    } catch {
      /* ignore */
    }
  }
};

export const testChromeModel = async ({ signal } = {}) => {
  const status = await getChromeAvailability();
  if (status !== 'available') {
    return { ok: false, detail: describeChromeAvailability(status), status };
  }

  const api = getPromptApi();
  let session;
  try {
    session = await api.create({ ...CHROME_OPTIONS, signal });
    const result = await session.prompt('Reply with only the word ready.');
    if (!String(result || '').trim()) {
      return { ok: false, detail: 'Chrome created a model session but returned an empty response.', status };
    }
    return { ok: true, detail: 'Connected · Gemini Nano answered a test prompt', status };
  } catch (error) {
    return {
      ok: false,
      detail: error?.message || 'Chrome could not create a Gemini Nano session.',
      status,
    };
  } finally {
    try {
      session?.destroy?.();
    } catch {
      /* ignore */
    }
  }
};

/** Tokens still available in this session, or null when unreported. */
const remainingTokens = (session) => {
  const quota = Number(session?.inputQuota);
  if (!Number.isFinite(quota) || quota <= 0) return null;
  const used = Number(session?.inputUsage);
  return Math.max(0, quota - (Number.isFinite(used) ? used : 0));
};

const measureTokens = async (session, text) => {
  if (typeof session?.measureInputUsage !== 'function') return null;
  try {
    const value = await session.measureInputUsage(text);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

let cachedBudget = null;

/**
 * The probe session carries no system prompt, but every real request does, so
 * the reported quota has to be discounted or callers size their prompts as if
 * the whole window were theirs.
 */
const SYSTEM_RESERVE_CHARS = 1200;

/**
 * Character budget for a Chrome prompt, derived from the model's real input
 * quota. Cached because it costs a throwaway session to read.
 */
export const getChromeBudgetChars = async () => {
  if (cachedBudget) return cachedBudget;
  const api = getPromptApi();
  if (!api) return PROVIDER_BUDGET_CHARS.chrome;
  let session;
  try {
    session = await api.create(CHROME_OPTIONS);
    const tokens = remainingTokens(session);
    cachedBudget = tokens
      ? Math.max(600, Math.floor(tokens * CHARS_PER_TOKEN * SAFETY) - SYSTEM_RESERVE_CHARS)
      : PROVIDER_BUDGET_CHARS.chrome;
  } catch {
    cachedBudget = PROVIDER_BUDGET_CHARS.chrome;
  } finally {
    try {
      session?.destroy?.();
    } catch {
      /* ignore */
    }
  }
  return cachedBudget;
};

const isTooLarge = (error) => {
  const name = error?.name || '';
  const message = String(error?.message || error || '');
  return name === 'QuotaExceededError' || /too large|quota/i.test(message);
};

/** Fresh sessions per attempt: a rejected prompt can leave usage on the old one. */
const createSession = (api, { system, signal, onDownloadProgress, pendingDownload }) => api.create({
  ...CHROME_OPTIONS,
  initialPrompts: system ? [{ role: 'system', content: system }] : undefined,
  signal,
  monitor(monitor) {
    monitor.addEventListener('downloadprogress', (event) => {
      // Chrome fires `downloadprogress` on every session, including a single
      // loaded: 1 event when the model is already on disk. Availability is what
      // actually says whether bytes are coming down.
      if (!pendingDownload || event.loaded >= 1) return;
      onDownloadProgress?.(event.loaded);
    });
  },
});

/**
 * Renders the largest prompt that `session` reports it can measure and accept.
 * Returns the rendered text; when the session cannot measure usage the budget
 * is taken on trust and the caller has to handle a rejection.
 */
const fitPrompt = async (session, render, startBudget) => {
  const available = remainingTokens(session);
  let budget = startBudget ?? (available
    ? Math.floor(available * CHARS_PER_TOKEN * SAFETY)
    : PROVIDER_BUDGET_CHARS.chrome);
  let text = render(budget);

  for (let pass = 0; pass < 4; pass += 1) {
    const tokens = await measureTokens(session, text);
    if (tokens == null || available == null) break;
    if (tokens <= available * SAFETY) break;
    // Scale the budget by how far over we landed, then re-render.
    budget = Math.max(400, Math.floor(budget * ((available * SAFETY) / tokens) * 0.9));
    const next = render(budget);
    if (next === text) break;
    text = next;
  }

  return { text, budget };
};

/**
 * How hard to shrink after the model rejects a prompt outright. Our
 * chars-per-token estimate is optimistic for the domain and URL lists these
 * prompts carry, which tokenize well below four characters each.
 */
const RETRY_SCALE = 0.5;
const MAX_ATTEMPTS = 4;

/**
 * `prompt` may be a string or a `(budgetChars) => string` renderer. When a
 * renderer is supplied the prompt is re-rendered smaller until it fits the
 * session quota, and a quota rejection is retried at half the budget on a fresh
 * session rather than surfaced, which is what keeps Gemini Nano usable on a
 * large library.
 */
export const completeChromeJson = async ({ system, prompt, schema, onDownloadProgress, signal }) => {
  const api = getPromptApi();
  if (!api) {
    throw new Error('Chrome built-in AI is not available. Use desktop Chrome or pick another provider.');
  }

  const availability = await getChromeAvailability();
  const pendingDownload = availability === 'downloadable' || availability === 'downloading';
  const render = typeof prompt === 'function' ? prompt : () => prompt;
  // A fixed string cannot be shrunk, so retrying it would repeat the failure.
  const attempts = typeof prompt === 'function' ? MAX_ATTEMPTS : 1;

  const options = {};
  if (schema) {
    options.responseConstraint = schema;
  }

  let startBudget = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const session = await createSession(api, { system, signal, onDownloadProgress, pendingDownload });
    // Tracked out here so a rejection can halve the budget actually attempted,
    // rather than guessing from the nominal one.
    let usedBudget = startBudget;
    try {
      const { text, budget } = await fitPrompt(session, render, startBudget);
      usedBudget = budget;
      const result = await session.prompt(text, options);
      return typeof result === 'string' ? result : String(result ?? '');
    } catch (error) {
      if (!isTooLarge(error)) throw error;
      startBudget = Math.max(400, Math.floor((usedBudget ?? PROVIDER_BUDGET_CHARS.chrome) * RETRY_SCALE));
      // The measured budget was wrong, so stop trusting the cached one too.
      cachedBudget = null;
      if (attempt === attempts - 1 || startBudget <= 400) {
        throw new Error(
          'Chrome built-in AI could not fit this library into its input quota, even after shrinking the request. Switch to Ollama or a cloud provider in Settings.',
        );
      }
    } finally {
      try {
        session.destroy?.();
      } catch {
        /* ignore */
      }
    }
  }

  throw new Error('Chrome built-in AI did not return a response.');
};
