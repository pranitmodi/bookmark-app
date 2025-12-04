import './App.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import ProfileSettings from './components/ProfileSettings';
import URLDisplay from './components/URLDisplay';
import BookmarkRecommendations from './components/BookmarkRecommendations';
import LoadingSpinner from './components/LoadingSpinner';
import { 
  fetchBookmarks, 
  generateMarkdownWithAnalysis,
  generateStructureSummary,
  createBookmarkWithPath,
  getCachedBookmarkData,
  setCachedBookmarkData,
  invalidateBookmarkCache,
  checkBookmarkExists,
  getRecentFolders,
  saveRecentFolder
} from './utils/bookmarkUtils';
import { getCurrentTab, getFromStorage, setInStorage, copyToClipboard } from './utils/chromeUtils';
import { getBookmarkRecommendations, validateApiKey } from './utils/aiUtils';

function App() {
  // State management
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [folderStructure, setFolderStructure] = useState('');
  const [folderStructureArray, setFolderStructureArray] = useState([]);
  const [structureSummary, setStructureSummary] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiInput, setApiInput] = useState('');
  const [openProfile, setOpenProfile] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isBookmarkAdded, setIsBookmarkAdded] = useState(false);
  const [error, setError] = useState(null);
  const [existingBookmark, setExistingBookmark] = useState(null);
  const [recentFolders, setRecentFolders] = useState([]);
  const [showRecentFolders, setShowRecentFolders] = useState(false);

  // Fetch bookmarks with caching and combined traversal
  // Fetch bookmarks with caching and combined traversal
  const loadBookmarks = useCallback(async () => {
    try {
      setLoadingStep('Loading bookmarks...');
      
      // Try to get cached data first
      const cached = await getCachedBookmarkData();
      if (cached) {
        console.log('Using cached bookmark data');
        setFolderStructureArray(cached.bookmarksData);
        setFolderStructure(cached.markdown);
        setStructureSummary(cached.summary);
        setLoadingStep('');
        return;
      }
      
      // No cache, fetch fresh data
      setLoadingStep('Analyzing bookmark patterns...');
      const bookmarkTree = await fetchBookmarks();
      
      if (bookmarkTree && bookmarkTree[0]?.children?.[0]?.children) {
        const bookmarksData = bookmarkTree[0].children[0].children;
        setFolderStructureArray(bookmarksData);
        
        // Use combined traversal for 50% faster processing
        const { markdown, analysis } = generateMarkdownWithAnalysis(bookmarkTree);
        setFolderStructure(markdown);
        
        const summary = generateStructureSummary(analysis);
        setStructureSummary(summary);
        
        // Cache for next time
        await setCachedBookmarkData({
          bookmarksData,
          markdown,
          summary,
          analysis
        });
        
        console.log('Bookmark analysis:', analysis);
      }
      setLoadingStep('');
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError('Failed to load bookmarks');
      setLoadingStep('');
    }
  }, []);

  // Initialize: Get current tab URL, API key, and bookmarks in parallel
  useEffect(() => {
    const initialize = async () => {
      try {
        // Run all independent operations in parallel
        const [tab, apiKeyResult, recentFoldersData] = await Promise.all([
          getCurrentTab(),
          getFromStorage(['geminiKey']),
          getRecentFolders()
        ]);
        
        setUrl(tab.url);
        setIsCopied(false);
        setRecentFolders(recentFoldersData);
        
        if (apiKeyResult.geminiKey && validateApiKey(apiKeyResult.geminiKey)) {
          setApiKey(apiKeyResult.geminiKey);
          setOpenProfile(false);
        }
        
        // Load bookmarks (uses cache if available)
        await loadBookmarks();
        
        // Check for duplicate after bookmarks are loaded
        const bookmarkTree = await fetchBookmarks();
        if (bookmarkTree && bookmarkTree[0]?.children?.[0]?.children) {
          const bookmarksData = bookmarkTree[0].children[0].children;
          const existing = checkBookmarkExists(tab.url, bookmarksData);
          if (existing) {
            setExistingBookmark(existing);
            console.log('URL already bookmarked:', existing);
          }
        }
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to initialize extension');
      }
    };

    initialize();
  }, [loadBookmarks]);

  // Save API key to storage when it changes
  useEffect(() => {
    const saveApiKey = async () => {
      if (apiKey && validateApiKey(apiKey)) {
        try {
          await setInStorage({ geminiKey: apiKey });
          console.log('API key saved successfully');
        } catch (err) {
          console.error('Error saving API key:', err);
        }
      }
    };

    saveApiKey();
  }, [apiKey]);

  // Handle creating a bookmark with recent folder tracking
  const handleCreateBookmark = useCallback(async (pathText, title, shouldCreateFolder) => {
    if (isBookmarkAdded) return;

    try {
      setError(null);
      await createBookmarkWithPath(
        folderStructureArray,
        pathText,
        title,
        url,
        shouldCreateFolder
      );
      
      // Save to recent folders
      await saveRecentFolder(pathText);
      const updatedRecent = await getRecentFolders();
      setRecentFolders(updatedRecent);
      
      // Invalidate cache since bookmarks changed
      await invalidateBookmarkCache();
      
      setIsBookmarkAdded(true);
      setExistingBookmark({ title, path: pathText });
    } catch (err) {
      console.error('Error creating bookmark:', err);
      setError('Failed to create bookmark. Please try again.');
    }
  }, [isBookmarkAdded, folderStructureArray, url]);

  // Handle copying URL to clipboard (memoized)
  const handleCopyLink = useCallback(async () => {
    try {
      await copyToClipboard(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      setError('Failed to copy URL');
    }
  }, [url]);

  // Handle getting AI recommendations with progress feedback
  const handleGetRecommendations = useCallback(async () => {
    if (!apiKey || !validateApiKey(apiKey)) {
      setError('Please enter a valid API key');
      return;
    }

    if (!folderStructure) {
      setError('Bookmark structure not loaded');
      return;
    }

    setIsLoading(true);
    setLoadingStep('Getting AI recommendations...');
    setError(null);

    try {
      const recs = await getBookmarkRecommendations(apiKey, folderStructure, url, structureSummary);
      setRecommendations(recs);
    } catch (err) {
      console.error('Error getting recommendations:', err);
      setError('Failed to get recommendations. Please check your API key.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  }, [apiKey, folderStructure, url, structureSummary]);

  // Handle quick save to recent folder
  const handleQuickSave = useCallback(async (folderPath) => {
    if (isBookmarkAdded || !folderPath) return;
    
    try {
      setError(null);
      // Extract a simple title from URL
      const urlObj = new URL(url);
      const title = urlObj.hostname.replace('www.', '') + (urlObj.pathname.split('/').filter(Boolean)[0] || '') || 'Quick Save';
      
      await handleCreateBookmark(folderPath, title, false);
    } catch (err) {
      console.error('Error quick saving:', err);
      setError('Failed to quick save bookmark');
    }
  }, [isBookmarkAdded, url, handleCreateBookmark]);

  // Memoized values to prevent unnecessary recalculations
  const hasRecentFolders = useMemo(() => recentFolders.length > 0, [recentFolders.length]);
  const mostRecentFolder = useMemo(() => recentFolders[0], [recentFolders]);
  const canQuickSave = useMemo(() => 
    hasRecentFolders && !isBookmarkAdded && !existingBookmark,
    [hasRecentFolders, isBookmarkAdded, existingBookmark]
  );

  // Handle API key submission
  const handleApiSubmit = () => {
    if (apiInput && validateApiKey(apiInput)) {
      setApiKey(apiInput);
      setApiInput('');
      setOpenProfile(false);
      setError(null);
    } else if (apiKey) {
      // Reset API key
      setApiKey('');
      setApiInput('');
      setOpenProfile(true);
      setRecommendations([]);
      setIsBookmarkAdded(false);
    }
  };

  // Handle API input change
  const handleApiInputChange = (e) => {
    setApiInput(e.target.value);
    setError(null);
  };

  return (
    <div className="main-div">
      <ProfileSettings
        isOpen={openProfile}
        onToggle={() => setOpenProfile(!openProfile)}
        apiKey={apiKey}
        apiInput={apiInput}
        onApiInputChange={handleApiInputChange}
        onSubmit={handleApiSubmit}
      />

      {error && (
        <div className="error-message nunito-sans-400">
          {error}
        </div>
      )}

      {apiKey && !openProfile && (
        <>
          <URLDisplay
            url={url}
            isCopied={isCopied}
            onCopy={handleCopyLink}
          />

          {/* Show tips on first use */}
          {!hasRecentFolders && !existingBookmark && recommendations.length === 0 && (
            <div className="info-tip nunito-sans-400">
              <span className="info-icon">💡</span>
              <p>
                After you bookmark a page, you&apos;ll see a <strong>Quick Save</strong> button here for instant bookmarking!
              </p>
            </div>
          )}

          {existingBookmark && (
            <div className="duplicate-notice nunito-sans-400">
              <span className="duplicate-icon">ℹ️</span>
              <div>
                <strong>Already bookmarked</strong>
                <p>Saved in: {existingBookmark.path}</p>
              </div>
            </div>
          )}

          {canQuickSave && (
            <div className="quick-save-container">
              <button
                onClick={() => handleQuickSave(mostRecentFolder)}
                className="quick-save-btn nunito-sans-500"
                disabled={isLoading}
              >
                ⚡ Quick Save to &quot;{mostRecentFolder}&quot;
              </button>
              {recentFolders.length > 1 && (
                <button
                  onClick={() => setShowRecentFolders(!showRecentFolders)}
                  className="recent-toggle-btn nunito-sans-400"
                  title="Show more recent folders"
                >
                  {showRecentFolders ? '▲' : '▼'}
                </button>
              )}
            </div>
          )}

          {showRecentFolders && recentFolders.length > 1 && (
            <div className="recent-folders-list">
              <h3 className="nunito-sans-500">Recent Folders:</h3>
              {recentFolders.slice(1).map((folder, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleQuickSave(folder);
                    setShowRecentFolders(false);
                  }}
                  className="recent-folder-item nunito-sans-400"
                  disabled={isLoading || isBookmarkAdded}
                >
                  📁 {folder}
                </button>
              ))}
            </div>
          )}

          {loadingStep && (
            <div className="progress-indicator">
              <div className="progress-text nunito-sans-400">{loadingStep}</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{
                    width: loadingStep.includes('Loading bookmarks') ? '33%' :
                           loadingStep.includes('Analyzing') ? '66%' :
                           loadingStep.includes('AI') ? '100%' : '0%'
                  }}
                />
              </div>
            </div>
          )}

          <div className="action-container">
            <button
              onClick={handleGetRecommendations}
              className="action-btn nunito-sans-500"
              disabled={isBookmarkAdded || isLoading}
              style={
                isBookmarkAdded
                  ? { backgroundColor: 'green', pointerEvents: 'none' }
                  : isLoading
                  ? { opacity: 0.6, cursor: 'wait' }
                  : {}
              }
            >
              {isBookmarkAdded ? 'Bookmark Added ✓' : isLoading ? 'Loading...' : 'Get Recommendations'}
            </button>
          </div>

          {isLoading && <LoadingSpinner message="Processing..." />}

          {recommendations.length > 0 && !isLoading && (
            <BookmarkRecommendations
              recommendations={recommendations}
              onCreateBookmark={handleCreateBookmark}
              isBookmarkAdded={isBookmarkAdded}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
