# C4TA 220203 Type In Space Migration Audit

Date: 2026-03-02  
Scope: `projects/c4ta/p5/220203-type-in-space/index.ts`

## Findings

### keep
- Kept the core WEBGL composition: orthographic camera view, orbit interaction, and rotating camera path around the origin.
- Kept glyph generation from font outlines using `textBounds` and `textToPoints` for the letter `C`.
- Kept three chunk layers rendered as point-traced line shapes with RGB depth separation.

### replace now
- Replaced legacy global script setup with framework module contract `init(container, context)` and explicit cleanup.
- Replaced external relative font dependency (`assets/MunkenSans-Medium.otf`) with a repo-served runtime asset path (`/assets/fonts/MunkenSans-Medium.otf`).
- Replaced fragile legacy resize logic with module-contained `windowResized` behavior that rebuilds glyph points when canvas dimensions change.

### replace later
- If more typography migrations require local font files, consider a small shared helper for consistent p5 font preload path conventions and preload error reporting.

## Utility-gap backlog
- Potential future gap: a lightweight framework-level convention/helper for custom static assets (fonts/textures) across p5 migrations.

## Utility-first evidence
- Utilities/classes checked: `ProjectContext` lifecycle contract, existing C4TA p5 migration patterns, `shortcuts(utils)` fit for this sketch.
- Chosen path: use existing framework lifecycle/module contract; keep custom glyph chunking/render choreography as sketch-specific algorithm.
- Classification: keep / replace now / replace later as listed above.
- Rationale: this sketch's visual identity depends on sketch-specific font-outline point extraction and chunked depth rendering, while framework responsibilities are lifecycle integration and stable asset serving.
