import { Assets } from 'pixi.js';

const manifest = {
  background: 'assets/background.webp', hat: 'assets/hat_base.webp',
  eyesNormal: 'assets/eyes_normal.webp', eyesPink: 'assets/eyes_pink.webp', eyesBlue: 'assets/eyes_blue.webp',
  mouthClosed: 'assets/mouth_closed.webp', mouthSmall: 'assets/mouth_small.webp', mouthMedium: 'assets/mouth_medium.webp', mouthOpen: 'assets/mouth_open.webp',
  magicPink: 'assets/magic_pink.webp', magicBlue: 'assets/magic_blue.webp',
  wizard: 'assets/wizard.webp', witch: 'assets/witch.webp',
  cauldron: 'assets/cauldron.webp', cauldronBottom: 'assets/cauldron_bottom.webp', rIdle: 'assets/R_idle.webp', iIdle: 'assets/I_idle.webp',
  rHold: 'assets/R_hold_potion.webp', iHold: 'assets/I_hold_potion.webp', rPour: 'assets/R_pour.webp', iPour: 'assets/I_pour.webp',
  smoke1: 'assets/smoke1.webp', smoke2: 'assets/smoke2.webp', smoke3: 'assets/smoke3.webp',
};

export class AssetManager {
  async load(onProgress = () => {}) {
    const entries = Object.entries(manifest);
    const textures = {};
    let completed = 0;
    let cursor = 0;
    const workerCount = Math.min(4, entries.length);

    const worker = async () => {
      while (cursor < entries.length) {
        const index = cursor++;
        const [key, url] = entries[index];
        textures[key] = await Assets.load(url);
        completed += 1;
        onProgress(completed / entries.length);
      }
    };

    await Promise.all(Array.from({ length: workerCount }, worker));
    return textures;
  }
}
