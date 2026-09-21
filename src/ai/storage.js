import { DEFAULT_CONFIG, DEFAULT_MODELS, STORAGE_KEYS } from './types.js';

export const loadAiConfig = async () => {
  const result = await chrome.storage.local.get([STORAGE_KEYS.config, STORAGE_KEYS.legacyGeminiKey]);
  const stored = result[STORAGE_KEYS.config];
  if (stored?.provider) {
    return { ...DEFAULT_CONFIG, ...stored };
  }

  if (result[STORAGE_KEYS.legacyGeminiKey]) {
    const migrated = {
      ...DEFAULT_CONFIG,
      provider: 'gemini',
      model: DEFAULT_MODELS.gemini,
      apiKey: result[STORAGE_KEYS.legacyGeminiKey],
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.config]: migrated });
    return migrated;
  }

  return { ...DEFAULT_CONFIG };
};

export const saveAiConfig = async (config) => {
  const next = { ...DEFAULT_CONFIG, ...config };
  await chrome.storage.local.set({ [STORAGE_KEYS.config]: next });
  if (next.provider === 'gemini' && next.apiKey) {
    await chrome.storage.local.set({ [STORAGE_KEYS.legacyGeminiKey]: next.apiKey });
  }
  return next;
};

export const loadOrganizationProfile = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.profile);
  return result[STORAGE_KEYS.profile] || { folders: [], domainMap: {}, updatedAt: 0 };
};

export const saveOrganizationProfile = async (profile) => {
  await chrome.storage.local.set({ [STORAGE_KEYS.profile]: profile });
};

export const loadPlacementHistory = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.placements);
  return result[STORAGE_KEYS.placements] || [];
};

export const recordPlacement = async (entry) => {
  const history = await loadPlacementHistory();
  const next = [entry, ...history.filter((item) => item.url !== entry.url)].slice(0, 20);
  await chrome.storage.local.set({ [STORAGE_KEYS.placements]: next });
};

export const loadUndoLog = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.undo);
  return result[STORAGE_KEYS.undo] || [];
};

export const saveUndoLog = async (log) => {
  await chrome.storage.local.set({ [STORAGE_KEYS.undo]: log });
};

export const clearUndoLog = async () => {
  await chrome.storage.local.remove(STORAGE_KEYS.undo);
};
