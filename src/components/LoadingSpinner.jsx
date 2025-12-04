import { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * LoadingSpinner component - Shows a loading indicator
 * Memoized to prevent unnecessary re-renders
 */
const LoadingSpinner = memo(({ message = 'Analyzing your bookmarks...' }) => {
  return (
    <div className="bg-[#262626] rounded-xl shadow-sm border border-[#3a3a3a] p-6">
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#3a3a3a] border-t-[#FFD900] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-medium text-sm mb-0.5">{message}</p>
          <p className="text-xs text-gray-400">This may take a few moments</p>
        </div>
      </div>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

LoadingSpinner.propTypes = {
  message: PropTypes.string,
};

export default LoadingSpinner;
