const SFX = {
  ambience: 'assets/sfx/ambience1.mp3',
  torches: [1,2,3,4,5].map(n => `assets/sfx/torch${n}.wav`),
  castle: ['door1','door2','owl1','owl2'].map(name => `assets/sfx/${name}.wav`),
  hatWhoosh: 'assets/sfx/sortinghatarrival.wav',
  magicComplete: 'assets/sfx/magiccomplete.wav',
  grandReveal: 'assets/sfx/grandreveal.wav',
  potionPour: 'assets/sfx/pour.wav',
  potionBubbling: 'assets/sfx/bubbling.wav',
  potionSmoke: 'assets/sfx/smoke.wav',
};

export class SoundscapeManager {
  constructor(audioManager) {
    this.context = audioManager.context;
    this.master = this.context.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.context.destination);
    this.buffers = new Map();
    this.ambienceSource = null;
    this.ambienceGain = null;
    this.randomTimer = 0;
    this.lastTorch = -1;
    this.lastCastle = -1;
  }

  async preload() {
    const paths = [...new Set([SFX.ambience, ...SFX.torches, ...SFX.castle, SFX.hatWhoosh,
      SFX.magicComplete, SFX.grandReveal,
      SFX.potionPour, SFX.potionBubbling, SFX.potionSmoke])];
    await Promise.all(paths.map(async path => {
      const response = await fetch(path, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Could not load sound effect: ${path}`);
      const buffer = await response.arrayBuffer();
      this.buffers.set(path, await this.context.decodeAudioData(buffer.slice(0)));
    }));
  }

  play(path, { volume = 1, pan = 0, rate = 1, loop = false } = {}) {
    const buffer = this.buffers.get(path);
    if (!buffer) return null;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, volume);
    source.connect(gain);
    if (this.context.createStereoPanner) {
      const panner = this.context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master);
    } else gain.connect(this.master);
    source.start();
    return { source, gain };
  }

  startAmbience() {
    this.stopAmbience(0);
    const nodes = this.play(SFX.ambience, { volume: 0.0001, loop: true });
    if (!nodes) return;
    this.ambienceSource = nodes.source;
    this.ambienceGain = nodes.gain;
    const now = this.context.currentTime;
    nodes.gain.gain.setValueAtTime(0.0001, now);
    nodes.gain.gain.exponentialRampToValueAtTime(1.18, now + 1.8);
    this.scheduleCastleEvent();
  }

  stopAmbience(fadeSeconds = 0.45) {
    clearTimeout(this.randomTimer);
    if (!this.ambienceSource || !this.ambienceGain) return;
    const source = this.ambienceSource;
    const gain = this.ambienceGain.gain;
    this.ambienceSource = null;
    this.ambienceGain = null;
    const now = this.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
    gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
    setTimeout(() => { try { source.stop(); } catch {} }, fadeSeconds * 1000 + 80);
  }

  nonRepeating(length, previous) {
    if (length < 2) return 0;
    let index = Math.floor(Math.random() * length);
    if (index === previous) index = (index + 1 + Math.floor(Math.random() * (length - 1))) % length;
    return index;
  }

  scheduleCastleEvent() {
    clearTimeout(this.randomTimer);
    this.randomTimer = setTimeout(() => {
      if (!this.ambienceSource) return;
      if (Math.random() > 0.24) {
        const index = this.nonRepeating(SFX.castle.length, this.lastCastle);
        this.lastCastle = index;
        this.play(SFX.castle[index], { volume: 0.24, pan: -0.6 + Math.random() * 1.2 });
      }
      this.scheduleCastleEvent();
    }, 18000 + Math.random() * 26000);
  }

  torchPair(pairIndex, totalPairs = 6) {
    const pan = totalPairs <= 1 ? 0 : -0.72 + (pairIndex / (totalPairs - 1)) * 1.44;
    const soundIndex = this.nonRepeating(SFX.torches.length, this.lastTorch);
    this.lastTorch = soundIndex;
    this.play(SFX.torches[soundIndex], { volume: 0.46, pan, rate: 0.94 + pairIndex * 0.012 });
  }

  torch(index, total) {
    const soundIndex = this.nonRepeating(SFX.torches.length, this.lastTorch);
    this.lastTorch = soundIndex;
    const pan = total <= 1 ? 0 : -0.78 + (index / (total - 1)) * 1.56;
    this.play(SFX.torches[soundIndex], { volume: 0.34, pan, rate: 0.96 + Math.random() * 0.08 });
  }

  whoosh({ pan = 0, volume = 0.43, rate = 1 } = {}) { this.play(SFX.hatWhoosh, { pan, volume, rate }); }
  magicComplete() { this.play(SFX.magicComplete, { volume: 0.52 }); }
  grandReveal() { this.play(SFX.grandReveal, { volume: 0.96 }); }
  potionPour() { return this.play(SFX.potionPour, { volume: 0.72 }); }
  potionBubbling() { return this.play(SFX.potionBubbling, { volume: 0.68 }); }
  potionSmoke() { return this.play(SFX.potionSmoke, { volume: 0.82 }); }

  stopAll(fadeSeconds = 0.35) {
    this.stopAmbience(fadeSeconds);
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
  }

}
