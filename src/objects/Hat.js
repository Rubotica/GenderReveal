import { Container } from 'pixi.js';
import { HatComponent } from '../components/HatComponent.js';
import { HAT_LAYOUT } from '../config/hatLayout.js';

/**
 * Sorting Hat scene object.
 *
 * Visual layers are represented by named HatComponent instances. Behaviour
 * (eyes, magic and speech) is kept here, while all transforms live in the
 * central HAT_LAYOUT configuration.
 */
export class Hat extends Container {
  constructor(textures) {
    super();

    this.sortableChildren = true;
    this.roundPixels = true;
    // Do not assign to `renderGroup`: PixiJS owns that internal object.
    // Overwriting it with a boolean breaks Container.addChild().
    this.isRenderGroup = true;
    this.position.set(HAT_LAYOUT.root.x, HAT_LAYOUT.root.y);
    this.scale.set(HAT_LAYOUT.root.scale);
    this.textures = textures;

    this.components = {
      magicPink: new HatComponent({
        texture: textures.magicPink,
        layout: HAT_LAYOUT.magicPink,
        alpha: 0,
      }),
      magicBlue: new HatComponent({
        texture: textures.magicBlue,
        layout: HAT_LAYOUT.magicBlue,
        alpha: 0,
      }),
      base: new HatComponent({
        texture: textures.hat,
        layout: HAT_LAYOUT.base,
      }),
      eyes: new HatComponent({
        texture: textures.eyesNormal,
        layout: HAT_LAYOUT.eyes,
        states: {
          normal: textures.eyesNormal,
          pink: textures.eyesPink,
          blue: textures.eyesBlue,
        },
      }),
      mouth: new HatComponent({
        texture: textures.mouthClosed,
        layout: HAT_LAYOUT.mouth,
        states: {
          closed: textures.mouthClosed,
          small: textures.mouthSmall,
          medium: textures.mouthMedium,
          open: textures.mouthOpen,
        },
      }),
    };

    for (const component of Object.values(this.components)) {
      this.addChild(component.sprite);
    }

    // Compatibility accessors for the rest of the current engine. These can
    // be removed later once every subsystem talks to named components.
    this.base = this.components.base.sprite;
    this.eyes = this.components.eyes.sprite;
    this.mouth = this.components.mouth.sprite;
    this.magicPink = this.components.magicPink.sprite;
    this.magicBlue = this.components.magicBlue.sprite;

    this.currentMouthState = 'closed';
    this.lastMouthChangeAt = 0;
    this.minimumMouthHoldMS = 110;
    this.smoothedMouthLevel = 0;
    this.mouthAttack = 0.34;
    this.mouthRelease = 0.16;

  }


  setEyes(value) {
    this.components.eyes.setState(value) || this.components.eyes.setState('normal');
  }

  setMagic(value) {
    this.components.magicPink.setAlpha(value === 'pink' ? 1 : 0);
    this.components.magicBlue.setAlpha(value === 'blue' ? 1 : 0);
  }

  updateMouth(level, now = performance.now()) {
    const safeLevel = Number.isFinite(level) ? Math.max(0, level) : 0;
    const smoothing = safeLevel > this.smoothedMouthLevel
      ? this.mouthAttack
      : this.mouthRelease;

    this.smoothedMouthLevel += (safeLevel - this.smoothedMouthLevel) * smoothing;

    const thresholds = this.currentMouthState === 'open'
      ? { open: 0.21, medium: 0.125, small: 0.055 }
      : this.currentMouthState === 'medium'
        ? { open: 0.245, medium: 0.115, small: 0.052 }
        : { open: 0.255, medium: 0.145, small: 0.065 };

    const nextState = this.smoothedMouthLevel > thresholds.open
      ? 'open'
      : this.smoothedMouthLevel > thresholds.medium
        ? 'medium'
        : this.smoothedMouthLevel > thresholds.small
          ? 'small'
          : 'closed';

    if (
      nextState === this.currentMouthState
      || now - this.lastMouthChangeAt < this.minimumMouthHoldMS
    ) {
      return;
    }

    this.currentMouthState = nextState;
    this.lastMouthChangeAt = now;
    this.components.mouth.setState(nextState);
    // Keep the transparent mouth overlay aligned to whole device pixels.
    this.mouth.position.set(Math.round(this.mouth.x), Math.round(this.mouth.y));
  }
}
