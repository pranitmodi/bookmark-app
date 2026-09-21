import { useCallback, useEffect, useState } from 'react';
import {
  fetchBookmarks,
  generateMarkdownWithAnalysis,
  getCachedBookmarkData,
  flattenBookmarkNodes,
  buildDomainFolderMap,
  setCachedBookmarkData,
} from '../utils/bookmarkUtils.js';

export const useBookmarkTree = () => {
  const [tree, setTree] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [domainMap, setDomainMap] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const cached = await getCachedBookmarkData();
        if (cached?.bookmarkTree) {
          setTree(cached.bookmarkTree);
          setMarkdown(cached.markdown);
          setAnalysis(cached.analysis);
          const flat = flattenBookmarkNodes(cached.bookmarkTree);
          setBookmarks(flat);
          setDomainMap(cached.domainMap || buildDomainFolderMap(flat));
          setLoading(false);
          return cached;
        }
      }

      const nextTree = await fetchBookmarks();
      const { markdown: md, analysis: stats } = generateMarkdownWithAnalysis(nextTree);
      const flat = flattenBookmarkNodes(nextTree);
      const map = buildDomainFolderMap(flat);
      const payload = { bookmarkTree: nextTree, markdown: md, analysis: stats, domainMap: map };
      await setCachedBookmarkData(payload);
      setTree(nextTree);
      setMarkdown(md);
      setAnalysis(stats);
      setBookmarks(flat);
      setDomainMap(map);
      return payload;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tree, markdown, analysis, bookmarks, domainMap, loading, refresh };
};
