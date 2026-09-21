import { memo, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { buildFolderTree, validateFolderMove } from '../utils/organizeTree.js';
import {
  IconChevron,
  IconEdit,
  IconFolder,
  IconGlobe,
  IconGrip,
  IconPlus,
  IconUndo,
} from '../ui/icons.jsx';

const ROOT_PATH = 'Root';
const INDENT = 'ml-3 pl-3 border-l border-line';

const matchesTree = (node, query) => {
  if (!query) return true;
  const needle = query.toLowerCase();
  if (node.name.toLowerCase().includes(needle)) return true;
  if (node.bookmarks.some((item) => (
    item.title?.toLowerCase().includes(needle)
    || item.url?.toLowerCase().includes(needle)
  ))) return true;
  return node.folders.some((folder) => matchesTree(folder, query));
};

const parseDrag = (event) => {
  try {
    return JSON.parse(event.dataTransfer.getData('application/x-bookmark-organizer'));
  } catch {
    return null;
  }
};

const BookmarkRow = memo(({ bookmark, paths, onMove, onRevert }) => (
  <div
    draggable
    onDragStart={(event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(
        'application/x-bookmark-organizer',
        JSON.stringify({ type: 'bookmark', id: bookmark.id }),
      );
    }}
    className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 border ${
      bookmark.changed
        ? 'bg-accent/10 border-accent/30'
        : 'border-transparent hover:bg-raised'
    }`}
  >
    <IconGrip className="mt-0.5 w-3.5 h-3.5 text-gray-600 shrink-0 cursor-grab" />
    <IconGlobe className="mt-0.5 w-3.5 h-3.5 text-gray-500 shrink-0" />
    <span className="min-w-0 flex-1">
      <span className="block text-xs text-gray-200 truncate" title={bookmark.title}>
        {bookmark.title || bookmark.url}
      </span>
      {bookmark.changed && (
        <span className="block text-[10px] text-accent/80 truncate" title={bookmark.originalPath}>
          from {bookmark.originalPath}
        </span>
      )}
    </span>
    <select
      aria-label={`Move ${bookmark.title || 'bookmark'} to folder`}
      value={bookmark.desiredPath}
      onChange={(event) => onMove(bookmark.id, event.target.value)}
      className="max-w-24 shrink-0 bg-ink border border-line rounded px-1 py-0.5 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100"
    >
      <option value={ROOT_PATH}>Root</option>
      {paths.map((path) => <option key={path} value={path}>{path}</option>)}
    </select>
    {bookmark.changed && (
      <button
        type="button"
        onClick={() => onRevert(bookmark.id)}
        className="shrink-0 p-1 text-gray-500 hover:text-accent"
        aria-label={`Revert move for ${bookmark.title || 'bookmark'}`}
        title="Keep in original folder"
      >
        <IconUndo className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
));

BookmarkRow.displayName = 'BookmarkRow';
BookmarkRow.propTypes = {
  bookmark: PropTypes.object.isRequired,
  paths: PropTypes.arrayOf(PropTypes.string).isRequired,
  onMove: PropTypes.func.isRequired,
  onRevert: PropTypes.func.isRequired,
};

const FolderNode = ({
  node,
  draft,
  paths,
  expanded,
  query,
  onToggle,
  onMoveBookmark,
  onMoveFolder,
  onRename,
  onAdd,
  onRemove,
  onRevert,
  onError,
}) => {
  const isRoot = node.path === ROOT_PATH;
  const forcedOpen = Boolean(query);
  const open = forcedOpen || expanded.has(node.path);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const [adding, setAdding] = useState(false);
  const [childName, setChildName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const isNew = !isRoot && !draft.originalFolders.includes(node.path);
  const hasChildren = node.folders.length > 0 || node.bookmarks.length > 0;
  const visibleFolders = node.folders.filter((folder) => matchesTree(folder, query));
  const visibleBookmarks = node.bookmarks.filter((bookmark) => {
    if (!query) return true;
    const needle = query.toLowerCase();
    return bookmark.title?.toLowerCase().includes(needle)
      || bookmark.url?.toLowerCase().includes(needle);
  });
  const hasVisibleChildren = visibleFolders.length > 0 || visibleBookmarks.length > 0;

  useEffect(() => setName(node.name), [node.name]);

  if (!matchesTree(node, query)) return null;

  const submitRename = () => {
    try {
      onRename(node.path, name);
      setRenaming(false);
    } catch (error) {
      onError(error.message);
    }
  };

  const submitAdd = () => {
    try {
      onAdd(node.path, childName);
      setChildName('');
      setAdding(false);
      onToggle(node.path, true);
    } catch (error) {
      onError(error.message);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const payload = parseDrag(event);
    if (!payload) return;
    try {
      if (payload.type === 'bookmark') onMoveBookmark(payload.id, node.path);
      if (payload.type === 'folder') onMoveFolder(payload.path, node.path);
      onToggle(node.path, true);
    } catch (error) {
      onError(error.message);
    }
  };

  const folderParent = node.path.includes(' > ')
    ? node.path.split(' > ').slice(0, -1).join(' > ')
    : ROOT_PATH;
  const parentOptions = [ROOT_PATH, ...paths].filter((path) => (
    path !== node.path && !path.startsWith(`${node.path} > `)
  ));

  const tone = dragOver
    ? 'bg-accent/20 border-accent'
    : node.hasChanges || isNew
      ? 'bg-accent/5 border-accent/20'
      : 'border-transparent hover:bg-raised';

  return (
    <div>
      <div
        draggable={!isRoot}
        onDragStart={(event) => {
          if (isRoot) return;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData(
            'application/x-bookmark-organizer',
            JSON.stringify({ type: 'folder', path: node.path }),
          );
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 border transition-colors ${tone}`}
      >
        {!isRoot && <IconGrip className="w-3.5 h-3.5 text-gray-600 shrink-0 cursor-grab" />}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.path)}
            className="shrink-0 p-0.5 text-gray-500 hover:text-accent"
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
          >
            <IconChevron className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="w-[18px] shrink-0" aria-hidden="true" />
        )}
        <IconFolder className={`w-4 h-4 shrink-0 ${isNew ? 'text-accent' : 'text-gray-400'}`} />
        {renaming ? (
          <form
            className="flex-1 flex gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={submitRename}
              className="min-w-0 flex-1 bg-ink border border-accent rounded px-1.5 py-0.5 text-xs"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => hasChildren && onToggle(node.path)}
            onDoubleClick={() => !isRoot && setRenaming(true)}
            className="min-w-0 flex-1 flex items-center gap-1.5 text-left"
            title={isRoot ? 'Library root' : 'Double-click to rename'}
          >
            <span className="min-w-0 truncate text-xs text-white">{node.name}</span>
            <span className="shrink-0 rounded-full bg-raised px-1.5 text-[10px] text-gray-500">
              {node.descendantCount}
            </span>
            {isNew && (
              <span className="shrink-0 rounded-full bg-accent/20 px-1.5 text-[9px] font-semibold uppercase text-accent">
                new
              </span>
            )}
          </button>
        )}
        {!isRoot && (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="shrink-0 p-1 text-gray-500 hover:text-accent opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={`Rename ${node.name}`}
            title="Rename folder"
          >
            <IconEdit className="w-3.5 h-3.5" />
          </button>
        )}
        {!isRoot && (
          <select
            aria-label={`Move ${node.name} to folder`}
            value={folderParent}
            onChange={(event) => {
              const error = validateFolderMove(draft, node.path, event.target.value);
              if (error) onError(error);
              else onMoveFolder(node.path, event.target.value);
            }}
            className="max-w-20 shrink-0 bg-ink border border-line rounded px-1 py-0.5 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            {parentOptions.map((path) => (
              <option key={path} value={path}>{path === ROOT_PATH ? 'Root' : path}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="shrink-0 p-1 text-gray-500 hover:text-accent opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label={`Add subfolder to ${node.name}`}
          title="Add subfolder"
        >
          <IconPlus className="w-3.5 h-3.5" />
        </button>
        {!isRoot && isNew && (
          <button
            type="button"
            onClick={() => {
              try {
                onRemove(node.path);
              } catch (error) {
                onError(error.message);
              }
            }}
            className="shrink-0 px-1 text-[10px] text-gray-500 hover:text-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            Remove
          </button>
        )}
      </div>

      {adding && (
        <form
          className={`mt-1 flex gap-1 ${isRoot ? '' : INDENT}`}
          onSubmit={(event) => {
            event.preventDefault();
            submitAdd();
          }}
        >
          <input
            autoFocus
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            placeholder="New folder name"
            className="min-w-0 flex-1 bg-ink border border-line rounded px-2 py-1 text-xs"
          />
          <button type="submit" className="px-2 rounded bg-accent text-black text-xs font-semibold">Add</button>
        </form>
      )}

      {open && hasVisibleChildren && (
        <div className={`mt-1 space-y-1 ${isRoot ? '' : INDENT}`}>
          {visibleFolders.map((folder) => (
            <FolderNode
              key={folder.path}
              node={folder}
              draft={draft}
              paths={paths}
              expanded={expanded}
              query={query}
              onToggle={onToggle}
              onMoveBookmark={onMoveBookmark}
              onMoveFolder={onMoveFolder}
              onRename={onRename}
              onAdd={onAdd}
              onRemove={onRemove}
              onRevert={onRevert}
              onError={onError}
            />
          ))}
          {visibleBookmarks.map((bookmark) => (
            <BookmarkRow
              key={bookmark.id}
              bookmark={bookmark}
              paths={paths}
              onMove={onMoveBookmark}
              onRevert={onRevert}
            />
          ))}
        </div>
      )}
    </div>
  );
};

