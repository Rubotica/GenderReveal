export class OrientationManager {
  constructor(overlay) {
    this.overlay = overlay;
    this.media = window.matchMedia('(orientation: portrait)');
    this.isPhonePortrait = false;
    this.update = this.update.bind(this);
    this.media.addEventListener?.('change', this.update);
    window.addEventListener('resize', this.update, { passive: true });
    window.visualViewport?.addEventListener('resize', this.update, { passive: true });
    window.addEventListener('orientationchange', this.update, { passive: true });
    this.update();
  }

  update() {
    const width = window.visualViewport?.width || window.innerWidth;
    const height = window.visualViewport?.height || window.innerHeight;
    const isPhonePortrait = width < height && Math.min(width, height) < 760;
    this.overlay.hidden = !isPhonePortrait;
    document.body.classList.toggle('phone-portrait', isPhonePortrait);

    if (isPhonePortrait !== this.isPhonePortrait) {
      this.isPhonePortrait = isPhonePortrait;
      window.dispatchEvent(new CustomEvent('show-orientation-change', {
        detail: { isPhonePortrait, width, height },
      }));
    }
  }

  async requestLandscape() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {}
    try {
      await screen.orientation?.lock?.('landscape');
    } catch {}
    this.update();
  }
}
