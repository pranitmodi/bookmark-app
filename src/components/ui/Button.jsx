import PropTypes from 'prop-types';
import './ui.css';

export const Button = ({ 
  children, 
  className = '', 
  variant = 'default', 
  size = 'default',
  disabled = false,
  ...props 
}) => {
  return (
    <button 
      className={`btn btn-${variant} btn-${size} ${className}`} 
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'secondary', 'ghost', 'destructive', 'outline', 'success']),
  size: PropTypes.oneOf(['default', 'sm', 'lg', 'icon']),
  disabled: PropTypes.bool,
};
