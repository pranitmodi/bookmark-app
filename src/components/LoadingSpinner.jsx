import { memo } from 'react';
import PropTypes from 'prop-types';

const LoadingSpinner = memo(({ message = 'Matching folders…' }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-10">
    <span className="spinner w-6 h-6" />
    <p className="text-xs text-gray-400">{message}</p>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';
LoadingSpinner.propTypes = { message: PropTypes.string };

export default LoadingSpinner;
