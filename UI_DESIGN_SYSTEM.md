# BlackBox Avatar - UI Design System

**Based on:** BlackBox Animator v2 (labs/retargeting.html)
**Product Color:** Purple (`#9900ff`) with glow
**Approach:** Self-contained, inline styles, dark theme

---

## Design Philosophy

**"Professional, Dark, Minimal"**

- Dark theme optimized for long sessions
- High contrast for readability
- Subtle neon accents for product identity
- Grid-based layouts for professional tools
- Smooth transitions and micro-interactions

---

## Color Palette

### Base Colors

```css
/* Backgrounds */
--bg-darkest: #1a1a1a;      /* Main background (body) */
--bg-dark: #2a2a2a;         /* Panels, header */
--bg-medium: #3a3a3a;       /* Buttons, inputs */
--bg-light: #4a4a4a;        /* Hover states */
--bg-divider: #333;         /* Grid gaps */

/* Borders */
--border-default: #444;     /* Standard borders */
--border-medium: #555;      /* Button borders */
--border-hover: #666;       /* Hover borders */

/* Text */
--text-primary: #e0e0e0;    /* Main text (high contrast) */
--text-secondary: #aaaaaa;  /* Labels, secondary info */
--text-disabled: #666666;   /* Disabled state */
```

### Product Accent (Avatar = Purple)

```css
/* Avatar Product Color */
--accent-avatar: #9900ff;         /* Purple */
--accent-avatar-hover: #aa11ff;   /* Lighter purple */
--accent-avatar-glow: rgba(153, 0, 255, 0.5);  /* Glow effect */

/* Other BlackBox Products (for reference) */
--accent-animator: #ff00ff;       /* Magenta */
--accent-skinner: #00ffff;        /* Cyan */
--accent-terraformer: #ff8800;    /* Orange */
--accent-worlds: #00ff00;         /* Green */
```

### Functional Colors

```css
/* Action colors */
--primary-action: #0066cc;        /* Primary buttons */
--primary-action-hover: #0055aa;  /* Primary button hover */

/* Status colors */
--success: #00cc66;
--warning: #ffaa00;
--error: #ff3333;
--info: #0099ff;
```

---

## Typography

### Fonts

```html
<!-- Include in <head> -->
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap" rel="stylesheet">
```

### Header (Product Branding)

```css
.header h1 {
  font-family: "Montserrat", sans-serif;
  font-weight: 900;
  font-size: 20px;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: #e0e0e0;
}

/* Product name accent */
.header h1 .product-name {
  color: #9900ff;  /* Avatar purple */
  text-shadow: 0 0 8px rgba(153, 0, 255, 0.5);
}
```

**HTML Example:**
```html
<h1>BLACK BOX <span class="product-name">Avatar</span></h1>
```

### Body Text

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #e0e0e0;
}

/* Labels */
.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #aaaaaa;
}

