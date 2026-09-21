const ROOT_PATH = 'Root';
export const MAX_FOLDER_DEPTH = 3;
const RESERVED_ROOTS = new Set([
  'Bookmarks bar',
  'Bookmarks Bar',
  'Other bookmarks',
  'Mobile bookmarks',
]);

const cleanPart = (value) => String(value || '').trim().replace(/\s+/g, ' ');

export const normalizeFolderPath = (value) => {
  const text = cleanPart(value);
  if (!text || text === ROOT_PATH) return ROOT_PATH;
  return text.split(/\s*>\s*/).map(cleanPart).filter(Boolean).join(' > ') || ROOT_PATH;
};

const partsOf = (path) => {
  const normalized = normalizeFolderPath(path);
  return normalized === ROOT_PATH ? [] : normalized.split(' > ');
};

const childPath = (parent, name) => {
  const cleanName = cleanPart(name);
  return normalizeFolderPath(parent) === ROOT_PATH
    ? cleanName
    : `${normalizeFolderPath(parent)} > ${cleanName}`;
};

const isAtOrBelow = (path, prefix) => {
  const normalizedPath = normalizeFolderPath(path);
  const normalizedPrefix = normalizeFolderPath(prefix);
  if (normalizedPrefix === ROOT_PATH) return true;
  return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix} > `);
};

const rebasePath = (path, fromPath, toPath) => {
  const normalized = normalizeFolderPath(path);
  const from = normalizeFolderPath(fromPath);
  const to = normalizeFolderPath(toPath);
  if (!isAtOrBelow(normalized, from)) return normalized;
  const suffix = normalized === from ? '' : normalized.slice(from.length + 3);
  if (!suffix) return to;
  return to === ROOT_PATH ? suffix : `${to} > ${suffix}`;
};

const folderPathsFromBookmarks = (bookmarks, key) => {
  const paths = new Set();
  bookmarks.forEach((bookmark) => {
    const parts = partsOf(bookmark[key]);
    for (let index = 1; index <= parts.length; index += 1) {
      paths.add(parts.slice(0, index).join(' > '));
    }
  });
  return paths;
};

const folderPathsFromTree = (tree) => {
  const paths = new Set();
  const walk = (nodes, parentParts = []) => {
    (nodes || []).forEach((node) => {
      if (!node.children) return;
      const include = node.title && !RESERVED_ROOTS.has(node.title);
      const nextParts = include ? [...parentParts, cleanPart(node.title)] : parentParts;
      if (include) paths.add(nextParts.join(' > '));
      walk(node.children, nextParts);
    });
  };
  walk(tree);
  return paths;
};

const withParents = (paths) => {
  const result = new Set();
  paths.forEach((path) => {
    const parts = partsOf(path);
    for (let index = 1; index <= parts.length; index += 1) {
      result.add(parts.slice(0, index).join(' > '));
    }
  });
  return result;
};

export const createOrganizeDraft = (bookmarks, plan, tree = []) => {
  const plannedMoves = new Map(
    (plan?.moves || [])
      .filter((move) => !move.skipped)
      .map((move) => [String(move.id), normalizeFolderPath(move.toPath)]),
  );
  const items = (bookmarks || []).map((bookmark) => {
    const originalPath = normalizeFolderPath(bookmark.path);
    return {
      ...bookmark,
      id: String(bookmark.id),
      originalPath,
      desiredPath: plannedMoves.get(String(bookmark.id)) || originalPath,
    };
  });
  const originalFolders = new Set([
    ...folderPathsFromBookmarks(items, 'originalPath'),
    ...folderPathsFromTree(tree),
  ]);
  const folders = withParents(new Set([
    ...originalFolders,
    ...folderPathsFromBookmarks(items, 'desiredPath'),
    ...(plan?.folders || []).map(normalizeFolderPath).filter((path) => path !== ROOT_PATH),
  ]));

  return {
    bookmarks: items,
    folders: [...folders],
    originalFolders: [...originalFolders],
    userEditCount: 0,
  };
};

const updateDraft = (draft, changes) => ({
  ...draft,
  ...changes,
  userEditCount: draft.userEditCount + 1,
});

const folderNameAt = (path) => partsOf(path).at(-1) || '';

const duplicateSibling = (draft, candidate, ignoredPrefix = null) =>
  draft.folders.some((folder) => {
    if (ignoredPrefix && isAtOrBelow(folder, ignoredPrefix)) return false;
    return normalizeFolderPath(folder).toLowerCase() === normalizeFolderPath(candidate).toLowerCase();
  });

const deepestRebasedDepth = (draft, sourcePath, destinationPath) => {
  const affected = draft.folders.filter((path) => isAtOrBelow(path, sourcePath));
  return Math.max(
    partsOf(destinationPath).length,
    ...affected.map((path) => partsOf(rebasePath(path, sourcePath, destinationPath)).length),
  );
};

export const validateFolderMove = (draft, sourcePath, targetParentPath) => {
  const source = normalizeFolderPath(sourcePath);
  const target = normalizeFolderPath(targetParentPath);
  if (source === ROOT_PATH) return 'The library root cannot be moved.';
  if (target === source || isAtOrBelow(target, source)) {
    return 'A folder cannot be moved inside itself.';
  }
  const destination = childPath(target, folderNameAt(source));
  if (duplicateSibling(draft, destination, source)) {
    return 'A folder with this name already exists at the destination.';
  }
  if (deepestRebasedDepth(draft, source, destination) > MAX_FOLDER_DEPTH) {
    return `Folders can be nested at most ${MAX_FOLDER_DEPTH} levels deep.`;
  }
  return '';
};

export const moveBookmarkInDraft = (draft, bookmarkId, targetPath) => {
  const target = normalizeFolderPath(targetPath);
  if (target !== ROOT_PATH && !draft.folders.includes(target)) {
    throw new Error('Choose a folder that exists in the proposed tree.');
  }
  return updateDraft(draft, {
    bookmarks: draft.bookmarks.map((bookmark) => (
      bookmark.id === String(bookmarkId)
        ? { ...bookmark, desiredPath: target }
        : bookmark
    )),
  });
};

export const moveFolderInDraft = (draft, sourcePath, targetParentPath) => {
  const error = validateFolderMove(draft, sourcePath, targetParentPath);
  if (error) throw new Error(error);
  const source = normalizeFolderPath(sourcePath);
  const destination = childPath(targetParentPath, folderNameAt(source));
  return updateDraft(draft, {
    folders: [...new Set(draft.folders.map((path) => rebasePath(path, source, destination)))],
    bookmarks: draft.bookmarks.map((bookmark) => ({
      ...bookmark,
      desiredPath: rebasePath(bookmark.desiredPath, source, destination),
    })),
  });
};

export const renameFolderInDraft = (draft, folderPath, nextName) => {
  const source = normalizeFolderPath(folderPath);
  const name = cleanPart(nextName);
  if (!name || name.includes('>')) {
    throw new Error('Use a folder name without “>”.');
  }
  const parentParts = partsOf(source).slice(0, -1);
  const parent = parentParts.length ? parentParts.join(' > ') : ROOT_PATH;
  const destination = childPath(parent, name);
  if (destination.toLowerCase() === source.toLowerCase()) return draft;
  if (duplicateSibling(draft, destination, source)) {
    throw new Error('A folder with this name already exists here.');
  }
  return updateDraft(draft, {
    folders: [...new Set(draft.folders.map((path) => rebasePath(path, source, destination)))],
    bookmarks: draft.bookmarks.map((bookmark) => ({
      ...bookmark,
      desiredPath: rebasePath(bookmark.desiredPath, source, destination),
    })),
  });
};

export const addFolderToDraft = (draft, parentPath, name) => {
  const parent = normalizeFolderPath(parentPath);
  const cleanName = cleanPart(name);
  if (!cleanName || cleanName.includes('>')) {
    throw new Error('Use a folder name without “>”.');
  }
  const path = childPath(parent, cleanName);
  if (partsOf(path).length > MAX_FOLDER_DEPTH) {
    throw new Error(`Folders can be nested at most ${MAX_FOLDER_DEPTH} levels deep.`);
  }
  if (duplicateSibling(draft, path)) {
    throw new Error('A folder with this name already exists here.');
  }
  return updateDraft(draft, { folders: [...draft.folders, path] });
};

export const removeEmptyFolderFromDraft = (draft, folderPath) => {
  const path = normalizeFolderPath(folderPath);
  const isOriginal = draft.originalFolders.includes(path);
  const hasContents = draft.bookmarks.some((bookmark) => isAtOrBelow(bookmark.desiredPath, path))
    || draft.folders.some((folder) => folder !== path && isAtOrBelow(folder, path));
  if (isOriginal) throw new Error('Existing folders are kept for safe undo.');
  if (hasContents) throw new Error('Move the contents before removing this folder.');
  return updateDraft(draft, { folders: draft.folders.filter((folder) => folder !== path) });
};

export const revertBookmarkInDraft = (draft, bookmarkId) => {
  const bookmark = draft.bookmarks.find((item) => item.id === String(bookmarkId));
  if (!bookmark) return draft;
  const folders = withParents(new Set([...draft.folders, bookmark.originalPath]));
  return updateDraft(draft, {
    folders: [...folders],
    bookmarks: draft.bookmarks.map((item) => (
      item.id === bookmark.id ? { ...item, desiredPath: item.originalPath } : item
    )),
  });
};

export const validateOrganizeDraft = (draft) => {
  const errors = [];
  const lowered = new Set();
  draft.folders.forEach((path) => {
    const normalized = normalizeFolderPath(path);
    const key = normalized.toLowerCase();
    if (normalized === ROOT_PATH || !partsOf(normalized).length) {
      errors.push(`Invalid folder path: ${path}`);
    } else if (
      partsOf(normalized).length > MAX_FOLDER_DEPTH
      && !draft.originalFolders.includes(normalized)
    ) {
      errors.push(`${normalized} is nested deeper than ${MAX_FOLDER_DEPTH} levels.`);
    } else if (lowered.has(key)) {
      errors.push(`Duplicate folder: ${normalized}`);
    }
    lowered.add(key);
  });
  draft.bookmarks.forEach((bookmark) => {
    if (bookmark.desiredPath !== ROOT_PATH && !draft.folders.includes(bookmark.desiredPath)) {
      errors.push(`${bookmark.title || bookmark.url} has no destination folder.`);
    }
  });
  return [...new Set(errors)];
};

export const draftToOrganizePlan = (draft) => {
  const moves = draft.bookmarks
    .filter((bookmark) => bookmark.desiredPath !== bookmark.originalPath)
    .map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      fromPath: bookmark.originalPath,
      toPath: bookmark.desiredPath,
      parentId: bookmark.parentId,
      index: bookmark.index,
      skipped: false,
    }));
  return {
    folders: [...new Set(moves.map((move) => move.toPath).filter((path) => path !== ROOT_PATH))],
    moves,
    bookmarkCount: draft.bookmarks.length,
    userEditCount: draft.userEditCount,
  };
};

const makeFolderNode = (name, path) => ({
  type: 'folder',
  name,
  path,
  folders: [],
  bookmarks: [],
});

export const buildFolderTree = (draft) => {
  const root = makeFolderNode('Bookmarks', ROOT_PATH);
  const nodes = new Map([[ROOT_PATH, root]]);

  [...draft.folders]
    .sort((a, b) => partsOf(a).length - partsOf(b).length || a.localeCompare(b))
    .forEach((path) => {
      const parts = partsOf(path);
      const name = parts.at(-1);
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join(' > ') : ROOT_PATH;
      const node = makeFolderNode(name, path);
      nodes.set(path, node);
      const parent = nodes.get(parentPath);
      if (parent) parent.folders.push(node);
    });

  draft.bookmarks.forEach((bookmark) => {
    (nodes.get(bookmark.desiredPath) || root).bookmarks.push({
      ...bookmark,
      type: 'bookmark',
      changed: bookmark.desiredPath !== bookmark.originalPath,
    });
  });

  const sortNode = (node) => {
    node.folders.sort((a, b) => a.name.localeCompare(b.name));
    node.bookmarks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    node.folders.forEach(sortNode);
    node.descendantCount = node.bookmarks.length
      + node.folders.reduce((total, child) => total + child.descendantCount, 0);
    node.hasChanges = node.bookmarks.some((item) => item.changed)
      || node.folders.some((child) => child.hasChanges);
  };
  sortNode(root);
  return root;
};