import { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useEasedPercent } from '../hooks/useEasedPercent.js';
import { IconCheck } from '../ui/icons.jsx';

const PLAN_STEPS = [
  { id: 'scan', label: 'Reading your library' },
  { id: 'cluster', label: 'Grouping bookmarks by site' },
  { id: 'model', label: 'Designing folders' },
  { id: 'plan', label: 'Building the plan' },
];

const APPLY_STEPS = [
  { id: 'folders', label: 'Creating folders' },
  { id: 'reading', label: 'Saving an undo checkpoint' },
  { id: 'moving', label: 'Moving bookmarks' },
];

const STEPS = { plan: PLAN_STEPS, apply: APPLY_STEPS };

/** Long model passes need proof of life, so surface how long it has been running. */
const useElapsedSeconds = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.round((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return seconds;
};

const OrganizeProgress = memo(({ mode, phase, percent, detail, providerLabel }) => {
  const steps = STEPS[mode];
  const downloading = phase === 'download';
  const activeIndex = downloading ? -1 : steps.findIndex((step) => step.id === phase);
  const eased = useEasedPercent(percent);
  const shown = Math.round(eased);
  const elapsed = useElapsedSeconds();

  const headline = downloading
    ? 'Downloading on-device model'
    : phase === 'model' && providerLabel
      ? `Designing folders with ${providerLabel}`
      : steps[Math.max(0, activeIndex)]?.label ?? steps[0].label;

  return (
    <div className="bg-raised rounded-lg border border-line p-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="spinner w-4 h-4 shrink-0" />
        <p className="flex-1 min-w-0 text-xs font-medium text-white truncate">{headline}</p>
        <span className="shrink-0 text-base font-semibold text-accent tabular-nums leading-none">
          {shown}
          <span className="text-[10px] text-gray-500">%</span>
        </span>
      </div>

      <div className="h-1.5 bg-panel rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full progress-sheen transition-[width] duration-200"
          style={{ width: `${Math.max(3, shown)}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
        <span className="min-w-0 truncate">{detail || 'Working locally on your bookmarks'}</span>
        {elapsed >= 3 && <span className="shrink-0 tabular-nums">{elapsed}s</span>}
      </div>

      {!downloading && (
        <ul className="space-y-1">
          {steps.map((step, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <li
                key={step.id}
                className={`flex items-center gap-2 text-[11px] ${
                  done ? 'text-gray-400' : active ? 'text-white' : 'text-gray-600'
                }`}
              >
                {done ? (
                  <IconCheck className="w-3 h-3 text-accent shrink-0" />
                ) : (
                  <span
                    className={`w-1.5 h-1.5 mx-[3px] rounded-full shrink-0 ${
                      active ? 'bg-accent pulse-dot' : 'bg-gray-700'
                    }`}
                  />
                )}
                <span className="truncate">{step.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

OrganizeProgress.displayName = 'OrganizeProgress';

OrganizeProgress.propTypes = {
  mode: PropTypes.oneOf(['plan', 'apply']).isRequired,
  phase: PropTypes.string.isRequired,
  percent: PropTypes.number.isRequired,
  detail: PropTypes.string,
  providerLabel: PropTypes.string,
};

export default OrganizeProgress;
