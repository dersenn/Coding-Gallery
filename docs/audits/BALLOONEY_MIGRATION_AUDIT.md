# Ballooney Migration Audit

Date: 2026-03-02  
Scope: `projects/svg/ballooney/index.ts`

## Findings

### keep
- Kept the original 2x2 tile composition and per-edge random segment count behavior.
- Kept the progressive random edge subdivision feel (each next split lerps from the previous split toward the edge end).
- Kept per-tile quadratic path construction with center-pulled control points and bright green fills.

### replace now
- Replaced legacy global classes (`SVG`, `Pt`, `Tile`) with framework `SVG` and `Vec` primitives.
- Replaced keypress save handling with framework `download-svg` action registration and `svg.save(...)`.
- Replaced unseeded randomness with framework seeded randomness (`shortcuts(utils)`), preserving composition intent while making outputs reproducible by seed.

### replace later
- If additional early SVG engine studies are migrated, consider extracting a shared helper for the progressive random edge subdivision pattern used by V1.

## Utility-gap backlog
- Candidate utility gap: path-command utility for mixed `M/Q/C/S/Z` composition to reduce manual string-building in curve-heavy migrations.

## Utility-first evidence
- Utilities/classes checked: `SVG`, `Vec` methods (`mid`, `lerp`), `shortcuts(utils)` seeded random helpers, project action lifecycle (`registerAction`).
- Chosen path: use existing framework utilities for rendering/lifecycle/randomness + custom sketch algorithm for progressive edge subdivision.
- Classification: keep / replace now / replace later as listed above.
- Rationale: primitive rendering and deterministic random are framework concerns; the subdivision behavior is sketch-specific visual logic.
