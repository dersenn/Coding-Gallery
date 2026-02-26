# Shortcut Changes - 2026-02-26

This note captures shortcut behavior updates made during the `pearlymats` tuning pass.

## Global project-page mapping

Current keyboard mapping on project pages:

- `n` -> new seed (in-place update)
- `r` -> reload sketch view in-place (viewer remount)
- `d` -> reset controls to defaults
- `s` -> save sketch output when a `download-svg` action is available

## Browser shortcut behavior

- Browser/system combinations with modifiers are preserved.
- `Cmd+R` / `Ctrl+R` now performs normal browser reload again.

## Save/download behavior

- Save is routed through existing `download-svg` action handling.
- SVG projects can use registered `download-svg` handlers.
- If SVG handler is not registered, existing viewer fallback can provide save.
- Non-SVG sketches or sketches without save/download action keep `s` as no-op.

## `pearlymats`-specific reload behavior

`r` includes additional logic for `pearlymats`:

- Re-randomizes `selectedPaletteIndices` on reload.
- Uses the currently selected color count (not hardcoded).
- Example: if 5 colors are checked, `r` generates a new random set of 5.

## UI polish

- Added a compact shortcuts legend to the control panel:
  - `n` seed, `r` refresh, `d` defaults, `s` save
