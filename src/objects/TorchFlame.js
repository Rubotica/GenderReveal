import { Container, Graphics } from 'pixi.js';

function flameTongue(color, alpha, width, height, x = 0, y = 0, curve = 0) {
  const g = new Graphics();
  g.moveTo(x, y)
    .bezierCurveTo(x - width * 0.58, y - height * 0.2, x - width * 0.28 + curve, y - height * 0.7, x + curve, y - height)
    .bezierCurveTo(x + width * 0.35 + curve, y - height * 0.7, x + width * 0.58, y - height * 0.2, x, y)
    .fill({ color, alpha });
  return g;
}

/** Procedural wall flame with all tongues rooted in one compact base. */
export class TorchFlame extends Container {
  constructor({ x = 0, y = 0, mirror = false, seed = 1, scale = 1 } = {}) {
    super();
    this.position.set(x, y);
    this.baseScale = scale;
    this.mirrorSign = mirror ? -1 : 1;
    this.seed = seed;
    this.elapsed = 0;
    this.ignition = 0;
    this.targetIgnition = 0;
    this.ignitionBurstElapsed = 9999;
    this.visible = false;

    this.glow = new Graphics().ellipse(0, -34, 46, 66).fill({ color: 0xff7620, alpha: 0.055 });
    this.outer = flameTongue(0xd94718, 0.62, 18, 55, 0, 0, 2.5);
    this.sideTongueA = flameTongue(0xff6d1e, 0.48, 6.2, 28, -4.8, -0.5, -1.5);
    this.sideTongueB = flameTongue(0xffa735, 0.44, 5.4, 24, 4.6, -0.8, 1.3);
    this.middle = flameTongue(0xff9427, 0.78, 13, 45, -0.5, 0, 1.5);
    this.inner = flameTongue(0xffcf63, 0.84, 7.6, 33, 0.6, 0, -0.7);
    this.core = flameTongue(0xffedb2, 0.76, 3.8, 21, 0, 0, 0.3);
    this.addChild(this.glow, this.outer, this.sideTongueA, this.sideTongueB, this.middle, this.inner, this.core);

    this.sparks = Array.from({ length: 4 }, (_, index) => {
      const spark = new Graphics().circle(0, 0, index === 0 ? 1.15 : 0.8).fill({ color: 0xffb95a, alpha: 1 });
      spark._phase = (seed * 0.37 + index * 0.23) % 1;
      spark._drift = 4 + index * 2.1;
      this.addChild(spark);
      return spark;
    });
    this.scale.set(0.001);
  }

  ignite() {
    this.visible = true;
    this.targetIgnition = 1;
    this.ignitionBurstElapsed = 0;
  }
  extinguish() { this.targetIgnition = 0; }

  update(deltaMS) {
    this.elapsed += deltaMS;
    this.ignitionBurstElapsed += deltaMS;
    const response = this.targetIgnition > this.ignition ? 235 : 320;
    this.ignition += (this.targetIgnition - this.ignition) * Math.min(1, deltaMS / response);
    if (this.ignition < 0.003 && this.targetIgnition === 0) this.visible = false;

    const t = this.elapsed * 0.001;
    const flicker = 1 + Math.sin(t * 11.7 + this.seed) * 0.04 + Math.sin(t * 18.9 + this.seed * 1.7) * 0.018;
    const widthFlicker = 1 + Math.sin(t * 8.6 + this.seed * 0.8) * 0.045;
    const sway = Math.sin(t * 3.8 + this.seed) * 0.038;
    // A clearly visible ignition pop: the flame rapidly grows beyond its final
    // size, dips slightly below it, then settles. This scale is driven directly
    // by elapsed ignition time so it cannot be hidden by the slower ignition
    // interpolation. Only transforms are changed, keeping it mobile-friendly.
    let burstScale;
    const burstMS = this.ignitionBurstElapsed;
    if (this.targetIgnition > 0 && burstMS < 130) {
      const p = burstMS / 130;
      burstScale = 0.16 + (1.48 - 0.16) * (1 - Math.pow(1 - p, 3));
    } else if (this.targetIgnition > 0 && burstMS < 285) {
      const p = (burstMS - 130) / 155;
      burstScale = 1.48 + (0.91 - 1.48) * (p * p * (3 - 2 * p));
    } else if (this.targetIgnition > 0 && burstMS < 470) {
      const p = (burstMS - 285) / 185;
      burstScale = 0.91 + (1.0 - 0.91) * (1 - Math.pow(1 - p, 3));
    } else {
      burstScale = Math.max(0.001, this.ignition);
    }
    const ignitionScale = Math.max(0.001, burstScale * this.baseScale);
    this.scale.x = this.mirrorSign * ignitionScale * widthFlicker;
    this.scale.y = ignitionScale * flicker;
    this.rotation = sway;

    this.glow.alpha = (0.04 + Math.sin(t * 5.8 + this.seed) * 0.009) * this.ignition;
    this.outer.skew.x = Math.sin(t * 4.2 + this.seed) * 0.075;
    this.middle.skew.x = Math.sin(t * 5.3 + this.seed + 1.2) * 0.07;
    this.inner.skew.x = Math.sin(t * 6.4 + this.seed + 2.1) * 0.055;
    this.sideTongueA.scale.y = 0.91 + Math.sin(t * 7.2 + this.seed) * 0.1;
    this.sideTongueB.scale.y = 0.9 + Math.sin(t * 8.1 + this.seed + 1.8) * 0.095;

    for (let i = 0; i < this.sparks.length; i += 1) {
      const spark = this.sparks[i];
      const cycle = (t * (0.23 + i * 0.025) + spark._phase) % 1;
      spark.x = Math.sin(cycle * 9.5 + this.seed) * spark._drift;
      spark.y = -34 - cycle * (46 + i * 7);
      spark.alpha = Math.sin(cycle * Math.PI) * 0.42 * this.ignition;
      spark.scale.set(0.42 + cycle * 0.34);
    }
  }
}
