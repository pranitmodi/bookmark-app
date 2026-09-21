import { memo } from 'react';
import PropTypes from 'prop-types';
import { IconCheck, IconChevron, IconFolder, IconPlus } from '../ui/icons.jsx';

const recommendationShape = PropTypes.shape({
  add_folder: PropTypes.bool.isRequired,
  text: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
});

const RecommendationRow = ({ item, onCreateBookmark, isBookmarkAdded, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onCreateBookmark(item.text, item.title, item.add_folder)}
    className="w-full text-left px-3 py-2.5 border-t border-line hover:bg-raised disabled:opacity-50 flex items-center gap-2"
  >
    {item.add_folder
      ? <IconPlus className="w-4 h-4 text-accent shrink-0" />
      : <IconFolder className="w-4 h-4 text-accent shrink-0" />}
    <span className="min-w-0 flex-1">
      <span className="block text-sm text-white truncate">{item.title}</span>
      <span className="block text-[10px] text-gray-400 truncate" title={item.text}>{item.text}</span>
    </span>
    {isBookmarkAdded
      ? <IconCheck className="w-4 h-4 text-accent shrink-0" />
      : <IconChevron className="w-4 h-4 text-gray-500 shrink-0" />}
  </button>
);

RecommendationRow.propTypes = {
  item: recommendationShape.isRequired,
  onCreateBookmark: PropTypes.func.isRequired,
  isBookmarkAdded: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const Section = ({ label, items, onCreateBookmark, isBookmarkAdded, disabled }) => {
  if (!items.length) return null;
  return (
    <div className="bg-panel rounded-xl border border-line overflow-hidden">
      <p className="px-3 py-2 text-[10px] text-gray-400 bg-raised">{label}</p>
      {items.map((item) => (
        <RecommendationRow
          key={`${item.text}-${item.title}`}
          item={item}
          onCreateBookmark={onCreateBookmark}
          isBookmarkAdded={isBookmarkAdded}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

Section.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(recommendationShape).isRequired,
  onCreateBookmark: PropTypes.func.isRequired,
  isBookmarkAdded: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const BookmarkRecommendations = memo((
  { recommendations, onCreateBookmark, isBookmarkAdded, isSaving = false },
) => {
  const existing = recommendations.filter((item) => !item.add_folder);
  const created = recommendations.filter((item) => item.add_folder);
  const primary = existing[0] || created[0];

  if (!primary) return null;

  const otherExisting = existing.filter((item) => item !== primary);
  const newFolders = created.filter((item) => item !== primary);
  const disabled = isBookmarkAdded || isSaving;

  return (
    <div className="space-y-2 animate-fade-up">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onCreateBookmark(primary.text, primary.title, primary.add_folder)}
        className="w-full text-left p-3 rounded-xl bg-accent text-black disabled:opacity-50"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
          {primary.add_folder ? 'Create and save to' : 'Save to'}
        </p>
        <p className="font-semibold text-sm mt-0.5">{primary.title}</p>
        <p className="text-xs opacity-70 truncate" title={primary.text}>{primary.text}</p>
      </button>

      <Section
        label="Other folders"
        items={otherExisting}
        onCreateBookmark={onCreateBookmark}
        isBookmarkAdded={isBookmarkAdded}
        disabled={disabled}
      />
      <Section
        label="Create a new folder"
        items={newFolders}
        onCreateBookmark={onCreateBookmark}
        isBookmarkAdded={isBookmarkAdded}
        disabled={disabled}
      />
    </div>
  );
});

BookmarkRecommendations.displayName = 'BookmarkRecommendations';

BookmarkRecommendations.propTypes = {
  recommendations: PropTypes.arrayOf(recommendationShape).isRequired,
  onCreateBookmark: PropTypes.func.isRequired,
  isBookmarkAdded: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool,
};

export default BookmarkRecommendations;
