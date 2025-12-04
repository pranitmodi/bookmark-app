/**
 * Utility functions for Chrome Bookmarks API operations
 */

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'bookmarkCache';

/**
 * Fetches the entire bookmark tree from Chrome
 * @returns {Promise<Array>} The bookmark tree structure
 */
export const fetchBookmarks = () => {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(bookmarkTreeNodes);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generates markdown AND analyzes patterns in a single tree traversal (optimized)
 * @param {Array} bookmarkNodes - The bookmark tree nodes
 * @param {number} depth - The current depth in the tree
 * @param {number} maxBookmarksPerFolder - Maximum bookmarks to include per folder
 * @returns {Object} Object with markdown string and pattern analysis
 */
export const generateMarkdownWithAnalysis = (bookmarkNodes, depth = 1, maxBookmarksPerFolder = 5) => {
  let markdown = '';
  const analysis = {
    totalFolders: 0,
    totalBookmarks: 0,
    maxDepth: 0,
    foldersByDepth: {},
    domainPatterns: {},
    popularFolders: [],
  };

  const traverse = (nodes, currentDepth) => {
    if (currentDepth > analysis.maxDepth) {
      analysis.maxDepth = currentDepth;
    }

    nodes.forEach((node) => {
      if (node.children) {
        // It's a folder
        analysis.totalFolders++;
        const folderName = node.title || 'Folder';
        markdown += `${'#'.repeat(currentDepth)} ${folderName}\n`;
        
        if (!analysis.foldersByDepth[currentDepth]) {
          analysis.foldersByDepth[currentDepth] = [];
        }
        
        // Count bookmarks and subfolders
        const bookmarks = node.children.filter(child => child.url);
        const subfolders = node.children.filter(child => child.children);
        
        analysis.foldersByDepth[currentDepth].push({
          name: node.title,
          bookmarkCount: bookmarks.length,
          depth: currentDepth,
        });

        // Track popular folders
        if (bookmarks.length > 0) {
          analysis.popularFolders.push({
            name: node.title,
            count: bookmarks.length,
            depth: currentDepth,
          });
        }
        
        // Show sample bookmarks for pattern matching
        if (bookmarks.length > 0) {
          const sampleBookmarks = bookmarks.slice(0, maxBookmarksPerFolder);
          markdown += `${'  '.repeat(currentDepth)}*[Contains ${bookmarks.length} bookmark(s)]*\n`;
          markdown += `${'  '.repeat(currentDepth)}*Examples:*\n`;
          sampleBookmarks.forEach((bookmark) => {
            analysis.totalBookmarks++;
            markdown += `${'  '.repeat(currentDepth)}- [${bookmark.title}](${bookmark.url})\n`;
            
            // Extract domain for pattern analysis
            try {
              const domain = new URL(bookmark.url).hostname.replace('www.', '');
              if (!analysis.domainPatterns[domain]) {
                analysis.domainPatterns[domain] = 0;
              }
              analysis.domainPatterns[domain]++;
            } catch {
              // Invalid URL, skip
            }
          });
          
          // Count remaining bookmarks without adding to markdown
          if (bookmarks.length > maxBookmarksPerFolder) {
            markdown += `${'  '.repeat(currentDepth)}*...and ${bookmarks.length - maxBookmarksPerFolder} more*\n`;
            bookmarks.slice(maxBookmarksPerFolder).forEach((bookmark) => {
              analysis.totalBookmarks++;
              try {
                const domain = new URL(bookmark.url).hostname.replace('www.', '');
                if (!analysis.domainPatterns[domain]) {
                  analysis.domainPatterns[domain] = 0;
                }
                analysis.domainPatterns[domain]++;
              } catch {
                // Invalid URL, skip
              }
            });
          }
          markdown += '\n';
        }
        
        // Recursively process subfolders
        if (subfolders.length > 0) {
          traverse(subfolders, currentDepth + 1);
        }
      }
    });
  };

  traverse(bookmarkNodes, depth);

  // Sort popular folders by bookmark count
  analysis.popularFolders.sort((a, b) => b.count - a.count);
  analysis.popularFolders = analysis.popularFolders.slice(0, 10); // Top 10

  return { markdown, analysis };
};

/**
 * Generates an enhanced markdown representation with bookmark examples for pattern matching
 * @param {Array} bookmarkNodes - The bookmark tree nodes
 * @param {number} depth - The current depth in the tree
 * @param {number} maxBookmarksPerFolder - Maximum bookmarks to include per folder for pattern analysis
 * @returns {string} Markdown formatted string with folder structure and sample bookmarks
 */
export const generateMarkdown = (bookmarkNodes, depth = 1, maxBookmarksPerFolder = 5) => {
  let markdown = '';
  
  bookmarkNodes.forEach((node) => {
    if (node.children) {
      // It's a folder
      const folderName = node.title || 'Folder';
      markdown += `${'#'.repeat(depth)} ${folderName}\n`;
      
      // Count bookmarks and subfolders in this folder
      const bookmarks = node.children.filter(child => child.url);
      const subfolders = node.children.filter(child => child.children);
      
      // Show sample bookmarks to help AI understand the folder's pattern
      if (bookmarks.length > 0) {
        const sampleBookmarks = bookmarks.slice(0, maxBookmarksPerFolder);
        markdown += `${'  '.repeat(depth)}*[Contains ${bookmarks.length} bookmark(s)]*\n`;
        markdown += `${'  '.repeat(depth)}*Examples:*\n`;
        sampleBookmarks.forEach((bookmark) => {
          markdown += `${'  '.repeat(depth)}- [${bookmark.title}](${bookmark.url})\n`;
        });
        if (bookmarks.length > maxBookmarksPerFolder) {
          markdown += `${'  '.repeat(depth)}*...and ${bookmarks.length - maxBookmarksPerFolder} more*\n`;
        }
        markdown += '\n';
      }
      
      // Recursively process subfolders
      if (subfolders.length > 0) {
        markdown += generateMarkdown(subfolders, depth + 1, maxBookmarksPerFolder);
      }
    }
  });
  
  return markdown;
};

/**
 * Finds a folder by navigating through the folder path
 * @param {Array} folderArray - The flat array of folder structure
 * @param {Array} folderPath - The path to navigate (array of folder names)
 * @returns {Object} Object containing parentId and the current folder array
 */
export const findFolderByPath = (folderArray, folderPath) => {
  let currentFolders = folderArray;
  let parentId = '1'; // Default to "Bookmarks Bar"
  
  for (let i = 0; i < folderPath.length; i++) {
    const folderName = folderPath[i];
    const folder = currentFolders.find(obj => obj.title === folderName);
    
    if (folder) {
      parentId = folder.id;
      currentFolders = folder.children || currentFolders;
    } else {
      // Folder not found in path
      break;
    }
  }
  
  return { parentId, currentFolders };
};

/**
 * Creates a bookmark in the specified location
 * @param {string} parentId - The parent folder ID
 * @param {string} title - The bookmark title
 * @param {string} url - The bookmark URL
 * @returns {Promise<Object>} The created bookmark object
 */
export const createBookmark = (parentId, title, url) => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create(
      { parentId, title, url },
      (newBookmark) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('Bookmark created:', newBookmark.title);
          resolve(newBookmark);
        }
      }
    );
  });
};

