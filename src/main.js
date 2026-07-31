import { Application } from 'pixi.js';
import { AssetManager } from './engine/AssetManager.js';
import { AudioManager } from './engine/AudioManager.js';
import { TimelineManager } from './engine/TimelineManager.js';
import { Viewport } from './engine/Viewport.js';
import { SubtitleManager } from './ui/SubtitleManager.js';
import { ShowWorld } from './scenes/ShowWorld.js';
import { SoundscapeManager } from './engine/SoundscapeManager.js';
import { OrientationManager } from './engine/OrientationManager.js';
import { LivingLightController } from './engine/LivingLightController.js';
import { AdaptivePerformanceManager } from './engine/AdaptivePerformanceManager.js';
import { StartCandleOrbit } from './ui/StartCandleOrbit.js';

const start = document.querySelector('#start-button');
const status = document.querySelector('#status');
const startScreen = document.querySelector('#start-screen');
const prediction = document.querySelector('#prediction');
const choiceConfirmation = document.querySelector('#choice-confirmation');
const endCeremony = document.querySelector('#end-ceremony');
const audio = new AudioManager();
new StartCandleOrbit(document.querySelector('.start-candles'), document.querySelector('.start-card'), {
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});
const orientation = new OrientationManager(document.querySelector('#orientation-gate'));
const livingLight = new LivingLightController({
  vignette: document.querySelector('#living-vignette'),
  flash: document.querySelector('#firelight-flash'),
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});
window.addEventListener('torch-pair-ignited', event => livingLight.ignitePair(event.detail.pairIndex));

const app = new Application();
const mobileLike = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
await app.init({
  width: Math.round(window.visualViewport?.width || window.innerWidth),
  height: Math.round(window.visualViewport?.height || window.innerHeight),
  antialias: !mobileLike,
  autoDensity: true,
  resolution: Math.min(devicePixelRatio || 1, mobileLike ? 1.2 : 1.5),
  background: '#05040a',
  preference: 'webgl',
  powerPreference: 'high-performance',
});
document.querySelector('#app').appendChild(app.canvas);
const adaptivePerformance = new AdaptivePerformanceManager(app, { mobileLike });
app.ticker.maxFPS = 60;
app.ticker.minFPS = 30;
document.body.dataset.performanceQuality = mobileLike ? 'mobile-auto' : 'desktop';

const viewport = new Viewport(1920, 1080, { mobileLike });
app.stage.addChild(viewport);

// Mobile browsers report intermediate dimensions while the URL bar,
// fullscreen state and orientation are settling. Resize the renderer from the
// visual viewport and repeat for a few frames so scene/camera coordinates can
// never remain based on the old portrait dimensions.
let resizeFrame = 0;
let resizeTimer = 0;
const applyViewportSize = () => {
  const width = Math.max(1, Math.round(window.visualViewport?.width || window.innerWidth));
  const height = Math.max(1, Math.round(window.visualViewport?.height || window.innerHeight));
  app.renderer.resize(width, height);
  viewport.resize(width, height);
};
const settleViewport = () => {
  cancelAnimationFrame(resizeFrame);
  clearTimeout(resizeTimer);
  let frames = 0;
  const settle = () => {
    applyViewportSize();
    frames += 1;
    if (frames < 6) resizeFrame = requestAnimationFrame(settle);
  };
  resizeFrame = requestAnimationFrame(settle);
  resizeTimer = window.setTimeout(applyViewportSize, 260);
};
applyViewportSize();
window.addEventListener('resize', settleViewport, { passive: true });
window.addEventListener('orientationchange', settleViewport, { passive: true });
window.visualViewport?.addEventListener('resize', settleViewport, { passive: true });

const assets = await new AssetManager().load(progress => {
  status.textContent = `Loading the ancient magic… ${Math.round(progress * 100)}%`;
});

const world = new ShowWorld(assets);
viewport.addChild(world);
await world.start();


let soundscape = null;
const subtitles = new SubtitleManager(document.querySelector('#subtitle'));
const timelineData = await fetch('data/timeline.json').then(response => {
  if (!response.ok) throw new Error(`Could not load timeline (${response.status}).`);
  return response.json();
});

