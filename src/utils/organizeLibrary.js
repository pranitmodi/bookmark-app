import { completeJson, getPromptBudgetChars } from '../ai/router.js';
import { trimLines } from '../ai/budget.js';
import { ORGANIZE_SYSTEM } from '../ai/prompts.js';
import {
  clearUndoLog,
  loadUndoLog,
  saveOrganizationProfile,
  saveUndoLog,
} from '../ai/storage.js';
import {
  ensureFolderPath,
  flattenBookmarkNodes,
  flattenFolders,
  getBookmarkNode,
  invalidateBookmarkCache,
  moveBookmark,
  removeBookmarkNode,
} from './bookmarkUtils.js';
import { clusterBookmarks } from './clusterBookmarks.js';
import { MAX_FOLDER_DEPTH, normalizeFolderPath } from './organizeTree.js';

const assignmentSchema = {
  type: 'object',
  properties: {
    folders: { type: 'array', items: { type: 'string' } },
    assignments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clusterId: { type: 'string' },
          path: { type: 'string' },
        },
        required: ['clusterId', 'path'],
      },
    },
  },
  required: ['folders', 'assignments'],
};

/** One line per cluster, far cheaper than serializing the full objects. */
const describeCluster = (cluster, withSamples) => {
  const samples = withSamples
    ? ` e.g. ${cluster.samples.slice(0, 2).map((s) => s.title).filter(Boolean).join('; ').slice(0, 80)}`
    : '';
  return `${cluster.domain} (${cluster.count})${samples}`;
};

/**
 * Splits clusters into groups whose rendered prompt fits `budgetChars`.
 * Chrome's built-in model has a small quota, so a large library becomes
 * several sequential passes rather than one oversized request.
 */
const batchClusters = (clusters, budgetChars, folderHeaderChars) => {
  const room = Math.max(600, budgetChars - folderHeaderChars - 200);
  const withSamples = clusters.length <= 40;
  const batches = [];
  let current = [];
  let used = 0;

  clusters.forEach((cluster) => {
    const cost = describeCluster(cluster, withSamples).length + 1;
    if (current.length && used + cost > room) {
      batches.push(current);
      current = [];
      used = 0;
    }
    current.push(cluster);
    used += cost;
  });
  if (current.length) batches.push(current);
  return { batches, withSamples };
};

export const buildOrganizePlan = async ({ tree, config, existingFolders, onDownloadProgress, onProgress }) => {
  onProgress?.({ phase: 'scan' });
  const bookmarks = flattenBookmarkNodes(tree);
  const clusters = clusterBookmarks(bookmarks).slice(0, 80);
  onProgress?.({ phase: 'cluster', clusters: clusters.length, bookmarks: bookmarks.length });

  const budgetChars = await getPromptBudgetChars(config);
  const folderBudget = Math.floor(budgetChars * 0.25);
  const { batches, withSamples } = batchClusters(clusters, budgetChars, folderBudget);

  const assignments = new Map();
  const folders = new Set();
  let failedPasses = 0;
  let lastError = null;

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    onProgress?.({ phase: 'model', batch: i + 1, batches: batches.length });

    // Folders agreed in earlier batches are offered back so the taxonomy
    // stays consistent across passes instead of fragmenting per batch.
    const known = [...new Set([...existingFolders, ...folders])].join('\n');
    const render = (chars) => {
      const clusterText = batch.map((cluster) => describeCluster(cluster, withSamples)).join('\n');
      const forFolders = Math.floor(chars * 0.25);
      return [
        'Existing folders:',
        trimLines(known, forFolders) || '(none)',
        '',
        'Clusters (clusterId is the domain):',
        trimLines(clusterText, Math.max(300, chars - forFolders - 120)),
      ].join('\n');
    };

    // A pass the provider refuses (quota, a transient error) should cost only
    // its own clusters, not the passes that already succeeded.
    let json;
    try {
      json = await completeJson({
        config,
        system: ORGANIZE_SYSTEM,
        prompt: render,
        schema: assignmentSchema,
        onDownloadProgress,
      });
    } catch (error) {
      failedPasses += 1;
      lastError = error;
      continue;
    }

    (json.folders || []).forEach((path) => folders.add(path));
    (json.assignments || []).forEach((item) => {
      if (item?.clusterId && item?.path) {
        assignments.set(item.clusterId, item.path);
        folders.add(item.path);
      }
    });
  }

  if (failedPasses === batches.length) {
    throw lastError || new Error('Could not build a plan');
  }

  onProgress?.({ phase: 'plan' });
  const moves = [];
  clusters.forEach((cluster) => {
    const path = assignments.get(cluster.id);
    if (!path) return;
    cluster.bookmarks.forEach((bookmark) => {
      if (bookmark.path === path) return;
      moves.push({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        fromPath: bookmark.path,
        toPath: path,
        parentId: bookmark.parentId,
        index: bookmark.index,
        skipped: false,
      });
    });
  });

  return {
    // Only folders a move actually targets, so a chatty model cannot leave
    // empty folders behind when the plan is applied.
    folders: [...new Set(moves.map((move) => move.toPath))],
    moves,
    clusterCount: clusters.length,
    bookmarkCount: bookmarks.length,
    passes: batches.length,
    failedPasses,
  };
};

