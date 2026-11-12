// AI Skill Shelf: the homepage particle story (ES module, Three.js through the page's import map).
// Tens of thousands of candy-coloured particles gather into an open book, then (as the visitor scrolls
// through the chapters) flow into the skill cube, burst into a supernova and settle as books on a shelf.
// Every particle has a place in all four shapes; scroll moves each one between them with its own delay and
// swirl, so shapes melt apart and reform. The pointer pushes particles aside. Bright background, no dark theme.
import * as THREE from 'three';

const rnd = Math.random;
const PINK = '#ff375f', ORANGE = '#ff9f0a', YELLOW = '#ffd60a', PURPLE = '#bf5af2', INDIGO = '#5e5ce6', BLUE = '#0a84ff', SKY = '#64d2ff', ROSE = '#ff2d55';
const INK = '#2a2433';
const col = new THREE.Color(), colB = new THREE.Color();
function hsl(str, fallback) {
  const m = /hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(str || '');
  return m ? new THREE.Color().setHSL(m[1] / 360, m[2] / 100, m[3] / 100) : new THREE.Color(fallback);
}
function tilt(p, rx, ry) {
  const [x, y, z] = p;
  const y1 = y * Math.cos(rx) - z * Math.sin(rx), z1 = y * Math.sin(rx) + z * Math.cos(rx);
  return [x * Math.cos(ry) + z1 * Math.sin(ry), y1, -x * Math.sin(ry) + z1 * Math.cos(ry)];
}
const onRectEdge = (w, h) => { const t = rnd() * 2 * (w + h); return t < w ? [t - w / 2, -h / 2] : t < w + h ? [w / 2, t - w - h / 2] : t < 2 * w + h ? [w / 2 - (t - w - h), h / 2] : [-w / 2, h / 2 - (t - 2 * w - h)]; };

// ---------- the four shapes; each returns a position and writes a colour into `c` ----------
function book(c) {
  const q = rnd();
  let p;
  if (q < .8) {           // two curved stacks of pages
    const side = rnd() < .5 ? -1 : 1, u = Math.pow(rnd(), .85), v = rnd() * 2 - 1, layer = Math.floor(rnd() * 7);
    p = [side * u * 1.85, v * 1.3, Math.sin(u * Math.PI * .95) * .42 * (1 - layer * .07) + layer * .028 - u * .05];
    c.set(side < 0 ? PINK : ORANGE).lerp(colB.set(side < 0 ? ORANGE : YELLOW), u);
  } else if (q < .94) {   // cartoon outline of the cover
    const [x, y] = onRectEdge(4, 2.84); p = [x, y, -.07]; c.set(INK);
  } else {                // spine
    p = [(rnd() - .5) * .06, (rnd() * 2 - 1) * 1.42, -.04 + rnd() * .06]; c.set(PURPLE);
  }
  return tilt(p, -.42, -.18);
}
function cubeShape(cubes) {
  return c => {
    const k = cubes[Math.floor(rnd() * cubes.length)], f = Math.floor(rnd() * 6), a = (rnd() - .5) * .52, b = (rnd() - .5) * .52, h = .27;
    const local = [[h, a, b], [-h, a, b], [a, h, b], [a, -h, b], [a, b, h], [a, b, -h]][f];
    const edge = Math.max(Math.abs(a), Math.abs(b)) > .235;   // dark seams give each block a cartoon outline
    c.copy(edge ? colB.set(INK) : k.color);
    return tilt([k.x + local[0], k.y + local[1], k.z + local[2]], .5, .62);
  };
}
function nova(c) {
  const q = rnd(), d = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
  let r;
  if (q < .16) { r = Math.pow(rnd(), 2) * .55; c.set(YELLOW).lerp(colB.set('#ffffff'), .25); }
  else if (q < .72) { r = 1.55 + (rnd() - .5) * .25; c.set(d.y > 0 ? ORANGE : PINK).lerp(colB.set(PURPLE), Math.abs(d.x) * .6); }
  else { r = 1.7 + Math.pow(rnd(), .6) * 1.9; c.set(rnd() < .5 ? INDIGO : SKY).lerp(colB.set(ROSE), rnd() * .3); }
  return [d.x * r, d.y * r * .92, d.z * r];
}
const SHELF_COLORS = [PINK, ORANGE, YELLOW, SKY, BLUE, INDIGO, PURPLE, ROSE, '#ff6b3d'];
const SHELF_BOOKS = [...[0, 1, 2, 3, 4].map(i => ({ x: -1.6 + i * .8, y: .58, h: .78 + (i % 3) * .07 })), ...[0, 1, 2, 3].map(i => ({ x: -1.2 + i * .8, y: -.92, h: .8 + (i % 2) * .08 }))];
function shelf(c) {
  const q = rnd();
  if (q < .2) {           // two shelf boards
    const board = rnd() < .5 ? .58 : -.92;
    c.set('#8f9bc9').lerp(colB.set('#c9d2f2'), rnd() * .5);
    return tilt([(rnd() - .5) * 4.3, board - .03 + (rnd() < .3 ? -.05 : 0), (rnd() - .5) * .5], .08, -.22);
  }
  const i = Math.floor(rnd() * SHELF_BOOKS.length), b = SHELF_BOOKS[i], w = .62;
  if (rnd() < .17) {      // outline
    const [ex, ey] = onRectEdge(w, b.h); c.set(INK);
    return tilt([b.x + ex, b.y + b.h / 2 + ey, .08], .08, -.22);
  }
  const fx = (rnd() - .5) * w, fy = rnd() * b.h, label = fy > b.h * .14 && fy < b.h * .4 && Math.abs(fx) < w * .36;
  c.set(label ? '#fff4d6' : SHELF_COLORS[i]);
  if (label) c.lerp(colB.set(SHELF_COLORS[i]), .2);
  return tilt([b.x + fx, b.y + fy, .07 + (rnd() < .2 ? -rnd() * .14 : 0)], .08, -.22);
}

