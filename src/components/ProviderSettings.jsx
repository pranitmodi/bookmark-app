import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { DEFAULT_MODELS, PROVIDER_LABELS, PROVIDERS, providerNeedsKey } from '../ai/types.js';
import {
  describeChromeAvailability,
  downloadChromeModel,
  getChromeAvailability,
  listOllamaModels,
  probeProvider,
} from '../ai/router.js';
import { IconAlert, IconCheck, IconCopy, IconSpark } from '../ui/icons.jsx';

const PROVIDER_DESCRIPTIONS = {
  chrome: 'Gemini Nano · on-device',
  ollama: 'Local models · private',
  gemini: 'Google cloud models',
  openai: 'OpenAI cloud models',
  claude: 'Anthropic cloud models',
  'openai-compatible': 'Custom endpoint',
};

const LOCAL_PROVIDERS = new Set(['chrome', 'ollama']);
const CHROME_FLAGS = [
  ['Prompt API', 'chrome://flags/#prompt-api-for-gemini-nano'],
  ['On-device model', 'chrome://flags/#optimization-guide-on-device-model'],
];

const fingerprint = (value) => JSON.stringify({
  provider: value.provider,
  model: value.model?.trim(),
  apiKey: value.apiKey?.trim(),
  ollamaBaseUrl: value.ollamaBaseUrl?.trim().replace(/\/+$/, ''),
  baseUrl: value.baseUrl?.trim().replace(/\/+$/, ''),
});

