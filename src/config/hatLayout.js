/**
 * Normalised Sorting Hat composition.
 *
 * All positions are expressed in source-canvas pixels (1536 × 1024), while
 * scales are relative to the original overlay texture size. Keeping these
 * values in one place makes the composition deterministic on every viewport.
 */
export const HAT_LAYOUT = Object.freeze({
  root: Object.freeze({ x: 960, y: 555, scale: 0.68 }),
  base: Object.freeze({ x: 0, y: 0, scale: 1, zIndex: 20 }),
  eyes: Object.freeze({ x: 0, y: 0, scale: 0.42, zIndex: 30 }),
  mouth: Object.freeze({ x: 0, y: 0.185 * 1024, scale: 0.44, zIndex: 40 }),
  magicPink: Object.freeze({ x: 0, y: 0.375 * 1024, scale: 0.79, zIndex: 10 }),
  magicBlue: Object.freeze({ x: 0, y: 0.375 * 1024, scale: 0.79, zIndex: 11 }),
});
