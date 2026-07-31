import { Container, Graphics } from 'pixi.js';

const clamp01 = value => Math.max(0, Math.min(1, value));

/**
 * Lightweight 2D lighting compositor.
 * Uses additive screen-space pools rather than expensive per-pixel filters,
 * keeping the ceremony stable on mobile hardware.
 */
export class LightingEngine extends Container {
  constructor({ width = 1920, height = 1080, reducedMotion = false } = {}) {
    super();
    this.eventMode = 'none';
    this.reducedMotion = reducedMotion;
    this.elapsed = 0;
    this.ambientTarget = 0.15;
    this.ambientAmount = this.ambientTarget;
    this.magicTarget = 0;
    this.magicAmount = 0;
    this.magicColor = 0x4ea8ff;
    this.pulse = null;

    this.ambientShade = new Graphics().rect(0, 0, width, height).fill({ color: 0x080611, alpha: 1 });
    this.ambientShade.alpha = this.ambientAmount;
    this.addChild(this.ambientShade);

    this.torchLayer = new Container();
    this.magicLayer = new Container();
    this.highlightLayer = new Container();
    this.addChild(this.torchLayer, this.magicLayer, this.highlightLayer);

    this.magicWash = new Graphics().rect(0, 0, width, height).fill({ color: this.magicColor, alpha: 1 });
    this.magicWash.alpha = 0;
    this.magicLayer.addChild(this.magicWash);

    this.centerBloom = new Graphics()
      .ellipse(width / 2, height * 0.54, width * 0.52, height * 0.48)
      .fill({ color: 0xffffff, alpha: 1 });
    this.centerBloom.alpha = 0;
    this.highlightLayer.addChild(this.centerBloom);

    this.torchLights = [];
  }

  setTorchSources(sources = []) {
    this.torchLayer.removeChildren().forEach(child => child.destroy());
    this.torchLights = sources.map((source, index) => {
      const glow = new Graphics()
        .ellipse(0, 0, 150 * source.scale, 205 * source.scale)
        .fill({ color: 0xff8a32, alpha: 1 });
      glow.position.set(source.x, source.y - 34 * source.scale);
      glow.alpha = 0;
      glow.blendMode = 'add';
      glow._source = source;
      glow._phase = index * 0.71 + source.x * 0.002;
      this.torchLayer.addChild(glow);
      return glow;
    });
  }

  setAmbient(amount, duration = 500) {
    this.ambientTarget = clamp01(Number(amount));
    this.ambientDuration = Math.max(1, Number(duration) || 1);
  }

  setMagic(color, intensity = 0.32, duration = 650) {
    if (typeof color === 'number') this.magicColor = color;
    this.magicWash.tint = this.magicColor;
    this.magicTarget = clamp01(Number(intensity));
    this.magicDuration = Math.max(1, Number(duration) || 1);
  }

  clearMagic(duration = 700) {
    this.magicTarget = 0;
    this.magicDuration = Math.max(1, Number(duration) || 1);
  }

  pulseMagic({ color = this.magicColor, intensity = 0.62, duration = 520 } = {}) {
    this.magicColor = color;
    this.magicWash.tint = color;
    this.pulse = { elapsed: 0, duration: Math.max(80, duration), intensity: clamp01(intensity) };
  }

  update(deltaMS) {
    this.elapsed += deltaMS;
    const t = this.elapsed * 0.001;
    const ambientResponse = Math.min(1, deltaMS / (this.ambientDuration || 500));
    this.ambientAmount += (this.ambientTarget - this.ambientAmount) * ambientResponse;
    this.ambientShade.alpha = this.ambientAmount;

    for (const light of this.torchLights) {
      const source = light._source;
      const ignition = source.ignition ?? 0;
      const flicker = this.reducedMotion
        ? 1
        : 0.92 + Math.sin(t * 7.3 + light._phase) * 0.055 + Math.sin(t * 13.1 + light._phase * 1.7) * 0.025;
      light.alpha = ignition * 0.105 * flicker;
      light.scale.set(0.96 + flicker * 0.045, 0.95 + flicker * 0.065);
    }

    const magicResponse = Math.min(1, deltaMS / (this.magicDuration || 650));
    this.magicAmount += (this.magicTarget - this.magicAmount) * magicResponse;
    let pulseAmount = 0;
    if (this.pulse) {
      this.pulse.elapsed += deltaMS;
      const p = Math.min(1, this.pulse.elapsed / this.pulse.duration);
      pulseAmount = Math.sin(p * Math.PI) * this.pulse.intensity;
      if (p >= 1) this.pulse = null;
    }
    const amount = clamp01(this.magicAmount + pulseAmount);
    this.magicWash.alpha = amount * 0.22;
    this.centerBloom.alpha = amount * 0.095;
    this.centerBloom.tint = this.magicColor;
  }
}
