/**
 * DOM candle orbit around the start card.
 * Uses one element per candle and distributes them across the rounded-card
 * perimeter rather than a circle, avoiding visual pairs at the four quadrants.
 */
export class StartCandleOrbit {
  constructor(root, card, { reducedMotion = false } = {}) {
    this.root = root;
    this.card = card;
    this.reducedMotion = reducedMotion;
    // The current design deliberately uses four unique candles. Older builds
    // accidentally rendered two candles at each of four positions. Remove any
    // surplus nodes defensively so cached HTML can never recreate those pairs.
    const allCandles = [...root.querySelectorAll('span')];
    allCandles.slice(4).forEach(node => node.remove());
    this.candles = allCandles.slice(0, 4);
    this.startTime = performance.now();
    this.frame = 0;
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(card);
    this.measure();
    this.tick = this.tick.bind(this);
    this.frame = requestAnimationFrame(this.tick);
  }

  measure() {
    const rect = this.card.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    const gapX = Math.max(38, Math.min(78, rect.width * 0.06));
    const gapY = Math.max(36, Math.min(70, rect.height * 0.09));
    this.bounds = {
      left: rect.left - rootRect.left - gapX,
      top: rect.top - rootRect.top - gapY,
      width: rect.width + gapX * 2,
      height: rect.height + gapY * 2,
      radius: Math.min(82, rect.height * 0.18),
    };
  }

  pointOnRoundedRect(t, variation = 0) {
    const b = this.bounds;
    const r = Math.max(8, b.radius + variation * 0.35);
    const straightX = Math.max(1, b.width - r * 2);
    const straightY = Math.max(1, b.height - r * 2);
    const arc = Math.PI * r * 0.5;
    const perimeter = straightX * 2 + straightY * 2 + arc * 4;
    let d = ((t % 1) + 1) % 1 * perimeter;

    const segment = (length, fn) => {
      if (d <= length) return fn(d / length);
      d -= length;
      return null;
    };

    return segment(straightX, u => ({ x:b.left+r+u*straightX, y:b.top }))
      || segment(arc, u => ({ x:b.left+b.width-r+Math.sin(u*Math.PI/2)*r, y:b.top+r-Math.cos(u*Math.PI/2)*r }))
      || segment(straightY, u => ({ x:b.left+b.width, y:b.top+r+u*straightY }))
      || segment(arc, u => ({ x:b.left+b.width-r+Math.cos(u*Math.PI/2)*r, y:b.top+b.height-r+Math.sin(u*Math.PI/2)*r }))
      || segment(straightX, u => ({ x:b.left+b.width-r-u*straightX, y:b.top+b.height }))
      || segment(arc, u => ({ x:b.left+r-Math.sin(u*Math.PI/2)*r, y:b.top+b.height-r+Math.cos(u*Math.PI/2)*r }))
      || segment(straightY, u => ({ x:b.left, y:b.top+b.height-r-u*straightY }))
      || { x:b.left+r-Math.cos((d/arc)*Math.PI/2)*r, y:b.top+r-Math.sin((d/arc)*Math.PI/2)*r };
  }

  tick(now) {
    const elapsed = (now - this.startTime) / 1000;
    const baseLap = this.reducedMotion ? 58 : 29;
    this.candles.forEach((candle, index) => {
      const uniquePhase = index / this.candles.length;
      const speedVariance = 1 + Math.sin(index * 2.37) * 0.018;
      const localWobble = Math.sin(elapsed * (0.68 + index * 0.017) + index * 1.71) * 0.006;
      const t = uniquePhase + elapsed / (baseLap / speedVariance) + localWobble;
      const radialVariation = Math.sin(index * 4.91) * 9;
      const point = this.pointOnRoundedRect(t, radialVariation);
      const bob = Math.sin(elapsed * (1.15 + index * 0.045) + index * 0.87) * (4 + (index % 3));
      candle.style.transform = `translate3d(${Math.round(point.x)}px,${Math.round(point.y + bob)}px,0) translate(-50%,-50%)`;
    });
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
  }
}
