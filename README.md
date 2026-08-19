# Pharis - 3D Animated Splash Screen

## What's Included

- **index.html** - Main page with splash screen & welcome screen
- **style.css** - All animations and styling
- **script.js** - JavaScript for geolocation and splash logic

## Features

### 🎨 3D Capsule Animation
- SVG capsule with exact colors: white top, red bottom, green pin, white cross
- 3D spin animation with floating effect
- Glow pulse behind the capsule
- Glossy shine reflections

### ✨ Scattered Text Animation
- Letters "P h a r i s" scatter from random positions
- Each letter has unique random scatter on every load
- Smooth assembly with blur-to-sharp effect

### 🚀 Fast Auto-Transition
- Splash screen auto-hides after ~3.8 seconds
- Smooth exit animation with brightness flash
- Welcome screen fades in seamlessly

### 📍 Fast Geolocation
- Dual-attempt strategy: high accuracy first, then low accuracy fallback
- 4-second timeout for snappy UX
- Accepts cached positions (up to 1 min old)
- Visual loading indicator

## How to Use

1. Extract the ZIP file
2. Open `index.html` in any modern browser
3. The splash animation plays automatically
4. Click "Detect My Location" on the welcome screen

## Integration into Your Project

Replace your existing splash screen HTML with the content from `index.html`, and include the CSS/JS files. The splash screen will overlay your app and auto-dismiss.

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Colors Used

| Element | Color |
|---------|-------|
| Capsule top (white) | #ffffff |
| Capsule bottom (red) | #dc2626 → #ef4444 → #b91c1c |
| Location pin (green) | #22c55e |
| Cross (white) | #ffffff |
| Background | #0f0f23 → #1a1a2e → #16213e |
| Accent text | #ffffff |
| Subtitle | rgba(255,255,255,0.6) |
