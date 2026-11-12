// AI Skill Shelf: the live 3D wallpaper (ES module, Three.js through the page's import map).
// Glossy candy-coloured objects (stars, sparkles, rings, rounded cubes, gems, iridescent bubbles)
// float and tumble at different depths in front of the CSS colour fields. The camera follows the
// pointer and glides through the field as the page scrolls. Shapes spin away from the pointer and pop when clicked.
// Library: this module runs its own transparent renderer behind the window.
// Homepage (<html data-wall="manual">): the 3D scene imports createField() and adds the shapes behind the glass books.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Apple system colours, no green.
const PALETTE = ['#ff375f', '#ff9f0a', '#ffd60a', '#bf5af2', '#5e5ce6', '#0a84ff', '#64d2ff', '#ff2d55'];

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function star(points, outer, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer, a = i / (points * 2) * Math.PI * 2 + Math.PI / 2;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath(); return s;
}
function sparkle() {
  const s = new THREE.Shape();
  s.moveTo(0, 1); s.quadraticCurveTo(.13, .13, 1, 0); s.quadraticCurveTo(.13, -.13, 0, -1);
  s.quadraticCurveTo(-.13, -.13, -1, 0); s.quadraticCurveTo(-.13, .13, 0, 1); return s;
}
function shapes() {
  const ext = (shape, depth) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .14, bevelSize: .11, bevelSegments: 6, curveSegments: 28 }); g.center(); return g; };
  return {
    cube: new RoundedBoxGeometry(1.25, 1.25, 1.25, 5, .3),
    ring: new THREE.TorusGeometry(.72, .28, 32, 96),
    ball: new THREE.SphereGeometry(.8, 48, 32),
    pill: new THREE.CapsuleGeometry(.4, .9, 12, 32),
    sparkle: ext(sparkle(), .28),
    star: ext(star(5, .95, .46), .32),
    knot: new THREE.TorusKnotGeometry(.52, .17, 180, 24),
    gem: new THREE.IcosahedronGeometry(.85, 0),
    coin: new THREE.CylinderGeometry(.75, .75, .28, 64)
  };
}
const ORDER = ['star', 'ring', 'cube', 'sparkle', 'pill', 'gem', 'knot', 'coin', 'star', 'ring', 'sparkle', 'cube', 'gem', 'pill', 'knot', 'sparkle'];

function candy(color, flat) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color), roughness: .26, metalness: 0, clearcoat: 1, clearcoatRoughness: .1,
    sheen: .5, sheenColor: new THREE.Color('#ffffff'), iridescence: .3, iridescenceIOR: 1.3, envMapIntensity: 1.15, flatShading: !!flat
  });
}
function bubble() {
  return new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: .04, metalness: 0, transparent: true, opacity: .32, depthWrite: false,
    iridescence: 1, iridescenceIOR: 1.33, iridescenceThicknessRange: [120, 900], clearcoat: 1, envMapIntensity: 1.6
  });
}

