// Helper function to find a folder by its path
function findFolderByPath(path, callback) {
    const folders = path.split(' > ');
  
    function find(folderId, folders) {
      if (folders.length === 0) {
        callback(folderId);
        return;
      }
  
      const folderName = folders.shift();
      chrome.bookmarks.getChildren(folderId, (children) => {
        const folder = children.find(child => child.title === folderName && child.url === undefined);
        if (folder) {
          find(folder.id, folders);
        } else {
          console.error(`Folder "${folderName}" not found.`);
          callback(null);
        }
      });
    }
  
    find('0', folders); // Start from the root folder
  }
  
  // Function to create a bookmark
  function createBookmark(path, title, url) {
    findFolderByPath(path, (folderId) => {
      if (folderId) {
        chrome.bookmarks.create({
          parentId: folderId,
          title: title,
          url: url
        }, (newBookmark) => {
          console.log('Bookmark created:', newBookmark);
        });
      } else {
        console.error('Folder not found, bookmark not created.');
      }
    });
  }
  
  // Listen for messages from the React app
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'createBookmark') {
      const { path, title, url } = request;
      createBookmark(path, title, url);
      sendResponse({ status: 'success' });
    }
  });
  