// The cockpit: the HUD, the lit instruments on the panel, and the screens
// between flights. Everything the pilot needs is on this glass.
import { CANVAS_W, CANVAS_H, LEGS, FUEL_MAX } from './config.js';
import { nextRing } from './missions.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function kt(speed) {
  return Math.round(speed * 1.94384);
}
function headingLabel(h) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round((((h % 360) + 360) % 360) / 22.5) % 16];
}

function drawDial(ctx, cx, cy, r, palette, label, valueText) {
  ctx.save();
  ctx.fillStyle = '#0c1420';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.panelLine;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy - r + 18);
  ctx.font = 'bold 19px monospace';
  ctx.fillText(valueText, cx, cy + r - 12);
  ctx.restore();
}

function drawAttitude(ctx, cx, cy, r, state, palette) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(state.bankVisual * 0.55);
  const pitchPx = clamp(state.pitchVisual * 34, -r, r);
  ctx.translate(0, pitchPx);
  ctx.fillStyle = '#3f7fd0';
  ctx.fillRect(-r - 4, -r - 4, (r + 4) * 2, r + 4);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-r - 4, 0, (r + 4) * 2, r + 4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r - 4, 0);
  ctx.lineTo(r + 4, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  for (const off of [-22, 22]) {
    ctx.beginPath();
    ctx.moveTo(-26, off);
    ctx.lineTo(26, off);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = palette.panelLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATT', cx, cy - r + 16);
  ctx.restore();
}

function drawCompass(ctx, state, palette) {
  const cx = CANVAS_W / 2;
  const y = 14;
  const w = 300;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 26, 0.55)';
  roundRect(ctx, cx - w / 2, y, w, 30, 8);
  ctx.fill();
  ctx.strokeStyle = palette.panelLine;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(cx - w / 2, y, w, 30);
  ctx.clip();
  const heading = ((state.heading % 360) + 360) % 360;
  ctx.fillStyle = palette.ink;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 15) {
    let h = Math.round((heading + d) / 15) * 15;
    const off = (h - heading) * 2.1;
    const hx = cx + off;
    const hn = ((h % 360) + 360) % 360;
    const major = hn % 90 === 0;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(hx, y + 22);
    ctx.lineTo(hx, y + (major ? 8 : 14));
    ctx.stroke();
    if (major) {
      const label = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[hn] ?? String(hn).padStart(3, '0');
      ctx.fillText(label, hx, y + 21);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx - 6, y + 30);
  ctx.lineTo(cx + 6, y + 30);
  ctx.lineTo(cx, y + 38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${String(Math.round(heading)).padStart(3, '0')}° ${headingLabel(heading)}`, cx, y + 54);
}

function drawBar(ctx, x, y, w, h, frac, color, label, palette) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 26, 0.55)';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = palette.panelLine;
  ctx.stroke();
  const fh = (h - 8) * clamp(frac, 0, 1);
  ctx.fillStyle = color;
  roundRect(ctx, x + 4, y + h - 4 - fh, w - 8, fh, 4);
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 6);
  ctx.restore();
}

export function drawHUD(ctx, state, palette) {
  const leg = LEGS[state.leg];
  ctx.save();
  // Translucent backing so the readouts stay legible over sky and cloud.
  ctx.fillStyle = 'rgba(10, 16, 26, 0.45)';
  roundRect(ctx, 8, 12, 250, 84, 8);
  ctx.fill();
  roundRect(ctx, CANVAS_W - 258, 12, 250, 84, 8);
  ctx.fill();
  roundRect(ctx, CANVAS_W / 2 - 190, 78, 380, 26, 8);
  ctx.fill();
  // Top-left readouts.
  ctx.fillStyle = palette.ink;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`ALT ${Math.round(state.alt)} m`, 18, 34);
  ctx.fillText(`SPD ${kt(state.speed)} kt`, 18, 60);
  ctx.fillText(`HDG ${String(Math.round(state.heading)).padStart(3, '0')}°`, 18, 86);
  // Top-right: score, rings, fuel.
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${state.score}`, CANVAS_W - 18, 34);
  ctx.fillText(`RINGS ${state.ringsPassed}/${state.rings.length}`, CANVAS_W - 18, 60);
  const fuelLow = state.fuel < 22;
  ctx.fillStyle = fuelLow && Math.floor(state.runTime * 2.4) % 2 === 0 ? palette.warn : palette.ink;
  ctx.fillText(`FUEL ${Math.round(state.fuel)}%`, CANVAS_W - 18, 86);
  ctx.fillStyle = palette.ink;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${leg.name}  ·  LEG ${state.leg + 1}/3  ·  LIVES ${state.lives}/3`, CANVAS_W / 2, 96);
  drawCompass(ctx, state, palette);
  // Wind, when it is pushing the plane around.
  if (Math.abs(state.windX) > 2) {
    const arrow = state.windX > 0 ? '→' : '←';
    ctx.fillStyle = palette.warn;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`WIND ${arrow} ${Math.abs(Math.round(state.windX * 1.9))} kt`, CANVAS_W / 2, 166);
  }
  // Throttle and fuel bars on the edges.
  drawBar(ctx, 14, 300, 22, 190, state.throttle, '#7ee787', 'THR', palette);
  drawBar(ctx, CANVAS_W - 36, 300, 22, 190, state.fuel / FUEL_MAX, fuelLow ? palette.warn : '#5fa8d3', 'FUEL', palette);
  // Centre reticle and next-ring callout.
  const ring = nextRing(state);
  ctx.strokeStyle = 'rgba(234, 243, 255, 0.8)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(CANVAS_W / 2, 512, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2 - 16, 512);
  ctx.lineTo(CANVAS_W / 2 - 6, 512);
  ctx.moveTo(CANVAS_W / 2 + 6, 512);
  ctx.lineTo(CANVAS_W / 2 + 16, 512);
  ctx.stroke();
  if (ring) {
    const remain = Math.max(0, Math.round(ring.z - state.dist));
    ctx.fillStyle = palette.ink;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`NEXT RING ${remain} m`, CANVAS_W / 2, 122);
  } else if (state.dist < state.legEnd) {
    ctx.fillStyle = palette.good;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('ALL RINGS CLEAR — LINE UP THE RUNWAY', CANVAS_W / 2, 122);
  }
  if (state.gearDown) {
    ctx.fillStyle = palette.good;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('GEAR DOWN — LAND ON THE STRIP', CANVAS_W / 2, 144);
  }
  // Messages, newest last, fading with the run clock.
  ctx.font = 'bold 19px sans-serif';
  let my = 198;
  for (const m of state.messages) {
    const left = m.until - state.runTime;
    if (left <= 0) continue;
    ctx.globalAlpha = clamp(left, 0, 1);
    ctx.fillStyle = palette.ink;
    ctx.fillText(m.text, CANVAS_W / 2, my);
    my += 26;
  }
  ctx.globalAlpha = 1;
  // The instrument panel: three lit dials along the bottom.
  const py = CANVAS_H - 108;
  ctx.fillStyle = palette.panel;
  roundRect(ctx, 0, py, CANVAS_W, 108, 0);
  ctx.fill();
  ctx.strokeStyle = palette.panelLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.lineTo(CANVAS_W, py);
  ctx.stroke();
  drawDial(ctx, 210, py + 54, 42, palette, 'AIRSPEED kt', String(kt(state.speed)));
  drawDial(ctx, CANVAS_W - 210, py + 54, 42, palette, 'ALTITUDE m', String(Math.round(state.alt)));
  drawAttitude(ctx, CANVAS_W / 2, py + 54, 42, state, palette);
  // Needles on the two round dials.
  const spdAngle = -Math.PI * 0.75 + (kt(state.speed) / 220) * Math.PI * 1.5;
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(210, py + 54);
  ctx.lineTo(210 + Math.cos(spdAngle) * 32, py + 54 + Math.sin(spdAngle) * 32);
  ctx.stroke();
  const altAngle = -Math.PI * 0.75 + (clamp(state.alt, 0, 900) / 900) * Math.PI * 1.5;
  ctx.beginPath();
  ctx.moveTo(CANVAS_W - 210, py + 54);
  ctx.lineTo(CANVAS_W - 210 + Math.cos(altAngle) * 32, py + 54 + Math.sin(altAngle) * 32);
  ctx.stroke();
  ctx.restore();
}

function overlay(ctx, palette, title, lines, hint) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 20, 0.62)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = palette.panel;
  const w = 640;
  const h = 150 + lines.length * 30;
  roundRect(ctx, CANVAS_W / 2 - w / 2, CANVAS_H / 2 - h / 2, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = palette.panelLine;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - h / 2 + 62);
  ctx.font = '19px sans-serif';
  let y = CANVAS_H / 2 - h / 2 + 104;
  for (const line of lines) {
    ctx.fillText(line, CANVAS_W / 2, y);
    y += 30;
  }
  ctx.fillStyle = palette.dim;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(hint, CANVAS_W / 2, CANVAS_H / 2 + h / 2 - 20);
  ctx.restore();
}

export function drawTitle(ctx, state, palette) {
  overlay(
    ctx,
    palette,
    'SKY COURIER',
    [
      'Alpine Run — fly the valley, thread the rings, land on the strip.',
      '↑ ↓ or W S — climb and descend      ← → or A D — bank and turn',
      'SHIFT — more throttle      CTRL / X — less      SPACE — brake',
      'Mouse steers too.  P — pause      M — sound on / off',
      `Three legs, three lives, one courier.   BEST ${state.best}`,
    ],
    'Press ENTER or click to fly',
  );
}

export function drawPaused(ctx, state, palette) {
  overlay(ctx, palette, 'PAUSED', ['The valley waits. The fuel does not burn while you think.'], 'Press P or ENTER to keep flying');
}

export function drawLegDone(ctx, state, palette) {
  const leg = LEGS[state.leg];
  overlay(
    ctx,
    palette,
    `${leg.name.toUpperCase()} — LANDED`,
    [`Leg score ${state.legScore}   ·   Total ${state.score}`, state.leg < 2 ? `Next: ${LEGS[state.leg + 1].name} — ${LEGS[state.leg + 1].brief}` : 'Route complete.'],
    state.leg < 2 ? 'Next leg loads itself…' : '',
  );
}

export function drawOver(ctx, state, palette) {
  overlay(
    ctx,
    palette,
    'FLIGHT OVER',
    [`${state.crashReason === 'TERRAIN' ? 'The mountain won this one.' : state.crashReason === 'OVERRUN' ? 'Past the runway and out of field.' : 'Out of sky.'}`, `Score ${state.score}   ·   Best ${state.best}`, `Legs flown: ${state.leg + 1} of 3   ·   Rings ${state.ringsPassed}/${state.rings.length}`],
    'Press ENTER or click to fly again',
  );
}

export function drawComplete(ctx, state, palette) {
  overlay(
    ctx,
    palette,
    'ROUTE COMPLETE',
    ['Three valleys, three landings, one courier still in one piece.', `Final score ${state.score}   ·   Best ${state.best}`],
    'Press ENTER or click to fly the route again',
  );
}
