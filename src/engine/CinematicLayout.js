import { SHOW_LAYOUT } from './AnchorLayout.js';

/**
 * Reusable scene-composition layer built on top of named anchors.
 * A composition groups multiple objects into one art-directed layout, while
 * preserving per-object offsets, scale and entrance directions.
 */
export class CinematicLayout {
  constructor(anchorLayout = SHOW_LAYOUT) {
    this.anchorLayout = anchorLayout;
    this.compositions = new Map();
  }

  define(name, slots) {
    this.compositions.set(name, Object.freeze({ ...slots }));
    return this;
  }

  resolve(compositionName, slotName, overrides = {}) {
    const composition = this.compositions.get(compositionName);
    if (!composition) throw new Error(`Unknown cinematic composition: ${compositionName}`);
    const slot = composition[slotName];
    if (!slot) throw new Error(`Unknown slot ${slotName} in ${compositionName}`);

    const merged = {
      ...slot,
      ...overrides,
      offsetX: (slot.offsetX || 0) + (overrides.offsetX || 0),
      offsetY: (slot.offsetY || 0) + (overrides.offsetY || 0),
    };
    const point = this.anchorLayout.resolve(merged.anchor, merged);
    return { ...merged, x: point.x, y: point.y };
  }

  place(displayObject, compositionName, slotName, overrides = {}) {
    const slot = this.resolve(compositionName, slotName, overrides);
    displayObject.position.set(slot.x, slot.y);
    if (Number.isFinite(slot.scale)) displayObject.scale.set(slot.scale);
    if (Number.isFinite(slot.alpha)) displayObject.alpha = slot.alpha;
    return slot;
  }
}

export const CINEMATIC_LAYOUT = new CinematicLayout()
  .define('REVEAL_TRIPTYCH', {
    hat: {
      anchor: 'LEFT_CENTER',
      offsetX: -18,
      offsetY: 18,
      scale: 0.58,
      enterFromX: -78,
      enterFromY: 22,
    },
    title: {
      anchor: 'CENTER_LOWER',
      offsetX: 0,
      offsetY: 15,
      scale: 1,
      enterFromX: 0,
      enterFromY: 48,
    },
    wizard: {
      anchor: 'RIGHT_CENTER',
      offsetX: 70,
      offsetY: 18,
      scale: 0.64,
      enterFromX: 118,
      enterFromY: 37,
    },
    burst: {
      anchor: 'CENTER',
      offsetX: 0,
      offsetY: 18,
      scale: 1,
    },
  });
