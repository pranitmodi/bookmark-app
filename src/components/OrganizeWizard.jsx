import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { applyOrganizePlan, buildOrganizePlan, undoOrganize } from '../utils/organizeLibrary.js';
import { libraryNeedsOrganize } from '../utils/clusterBookmarks.js';
import {
  addFolderToDraft,
  createOrganizeDraft,
  draftToOrganizePlan,
  moveBookmarkInDraft,
  moveFolderInDraft,
  removeEmptyFolderFromDraft,
  renameFolderInDraft,
  revertBookmarkInDraft,
  validateOrganizeDraft,
} from '../utils/organizeTree.js';
import { PROVIDER_LABELS } from '../ai/types.js';
import { IconFolder, IconLibrary, IconUndo } from '../ui/icons.jsx';
import OrganizeProgress from './OrganizeProgress.jsx';
import OrganizeTreeEditor from './OrganizeTreeEditor.jsx';

/** Percent checkpoints for the planning phases that have no measurable work. */
const PLAN_PERCENT = { scan: 8, cluster: 20, plan: 96 };
const MODEL_START = 24;
const MODEL_SPAN = 70;

/** Applying is measurable, so each phase owns a slice of the bar. */
const APPLY_SPAN = { folders: [0, 20], reading: [20, 35], moving: [35, 100] };

const planJob = (event) => {
  if (event.phase === 'model') {
    const share = MODEL_SPAN / Math.max(1, event.batches);
    return {
      mode: 'plan',
      phase: 'model',
      percent: Math.round(MODEL_START + share * (event.batch - 1)),
      detail: event.batches > 1 ? `Pass ${event.batch} of ${event.batches}` : 'One pass',
    };
  }
  if (event.phase === 'cluster') {
    return {
      mode: 'plan',
      phase: 'cluster',
      percent: PLAN_PERCENT.cluster,
      detail: `${event.clusters} sites across ${event.bookmarks} bookmarks`,
    };
  }
  return {
    mode: 'plan',
    phase: event.phase,
    percent: PLAN_PERCENT[event.phase] ?? PLAN_PERCENT.scan,
    detail: '',
  };
};

const applyJob = ({ phase, done, total, percent }) => {
  const [start, end] = APPLY_SPAN[phase] ?? [0, 100];
  return {
    mode: 'apply',
    phase,
    percent: Math.round(start + ((percent ?? 0) / 100) * (end - start)),
    detail: total ? `${done} of ${total}` : '',
  };
};

