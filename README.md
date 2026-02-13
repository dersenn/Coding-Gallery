# Creative Coding Gallery

A Nuxt 4 application for showcasing creative coding projects with shared libraries and control panels.

## Project Structure

```
creative-coding-gallery/
├── composables/
│   ├── useProjectLoader.ts    # Manages project loading and library injection
│   └── useControls.ts          # Manages control panel state
├── components/
│   ├── ProjectList.vue         # Gallery view with project cards
│   ├── ProjectViewer.vue       # Iframe container for running projects
│   └── ControlPanel.vue        # Dynamic control panel renderer
├── pages/
│   ├── index.vue               # Gallery homepage
│   └── project/[id].vue        # Individual project view
├── data/
│   └── projects.json           # Project metadata
├── types/
│   └── project.ts              # TypeScript type definitions
├── public/
│   ├── libs/                   # Shared libraries (p5.js, simplex-noise, etc.)
│   └── projects/               # Individual project files
│       └── [project-id]/
│           └── index.html
└── nuxt.config.ts
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add shared libraries to `public/libs/`:
   - p5.min.js
   - simplex-noise.js
   - any other shared libraries

3. Run development server:
```bash
npm run dev
```

## Adding a New Project

### 1. Add Project Files

Create a folder in `public/projects/[project-id]/` with at least an `index.html` file.

### 2. Update projects.json

Add an entry to `data/projects.json`:

```json
{
  "id": "my-project",
  "title": "My Project Title",
  "description": "Project description",
  "date": "2024-03",
  "tags": ["p5js", "generative"],
  "libraries": ["p5"],
  "entryFile": "/projects/my-project/index.html",
  "controls": [
    {
      "type": "slider",
      "label": "Speed",
      "key": "speed",
      "default": 1,
      "min": 0.1,
      "max": 5,
      "step": 0.1
    }
  ]
}
```

### 3. Listen to Controls in Your Project

In your project's `index.html`, add this JavaScript to receive control updates:

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'control-update') {
    const values = event.data.values
    // Update your sketch with new values
    // e.g., speed = values.speed
  }
})
```

## Control Types

- **slider**: Numeric range input
  - Required: `min`, `max`, `step`, `default`
  
- **toggle**: Boolean on/off switch
  - Required: `default` (true/false)
  
- **select**: Dropdown selection
  - Required: `options` array with `label` and `value`
  
- **color**: Color picker
  - Required: `default` (hex color string)

## Shared Libraries

Libraries defined in the project metadata are automatically loaded before the project runs.

Register library paths in `composables/useProjectLoader.ts`:

```typescript
const libraryPaths: Record<string, string> = {
  'p5': '/libs/p5.min.js',
  'simplex-noise': '/libs/simplex-noise.js',
  'your-library': '/libs/your-library.js'
}
```

Then reference the library name in your project's `libraries` array.

## Technology Stack

- **Nuxt 4**: Vue framework
- **NuxtUI**: Component library
- **TypeScript**: Type safety
- **Iframe isolation**: Projects run in isolated contexts

## License

MIT
