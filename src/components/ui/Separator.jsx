import PropTypes from 'prop-types';
import './ui.css';

export const Separator = ({ className = '', orientation = 'horizontal', ...props }) => {
  return (
    <div 
      className={`separator separator-${orientation} ${className}`}
      role="separator"
      {...props}
    />
  );
};

Separator.propTypes = {
  className: PropTypes.string,
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),
};
