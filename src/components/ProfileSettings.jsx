import PropTypes from 'prop-types';

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
  if (!isOpen) return null;

  return (
    <div className="bg-[#262626] rounded-xl shadow-xl border border-[#3a3a3a] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#3a3a3a] bg-[#1a1a1a]">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-base">🔑</span>
          API Configuration
        </h2>
        <p className="text-[10px] text-gray-300 mt-0.5">
          Configure your Gemini API key to enable AI-powered bookmark recommendations
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-200">
            Gemini API Key
          </label>
          <input
            id="api-key-input"
            onChange={onApiInputChange}
            value={apiInput || ''}
            type="password"
            placeholder="Enter your API key..."
            className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg focus:ring-2 focus:ring-[#FFD900] focus:border-[#FFD900] transition-all duration-200 text-sm text-white placeholder-gray-500"
            aria-label="Gemini API Key"
          />
        </div>

        <button
          onClick={onSubmit}
          className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 text-sm ${
            apiKey
              ? 'bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white border border-[#4a4a4a]'
              : 'bg-[#FFD900] hover:bg-[#ffed4e] text-black shadow-lg hover:shadow-xl'
          }`}
        >
          {apiKey ? '🔄 Reset API Key' : '✓ Save API Key'}
        </button>

        <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#FFD900] mb-2 flex items-center gap-2">
            <span className="text-base">📖</span>
            How to get your API Key
          </h3>
          <ol className="space-y-1.5 text-xs text-gray-300">
            <li className="flex gap-2">
              <span className="text-[#FFD900] font-semibold">1.</span>
              <span>
                Visit{' '}
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#FFD900] hover:text-[#ffed4e] font-medium underline"
                >
                  Google AI Studio
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD900] font-semibold">2.</span>
              <span>Sign in with your Google account</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD900] font-semibold">3.</span>
              <span>Click "Get API Key" in the top menu</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD900] font-semibold">4.</span>
              <span>Click "Create API Key" button</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD900] font-semibold">5.</span>
              <span>Select or create a Google Cloud project</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD900] font-semibold">6.</span>
              <span>Copy the generated API key</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FFD900] font-semibold">7.</span>
              <span>Paste it in the field above</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
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
