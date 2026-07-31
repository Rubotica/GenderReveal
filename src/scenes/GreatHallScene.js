import { BaseScene } from './BaseScene.js';
import { GreatHallAmbience } from '../objects/GreatHallAmbience.js';
import { TorchFlame } from '../objects/TorchFlame.js';
import { AnimationEngine } from '../engine/AnimationEngine.js';
import { FIRE_POSITIONS } from '../config/firePositions.js';
import { LandingSpiral } from '../objects/LandingSpiral.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class GreatHallScene extends BaseScene {
  constructor({ hat }) {
    super('greatHall');
    this.hat = hat;
    this.animations = new AnimationEngine();
    this.ignitionTimers = [];
    this.introRunning = false;
    this.ambience = new GreatHallAmbience({
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    this.addChild(this.ambience);

    const left = FIRE_POSITIONS.left.map((item, index) => new TorchFlame({ ...item, seed: 4 + index * 7 }));
    const right = FIRE_POSITIONS.right.map((item, index) => new TorchFlame({ ...item, mirror: true, seed: 9 + index * 7 }));
    this.fireEntries = [
      ...left.map((torch, sideIndex) => ({ side: 'left', sideIndex, torch })),
      ...right.map((torch, sideIndex) => ({ side: 'right', sideIndex, torch })),
    ];
    this.torchPairs = left.map((torch, index) => [torch, right[index]]);
    this.torches = this.torchPairs.flat();
    this.torches.forEach(torch => this.addChild(torch));
    this.landingSpiral = new LandingSpiral({
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    // Dust is drawn behind the hat and originates at the table contact point.
    this.addChild(this.landingSpiral);
    this.addChild(this.hat);
  }

  resetIntro() {
    this.animations.clear();
    this.ignitionTimers.forEach(clearTimeout);
    this.ignitionTimers.length = 0;
    this.introRunning = false;
    this.torches.forEach(torch => {
      torch.ignition = 0;
      torch.targetIgnition = 0;
      torch.visible = false;
    });
    this.hat.visible = false;
    this.hat.alpha = 0;
    this.hat.position.set(960, -390);
    this.hat.scale.set(0.46);
    this.hat.rotation = -0.18;
  }

  async runIntro(soundscape) {
    if (this.introRunning) return;
    this.introRunning = true;
    this.resetIntro();
    this.introRunning = true;

    // Six deliberate beats: every left/right pair ignites together.
    const ignitionGap = 720;
    await wait(420);
    for (let pairIndex = 0; pairIndex < this.torchPairs.length; pairIndex += 1) {
      const [leftTorch, rightTorch] = this.torchPairs[pairIndex];
      leftTorch.ignite();
      rightTorch.ignite();
      soundscape?.torchPair(pairIndex, this.torchPairs.length);
      window.dispatchEvent(new CustomEvent('torch-pair-ignited', { detail: { pairIndex } }));
      await wait(ignitionGap);
    }

    // The narration must not begin until the hall is lit and the hat has landed.
    await wait(820);
    this.hat.visible = true;
    soundscape?.whoosh({ volume: 0.52, pan: -0.08, rate: 0.94 });

    // The hat now enters through a real shrinking spiral instead of travelling
    // along a straight line. One plain numeric tween drives the whole path,
    // keeping this inexpensive on mobile GPUs.
    const flight = { progress: 0 };
    const arrival = this.animations.to(flight, { progress: 1 }, 2050, {
      easing: 'easeOutCubic',
      onUpdate: (_eased, raw) => {
        const p = Math.max(0, Math.min(1, raw));
        const settle = 1 - Math.pow(1 - p, 3);
        const radius = 720 * Math.pow(1 - p, 1.32);
        const angle = -1.18 * Math.PI + p * Math.PI * 4.25;
        const overhead = 360 * Math.pow(1 - p, 1.9);

        this.hat.x = Math.round(960 + Math.cos(angle) * radius);
        this.hat.y = Math.round(555 - overhead + Math.sin(angle) * radius * 0.48);
        this.hat.scale.set(0.43 + settle * 0.25);
        this.hat.rotation = (1 - p) * 0.42 + Math.sin(angle) * (1 - p) * 0.16;
        this.hat.alpha = Math.min(1, p * 2.8);
      },
      onComplete: () => {
        this.hat.position.set(960, 555);
        this.hat.scale.set(0.68);
        this.hat.rotation = 0;
        this.hat.alpha = 1;
      },
    });
    // Start the V1-style landing glow shortly before the spiral flight ends, so
    // the oval has fully opened and faded at the exact moment the hat settles.
    // This also removes the separate sparkle beat that made the landing feel late.
    let flourish = null;
    const landingTimer = window.setTimeout(() => {
      flourish = this.landingSpiral.start(960, 865, 980);
    }, 1070);

    await arrival.finished;
    window.clearTimeout(landingTimer);
    if (!flourish) flourish = this.landingSpiral.start(960, 865, 240);
    await Promise.race([flourish, wait(180)]);
    await wait(180);
    this.introRunning = false;
  }

  showAllTorchesForEditing(enabled) {
    this.ignitionTimers.forEach(clearTimeout);
    this.ignitionTimers.length = 0;
    this.torches.forEach(torch => {
      if (enabled) {
        torch.visible = true;
        torch.ignition = 1;
        torch.targetIgnition = 1;
      }
    });
    if (!enabled) this.highlightTorch(-1);
  }

  highlightTorch(selectedIndex) {
    this.fireEntries.forEach((entry, index) => {
      entry.torch.glow.tint = index === selectedIndex ? 0x8fd7ff : 0xffffff;
      entry.torch.glow.alpha = index === selectedIndex ? 0.18 : 0.055;
    });
  }

  async enter(context = {}) {
    await super.enter(context);
    // Preserve the existing effect object and restore the intended layer order:
    // landing dust behind the hat rather than through its centre.
    if (!this.landingSpiral) {
      this.landingSpiral = new LandingSpiral({
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    }
    this.addChild(this.landingSpiral);
    this.addChild(this.hat);
    if (!context.preserveIntroState) this.resetIntro();
    else {
      // The scene was not updated while the potion scene was active. Refill the
      // foreground dust before the whiteout clears so there is no empty stretch
      // between the potion and reveal sequences.
      this.ambience.prewarmDust();
      this.hat.visible = true;
      this.hat.alpha = 1;
      this.hat.position.set(960, 555);
      this.hat.scale.set(0.68);
      this.hat.rotation = 0;
      this.torches.forEach(torch => { torch.visible = true; torch.ignition = 1; torch.targetIgnition = 1; });
    }
  }

  update(deltaMS, { volume = 0, elapsed = 0 } = {}) {
    this.animations.update(deltaMS);
    this.ambience.update(deltaMS);
    this.torches.forEach(torch => torch.update(deltaMS));
    this.landingSpiral.update(deltaMS);
    if (this.hat.visible && !this.introRunning) {
      // Rotation on a separate transparent mouth layer creates edge shimmer.
      // Keep the hat almost level while speaking and use vertical drift only.
      this.hat.rotation = Math.sin(elapsed * 0.0007) * 0.0025;
      this.hat.y = Math.round(555 + Math.sin(elapsed * 0.0011) * 4);
      this.hat.x = Math.round(this.hat.x);
    }
    this.hat.updateMouth(volume);
  }

  async exit(context = {}) {
    this.animations.clear();
    this.ignitionTimers.forEach(clearTimeout);
    this.ignitionTimers.length = 0;
    await super.exit(context);
  }
}
