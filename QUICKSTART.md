# 🚀 Quick Start Guide - Bookmark AI Assistant

## ⚡ Fast Setup (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build the Extension
```bash
npm run build
```

### Step 3: Load in Chrome
1. Open Chrome and go to: `chrome://extensions/`
2. Toggle **"Developer mode"** ON (top-right)
3. Click **"Load unpacked"**
4. Select the `build/` folder
5. Done! 🎉

---

## 🔑 Get Your API Key (First Time Only)

### Quick Steps:
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google
3. Click **"Get API Key"** → **"Create API Key"**
4. Copy your API key
5. Open the extension and enter the key

### Need More Help?
- See [full API key setup instructions](README.md#-get-your-gemini-api-key)

---

## 🎯 Test It Now!

### Quick Test (30 Seconds):
1. **Open any website** (e.g., github.com)
2. **Click the extension icon** in toolbar
3. **Enter your API key** (first time only)
4. **Click "Get Recommendations"**
5. **Click any recommendation** to save bookmark
6. **Check Chrome bookmarks** (`Ctrl+Shift+O`)

✅ **Success!** Your bookmark is saved in the recommended folder.

---

## 🎨 What You'll See

### First Launch:
```
┌─────────────────────────┐
│   [User Icon]           │
│                         │
│  Enter Gemini API Key   │
│  [________________]     │
│      [Submit]           │
│                         │
│  Instructions:          │
│  1. Go to Google Cloud  │
│  2. Create project...   │
└─────────────────────────┘
```

### After API Key Setup:
```
┌─────────────────────────┐
│   [👤]                  │
│                         │
│  🔗 https://github.com  │
│       [📋 Copy]         │
│                         │
│  [Get Recommendations]  │
│                         │
│  Recommendations:       │
│  • Development > Git    │
│  • Coding > Tools       │
│                         │
│  Create New Folder?     │
│  • Resources > GitHub   │
└─────────────────────────┘
```

---

## 🐛 Something Wrong?

### Extension Won't Load?
```bash
# Rebuild and try again
npm run build
```

### No Recommendations?
- ✅ Check your API key is valid
- ✅ Make sure you have some bookmarks already
- ✅ Check internet connection

### API Key Not Saving?
- ✅ Enable Chrome Sync in settings
- ✅ Try entering key again

---

## 📚 Next Steps

1. ✅ **Read the full [README.md](README.md)** for detailed info
2. ✅ **Check [TESTING.md](TESTING.md)** for comprehensive testing
3. ✅ **Review [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)** for technical details

---

## 💡 Tips & Tricks

### Organize Better:
- Create folder categories before using AI
- AI learns from your existing structure
- More folders = better recommendations

### Speed Up:
- Keep bookmarks well-organized
- Use descriptive folder names
- AI will match better

### Pro Tips:
- Hover over recommendations to see suggested titles
- Reset API key from profile icon
- Extension remembers your key across sessions

---

## 🔥 Common Use Cases

### For Developers:
```
Input: https://stackoverflow.com/questions/react-hooks
AI → Development > React > Hooks
```

### For Researchers:
```
Input: https://arxiv.org/paper/12345
AI → Research > Papers > AI/ML
```

### For Shopping:
```
Input: https://amazon.com/product-page
AI → Shopping > Wishlist
```

---

## ⚙️ Development Mode

### Watch Mode (for development):
```bash
npm run dev
```

### Rebuild After Changes:
```bash
npm run build
# Then reload extension in chrome://extensions/
```

### Check for Issues:
```bash
npm run lint
```

---

## 📞 Need Help?

1. **Check Console**: Right-click extension icon → Inspect popup
2. **View Errors**: F12 in popup window
3. **Background Logs**: chrome://extensions/ → Inspect views
4. **Read Docs**: See README.md and TESTING.md

---

## 🎯 Success Checklist

- [ ] Extension installed and visible in toolbar
- [ ] API key entered and saved
- [ ] Current URL displays when clicked
- [ ] Recommendations generate successfully
- [ ] Bookmark created in correct folder
- [ ] Title and URL are accurate

**All checked?** You're ready to organize bookmarks like a pro! 🎉

---

## 📊 Project Structure (Quick Reference)

```
bookmark-app/
├── src/
│   ├── components/      # UI components
│   ├── utils/          # Helper functions
│   ├── App.jsx         # Main app
│   └── App.css         # Styles
├── public/
│   ├── manifest.json   # Extension config
│   └── background.js   # Background script
├── build/              # Built extension (load this!)
└── README.md           # Full documentation
```

---

**Happy Bookmarking! 🚀**

Time to test: **2 minutes** ⏱️
