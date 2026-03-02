# Trails Migration Audit

Date: 2026-02-27  
Scope: `projects/c4ta/p5/trails/index.ts`

## Findings

### keep
- Kept sketch behavior: one particle follows mouse and renders a capped history as progressively sized circles.
- Kept white frame reset each draw (`background(255)`), matching original visual output.

### replace now
- Replaced legacy multi-file structure (`sketch.js` + `class.js`) with a single framework module implementing `init(container, context)` + cleanup.
- Replaced global mutable state with module-local `ParticleTrail` class and `controlState` sync via `onControlChange`.

### replace later
- Consider extracting a reusable trail/history helper only if multiple migrated sketches reuse this exact pattern.

## Utility-gap backlog
- None currently required for this migration.

## Utility-first evidence
- Utilities/classes checked: `ProjectContext` module contract, `onControlChange`, `syncControlState`.
- Chosen path: custom algorithm (trail history rendering) on top of framework module lifecycle.
- Classification: keep / replace now / replace later as listed above.
- Rationale: The trail-rendering logic is sketch-specific; framework contracts cover mounting, controls, and cleanup.
