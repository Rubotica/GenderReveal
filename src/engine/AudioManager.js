export class AudioManager {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.context = null;
    this.analyser = null;
    this.source = null;
    this.samples = null;
  }

  async unlock() {
    this.context ??= new AudioContext();
    if (!this.source) {
      this.source = this.context.createMediaElementSource(this.audio);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = .58;
      this.samples = new Uint8Array(this.analyser.frequencyBinCount);
      this.source.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
    await this.context.resume();
  }

  play(url) {
    return new Promise((resolve, reject) => {
      this.audio.src = url;
      this.audio.currentTime = 0;
      this.audio.onended = resolve;
      this.audio.onerror = () => reject(new Error(`Could not play ${url}`));
      this.audio.play().catch(reject);
    });
  }

  pause() {
    this.audio.pause();
  }

  async resume() {
    await this.context?.resume?.();
    if (this.audio.src && !this.audio.ended) await this.audio.play();
  }

  get paused() { return this.audio.paused; }

  stop() {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  get currentTime() { return this.audio.currentTime || 0; }
  get volumeLevel() {
    if (!this.analyser || !this.samples) return 0;
    this.analyser.getByteFrequencyData(this.samples);
    let sum = 0;
    for (const value of this.samples) sum += value;
    return sum / this.samples.length / 255;
  }
}
