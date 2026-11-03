import { describe, expect, it } from "vitest";
import { ringLayout, strokeOf, trim } from "./graph";

describe("ringLayout", () => {
  it("puts the first node at the top and keeps every node inside the box", () => {
    for (const n of [1, 3, 10, 11, 16]) {
      const pts = ringLayout(n);
      expect(pts).toHaveLength(n);
      for (const p of pts) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(640);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(420);
      }
    }
    const first = ringLayout(4)[0];
    expect(first.x).toBeCloseTo(320, 5);
    expect(first.y).toBeLessThan(100);
  });
  it("does not stack two nodes on the same spot", () => {
    const pts = ringLayout(16);
    const keys = new Set(pts.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`));
    expect(keys.size).toBe(16);
  });
});

describe("trim and strokeOf", () => {
  it("shortens a segment by both radii", () => {
    const [a, b] = trim({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, 20);
    expect(a.x).toBeCloseTo(10);
    expect(b.x).toBeCloseTo(80);
  });
  it("grows with the number of transfers but stays within 1.5 to 5", () => {
    expect(strokeOf(1)).toBeLessThan(strokeOf(100));
    expect(strokeOf(0)).toBeGreaterThanOrEqual(1.5);
    expect(strokeOf(10 ** 9)).toBeLessThanOrEqual(5);
  });
});
