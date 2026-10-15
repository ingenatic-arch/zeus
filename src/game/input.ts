import type { CameraRig } from '../render/cameraRig';
import type { ClockDriver } from './clockDriver';

/**
 * Mouse and keyboard for the camera and the clock.
 * Left-drag pans, right- or middle-drag orbits and tilts, the wheel zooms
 * towards the pointer. WASD/arrows pan, Q/E turn 90°, R/F tilt, +/- zoom,
 * Space pauses, 1-3 pick a speed, N faces north.
 */
export function attachInput(canvas: HTMLCanvasElement, rig: CameraRig, driver: ClockDriver, onHelp: () => void): (dt: number) => void {
  const held = new Set<string>();
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

  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.code === 'Space') {
      driver.togglePause();
      e.preventDefault();
      return;
    }
    if (k === '1') driver.setSpeed('normal');
    else if (k === '2') driver.setSpeed('fast');
    else if (k === '3') driver.setSpeed('fastest');
    else if (k === 'q') rig.turnQuarter(-1);
    else if (k === 'e') rig.turnQuarter(1);
    else if (k === 'n') rig.faceNorth();
    else if (k === '?' || k === 'h') onHelp();
    else held.add(k);
    if (k.startsWith('arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
  addEventListener('blur', () => held.clear());

  return (dt: number) => {
    if (held.size === 0) return;
    const speed = rig.distance * 0.9 * dt;
    let r = 0;
    let f = 0;
    if (held.has('w') || held.has('arrowup')) f += 1;
    if (held.has('s') || held.has('arrowdown')) f -= 1;
    if (held.has('d') || held.has('arrowright')) r += 1;
    if (held.has('a') || held.has('arrowleft')) r -= 1;
    if (r || f) rig.pan(r * speed, f * speed);
    if (held.has('r')) rig.tilt(dt * 0.8);
    if (held.has('f')) rig.tilt(-dt * 0.8);
    if (held.has('+') || held.has('=')) rig.zoom(Math.exp(-dt * 1.6));
    if (held.has('-') || held.has('_')) rig.zoom(Math.exp(dt * 1.6));
  };
}
