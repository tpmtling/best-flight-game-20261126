// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused, leg done, game over and route complete.
//
// ?seed=N fixes the valley. ?shot=title|flight|landing|ridge (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { CANVAS_W, CANVAS_H, STEP, LEGS } from './config.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, setupLeg, resetRun, readBest, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_LEGDONE, SCREEN_OVER, SCREEN_COMPLETE } from './world.js';
import { stepFlight, handleCrash, handleLanding, EVENT_RING, EVENT_LAND, EVENT_CRASH, EVENT_FUEL, EVENT_STALL } from './physics.js';
import { drawFrame } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const LEGDONE_SECONDS = 2.6;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const input = createInput(canvas);
const audio = createAudio();
const ctx = canvas.getContext('2d');

world.state.best = readBest();

function announce() {
  const s = world.state;
  const lines = {
    [SCREEN_TITLE]: 'Sky Courier: Alpine Run. Press Enter to fly.',
    [SCREEN_PLAY]: `Leg ${s.leg + 1}: ${LEGS[s.leg].name}. Score ${s.score}.`,
    [SCREEN_PAUSED]: 'Paused.',
    [SCREEN_LEGDONE]: `${LEGS[s.leg].name} landed.`,
    [SCREEN_OVER]: `Flight over. Score ${s.score}.`,
    [SCREEN_COMPLETE]: `Route complete. Score ${s.score}.`,
  };
  status.textContent = lines[s.screen] ?? '';
}

function runShot(name) {
  const screen = stageShot(name, world);
  world.state.screen = screen;
  let painted = 0;
  function paint() {
    drawFrame(ctx, world, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

let last = performance.now();
let acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const frame = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  const s = world.state;
  if (input.consume(ACTION_MUTE)) {
    s.muted = audio.toggleMute();
  }
  if (input.consume(ACTION_PAUSE)) {
    if (s.screen === SCREEN_PLAY) {
      s.screen = SCREEN_PAUSED;
      audio.setFlight(0, 0, false);
    } else if (s.screen === SCREEN_PAUSED) {
      s.screen = SCREEN_PLAY;
    }
    announce();
  }
  if (input.consume(ACTION_CONFIRM)) {
    audio.unlock();
    if (s.screen === SCREEN_TITLE || s.screen === SCREEN_OVER || s.screen === SCREEN_COMPLETE) {
      audio.click();
      resetRun(world);
      announce();
    }
  }
  if (s.screen === SCREEN_PLAY) {
    acc += frame;
    while (acc >= STEP) {
      acc -= STEP;
      if (s.freeze > 0) {
        s.freeze -= STEP;
        continue;
      }
      const out = stepFlight(world, input.axes(), STEP, audio);
      if (out.events & EVENT_RING) audio.ring();
      if (out.events & EVENT_STALL) audio.stall();
      if (out.events & EVENT_CRASH) audio.crash();
      if (out.crashed) handleCrash(world, out.crashed);
      else if (out.landed) {
        audio.land();
        handleLanding(world);
      }
    }
  } else if (s.screen === SCREEN_LEGDONE) {
    s.screenTimer += frame;
    if (s.screenTimer >= LEGDONE_SECONDS) {
      setupLeg(world, s.leg + 1);
      s.screen = SCREEN_PLAY;
      announce();
    }
  }
  audio.setFlight(s.throttle, s.speed, s.screen === SCREEN_PLAY);
  drawFrame(ctx, world, now / 1000);
}

// A handle for smoke tests and the screenshot driver to read the run.
window.__skycourier = {
  get state() {
    return world.state;
  },
  get screen() {
    return world.state.screen;
  },
};

if (shot) runShot(shot);
else {
  announce();
  requestAnimationFrame(loop);
}
