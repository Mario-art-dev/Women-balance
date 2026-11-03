/* Isotipo de Clínica Montesinos en 3D (Three.js). Si WebGL no está disponible se queda el SVG plano. */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('iso3d');
const stage = document.querySelector('.hero-stage');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 62 210 208">
<path d="M134.8 266.9C138.9 266.2 141.5 252.1 141.4 230.5C141.3 193.3 128.4 159.3 104.1 132C92 118.5 80 108 70.5 102.8C69.6 103.9 70.4 106 73.3 109.2C82.8 120.8 86 134.5 82.1 146.9C75.7 167.4 54 176 32.5 166.5C24 162.6 16 156.5 10.8 150.6C9.6 151.4 9.8 177.8 11.1 184.6C17.8 222.4 46.8 254.3 84 264.6C89.2 266 94 267.3 94.5 267.5C95.5 267.9 132.4 267.3 134.8 266.9Z"/>
<path d="M184 239C200.2 223.1 208.7 207.6 213.2 186C216.5 170.3 214.9 146.4 209.9 133.8C208.3 129.8 207.2 130.3 200.5 138.1C181 160.6 168.8 188.7 165 219.4C164 227.9 163.7 251.7 164.7 253.2C165.7 255 174 248.8 184 239Z"/>
<path d="M180.8 106C187.2 104.6 191.4 103.1 191.7 102.3C192.8 99.4 170 78 152.4 71.6C139 66 133 64.8 114.9 64.3C99.2 63.8 97.7 63.9 87.4 66.6C75 69.6 60 76 49.7 84.9L53.6 85.5C60.9 86.8 73.3 90.1 83.4 93.5C125.4 107.6 132 109.1 154 108.6C166.6 108.4 172.9 107.7 180.8 106Z"/>
</svg>`;

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; // sin WebGL: queda el isotipo plano
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 4000);
  camera.position.set(0, 0, 860);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-300, 400, 600);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xedd7c8, 1.2); // luz cálida (arena de la marca)
  rim.position.set(500, -200, -300);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xe1eff0, 0.6));

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#7FC3CD'),
    roughness: 0.32,
    metalness: 0.0,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    sheen: 0.6,
    sheenColor: new THREE.Color('#E1EFF0'),
    sheenRoughness: 0.5,
  });

  const data = new SVGLoader().parse(SVG);
  const group = new THREE.Group();
  const pieces = [];
  data.paths.forEach((path, i) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 26, bevelEnabled: true, bevelThickness: 7, bevelSize: 4.2, bevelSegments: 10, curveSegments: 48,
      });
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material);
      const holder = new THREE.Group();
      holder.add(mesh);
      group.add(holder);
      pieces.push({ holder, i });
    });
  });

  // Centrar el isotipo (el eje Y del SVG va hacia abajo)
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  pieces.forEach(({ holder }) => holder.children[0].position.set(-center.x, -center.y, -center.z));
  group.scale.set(1, -1, 1);
  group.updateMatrixWorld(true);
  const pivot = new THREE.Group();
  pivot.add(group);
  scene.add(pivot);

  // Centro de cada pieza para que se separen hacia fuera
  pieces.forEach((p) => {
    // centro de la pieza en coordenadas del grupo (antes de invertir Y)
    const b = new THREE.Box3().setFromObject(p.holder.children[0]);
    const c = b.getCenter(new THREE.Vector3()).applyMatrix4(group.matrixWorld.clone().invert());
    p.dir = new THREE.Vector3(c.x, c.y, 0).normalize();
    p.phase = p.i * 2.1;
  });

  const size = () => {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // encuadrar el isotipo (≈210 unidades) ocupando ~78% del lienzo
    const fit = 215 / 0.78;
    camera.position.z = fit / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.updateProjectionMatrix();
  };
  size();
  window.addEventListener('resize', size);

  // Ratón
  const target = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0, s: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = e.clientX / window.innerWidth - 0.5;
    target.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const scrollProgress = () => {
    const y = window.__lenis ? window.__lenis.scroll : window.scrollY;
    return Math.min(1, Math.max(0, y / window.innerHeight));
  };

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(stage);

  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    smooth.x += (target.x - smooth.x) * 0.05;
    smooth.y += (target.y - smooth.y) * 0.05;
    smooth.s += (scrollProgress() - smooth.s) * 0.08;
    const s = smooth.s;

    pivot.rotation.y = -0.38 + smooth.x * 0.55 + Math.sin(t * 0.35) * 0.08 + s * 1.1;
    pivot.rotation.x = 0.12 + smooth.y * 0.35 + Math.cos(t * 0.3) * 0.05 - s * 0.35;
    pivot.rotation.z = Math.sin(t * 0.2) * 0.04 + s * 0.25;

    pieces.forEach((p) => {
      const breathe = 4 + Math.sin(t * 0.9 + p.phase) * 3;
      const spread = breathe + s * 70;
      p.holder.position.set(p.dir.x * spread, p.dir.y * spread, Math.sin(t * 0.7 + p.phase) * 8 + s * 40 * (p.i - 1));
      p.holder.rotation.z = Math.sin(t * 0.5 + p.phase) * 0.03;
    });
    renderer.render(scene, camera);
  };

  document.documentElement.classList.add('is-3d');

  if (reduce) {
    pivot.rotation.set(0.1, -0.35, 0);
    renderer.render(scene, camera);
    window.addEventListener('resize', () => renderer.render(scene, camera));
    return;
  }
  renderer.setAnimationLoop(() => { if (visible) render(); });
}

init();
