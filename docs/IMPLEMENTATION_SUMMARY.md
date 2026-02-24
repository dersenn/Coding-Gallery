# Implementation Summary: Iframe Removal

This is a historical note for the migration from iframe-based projects to direct TypeScript module loading.

## Architecture shift

**Before**
- Standalone HTML projects loaded in iframes.
- `postMessage` for controls and coordination.

**After**
- Projects are TS modules exporting `init(container, context)`.
- Direct reactive control updates.
- Shared utilities for seed, noise, math, vector helpers.

## Core outcomes

- Removed iframe/runtime communication complexity.
- Enabled type-safe project modules.
- Improved debugging in a single JS context.
- Added URL-seed reproducibility and keyboard seed shortcut (`n`).
- Added SVG tooling and template-based project creation.

## Key files introduced/updated

- Utilities: `utils/generative.ts`, `utils/shortcuts.ts`, `utils/svg.ts`
- Composables: `composables/useGenerativeUtils.ts`, `composables/useSeedFromURL.ts`, `composables/useProjectLoader.ts`
- Runtime loader: `components/ProjectViewer.vue`
- Types: `types/project.ts`
- Metadata: `data/projects.json`
- Templates: `projects/_Templates/*`

## Notes that remain relevant

- `entryFile` paths in `data/projects.json` must match module discovery keys exactly.
- Hidden projects are still loadable by direct route.
- Seed system is URL-driven and deterministic.

## Related docs

- Main docs: `../README.md`
- Docs index: `INDEX.md`
- Quick start: `QUICK_START.md`
- Seed system: `SEED_SYSTEM.md`
- SVG details: `SVG_IMPLEMENTATION.md`
- Template guide: `../projects/_Templates/_template/README.md`
