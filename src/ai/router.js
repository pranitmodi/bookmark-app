import { PROVIDER_BUDGET_CHARS } from './budget.js';
import { extractJson } from './parseJson.js';
import {
  completeChromeJson,
  describeChromeAvailability,
  downloadChromeModel,
  getChromeAvailability,
  getChromeBudgetChars,
  testChromeModel,
} from './providers/chrome.js';
import { completeOllamaJson, listOllamaModels, testOllama } from './providers/ollama.js';
import {
  completeClaudeJson,
  completeGeminiJson,
  completeOpenAiJson,
} from './providers/openaiCompatible.js';
import { providerNeedsKey } from './types.js';

const ensureReady = (config) => {
  if (!config?.provider) {
    throw new Error('Choose an AI provider in Settings.');
  }
  if (providerNeedsKey(config.provider) && !config.apiKey?.trim()) {
    throw new Error('This provider needs an API key.');
  }
  if (config.provider === 'openai-compatible' && !config.baseUrl?.trim()) {
    throw new Error('Enter a base URL for the compatible provider.');
  }
};

/**
 * Approximate characters of prompt the configured provider will accept.
 * Callers use this to size context before building a prompt.
 */
export const getPromptBudgetChars = async (config) => {
  if (config?.provider === 'chrome') return getChromeBudgetChars();
  return PROVIDER_BUDGET_CHARS[config?.provider] ?? PROVIDER_BUDGET_CHARS.default;
};

/**
 * `prompt` is either a string or a `(budgetChars) => string` renderer. The
 * Chrome provider re-renders against its measured quota; everything else is
 * rendered once at the provider's nominal budget.
 */
export const completeJson = async ({ config, system, prompt, schema, onDownloadProgress, signal }) => {
  ensureReady(config);
  const { provider, model, apiKey, ollamaBaseUrl, baseUrl } = config;
  let raw = '';

  if (provider === 'chrome') {
    raw = await completeChromeJson({ system, prompt, schema, onDownloadProgress, signal });
    return extractJson(raw);
  }

  const text = typeof prompt === 'function'
    ? prompt(PROVIDER_BUDGET_CHARS[provider] ?? PROVIDER_BUDGET_CHARS.default)
    : prompt;

  if (provider === 'ollama') {
    raw = await completeOllamaJson({ prompt: text, system, model, baseUrl: ollamaBaseUrl, signal });
  } else if (provider === 'gemini') {
    raw = await completeGeminiJson({ prompt: text, system, model, apiKey, signal });
  } else if (provider === 'claude') {
    raw = await completeClaudeJson({ prompt: text, system, model, apiKey, signal });
  } else if (provider === 'openai') {
    raw = await completeOpenAiJson({ prompt: text, system, model, apiKey, signal });
  } else if (provider === 'openai-compatible') {
    raw = await completeOpenAiJson({ prompt: text, system, model, apiKey, baseUrl, signal });
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }

  return extractJson(raw);
};

export const probeProvider = async (config) => {
  if (config.provider === 'chrome') {
    return testChromeModel({});
  }
  if (config.provider === 'ollama') {
    return testOllama({
      baseUrl: config.ollamaBaseUrl,
      model: config.model,
    });
  }
  ensureReady(config);
  return { ok: true, detail: 'Key saved' };
};

export {
  describeChromeAvailability,
  downloadChromeModel,
  getChromeAvailability,
  listOllamaModels,
};
