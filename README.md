# 🔖 Bookmark AI Assistant

An intelligent Chrome extension that uses AI to help you organize and save bookmarks based on your existing folder structure. Powered by Google's Gemini AI, it analyzes URLs and recommends the best folder locations for your bookmarks.

## ✨ Features

- 🤖 **AI-Powered Recommendations**: Uses Google Gemini AI to intelligently suggest bookmark folders
- 📁 **Folder Structure Analysis**: Analyzes your existing bookmark folders and subfolders
- 🎯 **Smart Title Generation**: Automatically generates descriptive titles for bookmarks
- 🆕 **New Folder Suggestions**: Recommends creating new folders when appropriate
- 🔒 **Secure API Key Storage**: Stores your Gemini API key securely in Chrome storage
- 🎨 **Clean UI**: Modern, intuitive interface with smooth animations

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher) installed
- **npm** or **yarn** package manager
- **Google Chrome** browser
- **Google Gemini API Key** (see setup instructions below)

## 🚀 Installation & Setup

### 1. Clone or Download the Repository

```bash
git clone <repository-url>
cd bookmark-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get Your Gemini API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/products)
2. Sign in with your Google account
3. Click **"Select a Project"** → **"New Project"**
4. Create a new project (e.g., "Bookmark AI")
5. Visit [Google AI Studio](https://aistudio.google.com/)
6. Click **"Get API Key"**
7. Click **"Create API Key"**
8. Select your newly created project
9. Copy the API key and **store it securely**

### 4. Build the Extension

```bash
npm run build
```

This will create a `build/` directory with the compiled extension files.

### 5. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `build/` folder from your project directory
5. The extension icon should appear in your Chrome toolbar

## 🧪 Testing the Extension

### First-Time Setup

1. **Click the extension icon** in your Chrome toolbar
2. You'll see the API key setup screen
3. **Enter your Gemini API key** in the password field
4. Click **"Submit"**

### Testing Bookmark Recommendations

1. **Navigate to any website** you want to bookmark (e.g., `https://github.com`)
2. **Click the extension icon**
3. The current URL will be displayed at the top
4. Click **"Get Recommendations"**
5. Wait for AI to analyze your bookmark structure (takes 2-5 seconds)
6. Review the recommended folders:
   - **Existing folders**: Direct recommendations based on your current structure
   - **New folders**: Suggestions for creating new categorizations
7. **Hover over recommendations** to see the suggested bookmark title
8. **Click any recommendation** to save the bookmark
9. Verify the bookmark was created in Chrome's bookmark manager

### Testing Different Scenarios

#### Test Case 1: Technical URL
```
URL: https://stackoverflow.com/questions/react-hooks
Expected: Recommendations under Development/React or similar folders
```

#### Test Case 2: News Article
```
URL: https://www.bbc.com/news/technology
Expected: Recommendations under News/Technology or similar folders
```

#### Test Case 3: Shopping Site
```
URL: https://www.amazon.com/product
Expected: Recommendations under Shopping/Online Stores or similar folders
```

#### Test Case 4: New Category
```
URL: https://www.cooking-recipes.com
Expected: If no cooking folder exists, AI suggests creating one
```

### Verifying Bookmarks

1. Open Chrome's Bookmark Manager: `chrome://bookmarks/`
2. Search for the recently added bookmark
3. Verify it's in the correct folder hierarchy
4. Check that the title is descriptive and accurate

### Testing Edge Cases

- **Empty Bookmark Structure**: Test with a fresh Chrome profile
- **Deeply Nested Folders**: Test with 3-4 level deep folder structures
- **Special Characters**: Test URLs with special characters
- **Long URLs**: Test with very long URL strings
- **API Key Reset**: Click the profile icon and reset your API key

## 🛠️ Development

### Project Structure

```
bookmark-app/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── background.js          # Background service worker
├── src/
│   ├── components/            # React components
│   │   ├── ProfileSettings.jsx
│   │   ├── URLDisplay.jsx
│   │   ├── BookmarkRecommendations.jsx
│   │   └── LoadingSpinner.jsx
│   ├── utils/                 # Utility functions
│   │   ├── aiUtils.js         # AI/Gemini integration
│   │   ├── bookmarkUtils.js   # Bookmark operations
│   │   └── chromeUtils.js     # Chrome API helpers
│   ├── App.jsx                # Main application component
│   ├── App.css                # Styles
│   └── main.jsx               # Entry point
├── index.html                 # HTML template
├── vite.config.js            # Vite configuration
└── package.json              # Dependencies
```

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

### Making Changes

1. Edit source files in `src/`
2. Run `npm run build` to rebuild
3. Go to `chrome://extensions/`
4. Click the **reload icon** on your extension
5. Test your changes

## 🐛 Troubleshooting

### Extension Not Loading
- Ensure `build/` directory exists
- Check that `manifest.json` is in the `build/` folder
- Verify Developer Mode is enabled

### API Key Issues
- Verify your API key is valid and active
- Check you have credits/quota in Google AI Studio
- Ensure network connectivity for API calls

### No Recommendations Appearing
- Check browser console (F12) for errors
- Verify your bookmark structure isn't empty
- Ensure the Gemini API is responding

### Bookmarks Not Saving
- Check Chrome bookmarks permissions
- Verify the extension has proper permissions in manifest
- Check browser console for permission errors

## 🔧 Configuration

### Modifying AI Behavior

Edit `src/utils/aiUtils.js` to customize:

```javascript
const generationConfig = {
  temperature: 1,        // Creativity (0-2)
  topP: 0.95,           // Diversity
  topK: 40,             // Token selection
  maxOutputTokens: 8192 // Response length
};
```

### Styling

Edit `src/App.css` CSS variables:

```css
:root {
  --primary-color: #F27159;
  --secondary-color: #e2ff0b;
  --border-radius: 18px;
  /* ... more variables */
}
```

## 📦 Building for Distribution

### Create Production Build

```bash
npm run build
```

### Package as ZIP

```bash
# Windows PowerShell
Compress-Archive -Path build\* -DestinationPath bookmark-ai-extension.zip

# Mac/Linux
cd build && zip -r ../bookmark-ai-extension.zip * && cd ..
```

### Publish to Chrome Web Store

1. Create a developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 registration fee
3. Upload the ZIP file
4. Fill in extension details
5. Submit for review

## 🔐 Security & Privacy

- **API Key Storage**: Stored securely in Chrome's `chrome.storage.sync`
- **Data Processing**: Only bookmark metadata and URLs are sent to Gemini API
- **No Tracking**: Extension doesn't collect or transmit user data
- **Local Operation**: All bookmark operations happen locally in browser

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Powered by [Google Gemini AI](https://ai.google.dev/)
- Icons from [Remix Icon](https://remixicon.com/)

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting section above

---

**Happy Bookmarking! 🎉**
