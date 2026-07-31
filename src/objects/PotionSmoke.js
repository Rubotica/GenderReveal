import { Container, Sprite } from 'pixi.js';
import { ParticleEngine } from '../engine/ParticleEngine.js';

/** Local cauldron smoke uses only smoke2, avoiding hard-edged side assets. */
export class PotionSmoke extends Container {
  constructor(textures, { reducedMotion = false } = {}) {
    super();
    this.elapsed = 0;
    this.activeSmoke = false;
    this.baseTarget = 0;

    this.plumes = Array.from({ length: 5 }, (_, index) => {
      const sprite = new Sprite(textures.smoke2);
      sprite.anchor.set(0.5, 0.84);
      sprite.alpha = 0;
      sprite._phase = index * 1.37;
      sprite._baseScale = 0.23 + index * 0.028;
      sprite._baseX = (index - 2) * 22;
      sprite._baseY = -28 - index * 12;
      sprite.position.set(sprite._baseX, sprite._baseY);
      sprite.scale.set(sprite._baseScale);
      this.addChild(sprite);
      return sprite;
    });

    this.particles = new ParticleEngine({ quality: 'auto', reducedMotion });
    this.addChild(this.particles);
    this.motes = this.particles.createEmitter('potionMotes', {
      maxParticles: 78,
      spawnRate: 0,
      color: 0xd8efff,
      alpha: [0.12, 0.42],
      size: [1.1, 2.7],
      lifetime: [1450, 3100],
      speedX: [-16, 16],
      speedY: [-62, -24],
      area: { x: -72, y: -60, width: 144, height: 22 },
      fadeIn: 0.14,
      fadeOut: 0.62,
      seed: 74,
    });
  }

  start() {
    this.activeSmoke = true;
    this.baseTarget = 0.58;
    this.motes.active = true;
    this.motes.options.spawnRate = 14;
    this.motes.burst(18);
  }

  intensify() {
    this.activeSmoke = true;
    this.baseTarget = 0.82;
    this.motes.active = true;
    this.motes.options.spawnRate = 28;
    this.motes.burst(44, {
      color: 0xeaf7ff,
      size: [1.4, 3.8],
      speedX: [-30, 30],
      speedY: [-92, -36],
    });
  }

  calm() {
    this.activeSmoke = false;
    this.baseTarget = 0.2;
    this.motes.options.spawnRate = 3;
  }

  reset() {
    this.activeSmoke = false;
    this.baseTarget = 0;
    this.motes.active = false;
    this.motes.options.spawnRate = 0;
    for (const plume of this.plumes) plume.alpha = 0;
  }

  update(deltaMS) {
    this.elapsed += deltaMS;
    this.particles.update(deltaMS);
    const t = this.elapsed * 0.001;

    this.plumes.forEach((plume, index) => {
      const target = Math.max(0, this.baseTarget - index * 0.055);
      plume.alpha += (target - plume.alpha) * Math.min(1, deltaMS / 760);
      plume.x = plume._baseX + Math.sin(t * (0.47 + index * 0.045) + plume._phase) * (13 + index * 3.5);
      plume.y = plume._baseY - Math.sin(t * 0.58 + plume._phase) * (5 + index * 1.2);
      plume.rotation = Math.sin(t * 0.34 + plume._phase) * 0.105;
      const breathe = 1 + Math.sin(t * 0.51 + plume._phase) * 0.07;
      plume.scale.set(plume._baseScale * breathe, plume._baseScale * (1.02 + Math.sin(t * 0.43 + plume._phase) * 0.09));
    });
  }
}
