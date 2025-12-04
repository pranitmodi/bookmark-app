import { memo, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * URLDisplay component - Shows the current URL with copy functionality
 * Memoized to prevent unnecessary re-renders
 */
const URLDisplay = memo(({ url, title }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Extract domain from URL
  const getDomain = (urlString) => {
    try {
      const domain = new URL(urlString).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="bg-[#262626] rounded-xl shadow-sm border border-[#3a3a3a] p-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[#FFD900]/20 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-[#FFD900]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm mb-1 truncate">
            {title || 'Untitled Page'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 truncate">{getDomain(url)}</span>
            <button
              onClick={handleCopy}
              className="text-[#FFD900] hover:text-[#ffed4e] font-medium flex items-center gap-1 flex-shrink-0 text-xs ml-auto"
              title={isCopied ? 'Copied!' : 'Copy URL'}
            >
              {isCopied ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

URLDisplay.displayName = 'URLDisplay';

URLDisplay.propTypes = {
  url: PropTypes.string.isRequired,
  title: PropTypes.string,
};

export default URLDisplay;
