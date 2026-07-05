import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildExosuit } from './exosuit.js';
import { buildEnvironment } from './environment.js';
import { createInput } from './input.js';
import { VERSION } from './version.js';

// ===========================================================================
// District 9 — Exosuit Viewer
// A graphics/animation showcase: inspect the low-poly alien exosuit from any
// angle (orbit / zoom / pan) while driving its walk, boost and firing
// animations. Enemies/combat are disabled for now while the look is dialled in.
// ===========================================================================

const WORLD = 140;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2f36);
scene.fog = new THREE.Fog(0x2a2f36, 70, 150);

// ---- Orthographic camera (orbit-controlled) ----
const VIEW = 5;
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -VIEW * aspect, VIEW * aspect, VIEW, -VIEW, 0.1, 500
);
camera.zoom = 1.6;
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('game') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---- Orbit controls: rotate (drag), zoom (wheel / pinch), pan (right-drag / two-finger) ----
const FOCUS_HEIGHT = 2.2; // roughly the suit's torso
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.screenSpacePanning = true;
controls.target.set(0, FOCUS_HEIGHT, 0);
controls.minZoom = 0.5;
controls.maxZoom = 9;
controls.maxPolarAngle = Math.PI - 0.12;   // allow looking up from near ground
controls.minPolarAngle = 0.05;
camera.position.set(7, 7.2, 9);
controls.update();

// ---- Lighting: cool ambient + warm key sun ----
scene.add(new THREE.HemisphereLight(0x9fb0c0, 0x40382c, 0.7));
const sun = new THREE.DirectionalLight(0xffe6c0, 1.4);
sun.position.set(30, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60;
sc.near = 1; sc.far = 200;
scene.add(sun);
scene.add(sun.target);

// ---- World ----
const { obstacles } = buildEnvironment(scene, WORLD);

// ---- Exosuit ----
const suit = buildExosuit();
scene.add(suit);
const CORE_Y = suit.userData.core.position.y;        // resting hip height
const TORSO_HUNCH = suit.userData.torso.rotation.x;  // baked-in forward hunch
const player = {
  pos: new THREE.Vector3(0, 0, 0),
  facing: 0,
  boostFuel: 100, maxFuel: 100,
  fireCooldown: 0,
  recoil: 0,
  radius: 1.4,
  // ---- animation state ----
  prevFacing: 0,
  turnRate: 0,     // smoothed yaw velocity, drives torso counter-rotation
  lean: 0,         // smoothed forward lean (accel / boost)
  landImpact: 0,   // decaying jolt applied on each footfall (stomp settle)
  prevStride: 0,   // previous sign of the stride sine, to detect footfalls
  shudder: 0,      // decaying whole-body shake while firing
};
const SPEED = 12;
const BOOST_SPEED = 26;

// ---- Muzzle tracers (visual only — no combat) ----
const bulletGeo = new THREE.SphereGeometry(0.18, 6, 6);
const bulletMat = new THREE.MeshStandardMaterial({ color: 0xffcf6a, emissive: 0xff9a1a, emissiveIntensity: 2 });
const bullets = []; // {mesh, vel, life}
function fireBullet(origin, dir) {
  const mesh = new THREE.Mesh(bulletGeo, bulletMat);
  mesh.position.copy(origin);
  scene.add(mesh);
  bullets.push({ mesh, vel: dir.clone().multiplyScalar(70), life: 1.6 });
}

// ---- Muzzle flash ----
const effects = []; // {mesh, life, maxLife, scaleRate}
function spawnFlash(pos, color = 0xffd27a, size = 1.2) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true }));
  m.position.copy(pos);
  scene.add(m);
  effects.push({ mesh: m, life: 0.25, maxLife: 0.25, scaleRate: 4 });
}

// ---- Input ----
const input = createInput(renderer.domElement);

// ---- HUD / overlay ----
const fuelFill = document.getElementById('fuel-fill');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const startBtn = document.getElementById('start-btn');
let running = false;

function showOverlay(title, sub, btn) {
  overlayTitle.textContent = title;
  overlaySub.innerHTML = sub;
  startBtn.textContent = btn;
  overlay.classList.remove('hidden');
}
function hideOverlay() { overlay.classList.add('hidden'); }
startBtn.addEventListener('click', () => { hideOverlay(); running = true; });

// Reset the camera to the default framing (R key or the on-screen button).
function resetView() {
  controls.target.set(player.pos.x, FOCUS_HEIGHT, player.pos.z);
  camera.position.set(player.pos.x + 7, 7.2, player.pos.z + 9);
  camera.zoom = 1.6;
  camera.updateProjectionMatrix();
  controls.update();
}
window.addEventListener('keydown', (e) => { if (e.code === 'KeyR') resetView(); });
const resetBtn = document.getElementById('btn-reset');
if (resetBtn) resetBtn.addEventListener('click', resetView);

