# LLAL Pattern Migration Audit

Date: 2026-06-08  
Scope: `projects/llal-pattern/sketches/llal-pattern.js`

## Findings

### keep

- Column layout via `getBBox().width` x-advance stays custom; requires laid-out DOM and is sketch-specific.
- Nested `<text>` / `<tspan>` with `font-variation-settings: 'wdth'` stays custom; framework `svg.text()` has no variation/tspan support.
- `feTurbulence` / `feDisplacementMap` filter construction stays custom; no SVG filter helper in framework.
- `svg-text-to-path` bridge stays custom; export-specific and async.

### replace now

- Old `Hash` seed + reload URL → framework seed (`utils.seed`, gallery seed regen).
- Old `rnd` / `coinToss` / `shuffle` / `nVec` → `shortcuts(utils)` (`rnd`, `coin`, `shuffle`, `v`).
- Old standalone UI → framework controls panel (mm output, rows, columns, blanks, filter).
- `vh` font sizing → mm-derived sizing from `outputHeight / rows`.
- Legacy filter style typo (`url(#swirl`) fixed to `url(#swirl)`).

### replace later

- Evaluate framework-level async SVG export hook so sketches can `await` text-to-path before `download-svg` without custom `init()` + second action.

## Utility-first evidence

- Utilities/classes checked: `SVG`, `svg.text`, `shortcuts`, `theme`, `utils.seed`, print container.
- Logic type: sketch algorithm (column propagation, variable-font tspan markup, filter graph).
- Chosen path: custom algorithm on framework primitives.
- Classification: keep (layout/filter/tspan/text-to-path), replace now (seed/random/UI/sizing).

## Utility-gap backlog

- Added candidate: `async-svg-text-export` — await path conversion before serializing SVG for download.

## Known limits

- `replaceAll()` is async; `download-svg` may export live text if clicked before conversion completes. Use **Download SVG (Outlined)** to await conversion first.
- High column counts at large mm sizes may be slow during path conversion.
