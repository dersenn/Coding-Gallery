// steps.js
// Dynamic grain step generation with configurable easing.
// `shortSide` is the short side of the display-size source bitmap — more
// grains than displayed pixels is pointless, so that is the cap.

/**
 * Easing presets for grain distribution
 * 'linear' and 'quadratic' use the standard easing approach
 * 'log' uses geometric/exponential interpolation for visually even steps
 */
export const easingPresets = {
  // Linear: equal numeric spacing between grain values
  linear: (t) => t,
  
  // Quadratic: more steps concentrated at low grains (when pixelated)
  quadratic: (t) => t * t,
  
  // Log: special marker - handled separately in generateGrainSteps
  // Produces geometric progression (roughly halving each step)
  log: 'geometric',
};

/**
 * Generate an array of grain steps from startGrain to full resolution
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.startGrain - Starting grain value (most pixelated, e.g., 2)
 * @param {number} options.steps - Number of animation steps (including start and full)
 * @param {number} options.shortSide - Display-size source short side in pixels (caps max grain)
 * @param {string|Function} options.easing - Easing preset name or custom function
 * @returns {Array} Array of grain values: ['full', ...descendingGrainValues]
 * 
 * @example
 * generateGrainSteps({ startGrain: 2, steps: 10, shortSide: 1080, easing: 'quadratic' })
 * // Returns: ['full', 540, 270, 135, 67, 34, 17, 9, 5, 3, 2]
 */
export function generateGrainSteps({ startGrain, steps, shortSide, easing = 'quadratic' }) {
  // Validate inputs
  if (startGrain < 1) {
    console.warn('startGrain must be >= 1, using 1');
    startGrain = 1;
  }
  
  if (steps < 2) {
    console.warn('steps must be >= 2, using 2');
    steps = 2;
  }
  
  // Cap startGrain at shortSide (no point having more "pixels" than actual pixels)
  if (shortSide && startGrain > shortSide) {
    startGrain = shortSide;
  }
  
  // Calculate the max grain value (short side of image, or a large default)
  const maxGrain = shortSide || 2048;
  
  // Generate grain values
  // We need (steps - 1) numeric values, plus 'full' at the start
  const numericSteps = steps - 1;
  const grains = ['full'];
  
  // Check if using logarithmic/geometric mode
  const isGeometric = easing === 'log' || easingPresets[easing] === 'geometric';
  
  if (isGeometric) {
    // Geometric progression: each step is roughly a constant ratio
    // grain[i] = maxGrain * (startGrain/maxGrain)^(i/numericSteps)
    // This produces visually even steps (roughly halving perception each step)
    const ratio = startGrain / maxGrain;
    
    for (let i = 1; i <= numericSteps; i++) {
      const t = i / numericSteps;
      const grain = Math.round(maxGrain * Math.pow(ratio, t));
      
      // Avoid duplicates
      if (grains[grains.length - 1] !== grain && grain !== 'full') {
        grains.push(grain);
      }
    }
  } else {
    // Standard easing-based interpolation
    const easingFn = typeof easing === 'function' 
      ? easing 
      : (easingPresets[easing] || easingPresets.quadratic);
    
    // Generate values from maxGrain down to startGrain
    // We want MORE steps at LOW grain values (when pixelated)
    // So we invert the easing: use "ease-out" style (1 - f(1-t))
    for (let i = 1; i <= numericSteps; i++) {
      // t goes from 0 to 1 across our steps
      const t = i / numericSteps;
      
      // Apply inverted easing for "ease-out" effect
      // This concentrates values at the LOW grain end (startGrain)
      const easedT = 1 - easingFn(1 - t);
      
      // Interpolate between maxGrain and startGrain
      // When easedT = 0, grain = maxGrain
      // When easedT = 1, grain = startGrain
      const grain = Math.round(maxGrain - easedT * (maxGrain - startGrain));
      
      // Avoid duplicates (can happen with rounding at edges)
      if (grains[grains.length - 1] !== grain && grain !== 'full') {
        grains.push(grain);
      }
    }
  }
  
  // Ensure startGrain is included as the last value
  if (grains[grains.length - 1] !== startGrain) {
    grains.push(startGrain);
  }
  
  return grains;
}

/**
 * Get the index of a grain value in a grains array, or find the closest match
 * 
 * @param {Array} grains - Array of grain values
 * @param {number|string} grain - Grain value to find
 * @returns {number} Index in the grains array
 */
export function findGrainIndex(grains, grain) {
  // If grain is 'full', return 0
  if (grain === 'full') return 0;
  
  // Find exact match
  const exactIndex = grains.indexOf(grain);
  if (exactIndex !== -1) return exactIndex;
  
  // Find closest grain that is >= the requested grain
  // Start from index 1 to skip 'full'
  for (let i = 1; i < grains.length; i++) {
    if (grains[i] <= grain) {
      return i;
    }
  }
  
  // If grain is smaller than all values, use the smallest (last) grain
  return grains.length - 1;
}