/* Section headers */
.section-header {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #e0e0e0;
  margin-bottom: 10px;
}
```

---

## Button Styles

### Default Button

```css
button {
  padding: 6px 16px;
  background: #3a3a3a;
  color: #e0e0e0;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

button:hover {
  background: #4a4a4a;
  border-color: #666;
}

button:active {
  transform: translateY(1px);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Primary Button (Main Actions)

```css
button.primary {
  background: #0066cc;
  border-color: #0066cc;
}

button.primary:hover {
  background: #0055aa;
}
```

### Accent Button (Product-Specific)

```css
button.accent {
  background: #9900ff;  /* Avatar purple */
  border-color: #9900ff;
}

button.accent:hover {
  background: #aa11ff;
  box-shadow: 0 0 12px rgba(153, 0, 255, 0.4);
}
```

### Icon Button (Compact)

```css
button.icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Form Controls

### Sliders (Range Inputs)

```css
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: #3a3a3a;
  border-radius: 2px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #9900ff;  /* Avatar purple */
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(153, 0, 255, 0.5);
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #aa11ff;
  box-shadow: 0 0 12px rgba(153, 0, 255, 0.7);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #9900ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
```

### Text Inputs

```css
input[type="text"],
input[type="number"],
textarea {
  background: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

input:focus,
textarea:focus {
  border-color: #9900ff;  /* Avatar purple */
  box-shadow: 0 0 4px rgba(153, 0, 255, 0.3);
}
```

### Select Dropdowns

```css
select {
  background: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

select:hover {
  border-color: #555;
}

select:focus {
  border-color: #9900ff;
  outline: none;
}
```

---

## Layout Patterns

### Grid-Based Layout

```css
.container {
  display: grid;
  grid-template-columns: 400px 1fr 300px;  /* Left panel, viewport, right panel */
  grid-template-rows: 50px 1fr 200px;      /* Header, main, timeline */
  height: 100vh;
  gap: 1px;
  background: #333;  /* Gap color */
}
```

### Header

```css
.header {
  grid-column: 1 / -1;  /* Span all columns */
  background: #2a2a2a;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  border-bottom: 1px solid #444;
}
```

### Panels (Left/Right)

```css
.panel {
  background: #1a1a1a;
  overflow-y: auto;
  padding: 20px;
}

/* Custom scrollbar */
.panel::-webkit-scrollbar {
  width: 8px;
}

.panel::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.panel::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.panel::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

### Viewport (3D Canvas)

```css
.viewport {
  position: relative;
  overflow: hidden;
  background: #1a1a1a;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
```

---

## Component Patterns

### Section Group

```css
.section {
  margin-bottom: 30px;
}

.section-header {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #e0e0e0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
}
```

**HTML:**
```html
<div class="section">
  <div class="section-header">Body Morphs</div>
  <!-- Content -->
</div>
```

### Control Group (Label + Input)

```css
.control-group {
  margin-bottom: 15px;
}

.control-label {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #aaaaaa;
  margin-bottom: 6px;
}

.control-input {
  width: 100%;
}

.control-value {
  display: inline-block;
  min-width: 50px;
  text-align: right;
  font-size: 13px;
  color: #9900ff;  /* Avatar purple */
}
```

**HTML:**
```html
<div class="control-group">
  <label class="control-label">
    Age
    <span class="control-value">0.50</span>
  </label>
  <input type="range" class="control-input" min="0" max="1" step="0.01" value="0.5">
</div>
```

### Button Group

```css
.button-group {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.button-group button {
  flex: 1;
}
```

**HTML:**
```html
<div class="button-group">
  <button>Reset</button>
  <button class="primary">Apply</button>
  <button class="accent">Export GLB</button>
</div>
```

---

## Micro-Interactions

### Hover Effects

```css
/* Smooth transitions */
* {
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

/* Scale on hover for clickable elements */
.clickable {
  cursor: pointer;
  transition: transform 0.1s;
}

.clickable:hover {
  transform: scale(1.02);
}
```

### Loading States

```css
.loading {
  opacity: 0.6;
  cursor: wait;
  pointer-events: none;
}

.loading::after {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-left: 8px;
  border: 2px solid #9900ff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Error States

```css
.error {
  border-color: #ff3333 !important;
  box-shadow: 0 0 4px rgba(255, 51, 51, 0.5);
}

.error-message {
  color: #ff3333;
  font-size: 12px;
  margin-top: 4px;
}
```

---

## Responsive Considerations

### Minimum Viewport Size

```css
@media (max-width: 1200px) {
  .container {
    grid-template-columns: 300px 1fr 250px;  /* Narrower panels */
  }
}

@media (max-width: 900px) {
  .container {
    grid-template-columns: 1fr;  /* Stack vertically */
    grid-template-rows: auto;
  }

  .panel {
    max-height: 300px;
  }
}
```

---

## Avatar-Specific Patterns

### Skin Tone Swatch Picker

```css
.swatch-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.swatch {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid #444;
  cursor: pointer;
  transition: all 0.2s;
}

.swatch:hover {
  transform: scale(1.1);
  border-color: #666;
}

.swatch.selected {
  border-color: #9900ff;
  border-width: 3px;
  box-shadow: 0 0 12px rgba(153, 0, 255, 0.5);
}

/* Skin tone colors */
.swatch.light { background: #f5d5c4; }
.swatch.fair { background: #e8ba9d; }
.swatch.medium { background: #c89872; }
.swatch.tan { background: #a67453; }
.swatch.dark { background: #6e4530; }
.swatch.very-dark { background: #3d2619; }
```

### Preset Buttons

```css
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 15px 0;
}

.preset-button {
  padding: 10px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.preset-button:hover {
  background: #3a3a3a;
  border-color: #9900ff;
}

.preset-button .preset-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 4px;
}

.preset-button .preset-desc {
  font-size: 11px;
  color: #aaaaaa;
}
```

---

## Code Template

**Use this as a starting template for Avatar UI:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Black Box Avatar</title>

  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap" rel="stylesheet">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      overflow: hidden;
    }

    .container {
      display: grid;
      grid-template-columns: 400px 1fr 300px;
      grid-template-rows: 50px 1fr;
      height: 100vh;
      gap: 1px;
      background: #333;
    }

    /* Header */
    .header {
      grid-column: 1 / -1;
      background: #2a2a2a;
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 20px;
      border-bottom: 1px solid #444;
    }

    .header h1 {
      font-family: "Montserrat", sans-serif;
      font-weight: 900;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }

    .header h1 .product-name {
      color: #9900ff;  /* Avatar purple */
      text-shadow: 0 0 8px rgba(153, 0, 255, 0.5);
    }

    /* Rest of styles... */
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>BLACK BOX <span class="product-name">Avatar</span></h1>
      <!-- Buttons -->
    </header>

    <aside class="left-panel">
      <!-- Body morphs, presets -->
    </aside>

    <main class="viewport">
      <canvas id="canvas"></canvas>
    </main>

    <aside class="right-panel">
      <!-- Materials, export -->
    </aside>
  </div>

  <script type="module">
    // Three.js initialization
    import * as THREE from 'https://cdn.skypack.dev/three@0.159.0';

    // Your code here
  </script>
</body>
</html>
```

---

## Accessibility Notes

- **Keyboard Navigation:** All controls must be keyboard accessible (Tab, Enter, Arrow keys)
- **Color Contrast:** Text meets WCAG AA (4.5:1 ratio on dark backgrounds)
- **Focus Indicators:** Visible focus rings on all interactive elements
- **Screen Readers:** Use semantic HTML and ARIA labels where appropriate

---

**This design system ensures Avatar looks professional and consistent with the BlackBox family while having its own purple identity.** 🎨
