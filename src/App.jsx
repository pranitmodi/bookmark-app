import { useEffect, useMemo, useState } from 'react';
import BookmarkRecommendations from './components/BookmarkRecommendations';
import ProviderSettings from './components/ProviderSettings';
import URLDisplay from './components/URLDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import RecommendationProgress from './components/RecommendationProgress';
import { getBookmarkRecommendations, heuristicRecommendations } from './utils/aiUtils';
import {
  checkBookmarkExists,
  createBookmarkWithPath,
  flattenFolders,
  invalidateBookmarkCache,
} from './utils/bookmarkUtils';
import { recordPlacement } from './ai/storage';
import { PROVIDER_LABELS, providerNeedsKey } from './ai/types';
import { useAiConfig } from './hooks/useAiConfig';
import { useCurrentTab } from './hooks/useCurrentTab';
import { useBookmarkTree } from './hooks/useBookmarkTree';
import { IconFolder, IconLock, IconSettings, IconSpark } from './ui/icons.jsx';

function App() {
  const { config, saveConfig, ready, needsSetup } = useAiConfig();
  const { url, title, windowId } = useCurrentTab();
  const { tree, markdown, analysis, bookmarks, domainMap, refresh, loading: treeLoading } = useBookmarkTree();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('bookmarks');
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(null);
  const [message, setMessage] = useState('');
  const [openingLibrary, setOpeningLibrary] = useState(false);
  // Set by the Get recommendations button. Carries the URL it was pressed for
  // so a tab change discards it, and an attempt counter so a retry re-runs.
  const [request, setRequest] = useState(null);

  // Folder names are the only per-page signal beyond a domain match, so the
  // recommenders need the real paths, not just the popular folder names.
  const folderPaths = useMemo(
    () => [...new Set(bookmarks.map((item) => item.path).filter((path) => path && path !== 'Root'))],
    [bookmarks],
  );

  const canRun = ready && (!providerNeedsKey(config.provider) || config.apiKey);
  const started = request?.url === url;
  // The tree load is the first stage, but the recommendation effect is gated on
  // the tree existing, so the two loading flags have to be read together.
  const busy = loading || (started && treeLoading);
  const activeStage = treeLoading ? 'bookmarks' : stage;

  const openLibrary = () => {
    if (openingLibrary) return;

    // chrome.sidePanel.open() is only honoured while the click's user gesture
    // is active, so it runs first: awaiting anything, or hopping through the
    // service worker, drops the gesture and the call is rejected.
    const opening = windowId === null
      ? Promise.reject(new Error('Window not resolved yet'))
      : chrome.sidePanel.open({ windowId });

    setOpeningLibrary(true);
    setError('');
    setMessage('Opening library…');

    opening
      .then(() => window.close())
      .catch(() => {
        chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
          setOpeningLibrary(false);
          if (chrome.runtime.lastError || !response?.ok) {
            setMessage('');
            setError('Could not open the library panel. Right-click the extension icon and choose “Open side panel”.');
          } else {
            window.close();
          }
        });
      });
  };

  const requestRecommendations = () => {
    setError('');
    setRequest((prev) => ({ url, attempt: (prev?.attempt ?? 0) + 1 }));
  };

  useEffect(() => {
    if (!tree || !url) return;
    setExisting(checkBookmarkExists(url, tree));
  }, [tree, url]);

  useEffect(() => {
    if (!started || !url || !tree || !canRun || saved || existing || settingsOpen) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setStage('analyzing');
      setError('');
      try {
          const heuristic = heuristicRecommendations({
          url,
          title,
          domainMap,
          folderPaths,
        });
        if (!cancelled && heuristic.length) setRecommendations(heuristic);

        const summary = analysis
          ? `Folders: ${analysis.totalFolders}. Bookmarks: ${analysis.totalBookmarks}. Popular: ${analysis.popularFolders.slice(0, 5).map((f) => f.name).join(', ')}`
          : '';
        if (!cancelled) setStage('asking');
        const recs = await getBookmarkRecommendations({
          config,
          folderStructure: markdown,
          url,
          title,
          structureSummary: summary,
          domainMap,
          folderPaths,
          onDownloadProgress: (loaded) => {
            if (!cancelled) setDownloadProgress(loaded);
          },
        });
        if (!cancelled) {
          const merged = [...recs];
          heuristic.forEach((item) => {
            if (!merged.some((rec) => rec.text === item.text)) merged.push(item);
          });
          // Cap each group on its own so heuristics can never push the
          // new-folder ideas off the end of the list.
          setRecommendations([
            ...merged.filter((rec) => !rec.add_folder).slice(0, 4),
            ...merged.filter((rec) => rec.add_folder).slice(0, 2),
          ]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not recommend a folder');
      } finally {
        if (!cancelled) {
          setStage('done');
          setDownloadProgress(null);
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [request, started, url, title, tree, markdown, analysis, domainMap, folderPaths, config, canRun, saved, existing, settingsOpen]);

  const handleCreate = async (folderPath, bookmarkTitle, shouldCreateFolder) => {
    if (saved) return;
    setSaving(true);
    try {
      const folderStructure = tree ? flattenFolders(tree) : [];
      await createBookmarkWithPath(folderStructure, folderPath, bookmarkTitle, url, shouldCreateFolder);
      await recordPlacement({ url, path: folderPath, title: bookmarkTitle, at: Date.now() });
      await invalidateBookmarkCache();
      setSaved(true);
      setMessage(`Saved to ${folderPath}`);
      refresh(true);
    } catch (err) {
      setError(err.message || 'Failed to save bookmark');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="bg-ink p-4 min-h-[480px]">
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }

  if (needsSetup && !settingsOpen) {
    return (
      <div className="bg-ink p-4 min-h-[480px] space-y-4">
        <header className="text-center pt-4">
          <div className="inline-flex w-14 h-14 bg-accent rounded-2xl items-center justify-center mb-3">
            <img src="./icon48.png" alt="" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold">Bookmark AI</h1>
          <p className="text-sm text-gray-400 mt-1">Local models or your own keys. You stay in control.</p>
        </header>
        <div className="bg-panel rounded-xl border border-line p-4 space-y-3">
          <p className="text-sm text-gray-300 flex gap-2">
            <IconLock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            Pick Chrome built-in or Ollama for on-device sorting, or add a cloud key.
          </p>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-full py-2.5 rounded-xl bg-accent text-black font-semibold"
          >
            Choose provider
          </button>
          <button type="button" onClick={openLibrary} className="w-full py-2 text-sm text-gray-300">
            Organize existing bookmarks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink min-h-[480px] relative pb-12">
      <div className="p-3 space-y-3">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="./icon32.png" alt="" className="w-7 h-7" />
            <div>
              <h1 className="text-sm font-bold leading-none">Bookmark AI</h1>
              <p className="text-[10px] text-accent mt-0.5">{PROVIDER_LABELS[config.provider]}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={openLibrary}
              disabled={openingLibrary}
              className="tooltip p-2 rounded-lg bg-panel border border-line hover:border-accent/50 active:bg-raised disabled:opacity-100"
              aria-label="Organize library"
              data-tooltip={openingLibrary ? 'Opening library…' : 'Organize library'}
            >
              {openingLibrary
                ? <span className="spinner block w-4 h-4" />
                : <IconFolder className="w-4 h-4 text-accent" />}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="tooltip p-2 rounded-lg bg-panel border border-line hover:border-accent/50 active:bg-raised"
              aria-label="Settings"
              data-tooltip={settingsOpen ? 'Close settings' : 'Settings'}
            >
              <IconSettings className="w-4 h-4 text-accent" />
            </button>
          </div>
        </header>

        {message && (
          <div className="text-xs text-accent bg-accent/10 border border-accent/40 rounded-lg px-3 py-2 animate-slide-down">
            {message}
          </div>
        )}
        {error && (
          <div className="text-xs text-red-200 bg-red-900/40 border border-red-800 rounded-lg px-3 py-2">{error}</div>
        )}

        {settingsOpen ? (
          <ProviderSettings config={config} onSave={saveConfig} />
        ) : (
          <>
            <URLDisplay url={url} title={title} />
            {existing && (
              <div className="bg-panel border border-line rounded-xl p-3 text-sm">
                <p className="text-white font-medium">Already saved</p>
                <p className="text-xs text-gray-400 mt-1">{existing.path}</p>
              </div>
            )}
            {/* Suggestions are only offered when they relate to this page, so a
                finished run can come back empty and still needs a way forward. */}
            {!existing && canRun && !busy && started && !error && recommendations.length === 0 && (
              <p className="text-xs text-gray-400">
                No folder in your library looks related to this page yet. Try again, or save it
                from Chrome and organize later.
              </p>
            )}
            {!existing && canRun && !busy && (!started || error || recommendations.length === 0) && (
              <button
                type="button"
                onClick={requestRecommendations}
                className="w-full py-2.5 rounded-xl bg-accent text-black font-semibold flex items-center justify-center gap-2 hover:bg-accent-soft"
              >
                <IconSpark className="w-4 h-4" />
                {error || started ? 'Try again' : 'Get recommendations'}
              </button>
            )}
            {!existing && canRun && busy && (
              <RecommendationProgress
                compact={recommendations.length > 0}
                stage={activeStage}
                providerLabel={PROVIDER_LABELS[config.provider]}
                downloadProgress={downloadProgress}
              />
            )}
            {!existing && recommendations.length > 0 && (
              <BookmarkRecommendations
                recommendations={recommendations}
                onCreateBookmark={handleCreate}
                isBookmarkAdded={saved}
                isSaving={saving}
              />
            )}
            {!canRun && (
              <p className="text-xs text-gray-400 flex gap-1">
                <IconSpark className="w-3.5 h-3.5 text-accent" />
                Add a provider to get folder suggestions.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
