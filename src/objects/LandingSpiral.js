import { Container, Graphics } from 'pixi.js';

/**
 * V1-inspired landing flourish, rebuilt with lightweight Pixi Graphics.
 * A warm point opens into a glowing oval at the table contact point while a
 * shallow dust cloud and a few motes lift outward. No filters or textures are
 * allocated per frame, keeping it inexpensive on mobile GPUs.
 */
export class LandingSpiral extends Container {
  constructor({ reducedMotion = false } = {}) {
    super();
    this.reducedMotion = reducedMotion;
    this.glow = new Graphics();
    this.dust = new Graphics();
    this.motes = new Graphics();
    this.addChild(this.glow, this.dust, this.motes);
    this.visible = false;
    this.active = false;
    this.elapsed = 0;
    this.duration = 1200;
    this.particles = [];
  }

  #rand(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  start(x, y, duration = 1200) {
    this.position.set(x, y);
    this.duration = this.reducedMotion ? Math.min(duration, 760) : duration;
    this.elapsed = 0;
    this.active = true;
    this.visible = true;
    const count = this.reducedMotion ? 10 : 22;
    this.particles = Array.from({ length: count }, (_, index) => {
      const side = this.#rand(index + 17) < 0.5 ? -1 : 1;
      return {
        x: (this.#rand(index + 29) - 0.5) * 30,
        y: 2 + this.#rand(index + 41) * 7,
        vx: side * (42 + this.#rand(index + 53) * 150),
        vy: -(24 + this.#rand(index + 67) * 92),
        gravity: 90 + this.#rand(index + 79) * 65,
        size: 1.4 + this.#rand(index + 97) * 3.4,
        alpha: 0.25 + this.#rand(index + 109) * 0.52,
        delay: this.#rand(index + 131) * 90,
        color: index % 5 === 0 ? 0xffefbd : index % 2 === 0 ? 0xd6aa62 : 0x9d7542,
      };
    });
    return new Promise(resolve => { this.resolveFinished = resolve; });
  }

  update(deltaMS) {
    if (!this.active) return;
    this.elapsed += deltaMS;
    const p = Math.min(1, this.elapsed / this.duration);
    const impact = Math.min(1, p / 0.22);
    const fade = p < 0.42 ? 1 : Math.max(0, 1 - (p - 0.42) / 0.58);
    const ringScale = 0.08 + (1 - Math.pow(1 - p, 3)) * 2.5;

    this.glow.clear();
    // Layered ellipses emulate the V1 soft golden landing ring without BlurFilter.
    this.glow.ellipse(0, 0, 105 * ringScale, 24 * ringScale)
      .stroke({ width: Math.max(1, 4.2 - p * 2.7), color: 0xffdf86, alpha: fade * Math.min(1, impact * 1.3) * 0.72 });
    this.glow.ellipse(0, 0, 84 * ringScale, 18 * ringScale)
      .stroke({ width: 8, color: 0xffbd49, alpha: fade * 0.18 });
    this.glow.ellipse(0, 2, 128 * ringScale, 31 * ringScale)
      .fill({ color: 0xc88c35, alpha: fade * 0.055 });

    this.dust.clear();
    const cloudScale = 0.22 + (1 - Math.pow(1 - p, 2.4)) * 1.48;
    this.dust.ellipse(0, -4 - p * 13, 175 * cloudScale, 38 * cloudScale)
      .fill({ color: 0xc29a5c, alpha: fade * Math.min(1, impact * 1.8) * 0.10 });
    this.dust.ellipse(0, -10 - p * 18, 120 * cloudScale, 28 * cloudScale)
      .fill({ color: 0xffdd91, alpha: fade * 0.075 });

    this.motes.clear();
    const dt = Math.min(34, deltaMS) / 1000;
    for (const particle of this.particles) {
      if (this.elapsed < particle.delay) continue;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const age = Math.max(0, (this.elapsed - particle.delay) / this.duration);
      this.motes.circle(particle.x, particle.y, particle.size * (1 - age * 0.35))
        .fill({ color: particle.color, alpha: particle.alpha * fade });
    }

    if (p >= 1) {
      this.active = false;
      this.visible = false;
      this.glow.clear(); this.dust.clear(); this.motes.clear();
      this.particles.length = 0;
      this.resolveFinished?.();
      this.resolveFinished = null;
    }
  }
}
