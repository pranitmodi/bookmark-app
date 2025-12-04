import { useState, useEffect } from 'react';
import BookmarkRecommendations from './components/BookmarkRecommendations';
import ProfileSettings from './components/ProfileSettings';
import URLDisplay from './components/URLDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import { getBookmarkRecommendations } from './utils/aiUtils';
import { 
  fetchBookmarks, 
  generateMarkdownWithAnalysis, 
  createBookmarkWithPath 
} from './utils/bookmarkUtils';

function App() {
  // State management
  const [currentUrl, setCurrentUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiInput, setApiInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isBookmarkAdded, setIsBookmarkAdded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [bookmarkTree, setBookmarkTree] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Load API key and current tab on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load API key from storage
        const result = await chrome.storage.local.get(['geminiApiKey']);
        if (result.geminiApiKey) {
          setApiKey(result.geminiApiKey);
        }

        // Get current tab URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          setCurrentUrl(tab.url);
          setPageTitle(tab.title || '');
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load extension data');
      }
    };

    loadInitialData();
  }, []);

  // Fetch recommendations when API key and URL are available
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (hasFetched || !apiKey || !currentUrl || isBookmarkAdded || !showRecommendations) return;
      
      setHasFetched(true);
      setIsLoading(true);
      setError(null);

      try {
        // Fetch bookmarks and generate structure
        const tree = await fetchBookmarks();
        setBookmarkTree(tree);
        const { markdown, analysis } = generateMarkdownWithAnalysis(tree);

        // Create a summary for better AI context
        const summary = `
📊 Bookmark Structure Summary:
- Total Folders: ${analysis.totalFolders}
- Total Bookmarks: ${analysis.totalBookmarks}
- Organization Depth: ${analysis.maxDepth} levels
- Most Active Folders: ${analysis.popularFolders.slice(0, 5).map(f => f.name).join(', ')}
`;

        // Get AI recommendations
        const recs = await getBookmarkRecommendations(apiKey, markdown, currentUrl, summary);
        setRecommendations(recs);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err.message || 'Failed to fetch recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [apiKey, currentUrl, isBookmarkAdded, hasFetched, showRecommendations]);

  const handleApiInputChange = (e) => {
    setApiInput(e.target.value);
  };

  const handleApiSubmit = async () => {
    if (apiKey) {
      // Reset API key
      await chrome.storage.local.remove('geminiApiKey');
      setApiKey('');
      setApiInput('');
      setRecommendations([]);
      showSuccess('API key removed successfully');
    } else if (apiInput.trim()) {
      // Save new API key
      const trimmedKey = apiInput.trim();
      await chrome.storage.local.set({ geminiApiKey: trimmedKey });
      setApiKey(trimmedKey);
      setApiInput('');
      showSuccess('API key saved successfully');
      setIsSettingsOpen(false);
    }
  };

  const handleCreateBookmark = async (folderPath, title, shouldCreateFolder) => {
    if (isBookmarkAdded) return;

    setIsLoading(true);
    setError(null);

    try {
      // Flatten the bookmark tree for path lookup
      const flattenTree = (nodes) => {
        let result = [];
        nodes.forEach(node => {
          if (node.children) {
            result.push({
              id: node.id,
              title: node.title,
              children: node.children
            });
            result = result.concat(flattenTree(node.children));
          }
        });
        return result;
      };

      const folderStructure = bookmarkTree ? flattenTree(bookmarkTree) : [];
      await createBookmarkWithPath(folderStructure, folderPath, title, currentUrl, shouldCreateFolder);
      setIsBookmarkAdded(true);
      showSuccess(`Bookmark added to "${folderPath}"`);
    } catch (err) {
      console.error('Error creating bookmark:', err);
      setError(err.message || 'Failed to create bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  // Show settings screen if no API key
  if (!apiKey && !isSettingsOpen) {
    return (
      <div className="bg-[#0a0a0a] p-4 min-h-[500px]">
        <div className="w-full">
          {/* Header */}
          <header className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFD900] rounded-2xl mb-4 shadow-lg">
              <img src="/icon48.png" alt="Bookmark AI" className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Bookmark AI Assistant
            </h1>
            <p className="text-gray-400">
              Intelligent bookmark organization powered by AI
            </p>
          </header>

          {/* Welcome Card */}
          <div className="bg-[#262626] rounded-xl shadow-xl p-6 mb-4 border border-[#3a3a3a]">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FFD900]/20 rounded-full mb-3">
                <span className="text-2xl">🚀</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Get Started
              </h2>
              <p className="text-gray-300 text-sm">
                Configure your Gemini API key to unlock AI-powered bookmark recommendations
              </p>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full bg-[#FFD900] hover:bg-[#ffed4e] text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Configure API Key
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-[#262626] rounded-lg p-4 border border-[#3a3a3a] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[#FFD900]/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm">Smart Recommendations</h3>
                  <p className="text-xs text-gray-400">AI analyzes your bookmark structure to suggest the perfect folder</p>
                </div>
              </div>
            </div>

            <div className="bg-[#262626] rounded-lg p-4 border border-[#3a3a3a] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[#FFD900]/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm">One-Click Bookmarking</h3>
                  <p className="text-xs text-gray-400">Save bookmarks instantly with intelligent title generation</p>
                </div>
              </div>
            </div>

            <div className="bg-[#262626] rounded-lg p-4 border border-[#3a3a3a] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[#FFD900]/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔒</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm">Privacy First</h3>
                  <p className="text-xs text-gray-400">Your API key is stored locally and never shared</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-[500px] relative pb-16 border-2 border-[#3a3a3a] rounded-lg">
      <div className="w-full p-4">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src="/icon32.png" alt="Bookmark AI" className="w-8 h-8" />
              <div>
                <h1 className="text-base font-bold text-white">
                  Bookmark AI
                </h1>
                <p className="text-[10px] text-[#FFD900]">Powered by Gemini</p>
              </div>
            </div>

            <button
              onClick={toggleSettings}
              className="py-2 px-3 rounded-lg bg-[#262626] border border-[#3a3a3a] hover:bg-[#333333] transition-colors shadow-sm flex items-center gap-2 text-sm text-white"
              aria-label="Settings"
            >
              <svg className="w-4 h-4 text-[#FFD900]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-3 bg-[#FFD900]/20 border border-[#FFD900]/50 text-[#FFD900] px-3 py-2 rounded-lg flex items-center gap-2 animate-slide-down text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-3 bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Settings Panel */}
        {isSettingsOpen && (
          <div className="mb-4">
            <ProfileSettings
              isOpen={isSettingsOpen}
              onToggle={toggleSettings}
              apiKey={apiKey}
              apiInput={apiInput}
              onApiInputChange={handleApiInputChange}
              onSubmit={handleApiSubmit}
            />
          </div>
        )}

        {/* Main Content */}
        {!isSettingsOpen && (
          <>
            {/* URL Display */}
            <div className="mt-4">
              <URLDisplay url={currentUrl} title={pageTitle} />
            </div>

            {/* Get Recommendations Button */}
            {!showRecommendations && !isLoading && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowRecommendations(true)}
                  className="w-full max-w-xs py-2.5 px-4 bg-[#FFD900] hover:bg-[#ffed4e] text-black font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                >
                  Get AI Recommendations
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="mt-4">
                <LoadingSpinner />
              </div>
            )}

            {/* Recommendations */}
            {showRecommendations && !isLoading && recommendations.length > 0 && (
              <div className="mt-4">
                <BookmarkRecommendations
                  recommendations={recommendations}
                  onCreateBookmark={handleCreateBookmark}
                  isBookmarkAdded={isBookmarkAdded}
                />
              </div>
            )}

            {/* No Recommendations */}
            {showRecommendations && !isLoading && recommendations.length === 0 && !error && (
              <div className="mt-4 bg-[#262626] rounded-xl shadow-sm p-6 text-center border border-[#3a3a3a]">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FFD900]/20 rounded-full mb-3">
                  <span className="text-2xl">📭</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  No Recommendations Yet
                </h3>
                <p className="text-sm text-gray-400">
                  Analyzing your bookmark structure
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 py-3 bg-[#0a0a0a] border-t border-[#3a3a3a]">
          <p className="text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Made with 💛 by{' '}
            <a
              href="https://www.linkedin.com/in/pranitmodi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FFD900] hover:text-[#ffed4e] font-medium underline"
            >
              Pranit Modi
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
