import type { CameraRig } from '../render/cameraRig';
import type { ClockDriver } from './clockDriver';

type HoldAction = 'forward' | 'back' | 'left' | 'right' | 'tiltUp' | 'tiltDown' | 'zoomIn' | 'zoomOut';

/** Keys that act for as long as they are held, by e.key (lower case). */
const HOLD_KEYS: Record<string, HoldAction> = {
  w: 'forward',
  arrowup: 'forward',
  s: 'back',
  arrowdown: 'back',
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
  r: 'tiltUp',
  f: 'tiltDown',
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  _: 'zoomOut',
};

/**
 * Mouse and keyboard for the camera and the clock.
 * Left-drag pans, right- or middle-drag orbits and tilts, the wheel zooms
 * towards the pointer. WASD/arrows pan, Q/E turn 90°, R/F tilt, +/- zoom,
 * Space pauses, 1-3 pick a speed, N faces north.
 */
export function attachInput(canvas: HTMLCanvasElement, rig: CameraRig, driver: ClockDriver, onHelp: () => void): (dt: number) => void {
  const held = new Map<string, HoldAction>();
  let drag: { mode: 'pan' | 'orbit'; x: number; y: number; id: number } | null = null;

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    drag = { mode: e.button === 0 && !e.shiftKey ? 'pan' : 'orbit', x: e.clientX, y: e.clientY, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = drag.mode === 'pan' ? 'grabbing' : 'move';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.mode === 'pan') rig.dragPan(dx, dy, canvas.clientHeight);
    else rig.orbit(-dx * 0.006, dy * 0.004);
  });
  const end = (e: PointerEvent): void => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      canvas.style.cursor = '';
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      const anchor = rig.groundUnder(nx, ny) ?? undefined;
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
      rig.zoom(Math.exp(e.deltaY * unit * 0.0015), anchor);
    },
    { passive: false },
  );

  // Held keys are tracked by physical key (e.code), with the action chosen
  // when the key went down, so releasing Shift before "=" (or any layout
  // quirk) can never leave a key stuck down.
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.code === 'Space' || k === ' ') {
      // A held Space would otherwise flicker between paused and running.
      if (!e.repeat) driver.togglePause();
      e.preventDefault();
      return;
    }
    const hold = HOLD_KEYS[k];
    if (hold) {
      held.set(e.code || k, hold);
      if (k.startsWith('arrow')) e.preventDefault();
      return;
    }
    if (k === 'q' || k === 'e') {
      // Holding the key keeps turning, a quarter at a time, without queueing up spins.
      if (!e.repeat || rig.turnRemaining < 0.3) rig.turnQuarter(k === 'q' ? -1 : 1);
      return;
    }
    if (e.repeat) return;
    // By key or by physical key, so layouts with shifted digits work too.
    const digit = /^(Digit|Numpad)[123]$/.test(e.code) ? e.code.slice(-1) : k;
    if (digit === '1') driver.setSpeed('normal');
    else if (digit === '2') driver.setSpeed('fast');
    else if (digit === '3') driver.setSpeed('fastest');
    else if (k === 'n') rig.faceNorth();
    else if (k === '?' || k === 'h') onHelp();
  });
  addEventListener('keyup', (e) => {
    held.delete(e.code || e.key.toLowerCase());
  });
  addEventListener('blur', () => held.clear());

  return (dt: number) => {
    if (held.size === 0) return;
    const on = new Set(held.values());
    const speed = rig.distance * 0.9 * dt;
    let r = 0;
    let f = 0;
    if (on.has('forward')) f += 1;
    if (on.has('back')) f -= 1;
    if (on.has('right')) r += 1;
    if (on.has('left')) r -= 1;
    if (r || f) rig.pan(r * speed, f * speed);
    if (on.has('tiltUp')) rig.tilt(dt * 0.8);
    if (on.has('tiltDown')) rig.tilt(-dt * 0.8);
    if (on.has('zoomIn')) rig.zoom(Math.exp(-dt * 1.6));
    if (on.has('zoomOut')) rig.zoom(Math.exp(dt * 1.6));
  };
}
