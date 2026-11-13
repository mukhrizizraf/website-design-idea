// AI Skill Shelf: "The Skill Cube", the homepage showcase (ES module, Three.js through the page's import map).
// Every skill is one glossy block in its own colour and symbol. The blocks fly in and snap into a big cube,
// layers twist like a puzzle cube, one block at a time pops out and asks "Pick me!", the visitor can drag the
// cube with momentum, hover a block to slide it out, click it to open the skill, and scrolling explodes the cube.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const outBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function faceTexture(color, glyph) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, color.a); g.addColorStop(1, color.b);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const shine = x.createLinearGradient(0, 0, 0, 256); shine.addColorStop(0, 'rgba(255,255,255,.34)'); shine.addColorStop(.55, 'rgba(255,255,255,0)');
  x.fillStyle = shine; x.fillRect(0, 0, 256, 256);
  const k = 5.4, path = new Path2D(glyph);
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.save(); x.translate(128 - 12 * k + 3, 128 - 12 * k + 5); x.scale(k, k); x.strokeStyle = 'rgba(29,29,31,.32)'; x.lineWidth = 3; x.stroke(path); x.restore();
  x.save(); x.translate(128 - 12 * k, 128 - 12 * k); x.scale(k, k); x.strokeStyle = '#fff'; x.lineWidth = 2.1; x.stroke(path); x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function startSkillCube({ host, canvas, skills, colorOf, glyphOf, onPick, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 820 ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight('#ffffff', 1.3); key.position.set(3, 5, 6); scene.add(key);
  scene.add(new THREE.HemisphereLight('#fff1f8', '#d9e8ff', .5));
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 80);
  camera.position.set(0, 0, 12);

  // ---------- the blocks: a 4 x 4 x 3 cube; spare slots get iridescent glass blocks ----------
  const S = 1.1, DIMS = [4, 4, 3];
  const HALF = DIMS.map(n => (n - 1) / 2 * S);
  const geo = new RoundedBoxGeometry(1, 1, 1, 4, .16);
  const big = new THREE.Group(); scene.add(big);
  const pivot = new THREE.Object3D(); big.add(pivot);
  const slots = [];
  for (let z = DIMS[2] - 1; z >= 0; z--) for (let y = DIMS[1] - 1; y >= 0; y--) for (let x = 0; x < DIMS[0]; x++)
    slots.push(new THREE.Vector3(x * S - HALF[0], y * S - HALF[1], z * S - HALF[2]));
  const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .08, transparent: true, opacity: .55, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [150, 800], clearcoat: 1, envMapIntensity: 1.5 });
  const rand = (a, b) => a + Math.random() * (b - a);
  const blocks = slots.map((p, i) => {
    const skill = skills[i] || null;
    const mat = skill ? new THREE.MeshPhysicalMaterial({ map: faceTexture(colorOf(skill.id), glyphOf(skill.id)), roughness: .3, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .9 }) : glass;
    const slot = new THREE.Object3D(); slot.position.copy(p);
    const mesh = new THREE.Mesh(geo, mat); slot.add(mesh); big.add(slot);
    const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-.2, 1)).normalize();
    const b = { slot, mesh, skill, home: p.clone(), from: dir.multiplyScalar(rand(9, 14)), fromRot: new THREE.Euler(rand(-4, 4), rand(-4, 4), rand(-4, 4)),
      delay: i * .028 + Math.random() * .25, pop: 0, spin: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)) };
    mesh.userData.block = b;
    return b;
  });
  const meshes = blocks.map(b => b.mesh);

  // ---------- puzzle twists: one layer turns, then every block snaps back onto the grid ----------
  const snap = v => Math.round(v / S * 2) / 2 * S;
  let twist = null, nextTwist = 3.2;
  function startTwist(t) {
    const axis = ['x', 'y', 'z'][Math.floor(Math.random() * 3)];
    const layers = [...new Set(blocks.map(b => snap(b.slot.position[axis]).toFixed(2)))];
    const layer = Number(layers[Math.floor(Math.random() * layers.length)]);
    const members = blocks.filter(b => Math.abs(b.slot.position[axis] - layer) < .02);
    // Only the 4 x 4 layers can turn a quarter; the 4 x 3 layers turn half way so the cube keeps its shape.
    const angle = (axis === 'z' ? Math.PI / 2 : Math.PI) * (Math.random() < .5 ? -1 : 1);
    big.updateMatrixWorld(true);
    pivot.rotation.set(0, 0, 0); pivot.updateMatrixWorld(true);
    members.forEach(b => pivot.attach(b.slot));
    twist = { axis, angle, members, t0: t };
  }
  function updateTwist(t) {
    const e = easeInOut(clamp01((t - twist.t0) / .8));
    pivot.rotation[twist.axis] = twist.angle * e;
    if (e >= 1) {
      big.updateMatrixWorld(true);
      twist.members.forEach(b => { big.attach(b.slot); b.slot.position.set(snap(b.slot.position.x), snap(b.slot.position.y), snap(b.slot.position.z)); });
      pivot.rotation.set(0, 0, 0);
      twist = null;
    }
  }
  // The face a block shows on the outside, in the block's own frame (for sliding it out).
  const tmpQ = new THREE.Quaternion(), out = new THREE.Vector3(), radial = new THREE.Vector3();
  function outward(b, target) {
    const p = b.slot.position;
    const r = [Math.abs(p.x) / (HALF[0] || 1), Math.abs(p.y) / (HALF[1] || 1), Math.abs(p.z) / (HALF[2] || 1)];
    const k = r.indexOf(Math.max(...r));
    target.set(0, 0, 0).setComponent(k, Math.sign(p.getComponent(k)) || 1);
    return target;
  }

  // ---------- size and placement ----------
  let scaleFit = 1;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    scaleFit = Math.min(1, (w / h) * 1.15) * (h < 640 ? .82 : 1);
    big.scale.setScalar(.68 * scaleFit);
    big.position.y = w < 820 ? -.15 : -.45;
  }
  addEventListener('resize', resize); resize();

  // ---------- pointer: hover, drag with momentum, click ----------
  const ndc = new THREE.Vector2(9, 9), ray = new THREE.Raycaster();
  let px = 0, py = 0, hovered = null, drag = null, rotY = -.6, rotX = .42, velY = 0, velX = 0, downAt = null;
  const tip = document.createElement('span'); tip.className = 'cube-tip'; tip.hidden = true; document.body.appendChild(tip);
  const bubble = document.createElement('button'); bubble.type = 'button'; bubble.className = 'beg cube-beg'; bubble.hidden = true; document.body.appendChild(bubble);
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5;
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      velY = dx * .006; velX = e.pointerType === 'mouse' ? dy * .005 : 0;
      rotY += velY; rotX = Math.max(-1.1, Math.min(1.1, rotX + velX));
    }
  }, { passive: true });
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; downAt = { x: e.clientX, y: e.clientY }; if (e.pointerType === 'mouse') canvas.setPointerCapture(e.pointerId); });
  const endDrag = e => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6) {
      const r = canvas.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      const b = hit && hit.object.userData.block;
      if (b && b.skill) { b.pop = 1.2; onPick(b.skill, e.clientX, e.clientY); }
    }
    drag = null; downAt = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { drag = null; downAt = null; });
  canvas.addEventListener('pointerleave', () => { if (!drag) { ndc.set(9, 9); } });
  bubble.addEventListener('click', () => { if (beg.block) { const r = bubble.getBoundingClientRect(); onPick(beg.block.skill, r.left + r.width / 2, r.bottom + 40); } });

  // ---------- Pick me! ----------
  const WORDS = ['Pick me!', 'Me! Me!', 'Try me!', 'Ooh, pick me!', 'Choose me!', 'Over here!'];
  const beg = { block: null, t0: -9, next: 4.2 };
  const wpos = new THREE.Vector3();
  function place(el, b, lift) {
    b.mesh.getWorldPosition(wpos); wpos.y += lift * big.scale.x; wpos.project(camera);
    const r = canvas.getBoundingClientRect();
    el.style.left = (r.left + (wpos.x + 1) / 2 * r.width).toFixed(1) + 'px';
    el.style.top = (r.top + (1 - wpos.y) / 2 * r.height).toFixed(1) + 'px';
  }
  function facing(b) { outward(b, out); out.applyQuaternion(b.slot.quaternion).applyQuaternion(big.quaternion); return out.z; }

  // ---------- frame loop ----------
  let last = performance.now(), t = 0, running = true, visible = true, intro = reduced ? 9 : 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && running) requestAnimationFrame(frame); }).observe(host);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });

  function frame(now) {
    if (!running || !visible) return;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;
    const k = 1 - Math.exp(-dt * 8);
    // Scroll through the pinned section: 0 = assembled, 1 = exploded and faded.
    const sr = host.parentElement.getBoundingClientRect();
    const sp = reduced ? 0 : clamp01(-sr.top / Math.max(1, sr.height - innerHeight));
    const boom = smooth(.05, .9, sp);
    canvas.style.opacity = (1 - smooth(.7, 1, sp)).toFixed(3);

    // Intro: every block flies in and snaps into its slot.
    if (intro < 9) {
      intro = Math.min(t, 8.9);
      let done = true;
      blocks.forEach(b => {
        const e = clamp01((t - .2 - b.delay) / 1.1); if (e < 1) done = false;
        const v = outBack(e);
        b.slot.position.lerpVectors(b.from, b.home, v);
        b.mesh.rotation.set(b.fromRot.x * (1 - v), b.fromRot.y * (1 - v), b.fromRot.z * (1 - v));
      });
      if (done) { blocks.forEach(b => { b.slot.position.copy(b.home); b.mesh.rotation.set(0, 0, 0); }); intro = 9; nextTwist = t + 1.2; beg.next = t + 2.2; }
    }

    // Rotation: momentum after a drag, then a slow turn on its own; the pointer tilts it a little.
    if (!drag) { velY *= Math.exp(-dt * 2.2); velX *= Math.exp(-dt * 3); rotY += velY + (reduced ? 0 : dt * .22); rotX = Math.max(-1.1, Math.min(1.1, rotX + velX)); rotX += (.42 - rotX) * (1 - Math.exp(-dt * .8)); }
    big.rotation.set(rotX + (reduced ? 0 : py * .18) + boom * .6, rotY + (reduced ? 0 : px * .3) + boom * 1.4, 0);

    if (intro >= 9 && !reduced) {
      if (twist) updateTwist(t);
      else if (t > nextTwist && !drag && boom < .02) { startTwist(t); nextTwist = t + 2.6 + Math.random() * 1.6; }
    }

    // Hover (not while dragging or exploding).
    hovered = null;
    if (!drag && boom < .05 && intro >= 9) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      hovered = hit ? hit.object.userData.block : null;
    }
    canvas.style.cursor = drag ? 'grabbing' : hovered && hovered.skill ? 'pointer' : 'grab';

    // Pick me: a block on a visible face slides out and wiggles.
    if (!reduced && intro >= 9 && t > beg.next && boom < .05 && !twist) {
      const pool = blocks.filter(b => b.skill && b !== beg.block && b !== hovered && facing(b) > .55);
      if (pool.length) { beg.block = pool[Math.floor(Math.random() * pool.length)]; beg.t0 = t; beg.word = WORDS[Math.floor(Math.random() * WORDS.length)]; }
      beg.next = t + 3.4 + Math.random() * 1.4;
    }
    const begE = beg.block ? clamp01((t - beg.t0) / 2.2) : 1;
    const begEnv = begE < 1 ? Math.sin(Math.PI * begE) : 0;

    blocks.forEach(b => {
      let target = 0, wig = 0;
      if (b === hovered) target = .5;
      if (b === beg.block && begEnv > 0) { target = Math.max(target, .75 * Math.min(1, begEnv * 2)); wig = Math.sin(t * 18) * .12 * begEnv; }
      b.pop += (target - b.pop) * k;
      tmpQ.copy(b.slot.quaternion).invert();
      outward(b, out).applyQuaternion(tmpQ);
      radial.copy(b.home.lengthSq() ? b.slot.position : out).normalize().applyQuaternion(tmpQ);
      b.mesh.position.copy(out).multiplyScalar(b.pop).addScaledVector(radial, boom * boom * 9);
      if (intro >= 9) b.mesh.rotation.set(b.spin.x * boom * 5, b.spin.y * boom * 5, wig + b.spin.z * boom * 5);
    });

    // Name tag on hover, speech bubble on the block asking to be picked.
    if (hovered && hovered.skill && !drag) { tip.textContent = hovered.skill.title; tip.hidden = false; place(tip, hovered, .75); } else tip.hidden = true;
    if (beg.block && begEnv > .05 && boom < .05 && beg.block !== hovered) {
      if (bubble.hidden || bubble.dataset.id !== beg.block.skill.id) {
        bubble.innerHTML = `<b>${beg.word}</b><small>${beg.block.skill.title.replace(/[<>&]/g, '')}</small>`;
        bubble.setAttribute('aria-label', beg.word + ' Open ' + beg.block.skill.title);
        bubble.dataset.id = beg.block.skill.id; bubble.hidden = false;
        bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
      }
      place(bubble, beg.block, .95);
    } else if (!bubble.hidden && document.activeElement !== bubble) bubble.hidden = true;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(t0 => { last = t0; frame(t0); });
  return { stop: () => { running = false; } };
}
