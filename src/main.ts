import './ui/style.css';
import * as THREE from 'three';
import { ClockDriver, type Speed } from './game/clockDriver';
import { Sim } from './sim/sim';
import { TopBar } from './ui/topbar';

const params = new URLSearchParams(location.search);
const sim = new Sim();
const driver = new ClockDriver(sim, (params.get('speed') as Speed) || 'normal');
const ui = document.getElementById('ui') as HTMLElement;
const topbar = new TopBar(ui, driver);

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe0f0');
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(0, 40, 60);
camera.lookAt(0, 0, 0);
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(100, 100).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#a8b85a' })));
scene.add(new THREE.HemisphereLight('#ffffff', '#886644', 2));

function resize(): void {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

addEventListener('keydown', (e) => {
  if (e.code === 'Space') driver.togglePause();
  if (e.key === '1') driver.setSpeed('normal');
  if (e.key === '2') driver.setSpeed('fast');
  if (e.key === '3') driver.setSpeed('fastest');
});

const probe = ((window as unknown as { __zeus: { ready: boolean; frames: number } }).__zeus = { ready: false, frames: 0 });
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  driver.update(dt);
  topbar.showDate(sim.date);
  renderer.render(scene, camera);
  probe.frames++;
});
document.getElementById('loading')?.classList.add('gone');
probe.ready = true;
