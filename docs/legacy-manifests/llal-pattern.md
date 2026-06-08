# Legacy Manifest: llal-pattern

## Source and destination

- Legacy source path: `docs/to-import/llal pattern/` (`sketch.js`, `style.css`, `index.html`, `js/engine.js`, vendored `svg-text-to-path/`)
- Migration destination: `projects/llal-pattern/project.config.ts` + `projects/llal-pattern/sketches/llal-pattern.js`
- Canonical index pointer: `configFile`: `/projects/llal-pattern/project.config.ts`

## Assets

| Asset | Source | Destination | Runtime path |
|-------|--------|-------------|--------------|
| LLALLogoLinearGX.ttf | `docs/to-import/llal pattern/fonts/LLALLogoLinearGX.ttf` | `public/assets/fonts/LLALLogoLinearGX.ttf` | `/assets/fonts/LLALLogoLinearGX.ttf` via `@font-face` in `assets/css/main.css` |

Font is author-owned (bundled with legacy project). No external licensing caveats noted.

## Status

- Status: migrated
- Date: 2026-06-08

## Short note

Legacy standalone HTML sketch with custom engine globals and reload UI. Migrated to framework SVG `draw()` contract with print-style mm artboard controls, gallery seed regen, and `svg-text-to-path` for outlined export. Custom DOM retained for nested `<tspan>` variable-font markup and SVG turbulence filters.
