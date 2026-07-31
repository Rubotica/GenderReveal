import { Container, Graphics } from 'pixi.js';
import { POTION_CONFIG } from '../config/potionConfig.js';

function cubicPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

/** Mobile-safe enchanted liquid streams made from a small fixed droplet budget. */
export class PotionBeams extends Container {
  constructor(config = POTION_CONFIG) {
    super();
    this.elapsed = 0;
    this.active = false;
    this.duration = 0;
    this.config = cloneConfig(config);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.dropletGlow = new Graphics();
    this.droplets = new Graphics();
    this.sparks = new Graphics();
    this.cauldronGlow = new Graphics();
    this.addChild(this.dropletGlow, this.droplets, this.sparks, this.cauldronGlow);
    this.visible = false;
  }

  setConfig(config) {
    this.config = cloneConfig(config);
  }

  getConfig() {
    return cloneConfig(this.config);
  }

  start(duration = 4200) {
    this.active = true;
    this.duration = duration;
    this.elapsed = 0;
    this.visible = true;
  }

  preview() {
    this.active = true;
    this.duration = Number.POSITIVE_INFINITY;
    this.visible = true;
  }

  stop() {
    this.active = false;
    this.visible = false;
    for (const child of this.children) child.clear?.();
  }

  drawLiquid(points, color, phase, envelope, growth) {
    const [p0, p1, p2, p3] = points;
    const count = this.reducedMotion ? 11 : 22;
    const speed = Number(this.config.speed) || 0.00034;
    const sizeMultiplier = Number(this.config.size) || 1;
    const wobbleMultiplier = Number(this.config.wobble) || 1;
    for (let index = 0; index < count; index += 1) {
      const t = ((index / count) + this.elapsed * speed + phase) % 1;
      const point = cubicPoint(t, p0, p1, p2, p3);
      const wobble = Math.sin(this.elapsed * 0.008 + index * 1.73 + phase * 8) * (2.5 + 7 * t) * wobbleMultiplier;
      const radius = (3.2 + (index % 4) * 1.05) * (0.68 + growth * 0.32) * sizeMultiplier;
      const x = point.x + wobble;
      const y = point.y + Math.sin(index * 2.1 + this.elapsed * 0.006) * 2.5 * wobbleMultiplier;
      this.dropletGlow.circle(x, y, radius * 2.15).fill({ color, alpha: envelope * 0.075 });
      this.droplets.circle(x, y, radius).fill({ color, alpha: envelope * (0.64 + (index % 3) * 0.10) });
      if (index % 5 === 0) {
        this.droplets.circle(x - radius * 0.22, y - radius * 0.28, Math.max(0.8, radius * 0.28))
          .fill({ color: 0xffffff, alpha: envelope * 0.72 });
      }
    }
  }

  update(deltaMS) {
    if (!this.active) return;
    this.elapsed += deltaMS;
    const finiteDuration = Number.isFinite(this.duration);
    const progress = finiteDuration ? Math.min(1, this.elapsed / this.duration) : 0.52;
    const grow = finiteDuration ? Math.min(1, progress / 0.24) : 1;
    const fade = finiteDuration && progress >= 0.76 ? Math.max(0, 1 - (progress - 0.76) / 0.24) : 1;
    const envelope = (grow * grow * (3 - 2 * grow)) * fade;

    this.dropletGlow.clear();
    this.droplets.clear();
    this.sparks.clear();
    this.cauldronGlow.clear();

    const blue = [this.config.blue.start, this.config.blue.control1, this.config.blue.control2, this.config.blue.end];
    const pink = [this.config.pink.start, this.config.pink.control1, this.config.pink.control2, this.config.pink.end];
    this.drawLiquid(blue, 0x46a8ff, 0.00, envelope, grow);
    this.drawLiquid(pink, 0xff65cf, 0.47, envelope, grow);

    const reaction = finiteDuration ? Math.min(1, Math.max(0, (progress - 0.18) / 0.42)) : 0.8;
    const pulse = 0.82 + Math.sin(this.elapsed * 0.021) * 0.18;
    const targetX = (this.config.blue.end.x + this.config.pink.end.x) / 2;
    const targetY = (this.config.blue.end.y + this.config.pink.end.y) / 2 + 8;
    this.cauldronGlow.ellipse(targetX, targetY, 190 + reaction * 55, 54 + reaction * 12)
      .fill({ color: 0x8bd8ff, alpha: reaction * fade * 0.11 * pulse })
      .ellipse(targetX, targetY - 1, 132 + reaction * 34, 34 + reaction * 8)
      .fill({ color: 0xff8bd9, alpha: reaction * fade * 0.10 })
      .ellipse(targetX, targetY - 3, 78 + reaction * 22, 18 + reaction * 5)
      .fill({ color: 0xffffff, alpha: reaction * fade * 0.22 });

    const sparkCount = this.reducedMotion ? 12 : 30;
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = index * 2.399 + this.elapsed * 0.0011;
      const radius = 28 + ((index * 31 + this.elapsed * 0.031) % (90 + reaction * 130));
      const x = targetX + Math.cos(angle) * radius;
      const y = targetY - 9 - Math.abs(Math.sin(angle)) * radius * 0.52;
      this.sparks.circle(x, y, 1.2 + (index % 4) * 0.7)
        .fill({ color: index % 2 ? 0x75bfff : 0xff82d8, alpha: reaction * fade * (0.20 + (index % 5) * 0.08) });
    }

    if (finiteDuration && progress >= 1) this.stop();
  }
}
