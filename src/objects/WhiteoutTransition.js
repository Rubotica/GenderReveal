import { Container, Graphics, Sprite } from 'pixi.js';

/** Full-screen smoke transition used to hide the potion-to-hat scene change. */
export class WhiteoutTransition extends Container {
  constructor(textures) {
    super();
    this.visible = false;
    this.active = false;
    this.elapsed = 0;
    this.onCovered = null;
    this.covered = false;
    this.resolveFinished = null;

    const smokeTextures = [textures.smoke1, textures.smoke2, textures.smoke3, textures.smoke2];
    this.layers = smokeTextures.map((texture, index) => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(960 + (index - 1.5) * 310, 580 + (index % 2) * 80);
      sprite.scale.set(1.9 + index * 0.24, 2.25 + index * 0.18);
      sprite.alpha = 0;
      sprite._phase = index * 1.61;
      this.addChild(sprite);
      return sprite;
    });

    this.milk = new Graphics().rect(-3000, -2500, 7920, 6080).fill({ color: 0xf7f8fb, alpha: 1 });
    this.milk.alpha = 0;
    this.addChild(this.milk);
  }

  start(onCovered) {
    this.visible = true;
    this.active = true;
    this.elapsed = 0;
    this.covered = false;
    this.onCovered = onCovered;
    this.alpha = 1;
    this.layers.forEach(layer => { layer.alpha = 0; });
    this.milk.alpha = 0;
    return new Promise(resolve => { this.resolveFinished = resolve; });
  }

  update(deltaMS) {
    if (!this.active) return;
    this.elapsed += deltaMS;
    const t = this.elapsed;

    // 0–1550 ms: smoke floods the frame. 1550–2050 ms: fully covered.
    // 2050–2850 ms: fog clears to reveal the hat again.
    const cover = Math.max(0, Math.min(1, t / 1550));
    const smoothCover = cover * cover * (3 - 2 * cover);
    const clearing = t <= 1900 ? 1 : Math.max(0, 1 - (t - 1900) / 950);

    this.layers.forEach((layer, index) => {
      layer.alpha = Math.min(0.82, smoothCover * (0.53 + index * 0.075)) * clearing;
      layer.x = 960 + (index - 1.5) * 310 + Math.sin(t * 0.00042 + layer._phase) * 105;
      layer.y = 580 + (index % 2) * 80 - smoothCover * (70 + index * 18);
      layer.rotation = Math.sin(t * 0.00031 + layer._phase) * 0.12;
      const swell = 1 + smoothCover * 0.26 + Math.sin(t * 0.00048 + layer._phase) * 0.035;
      layer.scale.set((1.9 + index * 0.24) * swell, (2.25 + index * 0.18) * swell);
    });

    this.milk.alpha = Math.min(0.94, Math.max(0, (smoothCover - 0.38) / 0.62) * 0.94) * clearing;

    if (!this.covered && t >= 1650) {
      this.covered = true;
      Promise.resolve(this.onCovered?.()).catch(console.error);
    }

    if (t >= 2850) {
      this.active = false;
      this.visible = false;
      this.layers.forEach(layer => { layer.alpha = 0; });
      this.milk.alpha = 0;
      this.onCovered = null;
      this.resolveFinished?.();
      this.resolveFinished = null;
    }
  }
}
