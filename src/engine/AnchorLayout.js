/**
 * Resolution-independent cinematic anchor system for the 1920×1080 show world.
 *
 * Scenes describe intent (LEFT_CENTER, RIGHT_CENTER, etc.) instead of scattering
 * raw pixel coordinates through their code. Offsets remain available for art
 * direction, while the named anchors provide one consistent layout language.
 */
export class AnchorLayout {
  constructor({ width = 1920, height = 1080, safeX = 120, safeY = 80 } = {}) {
    this.width = width;
    this.height = height;
    this.safeX = safeX;
    this.safeY = safeY;
  }

  resolve(name = 'CENTER', { offsetX = 0, offsetY = 0 } = {}) {
    const xLeft = this.safeX;
    const xQuarter = this.width * 0.27;
    const xCenter = this.width * 0.5;
    const xRight = this.width * 0.73;
    const xFarRight = this.width - this.safeX;
    const yTop = this.safeY;
    const yUpper = this.height * 0.30;
    const yCenter = this.height * 0.53;
    const yLower = this.height * 0.76;
    const yBottom = this.height - this.safeY;

    const anchors = {
      TOP_LEFT: [xLeft, yTop],
      TOP_CENTER: [xCenter, yTop],
      TOP_RIGHT: [xFarRight, yTop],
      LEFT_UPPER: [xQuarter, yUpper],
      CENTER_UPPER: [xCenter, yUpper],
      RIGHT_UPPER: [xRight, yUpper],
      LEFT_CENTER: [xQuarter, yCenter],
      CENTER: [xCenter, yCenter],
      RIGHT_CENTER: [xRight, yCenter],
      LEFT_LOWER: [xQuarter, yLower],
      CENTER_LOWER: [xCenter, yLower],
      RIGHT_LOWER: [xRight, yLower],
      BOTTOM_LEFT: [xLeft, yBottom],
      BOTTOM_CENTER: [xCenter, yBottom],
      BOTTOM_RIGHT: [xFarRight, yBottom],
    };

    const point = anchors[name];
    if (!point) throw new Error(`Unknown cinematic anchor: ${name}`);
    return { x: point[0] + offsetX, y: point[1] + offsetY };
  }

  place(displayObject, anchor, options = {}) {
    const point = this.resolve(anchor, options);
    displayObject.position.set(point.x, point.y);
    return displayObject;
  }
}

export const SHOW_LAYOUT = new AnchorLayout();
