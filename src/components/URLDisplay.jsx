import { memo } from 'react';
import PropTypes from 'prop-types';
import '../App.css';

/**
 * URLDisplay component - Shows the current URL with copy functionality
 * Memoized to prevent unnecessary re-renders
 */
const URLDisplay = memo(({ url, isCopied, onCopy }) => {
  return (
    <div className="url-display nunito-sans-500">
      <i className="ri-links-line" aria-hidden="true"></i>
      <div className="current-url nunito-sans-500" title={url}>
        {url}
      </div>
      <i
        style={{ cursor: 'pointer' }}
        className={isCopied ? 'ri-check-double-line' : 'ri-clipboard-line'}
        onClick={onCopy}
        aria-label={isCopied ? 'Copied' : 'Copy URL'}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onCopy();
          }
        }}
      ></i>
    </div>
  );
});

URLDisplay.displayName = 'URLDisplay';

URLDisplay.propTypes = {
  url: PropTypes.string.isRequired,
  isCopied: PropTypes.bool.isRequired,
  onCopy: PropTypes.func.isRequired,
};

export default URLDisplay;