/**
 * Creates a new folder in the specified location
 * @param {string} parentId - The parent folder ID
 * @param {string} folderName - The new folder name
 * @returns {Promise<Object>} The created folder object
 */
export const createFolder = (parentId, folderName) => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create(
      { parentId, title: folderName },
      (newFolder) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('Folder created:', newFolder.title);
          resolve(newFolder);
        }
      }
    );
  });
};

/**
 * Creates a bookmark with a new folder if needed
 * @param {Array} folderStructureArray - The current folder structure
 * @param {string} pathString - The folder path as a string (e.g., "Folder > SubFolder")
 * @param {string} title - The bookmark title
 * @param {string} url - The bookmark URL
 * @param {boolean} shouldCreateFolder - Whether to create a new folder
 * @returns {Promise<Object>} The created bookmark
 */
export const createBookmarkWithPath = async (
  folderStructureArray,
  pathString,
  title,
  url,
  shouldCreateFolder = false
) => {
  const folders = pathString.split(' > ').map(f => f.trim());
  const { parentId } = findFolderByPath(folderStructureArray, folders);
  
  try {
    if (shouldCreateFolder) {
      // Create a new folder and then create the bookmark inside it
      const newFolderName = folders[folders.length - 1];
      const newFolder = await createFolder(parentId, newFolderName);
      return await createBookmark(newFolder.id, title, url);
    } else {
      // Create bookmark directly in the found folder
      return await createBookmark(parentId, title, url);
    }
  } catch (error) {
    console.error('Error creating bookmark:', error);
    throw error;
  }
};

/**
 * Analyzes bookmark patterns to help AI understand user's organization style
 * @param {Array} bookmarkNodes - The bookmark tree nodes
 * @returns {Object} Pattern analysis with statistics and insights
 */
