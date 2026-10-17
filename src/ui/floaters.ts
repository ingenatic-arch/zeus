import * as THREE from 'three';

type Tone = 'water' | 'dry' | 'food' | 'religion' | 'culture' | 'tax' | 'wine' | 'fire' | 'safe' | 'sale';

/** Floaters with the same words started within this long (seconds) of each other… */
const MERGE_WITHIN = 0.6;
/** …and this close (tiles) are one floater, counted ("Back to a hut ×5"). */
const MERGE_NEAR = 14;

/**
 * Little labels ("+3") that float up from a spot in the world and fade. The
 * same words rising at the same time near each other (a whole street falling
 * back a level) are one label with a count, and labels that would cover each
 * other on screen are nudged apart.
 */
export class Floaters {
  private items: Array<{ el: HTMLElement; pos: THREE.Vector3; t0: number; text: string; tone: string; n: number; x: number; y: number; w: number }> = [];
  private readonly v = new THREE.Vector3();

  constructor(private readonly root: HTMLElement) {}

  add(text: string, pos: THREE.Vector3, now: number, tone?: Tone): void {
    const t = tone ?? '';
    // (Numbers aren't merged: "+3 ×2" would read as nonsense.)
    const words = !/^[+−-]/.test(text);
    const same = words && this.items.find((it) => it.text === text && it.tone === t && now - it.t0 < MERGE_WITHIN && it.pos.distanceTo(pos) < MERGE_NEAR);
    if (same) {
      same.n++;
      // It rises from the middle of them all.
      same.pos.multiplyScalar((same.n - 1) / same.n).addScaledVector(pos, 1 / same.n);
      same.el.textContent = `${text} ×${same.n}`;
      same.w = estWidth(same.el.textContent);
      return;
    }
    const el = document.createElement('div');
    el.className = tone ? `floater ${tone}` : 'floater';
    el.textContent = text;
    this.root.appendChild(el);
    this.items.push({ el, pos: pos.clone(), t0: now, text, tone: t, n: 1, x: 0, y: 0, w: estWidth(text) });
  }

  update(camera: THREE.Camera, w: number, h: number, now: number): void {
    if (this.items.length === 0) return;
    const keep: typeof this.items = [];
    for (const it of this.items) {
      const age = now - it.t0;
      if (age > 1.8) {
        it.el.remove();
        continue;
      }
      keep.push(it);
      this.v.copy(it.pos);
      this.v.y += 0.9 + age * 0.6;
      this.v.project(camera);
      const behind = this.v.z > 1;
      it.x = (this.v.x * 0.5 + 0.5) * w;
      it.y = behind ? -1e4 : (-this.v.y * 0.5 + 0.5) * h;
      it.el.style.opacity = behind ? '0' : String(Math.min(1, age * 5) * (1 - Math.max(0, age - 1.1) / 0.7));
    }
    this.items = keep;
    // Nudge apart: the newer of two that overlap goes up above the older (a few labels at most, so pairwise is cheap).
    for (let i = 1; i < keep.length; i++) {
      const a = keep[i];
      for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        for (let j = 0; j < i; j++) {
          const b = keep[j];
          if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < LINE) {
            a.y = b.y - LINE;
            moved = true;
          }
        }
        if (!moved) break;
      }
    }
    for (const it of keep) it.el.style.transform = `translate(${Math.round(it.x)}px, ${Math.round(it.y)}px) translate(-50%, -50%)`;
  }
}

/** A label's height on screen, with a little room (px). */
const LINE = 20;
/** About how wide a label is on screen (px), without asking the page to lay it out. */
const estWidth = (text: string): number => 14 + text.length * 7;