const CopyRow = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-ink border border-line px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500">{label}</p>
        <code className="block truncate text-[10px] text-gray-300">{value}</code>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 p-1 text-gray-500 hover:text-accent"
        aria-label={`Copy ${label}`}
      >
        {copied ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

CopyRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

const ProviderSettings = ({ config, onSave }) => {
  const [draft, setDraft] = useState(config);
  const [notice, setNotice] = useState(null);
  const [operation, setOperation] = useState('');
  const [chromeStatus, setChromeStatus] = useState('checking');
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaState, setOllamaState] = useState('idle');
  const [ollamaError, setOllamaError] = useState('');
  const [verifiedFingerprint, setVerifiedFingerprint] = useState(fingerprint(config));
  const providerDrafts = useRef({ [config.provider]: config });

  const dirty = fingerprint(draft) !== fingerprint(config);
  const localNeedsTest = LOCAL_PROVIDERS.has(draft.provider)
    && verifiedFingerprint !== fingerprint(draft);
  const busy = Boolean(operation);

  useEffect(() => {
    setDraft(config);
    providerDrafts.current[config.provider] = config;
    setVerifiedFingerprint(fingerprint(config));
    setNotice(null);
  }, [config]);

  const refreshChrome = useCallback(async () => {
    setChromeStatus('checking');
    try {
      setChromeStatus(await getChromeAvailability());
    } catch {
      setChromeStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    refreshChrome();
  }, [refreshChrome]);

  const refreshOllama = useCallback(async (baseUrl, selectFirst = false) => {
    setOllamaState('loading');
    setOllamaError('');
    try {
      const models = await listOllamaModels(baseUrl);
      setOllamaModels(models);
      setOllamaState(models.length ? 'ready' : 'empty');
      if (models.length) {
        setDraft((current) => {
          if (!selectFirst && models.includes(current.model)) return current;
          const next = { ...current, model: models[0] };
          providerDrafts.current.ollama = next;
          return next;
        });
      }
      return models;
    } catch (error) {
      setOllamaModels([]);
      setOllamaState('error');
      setOllamaError(error.message);
      return [];
    }
  }, []);

  useEffect(() => {
    if (draft.provider !== 'ollama') return undefined;
    const timer = setTimeout(() => refreshOllama(draft.ollamaBaseUrl), 450);
    return () => clearTimeout(timer);
  }, [draft.provider, draft.ollamaBaseUrl, refreshOllama]);

  const update = (patch) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      providerDrafts.current[next.provider] = next;
      return next;
    });
    setNotice(null);
  };

  const selectProvider = (provider) => {
    providerDrafts.current[draft.provider] = draft;
    const previous = providerDrafts.current[provider];
    const next = previous || {
      ...draft,
      provider,
      model: DEFAULT_MODELS[provider],
      apiKey: providerNeedsKey(provider) ? '' : draft.apiKey,
    };
    providerDrafts.current[provider] = next;
    setDraft(next);
    setNotice(null);
  };

  const handleDownload = async () => {
    setOperation('download');
    setNotice(null);
    setDownloadProgress(0);
    try {
      const status = await downloadChromeModel({
        onProgress: setDownloadProgress,
      });
      setChromeStatus(status);
      setNotice({
        type: status === 'available' ? 'success' : 'error',
        message: describeChromeAvailability(status),
      });
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setOperation('');
    }
  };

  const handleTest = async () => {
    setOperation('test');
    setNotice(null);
    try {
      const result = await probeProvider(draft);
      if (result.models) {
        setOllamaModels(result.models);
        setOllamaState(result.models.length ? 'ready' : 'empty');
      }
      setNotice({
        type: result.ok ? 'success' : 'error',
        message: result.detail,
      });
      if (result.ok) setVerifiedFingerprint(fingerprint(draft));
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setOperation('');
    }
  };

  const handleSave = async () => {
    if (localNeedsTest) {
      setNotice({ type: 'error', message: 'Test this local provider before saving it.' });
      return;
    }
    setOperation('save');
    setNotice(null);
    try {
      if (draft.provider === 'openai-compatible' && draft.baseUrl) {
        try {
          await chrome.permissions.request({ origins: [`${new URL(draft.baseUrl).origin}/*`] });
        } catch {
          /* The request itself will report a denied host later. */
        }
      }
      await onSave(draft);
      setVerifiedFingerprint(fingerprint(draft));
      setNotice({ type: 'success', message: `${PROVIDER_LABELS[draft.provider]} saved and ready.` });
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setOperation('');
    }
  };

  const reset = () => {
    setDraft(config);
    providerDrafts.current[config.provider] = config;
    setNotice(null);
  };

  return (
    <div className="bg-panel rounded-xl border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-raised">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <IconSpark className="w-4 h-4 text-accent" />
          Model provider
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Local providers keep bookmark context on this device.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <fieldset>
          <legend className="text-xs font-medium text-gray-300 mb-2">Provider</legend>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((id) => {
              const selected = draft.provider === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectProvider(id)}
                  disabled={busy}
                  aria-pressed={selected}
                  className={`min-w-0 rounded-lg border p-2.5 text-left disabled:opacity-50 ${
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-line bg-ink hover:border-gray-500'
                  }`}
                >
                  <span className={`block text-xs font-semibold ${selected ? 'text-accent' : 'text-white'}`}>
                    {PROVIDER_LABELS[id]}
                  </span>
                  <span className="block mt-0.5 truncate text-[10px] text-gray-500">
                    {PROVIDER_DESCRIPTIONS[id]}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {draft.provider === 'chrome' && (
          <div className="space-y-3 rounded-xl border border-line bg-raised p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">Chrome built-in AI</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                  {chromeStatus === 'checking'
                    ? 'Checking this Chrome profile…'
                    : describeChromeAvailability(chromeStatus)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                chromeStatus === 'available'
                  ? 'bg-green-900/40 text-green-300'
                  : chromeStatus === 'checking'
                    ? 'bg-gray-800 text-gray-400'
                    : 'bg-amber-900/40 text-amber-300'
              }`}>
                {chromeStatus === 'available' ? 'Ready' : chromeStatus}
              </span>
            </div>

            {(chromeStatus === 'downloadable' || chromeStatus === 'downloading') && (
              <div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={busy}
                  className="w-full rounded-lg bg-accent py-2 text-xs font-semibold text-black disabled:opacity-50"
                >
                  {operation === 'download' ? 'Downloading Gemini Nano…' : 'Download Gemini Nano'}
                </button>
                {downloadProgress !== null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
                    <div
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{ width: `${Math.round(downloadProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshChrome}
                disabled={busy || chromeStatus === 'checking'}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-gray-300 disabled:opacity-50"
              >
                Check again
              </button>
              <span className="self-center text-[10px] text-gray-500">No API key · runs locally</span>
            </div>

            {(chromeStatus === 'unsupported' || chromeStatus === 'unavailable') && (
              <details className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-2.5">
                <summary className="text-[11px] font-medium text-amber-300">Chrome setup help</summary>
                <p className="my-2 text-[10px] leading-relaxed text-amber-200/70">
                  Use desktop Google Chrome, enable the Prompt API and on-device model flags,
                  relaunch Chrome, then check again.
                </p>
                <div className="space-y-1.5">
                  {CHROME_FLAGS.map(([label, value]) => (
                    <CopyRow key={value} label={label} value={value} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {draft.provider === 'ollama' && (
          <div className="space-y-3 rounded-xl border border-line bg-raised p-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Ollama URL</label>
              <div className="flex gap-2">
                <input
                  value={draft.ollamaBaseUrl}
                  onChange={(event) => update({ ollamaBaseUrl: event.target.value })}
                  placeholder="http://127.0.0.1:11434"
                  className="min-w-0 flex-1 px-3 py-2 bg-ink border border-line rounded-lg text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => refreshOllama(draft.ollamaBaseUrl, true)}
                  disabled={busy || ollamaState === 'loading'}
                  className="shrink-0 rounded-lg border border-line px-2.5 text-[11px] text-gray-300 disabled:opacity-50"
                >
                  {ollamaState === 'loading' ? 'Checking…' : 'Refresh'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Model</label>
              {ollamaModels.length > 0 ? (
                <select
                  value={ollamaModels.includes(draft.model) ? draft.model : ''}
                  onChange={(event) => update({ model: event.target.value })}
                  className="w-full px-3 py-2 bg-ink border border-line rounded-lg text-xs text-white"
                >
                  <option value="" disabled>Choose an installed model</option>
                  {ollamaModels.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              ) : (
                <input
                  value={draft.model}
                  onChange={(event) => update({ model: event.target.value })}
                  placeholder="e.g. llama3.2"
                  className="w-full px-3 py-2 bg-ink border border-line rounded-lg text-xs text-white"
                />
              )}
            </div>

            {ollamaState === 'error' && (
              <p className="flex gap-1.5 text-[11px] leading-relaxed text-amber-300">
                <IconAlert className="mt-0.5 w-3.5 h-3.5 shrink-0" />
                {ollamaError}
              </p>
            )}
            {ollamaState === 'empty' && (
              <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-2.5">
                <p className="text-[11px] text-amber-300">Ollama is running, but no models are installed.</p>
                <CopyRow label="Install a model" value="ollama pull llama3.2" />
              </div>
            )}
            {ollamaState === 'ready' && (
              <p className="text-[10px] text-gray-500">
                {ollamaModels.length} installed model{ollamaModels.length === 1 ? '' : 's'} detected.
              </p>
            )}
          </div>
        )}

        {draft.provider !== 'chrome' && draft.provider !== 'ollama' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Model</label>
              <input
                value={draft.model}
                onChange={(event) => update({ model: event.target.value })}
                className="w-full px-3 py-2 bg-ink border border-line rounded-lg text-sm text-white"
              />
            </div>
            {providerNeedsKey(draft.provider) && (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">API key</label>
                <input
                  type="password"
                  value={draft.apiKey}
                  onChange={(event) => update({ apiKey: event.target.value })}
                  placeholder="Paste key"
                  className="w-full px-3 py-2 bg-ink border border-line rounded-lg text-sm text-white placeholder-gray-500"
                />
              </div>
            )}
            {draft.provider === 'openai-compatible' && (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Base URL</label>
                <input
                  value={draft.baseUrl}
                  onChange={(event) => update({ baseUrl: event.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 bg-ink border border-line rounded-lg text-sm text-white placeholder-gray-500"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={busy}
            className="py-2.5 rounded-lg border border-line text-gray-200 font-semibold text-xs hover:border-accent/50 disabled:opacity-50"
          >
            {operation === 'test'
              ? 'Testing connection…'
              : LOCAL_PROVIDERS.has(draft.provider)
                ? 'Test connection'
                : 'Check configuration'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !dirty || localNeedsTest}
            className="py-2.5 rounded-lg bg-accent text-black font-semibold text-xs hover:bg-accent-soft disabled:opacity-50"
          >
            {operation === 'save' ? 'Saving…' : localNeedsTest ? 'Test before saving' : 'Save provider'}
          </button>
        </div>

        {dirty && (
          <button type="button" onClick={reset} disabled={busy} className="text-[11px] text-gray-500 hover:text-gray-300">
            Discard unsaved changes
          </button>
        )}

        {notice && (
          <p role="status" className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-1.5 ${
            notice.type === 'success'
              ? 'border-green-800 bg-green-900/30 text-green-200'
              : 'border-red-800 bg-red-900/30 text-red-200'
          }`}>
            {notice.type === 'success'
              ? <IconCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              : <IconAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            {notice.message}
          </p>
        )}
      </div>
    </div>
  );
};

ProviderSettings.propTypes = {
  config: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default ProviderSettings;
