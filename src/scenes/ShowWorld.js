import { Container, Graphics, Sprite } from 'pixi.js';
import { Hat } from '../objects/Hat.js';
import { SceneManager } from '../engine/SceneManager.js';
import { CameraRig } from '../engine/CameraRig.js';
import { GreatHallScene } from './GreatHallScene.js';
import { PotionScene } from './PotionScene.js';
import { RevealScene } from './RevealScene.js';
import { WhiteoutTransition } from '../objects/WhiteoutTransition.js';
import { LightingEngine } from '../engine/LightingEngine.js';
import { GoldenBuildup } from '../objects/GoldenBuildup.js';
import { PersistentHallAtmosphere } from '../objects/PersistentHallAtmosphere.js';

/**
 * Root scenegraph for the ceremony.
 *
 * cameraLayer contains the complete 1920×1080 world. CameraRig transforms only
 * that layer, while the responsive Viewport remains responsible for fitting the
 * experience to portrait and landscape screens.
 */
export class ShowWorld extends Container {
  constructor(textures) {
    super();
    this.textures = textures;
    this.elapsed = 0;
    this.pauseWaiters = [];

    this.cameraLayer = new Container();
    this.addChild(this.cameraLayer);
    this.camera = new CameraRig(this.cameraLayer);

    this.background = new Sprite(textures.background);
    this.background.width = 1920;
    this.background.height = 1080;
    this.cameraLayer.addChild(this.background);

    this.vignette = new Graphics()
      .rect(0, 0, 1920, 1080)
      .fill({ color: 0x05040a, alpha: 0.22 });
    this.cameraLayer.addChild(this.vignette);

    this.persistentAtmosphere = new PersistentHallAtmosphere({
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    this.cameraLayer.addChild(this.persistentAtmosphere);

    this.sceneLayer = new Container();
    this.cameraLayer.addChild(this.sceneLayer);

    this.hat = new Hat(textures);
    this.scenes = new SceneManager();
    this.greatHallScene = this.scenes.register('greatHall', new GreatHallScene({ hat: this.hat }));
    this.potionScene = this.scenes.register('potion', new PotionScene(textures));
    this.revealScene = this.scenes.register('reveal', new RevealScene({ textures, hat: this.hat }));

    this.sceneLayer.addChild(this.greatHallScene, this.potionScene, this.revealScene);

    this.lighting = new LightingEngine({
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    this.lighting.setTorchSources(this.greatHallScene.torches);
    this.cameraLayer.addChild(this.lighting);

    // Transition lives above all scenes so it can fully hide scene changes.
    this.goldenBuildup = new GoldenBuildup();
    this.cameraLayer.addChild(this.goldenBuildup);

    this.whiteout = new WhiteoutTransition(textures);
    this.cameraLayer.addChild(this.whiteout);
    this.soundscape = null;
  }

  async start() {
    this.camera.preset('greatHall');
    return this.scenes.change('greatHall');
  }

  setSoundscape(soundscape) {
    this.soundscape = soundscape;
    this.potionScene.setSoundscape(soundscape);
  }

  async runIntro() {
    await this.showGreatHall();
    await this.greatHallScene.runIntro(this.soundscape);
  }

  async showGreatHall(preserveIntroState = false) {
    this.camera.preset('greatHall');
    this.lighting.setAmbient(0.12, 700);
    this.lighting.clearMagic(700);
    // GreatHallScene owns the only ceiling-candle and dust system here.
    // Disable the persistent fallback completely before revealing the hall.
    this.persistentAtmosphere.setDustVisible(false);
    this.persistentAtmosphere.setCandlesVisible(false);
    this.persistentAtmosphere.setActive(false);
    return this.scenes.change('greatHall', { preserveIntroState });
  }

  async showPotion() {
    this.soundscape?.whoosh({ volume: 0.36, pan: -0.15, rate: 1.06 });
    this.camera.preset('potion');
    this.lighting.setAmbient(0.2, 550);
    this.lighting.setMagic(0x78c9ff, 0.16, 800);
    this.persistentAtmosphere.setDustVisible(true);
    this.persistentAtmosphere.setCandlesVisible(true);
    this.persistentAtmosphere.setActive(true);
    return this.scenes.change('potion');
  }


  waitForShowTime(duration) {
    const waiter = { remaining: Math.max(0, Number(duration) || 0), resolve: null };
    return new Promise(resolve => { waiter.resolve = resolve; this.pauseWaiters.push(waiter); });
  }

  async startPour() {
    this.potionScene.startPour();

    // Hold until the 5 s pink/blue beams have fully faded (1.75 s delay + 5 s).
    await this.waitForShowTime(6830);
    this.potionScene.beginTransitionSmoke();

    // Start both effects while the smoke is visibly swelling, instead of only
    // after the screen is already white. The beams have fully disappeared at
    // this point, so the audio still cannot overlap the pour beams.
    await this.waitForShowTime(260);
    // The cauldron impact, smoke audio and camera reaction now happen on the
    // same frame, while the smoke begins to expand. There is no shake when the
    // hat becomes visible again after the whiteout.
    this.soundscape?.potionSmoke();
    this.soundscape?.magicComplete();
    this.camera.kick({ strength: 5.2, duration: 520 });
    // Start the whiteout immediately. Resolve this timeline event as soon as
    // the frame is fully covered and the hall has been restored, so the next
    // narration can begin under the clearing smoke without a dead pause.
    await new Promise(resolve => {
      this.whiteout.start(async () => {
        await this.showGreatHall(true);
        resolve();
      }).catch(error => { throw error; });
    });
  }

  startGoldenRevealBuildup(duration = 4300) {
    this.persistentAtmosphere.setActive(true);
    this.lighting.setAmbient(0.045, 900);
    this.lighting.setMagic(0xffc75a, 0.13, 780);
    this.goldenBuildup.start(duration);
    window.setTimeout(() => {
      this.lighting.pulseMagic({ color: 0xffefb0, intensity: 0.34, duration: 760 });
      this.camera.kick({ strength: 1.6, duration: 260 });
    }, Math.max(250, duration - 900));
  }

  async showReveal() {
    // Prevent the outgoing Great Hall atmosphere and the persistent reveal
    // atmosphere from being visible on the same frame. This removes doubled
    // ceiling candles during the transition.
    this.persistentAtmosphere.setActive(false);

    // Synchronise both blue eye and magic overlays with the first frame of the
    // hat's leftward reveal movement.
    this.hat.setEyes('blue');
    this.hat.setMagic('blue');
    this.soundscape?.grandReveal();
    this.camera.kick({ strength: 6, duration: 420 });
    this.lighting.setMagic(0x3f9cff, 0.48, 360);
    this.lighting.pulseMagic({ color: 0xf4fbff, intensity: 0.78, duration: 660 });
    await this.scenes.change('reveal');
    // RevealScene owns all reveal particles. Keep the persistent ambience fully
    // disabled to guarantee that neither dust nor ceiling candles are doubled.
    this.persistentAtmosphere.setDustVisible(false);
    this.persistentAtmosphere.setCandlesVisible(false);
    this.persistentAtmosphere.setActive(false);
    window.setTimeout(() => this.lighting.setMagic(0x3f9cff, 0.18, 1700), 700);
  }

  setMagicLight(value, intensity = 0.32, duration = 650) {
    const colors = { pink: 0xff70cb, blue: 0x4da7ff, white: 0xffffff, off: null };
    if (value === 'off' || value == null) this.lighting.clearMagic(duration);
    else this.lighting.setMagic(colors[value] ?? value, intensity, duration);
  }

  pulseLight(value = 'white', intensity = 0.62, duration = 520) {
    const colors = { pink: 0xff70cb, blue: 0x4da7ff, white: 0xffffff };
    this.lighting.pulseMagic({ color: colors[value] ?? value, intensity, duration });
  }

  cameraFocus(value) {
    this.camera.preset(value);
  }

  cameraShake(strength = 6, duration = 360) {
    this.camera.kick({ strength, duration });
  }

  update(deltaMS, volume) {
    this.elapsed += deltaMS;
    for (const waiter of [...this.pauseWaiters]) {
      waiter.remaining -= deltaMS;
      if (waiter.remaining <= 0) {
        this.pauseWaiters.splice(this.pauseWaiters.indexOf(waiter), 1);
        waiter.resolve?.();
      }
    }
    this.camera.update(deltaMS);
    this.scenes.update(deltaMS, { volume, elapsed: this.elapsed });
    this.persistentAtmosphere.update(deltaMS);
    this.goldenBuildup.update(deltaMS);
    this.whiteout.update(deltaMS);
    this.lighting.update(deltaMS);
  }
}
