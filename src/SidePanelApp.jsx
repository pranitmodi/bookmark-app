import { useState } from 'react';
import OrganizeWizard from './components/OrganizeWizard';
import ProviderSettings from './components/ProviderSettings';
import { useAiConfig } from './hooks/useAiConfig';
import { useBookmarkTree } from './hooks/useBookmarkTree';
import { IconLibrary, IconSettings } from './ui/icons.jsx';

const SidePanelApp = () => {
  const { config, saveConfig, ready } = useAiConfig();
  const { tree, analysis, bookmarks, refresh, loading } = useBookmarkTree();
  const [tab, setTab] = useState('library');

  return (
    <div className="bg-ink min-h-screen p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Bookmark library</h1>
          <p className="text-xs text-gray-400">
            {loading ? 'Reading bookmarks…' : `${bookmarks.length} bookmarks`}
          </p>
        </div>
        <img src="./icon32.png" alt="" className="w-8 h-8" />
      </header>

      <div className="flex gap-1 bg-panel p-1 rounded-xl border border-line">
        <button
          type="button"
          onClick={() => setTab('library')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${tab === 'library' ? 'bg-accent text-black' : 'text-gray-300'}`}
        >
          <IconLibrary className="w-3.5 h-3.5" /> Organize
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${tab === 'settings' ? 'bg-accent text-black' : 'text-gray-300'}`}
        >
          <IconSettings className="w-3.5 h-3.5" /> Provider
        </button>
      </div>

      {/* Kept mounted so an in-progress folder plan survives tab switches. */}
      {ready && (
        <div className={tab === 'library' ? '' : 'hidden'}>
          <OrganizeWizard
            tree={tree}
            analysis={analysis}
            bookmarks={bookmarks}
            config={config}
            onDone={() => refresh(true)}
          />
        </div>
      )}
      {tab === 'settings' && ready && (
        <ProviderSettings config={config} onSave={saveConfig} />
      )}
    </div>
  );
};

export default SidePanelApp;
