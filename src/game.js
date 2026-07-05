import * as THREE from 'three';
import { buildExosuit } from './exosuit.js';
import { buildEnvironment } from './environment.js';
import { spawnEnemy, updateEnemy } from './enemies.js';
import { createInput } from './input.js';
import { VERSION } from './version.js';

// ===========================================================================
// District 9 — Exosuit Simulator
// Isometric low-poly action sim. Pilot the alien exosuit across a wasteland,
// fend off waves of hostile drones with the arm chaingun and thruster boosts.
// ===========================================================================

const WORLD = 140;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2f36);
scene.fog = new THREE.Fog(0x2a2f36, 60, 130);

// ---- Isometric orthographic camera ----
const VIEW = 20;
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -VIEW * aspect, VIEW * aspect, VIEW, -VIEW, 0.1, 500
);
// classic iso angle
const CAM_OFFSET = new THREE.Vector3(40, 46, 40);
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('game') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

// ---- Player exosuit ----
const suit = buildExosuit();
scene.add(suit);
const player = {
  pos: new THREE.Vector3(0, 0, 0),
  vel: new THREE.Vector3(),
  facing: 0,
  hp: 100, maxHp: 100,
  boostFuel: 100, maxFuel: 100,
  fireCooldown: 0,
  recoil: 0,
  radius: 1.4,
  alive: true,
};
const SPEED = 12;
const BOOST_SPEED = 26;

// ---- Projectile pools ----
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const bulletGeo = new THREE.SphereGeometry(0.22, 6, 6);
const playerBulletMat = new THREE.MeshStandardMaterial({ color: 0xffcf6a, emissive: 0xff9a1a, emissiveIntensity: 2 });
const enemyBulletMat = new THREE.MeshStandardMaterial({ color: 0xff5a3a, emissive: 0xff2a1a, emissiveIntensity: 2 });
const bullets = []; // {mesh, vel, life, dmg, fromPlayer}

function fireBullet(origin, dir, fromPlayer, speed, dmg) {
  const mesh = new THREE.Mesh(bulletGeo, fromPlayer ? playerBulletMat : enemyBulletMat);
  mesh.position.copy(origin);
  scene.add(mesh);
  bullets.push({ mesh, vel: dir.clone().multiplyScalar(speed), life: 3, dmg, fromPlayer });
}

// ---- Muzzle flash + explosions (simple particle sprites) ----
const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true });
const effects = []; // {mesh, life, maxLife, scaleRate}
function spawnFlash(pos, color = 0xffd27a, size = 1.2) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true }));
  m.position.copy(pos);
  scene.add(m);
  effects.push({ mesh: m, life: 0.25, maxLife: 0.25, scaleRate: 4 });
}
function spawnExplosion(pos) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff8a2a : 0x444444, transparent: true }));
    m.position.copy(pos).add(new THREE.Vector3(0, 1, 0));
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
    scene.add(m);
    effects.push({ mesh: m, life: 0.6, maxLife: 0.6, vel: dir.multiplyScalar(6 + Math.random() * 6), gravity: true });
  }
  spawnFlash(pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffaa3a, 2.2);
}

// ---- Enemies + waves ----
const enemies = [];
let wave = 0;
let score = 0;
let betweenWaves = 3;

function startWave() {
  wave++;
  const count = 3 + wave * 2;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 20;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const type = Math.random() < 0.35 + wave * 0.03 ? 'hover' : 'walker';
    const e = spawnEnemy(type, x, z);
    scene.add(e);
    enemies.push(e);
  }
  updateHud();
}

// ---- Input ----
const input = createInput(renderer.domElement);

// Screen-space basis for iso movement: "up" on screen moves toward -X-Z etc.
// With the camera looking from (+x,+y,+z) toward origin, screen-up maps to a
// direction in the ground plane. Compute it once.
const camForward = new THREE.Vector3(0, 0, 0).sub(CAM_OFFSET).setY(0).normalize();
const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camForward).normalize();

