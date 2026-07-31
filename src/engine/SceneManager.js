/**
 * Small deterministic scene manager.
 *
 * Only one registered scene is active at a time. Scene changes are serialized,
 * so two timeline events cannot overlap enter/exit transitions accidentally.
 */
export class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;
    this.transition = Promise.resolve();
  }

  register(name, scene) {
    if (!name || !scene) throw new Error('SceneManager.register requires a name and scene.');
    if (this.scenes.has(name)) throw new Error(`Scene “${name}” is already registered.`);
    this.scenes.set(name, scene);
    return scene;
  }

  has(name) {
    return this.scenes.has(name);
  }

  change(name, context = {}) {
    this.transition = this.transition.then(async () => {
      const next = this.scenes.get(name);
      if (!next) throw new Error(`Unknown scene: ${name}`);
      if (this.current === next) return next;

      const previous = this.current;
      if (previous) await previous.exit({ ...context, next: name });

      this.current = next;
      this.currentName = name;
      await next.enter({ ...context, previous: previous?.name ?? null });
      return next;
    });

    return this.transition;
  }

  update(deltaMS, context = {}) {
    this.current?.update(deltaMS, context);
  }
}