// ---- Collision against static props (keeps the suit out of containers) ----
function resolveObstacles(pos, radius) {
  for (const o of obstacles) {
    const dx = pos.x - o.x, dz = pos.z - o.z;
    const d = Math.hypot(dx, dz);
    const min = radius + o.r;
    if (d < min && d > 0.001) {
      const push = (min - d);
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
    }
  }
  const lim = WORLD / 2 - 3;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}

// ===========================================================================
// Main loop
// ===========================================================================
const clock = new THREE.Clock();
let walkPhase = 0;
const followPos = new THREE.Vector3();   // last suit position the camera tracked
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const s = input.update();

  if (running) {
    // ----- Movement basis relative to the current camera view -----
    camera.getWorldDirection(_forward);
    _forward.y = 0; _forward.normalize();
    _right.crossVectors(_forward, _up).normalize();
    const move = new THREE.Vector3()
      .addScaledVector(_forward, s.move.y)
      .addScaledVector(_right, s.move.x);
    const moving = move.lengthSq() > 0.001;
    if (moving) move.normalize();

    let speed = SPEED;
    const wantBoost = s.boosting && player.boostFuel > 1 && moving;
    if (wantBoost) {
      speed = BOOST_SPEED;
      player.boostFuel = Math.max(0, player.boostFuel - 35 * dt);
    } else {
      player.boostFuel = Math.min(player.maxFuel, player.boostFuel + 12 * dt);
    }
    player.pos.addScaledVector(move, speed * dt);
    resolveObstacles(player.pos, player.radius);

    // face movement direction
    if (moving) player.facing = Math.atan2(move.x, move.z);

    // ----- Firing (visual showcase of the chaingun recoil) -----
    player.fireCooldown -= dt;
    if (s.firing && player.fireCooldown <= 0) {
      player.fireCooldown = 0.11;
      player.recoil = 1;
      player.shudder = Math.min(1, player.shudder + 0.5);
      const muzzleWorld = new THREE.Vector3();
      suit.userData.muzzle.getWorldPosition(muzzleWorld);
      const dir = new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing));
      dir.x += (Math.random() - 0.5) * 0.05;
      dir.z += (Math.random() - 0.5) * 0.05;
      dir.normalize();
      fireBullet(muzzleWorld, dir);
      spawnFlash(muzzleWorld, 0xffd27a, 0.8);
    }

    // ----- Walk animation (weighted, digitigrade stomp) -----
    const gait = moving ? (wantBoost ? 15 : 9.5) : 0;
    walkPhase += gait * dt;
    const { core, torso, backpack, legs, arms, gunArm } = suit.userData;

    // Decaying jolts.
    player.recoil *= Math.pow(0.02, dt);   // snappy recoil recovery
    player.shudder *= Math.pow(0.001, dt);
    player.landImpact *= Math.pow(0.0005, dt);

    if (moving) {
      const stride = Math.sin(walkPhase);
      // Footfall detection: a foot plants each time the stride sine crosses 0.
      const strideSign = Math.sign(stride);
      if (strideSign !== 0 && strideSign !== player.prevStride) {
        player.landImpact = 1;               // trigger stomp settle
        player.prevStride = strideSign;
      }
      // Thighs swing fore/aft in anti-phase.
      const amp = wantBoost ? 0.62 : 0.5;
      legs[0].userData.thigh.rotation.x = Math.sin(walkPhase) * amp;
      legs[1].userData.thigh.rotation.x = Math.sin(walkPhase + Math.PI) * amp;
      // Knees bend during the swing (leg lifting), stay straight while planted.
      const lift0 = Math.max(0, -Math.cos(walkPhase));
      const lift1 = Math.max(0, -Math.cos(walkPhase + Math.PI));
      legs[0].userData.knee.rotation.x = lift0 * 0.75;
      legs[1].userData.knee.rotation.x = lift1 * 0.75;
      // Shins counter-rotate so the thruster feet stay closer to level.
      legs[0].userData.shin.rotation.x = -lift0 * 0.35;
      legs[1].userData.shin.rotation.x = -lift1 * 0.35;
      // Heavy double-bounce body bob minus a sharp dip on each footfall.
      const bob = Math.abs(stride) * 0.42;
      core.position.y = CORE_Y - 0.12 + bob - player.landImpact * 0.28;
    } else {
      // Idle settle back to the resting stance with subtle "breathing".
      const breathe = Math.sin(t * 1.4) * 0.04;
      core.position.y += (CORE_Y + breathe - core.position.y) * 0.12;
      for (const leg of legs) {
        leg.userData.thigh.rotation.x *= 0.85;
        leg.userData.knee.rotation.x *= 0.85;
        leg.userData.shin.rotation.x *= 0.85;
      }
    }

    // ----- Forward lean (accel / boost) -----
    const targetLean = moving ? (wantBoost ? 0.26 : 0.13) : 0;
    player.lean += (targetLean - player.lean) * Math.min(1, dt * 6);

    // ----- Turn counter-rotation: torso lags the yaw, then catches up -----
    let dFacing = player.facing - player.prevFacing;
    while (dFacing > Math.PI) dFacing -= Math.PI * 2;
    while (dFacing < -Math.PI) dFacing += Math.PI * 2;
    player.turnRate += (dFacing / Math.max(dt, 1e-3) - player.turnRate) * Math.min(1, dt * 8);
    player.prevFacing = player.facing;

    // ----- Compose torso pose: hunch + lean + recoil pitch + firing shudder -----
    const shudderX = player.shudder * (Math.sin(t * 90) * 0.02);
    torso.rotation.x = TORSO_HUNCH + player.lean + player.recoil * 0.10 + shudderX;
    torso.rotation.z = THREE.MathUtils.clamp(-player.turnRate * 0.03, -0.14, 0.14);
    torso.rotation.y = THREE.MathUtils.clamp(-player.turnRate * 0.02, -0.1, 0.1);

    // Backpack / antenna mast lags the body sway for a bit of secondary motion.
    if (backpack) {
      backpack.rotation.x = -player.lean * 0.35 + Math.sin(t * 2.1) * 0.015 + player.landImpact * 0.05;
      backpack.rotation.z = THREE.MathUtils.clamp(player.turnRate * 0.02, -0.1, 0.1);
    }

    // Bent arms: hold the forward elbow bend, bob with the gait, kick on recoil.
    const armBob = Math.sin(walkPhase) * 0.06;
    // Whole-arm (shoulder) swing, opposite to its same-side leg.
    gunArm.rotation.x = Math.sin(walkPhase + Math.PI) * 0.07 - player.recoil * 0.28;
    arms[1].rotation.x = Math.sin(walkPhase) * 0.07;
    // Forearms stay bent (base) and flex slightly through the cycle.
    gunArm.userData.forearm.rotation.x = gunArm.userData.forearmBase + armBob - player.recoil * 0.22;
    arms[1].userData.forearm.rotation.x = arms[1].userData.forearmBase - armBob;

    // ----- Body orientation -----
    suit.position.copy(player.pos);
    suit.position.x += player.shudder * Math.sin(t * 120) * 0.03; // lateral firing shudder
    suit.rotation.y = player.facing;

    fuelFill.style.width = Math.max(0, player.boostFuel) + '%';
  }

  // ----- Tracers -----
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.mesh.position.addScaledVector(b.vel, dt);
    b.life -= dt;
    if (b.life <= 0) { scene.remove(b.mesh); bullets.splice(i, 1); }
  }

  // ----- Muzzle flashes -----
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.life -= dt;
    if (fx.scaleRate) fx.mesh.scale.multiplyScalar(1 + fx.scaleRate * dt);
    fx.mesh.material.opacity = Math.max(0, fx.life / fx.maxLife);
    if (fx.life <= 0) {
      scene.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      effects.splice(i, 1);
    }
  }

  // ----- Camera: keep the orbit rig centred on the suit -----
  // Shift the whole orbit rig by the suit's movement so the user's angle /
  // zoom / pan are preserved while the exosuit stays framed.
  const followDelta = new THREE.Vector3().subVectors(player.pos, followPos);
  camera.position.add(followDelta);
  controls.target.add(followDelta);
  followPos.copy(player.pos);
  controls.update();

  // Keep the sun/shadows over the suit.
  sun.target.position.copy(player.pos);
  sun.position.copy(player.pos).add(new THREE.Vector3(30, 60, 20));

  renderer.render(scene, camera);
}

// ---- Resize ----
window.addEventListener('resize', () => {
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -VIEW * aspect; camera.right = VIEW * aspect;
  camera.top = VIEW; camera.bottom = -VIEW;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Boot ----
showOverlay('DISTRICT 9 · EXOSUIT',
  'Inspect the captured alien exosuit — showcase mode.<br>' +
  '<b>Camera:</b> <span class="keys">Drag</span> rotate · <span class="keys">Scroll</span> zoom · ' +
  '<span class="keys">Right-drag</span> pan · <span class="keys">R</span> reset view<br>' +
  '<b>Suit:</b> <span class="keys">WASD / Arrows</span> walk · <span class="keys">Shift</span> boost · ' +
  '<span class="keys">Space</span> fire<br>' +
  '<span class="dim">On mobile: one finger rotate · pinch zoom · two-finger pan · joystick &amp; buttons drive the suit.</span>',
  'ENTER VIEWER');
const versionEl = document.getElementById('version');
if (versionEl) versionEl.textContent = VERSION;
console.log('District 9 · Exosuit Viewer ' + VERSION);
fuelFill.style.width = '100%';
tick();