// ---- HUD ----
const hud = {
  hp: document.getElementById('hp-fill'),
  fuel: document.getElementById('fuel-fill'),
  score: document.getElementById('score'),
  wave: document.getElementById('wave'),
  enemies: document.getElementById('enemies'),
};
function updateHud() {
  hud.hp.style.width = Math.max(0, player.hp) + '%';
  hud.fuel.style.width = Math.max(0, player.boostFuel) + '%';
  hud.score.textContent = score;
  hud.wave.textContent = wave;
  hud.enemies.textContent = enemies.length;
}

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

function resetGame() {
  for (const e of enemies) scene.remove(e);
  enemies.length = 0;
  for (const b of bullets) scene.remove(b.mesh);
  bullets.length = 0;
  player.pos.set(0, 0, 0);
  player.hp = player.maxHp;
  player.boostFuel = player.maxFuel;
  player.alive = true;
  wave = 0; score = 0; betweenWaves = 2;
  updateHud();
}

startBtn.addEventListener('click', () => {
  if (!player.alive || wave === 0) resetGame();
  hideOverlay();
  running = true;
});

// ===========================================================================
// Collision helper against static obstacles.
// ===========================================================================
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

function aimPoint() {
  // Where the player is aiming on the ground plane (mouse) or movement dir.
  if (!input.state.isTouch && input.state.mouse.active) {
    raycaster.setFromCamera(input.state.mouse, camera);
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, pt)) return pt;
  }
  // touch / fallback: aim toward facing
  return new THREE.Vector3(
    player.pos.x + Math.sin(player.facing) * 10,
    0,
    player.pos.z + Math.cos(player.facing) * 10
  );
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const s = input.update();

  if (running && player.alive) {
    // ----- Movement (screen-relative iso) -----
    const move = new THREE.Vector3()
      .addScaledVector(camForward, s.move.y)
      .addScaledVector(camRight, s.move.x);
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

    // face movement / aim
    const aim = aimPoint();
    const adx = aim.x - player.pos.x, adz = aim.z - player.pos.z;
    if (Math.hypot(adx, adz) > 0.5) {
      player.facing = Math.atan2(adx, adz);
    } else if (moving) {
      player.facing = Math.atan2(move.x, move.z);
    }

    // ----- Firing -----
    player.fireCooldown -= dt;
    if (s.firing && player.fireCooldown <= 0) {
      player.fireCooldown = 0.11;
      player.recoil = 1;
      // muzzle world position
      const muzzleWorld = new THREE.Vector3();
      suit.userData.muzzle.getWorldPosition(muzzleWorld);
      const dir = new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing));
      // slight spread
      dir.x += (Math.random() - 0.5) * 0.05;
      dir.z += (Math.random() - 0.5) * 0.05;
      dir.normalize();
      fireBullet(muzzleWorld.add(new THREE.Vector3(0, 0, 0)), dir, true, 70, 1);
      spawnFlash(muzzleWorld, 0xffd27a, 0.8);
    }

    // ----- Walk animation -----
    const gait = moving ? (wantBoost ? 16 : 10) : 0;
    walkPhase += gait * dt;
    const { core, legs, arms, gunArm } = suit.userData;
    if (moving) {
      core.position.y = 4.2 + Math.abs(Math.sin(walkPhase)) * 0.35;
      legs[0].userData.thigh.rotation.x = Math.sin(walkPhase) * 0.5;
      legs[1].userData.thigh.rotation.x = Math.sin(walkPhase + Math.PI) * 0.5;
      legs[0].userData.knee.rotation.x = Math.max(0, Math.cos(walkPhase)) * 0.5;
      legs[1].userData.knee.rotation.x = Math.max(0, Math.cos(walkPhase + Math.PI)) * 0.5;
    } else {
      // idle settle
      core.position.y += (4.2 - core.position.y) * 0.1;
      for (const leg of legs) {
        leg.userData.thigh.rotation.x *= 0.85;
        leg.userData.knee.rotation.x *= 0.85;
      }
    }
    // gentle arm sway + recoil kick on the gun arm
    player.recoil *= 0.8;
    arms[1].userData.forearm.rotation.x = Math.sin(walkPhase + 1) * 0.1;
    gunArm.userData.forearm.rotation.x = -0.15 - player.recoil * 0.4;

    // ----- Body orientation -----
    suit.position.copy(player.pos);
    suit.rotation.y = player.facing;

    // ----- Enemies -----
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const fire = updateEnemy(e, dt, player.pos, t);
      resolveObstacles(e.position, 1.0);
      if (fire) {
        const ep = e.position.clone(); ep.y = e.userData.type === 'hover' ? 2.2 : 1.6;
        const dir = player.pos.clone().setY(1.5).sub(ep).normalize();
        fireBullet(ep, dir, false, 26, 8);
        spawnFlash(ep, 0xff6a3a, 0.6);
      }
    }

    // ----- Bullets -----
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      let hit = false;

      if (b.fromPlayer) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const ec = e.position.clone(); ec.y = e.userData.type === 'hover' ? 2.2 : 1.5;
          if (b.mesh.position.distanceTo(ec) < e.userData.hitRadius + 0.3) {
            e.userData.hp -= b.dmg;
            hit = true;
            if (e.userData.hp <= 0) {
              spawnExplosion(e.position);
              scene.remove(e);
              enemies.splice(j, 1);
              score += e.userData.type === 'hover' ? 15 : 10;
            } else {
              spawnFlash(b.mesh.position, 0xffffff, 0.4);
            }
            break;
          }
        }
      } else {
        const pc = player.pos.clone().setY(1.8);
        if (b.mesh.position.distanceTo(pc) < player.radius + 0.4) {
          player.hp -= b.dmg;
          hit = true;
          spawnFlash(b.mesh.position, 0xff4a2a, 0.6);
          if (player.hp <= 0) gameOver();
        }
      }

      if (hit || b.life <= 0) {
        scene.remove(b.mesh);
        bullets.splice(i, 1);
      }
    }

    // ----- Wave management -----
    if (enemies.length === 0) {
      betweenWaves -= dt;
      if (betweenWaves <= 0) {
        betweenWaves = 3;
        startWave();
      }
    }

    updateHud();
  }

  // ----- Effects (run even when paused so death anim finishes) -----
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.life -= dt;
    if (fx.vel) {
      fx.mesh.position.addScaledVector(fx.vel, dt);
      if (fx.gravity) fx.vel.y -= 18 * dt;
    }
    if (fx.scaleRate) fx.mesh.scale.multiplyScalar(1 + fx.scaleRate * dt);
    fx.mesh.material.opacity = Math.max(0, fx.life / fx.maxLife);
    fx.mesh.rotation.x += dt * 5; fx.mesh.rotation.y += dt * 4;
    if (fx.life <= 0) {
      scene.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      effects.splice(i, 1);
    }
  }

  // ----- Camera follow -----
  camera.position.lerp(player.pos.clone().add(CAM_OFFSET), 0.08);
  camera.lookAt(player.pos.x, 2, player.pos.z);
  sun.target.position.copy(player.pos);
  sun.position.copy(player.pos).add(new THREE.Vector3(30, 60, 20));

  renderer.render(scene, camera);
}

function gameOver() {
  player.alive = false;
  running = false;
  spawnExplosion(player.pos);
  showOverlay('EXOSUIT DESTROYED',
    `You reached <b>Wave ${wave}</b> with a score of <b>${score}</b>.`,
    'REDEPLOY');
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
  'Pilot the captured alien exosuit. Survive the drone waves.<br>' +
  '<span class="keys">WASD / Arrows</span> move · <span class="keys">Mouse</span> aim · ' +
  '<span class="keys">Click / Space</span> fire · <span class="keys">Shift</span> thruster boost<br>' +
  '<span class="dim">On mobile: use the on-screen joystick &amp; buttons.</span>',
  'DEPLOY');
const versionEl = document.getElementById('version');
if (versionEl) versionEl.textContent = VERSION;
console.log('District 9 · Exosuit Simulator ' + VERSION);
updateHud();
tick();
