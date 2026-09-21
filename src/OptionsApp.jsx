import OrganizeWizard from './components/OrganizeWizard';
import ProviderSettings from './components/ProviderSettings';
import { useAiConfig } from './hooks/useAiConfig';
import { useBookmarkTree } from './hooks/useBookmarkTree';

const OptionsApp = () => {
  const { config, saveConfig, ready } = useAiConfig();
  const { tree, analysis, bookmarks, refresh } = useBookmarkTree();

  return (
    <div className="bg-ink min-h-screen">
      <div className="max-w-xl mx-auto p-6 space-y-5">
        <header>
          <p className="text-accent text-xs font-semibold uppercase tracking-widest">Bookmark AI</p>
          <h1 className="text-2xl font-bold mt-1">Settings</h1>
          <p className="text-sm text-gray-400 mt-1">
            Choose a model, then optionally reorganize the whole library. Changes stay in Chrome bookmarks.
          </p>
        </header>
        {ready && <ProviderSettings config={config} onSave={saveConfig} />}
        {ready && (
          <OrganizeWizard
            tree={tree}
            analysis={analysis}
            bookmarks={bookmarks}
            config={config}
            onDone={() => refresh(true)}
          />
        )}
      </div>
    </div>
  );
};

export default OptionsApp;
