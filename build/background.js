/**
 * Background script for Bookmark AI Assistant
 * Handles background operations and message passing
 */

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Bookmark AI Assistant installed');
  } else if (details.reason === 'update') {
    console.log('Bookmark AI Assistant updated');
  }
});

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  // Handle different message types
  if (request.action === 'getBookmarks') {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      sendResponse({ bookmarks: bookmarkTreeNodes });
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'createBookmark') {
    const { parentId, title, url } = request;
    chrome.bookmarks.create({ parentId, title, url }, (newBookmark) => {
      if (chrome.runtime.lastError) {
        sendResponse({ 
          success: false, 
          error: chrome.runtime.lastError.message 
        });
      } else {
        sendResponse({ 
          success: true, 
          bookmark: newBookmark 
        });
      }
    });
    return true;
  }
  
  if (request.action === 'createFolder') {
    const { parentId, title } = request;
    chrome.bookmarks.create({ parentId, title }, (newFolder) => {
      if (chrome.runtime.lastError) {
        sendResponse({ 
          success: false, 
          error: chrome.runtime.lastError.message 
        });
      } else {
        sendResponse({ 
          success: true, 
          folder: newFolder 
        });
      }
    });
    return true;
  }
});

// Log when the extension is loaded
console.log('Bookmark AI Assistant background script loaded');

  