const VERT = `
attribute vec3 pA; attribute vec3 pB; attribute vec3 pC; attribute vec3 pD;
attribute vec3 cA; attribute vec3 cB; attribute vec3 cC; attribute vec3 cD;
attribute vec3 rnd; attribute float seed;
uniform float uP; uniform float uTime; uniform float uSize; uniform float uPR; uniform float uIntro; uniform float uAsp; uniform vec2 uMouse;
varying vec3 vCol; varying float vA;
vec3 pick(float i, vec3 a, vec3 b, vec3 c, vec3 d){ return i < .5 ? a : i < 1.5 ? b : i < 2.5 ? c : d; }
void main(){
  float seg = clamp(floor(uP), 0., 2.);
  float f = clamp(uP - seg, 0., 1.);
  float e = smoothstep(0., 1., clamp((f - seed * .3) / .7, 0., 1.));
  vec3 pos = mix(pick(seg, pA, pB, pC, pD), pick(seg + 1., pA, pB, pC, pD), e) + rnd * sin(3.14159 * e) * 1.7;
  vCol = mix(pick(seg, cA, cB, cC, cD), pick(seg + 1., cA, cB, cC, cD), e);
  pos += rnd * .045 * sin(uTime * 1.3 + seed * 31.);
  float g = smoothstep(0., 1., clamp((uIntro - seed * .35) / .65, 0., 1.));
  pos = mix(rnd * 7.5, pos, g);
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * mv;
  vec2 d = (gl_Position.xy / gl_Position.w - uMouse) * vec2(uAsp, 1.);
  float m = exp(-dot(d, d) * 28.);
  gl_Position.xy += normalize(d + 1e-4) / vec2(uAsp, 1.) * m * .14 * gl_Position.w;
  gl_PointSize = uSize * uPR * (.55 + seed * .9) / -mv.z;
  vA = (.62 + .38 * fract(seed * 7.13)) * (.8 + .2 * sin(uTime * 2.2 + seed * 53.));
}`;
const FRAG = `
varying vec3 vCol; varying float vA;
void main(){
  vec2 p = gl_PointCoord - .5;
  float d = length(p);
  if (d > .5) discard;
  vec3 c = vCol * (.86 + .28 * (.5 - p.y));
  c = mix(c, vec3(1.), smoothstep(.22, 0., length(p - vec2(-.13, -.14))) * .5);
  gl_FragColor = vec4(c, smoothstep(.5, .3, d) * vA);
  #include <colorspace_fragment>
}`;

