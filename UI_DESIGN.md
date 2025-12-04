# UI Design System

## Overview
This bookmark extension features a modern, professional UI built with **Tailwind CSS** and follows a cohesive design system.

## Design Principles

### Color Palette
- **Primary**: Blue/Indigo gradient (`from-blue-500 to-indigo-600`)
- **Success**: Emerald/Green tones
- **Warning**: Amber/Orange tones
- **Background**: Slate 50-100 gradient
- **Text**: Slate 900 (primary), Slate 600 (secondary)

### Typography
- **Font**: System font stack (SF Pro, Segoe UI, Roboto)
- **Sizes**: Base text with clear hierarchy
- **Weight**: Semibold for headers, medium for emphasis

### Components

#### Cards
- White background with subtle border (`border-slate-200`)
- Rounded corners (`rounded-2xl`)
- Soft shadows (`shadow-sm`, `shadow-xl`)
- Hover effects with smooth transitions

#### Buttons
- Gradient backgrounds for primary actions
- Subtle hover states with transform effects
- Clear visual feedback
- Disabled states with reduced opacity

#### Icons
- Emoji icons for personality and accessibility
- Gradient icon containers for visual interest
- Consistent sizing and spacing

### Layout
- Maximum width: 600px (optimized for extension popup)
- Generous spacing with Tailwind's spacing scale
- Responsive padding and margins
- Smooth animations for state changes

### Interactions
- Hover effects on all interactive elements
- Smooth transitions (200ms duration)
- Clear visual feedback for actions
- Loading states with animated spinner

## Component Structure

```
src/
├── App.jsx                          # Main application component
├── components/
│   ├── BookmarkRecommendations.jsx  # AI recommendation cards
│   ├── ProfileSettings.jsx          # API key configuration
│   ├── URLDisplay.jsx              # Current page display
│   └── LoadingSpinner.jsx          # Loading indicator
└── index.css                        # Global styles + Tailwind
```

## Building & Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

## Features
- ✨ Modern gradient backgrounds
- 🎯 Clear visual hierarchy
- 🔄 Smooth animations and transitions
- 📱 Responsive design
- ♿ Accessible components
- 🎨 Cohesive color system
