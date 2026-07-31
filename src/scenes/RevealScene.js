import { Graphics, Sprite, Text } from 'pixi.js';
import { BaseScene } from './BaseScene.js';
import { ParticleEngine } from '../engine/ParticleEngine.js';
import { AnimationEngine } from '../engine/AnimationEngine.js';
import { SHOW_LAYOUT } from '../engine/AnchorLayout.js';
import { CINEMATIC_LAYOUT } from '../engine/CinematicLayout.js';
import { PARTICLE_PRESETS } from '../config/particlePresets.js';

/** Cinematic reveal driven by the reusable REVEAL_TRIPTYCH composition. */
export class RevealScene extends BaseScene {
  constructor({ textures, hat }) {
    super('reveal');
    this.hat = hat;
    this.animations = new AnimationEngine();

    this.wizard = new Sprite(textures.wizard);
    this.wizard.anchor.set(0.5);

    this.label = new Text({
      text: 'BOY!',
      style: {
        fontFamily: 'Georgia',
        fontSize: 205,
        fontWeight: '900',
        fill: 0xa5ddff,
        stroke: { color: 0x102a55, width: 12 },
        dropShadow: { color: 0x000000, blur: 20, distance: 8, alpha: 0.9 },
      },
    });
    this.label.anchor.set(0.5);

    this.particles = new ParticleEngine({
      quality: 'auto',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    this.magicEmitter = this.particles.createEmitter('revealMagic', PARTICLE_PRESETS.revealMagic);
    this.glitterEmitter = this.particles.createEmitter('revealGlitter', PARTICLE_PRESETS.revealGlitter);
    this.mistEmitter = this.particles.createEmitter('revealMist', PARTICLE_PRESETS.revealMist);
    this.cascadeEmitter = this.particles.createEmitter('revealCascade', PARTICLE_PRESETS.revealCascade);
    this.cascadeEmitter.active = false;

    // Three broad translucent shapes create a permanent top-down magical glow
    // without blur filters or render textures. This remains cheap on mobile.
    this.topGlow = new Graphics()
      .ellipse(960, 70, 1450, 620).fill({ color: 0x67bfff, alpha: 0.17 })
      .ellipse(960, 95, 980, 470).fill({ color: 0xe7f9ff, alpha: 0.12 })
      .rect(0, 0, 1920, 520).fill({ color: 0x59b5ff, alpha: 0.075 });
    this.topGlow.alpha = 0;

    this.addChild(this.topGlow, this.particles, this.wizard, this.label);
  }

  async enter(context = {}) {
    await super.enter(context);
    this.animations.clear();
    this.cascadeEmitter.options.area = { x: 55, y: -35, width: 1810, height: 180 };
    this.cascadeEmitter.options.size = [1.8, 4.2];
    this.cascadeEmitter.options.alpha = [0.36, 0.82];
    this.cascadeEmitter.options.speedY = [52, 112];
    this.cascadeEmitter.options.lifetime = [4600, 8200];
    this.cascadeEmitter.active = true;
    this.topGlow.alpha = 0;
    this.addChildAt(this.hat, 2);
    this.alpha = 1;

    const hatEnd = CINEMATIC_LAYOUT.resolve('REVEAL_TRIPTYCH', 'hat');
    const wizardEnd = CINEMATIC_LAYOUT.resolve('REVEAL_TRIPTYCH', 'wizard');
    const labelEnd = CINEMATIC_LAYOUT.resolve('REVEAL_TRIPTYCH', 'title');
    const burst = CINEMATIC_LAYOUT.resolve('REVEAL_TRIPTYCH', 'burst');

    this.hat.visible = true;
    this.hat.position.set(hatEnd.x + hatEnd.enterFromX, hatEnd.y + hatEnd.enterFromY);
    this.hat.scale.set(hatEnd.scale * 0.83);
    this.hat.alpha = 0;

    this.wizard.position.set(wizardEnd.x + wizardEnd.enterFromX, wizardEnd.y + wizardEnd.enterFromY);
    this.wizard.scale.set(wizardEnd.scale * 0.83);
    this.wizard.alpha = 0;

    this.label.position.set(labelEnd.x + labelEnd.enterFromX, labelEnd.y + labelEnd.enterFromY);
    this.label.scale.set(0.72);
    this.label.alpha = 0;

    // The emitters still own their particle physics, but their spawn area now
    // follows the cinematic composition instead of containing scene coordinates.
    const centerArea = { x: burst.x - 180, y: burst.y - 90, width: 360, height: 250 };
    const wideArea = { x: burst.x - 245, y: burst.y - 150, width: 490, height: 330 };
    this.magicEmitter.options.area = centerArea;
    this.glitterEmitter.options.area = wideArea;
    this.mistEmitter.options.area = { x: burst.x - 210, y: burst.y - 55, width: 420, height: 220 };

    this.animations.to(this.hat, { x: hatEnd.x, y: hatEnd.y, scale: hatEnd.scale, alpha: 1 }, 850, { easing: 'easeOutCubic' });
    this.animations.to(this.wizard, { x: wizardEnd.x, y: wizardEnd.y, scale: wizardEnd.scale, alpha: 1 }, 950, { delay: 100, easing: 'easeOutCubic' });
    this.animations.to(this.label, { x: labelEnd.x, y: labelEnd.y, scale: labelEnd.scale, alpha: 1 }, 720, { delay: 260, easing: 'easeOutBack' });
    this.animations.to(this.topGlow, { alpha: 1 }, 1500, { delay: 520, easing: 'easeOutCubic' });

    this.mistEmitter.burst(34);
    this.magicEmitter.burst(220);
    window.setTimeout(() => this.glitterEmitter.burst(90), 950);
    this.glitterEmitter.burst(185);
  }

  async exit(context = {}) {
    this.animations.clear();
    this.cascadeEmitter.active = false;
    this.topGlow.alpha = 0;
    await super.exit(context);
    SHOW_LAYOUT.place(this.hat, 'CENTER', { offsetY: -18 });
    this.hat.scale.set(0.68);
    this.hat.alpha = 1;
  }

  update(deltaMS, { volume = 0, elapsed = 0 } = {}) {
    this.animations.update(deltaMS);
    this.hat.rotation = Math.sin(elapsed * 0.0007) * 0.008;
    this.hat.y += Math.sin(elapsed * 0.0011) * 0.035;
    this.hat.updateMouth(volume);
    this.wizard.y += Math.sin(elapsed * 0.0014) * 0.04;
    this.topGlow.alpha = Math.max(0, Math.min(1, this.topGlow.alpha + Math.sin(elapsed * 0.00065) * 0.0015));
    this.particles.update(deltaMS);
  }
}
