import { Container } from 'pixi.js';

/**
 * Base class for every show scene.
 *
 * A scene owns only the visual objects that belong to that moment of the show.
 * SceneManager guarantees that enter/exit are called in a predictable order.
 */
export class BaseScene extends Container {
  constructor(name) {
    super();
    this.name = name;
    this.active = false;
    this.visible = false;
  }

  async enter(_context = {}) {
    this.active = true;
    this.visible = true;
  }

  async exit(_context = {}) {
    this.active = false;
    this.visible = false;
  }

  update(_deltaMS, _context = {}) {}
}
