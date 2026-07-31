import { Container, Graphics } from 'pixi.js';

/**
 * Lightweight pooled particle engine for the 1920×1080 show world.
 *
 * The engine deliberately avoids blur filters, render textures and DOM nodes.
 * Emitters share one update loop and automatically scale their particle budget
 * for mobile hardware and reduced-motion users.
 */
export class ParticleEngine extends Container {
  constructor({ quality = 'auto', reducedMotion = false } = {}) {
    super();
    this.elapsed = 0;
    this.reducedMotion = reducedMotion;
    this.quality = quality === 'auto' ? detectQuality() : quality;
    this.emitters = new Map();
  }

  createEmitter(name, options = {}) {
    if (this.emitters.has(name)) return this.emitters.get(name);
    const emitter = new ParticleEmitter({
      ...options,
      qualityScale: this.reducedMotion ? 0.35 : qualityScale(this.quality),
      reducedMotion: this.reducedMotion,
    });
    this.emitters.set(name, emitter);
    this.addChild(emitter);
    return emitter;
  }

  getEmitter(name) {
    return this.emitters.get(name) ?? null;
  }

  removeEmitter(name) {
    const emitter = this.emitters.get(name);
    if (!emitter) return;
    emitter.destroy({ children: true });
    this.emitters.delete(name);
  }

  update(deltaMS) {
    this.elapsed += deltaMS;
    for (const emitter of this.emitters.values()) emitter.update(deltaMS);
  }
}

export class ParticleEmitter extends Container {
  constructor({
    maxParticles = 80,
    spawnRate = 0,
    shape = 'circle',
    color = 0xffffff,
    alpha = [0.2, 0.7],
    size = [1, 3],
    lifetime = [1200, 3500],
    speedX = [-5, 5],
    speedY = [-10, -2],
    gravity = 0,
    rotationSpeed = [-0.001, 0.001],
    area = { x: 0, y: 0, width: 1920, height: 1080 },
    fadeIn = 0.12,
    fadeOut = 0.35,
    qualityScale = 1,
    reducedMotion = false,
    seed = 1,
  } = {}) {
    super();
    this.options = {
      maxParticles: Math.max(1, Math.round(maxParticles * qualityScale)),
      spawnRate: spawnRate * qualityScale,
      shape,
      color,
      alpha,
      size,
      lifetime,
      speedX,
      speedY,
      gravity,
      rotationSpeed,
      area,
      fadeIn,
      fadeOut,
      reducedMotion,
    };
    this.seed = seed;
    this.spawnAccumulator = 0;
    this.particles = [];
    this.active = true;
  }


  burst(count, overrides = {}) {
    const amount = Math.min(
      Math.round(count * (this.options.reducedMotion ? 0.35 : 1)),
      this.options.maxParticles - this.particles.length,
    );
    for (let index = 0; index < amount; index += 1) this.#spawn(overrides);
  }

  update(deltaMS) {
    if (this.active && this.options.spawnRate > 0) {
      this.spawnAccumulator += (deltaMS / 1000) * this.options.spawnRate;
      while (this.spawnAccumulator >= 1 && this.particles.length < this.options.maxParticles) {
        this.#spawn();
        this.spawnAccumulator -= 1;
      }
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const item = this.particles[index];
      item.age += deltaMS;
      const progress = item.age / item.life;
      if (progress >= 1) {
        item.display.destroy();
        this.particles.splice(index, 1);
        continue;
      }

      const seconds = deltaMS / 1000;
      item.vy += this.options.gravity * seconds;
      item.display.x += item.vx * seconds;
      item.display.y += item.vy * seconds;
      item.display.rotation += item.rotationSpeed * deltaMS;

      const fadeInEnd = Math.max(0.001, this.options.fadeIn);
      const fadeOutStart = Math.min(0.999, 1 - this.options.fadeOut);
      let envelope = 1;
      if (progress < fadeInEnd) envelope = progress / fadeInEnd;
      else if (progress > fadeOutStart) envelope = (1 - progress) / (1 - fadeOutStart);
      item.display.alpha = Math.max(0, envelope) * item.alpha;

      const pulse = 1 + Math.sin(item.age * item.pulseSpeed + item.phase) * item.pulseAmount;
      item.display.scale.set(item.baseScale * pulse);
    }
  }

  #spawn(overrides = {}) {
    if (this.particles.length >= this.options.maxParticles) return;
    const area = overrides.area ?? this.options.area;
    const display = createParticleGraphic(
      overrides.shape ?? this.options.shape,
      overrides.color ?? this.options.color,
    );

    const size = randomRange(overrides.size ?? this.options.size, () => this.#random());
    display.position.set(
      area.x + this.#random() * area.width,
      area.y + this.#random() * area.height,
    );
    display.scale.set(size);
    display.rotation = this.#random() * Math.PI * 2;
    display.alpha = 0;
    this.addChild(display);

    this.particles.push({
      display,
      age: 0,
      life: randomRange(overrides.lifetime ?? this.options.lifetime, () => this.#random()),
      alpha: randomRange(overrides.alpha ?? this.options.alpha, () => this.#random()),
      vx: randomRange(overrides.speedX ?? this.options.speedX, () => this.#random()),
      vy: randomRange(overrides.speedY ?? this.options.speedY, () => this.#random()),
      rotationSpeed: randomRange(overrides.rotationSpeed ?? this.options.rotationSpeed, () => this.#random()),
      baseScale: size,
      pulseAmount: overrides.pulseAmount ?? 0.12 + this.#random() * 0.18,
      pulseSpeed: overrides.pulseSpeed ?? 0.0012 + this.#random() * 0.002,
      phase: this.#random() * Math.PI * 2,
    });
  }

  #random() {
    this.seed += 1;
    const value = Math.sin(this.seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }
}

function createParticleGraphic(shape, color) {
  const graphic = new Graphics();
  if (shape === 'spark') {
    graphic.roundRect(-0.45, -2.7, 0.9, 5.4, 0.45).fill({ color, alpha: 1 });
  } else if (shape === 'confetti') {
    graphic.roundRect(-1.7, -3.5, 3.4, 7, 0.7).fill({ color, alpha: 1 });
  } else {
    graphic.circle(0, 0, 1).fill({ color, alpha: 1 });
  }
  return graphic;
}

function randomRange(range, random) {
  if (!Array.isArray(range)) return Number(range) || 0;
  return range[0] + random() * (range[1] - range[0]);
}

function detectQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const mobile = matchMedia('(pointer: coarse)').matches;
  if (mobile && (cores <= 4 || memory <= 4)) return 'low';
  if (mobile || cores <= 6) return 'medium';
  return 'high';
}

function qualityScale(quality) {
  return quality === 'low' ? 0.45 : quality === 'medium' ? 0.72 : 1;
}
