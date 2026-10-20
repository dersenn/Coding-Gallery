// stepper.js
// Reversible, interruptible step walker. Renderer-agnostic: it only knows
// indices and calls `onStep(index, signal)` for each one on the way.

/**
 * Wait one animation frame, then `ms`. Resolves early (with false) on abort.
 * @param {number} ms
 * @param {AbortSignal} signal
 * @returns {Promise<boolean>} true if the wait completed
 */
function wait(ms, signal) {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    let timer = null;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(done, ms, true);
    });
    function done(completed) {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve(completed);
    }
    function onAbort() { done(false); }
    signal.addEventListener('abort', onAbort);
  });
}

/**
 * @param {Object} options
 * @param {number} options.count - Number of steps (index 0 = target/clear, count-1 = start)
 * @param {number} [options.start] - Initial index (defaults to count - 1)
 * @param {number} options.interval - ms per step
 * @param {(index: number, signal: AbortSignal) => (void|Promise<void>)} options.onStep
 */
export function createStepper({ count, start = count - 1, interval, onStep }) {
  let current = start;
  let controller = null;
  let destroyed = false;

  /**
   * Walk from the current index toward `target`, aborting any running walk.
   * @param {number} target
   * @returns {Promise<void>} settles when the walk finishes or is aborted
   */
  async function to(target) {
    if (destroyed) return;
    target = Math.max(0, Math.min(count - 1, target));

    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const dir = target < current ? -1 : 1;

    try {
      for (let i = current; dir < 0 ? i >= target : i <= target; i += dir) {
        if (signal.aborted) return;
        current = i;
        await onStep(i, signal);
        if (!(await wait(interval, signal))) return;
      }
    } catch (err) {
      if (!signal.aborted) console.error('Stepper error:', err);
    }
  }

  return {
    to,
    get current() { return current; },
    get count() { return count; },
    destroy() {
      destroyed = true;
      controller?.abort();
      controller = null;
    }
  };
}
