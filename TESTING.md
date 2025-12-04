# 🧪 Bookmark AI Assistant - Testing Guide

## Table of Contents
1. [Pre-Testing Setup](#pre-testing-setup)
2. [Installation Testing](#installation-testing)
3. [Functional Testing](#functional-testing)
4. [Edge Case Testing](#edge-case-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Pre-Testing Setup

### Requirements Checklist
- [ ] Node.js v16+ installed
- [ ] Chrome browser (latest version)
- [ ] Gemini API key obtained
- [ ] Project dependencies installed (`npm install`)
- [ ] Extension built (`npm run build`)

---

## Installation Testing

### Test 1: Build Verification
```bash
npm run build
```

**Expected Results:**
- ✅ Build completes without errors
- ✅ `build/` directory is created
- ✅ `build/manifest.json` exists
- ✅ `build/index.html` exists
- ✅ `build/assets/` contains JS and CSS files
- ✅ `build/background.js` exists

### Test 2: Load Extension in Chrome

**Steps:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build/` folder

**Expected Results:**
- ✅ Extension loads without errors
- ✅ Extension icon appears in toolbar
- ✅ Extension name: "Bookmark AI Assistant"
- ✅ Extension version: "1.0.0"
- ✅ No console errors in background page

**How to Check Background Page:**
1. Go to `chrome://extensions/`
2. Click "Inspect views: background page" (or "service worker")
3. Check console for errors

---

## Functional Testing

### Test 3: Initial UI Display

**Steps:**
1. Click extension icon in toolbar

**Expected Results:**
- ✅ Popup opens (300px × 500px minimum)
- ✅ Profile settings button visible (top-right)
- ✅ API key input form is displayed
- ✅ Instructions section is visible
- ✅ Submit button displays "Submit"

### Test 4: API Key Setup

**Steps:**
1. Click extension icon
2. Enter valid Gemini API key
3. Click "Submit"

**Expected Results:**
- ✅ Form closes
- ✅ URL display appears
- ✅ "Get Recommendations" button appears
- ✅ Profile icon changes to user icon
- ✅ API key is stored (verify: close and reopen popup)

**Verification:**
```javascript
// Check Chrome DevTools Console
chrome.storage.sync.get(['geminiKey'], (result) => {
  console.log('Stored key:', result.geminiKey ? 'Present' : 'Missing');
});
```

### Test 5: Current URL Display

**Steps:**
1. Navigate to `https://github.com`
2. Click extension icon

**Expected Results:**
- ✅ URL displayed correctly
- ✅ URL is truncated with ellipsis if too long
- ✅ Copy icon visible
- ✅ Link icon visible

### Test 6: Copy URL Functionality

**Steps:**
1. Click copy icon next to URL
2. Paste in text editor (Ctrl+V)

**Expected Results:**
- ✅ Copy icon changes to checkmark
- ✅ Checkmark reverts to copy icon after 2 seconds
- ✅ Clipboard contains correct URL

### Test 7: Get AI Recommendations

**Prerequisites:** Have some existing bookmarks in folders

**Steps:**
1. Navigate to `https://developer.mozilla.org/en-US/docs/Web/JavaScript`
2. Click extension icon
3. Click "Get Recommendations"

**Expected Results:**
- ✅ Button shows "Loading..."
- ✅ Loading spinner appears
- ✅ Loading completes in 2-10 seconds
- ✅ Recommendations appear below
- ✅ Minimum 2-5 folder recommendations shown
- ✅ Maximum 2 "Create New Folder" recommendations shown

### Test 8: Hover Behavior

**Steps:**
1. Get recommendations (from Test 7)
2. Hover over each recommendation

**Expected Results:**
- ✅ Text changes from folder path to suggested title
- ✅ Background color changes on hover
- ✅ Cursor changes to pointer

### Test 9: Create Bookmark (Existing Folder)

**Steps:**
1. Get recommendations
2. Click a recommendation under "Recommendations" section
3. Open Chrome Bookmark Manager (`Ctrl+Shift+O`)

**Expected Results:**
- ✅ Bookmark created in specified folder
- ✅ Bookmark title matches suggested title
- ✅ Bookmark URL is correct
- ✅ Button changes to "Bookmark Added ✓"
- ✅ Button becomes green and unclickable

### Test 10: Create Bookmark (New Folder)

**Steps:**
1. Get recommendations
2. Click a recommendation under "Create a New Folder?" section
3. Open Chrome Bookmark Manager

**Expected Results:**
- ✅ New folder created in correct location
- ✅ Bookmark created inside new folder
- ✅ Folder name matches recommendation
- ✅ Bookmark title is correct

### Test 11: Reset API Key

**Steps:**
1. Click profile icon (top-right)
2. Form opens with current API key hidden
3. Button shows "Reset"
4. Click "Reset"

**Expected Results:**
- ✅ Form stays open
- ✅ API key cleared
- ✅ Recommendations cleared
- ✅ Button shows "Submit" again

---

## Edge Case Testing

### Test 12: Empty Bookmark Structure

**Setup:**
1. Create a fresh Chrome profile
2. Load extension

**Expected Results:**
- ✅ Extension loads without errors
- ✅ AI can still provide recommendations
- ✅ Recommendations suggest creating new folders

### Test 13: Very Long URL

**Test URL:**
```
https://example.com/very/long/path/with/many/segments/and/parameters?param1=value1&param2=value2&param3=value3&param4=value4
```

**Expected Results:**
- ✅ URL displays with ellipsis
- ✅ Full URL visible on hover (title attribute)
- ✅ Copy function works correctly
- ✅ Recommendations still generated

### Test 14: Special Characters in URL

**Test URLs:**
```
https://example.com/search?q=react%20hooks
https://example.com/path/with spaces/
https://example.com/café
```

**Expected Results:**
- ✅ URLs display correctly
- ✅ Bookmarks created with correct URLs
- ✅ No encoding issues

### Test 15: Invalid API Key

**Steps:**
1. Enter invalid API key: `invalid-key-12345`
2. Click Submit
3. Try to get recommendations

**Expected Results:**
- ✅ Error message displayed
- ✅ Loading stops
- ✅ User-friendly error message shown

### Test 16: Network Failure

**Steps:**
1. Open DevTools → Network tab
2. Set "Throttling" to "Offline"
3. Try to get recommendations

**Expected Results:**
- ✅ Error handling works
- ✅ Appropriate error message shown
- ✅ Extension doesn't crash

### Test 17: Deeply Nested Folders

**Setup:**
1. Create bookmark structure:
   ```
   Development > Web > Frontend > React > Hooks > Advanced
   ```
2. Navigate to React documentation
3. Get recommendations

**Expected Results:**
- ✅ AI suggests correct nested path
- ✅ Full path displayed in recommendation
- ✅ Bookmark created in correct nested location

### Test 18: Duplicate Bookmarks

**Steps:**
1. Create a bookmark
2. On same page, try to create another bookmark
3. Click recommendations again

**Expected Results:**
- ✅ Extension allows duplicate bookmarks (Chrome default behavior)
- ✅ No errors occur
- ✅ Both bookmarks exist

---

## Performance Testing

### Test 19: Load Time

**Measurement:**
- Popup open time: < 500ms
- API call response: 2-10 seconds (network dependent)
- Bookmark creation: < 1 second

**Steps:**
1. Open DevTools → Performance tab
2. Record performance
3. Click extension icon
4. Stop recording

**Expected Results:**
- ✅ No performance bottlenecks
- ✅ Smooth animations
- ✅ No memory leaks

### Test 20: Large Bookmark Collections

**Setup:**
- Import 500+ bookmarks across 50+ folders

**Expected Results:**
- ✅ Extension loads normally
- ✅ Recommendations generate in reasonable time
- ✅ No browser slowdown

---

## Security Testing

### Test 21: API Key Storage

**Verification:**
```javascript
// In DevTools Console (extension context)
chrome.storage.sync.get(['geminiKey'], (result) => {
  console.log(typeof result.geminiKey); // Should be 'string'
  console.log(result.geminiKey.length > 0); // Should be true
});
```

**Expected Results:**
- ✅ API key stored in `chrome.storage.sync`
- ✅ API key not visible in localStorage
- ✅ API key not visible in sessionStorage
- ✅ API key not exposed in page context

### Test 22: Content Security Policy

**Check console for CSP violations**

**Expected Results:**
- ✅ No CSP errors
- ✅ No inline scripts
- ✅ All resources loaded from allowed sources

### Test 23: Permissions

**Check manifest permissions:**

**Expected Results:**
- ✅ Only necessary permissions requested
- ✅ No excessive permissions
- ✅ Permissions: bookmarks, tabs, activeTab, storage

---

## Troubleshooting Common Issues

### Issue 1: Extension Won't Load

**Symptoms:** Error when loading unpacked extension

**Solutions:**
1. Verify `build/` directory exists
2. Check `manifest.json` is valid JSON
3. Run `npm run build` again
4. Clear Chrome extension cache

### Issue 2: No Recommendations

**Symptoms:** Loading completes but no recommendations appear

**Solutions:**
1. Check browser console for errors (F12)
2. Verify API key is valid
3. Check internet connection
4. Verify Gemini API quota/credits
5. Check bookmark structure exists

### Issue 3: Bookmarks Not Saving

**Symptoms:** Click recommendation but bookmark not created

**Solutions:**
1. Check Chrome bookmarks permissions
2. Open `chrome://bookmarks/` to verify
3. Check DevTools console for errors
4. Verify folder structure exists

### Issue 4: API Key Not Persisting

**Symptoms:** API key required every time

**Solutions:**
1. Check Chrome sync is enabled
2. Clear `chrome.storage.sync` and re-enter key
3. Check browser console for storage errors

### Issue 5: Styling Issues

**Symptoms:** UI looks broken or misaligned

**Solutions:**
1. Hard refresh extension (reload in chrome://extensions)
2. Check CSS files are in `build/assets/`
3. Clear browser cache
4. Rebuild extension

---

## Test Results Template

Use this template to document your testing:

```markdown
## Test Results - [Date]

### Environment
- Chrome Version: 
- OS: 
- Extension Version: 1.0.0

### Test Status
- [ ] Installation Testing (Tests 1-2)
- [ ] Functional Testing (Tests 3-11)
- [ ] Edge Case Testing (Tests 12-18)
- [ ] Performance Testing (Tests 19-20)
- [ ] Security Testing (Tests 21-23)

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce:
   - Expected vs Actual:

### Notes
[Any additional observations]
```

---

## Automated Testing (Optional)

For developers who want to add automated tests:

```bash
# Install testing libraries
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Run tests
npm test
```

---

**Happy Testing! 🎯**

For questions or issues, please open a GitHub issue.
