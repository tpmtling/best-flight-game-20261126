// One frame: sky, ground, rings, the plane and its shadow, then the glass.
// The overlays (title, pause, leg done, over, complete) paint over the
// world so every screen is still the game itself.
import { CANVAS_W, CANVAS_H } from './config.js';
import { legPalette } from './config.js';
import { drawAircraft, drawShadow } from './aircraft.js';
import { drawHUD, drawTitle, drawPaused, drawLegDone, drawOver, drawComplete } from './hud.js';
import { SCREEN_TITLE, SCREEN_PAUSED, SCREEN_LEGDONE, SCREEN_OVER, SCREEN_COMPLETE } from './world.js';

export function drawFrame(ctx, world, time) {
  const { state, terrain } = world;
  const palette = legPalette(state.leg);
  const view = terrain.makeView(state);
  terrain.drawSky(ctx, palette, state, time);
  terrain.drawGround(ctx, palette, state, view);
  drawRings(ctx, state, view, palette);
  drawShadow(ctx, state, view, terrain);
  drawAircraft(ctx, state, time);
  drawHUD(ctx, state, palette);
  if (state.screen === SCREEN_TITLE) drawTitle(ctx, state, palette);
  else if (state.screen === SCREEN_PAUSED) drawPaused(ctx, state, palette);
  else if (state.screen === SCREEN_LEGDONE) drawLegDone(ctx, state, palette);
  else if (state.screen === SCREEN_OVER) drawOver(ctx, state, palette);
  else if (state.screen === SCREEN_COMPLETE) drawComplete(ctx, state, palette);
  if (state.freeze > 0 && state.screen !== SCREEN_OVER) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 60, 40, ${Math.min(0.28, state.freeze * 0.28)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRASH', CANVAS_W / 2, 300);
    ctx.restore();
  }
}

// Rings hang in the air ahead: a glowing hoop with a tether down to the
// ground so the eye can place it, brighter when it is the next one.
function drawRings(ctx, state, view, palette) {
  const { project } = view;
  for (const ring of state.rings) {
    if (ring.passed) continue;
    if (ring.z < view.camDist + 20 || ring.z > view.camDist + 1500) continue;
    const p = project(ring.x, ring.alt, ring.z);
    if (!p) continue;
    const r = Math.max(3, ring.r * p.s);
    const isNext = state.rings.find((o) => !o.passed) === ring;
    // Tether to the ground.
    const ground = project(ring.x, 0, ring.z);
    if (ground) {
      ctx.strokeStyle = isNext ? 'rgba(255, 210, 62, 0.55)' : 'rgba(234, 243, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + r);
      ctx.lineTo(ground.x, ground.y);
      ctx.stroke();
    }
    ctx.save();
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.strokeStyle = isNext ? '#ffd23e' : 'rgba(234, 243, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.strokeStyle = isNext ? 'rgba(255, 210, 62, 0.5)' : 'rgba(234, 243, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isNext ? '#ffd23e' : '#eaf3ff';
    ctx.font = `bold ${Math.max(11, Math.min(18, r * 0.34))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('◉', p.x, p.y - r - 8);
    ctx.restore();
  }
}