// A field of floating shapes. area = [width, height] it fills; depth = [far z, near z].
export function createField({ count = 14, bubbles = 3, area = [16, 10], depth = [-12, 1], seed = 7, wrapY = 0 } = {}) {
  const geo = shapes(), r = rng(seed), group = new THREE.Group(), items = [];
  for (let i = 0; i < count; i++) {
    const isBubble = i < bubbles;
    const kind = isBubble ? 'ball' : ORDER[i % ORDER.length];
    const mesh = new THREE.Mesh(geo[kind], isBubble ? bubble() : candy(PALETTE[(i * 3) % PALETTE.length], kind === 'gem'));
    const z = depth[0] + (depth[1] - depth[0]) * r();
    const it = {
      mesh, base: new THREE.Vector3((r() - .5) * area[0], (r() - .5) * area[1], z),
      size: (isBubble ? .7 + r() * .5 : .5 + r() * .55), spin: new THREE.Vector3((r() - .5) * .7, (r() - .5) * .9, (r() - .5) * .5),
      ph: r() * 6.28, f: .15 + r() * .2, boost: 0, s: 1, sv: 0, push: new THREE.Vector3()
    };
    mesh.rotation.set(r() * 6, r() * 6, r() * 6);
    mesh.userData.item = it;
    group.add(mesh); items.push(it);
  }
  const meshes = items.map(i => i.mesh);
  const tmp = new THREE.Vector3();
  return {
    group, items,
    // camY: the camera height, so shapes wrap around it as the page scrolls (wrapY = height of the loop).
    update(t, dt, camY = 0) {
      for (const it of items) {
        const p = it.mesh.position;
        let y = it.base.y + Math.cos(t * it.f * 1.3 + it.ph) * .45;
        if (wrapY) y = ((y - camY + wrapY / 2) % wrapY + wrapY) % wrapY - wrapY / 2 + camY;
        p.set(it.base.x + Math.sin(t * it.f + it.ph) * .4, y, it.base.z + Math.sin(t * it.f * .7 + it.ph * 2) * .3).add(it.push);
        it.push.multiplyScalar(Math.exp(-dt * 1.6));
        const k = 1 + it.boost * 6;
        it.mesh.rotation.x += it.spin.x * dt * k; it.mesh.rotation.y += it.spin.y * dt * k; it.mesh.rotation.z += it.spin.z * dt * k;
        it.boost *= Math.exp(-dt * 1.2);
        // A springy scale: pokes make the shape swell and wobble back.
        it.sv += ((1 - it.s) * 120 - it.sv * 9) * dt; it.s += it.sv * dt;
        it.mesh.scale.setScalar(it.size * it.s);
      }
    },
    // Pointer over a shape: it spins faster and drifts away along the ray.
    hover(ray) {
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) return null;
      const it = hit.object.userData.item;
      if (it.boost < .6) { it.boost = 1; it.sv += 2.5; }
      it.push.add(tmp.copy(ray.ray.direction).multiplyScalar(.04));
      return it;
    },
    // Click: a big pop and spin.
    pop(it) { if (it) { it.sv += 9; it.boost = 2.2; } }
  };
}

// ---------- Library: a stand-alone transparent renderer behind the window ----------
if (document.documentElement.dataset.wall !== 'manual') start();

function start() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = innerWidth < 820;
  const canvas = document.createElement('canvas');
  canvas.className = 'live-wall';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch { return; }   // the CSS colour fields stay on their own
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  let ratio = Math.min(devicePixelRatio, phone ? 1.25 : 1.5);
  renderer.setPixelRatio(ratio);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight('#ffffff', 1.5); key.position.set(4, 6, 6); scene.add(key);
  scene.add(new THREE.HemisphereLight('#ffe6f2', '#cfe4ff', .7));
  scene.fog = new THREE.Fog('#f4eefa', 10, 27);
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .1, 60);
  camera.position.z = 10;

  const visH = 2 * 10 * Math.tan(17.5 * Math.PI / 180);
  const loop = visH * 2.4;
  const field = createField({ count: phone ? 10 : 16, bubbles: phone ? 2 : 3, area: [visH * Math.max(1, innerWidth / innerHeight) * 1.35, loop], depth: [-13, 2.5], wrapY: loop });
  scene.add(field.group);

  const room = document.querySelector('.room');
  if (room) room.after(canvas); else document.body.prepend(canvas);

  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', () => { resize(); if (reduced) renderer.render(scene, camera); });
  resize();

  let tx = 0, ty = 0, px = 0, py = 0, camY = 0, hovered = null;
  const ndc = new THREE.Vector2(9, 9), ray = new THREE.Raycaster();
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; ndc.set(tx * 2, -ty * 2); }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.target.closest?.('a,button,input,label,dialog,.row,.toolbar,.tabbar,.sidebar')) return;
    field.pop(hovered);
  }, { passive: true });

  if (reduced) { field.update(12, 0); renderer.render(scene, camera); document.documentElement.classList.add('wall-on'); return; }

  let last = performance.now(), t = 0, running = true, slow = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;
    const k = 1 - Math.exp(-dt * 2.5);
    px += (tx - px) * k; py += (ty - py) * k;
    // Scrolling glides the camera down through the field, slower than the page, so near shapes pass faster.
    camY += (-scrollY / innerHeight * visH * .55 - camY) * (1 - Math.exp(-dt * 5));
    camera.position.set(px * 1.6, camY - py * 1.1, 10);
    camera.lookAt(px * .4, camY - py * .3, -4);
    field.update(t, dt, camY);
    ray.setFromCamera(ndc, camera);
    hovered = field.hover(ray);
    renderer.render(scene, camera);
    // About two seconds of slow frames: draw fewer pixels.
    slow = dt > .034 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 60 && ratio > .75) { ratio = Math.max(.75, ratio * .8); renderer.setPixelRatio(ratio); resize(); slow = 0; }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; canvas.remove(); });
  requestAnimationFrame(t0 => { last = t0; frame(t0); document.documentElement.classList.add('wall-on'); });
}
