/**
 * Small, dependency-free seeded RNG so synthetic data is reproducible in the
 * browser and on the server. Uses mulberry32 for uniform draws and Box–Muller
 * for normals. This does not try to match NumPy's Generator bit-for-bit — the
 * dashboard is its own reproducible world, keyed by an integer seed.
 */

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Ensure a non-zero 32-bit state.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Standard normal via Box–Muller. */
  normal(mean = 0, std = 1): number {
    let u1 = this.next();
    const u2 = this.next();
    // Guard against log(0).
    if (u1 < 1e-12) u1 = 1e-12;
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z;
  }

  /** Integer in [min, max). */
  int(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min));
  }
}