export const normalizeOrganizePlan = (plan) => {
  const movesById = new Map();
  (plan?.moves || []).filter((move) => !move.skipped).forEach((move) => {
    if (!move?.id) throw new Error('A proposed bookmark move is missing its bookmark ID.');
    const rawPath = String(move.toPath || '').trim();
    const toPath = normalizeFolderPath(rawPath);
    const rawParts = rawPath === 'Root' ? [] : rawPath.split(/\s*>\s*/);
    const parts = toPath === 'Root' ? [] : toPath.split(' > ');
    if (!rawPath || rawParts.some((part) => !part.trim())) {
      throw new Error(`Invalid destination path: ${rawPath || '(empty)'}`);
    }
    if (parts.length > MAX_FOLDER_DEPTH) {
      throw new Error(`${toPath} is nested deeper than ${MAX_FOLDER_DEPTH} levels.`);
    }
    movesById.set(String(move.id), {
      ...move,
      id: String(move.id),
      fromPath: normalizeFolderPath(move.fromPath),
      toPath,
      skipped: false,
    });
  });

  const moves = [...movesById.values()]
    .filter((move) => move.fromPath !== move.toPath);
  return {
    ...plan,
    moves,
    // Empty proposed folders are intentionally not materialized. Every created
    // folder must be the destination of at least one active move.
    folders: [...new Set(moves.map((move) => move.toPath).filter((path) => path !== 'Root'))],
  };
};

/** Chrome reads are cheap but not free; keep a few dozen in flight at a time. */
const READ_CHUNK = 25;

/** Reports at most once per whole percent so a big plan cannot flood React. */
const makeReporter = (onProgress, phase, total) => {
  let last = -1;
  return (done) => {
    const percent = total ? Math.round((done / total) * 100) : 100;
    if (percent === last && done !== total) return;
    last = percent;
    onProgress?.({ phase, done, total, percent });
  };
};

export const applyOrganizePlan = async (tree, plan, rootId = '2', { onProgress } = {}) => {
  // Validate the complete edited plan before the first Chrome API mutation.
  const prepared = normalizeOrganizePlan(plan);
  if (!prepared.moves.length) return 0;

  const folderArray = flattenFolders(tree);
  const undo = [];
  const folderCache = { Root: rootId };
  const batch = prepared.moves;

  await clearUndoLog();

  const reportFolders = makeReporter(onProgress, 'folders', prepared.folders.length);
  reportFolders(0);
  for (let i = 0; i < prepared.folders.length; i += 1) {
    const { parentId, created } = await ensureFolderPath(folderArray, prepared.folders[i], rootId);
    folderCache[prepared.folders[i]] = parentId;
    created.forEach((folder) => undo.push({ type: 'createFolder', id: folder.id }));
    if (created.length) await saveUndoLog(undo);
    reportFolders(i + 1);
  }

  // Resolve any destination the folder pass missed so the move loop below does
  // no folder work and stays a tight sequence of Chrome move calls.
  for (const move of batch) {
    if (folderCache[move.toPath]) continue;
    const { parentId, created } = await ensureFolderPath(folderArray, move.toPath, rootId);
    folderCache[move.toPath] = parentId;
    created.forEach((folder) => undo.push({ type: 'createFolder', id: folder.id }));
    if (created.length) await saveUndoLog(undo);
  }

  // Record every bookmark's pristine position and persist the whole undo log in
  // a single write before the first move. Undo entries are idempotent, so a log
  // describing a move that never ran is harmless, whereas a move missing from
  // the log would be unrecoverable.
  const reportReading = makeReporter(onProgress, 'reading', batch.length);
  reportReading(0);
  for (let i = 0; i < batch.length; i += READ_CHUNK) {
    const chunk = batch.slice(i, i + READ_CHUNK);
    const nodes = await Promise.all(
      chunk.map((move) => getBookmarkNode(move.id).catch(() => null)),
    );
    nodes.forEach((node, index) => undo.push({
      type: 'move',
      id: chunk[index].id,
      oldParentId: node?.parentId,
      oldIndex: node?.index,
    }));
    reportReading(Math.min(batch.length, i + READ_CHUNK));
  }
  await saveUndoLog(undo);

  const reportMoving = makeReporter(onProgress, 'moving', batch.length);
  reportMoving(0);
  for (let i = 0; i < batch.length; i += 1) {
    await moveBookmark(batch[i].id, folderCache[batch[i].toPath]);
    reportMoving(i + 1);
  }

  await invalidateBookmarkCache();

  const domainMap = {};
  batch.forEach((move) => {
    try {
      domainMap[new URL(move.url).hostname.replace(/^www\./, '')] = move.toPath;
    } catch {
      /* skip */
    }
  });
  await saveOrganizationProfile({
    folders: prepared.folders,
    domainMap,
    updatedAt: Date.now(),
  });

  return undo.length;
};

export const undoOrganize = async () => {
  const log = await loadUndoLog();
  for (const entry of [...log].reverse()) {
    try {
      if (entry.type === 'move' && entry.oldParentId) {
        await moveBookmark(entry.id, entry.oldParentId, entry.oldIndex);
      } else if (entry.type === 'createFolder') {
        await removeBookmarkNode(entry.id);
      }
    } catch {
      /* folder may already have children */
    }
  }
  await clearUndoLog();
  await invalidateBookmarkCache();
};
