// The aircraft, drawn from behind in chase view, and its shadow on the
// ground below. The plane is an original design: a high-wing bush courier
// in courier orange and white, registration SKY-01.
import { CANVAS_W } from './config.js';

function poly(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function drawShadow(ctx, state, view, terrain) {
  const ground = terrain.heightAt(state.dist + 2, state.x, state.leg);
  const p = view.project(state.x, ground + 0.5, state.dist + 2);
  if (!p) return;
  const agl = Math.max(0, state.alt - ground);
  const r = Math.max(4, 46 * p.s * Math.max(0.25, 1 - agl / 420));
  ctx.fillStyle = `rgba(10, 16, 24, ${Math.max(0.08, 0.34 - agl / 900)})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r * 1.9, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawAircraft(ctx, state, time) {
  const cx = CANVAS_W / 2;
  const cy = 512 + state.pitchVisual * 26;
  const bank = state.bankVisual;
  const jiggle = Math.sin(time * 47) * 0.7 * (0.3 + state.throttle * 0.7);
  ctx.save();
  ctx.translate(cx + jiggle, cy);
  ctx.rotate(bank * 0.55);
  const S = 1; // scale: the plane is drawn life-size for the frame.
  // Main wings: near-flat with a touch of dihedral, white with orange tips.
  ctx.fillStyle = '#f4f6f8';
  poly(ctx, [[-172 * S, -16], [-58 * S, -26], [-46 * S, -2], [-168 * S, 8]]);
  poly(ctx, [[172 * S, -16], [58 * S, -26], [46 * S, -2], [168 * S, 8]]);
  ctx.fillStyle = '#ff7a1a';
  poly(ctx, [[-172 * S, -16], [-146 * S, -18], [-142 * S, 6], [-168 * S, 8]]);
  poly(ctx, [[172 * S, -16], [146 * S, -18], [142 * S, 6], [168 * S, 8]]);
  // Tailplane and fin.
  ctx.fillStyle = '#e8ecef';
  poly(ctx, [[-64 * S, -58], [-20 * S, -64], [-16 * S, -46], [-58 * S, -42]]);
  poly(ctx, [[64 * S, -58], [20 * S, -64], [16 * S, -46], [58 * S, -42]]);
  ctx.fillStyle = '#ff7a1a';
  poly(ctx, [[-14 * S, -62], [14 * S, -62], [10 * S, -108], [-10 * S, -108]]);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SKY', 0, -72);
  // Fuselage: tapered body seen from behind, orange stripe, canopy on top.
  ctx.fillStyle = '#f4f6f8';
  ctx.beginPath();
  ctx.moveTo(-26 * S, -58);
  ctx.quadraticCurveTo(-34 * S, 6, -20 * S, 44);
  ctx.lineTo(20 * S, 44);
  ctx.quadraticCurveTo(34 * S, 6, 26 * S, -58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff7a1a';
  ctx.fillRect(-27 * S, -18, 54 * S, 10);
  ctx.fillStyle = '#16324a';
  ctx.beginPath();
  ctx.ellipse(0, -40, 17 * S, 12 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 225, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-4, -43, 9 * S, 6 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  // Propeller wash: a faint disc ahead of the nose is out of frame from
  // behind, so the exhaust shimmer stands in for the engine.
  ctx.fillStyle = 'rgba(255, 190, 90, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 46, 12 + Math.sin(time * 31) * 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights: red port, green starboard, white tail strobe.
  ctx.fillStyle = '#ff2d2d';
  ctx.beginPath();
  ctx.arc(-170 * S, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2dff5e';
  ctx.beginPath();
  ctx.arc(170 * S, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  if (Math.floor(time * 1.4) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -106, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
