import { memo } from 'react';
import PropTypes from 'prop-types';
import { useEasedPercent } from '../hooks/useEasedPercent.js';
import { IconCheck } from '../ui/icons.jsx';

const STAGES = ['bookmarks', 'analyzing', 'asking', 'done'];

const STEPS = [
  { id: 'bookmarks', label: 'Reading your bookmarks', target: 30 },
  { id: 'analyzing', label: 'Analyzing folder patterns', target: 55 },
  { id: 'asking', label: 'Asking', target: 95 },
];

const stepLabel = (step, providerLabel) => (
  step.id === 'asking' ? `${step.label} ${providerLabel || 'the model'}` : step.label
);

const RecommendationProgress = memo(({ stage, providerLabel, downloadProgress, compact }) => {
  const downloading = typeof downloadProgress === 'number';
  const activeIndex = STEPS.findIndex((step) => step.id === stage);
  const target = downloading
    ? Math.round(downloadProgress * 100)
    : (STEPS[activeIndex]?.target ?? (stage === 'done' ? 100 : 0));
  const eased = useEasedPercent(target);
  const percent = Math.round(eased);
  const complete = stage === 'done';

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate">
            <span className="spinner w-3 h-3 shrink-0" />
            {downloading
              ? 'Downloading on-device model'
              : `Refining with ${providerLabel || 'the model'}`}
          </span>
          <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{percent}%</span>
        </div>
        <div className="h-1 bg-raised rounded-full overflow-hidden">
          <div
            className={`h-full bg-accent rounded-full transition-[width] duration-200 ${complete ? '' : 'progress-sheen'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel rounded-xl border border-line p-3.5 space-y-3 animate-fade-up">
      <div className="flex items-center gap-2.5">
        <span className="spinner w-4 h-4 shrink-0" />
        <p className="flex-1 text-xs font-medium text-white truncate">
          {downloading
            ? 'Downloading on-device model'
            : stepLabel(STEPS[Math.max(0, activeIndex)] ?? STEPS[0], providerLabel)}
        </p>
        <span className="text-lg font-semibold text-accent tabular-nums leading-none">
          {percent}
          <span className="text-xs text-gray-500">%</span>
        </span>
      </div>

      <div className="h-1.5 bg-raised rounded-full overflow-hidden">
        <div
          className={`h-full bg-accent rounded-full transition-[width] duration-200 ${complete ? '' : 'progress-sheen'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!downloading && (
        <ul className="space-y-1.5">
          {STEPS.map((step, index) => {
            const done = complete || index < activeIndex;
            const active = !complete && index === activeIndex;
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
                <span className="truncate">{stepLabel(step, providerLabel)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

RecommendationProgress.displayName = 'RecommendationProgress';

RecommendationProgress.propTypes = {
  stage: PropTypes.oneOf(STAGES),
  providerLabel: PropTypes.string,
  downloadProgress: PropTypes.number,
  compact: PropTypes.bool,
};

export default RecommendationProgress;
