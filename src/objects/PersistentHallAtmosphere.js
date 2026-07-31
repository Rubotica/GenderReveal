import { Container } from 'pixi.js';
import { GreatHallAmbience } from './GreatHallAmbience.js';
import { TorchFlame } from './TorchFlame.js';
import { FIRE_POSITIONS } from '../config/firePositions.js';

/**
 * Lightweight persistent Great Hall atmosphere used behind the potion and
 * reveal scenes. The normal GreatHallScene owns its own ambience; this layer
 * is only visible while that scene is hidden, so mobile devices never render
 * two full atmosphere systems at once.
 */
export class PersistentHallAtmosphere extends Container {
  constructor({ reducedMotion = false } = {}) {
    super();
    this.visible = false;
    this.renderable = false;
    this.ambience = new GreatHallAmbience({ reducedMotion });
    this.addChild(this.ambience);

    const left = FIRE_POSITIONS.left.map((item, index) => new TorchFlame({ ...item, seed: 104 + index * 7 }));
    const right = FIRE_POSITIONS.right.map((item, index) => new TorchFlame({ ...item, mirror: true, seed: 109 + index * 7 }));
    this.torches = [...left, ...right];
    for (const torch of this.torches) {
      torch.visible = true;
      torch.ignition = 1;
      torch.targetIgnition = 1;
      this.addChild(torch);
    }
  }

  setActive(active) {
    const enabled = Boolean(active);
    this.visible = enabled;
    this.renderable = enabled;
  }

  setDustVisible(visible) {
    this.ambience.particles.visible = Boolean(visible);
  }

  setCandlesVisible(visible) {
    this.ambience.farLayer.visible = Boolean(visible);
    this.ambience.midLayer.visible = Boolean(visible);
    this.ambience.nearLayer.visible = Boolean(visible);
  }

  update(deltaMS) {
    if (!this.visible) return;
    this.ambience.update(deltaMS);
    this.torches.forEach(torch => torch.update(deltaMS));
  }
}
