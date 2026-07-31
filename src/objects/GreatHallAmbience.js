import { Container, Graphics } from 'pixi.js';
import { ParticleEngine } from '../engine/ParticleEngine.js';
import { PARTICLE_PRESETS } from '../config/particlePresets.js';

/**
 * Floating enchanted ceiling and atmospheric dust for the Great Hall.
 *
 * Candles fill the full upper width. Dust is rendered in a dedicated foreground
 * particle layer and is prewarmed, so the hall never starts with an empty emitter.
 */
export class GreatHallAmbience extends Container {
  constructor({ reducedMotion = false } = {}) {
    super();
    this.reducedMotion = reducedMotion;
    this.elapsed = 0;
    this.candles = [];

    this.farLayer = new Container();
    this.midLayer = new Container();
    this.nearLayer = new Container();
    this.addChild(this.farLayer, this.midLayer, this.nearLayer);

    this.#createCandles(reducedMotion ? 24 : 44);

    // Dust is intentionally added after the candle layers. In v2.2.0 it was
    // technically alive, but too faint and visually buried in the scene.
    this.particles = new ParticleEngine({ quality: 'auto', reducedMotion });
    this.addChild(this.particles);
    this.dustEmitter = this.particles.createEmitter('hallDust', PARTICLE_PRESETS.hallDust);
    this.prewarmDust();
  }

  prewarmDust() {
    this.dustEmitter.burst(this.reducedMotion ? 30 : 96, {
      area: { x: 45, y: 65, width: 1830, height: 900 },
      alpha: [0.30, 0.72],
      size: [1.25, 3.10],
      lifetime: [4800, 9800],
      speedX: [-3.5, 5.5],
      speedY: [-2.4, 1.5],
    });
  }


  #random(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  #createCandles(count) {
    const columns = 11;
    const rows = Math.ceil(count / columns);
    const left = 95;
    const right = 1825;
    const top = 68;
    const bottom = 430;
    const cellW = (right - left) / columns;
    const cellH = (bottom - top) / rows;

    for (let index = 0; index < count; index += 1) {
      const seed = index + 1;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const jitterX = 0.12 + this.#random(seed + 10) * 0.76;
      const jitterY = 0.08 + this.#random(seed + 20) * 0.84;

      let x = left + (column + jitterX) * cellW;
      let y = top + (row + jitterY) * cellH;
      x += Math.sin(seed * 2.13) * (18 + this.#random(seed + 30) * 34);
      y += Math.sin(seed * 1.37) * (10 + this.#random(seed + 40) * 20);

      const depthFromY = (y - top) / (bottom - top);
      const depth = Math.min(1, Math.max(0, depthFromY * 0.82 + this.#random(seed + 50) * 0.18));
      const candle = new Container();
      candle.position.set(x, y);

      const scale = 0.30 + depth * 0.74;
      candle.scale.set(scale);
      candle.alpha = 0.52 + depth * 0.43;
      candle.rotation = (this.#random(seed + 60) - 0.5) * 0.045;

      const halo = new Graphics().circle(0, -7, 13).fill({ color: 0xffcf65, alpha: 0.055 + depth * 0.025 });
      const body = new Graphics().roundRect(-3.1, 1, 6.2, 31, 2).fill({ color: 0xeadbb4, alpha: 0.86 });
      const wick = new Graphics().rect(-0.55, -1, 1.1, 4).fill({ color: 0x46351f, alpha: 0.78 });
      const flame = new Graphics().ellipse(0, -8, 4.3, 9.7).fill({ color: 0xffc94f, alpha: 0.95 });
      const core = new Graphics().ellipse(0, -7, 1.65, 4.7).fill({ color: 0xfff5cf, alpha: 0.98 });

      candle.addChild(halo, body, wick, flame, core);
      const targetLayer = depth < 0.34 ? this.farLayer : depth < 0.69 ? this.midLayer : this.nearLayer;
      targetLayer.addChild(candle);

      this.candles.push({
        candle,
        halo,
        flame,
        core,
        phase: this.#random(seed + 70) * Math.PI * 2,
        speed: 0.00115 + this.#random(seed + 80) * 0.0014,
        baseX: x,
        baseY: y,
        depth,
        floatX: 0.5 + depth * 1.9,
        floatY: 0.8 + depth * 2.8,
      });
    }
  }

  update(deltaMS) {
    this.elapsed += deltaMS;
    for (const item of this.candles) {
      const wave = Math.sin(this.elapsed * item.speed + item.phase);
      const flutter = Math.sin(this.elapsed * item.speed * 4.3 + item.phase * 0.7);
      item.flame.scale.set(1 + wave * 0.07, 1 + wave * 0.13 + flutter * 0.035);
      item.flame.rotation = wave * 0.045 + flutter * 0.018;
      item.core.alpha = 0.80 + (wave + 1) * 0.085;
      item.halo.alpha = 0.72 + (wave + 1) * 0.10;

      if (!this.reducedMotion) {
        item.candle.x = item.baseX + Math.sin(this.elapsed * 0.00021 + item.phase) * item.floatX;
        item.candle.y = item.baseY + Math.cos(this.elapsed * 0.00029 + item.phase) * item.floatY;
      }
    }
    this.particles.update(deltaMS);
  }
}
