// Sound, all synthesised in WebAudio: an engine drone that follows the
// throttle, wind that follows the speed, and one-shot cues. No audio files.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let unlocked = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 420;
      engineOsc.connect(low);
      engineOsc2.connect(low);
      low.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineOsc2.start();
      // Looped noise for the wind, shaped by a bandpass.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {
      // Sound is garnish; a failure never stops the game.
    }
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      if (unlocked) return;
      unlocked = true;
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
      return muted;
    },
    // Called every frame while flying; silent on the menus.
    setFlight(throttle, speed, flying) {
      if (!ctx || muted || !flying) {
        if (engineGain) engineGain.gain.value = 0;
        if (windGain) windGain.gain.value = 0;
        return;
      }
      const t = ctx.currentTime;
      const rpm = 52 + throttle * 46;
      engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
      engineOsc2.frequency.setTargetAtTime(rpm * 1.5, t, 0.08);
      engineGain.gain.setTargetAtTime(0.045 + throttle * 0.05, t, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.0011), t, 0.15);
      windFilter.frequency.setTargetAtTime(500 + speed * 6, t, 0.15);
    },
    ring() {
      blip(880, 0.16, 'sine', 0.16, 1320);
      setTimeout(() => blip(1318, 0.2, 'sine', 0.12), 70);
    },
    land() {
      blip(180, 0.25, 'sine', 0.2, 90);
      setTimeout(() => blip(660, 0.18, 'sine', 0.12, 990), 140);
    },
    crash() {
      blip(120, 0.5, 'sawtooth', 0.2, 40);
    },
    click() {
      blip(520, 0.07, 'sine', 0.08);
    },
    stall() {
      blip(220, 0.3, 'square', 0.05, 180);
    },
  };
}
