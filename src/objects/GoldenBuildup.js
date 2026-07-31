import { Container, Graphics } from 'pixi.js';

/** Lightweight full-screen golden anticipation pass. No hard ring or frame. */
export class GoldenBuildup extends Container {
  constructor() {
    super();
    this.elapsed = 0;
    this.duration = 0;
    this.active = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.glow = new Graphics();
    this.rays = new Graphics();
    this.dust = new Graphics();
    this.addChild(this.glow, this.rays, this.dust);
    this.visible = false;
  }

  start(duration = 3300) {
    this.elapsed = 0;
    this.duration = this.reducedMotion ? Math.min(duration, 1400) : duration;
    this.active = true;
    this.visible = true;
  }

  stop() {
    this.active = false;
    this.visible = false;
    this.glow.clear(); this.rays.clear(); this.dust.clear();
  }

  update(deltaMS) {
    if (!this.active) return;
    this.elapsed += deltaMS;
    const p = Math.min(1, this.elapsed / this.duration);
    const swell = p * p * (3 - 2 * p);
    const pulse = 0.88 + Math.sin(this.elapsed * 0.008) * 0.12;

    this.glow.clear()
      .ellipse(960, 555, 920 + swell * 160, 500 + swell * 75)
      .fill({ color: 0xffb83f, alpha: swell * 0.055 * pulse })
      .ellipse(960, 565, 610 + swell * 130, 350 + swell * 65)
      .fill({ color: 0xffdd82, alpha: swell * 0.075 * pulse })
      .ellipse(960, 600, 300 + swell * 180, 210 + swell * 80)
      .fill({ color: 0xfff0b8, alpha: swell * 0.10 * pulse });

    this.rays.clear();
    if (!this.reducedMotion) {
      for (let i = 0; i < 8; i += 1) {
        const a = -2.65 + i * 0.76 + Math.sin(this.elapsed * 0.00045 + i) * 0.08;
        const length = 430 + swell * 370;
        const x2 = 960 + Math.cos(a) * length;
        const y2 = 590 + Math.sin(a) * length * 0.62;
        this.rays.moveTo(960, 585).lineTo(x2, y2)
          .stroke({ color: 0xffdf84, width: 18 + swell * 22, alpha: swell * 0.018 });
      }
    }

    this.dust.clear();
    const count = this.reducedMotion ? 14 : 38;
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399 + this.elapsed * (0.00035 + (i % 3) * 0.00008);
      const radius = 70 + ((i * 47 + this.elapsed * 0.035) % (260 + swell * 330));
      const x = 960 + Math.cos(angle) * radius;
      const y = 575 + Math.sin(angle) * radius * 0.55;
      this.dust.circle(x, y, 1.2 + (i % 4) * 0.75)
        .fill({ color: i % 5 === 0 ? 0xffffff : 0xffd66b, alpha: swell * (0.15 + (i % 4) * 0.07) });
    }

    if (p >= 1) this.stop();
  }
}
