// The run's state: one object every module reads and the flight model
// writes. A leg is one mission down the valley; the run is three legs.
import { LEGS, LIVES, FUEL_MAX } from './config.js';
import { createTerrain } from './terrain.js';
import { buildRings } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEGDONE = 'legdone';
export const SCREEN_OVER = 'over';
export const SCREEN_COMPLETE = 'complete';

export function legBounds(legIndex) {
  const start = LEGS.slice(0, legIndex).reduce((s, l) => s + l.length, 0);
  return { start, end: start + LEGS[legIndex].length };
}

export function createWorld(seed) {
  const terrain = createTerrain(seed);
  const state = {
    seed,
    screen: SCREEN_TITLE,
    screenTimer: 0,
    leg: 0,
    legStart: 0,
    legEnd: LEGS[0].length,
    dist: 0,
    x: 0,
    alt: 170,
    heading: 0,
    bank: 0,
    bankVisual: 0,
    pitch: 0,
    pitchVisual: 0,
    throttle: 0.62,
    speed: 58,
    vspeed: 0,
    fuel: FUEL_MAX,
    lives: LIVES,
    score: 0,
    legScore: 0,
    rings: [],
    ringsPassed: 0,
    time: 0,
    runTime: 0,
    windX: 0,
    freeze: 0,
    crashReason: '',
    messages: [],
    best: 0,
    muted: false,
    stallWarned: false,
    fuelWarned: false,
    gearDown: false,
  };
  const world = { state, terrain };
  setupLeg(world, 0);
  return world;
}

export function setupLeg(world, legIndex) {
  const { state } = world;
  const { start, end } = legBounds(legIndex);
  state.leg = legIndex;
  state.legStart = start;
  state.legEnd = end;
  state.dist = start + 40;
  state.x = 0;
  state.alt = 170;
  state.heading = 0;
  state.bank = 0;
  state.bankVisual = 0;
  state.pitch = 0;
  state.pitchVisual = 0;
  state.throttle = 0.62;
  state.speed = 58;
  state.vspeed = 0;
  state.fuel = FUEL_MAX;
  state.time = 0;
  state.windX = 0;
  state.freeze = 0;
  state.gearDown = false;
  state.legScore = 0;
  state.ringsPassed = 0;
  state.rings = buildRings(state.seed, legIndex, start, end);
  state.messages = [];
  pushMessage(state, `${LEGS[legIndex].name} — ${LEGS[legIndex].brief}`, 4);
}

export function resetRun(world) {
  const { state } = world;
  state.score = 0;
  state.lives = LIVES;
  state.runTime = 0;
  state.best = readBest();
  setupLeg(world, 0);
  state.screen = SCREEN_PLAY;
  state.screenTimer = 0;
}

export function pushMessage(state, text, secs) {
  state.messages.push({ text, until: state.runTime + (secs ?? 2.6) });
  if (state.messages.length > 3) state.messages.shift();
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem('skycourier-best') ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    window.localStorage.setItem('skycourier-best', String(value));
  } catch {
    // Storage can be off; the best score then lasts this visit only.
  }
}
