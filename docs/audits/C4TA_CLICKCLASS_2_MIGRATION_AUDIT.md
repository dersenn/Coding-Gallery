# C4TA Clickclass 2 Migration Audit

Date: 2026-02-27  
Scope: `projects/c4ta-clickclass-2/index.ts`

## Findings

### keep
- Kept core visual behavior: green filled polygon connecting moving nodes on black background.
- Kept interaction model: clicking inside canvas appends a new moving node.
- Kept boundary bounce behavior for each node velocity component.

### replace now
- Replaced legacy global p5 scripts (`sketch.js` + `class.js`) with framework module contract `init(container, context)` and cleanup.
- Replaced non-deterministic setup randomness with `context.utils.seed.randomRange(...)` for reproducible initial node states.

### replace later
- If multiple node-network sketches are migrated, consider extracting a shared helper for moving-node initialization and bounds reflection.

## Utility-gap backlog
- Optional helper candidate: utility for signed random velocity vectors with configurable min/max speed.

## Utility-first evidence
- Utilities/classes checked: `ProjectContext` lifecycle contract, `context.utils.seed`, p5 template integration.
- Chosen path: custom sketch algorithm built on framework lifecycle + seeded utility primitives.
- Classification: keep / replace now / replace later as listed above.
- Rationale: node-network dynamics are sketch-specific composition logic; framework utilities cover deterministic randomness and runtime integration.
