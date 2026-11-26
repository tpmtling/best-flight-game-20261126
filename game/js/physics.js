// The flight model: throttle, pitch and bank in; speed, altitude, heading
// and fuel out, plus the events the game answers to (rings, landings,
// crashes). One fixed step, called 60 times a second.
import { STEP, TUNING, FUEL_MAX, RING_FUEL, LEGS } from './config.js';
import { nextRing, ringScore, landingBonus, windAt } from './missions.js';
import { pushMessage, setupLeg, saveBest } from './world.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

const CORRIDOR_LIMIT = 300;

export const EVENT_RING = 1;
export const EVENT_LAND = 2;
export const EVENT_CRASH = 4;
export const EVENT_FUEL = 8;
export const EVENT_STALL = 16;

export function stepFlight(world, axes, dt, audio) {
  const { state, terrain } = world;
  let events = 0;
  state.time += dt;
  state.runTime += dt;
  const leg = LEGS[state.leg];

  // Controls, smoothed so the plane feels heavy rather than twitchy.
  const targetBank = axes.roll;
  const rate = 3.2;
  state.bank += clamp(targetBank - state.bank, -rate * dt, rate * dt);
  state.bankVisual += (state.bank - state.bankVisual) * Math.min(1, dt * 7);
  state.pitch += clamp(axes.pitch - state.pitch, -2.6 * dt, 2.6 * dt);
  state.pitchVisual += (state.pitch - state.pitchVisual) * Math.min(1, dt * 6);
  if (axes.throttleUp) state.throttle = clamp(state.throttle + 0.5 * dt, 0, 1);
  if (axes.throttleDown) state.throttle = clamp(state.throttle - 0.6 * dt, 0, 1);

  const stalled = state.speed < TUNING.stallSpeed && state.pitch < -0.25;
  if (stalled && !state.stallWarned) {
    state.stallWarned = true;
    events |= EVENT_STALL;
    pushMessage(state, 'STALL — NOSE DOWN, ADD POWER', 2.2);
  }
  if (!stalled) state.stallWarned = false;

  // Speed chases the throttle; climbing bleeds it, diving feeds it, and the
  // brake washes it off fast.
  let targetSpeed = TUNING.minSpeed + state.throttle * TUNING.speedRange;
  if (axes.brake) targetSpeed = Math.min(targetSpeed, 42);
  state.speed += (targetSpeed - state.speed) * Math.min(1, TUNING.speedApproach * dt);
  state.speed += Math.max(0, state.pitch) * TUNING.diveGain * dt;
  state.speed -= Math.max(0, -state.pitch) * TUNING.climbBleed * dt;
  state.speed = clamp(state.speed, 18, 110);

  // Vertical speed follows pitch (up is -1), with a sink the engine must
  // out-climb.
  let vs = -state.pitch * TUNING.climbRate;
  vs -= TUNING.sinkRate;
  if (stalled) vs -= 6;
  if (state.fuel <= 0) vs -= 4;
  state.vspeed = vs;
  state.alt += vs * dt;
  state.alt = Math.max(0, state.alt);

  // Heading turns with bank; the nose follows the bank around the valley.
  state.heading += state.bank * TUNING.bankRate * (state.speed / 70) * dt;
  state.heading = ((state.heading % 360) + 360) % 360;
  const headingRad = (state.heading * Math.PI) / 180;
  state.windX = windAt(state, state.time);
  state.x += Math.sin(headingRad) * state.speed * dt;
  state.x += state.bank * state.speed * TUNING.lateralBoost * dt;
  state.x += state.windX * dt;
  state.x = clamp(state.x, -CORRIDOR_LIMIT, CORRIDOR_LIMIT);
  state.dist += state.speed * dt * Math.cos(headingRad) * 0.92 + state.speed * dt * 0.08;

  // Fuel burns with throttle; a ring buys a little back.
  if (state.fuel > 0) {
    state.fuel -= (TUNING.fuelBase + state.throttle * TUNING.fuelThrottle) * dt;
    if (state.fuel <= 0) {
      state.fuel = 0;
      events |= EVENT_FUEL;
      pushMessage(state, 'FUEL EMPTY — GLIDE HER IN', 3);
    }
  }
  if (state.fuel < 22 && !state.fuelWarned) {
    state.fuelWarned = true;
    pushMessage(state, 'LOW FUEL — FLY THE NEXT RING', 2.6);
  }
  if (state.fuel > 30) state.fuelWarned = false;

  // Rings: crossing one's plane inside its circle collects it.
  const prevDist = state.dist - state.speed * dt;
  for (const ring of state.rings) {
    if (ring.passed || ring.z <= prevDist || ring.z > state.dist) continue;
    const dx = state.x - ring.x;
    const dy = state.alt - ring.alt;
    if (Math.sqrt(dx * dx + dy * dy) < ring.r) {
      ring.passed = true;
      state.ringsPassed += 1;
      const gained = ringScore(state, ring);
      state.score += gained;
      state.legScore += gained;
      state.fuel = Math.min(FUEL_MAX, state.fuel + RING_FUEL);
      events |= EVENT_RING;
      pushMessage(state, `RING +${gained}  ·  FUEL +${RING_FUEL}`, 2);
    }
  }

  // The runway: past the threshold, a gentle touchdown on the strip lands
  // the leg; anything else past it is a crash.
  const ground = terrain.heightAt(state.dist, state.x, state.leg);
  state.gearDown = state.dist > state.legEnd - 1100 && state.alt < 130;
  if (state.dist >= state.legEnd) {
    const soft = Math.abs(state.vspeed) <= TUNING.landMaxVs;
    const slow = state.speed <= TUNING.landMaxSpeed;
    const centred = Math.abs(state.x) <= TUNING.runwayHalfWidth + 2;
    if (state.alt <= 12 && soft && slow && centred) {
      const bonus = landingBonus(state);
      state.score += bonus;
      state.legScore += bonus;
      events |= EVENT_LAND;
      return { events, landed: true };
    }
    if (state.alt <= ground + TUNING.crashMargin) {
      return { events, crashed: 'TERRAIN' };
    }
    if (state.dist > state.legEnd + 800) {
      return { events, crashed: 'OVERRUN' };
    }
  } else if (state.alt <= ground + TUNING.crashMargin) {
    return { events, crashed: 'TERRAIN' };
  }
  return { events };
}

export function handleCrash(world, reason) {
  const { state } = world;
  state.lives -= 1;
  state.crashReason = reason;
  state.freeze = 1.0;
  if (state.lives <= 0) {
    state.screen = 'over';
    state.screenTimer = 0;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }
    return;
  }
  pushMessage(state, `CRASH — ${reason}. ${state.lives} ${state.lives === 1 ? 'LIFE' : 'LIVES'} LEFT`, 2.6);
  setupLeg(world, state.leg);
  state.freeze = 1.0;
}

export function handleLanding(world) {
  const { state } = world;
  state.screen = 'legdone';
  state.screenTimer = 0;
  if (state.leg >= LEGS.length - 1) {
    state.screen = 'complete';
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }
  }
}
