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

/** What the pointer does over the ground when a tool is picked, and the tool keys. */
export interface PointerTools {
  /** Is a tool picked (so the left button places)? */
  readonly active: boolean;
  /** The pointer moved: the ground point under it (or null), and its screen position. */
  pointer(world: { x: number; z: number } | null, sx: number, sy: number): void;
  down(): void;
  up(): void;
  /** Let go of a drag, or put the tool down. */
  cancel(): void;
  /** A key that isn't a camera or clock key; true if it was used. */
  key(k: string, e: KeyboardEvent): boolean;
  /** A left click without a drag and with no tool picked: the ground point under it (or null), and its screen position. */
  click?(world: { x: number; z: number } | null, sx: number, sy: number): void;
}

/**
 * Mouse and keyboard for the camera, the clock and the tools.
 * With no tool picked, left-drag pans; with one, left-drag places. Middle-drag
 * always pans, right-drag orbits and tilts (a right-click without dragging
 * puts the tool down), the wheel zooms towards the pointer. WASD/arrows pan,
 * Q/E turn 90°, R/F tilt, +/- zoom, Space pauses, 1-3 pick a speed, N faces
 * north.
 */
export function attachInput(canvas: HTMLCanvasElement, rigOf: CameraRig | (() => CameraRig), driver: ClockDriver, onHelp: () => void, tools?: PointerTools): (dt: number) => void {
  // The camera the keys and mouse drive: the city's, or the map of Greece's while it is open.
  const rig = (): CameraRig => (typeof rigOf === 'function' ? rigOf() : rigOf);
  const held = new Map<string, HoldAction>();
  let drag: { mode: 'pan' | 'orbit' | 'tool'; x: number; y: number; id: number; button: number; moved: number } | null = null;

  const ground = (e: PointerEvent): { x: number; z: number } | null => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    const p = rig().groundUnder(nx, ny);
    return p ? { x: p.x, z: p.z } : null;
  };

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    let mode: 'pan' | 'orbit' | 'tool';
    if (e.button === 0 && !e.shiftKey) mode = tools?.active ? 'tool' : 'pan';
    else if (e.button === 1) mode = 'pan';
    else mode = 'orbit';
    drag = { mode, x: e.clientX, y: e.clientY, id: e.pointerId, button: e.button, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
    if (mode === 'tool') {
      tools?.pointer(ground(e), e.clientX, e.clientY);
      tools?.down();
    } else canvas.style.cursor = mode === 'pan' ? 'grabbing' : 'move';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) {
      if (!drag && tools) tools.pointer(ground(e), e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.mode === 'tool') tools?.pointer(ground(e), e.clientX, e.clientY);
    else if (drag.mode === 'pan') rig().dragPan(dx, dy, canvas.clientHeight);
    else rig().orbit(-dx * 0.006, dy * 0.004);
  });
  const end = (e: PointerEvent): void => {
    if (drag && e.pointerId === drag.id) {
      const d = drag;
      drag = null;
      canvas.style.cursor = '';
      if (d.mode === 'tool') {
        if (e.type === 'pointercancel') tools?.cancel();
        else tools?.up();
      } else if (d.button === 2 && d.moved < 5) tools?.cancel();
      else if (d.button === 0 && d.moved < 5 && e.type === 'pointerup') tools?.click?.(ground(e), e.clientX, e.clientY);
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => {
    if (!drag) tools?.pointer(null, 0, 0);
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      const anchor = rig().groundUnder(nx, ny) ?? undefined;
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
      rig().zoom(Math.exp(e.deltaY * unit * 0.0015), anchor);
    },
    { passive: false },
  );

  // Held keys are tracked by physical key (e.code), with the action chosen
  // when the key went down, so releasing Shift before "=" (or any layout
  // quirk) can never leave a key stuck down.
  // Which control was last focused by a click or a tap (rather than by the keyboard), for Tab below.
  let pointing = false;
  let clicked: EventTarget | null = null;
  addEventListener('pointerdown', () => (pointing = true), true);
  addEventListener('focusin', (e) => {
    clicked = pointing ? e.target : null;
    pointing = false;
  }, true);
  addEventListener('keydown', (e) => {
    pointing = false;
    const target = e.target;
    // Typing in a text box is not for the game.
    if (target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && !/^(checkbox|radio|range|button)$/.test(target.type))) return;
    // A panel's button or tick keeps the focus once clicked (panels are brought up to date in place): let go of it,
    // so the keys still drive the game and Space doesn't press it again.
    // Enter stays with the page (pressing the control), and so does Tab while the keyboard is moving between a panel's
    // controls; after a click on one, Tab is the game's key (the map of Greece) like any other.
    if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) {
      if (e.key === 'Enter' || (e.key === 'Tab' && target !== clicked)) return;
      target.blur();
    }
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.repeat && tools) {
      tools.key('undo', e);
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && k === 's' && tools) {
      // Save the town (not the page).
      e.preventDefault();
      if (!e.repeat) tools.key('save', e);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === 'escape') {
      tools?.cancel();
      return;
    }
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
      if (!e.repeat || rig().turnRemaining < 0.3) rig().turnQuarter(k === 'q' ? -1 : 1);
      return;
    }
    if (e.repeat) return;
    // By key or by physical key, so layouts with shifted digits work too.
    const digit = /^(Digit|Numpad)[123]$/.test(e.code) ? e.code.slice(-1) : k;
    if (digit === '1') driver.setSpeed('normal');
    else if (digit === '2') driver.setSpeed('fast');
    else if (digit === '3') driver.setSpeed('fastest');
    else if (k === 'n') rig().faceNorth();
    else if (k === '?') onHelp();
    else tools?.key(k, e);
  });
  addEventListener('keyup', (e) => {
    held.delete(e.code || e.key.toLowerCase());
  });
  addEventListener('blur', () => held.clear());

  return (dt: number) => {
    if (held.size === 0) return;
    const on = new Set(held.values());
    const speed = rig().distance * 0.9 * dt;
    let r = 0;
    let f = 0;
    if (on.has('forward')) f += 1;
    if (on.has('back')) f -= 1;
    if (on.has('right')) r += 1;
    if (on.has('left')) r -= 1;
    if (r || f) rig().pan(r * speed, f * speed);
    if (on.has('tiltUp')) rig().tilt(dt * 0.8);
    if (on.has('tiltDown')) rig().tilt(-dt * 0.8);
    if (on.has('zoomIn')) rig().zoom(Math.exp(-dt * 1.6));
    if (on.has('zoomOut')) rig().zoom(Math.exp(dt * 1.6));
  };
}
