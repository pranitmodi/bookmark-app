import PropTypes from 'prop-types';
import '../App.css';

/**
 * ProfileSettings component - Handles API key input and instructions
 */
const ProfileSettings = ({ 
  isOpen, 
  onToggle, 
  apiKey, 
  apiInput, 
  onApiInputChange, 
  onSubmit 
}) => {
  return (
    <>
      <div className="profile-div" onClick={onToggle}>
        <div className="user-btn">
          <i className={isOpen ? "ri-arrow-left-s-line" : "ri-user-3-fill"}></i>
        </div>
      </div>

      {isOpen && (
        <div className="gemini-form">
          <input
            className="api-key-input nunito-sans-400"
            onChange={onApiInputChange}
            value={apiInput || ''}
            type="password"
            name="gemini-api-key"
            placeholder="Enter Your Gemini API Key"
            aria-label="Gemini API Key"
          />
          <button
            className="action-btn"
            onClick={onSubmit}
            type="button"
          >
            {apiKey ? 'Reset' : 'Submit'}
          </button>
          <div className="instructions nunito-sans-400">
            <h2>Instructions:</h2>
            <ol>
              <li>
                Go to{' '}
                <a 
                  href="https://console.cloud.google.com/products" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Google Cloud
                </a>
              </li>
              <li>Sign Up or Sign In</li>
              <li>Click &quot;Select a Project&quot;</li>
              <li>Create a new Project</li>
              <li>
                Head over to{' '}
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Google AI Studio
                </a>
              </li>
              <li>Click &quot;Get API Key&quot;</li>
              <li>Click &quot;Create API Key&quot;</li>
              <li>Select the Google project created earlier</li>
              <li>Copy the API Key and store it securely</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};

ProfileSettings.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  apiKey: PropTypes.string,
  apiInput: PropTypes.string,
  onApiInputChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ProfileSettings;
