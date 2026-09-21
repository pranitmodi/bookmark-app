export const PROVIDERS = ['chrome', 'ollama', 'gemini', 'openai', 'claude', 'openai-compatible'];

export const PROVIDER_LABELS = {
  chrome: 'Chrome built-in',
  ollama: 'Ollama',
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
  'openai-compatible': 'OpenAI compatible',
};

export const DEFAULT_MODELS = {
  chrome: 'gemini-nano',
  ollama: 'llama3.2',
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4.1-mini',
  claude: 'claude-sonnet-4-5',
  'openai-compatible': '',
};

export const DEFAULT_CONFIG = {
  provider: 'gemini',
  model: DEFAULT_MODELS.gemini,
  apiKey: '',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  baseUrl: '',
};

export const STORAGE_KEYS = {
  config: 'aiConfig',
  legacyGeminiKey: 'geminiApiKey',
  profile: 'organizationProfile',
  placements: 'placementHistory',
  undo: 'organizeUndoLog',
};

export const providerNeedsKey = (provider) =>
  provider === 'gemini' || provider === 'openai' || provider === 'claude' || provider === 'openai-compatible';