const OrganizeWizard = ({ tree, analysis, bookmarks, config, onDone }) => {
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [applied, setApplied] = useState(false);
  const [draft, setDraft] = useState(null);
  const [step, setStep] = useState('generate');

  const needsHelp = useMemo(
    () => analysis && libraryNeedsOrganize(analysis, bookmarks),
    [analysis, bookmarks],
  );

  const existingFolders = useMemo(() => {
    const names = new Set();
    bookmarks.forEach((item) => {
      if (item.path && item.path !== 'Root') names.add(item.path);
    });
    return [...names];
  }, [bookmarks]);

  const propose = async () => {
    setBusy(true);
    setError('');
    setApplied(false);
    setDraft(null);
    setStep('generate');
    setJob({ mode: 'plan', phase: 'scan', percent: PLAN_PERCENT.scan, detail: '' });
    try {
      const next = await buildOrganizePlan({
        tree,
        config,
        existingFolders,
        onDownloadProgress: (loaded) => setJob({
          mode: 'plan',
          phase: 'download',
          percent: Math.round(loaded * 100),
          detail: 'First run only',
        }),
        onProgress: (event) => setJob(planJob(event)),
      });
      setPlan(next);
      setDraft(createOrganizeDraft(bookmarks, next, tree));
      setStep('edit');
    } catch (err) {
      setError(err.message || 'Could not build a plan');
    } finally {
      setBusy(false);
      setJob(null);
    }
  };

  const editedPlan = useMemo(
    () => (draft ? { ...plan, ...draftToOrganizePlan(draft) } : null),
    [draft, plan],
  );
  const validationErrors = useMemo(
    () => (draft ? validateOrganizeDraft(draft) : []),
    [draft],
  );

  const apply = async () => {
    if (!editedPlan || validationErrors.length || editedPlan.moves.length === 0) return;
    setBusy(true);
    setError('');
    setJob({ mode: 'apply', phase: 'folders', percent: 0, detail: '' });
    try {
      await applyOrganizePlan(tree, editedPlan, '2', {
        onProgress: (event) => setJob(applyJob(event)),
      });
      setApplied(true);
      setStep('applied');
      onDone?.();
    } catch (err) {
      setError(err.message || 'Failed to apply moves');
    } finally {
      setBusy(false);
      setJob(null);
    }
  };

  const undo = async () => {
    setBusy(true);
    try {
      await undoOrganize();
      setApplied(false);
      setPlan(null);
      setDraft(null);
      setStep('generate');
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setPlan(null);
    setDraft(null);
    setApplied(false);
    setStep('generate');
    setError('');
  };

  const applyDraftEdit = (operation) => {
    try {
      setDraft(operation(draft));
      setError('');
    } catch (err) {
      setError(err.message || 'Could not edit the proposed tree');
    }
  };

  const movedCount = editedPlan?.moves.length || 0;
  const createdFolderCount = useMemo(() => {
    if (!editedPlan || !draft) return 0;
    const required = new Set();
    editedPlan.folders.forEach((path) => {
      const parts = path.split(' > ');
      for (let index = 1; index <= parts.length; index += 1) {
        required.add(parts.slice(0, index).join(' > '));
      }
    });
    return [...required].filter((path) => !draft.originalFolders.includes(path)).length;
  }, [draft, editedPlan]);
  const unchangedCount = draft ? draft.bookmarks.length - movedCount : 0;

  return (
    <div className="space-y-3">
      <div className="bg-panel rounded-xl border border-line p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-accent/20 flex items-center justify-center">
            <IconLibrary className="w-5 h-5 shrink-0 text-accent" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Organize library</h2>
            <p className="text-xs text-gray-400 mt-1">
              Cluster bookmarks locally, preview a folder plan, then apply with undo.
              {needsHelp ? ' Your library looks like it would benefit from a pass.' : ' Optional anytime.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={propose}
          disabled={busy || !tree}
          className="mt-4 w-full py-2.5 rounded-lg bg-accent text-black font-semibold text-sm hover:bg-accent-soft disabled:opacity-60"
        >
          {busy && !draft ? 'Designing folders…' : draft ? 'Generate a new plan' : 'Propose organization'}
        </button>
        {job?.mode === 'plan' && (
          <div className="mt-3">
            <OrganizeProgress
              mode="plan"
              phase={job.phase}
              percent={job.percent}
              detail={job.detail}
              providerLabel={PROVIDER_LABELS[config.provider]}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-300 bg-red-900/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      {draft && step === 'edit' && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Edit proposed tree</p>
              <p className="text-[10px] text-gray-500">Nothing changes until you confirm.</p>
            </div>
            <span className="text-[10px] text-gray-500">{movedCount} proposed moves</span>
          </div>
          {plan?.failedPasses > 0 && (
            <p className="text-[11px] text-amber-200 bg-amber-900/30 border border-amber-800/60 rounded-lg px-3 py-2">
              {plan.failedPasses} of {plan.passes} passes did not fit the model&apos;s input limit,
              so some sites were left where they are. Switch to Ollama or a cloud provider in
              Settings to cover the whole library.
            </p>
          )}
          <OrganizeTreeEditor
            draft={draft}
            onMoveBookmark={(id, path) => applyDraftEdit(
              (current) => moveBookmarkInDraft(current, id, path),
            )}
            onMoveFolder={(source, parent) => applyDraftEdit(
              (current) => moveFolderInDraft(current, source, parent),
            )}
            onRenameFolder={(path, name) => applyDraftEdit(
              (current) => renameFolderInDraft(current, path, name),
            )}
            onAddFolder={(parent, name) => applyDraftEdit(
              (current) => addFolderToDraft(current, parent, name),
            )}
            onRemoveFolder={(path) => applyDraftEdit(
              (current) => removeEmptyFolderFromDraft(current, path),
            )}
            onRevertBookmark={(id) => applyDraftEdit(
              (current) => revertBookmarkInDraft(current, id),
            )}
            onError={setError}
          />
          {validationErrors.length > 0 && (
            <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg p-2">
              {validationErrors[0]}
            </div>
          )}
          <div className="sticky bottom-0 -mx-1 px-1 pb-1 pt-2 bg-ink/95 backdrop-blur-sm space-y-1.5">
            {movedCount === 0 && (
              <p className="text-[10px] text-gray-500 text-center">
                Nothing to apply yet — move a bookmark or revert to generate a new plan.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="flex-1 py-2.5 rounded-lg border border-line text-gray-300 font-semibold text-sm hover:border-red-800 hover:text-red-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('review')}
                disabled={busy || validationErrors.length > 0 || movedCount === 0}
                className="flex-2 py-2.5 rounded-lg bg-white text-black font-semibold text-sm disabled:opacity-50"
              >
                Review {movedCount} change{movedCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}

      {draft && step === 'review' && (
        <div className="bg-panel rounded-xl border border-line overflow-hidden animate-fade-up">
          <div className="px-4 py-3 border-b border-line bg-raised">
            <p className="text-sm font-semibold text-white">Review organization</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Confirm before Bookmark AI changes Chrome bookmarks.
            </p>
          </div>
          <div className="p-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-raised p-2 text-center">
              <p className="text-lg font-semibold text-accent">{movedCount}</p>
              <p className="text-[10px] text-gray-500">Bookmarks moved</p>
            </div>
            <div className="rounded-lg bg-raised p-2 text-center">
              <p className="text-lg font-semibold text-white">{createdFolderCount}</p>
              <p className="text-[10px] text-gray-500">Folders created</p>
            </div>
            <div className="rounded-lg bg-raised p-2 text-center">
              <p className="text-lg font-semibold text-white">{unchangedCount}</p>
              <p className="text-[10px] text-gray-500">Unchanged</p>
            </div>
          </div>
          <div className="px-4 pb-3">
            <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
              <IconFolder className="w-3.5 h-3.5" />
              Destination folders
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {editedPlan.folders.map((path) => (
                <p key={path} className="text-xs text-gray-300 bg-raised rounded px-2 py-1">{path}</p>
              ))}
              {editedPlan.moves.some((move) => move.toPath === 'Root') && (
                <p className="text-xs text-gray-300 bg-raised rounded px-2 py-1">Root</p>
              )}
            </div>
            {draft.userEditCount > 0 && (
              <p className="mt-2 text-[10px] text-accent">
                Includes {draft.userEditCount} manual tree edit{draft.userEditCount === 1 ? '' : 's'}.
              </p>
            )}
            <p className="mt-2 text-[10px] text-gray-500">
              Only bookmarks and required destination folders change. Empty old folders are kept so Undo stays safe.
            </p>
            <div className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
              <p className="text-[11px] text-gray-200">
                Applying will move {movedCount} bookmark{movedCount === 1 ? '' : 's'} in Chrome
                {createdFolderCount > 0
                  ? ` and create ${createdFolderCount} folder${createdFolderCount === 1 ? '' : 's'}`
                  : ''}. Undo is available right after.
              </p>
            </div>
          </div>
          <div className="p-3 border-t border-line space-y-2">
            {job?.mode === 'apply' && (
              <OrganizeProgress
                mode="apply"
                phase={job.phase}
                percent={job.percent}
                detail={job.detail}
              />
            )}
            <button
              type="button"
              onClick={apply}
              disabled={busy || movedCount === 0 || validationErrors.length > 0}
              className="w-full py-2.5 rounded-lg bg-accent text-black font-semibold text-sm hover:bg-accent-soft disabled:opacity-50"
            >
              {busy
                ? 'Organizing…'
                : `Yes, apply ${movedCount} change${movedCount === 1 ? '' : 's'}`}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('edit')}
                disabled={busy}
                className="flex-1 py-2 rounded-lg border border-line text-gray-300 text-sm disabled:opacity-50"
              >
                Back to edit
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="flex-1 py-2 rounded-lg border border-line text-gray-400 text-sm hover:border-red-800 hover:text-red-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {draft && step === 'applied' && applied && (
        <div className="bg-panel rounded-xl border border-accent/30 p-4 animate-fade-up">
          <p className="text-sm font-semibold text-white">Library organized</p>
          <p className="text-xs text-gray-400 mt-1">
            Moved {movedCount} bookmarks. You can undo this batch while the log is available.
          </p>
          <button type="button" onClick={undo} disabled={busy} className="mt-3 text-xs text-accent flex items-center gap-1">
            <IconUndo className="w-3.5 h-3.5" /> Undo organization
          </button>
        </div>
      )}
    </div>
  );
};

OrganizeWizard.propTypes = {
  tree: PropTypes.array,
  analysis: PropTypes.object,
  bookmarks: PropTypes.array,
  config: PropTypes.object.isRequired,
  onDone: PropTypes.func,
};

export default OrganizeWizard;