export function startParticles({ canvas, getProgress, reduced, skills = [], colorOf }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const phone = innerWidth < 820;
  let ratio = Math.min(devicePixelRatio, phone ? 1.5 : 1.75);
  renderer.setPixelRatio(ratio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100); camera.position.z = 10;

  // Skill cube: 4 x 4 x 3 blocks, each in its skill's own colour.
  const cubes = [];
  let n = 0;
  for (let z = 2; z >= 0; z--) for (let y = 3; y >= 0; y--) for (let x = 0; x < 4; x++) {
    const s = skills[n++];
    cubes.push({ x: (x - 1.5) * .62, y: (y - 1.5) * .62, z: (z - 1) * .62, color: s && colorOf ? hsl(colorOf(s.id) && colorOf(s.id).a, '#d9d2ff') : new THREE.Color('#d9d2ff') });
  }
  const shapes = [book, cubeShape(cubes), nova, shelf];

  const N = phone ? 16000 : 36000;
  const geo = new THREE.BufferGeometry();
  const P = shapes.map(() => new Float32Array(N * 3)), C = shapes.map(() => new Float32Array(N * 3));
  const R = new Float32Array(N * 3), seed = new Float32Array(N);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    shapes.forEach((shape, k) => { const p = shape(c); P[k].set(p, i * 3); C[k].set([c.r, c.g, c.b], i * 3); });
    const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(.4 + rnd() * .6);
    R.set([v.x, v.y, v.z], i * 3); seed[i] = rnd();
  }
  ['pA', 'pB', 'pC', 'pD'].forEach((a, k) => geo.setAttribute(a, new THREE.BufferAttribute(P[k], 3)));
  ['cA', 'cB', 'cC', 'cD'].forEach((a, k) => geo.setAttribute(a, new THREE.BufferAttribute(C[k], 3)));
  geo.setAttribute('position', new THREE.BufferAttribute(P[0], 3));
  geo.setAttribute('rnd', new THREE.BufferAttribute(R, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
  const U = { uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: phone ? 34 : 30 }, uPR: { value: ratio }, uIntro: { value: reduced ? 1 : 0 }, uAsp: { value: 1 }, uMouse: { value: new THREE.Vector2(9, 9) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
  const group = new THREE.Group(); scene.add(group);
  group.add(new THREE.Points(geo, mat));

  let narrow = phone;
  function resize() {
    const w = innerWidth, h = innerHeight; narrow = w < 820;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    U.uAsp.value = w / h;
  }
  addEventListener('resize', resize); resize();

  const mouse = new THREE.Vector2(9, 9);
  addEventListener('pointermove', e => { mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });
  document.addEventListener('pointerleave', () => mouse.set(9, 9));

  let last = performance.now(), t = 0, running = true, p = 0, spin = 0, slow = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;
    p += (getProgress() - p) * (1 - Math.exp(-dt * 6));
    U.uP.value = p;
    if (!reduced) { U.uTime.value = t; U.uIntro.value = Math.min(1, U.uIntro.value + dt / 2.2); }
    U.uMouse.value.lerp(mouse, 1 - Math.exp(-dt * 10));
    // The book rocks, the cube and the supernova turn, the shelf settles facing the visitor.
    const turning = 1 - Math.min(1, Math.max(0, (p - 2.3) / .6));
    if (!reduced) spin += dt * .35 * turning * Math.min(1, p * 1.5);
    if (turning < 1) { const target = Math.round(spin / (Math.PI * 2)) * Math.PI * 2; spin += (target - spin) * (1 - Math.exp(-dt * 3 * (1 - turning))); }
    group.rotation.y = spin + (reduced ? 0 : Math.sin(t * .5) * .12 * (1 - Math.min(1, p)));
    group.rotation.x = reduced ? 0 : Math.sin(t * .35) * .05;
    // Desktop: the shape sits right of the chapter windows. Phones: above them.
    const sc = narrow ? Math.min(.62, innerWidth / innerHeight * 1.25) : Math.min(1, innerWidth / innerHeight * .62);
    group.scale.setScalar(sc);
    group.position.set(narrow ? 0 : 2.35, narrow ? 1.75 : -.05, 0);
    renderer.render(scene, camera);
    slow = dt > .034 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 60 && ratio > .9) { ratio = Math.max(.9, ratio * .8); renderer.setPixelRatio(ratio); U.uPR.value = ratio; resize(); slow = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(t0 => { last = t0; frame(t0); });
}
