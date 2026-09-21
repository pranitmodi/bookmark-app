import { useEffect, useState } from 'react';

export const useCurrentTab = () => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  // Resolved up front because chrome.sidePanel.open() has to run inside the
  // click handler, with no await before it, to keep the user gesture.
  const [windowId, setWindowId] = useState(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        setUrl(tab.url);
        setTitle(tab.title || '');
      }
      if (typeof tab?.windowId === 'number') setWindowId(tab.windowId);
    }).catch(() => {});
  }, []);

  return { url, title, windowId };
};
