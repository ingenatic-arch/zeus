import * as THREE from 'three';
import { col, PAL } from './palette';

/** A soft sky dome: warm haze at the horizon fading to blue overhead, with a glow around the sun. */
export function buildSky(sunDir: THREE.Vector3): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    // The haze (fog) colour is not tone-mapped, so the sky isn't either:
    // otherwise the sky at the horizon is a shade darker than the haze below
    // it, and a line runs along the horizon.
    toneMapped: false,
    uniforms: {
      uZenith: { value: col(PAL.skyZenith).clone() },
      uHorizon: { value: col(PAL.skyHorizon).clone() },
      uSun: { value: sunDir.clone().normalize() },
      uSunCol: { value: col(PAL.sun).clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSun;
      uniform vec3 uSunCol;
      varying vec3 vDir;
      void main() {
        float h = max(vDir.y, 0.0);
        vec3 c = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.4, h), 0.45));
        float s = max(dot(normalize(vDir), uSun), 0.0);
        c += uSunCol * (pow(s, 12.0) * 0.18 + pow(s, 400.0) * 0.6);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 24, 12), mat);
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  return sky;
}
