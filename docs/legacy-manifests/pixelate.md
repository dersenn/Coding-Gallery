# Legacy Manifest: pixelate

## Source and destination

- Legacy source path: `../Pixelate/` (a separate repo)
  - Engine in `lib/`: `Pixelate.js`, `LoadingManager.js`, `PixelationWorker.js`, `effects.js`, `grainGenerator.js`, `config.js`, plus the docs `ARCHITECTURE.md`, `PORTABILITY_CHECK.md`, `QUICK_START.md` and `README.md`.
  - Playground in `app/`, with the control surface defined in `app/composables/usePlayground.ts`.
- Migration destination:
  - `lib/pixelate/` (`index.js`, `stepper.js`, `steps.js`, `effects.js`, `pool.js`, `worker.js`, `README.md`)
  - `projects/pixelate/project.config.ts`
- Canonical index pointer: `configFile`: `/projects/pixelate/project.config.ts`

## Assets

| Asset | Source | Destination | Runtime path |
|-------|--------|-------------|--------------|
| e-rutishauser-1-2400.webp | `../Pixelate/public/images/e-rutishauser-1-2400.webp` | `projects/pixelate/images/e-rutishauser-1-2400.webp` | Vite-hashed `?url` import |
| dsf6071-2400.jpg | `../Pixelate/public/images/_DSF6071.jpg` (resized to 2400px, q60) | `projects/pixelate/images/dsf6071-2400.jpg` | Vite-hashed `?url` import |
| r001226-2400.jpg | `../Pixelate/public/images/_R001226.jpg` (resized to 2400px, q60) | `projects/pixelate/images/r001226-2400.jpg` | Vite-hashed `?url` import |

The images are author-owned (from the Pixelate playground). No external licensing caveats were noted.

## Status

- Status: migrated (rewrite)
- Date: 2026-10-20

## Short note

The legacy main-thread pixelation engine is rewritten as a portable, worker-pool module in `lib/pixelate/`:
- sources are decoded at display size;
- effects run after the point-sampled downscale;
- a generic reversible stepper drives the walk;
- lazy load and release keep many instances memory-flat.

The gallery project wraps the module through `init` and maps the playground controls onto the framework control panel.

The four legacy `lib/*.md` docs are replaced by `lib/pixelate/README.md`. The playground Vue components were not ported. The website adapter (basename/size convention → `sources`) is a follow-up task.
