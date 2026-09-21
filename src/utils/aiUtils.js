import { completeJson } from '../ai/router.js';
import { renderSections } from '../ai/budget.js';
import { RECOMMEND_SYSTEM } from '../ai/prompts.js';
import { loadOrganizationProfile, loadPlacementHistory } from '../ai/storage.js';
import { hostnameOf } from './clusterBookmarks.js';

const recommendSchema = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          add_folder: { type: 'boolean' },
          text: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['add_folder', 'text', 'title'],
      },
    },
  },
  required: ['recommendations'],
};

const MIN_EXISTING_RECS = 3;
const MAX_EXISTING_RECS = 4;
const NEW_FOLDER_RECS = 2;

// Labels that carry no meaning on their own, so "bbc.co.uk" still yields "Bbc".
const GENERIC_DOMAIN_LABELS = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu']);

const TITLE_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'how', 'what', 'why', 'your', 'you',
  'to', 'of', 'in', 'on', 'is', 'are', 'best', 'guide', 'tutorial', 'docs',
  'documentation', 'home', 'welcome', 'official', 'new', 'get', 'using',
]);

const titleCase = (value) => value
  .split(/[\s\-_]+/)
  .filter(Boolean)
  .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');

/** "docs.python.org" -> "Python", "bbc.co.uk" -> "Bbc" */
const folderNameFromDomain = (domain) => {
  if (!domain) return '';
  const labels = domain.split('.').filter(Boolean);
  if (labels.length > 1) labels.pop();
  while (labels.length > 1 && GENERIC_DOMAIN_LABELS.has(labels[labels.length - 1])) {
    labels.pop();
  }
  return titleCase(labels[labels.length - 1] || domain);
};

const folderNameFromTitle = (title) => {
  const words = [];
  (title || '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .forEach((word) => {
      const lower = word.toLowerCase();
      // Titles repeat the product name ("Python Tutorial - Python docs"), which
      // would otherwise produce a folder called "Python Python".
      if (word.length <= 2 || TITLE_STOPWORDS.has(lower)) return;
      if (words.some((seen) => seen.toLowerCase() === lower)) return;
      words.push(word);
    });
  if (!words.length) return '';
  return titleCase(words.slice(0, 2).join(' '));
};

/** Words worth matching against folder names, taken from the domain and title. */
const relevanceKeywords = (url, title) => {
  const words = new Set();
  const labels = hostnameOf(url).split('.').filter(Boolean);
  // The TLD is never a topic: ".dev" would otherwise match every "Development".
  if (labels.length > 1) labels.pop();
  labels.forEach((label) => {
    const lower = label.toLowerCase();
    if (lower.length > 2 && !GENERIC_DOMAIN_LABELS.has(lower) && !TITLE_STOPWORDS.has(lower)) {
      words.add(lower);
    }
  });
  (title || '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .forEach((word) => {
      const lower = word.toLowerCase();
      if (lower.length > 2 && !TITLE_STOPWORDS.has(lower)) words.add(lower);
    });
  return [...words];
};

/**
 * Existing folders whose names overlap this page's domain or title, best first.
 * Folder names are the only per-page signal the library offers beyond an exact
 * domain match, so they stand in for the old "recently used" list, which said
 * nothing about the page being saved.
 */
