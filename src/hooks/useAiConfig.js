import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CONFIG, DEFAULT_MODELS, providerNeedsKey } from '../ai/types.js';
import { loadAiConfig, saveAiConfig } from '../ai/storage.js';
import { getChromeAvailability, listOllamaModels } from '../ai/router.js';

export const useAiConfig = () => {
  const [config, setConfigState] = useState(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const loaded = await loadAiConfig();
      if (cancelled) return;
      if (!loaded.apiKey && loaded.provider === 'gemini') {
        const chromeStatus = await getChromeAvailability();
        if (chromeStatus === 'available' || chromeStatus === 'downloadable') {
          const next = { ...loaded, provider: 'chrome', model: DEFAULT_MODELS.chrome };
          await saveAiConfig(next);
          if (!cancelled) setConfigState(next);
          setReady(true);
          return;
        }
        try {
          const models = await listOllamaModels(loaded.ollamaBaseUrl);
          if (models.length) {
            const next = {
              ...loaded,
              provider: 'ollama',
              model: models[0] || DEFAULT_MODELS.ollama,
            };
            await saveAiConfig(next);
            if (!cancelled) setConfigState(next);
            setReady(true);
            return;
          }
        } catch {
          /* keep gemini setup */
        }
      }
      setConfigState(loaded);
      setReady(true);
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveConfig = useCallback(async (next) => {
    const stored = await saveAiConfig(next);
    setConfigState(stored);
    return stored;
  }, []);

  const needsSetup = ready && providerNeedsKey(config.provider) && !config.apiKey?.trim();

  return { config, saveConfig, ready, needsSetup };
};
