import { memo } from 'react';
import PropTypes from 'prop-types';

const BookmarkRecommendations = memo(({ recommendations, onCreateBookmark, isBookmarkAdded }) => {
  const existingFolderRecommendations = recommendations.filter(r => !r.add_folder);
  const newFolderRecommendations = recommendations.filter(r => r.add_folder);

  const handleItemClick = (text, title, shouldCreateFolder) => {
    if (!isBookmarkAdded) {
      onCreateBookmark(text, title, shouldCreateFolder);
    }
  };

  return (
    <div className="space-y-3">
      {existingFolderRecommendations.length > 0 && (
        <div className="bg-[#262626] rounded-xl shadow-sm border border-[#3a3a3a] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#3a3a3a] bg-[#1a1a1a]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="text-base">🎯</span>
              AI Recommendations
            </h2>
            <p className="text-[10px] text-gray-300 mt-0.5">Best matches from your existing folders</p>
          </div>
          <div className="p-2 space-y-1.5">
            {existingFolderRecommendations.map(({ text, title }) => (
              <button
                key={text}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  isBookmarkAdded
                    ? 'bg-[#1a1a1a] border-[#3a3a3a] cursor-not-allowed opacity-60'
                    : 'bg-[#1a1a1a] border-[#3a3a3a] hover:border-[#FFD900] hover:bg-[#2a2a2a] hover:shadow-sm cursor-pointer'
                }`}
                onClick={() => handleItemClick(text, title, false)}
                disabled={isBookmarkAdded}
                aria-label={`Bookmark to ${text}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 bg-[#FFD900]/20 rounded-lg flex items-center justify-center">
                    <span className="text-base">📁</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm mb-0.5 truncate">{title}</div>
                    <div className="text-[10px] text-gray-400 truncate">{text}</div>
                  </div>
                  {!isBookmarkAdded && (
                    <svg className="w-4 h-4 text-[#FFD900] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {newFolderRecommendations.length > 0 && (
        <div className="bg-[#262626] rounded-xl shadow-sm border border-[#3a3a3a] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#3a3a3a] bg-[#1a1a1a]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="text-base">✨</span>
              Create New Folder
            </h2>
            <p className="text-[10px] text-gray-300 mt-0.5">Suggested new organizational structure</p>
          </div>
          <div className="p-2 space-y-1.5">
            {newFolderRecommendations.map(({ text, title }) => (
              <button
                key={text}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  isBookmarkAdded
                    ? 'bg-[#1a1a1a] border-[#3a3a3a] cursor-not-allowed opacity-60'
                    : 'bg-[#1a1a1a] border-[#FFD900]/30 hover:border-[#FFD900] hover:bg-[#2a2a2a] hover:shadow-sm cursor-pointer'
                }`}
                onClick={() => handleItemClick(text, title, true)}
                disabled={isBookmarkAdded}
                aria-label={`Create folder and bookmark to ${text}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 bg-[#FFD900]/20 rounded-lg flex items-center justify-center">
                    <span className="text-base">➕</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm mb-0.5 truncate flex items-center gap-2">
                      {title}
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#FFD900]/20 text-[#FFD900] font-semibold rounded-full">NEW</span>
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{text}</div>
                  </div>
                  {!isBookmarkAdded && (
                    <svg className="w-4 h-4 text-[#FFD900] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

BookmarkRecommendations.displayName = 'BookmarkRecommendations';

BookmarkRecommendations.propTypes = {
  recommendations: PropTypes.arrayOf(
    PropTypes.shape({
      add_folder: PropTypes.bool.isRequired,
      text: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  onCreateBookmark: PropTypes.func.isRequired,
  isBookmarkAdded: PropTypes.bool.isRequired,
};

export default BookmarkRecommendations;
