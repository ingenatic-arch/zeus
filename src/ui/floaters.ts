import * as THREE from 'three';

/** Little labels ("+3") that float up from a spot in the world and fade. */
export class Floaters {
  private items: Array<{ el: HTMLElement; pos: THREE.Vector3; t0: number }> = [];
  private readonly v = new THREE.Vector3();

  constructor(private readonly root: HTMLElement) {}

  add(text: string, pos: THREE.Vector3, now: number, tone?: 'water' | 'dry'): void {
    const el = document.createElement('div');
    el.className = tone ? `floater ${tone}` : 'floater';
    el.textContent = text;
    this.root.appendChild(el);
    this.items.push({ el, pos: pos.clone(), t0: now });
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
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      it.el.style.opacity = behind ? '0' : String(Math.min(1, age * 5) * (1 - Math.max(0, age - 1.1) / 0.7));
      it.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`;
    }
    this.items = keep;
  }
}
