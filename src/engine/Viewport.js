import { Container } from 'pixi.js';

/**
 * Fits the fixed 1920×1080 show world to the physical browser viewport.
 *
 * Desktop uses `contain`, preserving the complete composition. Phone landscape
 * uses a small `cover` crop so modern wide screens do not show black bars.
 */
export class Viewport extends Container {
  constructor(width = 1920, height = 1080, { mobileLike = false, mobileOverscan = 1.015 } = {}) {
    super();
    this.designWidth = width;
    this.designHeight = height;
    this.mobileLike = mobileLike;
    this.mobileOverscan = mobileOverscan;
    this.eventMode = 'none';
    this.lastSize = { width: 0, height: 0 };
  }

  resize(screenWidth, screenHeight) {
    const width = Math.max(1, Number(screenWidth) || 1);
    const height = Math.max(1, Number(screenHeight) || 1);
    const landscape = width > height;

    // Wide phones benefit from cover scaling: the hall fills the display and
    // only a small, centred part of the 16:9 design is cropped.
    const fit = this.mobileLike && landscape ? Math.max : Math.min;
    let scale = fit(width / this.designWidth, height / this.designHeight);
    if (this.mobileLike && landscape) scale *= this.mobileOverscan;

    const renderedWidth = this.designWidth * scale;
    const renderedHeight = this.designHeight * scale;
    this.scale.set(scale);
    this.position.set(
      Math.round((width - renderedWidth) / 2),
      Math.round((height - renderedHeight) / 2),
    );
    this.lastSize.width = width;
    this.lastSize.height = height;
  }
}
