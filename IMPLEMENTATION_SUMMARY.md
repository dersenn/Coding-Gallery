# Implementation Summary: Iframe Removal

## Overview

Successfully migrated from iframe-based architecture to a direct JS module loading system. The gallery now supports portable JavaScript/TypeScript projects with Vue used only for presentation layer.

## What Was Changed

### 1. Core Architecture

**Before:**
- Projects were standalone HTML files loaded in iframes
- Communication via `postMessage` API
- Isolation through browser security boundaries

**After:**
- Projects are TypeScript modules with `init()` function
- Direct prop passing and reactive updates
- Isolation through p5.js instance mode
- Full Vue integration for controls and layout

### 2. Files Created

#### Global Utilities
- `utils/gallery.ts` - Shared noise, seed, and math utilities
- `composables/useGalleryUtils.ts` - Vue composable for utilities

#### Type System
- Updated `types/project.ts` with:
  - `ProjectModule` interface
  - `ProjectContext` interface
  - `CleanupFunction` type

#### Example Project
- `projects/noise-field/index.ts` - Working p5.js flow field example

#### Project Template
- `projects/_template/index.ts` - Minimal starter template
- `projects/_template/README.md` - Comprehensive guide
- `projects/_template/example-project.json` - Metadata example

#### Documentation
- `README.md` - Full project documentation

### 3. Files Modified

#### Components
- `components/ProjectViewer.vue` - Replaced iframe with dynamic module loader
- `components/ControlPanel.vue` - Updated styling for overlay display

#### Composables
- `composables/useControls.ts` - Removed postMessage, simplified to reactive state
- `composables/useProjectLoader.ts` - Removed CDN script loading (now uses npm packages)

#### Pages
- `pages/project/[id].vue` - Complete redesign as full-screen with overlays
  - Overlay navigation (top-left)
  - Overlay info card (top-right, collapsible)
  - Overlay controls (bottom-right, collapsible)
  - Smooth transitions

#### Data
- `data/projects.json` - Updated noise-field entry to point to `.ts` file

### 4. Files Removed
- `public/projects/` - Removed all old HTML project files

### 5. Dependencies Added
- `p5` - p5.js as npm package
- `@types/p5` - TypeScript definitions
- `simplex-noise` - Noise generation library

## Key Features Implemented

### Global Utilities System

All projects have access to:

**Noise Functions:**
- `utils.noise.simplex2D/3D/4D()` - Simplex noise
- `utils.noise.perlin2D/3D()` - Perlin noise (smoothed)

**Seeded Random:**
- `utils.seed.set()` - Set seed for reproducibility
- `utils.seed.random()` - Random 0-1
- `utils.seed.randomRange()` - Random in range
- `utils.seed.randomInt()` - Random integer

**Math Helpers:**
- `utils.math.map()` - Map values between ranges
- `utils.math.lerp()` - Linear interpolation
- `utils.math.constrain()` - Clamp values
- `utils.math.norm()` - Normalize to 0-1
- `utils.math.dist()` - 2D/3D distance

### Project Module Interface

Every project exports:
```typescript
export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction>
```

Context provides:
- `controls` - Current control values
- `utils` - Global utilities
- `onControlChange()` - Register update callback

### Full-Screen Overlay UI

- Background: Sketch fills entire viewport
- Navigation: Top-left back button
- Info: Top-right collapsible card with project details
- Controls: Bottom-right collapsible panel
- All overlays have glassmorphism styling (backdrop-blur + transparency)

### Reactive Controls

- Controls update in real-time
- Projects receive callbacks for changes
- No page reload needed
- Smooth transitions

## Benefits Achieved

1. **No postMessage complexity** - Direct function calls
2. **Better debugging** - Single JavaScript context
3. **Type safety** - Full TypeScript support
4. **Shared utilities** - Consistent noise/random across projects
5. **Better performance** - No iframe overhead
6. **Full-screen capable** - Native overlay support
7. **Hot module reload** - Works during development
8. **Portable projects** - Easy to extract and run standalone

## Project Creation Workflow

1. Copy `projects/_template/` folder
2. Implement `init()` function in `index.ts`
3. Add metadata to `data/projects.json`
4. Run dev server and test
5. Project automatically appears in gallery

## Export Capability

Projects can be exported standalone by:
1. Copying project folder
2. Creating simple HTML wrapper
3. Mocking gallery context
4. Including p5.js from CDN

See template README for detailed instructions.

## Technical Decisions

### p5.js Instance Mode
- Prevents global namespace pollution
- Allows multiple sketches to coexist
- Enables proper cleanup on unmount

### Dynamic Imports
- Vite handles module loading
- No manual script tag management
- Tree-shaking in production builds

### Vue State Management
- `useState` for global control values (serializable data only)
- `useGalleryUtils` uses module-level singleton (functions can't be serialized for SSR)
- Reactive updates propagate automatically
- No external state library needed

### TypeScript Throughout
- Type-safe project modules
- IDE autocomplete for utilities
- Compile-time error checking

## Testing Checklist

- [x] Dev server starts without errors
- [x] Type checking passes (0 errors)
- [x] Noise field example loads
- [x] Controls update reactively
- [x] Full-screen layout works
- [x] Overlay transitions smooth
- [x] Project cleanup on unmount
- [x] Window resize handling

## Known Issues

- EMFILE error on macOS (file watch limit) - Not related to our changes, system configuration issue
- Dev server uses port 3002 instead of 3000 - Auto-selected due to port conflict

## Bug Fixes Applied

1. **SSR Serialization Error** - Changed `useGalleryUtils` from `useState` to module-level singleton to prevent "Cannot stringify a function" error during server-side rendering
2. **Path Resolution** - Updated project entry files from `~/projects/...` to `/projects/...` to match Vite's glob import resolution
3. **Overlay Defaults** - Set info and controls overlays to collapsed by default for cleaner initial view

## Next Steps for User

1. **Test the noise field example** - Visit http://localhost:3002/project/noise-field
2. **Create a new project** - Use the template in `projects/_template/`
3. **Add your custom SVG library** - Place in `utils/` and import as needed
4. **Customize global utilities** - Add more math/helper functions as needed
5. **Style adjustments** - Tweak overlay positions/colors to your preference

## Files to Reference

- `projects/_template/README.md` - Detailed project creation guide
- `projects/noise-field/index.ts` - Working example
- `README.md` - Full documentation
- `types/project.ts` - TypeScript interfaces

## Migration Complete

All todos have been completed:
1. ✅ Global utilities system created
2. ✅ Types updated for JS modules
3. ✅ ProjectViewer replaced with module loader
4. ✅ Controls refactored for direct prop passing
5. ✅ Library loading set up (npm packages)
6. ✅ Full-screen layout implemented
7. ✅ Example project created (noise-field)
8. ✅ Project template created

The architecture is now ready for production use. You can start adding your real projects!
