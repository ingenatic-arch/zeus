import * as THREE from 'three';

let shared: THREE.Texture | null = null;

/**
 * A soft round blot, white, opaque at its heart and fading to nothing at its
 * edge, a little ragged: smoke, dust and steam are drawn as squares turned to
 * the camera with this on them (drawn here once, shared).
 */
export function puffTexture(): THREE.Texture {
  if (shared) return shared;
  const n = 64;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const blot = (x: number, y: number, r: number, a: number): void => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(0.55, `rgba(255,255,255,${a * 0.6})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, n, n);
  };
  blot(32, 34, 30, 0.85);
  for (const [x, y, r] of [[22, 26, 14], [42, 24, 13], [40, 42, 14], [24, 42, 12]] as const) blot(x, y, r, 0.35);
  shared = new THREE.CanvasTexture(c);
  shared.colorSpace = THREE.SRGBColorSpace;
  return shared;
}
