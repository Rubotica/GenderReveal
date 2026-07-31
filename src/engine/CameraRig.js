/**
 * Lightweight cinematic camera for the fixed 1920×1080 show world.
 *
 * The camera never changes the responsive viewport. Instead, it gently moves
 * and scales one internal world container, so every scene keeps its approved
 * composition while gaining film-like zoom, pan and shake.
 */
export class CameraRig {
  constructor(container) {
    this.container = container;
    this.current = { x: 960, y: 540, zoom: 1 };
    this.target = { ...this.current };
    this.velocity = { x: 0, y: 0, zoom: 0 };
    this.shake = { strength: 0, remaining: 0, duration: 0 };
    this.elapsed = 0;

    container.pivot.set(960, 540);
    container.position.set(960, 540);
  }

  focus({ x = 960, y = 540, zoom = 1 } = {}) {
    this.target.x = x;
    this.target.y = y;
    this.target.zoom = zoom;
  }

  preset(name) {
    const presets = {
      greatHall: { x: 960, y: 545, zoom: 1.015 },
      potion: { x: 960, y: 610, zoom: 0.94 },
      reveal: { x: 960, y: 565, zoom: 1.06 },
      wide: { x: 960, y: 540, zoom: 0.92 },
    };
    this.focus(presets[name] ?? presets.greatHall);
  }

  kick({ strength = 6, duration = 360 } = {}) {
    this.shake.strength = Math.max(this.shake.strength, strength);
    this.shake.duration = duration;
    this.shake.remaining = duration;
  }

  update(deltaMS) {
    this.elapsed += deltaMS;
    const dt = Math.min(32, deltaMS) / 1000;

    // Critically damped-ish spring: quick enough to feel intentional, but no
    // abrupt jumps when timeline events switch scenes.
    const stiffness = 18;
    const damping = 8.5;
    for (const key of ['x', 'y', 'zoom']) {
      const displacement = this.target[key] - this.current[key];
      this.velocity[key] += displacement * stiffness * dt;
      this.velocity[key] *= Math.exp(-damping * dt);
      this.current[key] += this.velocity[key];
    }

    let shakeX = 0;
    let shakeY = 0;
    if (this.shake.remaining > 0) {
      this.shake.remaining = Math.max(0, this.shake.remaining - deltaMS);
      const fade = this.shake.remaining / Math.max(1, this.shake.duration);
      const amplitude = this.shake.strength * fade * fade;
      shakeX = Math.sin(this.elapsed * 0.071) * amplitude;
      shakeY = Math.cos(this.elapsed * 0.093) * amplitude * 0.65;
    }

    // Tiny living-camera drift. It is intentionally sub-pixel at normal zoom.
    const driftX = Math.sin(this.elapsed * 0.00019) * 1.8;
    const driftY = Math.cos(this.elapsed * 0.00023) * 1.2;

    this.container.position.set(
      960 + (960 - this.current.x) * this.current.zoom + driftX + shakeX,
      540 + (540 - this.current.y) * this.current.zoom + driftY + shakeY,
    );
    this.container.scale.set(this.current.zoom);
  }
}
