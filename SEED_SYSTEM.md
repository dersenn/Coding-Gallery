# Seed System Documentation

## Overview

The gallery uses a sophisticated seed system for reproducible generative art, based on the sfc32 algorithm and base58 encoding (compatible with fxhash.xyz standards).

## Features

### Automatic URL Integration

Seeds are automatically read from and written to the URL:
- Visit `/project/noise-field` → A random seed is generated
- Visit `/project/noise-field?seed=oo2x9k...` → That specific seed is used
- Seeds persist across page reloads
- Share URLs to share exact random variations

### Keyboard Shortcuts

- **Press 'n'** - Generate a new random seed and reload the page
- Works globally on any project page
- URL automatically updates with the new seed

### Console Logging

The current seed is automatically logged to the console when a project loads:
```
Seed: ?seed=oo2x9kxL7n3...
```

This makes it easy to:
- Debug issues with specific seeds
- Record seeds for favorite variations
- Share seeds with others

## Technical Details

### sfc32 Algorithm

We use the sfc32 (Simple Fast Counter) pseudo-random number generator:
- Industry standard for generative art
- Better distribution than simpler algorithms (like mulberry32)
- Compatible with fxhash.xyz and other generative art platforms
- Deterministic - same seed always produces same sequence

### Base58 Encoding

Seeds use base58 encoding (Bitcoin alphabet):
- Human-readable strings (e.g., "oo2x9k...")
- No ambiguous characters (no 0/O, 1/l/I)
- URL-safe
- 51 characters total (oo prefix + 49 random chars)

### Hash Class

The `Hash` class (in `utils/generative.ts`) handles:
- Seed generation
- Base58 decoding
- sfc32 initialization
- Random number generation

## API Reference

### Accessing the Seed

```typescript
// In your project's init function
export async function init(container, context) {
  const { utils } = context
  
  // Get current seed
  console.log(utils.seed.current) // "oo2x9k..."
  
  // Set a specific seed (rarely needed - use URL instead)
  utils.seed.set("oo2x9k...")
  
  // Random functions (all use the current seed)
  const r = utils.seed.random()           // 0-1
  const x = utils.seed.randomRange(0, 100) // min-max
  const i = utils.seed.randomInt(0, 10)   // integer
}
```

### URL Management

```typescript
// In Vue components
const { getCurrentSeed, setSeed, generateNewSeed } = useSeedFromURL()

// Get current seed from URL
const seed = getCurrentSeed() // "oo2x9k..." or null

// Set seed in URL (updates URL, doesn't reload)
await setSeed("oo2x9k...")

// Generate new seed and reload
await generateNewSeed()
```

## Integration with Noise

When you set a seed, the noise functions are also reinitialized with that seed:

```typescript
utils.seed.set("oo2x9k...")

// Noise functions now use the seed too
const n1 = utils.noise.perlin2D(x, y)
const n2 = utils.noise.simplex3D(x, y, z)
```

This ensures complete reproducibility - the same seed produces:
- The same random numbers
- The same noise values
- The exact same visual output

## Best Practices

### Don't Override Seeds Unnecessarily

The URL seed is loaded automatically. Only call `utils.seed.set()` if you have a specific reason:

```typescript
// ❌ Don't do this - URL seed is already loaded
utils.seed.set("some-seed")

// ✅ Do this - just use the random functions
const x = utils.seed.randomRange(0, width)
```

### Log Seeds for Important Variations

If you generate a variation you like:

```typescript
// Log it for reference
console.log('Great variation:', utils.seed.current)

// Or save the URL which includes the seed
// http://localhost:3002/project/my-sketch?seed=oo2x9k...
```

### Test with Known Seeds

For development, test with specific seeds:

```typescript
// Test URL: /project/my-sketch?seed=oo1234...
// This ensures reproducible testing
```

## Standalone Export

When exporting projects as standalone HTML, implement seed URL reading:

```javascript
// Get seed from URL or generate
const params = new URLSearchParams(location.search)
const seed = params.get('seed') || generateRandomSeed()

console.log('Seed:', seed)

// Pass to your project's init
init(container, { utils: { seed: { current: seed, ... } } })
```

See `projects/_template/README.md` for complete standalone export example with seed support.

## Migration from Old System

If you used the old mulberry32-based seed system:

```typescript
// Old API (no longer works)
utils.seed.set(12345)  // numeric seed

// New API
utils.seed.set("oo2x9k...")  // base58 string seed
// Or just let the URL handle it automatically
```

The new system is superior:
- Better random distribution (sfc32 vs mulberry32)
- Shareable seeds via URL
- Industry-standard format
- Automatic logging

## Troubleshooting

### Seed not persisting across reloads

Check that:
1. URL includes `?seed=...` parameter
2. You're not calling `utils.seed.set()` and overriding it
3. Browser isn't blocking URL updates

### Different results with same seed

Check that:
1. You're using the exact same seed string
2. Code logic hasn't changed between runs
3. All random/noise calls use `utils.seed.*` not `Math.random()`

### Keyboard shortcut 'n' not working

Check that:
1. You're on a project page (not home page)
2. You're not typing in an input/textarea
3. The keyboard plugin loaded (`plugins/keyboard-shortcuts.client.ts`)