async function dispatch(event) {
  switch (event.type) {
    case 'eyes':
      world.hat.setEyes(event.value);
      break;
    case 'magic':
      world.hat.setMagic(event.value);
      if (event.value === 'pink' || event.value === 'blue') world.setMagicLight(event.value, 0.28, 520);
      else if (event.value === 'off' || event.value === 'none') world.setMagicLight('off', 0, 650);
      break;
    case 'lightColor':
    case 'LIGHT_COLOR':
      world.setMagicLight(event.value, Number(event.intensity) || 0.32, Number(event.duration) || 650);
      break;
    case 'lightPulse':
    case 'LIGHT_PULSE':
      world.pulseLight(event.value || 'white', Number(event.intensity) || 0.62, Number(event.duration) || 520);
      break;
    case 'lightAmbient':
    case 'LIGHT_INTENSITY':
      world.lighting.setAmbient(Number(event.value) || 0, Number(event.duration) || 500);
      break;
    case 'showPotionScene':
      await world.showPotion();
      break;
    case 'startPotionPour':
      await world.startPour();
      break;
    case 'showChoices':
      prediction.hidden = false;
      await new Promise(resolve => {
        prediction.querySelectorAll('button').forEach(button => {
          button.onclick = async () => {
            const choice = button.dataset.choice;
            choiceConfirmation.querySelector('strong').textContent = choice === 'boy' ? 'A BOY' : 'A GIRL';
            choiceConfirmation.dataset.choice = choice;
            // Remove the previous spoken subtitle immediately. Keep the choice
            // confirmation visible for the complete configured pause; the
            // next scene's hideChoices event removes it exactly when the next
            // narration begins.
            subtitles.clear();
            choiceConfirmation.hidden = false;
            prediction.classList.add('has-choice');
            prediction.querySelectorAll('button').forEach(item => {
              item.disabled = true;
              item.hidden = item.dataset.choice !== choice;
            });
            resolve();
          };
        });
      });
      break;
    case 'hideChoices':
      prediction.hidden = true;
      prediction.classList.remove('has-choice');
      choiceConfirmation.hidden = true;
      prediction.querySelectorAll('button').forEach(item => { item.disabled = false; item.hidden = false; });
      break;
    case 'startGoldenBuildup':
      world.startGoldenRevealBuildup(Number(event.duration) || 4300);
      break;
    case 'showReveal':
      await world.showReveal();
      break;
    case 'camera':
      world.cameraFocus(event.value);
      break;
    case 'sound':
      if (event.value === 'whoosh') soundscape?.whoosh({ volume: Number(event.volume) || 0.42, pan: Number(event.pan) || 0 });
      else if (event.value === 'complete') soundscape?.magicComplete();
      else if (event.value === 'reveal') soundscape?.grandReveal();
      break;
    case 'cameraShake':
      world.cameraShake(Math.min(Number(event.strength) || 6, 8), Number(event.duration) || 360);
      break;
    case 'border':
      document.body.dataset.border = event.value;
      break;
    case 'pause':
      await new Promise(resolve => window.setTimeout(resolve, event.duration || 0));
      break;
    default:
      break;
  }
}

// Every scene already carries its intended end pause in timeline.json.
// Do not add a second hidden one-second gap between narration fragments.
const timeline = new TimelineManager({ audio, subtitles, events: dispatch, interSceneGapMS: 0 });
let ceremonyRunning = false;
let orientationPaused = false;

window.addEventListener('show-orientation-change', async event => {
  settleViewport();
  if (!ceremonyRunning) return;

  if (event.detail.isPhonePortrait && !orientationPaused) {
    orientationPaused = true;
    audio.pause();
    // Suspending the shared AudioContext freezes ambience and SFX as well as
    // preventing new WebAudio sounds from progressing behind the rotate gate.
    await audio.context?.suspend?.().catch(() => {});
    app.ticker.stop();
  } else if (!event.detail.isPhonePortrait && orientationPaused) {
    // First rebuild the renderer/viewport using the final landscape size, then
    // continue the exact same scene and narration position.
    settleViewport();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await audio.context?.resume?.().catch(() => {});
    app.ticker.start();
    await audio.resume().catch(() => {});
    orientationPaused = false;
  }
});
app.ticker.add(ticker => {
  world.update(ticker.deltaMS, audio.volumeLevel);
  livingLight.update(ticker.deltaMS);
  adaptivePerformance.update(ticker.deltaMS);
});

status.textContent = 'The ancient magic is ready.';
start.disabled = false;
let ceremonyStarting = false;
start.addEventListener('click', async () => {
  if (ceremonyStarting) return;
  ceremonyStarting = true;
  start.disabled = true;
  try {
    await orientation.requestLandscape();
    await audio.unlock();
    soundscape = new SoundscapeManager(audio);
    status.textContent = 'Loading cinematic soundscape…';
    await soundscape.preload();
    world.setSoundscape(soundscape);
    soundscape.startAmbience();
    startScreen.hidden = true;
    startScreen.setAttribute('aria-hidden', 'true');
    startScreen.style.display = 'none';
    document.body.classList.add('show-running');
    ceremonyRunning = true;
    settleViewport();
    await world.runIntro();
    await timeline.run(timelineData);
    window.setTimeout(() => { endCeremony.hidden = false; }, 2800);
  } catch (error) {
    console.error(error);
    startScreen.hidden = false;
    startScreen.removeAttribute('aria-hidden');
    startScreen.style.removeProperty('display');
    document.body.classList.remove('show-running');
    status.textContent = `Something went wrong: ${error.message}`;
    ceremonyRunning = false;
    ceremonyStarting = false;
    start.disabled = false;
  }
});

endCeremony?.addEventListener('click', async () => {
  endCeremony.hidden = true;
  ceremonyRunning = false;
  orientationPaused = false;
  app.ticker.start();
  audio.stop();
  soundscape?.stopAll(0.28);
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch (error) {
    // Some mobile browsers do not allow programmatic fullscreen exit.
    void error;
  }
});
