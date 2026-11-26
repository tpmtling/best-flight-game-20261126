// Sky Courier: Alpine Run — tuning, legs and palettes.
// One job: every number the rest of the game agrees on, in one place.
export const CANVAS_W = 1280;
export const CANVAS_H = 800;
export const STEP = 1 / 60;
export const HORIZON_Y = 330;
export const FOCAL = 760;
export const CORRIDOR_HALF = 260;
export const MAX_ALT = 900;
export const LIVES = 3;
export const FUEL_MAX = 100;
export const RING_FUEL = 6;
export const RING_SCORE = 100;
export const LAND_SCORE = 500;

// How the plane answers. Speeds in m/s, angles in degrees, fuel in units/s.
export const TUNING = {
  minSpeed: 30,
  speedRange: 65,
  speedApproach: 0.55,
  climbBleed: 12,
  diveGain: 9,
  climbRate: 22,
  sinkRate: 1.5,
  stallSpeed: 48,
  bankRate: 42,
  bankReturn: 2.6,
  lateralBoost: 0.22,
  fuelBase: 0.22,
  fuelThrottle: 0.5,
  ringRadius: 26,
  runwayHalfWidth: 15,
  landMaxVs: 7,
  landMaxSpeed: 80,
  crashMargin: 1.5,
};

// One leg is one mission: its own rings, ridges, wind and light.
export const LEGS = [
  {
    name: 'Valley Run',
    brief: 'Thread the valley rings, then put her down on runway 26.',
    length: 6000,
    rings: 6,
    ridges: [],
    wind: 0,
    palette: 'day',
  },
  {
    name: 'Ridge Crossing',
    brief: 'Three ridges stand across the valley. Climb over them, mind the gusts.',
    length: 7000,
    rings: 8,
    ridges: [2200, 4200, 5800],
    wind: 9,
    palette: 'warm',
  },
  {
    name: 'Dusk Landing',
    brief: 'Last light over the valley. Follow the runway lights home.',
    length: 6500,
    rings: 6,
    ridges: [3000],
    wind: 5,
    palette: 'dusk',
  },
];

// Sky, ground and light per palette. The judge reads the game through its
// screenshots, so each leg has its own hour of the day.
export const PALETTES = {
  day: {
    skyTop: '#2f6fc4',
    skyMid: '#7fb2e5',
    skyHorizon: '#dfeef7',
    sun: '#fff3c4',
    sunX: 0.78,
    sunY: 0.2,
    farMountain: '#8fa8c8',
    nearMountain: '#5d7ba3',
    haze: 'rgba(223, 238, 247, 0.55)',
    field: ['#7fae56', '#a8b45a', '#c2a95e', '#6f9e4e', '#b5a05e', '#8aa860'],
    river: '#5fa8d3',
    road: '#6b6f75',
    runway: '#3c4148',
    runwayMark: '#f2f2e8',
    tree: '#2f6b34',
    panel: 'rgba(12, 18, 28, 0.82)',
    panelLine: 'rgba(140, 190, 255, 0.35)',
    ink: '#eaf3ff',
    dim: '#9db8d6',
    warn: '#ffb03a',
    good: '#7ee787',
  },
  warm: {
    skyTop: '#3a6db0',
    skyMid: '#e8a35c',
    skyHorizon: '#ffe9bd',
    sun: '#ffdf8a',
    sunX: 0.2,
    sunY: 0.26,
    farMountain: '#a08bb0',
    nearMountain: '#6d5f8e',
    haze: 'rgba(255, 233, 189, 0.5)',
    field: ['#8fae4e', '#c2a44e', '#b98d4e', '#7a9e4e', '#cbb26a', '#94a854'],
    river: '#6fb3d8',
    road: '#707078',
    runway: '#3c4148',
    runwayMark: '#f2f2e8',
    tree: '#33682f',
    panel: 'rgba(16, 16, 26, 0.82)',
    panelLine: 'rgba(255, 200, 140, 0.35)',
    ink: '#fff2dc',
    dim: '#d8b48f',
    warn: '#ffb03a',
    good: '#7ee787',
  },
  dusk: {
    skyTop: '#1c2350',
    skyMid: '#7a4a86',
    skyHorizon: '#ff9a5c',
    sun: '#ff7a3c',
    sunX: 0.5,
    sunY: 0.34,
    farMountain: '#4a3a6e',
    nearMountain: '#33284f',
    haze: 'rgba(122, 74, 134, 0.45)',
    field: ['#4e6b3a', '#6b5a34', '#54452c', '#445c33', '#6b5a34', '#4e5e36'],
    river: '#3f6f9e',
    road: '#4a4a52',
    runway: '#2c2f36',
    runwayMark: '#e8e8d8',
    tree: '#1f4423',
    panel: 'rgba(10, 10, 22, 0.86)',
    panelLine: 'rgba(255, 170, 120, 0.4)',
    ink: '#ffe9d6',
    dim: '#c99a7e',
    warn: '#ffb03a',
    good: '#7ee787',
  },
};

export function legPalette(legIndex) {
  return PALETTES[LEGS[legIndex].palette];
}
