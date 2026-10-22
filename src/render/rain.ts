import * as THREE from 'three';

/**
 * Slice 33: rain, as streaks falling through a box that moves with the
 * camera (one draw, no new meshes in the city). The streaks are placed once;
 * the shader drops them and wraps them round the box, slanted by the wind.
 * `amount` 0 hides it.
 */
const COUNT = 2600;

export interface Rain {
  mesh: THREE.LineSegments;
  /** Each frame: the camera, the point it looks at, the time in seconds, the wind (angle, strength 0 to 1), and how hard it rains (0 to 1, a storm past 1). */
  update(camera: THREE.Camera, target: THREE.Vector3, time: number, windAngle: number, windStrength: number, amount: number): void;
}

export function buildRain(): Rain {
  const pos = new Float32Array(COUNT * 2 * 3);
  const end = new Float32Array(COUNT * 2);
  // A small fixed hash (render code: any spread will do, and it never changes).
  let h = 0x2f6b1d;
  const rnd = (): number => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
  for (let i = 0; i < COUNT; i++) {
    const x = rnd();
    const y = rnd();
    const z = rnd();
    for (let k = 0; k < 2; k++) {
      pos.set([x, y, z], (i * 2 + k) * 3);
      end[i * 2 + k] = k;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uCentre: { value: new THREE.Vector3() },
      uBox: { value: new THREE.Vector3(40, 30, 40) },
      uFall: { value: new THREE.Vector3(0, -1, 0) },
      uLen: { value: 0.9 },
      uSpeed: { value: 22 },
      uAmount: { value: 0 },
      uColor: { value: new THREE.Color('#cfd8de') },
    },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      uniform float uTime;
      uniform vec3 uCentre;
      uniform vec3 uBox;
      uniform vec3 uFall;
      uniform float uLen;
      uniform float uSpeed;
      uniform float uAmount;
      varying float vA;
      void main() {
        // How many of the streaks show: the first ones always, all of them in a downpour.
        float share = position.x * 0.37 + position.z * 0.63;
        vA = step(fract(share * 7.31), uAmount) * (0.35 + 0.65 * aEnd);
        vec3 drop = uFall * uSpeed * uTime;
        vec3 p = position * uBox + drop;
        // Wrap round the box centred on the camera's view.
        vec3 lo = uCentre - uBox * 0.5;
        p = lo + mod(p - lo, uBox);
        p -= uFall * uLen * (1.0 - aEnd);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        if (vA <= 0.0) discard;
        gl_FragColor = vec4(uColor, vA * 0.3);
      }
    `,
  });
  const mesh = new THREE.LineSegments(g, mat);
  mesh.name = 'rain';
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;
  const u = mat.uniforms;
  const camPos = new THREE.Vector3();
  return {
    mesh,
    update(camera, target, time, windAngle, windStrength, amount) {
      mesh.visible = amount > 0.01;
      if (!mesh.visible) return;
      camera.getWorldPosition(camPos);
      const d = camPos.distanceTo(target);
      // A box around the near part of the view: the streaks are drawn where they read as rain, not as a haze on the city far below.
      const size = Math.max(18, Math.min(70, d * 0.55));
      u.uBox.value.set(size, size * 0.8, size);
      (u.uCentre.value as THREE.Vector3).copy(camPos).lerp(target, Math.min(0.5, 14 / Math.max(1, d)) + 0.12);
      const storm = Math.max(0, amount - 1);
      const slant = 0.12 + windStrength * 0.25 + storm * 0.3;
      (u.uFall.value as THREE.Vector3).set(Math.cos(windAngle) * slant, -1, Math.sin(windAngle) * slant).normalize();
      u.uSpeed.value = 20 + storm * 10;
      u.uLen.value = Math.max(0.6, size * 0.025) * (1 + storm * 0.4);
      u.uAmount.value = Math.min(1, amount);
      u.uTime.value = time;
    },
  };
}
