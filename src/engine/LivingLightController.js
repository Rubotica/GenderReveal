/**
 * Mobile-friendly screen-space atmosphere.
 * Uses only class toggles on fixed overlays: no shaders and no per-frame DOM
 * styling, so it stays inexpensive on mobile devices.
 */
export class LivingLightController {
  constructor({ vignette, flash, reducedMotion = false } = {}) {
    this.vignette = vignette;
    this.flash = flash;
    this.reducedMotion = reducedMotion;
    this.gustTimer = 0;
    this.dipTimer = 0;
    this.nextGust = this.#randomGustDelay();
    this.nextDip = this.#randomDipDelay();
  }

  #randomGustDelay() { return 7000 + Math.random() * 9000; }
  #randomDipDelay() { return 3600 + Math.random() * 5200; }

  ignitePair(pairIndex = 0) {
    if (!this.flash) return;
    this.flash.style.setProperty('--pair', pairIndex);
    this.flash.classList.remove('is-flashing');
    void this.flash.offsetWidth;
    this.flash.classList.add('is-flashing');
  }

  update(deltaMS) {
    if (this.reducedMotion || !this.vignette) return;
    this.gustTimer += deltaMS;
    this.dipTimer += deltaMS;

    if (this.dipTimer >= this.nextDip) {
      this.dipTimer = 0;
      this.nextDip = this.#randomDipDelay();
      this.vignette.classList.remove('is-dipping');
      void this.vignette.offsetWidth;
      this.vignette.classList.add('is-dipping');
    }

    if (this.gustTimer >= this.nextGust) {
      this.gustTimer = 0;
      this.nextGust = this.#randomGustDelay();
      this.vignette.classList.remove('is-gusting');
      void this.vignette.offsetWidth;
      this.vignette.classList.add('is-gusting');
    }
  }
}
