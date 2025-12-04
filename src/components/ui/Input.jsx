import PropTypes from 'prop-types';
import './ui.css';

export const Input = ({ 
  className = '', 
  type = 'text',
  error = false,
  ...props 
}) => {
  return (
    <input 
      type={type}
      className={`input ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
  );
};

export const Label = ({ children, className = '', htmlFor, ...props }) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`label ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};

Input.propTypes = {
  className: PropTypes.string,
  type: PropTypes.string,
  error: PropTypes.bool,
};

Label.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  htmlFor: PropTypes.string,
};
