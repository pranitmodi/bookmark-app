import { useState, memo } from 'react';
import PropTypes from 'prop-types';
import '../App.css';

/**
 * BookmarkRecommendations component - Displays AI-generated folder recommendations
 * Memoized to prevent unnecessary re-renders
 */
const BookmarkRecommendations = memo(({ recommendations, onCreateBookmark, isBookmarkAdded }) => {
  const [hoveredItem, setHoveredItem] = useState(null);

  const existingFolderRecommendations = recommendations.filter(r => !r.add_folder);
  const newFolderRecommendations = recommendations.filter(r => r.add_folder);

  const handleItemClick = (text, title, shouldCreateFolder) => {
    if (!isBookmarkAdded) {
      onCreateBookmark(text, title, shouldCreateFolder);
    }
  };

  const handleKeyPress = (e, text, title, shouldCreateFolder) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isBookmarkAdded) {
      onCreateBookmark(text, title, shouldCreateFolder);
    }
  };

  return (
    <div className="recommendations nunito-sans-400">
      {existingFolderRecommendations.length > 0 && (
        <>
          <h2>Recommendations</h2>
          <div className="folder-recomm">
            {existingFolderRecommendations.map(({ text, title }) => (
              <div
                key={text}
                className="recommendations-div"
                onMouseEnter={() => setHoveredItem(text)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => handleItemClick(text, title, false)}
                onKeyPress={(e) => handleKeyPress(e, text, title, false)}
                role="button"
                tabIndex={0}
                aria-label={`Bookmark to ${text}`}
                style={isBookmarkAdded ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {hoveredItem === text ? title : text}
              </div>
            ))}
          </div>
        </>
      )}

      {newFolderRecommendations.length > 0 && (
        <>
          <h2>Create a New Folder?</h2>
          <div className="new-folder-recomm">
            {newFolderRecommendations.map(({ text, title }) => (
              <div
                key={text}
                className="recommendations-div"
                onMouseEnter={() => setHoveredItem(text)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => handleItemClick(text, title, true)}
                onKeyPress={(e) => handleKeyPress(e, text, title, true)}
                role="button"
                tabIndex={0}
                aria-label={`Create folder and bookmark to ${text}`}
                style={isBookmarkAdded ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {hoveredItem === text ? title : text}
              </div>
            ))}
          </div>
        </>
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