FolderNode.propTypes = {
  node: PropTypes.object.isRequired,
  draft: PropTypes.object.isRequired,
  paths: PropTypes.arrayOf(PropTypes.string).isRequired,
  expanded: PropTypes.instanceOf(Set).isRequired,
  query: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  onMoveBookmark: PropTypes.func.isRequired,
  onMoveFolder: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onRevert: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

const OrganizeTreeEditor = ({
  draft,
  onMoveBookmark,
  onMoveFolder,
  onRenameFolder,
  onAddFolder,
  onRemoveFolder,
  onRevertBookmark,
  onError,
}) => {
  const tree = useMemo(() => buildFolderTree(draft), [draft]);
  const paths = useMemo(() => [...draft.folders].sort(), [draft.folders]);
  const [expanded, setExpanded] = useState(() => {
    const first = tree.folders[0]?.path;
    return new Set(first ? [ROOT_PATH, first] : [ROOT_PATH]);
  });
  const [query, setQuery] = useState('');

  const toggle = (path, forceOpen = null) => {
    setExpanded((current) => {
      const next = new Set(current);
      const shouldOpen = forceOpen === null ? !next.has(path) : forceOpen;
      if (shouldOpen) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search folders and bookmarks"
          className="min-w-0 flex-1 bg-panel border border-line rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-500"
        />
        <span className="shrink-0 text-[10px] text-gray-500 whitespace-nowrap">
          {draft.bookmarks.length} bookmarks
        </span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] text-gray-500">
          Drag items into folders, double-click a folder to rename it, or use the move menus.
        </p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setExpanded(new Set([ROOT_PATH, ...draft.folders]))}
            className="rounded border border-line px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-accent hover:border-accent/50"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpanded(new Set([ROOT_PATH]))}
            className="rounded border border-line px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-accent hover:border-accent/50"
          >
            Collapse all
          </button>
        </div>
      </div>
      <div className="bg-panel border border-line rounded-xl p-2 max-h-[55vh] overflow-auto">
        <FolderNode
          node={tree}
          draft={draft}
          paths={paths}
          expanded={expanded}
          query={query.trim()}
          onToggle={toggle}
          onMoveBookmark={onMoveBookmark}
          onMoveFolder={onMoveFolder}
          onRename={onRenameFolder}
          onAdd={onAddFolder}
          onRemove={onRemoveFolder}
          onRevert={onRevertBookmark}
          onError={onError}
        />
      </div>
    </div>
  );
};

OrganizeTreeEditor.propTypes = {
  draft: PropTypes.object.isRequired,
  onMoveBookmark: PropTypes.func.isRequired,
  onMoveFolder: PropTypes.func.isRequired,
  onRenameFolder: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onRemoveFolder: PropTypes.func.isRequired,
  onRevertBookmark: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default OrganizeTreeEditor;
