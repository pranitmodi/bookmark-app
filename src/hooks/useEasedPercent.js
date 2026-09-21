import { useEffect, useState } from 'react';

/**
 * Creeps the rendered value toward the target so a bar always reads as moving,
 * instead of jumping between stage checkpoints and sitting still in between.
 */
export const useEasedPercent = (target) => {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= target) return undefined;
    const frame = requestAnimationFrame(() => {
      setShown((current) => Math.min(target, current + Math.max(0.35, (target - current) * 0.07)));
    });
    return () => cancelAnimationFrame(frame);
  }, [shown, target]);

  return shown;
};

export default useEasedPercent;
