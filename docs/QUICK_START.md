# Quick Start Guide

Use this for a fast first run. For full reference, see `../README.md`.

## Run the app

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```
3. Open the gallery (`/`) and a project route (`/project/<id>`).

## Create your first project

1. Copy the p5 template:
   ```bash
   cp -r projects/_Templates/_template projects/my-first-sketch
   ```
2. Implement your sketch in `projects/my-first-sketch/index.ts`.
3. Add metadata in `data/projects.json`:
   ```json
   {
     "id": "my-first-sketch",
     "title": "My First Sketch",
     "description": "A simple animated sketch",
     "date": "2026-02",
     "tags": ["p5js", "generative"],
     "libraries": ["p5"],
     "entryFile": "/projects/my-first-sketch/index.ts"
   }
   ```
4. Open: `/project/my-first-sketch`.

## Verify key runtime features

- Press `n` on a project page to generate a new seed.
- Check URL updates with `?seed=...`.
- Open controls and confirm your sketch reacts to control changes.

## Related docs

- Main docs: `../README.md`
- Docs index: `INDEX.md`
- Seed details: `SEED_SYSTEM.md`
- SVG engine details: `SVG_IMPLEMENTATION.md`
- Migration history: `IMPLEMENTATION_SUMMARY.md`
- Template reference: `../projects/_Templates/_template/README.md`
