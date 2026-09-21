import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { IconCheck, IconCopy, IconGlobe } from '../ui/icons.jsx';

const URLDisplay = memo(({ url, title }) => {
  const [copied, setCopied] = useState(false);

  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'Unknown';
    }
  })();

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="bg-panel rounded-xl border border-line p-3.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 bg-accent/20 rounded-lg flex items-center justify-center">
          <IconGlobe className="w-4 h-4 shrink-0 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm truncate">{title || 'Untitled page'}</h3>
          <p className="text-xs text-gray-400 truncate">{domain}</p>
        </div>
        <button type="button" onClick={copy} className="shrink-0 text-accent text-xs flex items-center gap-1">
          {copied ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
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
