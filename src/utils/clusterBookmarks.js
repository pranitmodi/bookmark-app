const SKIP_PROTOCOLS = /^(chrome|chrome-extension|javascript|data|about):/i;

export const hostnameOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const clusterBookmarks = (bookmarks) => {
  const groups = new Map();

  bookmarks.forEach((bookmark) => {
    if (!bookmark.url || SKIP_PROTOCOLS.test(bookmark.url)) return;
    const domain = hostnameOf(bookmark.url);
    if (!domain) return;
    if (!groups.has(domain)) {
      groups.set(domain, {
        id: domain,
        domain,
        bookmarks: [],
      });
    }
    groups.get(domain).bookmarks.push(bookmark);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      count: group.bookmarks.length,
      samples: group.bookmarks.slice(0, 4).map((item) => ({
        title: item.title,
        url: item.url,
      })),
    }))
    .sort((a, b) => b.count - a.count);
};

export const libraryNeedsOrganize = (analysis, bookmarks) => {
  const rootCount = bookmarks.filter((item) => item.path === 'Root').length;
  return analysis.totalFolders < 4 || rootCount > 12 || analysis.totalBookmarks > 40 && analysis.totalFolders < 8;
};
