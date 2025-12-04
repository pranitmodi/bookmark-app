/**
 * Utility functions for Chrome API operations
 */

/**
 * Gets the current active tab
 * @returns {Promise<Object>} The active tab object with url, title, etc.
 */
export const getCurrentTab = () => {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (tabs && tabs.length > 0) {
          resolve(tabs[0]);
        } else {
          reject(new Error('No active tab found'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Gets a value from Chrome storage
 * @param {string|Array<string>} keys - The key(s) to retrieve
 * @returns {Promise<Object>} The stored values
 */
export const getFromStorage = (keys) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Sets a value in Chrome storage
 * @param {Object} items - The key-value pairs to store
 * @returns {Promise<void>}
 */
export const setInStorage = (items) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Copies text to clipboard
 * @param {string} text - The text to copy
 * @returns {Promise<void>}
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
};
