/**
 * Small dependency-free tween engine for Pixi display objects and plain values.
 * Tweens are updated from the main Pixi ticker, so animation timing remains
 * deterministic and pauses with the show.
 */
export class AnimationEngine {
  constructor() {
    this.tweens = new Set();
  }

  to(target, properties, duration = 500, options = {}) {
    const tween = new Tween(target, properties, duration, options);
    this.tweens.add(tween);
    tween.finished.finally(() => this.tweens.delete(tween));
    return tween;
  }

  fromTo(target, from, to, duration = 500, options = {}) {
    assignProperties(target, from);
    return this.to(target, to, duration, options);
  }

  delay(duration = 0) {
    const holder = { value: 0 };
    return this.to(holder, { value: 1 }, duration, { easing: 'linear' }).finished;
  }

  kill(target) {
    for (const tween of this.tweens) {
      if (tween.target === target) tween.cancel();
    }
  }

  clear() {
    for (const tween of this.tweens) tween.cancel();
    this.tweens.clear();
  }

  update(deltaMS) {
    for (const tween of [...this.tweens]) tween.update(deltaMS);
  }
}

class Tween {
  constructor(target, properties, duration, {
    delay = 0,
    easing = 'easeInOutSine',
    onUpdate = null,
    onComplete = null,
  } = {}) {
    this.target = target;
    this.properties = properties;
    this.duration = Math.max(1, Number(duration) || 1);
    this.delay = Math.max(0, Number(delay) || 0);
    this.easing = EASINGS[easing] ?? EASINGS.easeInOutSine;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.elapsed = 0;
    this.started = false;
    this.cancelled = false;
    this.startValues = {};
    this.resolveFinished = null;
    this.finished = new Promise(resolve => { this.resolveFinished = resolve; });
  }

  update(deltaMS) {
    if (this.cancelled) return;
    this.elapsed += deltaMS;
    if (this.elapsed < this.delay) return;

    if (!this.started) {
      this.started = true;
      for (const key of Object.keys(this.properties)) {
        this.startValues[key] = readProperty(this.target, key);
      }
    }

    const raw = Math.min(1, (this.elapsed - this.delay) / this.duration);
    const eased = this.easing(raw);
    for (const [key, endValue] of Object.entries(this.properties)) {
      const startValue = this.startValues[key];
      writeProperty(this.target, key, interpolate(startValue, endValue, eased));
    }
    this.onUpdate?.(eased, raw);

    if (raw >= 1) {
      this.onComplete?.();
      this.resolveFinished?.({ cancelled: false });
      this.cancelled = true;
    }
  }

  cancel() {
    if (this.cancelled) return;
    this.cancelled = true;
    this.resolveFinished?.({ cancelled: true });
  }
}

export const EASINGS = Object.freeze({
  linear: t => t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
});

function interpolate(start, end, amount) {
  if (typeof start === 'number' && typeof end === 'number') {
    return start + (end - start) * amount;
  }
  return amount >= 1 ? end : start;
}

function readProperty(target, key) {
  if (key === 'scale') return target.scale?.x ?? 1;
  return Number(target[key]) || 0;
}

function writeProperty(target, key, value) {
  if (key === 'scale') target.scale?.set(value);
  else target[key] = value;
}

function assignProperties(target, properties) {
  for (const [key, value] of Object.entries(properties)) writeProperty(target, key, value);
}
