// Layout for the link graph: the checked address in the middle, the linked addresses around it. Pure functions, so the
// picture can be drawn on the server as plain SVG (no script, works the same on a phone) and tested without a browser.
export interface Pt {
  x: number;
  y: number;
}

/**
 * Positions for `n` nodes around the centre of a w x h box: up to 10 on one ellipse, more on two rings (the outer one
 * shifted by half a step so the nodes do not sit behind each other). The first node is at the top, clockwise.
 */
export function ringLayout(n: number, w = 640, h = 420, margin = 56): Pt[] {
  const cx = w / 2;
  const cy = h / 2;
  const rx = cx - margin;
  const ry = cy - margin;
  const ring = (count: number, scale: number, offset: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = -Math.PI / 2 + offset + (2 * Math.PI * i) / Math.max(count, 1);
      return { x: cx + rx * scale * Math.cos(a), y: cy + ry * scale * Math.sin(a) };
    });
  if (n <= 10) return ring(n, 1, 0);
  const inner = Math.floor(n / 2);
  const outer = n - inner;
  // interleave so that neighbours in the list alternate between the rings
  const a = ring(outer, 1, 0);
  const b = ring(inner, 0.58, Math.PI / outer);
  return Array.from({ length: n }, (_, i) => (i % 2 === 0 ? a[i / 2] : b[(i - 1) / 2]));
}

/** The segment a-b shortened by the radii of the circles at its ends, so an arrow head stops at the circle's edge. */
export function trim(a: Pt, b: Pt, ra: number, rb: number): [Pt, Pt] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return [
    { x: a.x + (dx / len) * ra, y: a.y + (dy / len) * ra },
    { x: b.x - (dx / len) * rb, y: b.y - (dy / len) * rb },
  ];
}

/** Line width for a link: more transfers, thicker line, within 1.5 to 5. */
export const strokeOf = (txCount: number) => 1.5 + Math.min(3.5, Math.log10(1 + Math.max(txCount, 0)) * 1.4);