export const analyzeBookmarkPatterns = (bookmarkNodes) => {
  const analysis = {
    totalFolders: 0,
    totalBookmarks: 0,
    maxDepth: 0,
    foldersByDepth: {},
    domainPatterns: {},
    popularFolders: [],
  };

  const traverse = (nodes, depth = 0) => {
    if (depth > analysis.maxDepth) {
      analysis.maxDepth = depth;
    }

    nodes.forEach((node) => {
      if (node.children) {
        // It's a folder
        analysis.totalFolders++;
        
        if (!analysis.foldersByDepth[depth]) {
          analysis.foldersByDepth[depth] = [];
        }
        
        const bookmarkCount = node.children.filter(child => child.url).length;
        analysis.foldersByDepth[depth].push({
          name: node.title,
          bookmarkCount,
          depth,
        });

        // Track popular folders (those with many bookmarks)
        if (bookmarkCount > 0) {
          analysis.popularFolders.push({
            name: node.title,
            count: bookmarkCount,
            depth,
          });
        }

        traverse(node.children, depth + 1);
      } else if (node.url) {
        // It's a bookmark
        analysis.totalBookmarks++;
        
        // Extract domain for pattern analysis
        try {
          const domain = new URL(node.url).hostname.replace('www.', '');
          if (!analysis.domainPatterns[domain]) {
            analysis.domainPatterns[domain] = 0;
          }
          analysis.domainPatterns[domain]++;
        } catch {
          // Invalid URL, skip
        }
      }
    });
  };

  traverse(bookmarkNodes);

  // Sort popular folders by bookmark count
  analysis.popularFolders.sort((a, b) => b.count - a.count);
  analysis.popularFolders = analysis.popularFolders.slice(0, 10); // Top 10

  return analysis;
};

/**
 * Generates a detailed structure summary for AI context
 * @param {Object} analysis - Pattern analysis from analyzeBookmarkPatterns
 * @returns {string} Human-readable summary
 */
export const generateStructureSummary = (analysis) => {
  let summary = '**Bookmark Collection Overview:**\n';
  summary += `- Total Folders: ${analysis.totalFolders}\n`;
  summary += `- Total Bookmarks: ${analysis.totalBookmarks}\n`;
  summary += `- Maximum Nesting Depth: ${analysis.maxDepth} levels\n`;
  
  if (analysis.popularFolders.length > 0) {
    summary += '\n**Most Used Folders:**\n';
    analysis.popularFolders.slice(0, 5).forEach((folder, idx) => {
      summary += `${idx + 1}. "${folder.name}" - ${folder.count} bookmarks\n`;
    });
  }

  // Show top domains if available
  const topDomains = Object.entries(analysis.domainPatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  if (topDomains.length > 0) {
    summary += '\n**Frequently Bookmarked Domains:**\n';
    topDomains.forEach(([domain, count]) => {
      summary += `- ${domain} (${count} bookmark${count > 1 ? 's' : ''})\n`;
    });
  }

  summary += '\n';
  return summary;
};

/**
 * Gets cached bookmark data if available and fresh
 * @returns {Promise<Object|null>} Cached data or null if expired/missing
 */
export const getCachedBookmarkData = async () => {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cached = result[CACHE_KEY];
    
    if (!cached || !cached.timestamp) {
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      // Cache expired
      await chrome.storage.local.remove(CACHE_KEY);
      return null;
    }
    
    return cached.data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Saves bookmark data to cache
 * @param {Object} data - Data to cache (markdown, analysis, summary, bookmarkTree)
 * @returns {Promise<void>}
 */
export const setCachedBookmarkData = async (data) => {
  try {
    await chrome.storage.local.set({
      [CACHE_KEY]: {
        data,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * Invalidates the bookmark cache (call when bookmarks are modified)
 * @returns {Promise<void>}
 */
export const invalidateBookmarkCache = async () => {
  try {
    await chrome.storage.local.remove(CACHE_KEY);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
};

/**
 * Checks if a URL is already bookmarked
 * @param {string} url - The URL to check
 * @param {Array} bookmarkNodes - The bookmark tree nodes
 * @returns {Object|null} Bookmark info if found {title, path, id}, null otherwise
 */
export const checkBookmarkExists = (url, bookmarkNodes) => {
  let found = null;
  
  const traverse = (nodes, path = []) => {
    if (found) return; // Already found, stop searching
    
    nodes.forEach((node) => {
      if (found) return;
      
      if (node.children) {
        // It's a folder, traverse into it
        traverse(node.children, [...path, node.title]);
      } else if (node.url === url) {
        // Found matching bookmark
        found = {
          title: node.title,
          path: path.length > 0 ? path.join(' > ') : 'Root',
          id: node.id,
        };
      }
    });
  };
  
  traverse(bookmarkNodes);
  return found;
};

/**
 * Gets recently used bookmark folders from storage
 * @returns {Promise<Array>} Array of recent folder paths
 */
export const getRecentFolders = async () => {
  try {
    const result = await chrome.storage.local.get('recentFolders');
    return result.recentFolders || [];
  } catch (error) {
    console.error('Error getting recent folders:', error);
    return [];
  }
};

/**
 * Saves a folder to recent folders list
 * @param {string} folderPath - The folder path to save
 * @returns {Promise<void>}
 */
export const saveRecentFolder = async (folderPath) => {
  try {
    const recent = await getRecentFolders();
    
    // Remove if already exists (to move to front)
    const filtered = recent.filter(path => path !== folderPath);
    
    // Add to front and keep only last 5
    const updated = [folderPath, ...filtered].slice(0, 5);
    
    await chrome.storage.local.set({ recentFolders: updated });
  } catch (error) {
    console.error('Error saving recent folder:', error);
  }
};
