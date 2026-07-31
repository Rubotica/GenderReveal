import { Sprite } from 'pixi.js';

/**
 * A reusable visual component attached to the Sorting Hat.
 *
 * The component owns its sprite, transform and optional texture states. This
 * keeps Hat.js focused on behaviour instead of low-level Pixi sprite setup.
 */
export class HatComponent {
  constructor({ texture, layout, states = null, visible = true, alpha = 1 }) {
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.roundPixels = true;
    this.states = states;
    this.currentState = null;

    this.applyLayout(layout);
    this.sprite.visible = visible;
    this.sprite.alpha = alpha;
  }

  applyLayout(layout) {
    this.layout = { ...layout };
    this.sprite.position.set(Math.round(layout.x ?? 0), Math.round(layout.y ?? 0));
    this.sprite.scale.set(layout.scale ?? 1);
    this.sprite.rotation = layout.rotation ?? 0;
    this.sprite.zIndex = layout.zIndex ?? 0;
  }

  setState(name) {
    if (!this.states) return false;
    const texture = this.states[name];
    if (!texture) return false;

    this.currentState = name;
    this.sprite.texture = texture;
    return true;
  }

  setVisible(visible) {
    this.sprite.visible = Boolean(visible);
  }

  setAlpha(alpha) {
    this.sprite.alpha = Math.max(0, Math.min(1, Number(alpha) || 0));
  }

  setTransform(partialLayout) {
    this.applyLayout({ ...this.layout, ...partialLayout });
  }
}
