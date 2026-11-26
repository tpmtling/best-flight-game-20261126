// The valley: its heightfield, its fields, river, road and runway, and the
// sky above it. Everything is drawn from the seeded terrain, so the same
// seed always grows the same valley.
import { CANVAS_W, CANVAS_H, HORIZON_Y, FOCAL, CORRIDOR_HALF, LEGS } from './config.js';
import { createRandom } from './random.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function hash2(a, b) {
  let s = (a * 374761393 + b * 668265263) | 0;
  s = Math.imul(s ^ (s >>> 13), 1274126177);
  return (((s ^ (s >>> 16)) >>> 0) / 4294967296);
}
function shade(hex, f) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

export function createTerrain(seed) {
  const rng = createRandom(seed);
  const clouds = [];
  for (let i = 0; i < 16; i += 1) {
    clouds.push({
      x: rng.range(0, 1700),
      y: rng.range(36, 250),
      s: rng.range(0.6, 1.7),
      a: rng.range(0.5, 0.9),
    });
  }
  // Trees along the whole route, one list per leg, kept out of the road,
  // the river and the runway strip.
  const trees = LEGS.map((leg, li) => {
    const list = [];
    const start = li === 0 ? 0 : LEGS.slice(0, li).reduce((s, l) => s + l.length, 0);
    const end = start + leg.length;
    for (let z = start + 60; z < end - 500; z += rng.range(24, 46)) {
      const x = rng.range(-250, 250);
      if (Math.abs(x - roadX(z)) < 12) continue;
      if (Math.abs(x - riverX(z)) < 20) continue;
      list.push({ z, x, s: rng.range(0.7, 1.5) });
    }
    return list;
  });

  function riverX(dist) {
    return 120 * Math.sin(dist * 0.00042 + 1.2) + 50 * Math.sin(dist * 0.0011 + 0.5);
  }
  function roadX(dist) {
    return 92 + 42 * Math.sin(dist * 0.00058 + 2.1);
  }
  function ridgeHeight(leg, dist) {
    let h = 0;
    for (const rz of leg.ridges) {
      const d = (dist - rz) / 170;
      h += 112 * Math.exp(-d * d);
    }
    return h;
  }
  function heightAt(dist, x, legIndex) {
    const leg = LEGS[legIndex];
    const legStart = LEGS.slice(0, legIndex).reduce((s, l) => s + l.length, 0);
    const legEnd = legStart + leg.length;
    let h = 6 * Math.sin(dist * 0.0011 + 1.7) + 4 * Math.sin(dist * 0.0029 + 0.4) + 3 * Math.sin(dist * 0.0061);
    h += ridgeHeight(leg, dist - legStart);
    const ax = Math.abs(x);
    if (ax > 240) h += Math.min(190, (ax - 240) * (ax - 240) * 0.0022);
    // The runway sits on flat ground: blend the valley down to zero as the
    // strip approaches, and keep it flat past the threshold.
    if (dist > legEnd - 520 && dist < legEnd + 700) {
      const t = dist < legEnd ? (legEnd - dist) / 520 : 0;
      h *= clamp(t, 0, 1);
    }
    return Math.max(0, h);
  }

  // The camera sits just behind and above the plane and looks down the
  // valley. The world itself never rolls: the plane banks, the attitude
  // indicator banks, the camera stays level so it never fights the pilot.
  function makeView(state) {
    const roll = 0;
    const horizonY = HORIZON_Y + state.pitchVisual * 46;
    const camX = state.x * 0.92;
    const camAlt = state.alt + 7;
    const camDist = state.dist - 16;
    const cos = Math.cos(-roll);
    const sin = Math.sin(-roll);
    function project(x, y, z) {
      const dz = z - camDist;
      if (dz < 4) return null;
      const s = FOCAL / dz;
      let sx = CANVAS_W / 2 + (x - camX) * s;
      let sy = horizonY + (camAlt - y) * s;
      const dx = sx - CANVAS_W / 2;
      const dy = sy - horizonY;
      sx = CANVAS_W / 2 + dx * cos - dy * sin;
      sy = horizonY + dx * sin + dy * cos;
      return { x: sx, y: sy, s, dz };
    }
    return { f: FOCAL, horizonY, camX, camAlt, camDist, roll, project };
  }

  function drawSky(ctx, palette, state, time) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
    g.addColorStop(0, palette.skyTop);
    g.addColorStop(0.62, palette.skyMid);
    g.addColorStop(1, palette.skyHorizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y + 42);
    // Sun with a soft halo.
    const sunX = palette.sunX * CANVAS_W;
    const sunY = palette.sunY * CANVAS_H;
    const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 130);
    halo.addColorStop(0, palette.sun);
    halo.addColorStop(0.25, palette.sun + '66');
    halo.addColorStop(1, palette.sun + '00');
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();
    // Clouds drift with distance, slowly, at their own parallax.
    for (const c of clouds) {
      const cx = (((c.x - state.dist * 0.12) % 1700) + 1700) % 1700 - 210;
      ctx.fillStyle = `rgba(255,255,255,${c.a * 0.85})`;
      ctx.beginPath();
      ctx.ellipse(cx, c.y, 74 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 44 * c.s, c.y + 8 * c.s, 44 * c.s, 14 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 48 * c.s, c.y + 7 * c.s, 48 * c.s, 15 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Two ridgelines, far and near, scrolling with distance.
    for (const layer of [0, 1]) {
      const amp = layer === 0 ? 120 : 78;
      const par = layer === 0 ? 0.00005 : 0.00011;
      const base = HORIZON_Y + (layer === 0 ? 2 : 10);
      ctx.fillStyle = layer === 0 ? palette.farMountain : palette.nearMountain;
      ctx.beginPath();
      ctx.moveTo(0, base + 4);
      for (let sx = 0; sx <= CANVAS_W; sx += 16) {
        const n = rng.noise1(sx * 0.004 + state.dist * par + layer * 7.3);
        ctx.lineTo(sx, base - (n * 0.5 + 0.5) * amp);
      }
      ctx.lineTo(CANVAS_W, base + 4);
      ctx.closePath();
      ctx.fill();
    }
    // Haze softens the line where ground meets sky.
    ctx.fillStyle = palette.haze;
    ctx.fillRect(0, HORIZON_Y - 6, CANVAS_W, 26);
  }

  function drawGround(ctx, palette, state, view) {
    const legIndex = state.leg;
    const leg = LEGS[legIndex];
    const legStart = LEGS.slice(0, legIndex).reduce((s, l) => s + l.length, 0);
    const legEnd = legStart + leg.length;
    const { project } = view;
    // A base wash under the strips: the far ground thins to a line at the
    // horizon, and without it the gap between the mountains and the last
    // strip shows the page behind the canvas.
    ctx.fillStyle = shade(palette.field[3], 0.92);
    ctx.fillRect(0, view.horizonY - 2, CANVAS_W, CANVAS_H - view.horizonY + 2);
    const strips = 46;
    const z0 = view.camDist + 28;
    const z1 = view.camDist + 2600;
    const ratio = Math.pow(z1 / z0, 1 / strips);
    const cells = 10;
    const cellW = (CORRIDOR_HALF * 2 + 840) / cells;
    let z = z0;
    for (let i = 0; i < strips; i += 1) {
      const za = z;
      const zb = z * ratio;
      const zm = (za + zb) / 2;
      for (let c = 0; c < cells; c += 1) {
        const xa = -CORRIDOR_HALF - 420 + c * cellW;
        const xb = xa + cellW;
        const xm = (xa + xb) / 2;
        const p1 = project(xa, heightAt(za, xa, legIndex), za);
        const p2 = project(xb, heightAt(za, xb, legIndex), za);
        const p3 = project(xb, heightAt(zb, xb, legIndex), zb);
        const p4 = project(xa, heightAt(zb, xa, legIndex), zb);
        if (!p1 || !p2 || !p3 || !p4) continue;
        const cellHash = hash2(Math.floor(zm / 95), Math.floor((xm + 300) / 64));
        let color = palette.field[Math.floor(cellHash * palette.field.length) % palette.field.length];
        const h = heightAt(zm, xm, legIndex);
        if (h > 90) color = shade('#55684f', 1 - Math.min(0.4, h / 500));
        else if (Math.abs(xm) > 240) color = shade(color, 0.8);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
      }
      // River band and road, drawn as narrow quads on the same strip.
      const rx = riverX(zm);
      if (Math.abs(rx) < CORRIDOR_HALF + 10) {
        const q1 = project(rx - 15, heightAt(za, rx, legIndex) + 0.4, za);
        const q2 = project(rx + 15, heightAt(za, rx, legIndex) + 0.4, za);
        const q3 = project(rx + 15, heightAt(zb, rx, legIndex) + 0.4, zb);
        const q4 = project(rx - 15, heightAt(zb, rx, legIndex) + 0.4, zb);
        if (q1 && q2 && q3 && q4) {
          ctx.fillStyle = palette.river;
          ctx.beginPath();
          ctx.moveTo(q1.x, q1.y);
          ctx.lineTo(q2.x, q2.y);
          ctx.lineTo(q3.x, q3.y);
          ctx.lineTo(q4.x, q4.y);
          ctx.closePath();
          ctx.fill();
        }
      }
      const dx = roadX(zm);
      const r1 = project(dx - 3.5, heightAt(za, dx, legIndex) + 0.4, za);
      const r2 = project(dx + 3.5, heightAt(za, dx, legIndex) + 0.4, za);
      const r3 = project(dx + 3.5, heightAt(zb, dx, legIndex) + 0.4, zb);
      const r4 = project(dx - 3.5, heightAt(zb, dx, legIndex) + 0.4, zb);
      if (r1 && r2 && r3 && r4) {
        ctx.fillStyle = palette.road;
        ctx.beginPath();
        ctx.moveTo(r1.x, r1.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.lineTo(r3.x, r3.y);
        ctx.lineTo(r4.x, r4.y);
        ctx.closePath();
        ctx.fill();
      }
      z = zb;
    }
    // Trees: small dark triangles that grow as they approach.
    for (const t of trees[legIndex]) {
      if (t.z < view.camDist + 20 || t.z > view.camDist + 1200) continue;
      const p = project(t.x, heightAt(t.z, t.x, legIndex), t.z);
      if (!p) continue;
      const s = clamp(26 * p.s * t.s, 2, 90);
      if (s < 3) continue;
      ctx.fillStyle = palette.tree;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x - s * 0.42, p.y);
      ctx.lineTo(p.x + s * 0.42, p.y);
      ctx.closePath();
      ctx.fill();
    }
    // The runway: a flat strip with centreline dashes, threshold bars and,
    // at dusk, glowing edge lights.
    if (legEnd > view.camDist + 20 && legEnd < view.camDist + 1500) {
      const c1 = project(-15, 0.3, legEnd);
      const c2 = project(15, 0.3, legEnd);
      const c3 = project(15, 0.3, legEnd + 620);
      const c4 = project(-15, 0.3, legEnd + 620);
      if (c1 && c2 && c3 && c4) {
        ctx.fillStyle = palette.runway;
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = palette.runwayMark;
        for (let dz = 40; dz < 600; dz += 90) {
          const a = project(-1.6, 0.6, legEnd + dz);
          const b = project(1.6, 0.6, legEnd + dz);
          const d = project(1.6, 0.6, legEnd + dz + 34);
          const e = project(-1.6, 0.6, legEnd + dz + 34);
          if (a && b && d && e) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(d.x, d.y);
            ctx.lineTo(e.x, e.y);
            ctx.closePath();
            ctx.fill();
          }
        }
        // Threshold bars.
        for (const bx of [-10, -3.4, 3.4, 10]) {
          const a = project(bx - 2.4, 0.6, legEnd + 12);
          const b = project(bx + 2.4, 0.6, legEnd + 12);
          const d = project(bx + 2.4, 0.6, legEnd + 34);
          const e = project(bx - 2.4, 0.6, legEnd + 34);
          if (a && b && d && e) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(d.x, d.y);
            ctx.lineTo(e.x, e.y);
            ctx.closePath();
            ctx.fill();
          }
        }
        if (leg.palette === 'dusk') {
          for (let dz = 0; dz <= 620; dz += 78) {
            for (const ex of [-15, 15]) {
              const p = project(ex, 0.8, legEnd + dz);
              if (!p) continue;
              const r = clamp(3.2 * p.s, 1.5, 7);
              const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
              glow.addColorStop(0, 'rgba(255,190,90,0.9)');
              glow.addColorStop(1, 'rgba(255,190,90,0)');
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }
  }

  return { heightAt, riverX, roadX, makeView, drawSky, drawGround, ridgeHeight };
}
