// The screenshot scenes behind ?shot=title|flight|landing|ridge. Each one
// plays the real rules forward from a fresh leg, steered by an autopilot
// that aims at the next ring (or the runway), so the frame is what a short
// flight really looks like and the same seed always gives the same frame.
import { STEP, LEGS } from './config.js';
import { stepFlight, handleCrash, handleLanding } from './physics.js';
import { setupLeg, SCREEN_TITLE, SCREEN_PLAY } from './world.js';
import { nextRing } from './missions.js';
import { legBounds } from './world.js';

const SAMPLE = STEP;
const FLIGHT_SECONDS = 38;
const LANDING_APPROACH = 420;
const RIDGE_SECONDS = 26;

/** Steer at a point in the sky: bank toward its bearing, pitch toward its height. */
function autopilot(state, target) {
  const dx = target.x - state.x;
  // Heading is 0..360; fold it to -180..180 before using it as an error,
  // or a turn through north reads as a full turn the other way.
  const headingErr = ((state.heading + 540) % 360) - 180;
  const roll = Math.max(-1, Math.min(1, dx * 0.02 - headingErr * 0.03));
  const pitch = Math.max(-1, Math.min(1, (state.alt - target.alt) * 0.02));
  return { pitch, roll, throttleUp: false, throttleDown: false, brake: false };
}

function flyFor(world, seconds, targetFn) {
  const { state } = world;
  state.throttle = 0.72;
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const target = targetFn(state);
    if (!target) break;
    const out = stepFlight(world, autopilot(state, target), SAMPLE);
    if (out.crashed) {
      // The pilot hit something: reset the leg and keep flying the scene.
      handleCrash(world, out.crashed);
      state.screen = SCREEN_PLAY;
      state.throttle = 0.72;
    }
    if (out.landed) {
      handleLanding(world);
      state.screen = SCREEN_PLAY;
      state.throttle = 0.72;
    }
  }
}

/**
 * Set the world to the named scene and return the screen to draw over it.
 * Any other name stages the title.
 */
export function stageShot(name, world) {
  const { state } = world;
  if (name === 'flight') {
    setupLeg(world, 0);
    flyFor(world, FLIGHT_SECONDS, (s) => nextRing(s) ?? { x: 0, alt: 200 });
    state.screen = SCREEN_PLAY;
    return SCREEN_PLAY;
  }
  if (name === 'landing') {
    setupLeg(world, 0);
    const { end } = legBounds(0);
    flyFor(world, 200, (s) => {
      if (s.dist >= end - LANDING_APPROACH) return null;
      const ring = nextRing(s);
      if (ring && ring.z < end - LANDING_APPROACH - 300) return ring;
      const remain = end - s.dist;
      return { x: 0, alt: Math.max(42, 42 + (remain - LANDING_APPROACH) * 0.09) };
    });
    state.screen = SCREEN_PLAY;
    return SCREEN_PLAY;
  }
  if (name === 'ridge') {
    setupLeg(world, 1);
    flyFor(world, RIDGE_SECONDS, (s) => nextRing(s) ?? { x: 0, alt: 240 });
    state.screen = SCREEN_PLAY;
    return SCREEN_PLAY;
  }
  setupLeg(world, 0);
  flyFor(world, 6, () => ({ x: 0, alt: 200 }));
  state.screen = SCREEN_TITLE;
  return SCREEN_TITLE;
}
