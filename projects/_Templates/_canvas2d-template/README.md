# Canvas2D Template

Minimal template for lightweight 2D canvas sketches using `utils/canvas.ts`.

## Quick Start

1. Copy this folder:
   ```bash
   cp -r projects/_Templates/_canvas2d-template projects/canvas2d/my-sketch
   ```
2. Edit `index.ts` and shape controls/drawing to your sketch.
3. Add project metadata in `data/projects.json`:
   ```json
   {
     "id": "my-canvas-sketch",
     "title": "My Canvas Sketch",
     "description": "A lightweight canvas2d sketch",
     "date": "2026-03",
     "tags": ["canvas2d", "generative"],
     "entryFile": "/projects/canvas2d/my-sketch/index.ts",
     "configFile": "/projects/canvas2d/my-sketch/project.config.ts"
   }
   ```

## Notes

- Uses `resolveContainer(...)` for layout sizing.
- Uses `Canvas` utility with Vec-based point calls.
- Theme-aware defaults are passed through constructor `defaults`.
- Keep p5 template for p5-specific workflows; use this one for utility-first canvas sketches.
