# voronoi

- Source type: external-folder
- Technique: svg
- Canonical source path: `/Users/dersenn/Library/CloudStorage/Dropbox-Personal/ Code/Sandbox/svg-stuff/voronoi`
- Source snapshot: migrated on 2026-02-27
- Migration destination: `projects/sandbox/voronoi/sketches/voronoi.js`
- Status: migrated, converted to modern `draw()` contract (2026-04-11)
- Notes: Legacy sketch depended on custom engine globals (`SVG`, `Path`, `Vec`, random/hash). Migration maps geometry/rendering to framework SVG + seeded utilities. Geometry functions retained as plain JS in sketch file; no controls (`noControls: true`).
