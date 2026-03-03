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
- Candidate utility gap: reusable helper for overlap-grid tile dimensions/offsets (`tileW/tileH`, overlap, and stepped cell origins). See `docs/UTILITY_GAP_BACKLOG.md` — `overlap-grid-tiling`.
- `coordinate-cell-hash` gap promoted to `implemented`: the `stableUnit`/`stableIndex` helpers were the first instance of this pattern; see `utils.noise.cell()`.

## Utility-first evidence
- Utilities/classes checked: `ProjectContext` lifecycle contract, `SVG`, `shortcuts(utils)` (`v`), `syncControlState`, `context.theme`, `utils.noise.cell()`, and action registration (`registerAction`).
- Chosen path: use existing framework primitives for lifecycle/rendering/controls + `utils.noise.cell()` for coordinate-keyed stable randomness + custom algorithm for sketch-specific Vera line composition.
- Classification: keep / replace now / replace later as listed above.
- Rationale: overlap tiling and line-choice rules are sketch-specific composition logic; rendering, seeded randomness, controls, and export are framework concerns.

### post-migration notes
- 2026-03-02: Replaced local `stableUnit`/`stableIndex` helpers with `utils.noise.cell()` — the pattern was promoted to a framework utility after appearing in both vera and lattice-drift. Visual output changes for existing seeds (key-to-noise-coordinate mapping changed); algorithm and structure preserved.
- 2026-03-02: Fixed `svg.stage.innerHTML = ''` → `svg.stage.replaceChildren()` for consistency with other sketches.
- 2026-03-02: Replaced `utils.noise.cell()` with per-layer PRNG instances (`createGenerativeUtils(seed)`) for improved readability. Each layer receives its own `GenerativeUtils` instance created fresh inside `draw()`, giving it an independent stream from position 0. This is now the canonical pattern for multi-layer sketches with independently toggled layers; see `docs/SEED_SYSTEM.md`. Visual output changes for existing seeds (values now come from a PRNG stream rather than a noise hash).
- 2026-03-02: Removed legacy virtual coordinate system (`VIRTUAL_HEIGHT`, `res`, `toStagePoint`, `drawVirtualLine`, `BASE_STROKE`). The virtual 100×100 canvas was a leftover from an earlier engine design and added pure indirection — with a square SVG canvas, virtual coord (-50,-50) mapped exactly to pixel (0,0). Switched to direct pixel coordinates. Stroke now computed as `size * 0.002` (equivalent to `BASE_STROKE * res`). No visual change.
- 2026-03-02: Sketch intent header updated from migration-era language to living exercise framing. Layer section banner comments added for future extensibility.
- 2026-03-02: Integrated `Cell` into both layer functions. Each tile is now wrapped as a `Cell` object inside the inner loop; motif code references `tile.tl()`, `tile.tr()`, `tile.bl()`, `tile.br()`, `tile.center()` rather than raw coordinate arithmetic.
- 2026-03-02: Evolved vera2 from binary position array + yJitter to `divLength`-based edge sampling. Left and right edges of each tile are sampled via `divLength(..., { mode: 'randomGaps' })` and connecting lines are drawn between the sampled point pairs. This is a deliberate behavior change — vera2 becomes a divLength showcase; visual output changes for all seeds.
