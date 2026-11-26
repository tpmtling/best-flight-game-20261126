// Keyboard and mouse, read as axes. The game asks for pitch, roll and
// throttle every frame; edges (confirm, pause, mute) are consumed once.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

const PITCH_KEYS = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 };
const ROLL_KEYS = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };

export function createInput(canvas) {
  const down = new Set();
  const edges = new Set();
  const pointer = { x: 0.5, y: 0.5, active: false, down: false };

  function onKey(e) {
    if (e.code === 'Space') e.preventDefault();
    if (e.type === 'keydown' && !e.repeat) {
      if (e.code === 'Enter') edges.add(ACTION_CONFIRM);
      if (e.code === 'KeyP' || e.code === 'Escape') edges.add(ACTION_PAUSE);
      if (e.code === 'KeyM') edges.add(ACTION_MUTE);
    }
    if (e.type === 'keydown') down.add(e.code);
    else down.delete(e.code);
  }

  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) / rect.width;
    pointer.y = (e.clientY - rect.top) / rect.height;
    pointer.active = true;
  }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', () => down.clear());
  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerdown', (e) => {
    onPointer(e);
    pointer.down = true;
    edges.add(ACTION_CONFIRM);
  });
  canvas.addEventListener('pointerup', () => {
    pointer.down = false;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.active = false;
  });

  return {
    pointer,
    // Pitch: -1 climbs, +1 descends. Roll: -1 banks left, +1 right.
    axes() {
      let pitch = 0;
      let roll = 0;
      for (const code of down) {
        pitch += PITCH_KEYS[code] ?? 0;
        roll += ROLL_KEYS[code] ?? 0;
      }
      if (pointer.active && !pointer.down) {
        // Mouse steering: the plane follows the pointer from screen centre.
        roll += Math.max(-1, Math.min(1, (pointer.x - 0.5) * 2.4));
        pitch += Math.max(-1, Math.min(1, (pointer.y - 0.5) * 2.4));
      }
      return {
        pitch: Math.max(-1, Math.min(1, pitch)),
        roll: Math.max(-1, Math.min(1, roll)),
        throttleUp: down.has('ShiftLeft') || down.has('ShiftRight'),
        throttleDown: down.has('ControlLeft') || down.has('ControlRight') || down.has('KeyX'),
        brake: down.has('Space'),
      };
    },
    consume(action) {
      if (!edges.has(action)) return false;
      edges.delete(action);
      return true;
    },
    clearEdges() {
      edges.clear();
    },
  };
}
