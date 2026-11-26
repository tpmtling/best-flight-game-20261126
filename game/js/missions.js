// The missions: where the rings hang, what a ring and a landing are worth,
// and the wind that pushes the plane around on the later legs.
import { LEGS, TUNING, RING_SCORE, LAND_SCORE } from './config.js';
import { createRandom } from './random.js';

// Rings hang along the leg at reachable heights, never inside a ridge.
export function buildRings(seed, legIndex, legStart, legEnd) {
  const leg = LEGS[legIndex];
  const rng = createRandom(seed * 31 + legIndex * 7919 + 13);
  const rings = [];
  const span = legEnd - legStart;
  for (let i = 0; i < leg.rings; i += 1) {
    const z = legStart + 720 + (i * (span - 1500)) / Math.max(1, leg.rings - 1);
    let x = 132 * Math.sin(i * 1.7 + legIndex * 2.3 + rng.range(-0.2, 0.2));
    x = Math.max(-150, Math.min(150, x));
    let alt = 185 + 115 * Math.sin(i * 2.1 + legIndex * 1.1);
    // Keep the ring clear of a ridge crest it hangs over.
    for (const rz of leg.ridges) {
      if (Math.abs(z - (legStart + rz)) < 260) alt = Math.max(alt, 235);
    }
    rings.push({ z, x, alt, r: TUNING.ringRadius, passed: false });
  }
  return rings;
}

export function nextRing(state) {
  for (const ring of state.rings) {
    if (!ring.passed) return ring;
  }
  return null;
}

// A ring pays for the flying, not just the passing: faster through the
// middle is worth more than a scrape through the edge.
export function ringScore(state, ring) {
  const dx = state.x - ring.x;
  const dy = state.alt - ring.alt;
  const off = Math.sqrt(dx * dx + dy * dy) / ring.r;
  const centre = Math.max(0, 1 - off);
  return RING_SCORE + Math.round(centre * 50) + Math.round(state.speed * 0.2);
}

export function landingBonus(state) {
  const soft = Math.max(0, 200 - Math.abs(state.vspeed) * 22);
  const centred = Math.max(0, 100 - Math.abs(state.x) * 5);
  return LAND_SCORE + Math.round(soft) + Math.round(centred);
}

// Gusts arrive in slow swells on the later legs and shove the plane sideways.
export function windAt(state, time) {
  const leg = LEGS[state.leg];
  if (!leg.wind) return 0;
  return leg.wind * Math.sin(time * 0.11 + state.seed % 7) * Math.sin(time * 0.031 + 1.4);
}