const relevantFolderPaths = ({ url, title, folderPaths }) => {
  const keywords = relevanceKeywords(url, title);
  if (!keywords.length) return [];

  return (folderPaths || [])
    .map((path) => {
      const segments = path.toLowerCase().split(' > ');
      const leaf = segments.at(-1);
      const words = segments.flatMap((segment) => segment.split(/\s+/)).filter(Boolean);
      let score = 0;
      keywords.forEach((keyword) => {
        if (leaf === keyword) score += 4;
        else if (words.includes(keyword)) score += 3;
        else if (words.some((word) => (
          word.length > 3 && (word.includes(keyword) || keyword.includes(word))
        ))) score += 1;
      });
      if (!score) return null;
      // A matching subfolder is usually a better home than its parent.
      return { path, score: score + Math.min(2, segments.length - 1) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 6)
    .map((item) => item.path);
};

/**
 * Folder paths this bookmark could plausibly live under, best first: where this
 * domain already lives, then folders whose names match the page, then those
 * folders' parents. Deliberately returns nothing when the library holds no
 * folder related to this page, rather than padding with unrelated favourites.
 */
const parentCandidates = ({ domain, url, title, domainMap, folderPaths }) => {
  const seen = new Set();
  const paths = [];
  const push = (path) => {
    if (!path || path === 'Root') return;
    const key = path.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    paths.push(path);
  };

  const matches = relevantFolderPaths({ url, title, folderPaths });
  push(domainMap?.[domain]);
  matches.forEach(push);

  // An ancestor of a matching folder is still about the right topic, so it is
  // the last acceptable candidate. Unrelated favourites are not offered at all.
  [domainMap?.[domain], ...matches].filter(Boolean).forEach((path) => {
    const parts = path.split(' > ');
    for (let depth = parts.length - 1; depth > 0; depth -= 1) {
      push(parts.slice(0, depth).join(' > '));
    }
  });

  return paths;
};

/**
 * New-folder paths in preference order, each nested under an existing folder
 * when the library has one to nest under. The caller takes the first few that
 * are not already on the list, so this returns more than it needs.
 */
const newFolderCandidates = ({ url, title, domainMap, folderPaths }) => {
  const domain = hostnameOf(url);
  const domainName = folderNameFromDomain(domain);
  const names = [...new Set(
    [domainName, folderNameFromTitle(title), domainName && `${domainName} Resources`].filter(Boolean),
  )].slice(0, 3);

  // A new folder reads better one level down than buried, so each candidate
  // path contributes its top-level segment as a parent.
  const parents = [...new Set(
    parentCandidates({ domain, url, title, domainMap, folderPaths })
      .map((path) => path.split(' > ')[0]),
  )].slice(0, 3);

  if (!parents.length) return names;

  // Parent-major order: two different ideas under the best parent beat the same
  // name offered under two unrelated parents.
  const paths = [];
  parents.forEach((parent) => {
    names.forEach((name) => {
      // Skip "Development > Python > Python" style stutter.
      if (parent.toLowerCase().split(' > ').includes(name.toLowerCase())) return;
      paths.push(`${parent} > ${name}`);
    });
  });
  return paths;
};

/**
 * The model routinely returns fewer options than asked for, so top the list up
 * locally to at least MIN_EXISTING_RECS existing folders plus NEW_FOLDER_RECS
 * new-folder ideas.
 */
export const ensureRecommendationMix = (recs, { url, title, domainMap, folderPaths }) => {
  const domain = hostnameOf(url);
  const fallbackTitle = title || domain || 'Bookmark';
  const taken = new Set(recs.map((rec) => rec.text.toLowerCase()));
  const existing = recs.filter((rec) => !rec.add_folder);
  const created = recs.filter((rec) => rec.add_folder);

  parentCandidates({ domain, url, title, domainMap, folderPaths }).forEach((path) => {
    if (existing.length >= MIN_EXISTING_RECS || taken.has(path.toLowerCase())) return;
    taken.add(path.toLowerCase());
    existing.push({ add_folder: false, text: path, title: fallbackTitle, source: 'fallback' });
  });

  newFolderCandidates({ url, title, domainMap, folderPaths }).forEach((path) => {
    if (created.length >= NEW_FOLDER_RECS || taken.has(path.toLowerCase())) return;
    taken.add(path.toLowerCase());
    created.push({ add_folder: true, text: path, title: fallbackTitle, source: 'fallback' });
  });

  return [...existing.slice(0, MAX_EXISTING_RECS), ...created.slice(0, NEW_FOLDER_RECS)];
};

/**
 * Instant suggestions for the wait before the model answers. Every entry has to
 * be defensible for *this* page, so only an existing home for the domain and
 * folders whose names match the page qualify.
 */
export const heuristicRecommendations = ({ url, title, domainMap, folderPaths }) => {
  const domain = hostnameOf(url);
  const recs = [];
  const push = (path, source) => {
    if (!path || path === 'Root') return;
    if (recs.some((item) => item.text.toLowerCase() === path.toLowerCase())) return;
    recs.push({
      add_folder: false,
      text: path,
      title: title || domain || 'Bookmark',
      source,
    });
  };

  push(domainMap?.[domain], 'domain');
  relevantFolderPaths({ url, title, folderPaths }).forEach((path) => push(path, 'name-match'));
  return recs.slice(0, 3);
};

export const getBookmarkRecommendations = async ({
  config,
  folderStructure,
  url,
  title,
  structureSummary = '',
  domainMap = {},
  folderPaths = [],
  onDownloadProgress,
}) => {
  const [profile, history] = await Promise.all([loadOrganizationProfile(), loadPlacementHistory()]);
  const domain = hostnameOf(url);

  // Placements the user accepted outrank the map derived from the tree.
  const knownFolders = { ...domainMap, ...(profile.domainMap || {}) };

  // The mapping for this domain is the single most useful hint, so it leads.
  const domainLines = [
    ...(knownFolders[domain] ? [`${domain} -> ${knownFolders[domain]}`] : []),
    ...Object.entries(knownFolders)
      .filter(([key]) => key !== domain)
      .map(([key, path]) => `${key} -> ${path}`),
  ].join('\n');

  const examples = history.slice(0, 8)
    .map((item) => `- ${item.url} -> ${item.path}`)
    .join('\n');

  const render = (budgetChars) => renderSections(
    [
      { label: 'Bookmark:', body: `URL: ${url}\nPage title: ${title || '(none)'}`, required: true },
      { label: 'Library summary:', body: structureSummary, weight: 1 },
      { label: 'Known domain -> folder:', body: domainLines, weight: 1 },
      { label: 'Recent accepted placements:', body: examples, weight: 1 },
      { label: 'Folder structure:', body: folderStructure, weight: 6 },
    ],
    budgetChars,
  );

  const json = await completeJson({
    config,
    system: RECOMMEND_SYSTEM,
    prompt: render,
    schema: recommendSchema,
    onDownloadProgress,
  });

  // A thin or malformed response degrades into local suggestions rather than
  // an error, so the popup always has something actionable.
  const valid = (json.recommendations || [])
    .filter((rec) => typeof rec.add_folder === 'boolean' && rec.text && rec.title)
    .map((rec) => ({ ...rec, source: 'ai' }));

  return ensureRecommendationMix(valid, {
    url,
    title,
    domainMap: knownFolders,
    folderPaths,
  });
};
