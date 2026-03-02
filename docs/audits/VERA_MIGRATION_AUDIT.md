# Vera Migration Audit

Date: 2026-03-01  
Scope: `projects/c4ta/svg/vera/index.ts`

## Findings

### keep
- Kept the overlapping-tile layout math used by both legacy variants.
- Kept variant-specific line construction: multi-choice line set for Vera 1 and diagonal line set with randomized offsets/heights for Vera 2.
- Kept center-origin composition intent by mapping virtual coordinates into a centered square SVG stage.

### replace now
- Replaced legacy custom engine globals (`ngn`, `dom`, manual SVG path builders) with framework contract and primitives: `init(container, context)`, `SVG`, `shortcuts(utils)`, and framework cleanup.
- Replaced unseeded `Math.random` and custom `getRandomInt` with seeded randomness from `context.utils.seed` via `shortcuts(utils)` to align with deterministic framework behavior.
- Replaced legacy manual download behavior with framework `download-svg` action registration and `svg.save(...)`.

### replace later
- If more C4TA line-composition sketches are migrated, consider extracting a shared helper for overlap-grid tile stepping to reduce repeated formula boilerplate.

## Utility-gap backlog
- Candidate utility gap: reusable helper for overlap-grid tile dimensions/offsets (`tileW/tileH`, overlap, and stepped cell origins).

## Utility-first evidence
- Utilities/classes checked: `ProjectContext` lifecycle contract, `SVG`, `shortcuts(utils)` (`v`, `rndInt`), `syncControlState`, `context.theme`, and action registration (`registerAction`).
- Chosen path: use existing framework primitives for lifecycle/randomness/rendering + custom algorithm for sketch-specific Vera line composition.
- Classification: keep / replace now / replace later as listed above.
- Rationale: overlap tiling and line-choice rules are sketch-specific composition logic, while rendering, seeded randomness, controls, and export are framework concerns.
