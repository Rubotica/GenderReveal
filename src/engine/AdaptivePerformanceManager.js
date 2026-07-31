/**
 * Conservatively lowers render resolution when sustained frame time indicates
 * that a mobile device is struggling. It never raises quality mid-ceremony,
 * preventing visible resolution oscillation during cinematic moments.
 */
export class AdaptivePerformanceManager {
  constructor(app, { mobileLike = false } = {}) {
    this.app = app;
    this.mobileLike = mobileLike;
    this.elapsed = 0;
    this.samples = 0;
    this.totalDelta = 0;
    this.adjusted = false;
  }

  update(deltaMS) {
    if (this.adjusted || !this.mobileLike || document.hidden) return;
    if (!Number.isFinite(deltaMS) || deltaMS <= 0 || deltaMS > 100) return;

    this.elapsed += deltaMS;
    this.totalDelta += deltaMS;
    this.samples += 1;
    if (this.elapsed < 6500 || this.samples < 120) return;

    const averageDelta = this.totalDelta / this.samples;
    const estimatedFPS = 1000 / averageDelta;
    if (estimatedFPS < 47 && this.app.renderer.resolution > 1) {
      this.app.renderer.resolution = 1;
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      document.body.dataset.performanceQuality = 'adaptive-low';
    } else {
      document.body.dataset.performanceQuality = 'stable';
    }
    this.adjusted = true;
  }
}
