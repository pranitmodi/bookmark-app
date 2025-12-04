import { memo } from 'react';
import PropTypes from 'prop-types';
import '../App.css';

/**
 * LoadingSpinner component - Shows a loading indicator
 * Memoized to prevent unnecessary re-renders
 */
const LoadingSpinner = memo(({ message = 'Loading...' }) => {
  return (
    <div className="loading-container">
      <h2 className="loading nunito-sans-500">{message}</h2>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

LoadingSpinner.propTypes = {
  message: PropTypes.string,
};

export default LoadingSpinner;
