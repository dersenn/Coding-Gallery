# Setup Instructions

## Next Steps

### 1. Install Dependencies

```bash
cd creative-coding-gallery
npm install
```

### 2. Add Shared Libraries

Download and add these files to `public/libs/`:

**p5.js**
- Download from: https://p5js.org/download/
- Save as: `public/libs/p5.min.js`

**simplex-noise**
- Download from: https://www.npmjs.com/package/simplex-noise
- Or use CDN version and save locally
- Save as: `public/libs/simplex-noise.js`

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the gallery.

### 4. Adding Your Existing Projects

For each project:

1. **Create project folder**
   ```bash
   mkdir public/projects/your-project-name
   ```

2. **Add project files**
   - Copy your project's HTML, JS, CSS files
   - Make sure there's an `index.html` entry point

3. **Update projects.json**
   ```json
   {
     "id": "your-project-name",
     "title": "Your Project Title",
     "description": "Description",
     "date": "2024-03",
     "tags": ["tag1", "tag2"],
     "libraries": ["p5"],  // Libraries it needs
     "entryFile": "/projects/your-project-name/index.html",
     "controls": [...]  // Optional controls
   }
   ```

4. **Add control listeners** (if using controls)
   Add this to your project's JavaScript:
   ```javascript
   window.addEventListener('message', (event) => {
     if (event.data.type === 'control-update') {
       // Update your sketch with event.data.values
     }
   })
   ```

### 5. Control Panel Integration

Controls are defined in `projects.json` and automatically rendered.

**Example control definitions:**

```json
"controls": [
  {
    "type": "slider",
    "label": "Speed",
    "key": "speed",
    "default": 1.0,
    "min": 0.1,
    "max": 5.0,
    "step": 0.1
  },
  {
    "type": "toggle",
    "label": "Show Grid",
    "key": "showGrid",
    "default": true
  },
  {
    "type": "select",
    "label": "Color Scheme",
    "key": "colorScheme",
    "default": "vibrant",
    "options": [
      { "label": "Vibrant", "value": "vibrant" },
      { "label": "Pastel", "value": "pastel" },
      { "label": "Monochrome", "value": "monochrome" }
    ]
  },
  {
    "type": "color",
    "label": "Background",
    "key": "bgColor",
    "default": "#000000"
  }
]
```

### 6. Project Structure Best Practices

**For p5.js projects:**
```javascript
// In your sketch.js
let controls = {
  particleCount: 1000,
  speed: 1.0
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'control-update') {
    controls = { ...controls, ...event.data.values }
  }
})

function setup() {
  // Use controls.particleCount, etc.
}
```

**For vanilla JS projects:**
```javascript
class MySketch {
  constructor() {
    this.params = {
      speed: 1.0,
      color: '#ff0000'
    }
    this.setupControls()
  }
  
  setupControls() {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'control-update') {
        this.params = { ...this.params, ...event.data.values }
        this.onControlChange()
      }
    })
  }
  
  onControlChange() {
    // React to changes
  }
}
```

## Features

- ✅ Project gallery with cards
- ✅ Individual project pages
- ✅ Iframe isolation for projects
- ✅ Dynamic control panels
- ✅ Shared library loading
- ✅ TypeScript support
- ✅ NuxtUI components
- ✅ Composables for state management

## File Organization

```
your-project/
├── index.html          # Entry point (required)
├── sketch.js           # Main code
├── utils.js            # Helper functions
├── variations/         # Different versions
│   ├── v1.html
│   └── v2.html
└── assets/            # Images, data files
    └── texture.png
```

You can reference variations in the main project metadata if desired.

## Troubleshooting

**Controls not working?**
- Check browser console for errors
- Verify the message listener is set up
- Make sure control keys match between JSON and code

**Library not loading?**
- Check the file exists in `public/libs/`
- Check the path in `useProjectLoader.ts`
- Open browser Network tab to debug

**Project not displaying?**
- Check the `entryFile` path in projects.json
- Ensure index.html exists at that location
- Check browser console for errors

## Development Tips

- Use browser DevTools to inspect iframe content
- Console.log control values to debug
- Test controls work by toggling them manually
- Keep projects self-contained with relative paths
