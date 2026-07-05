import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Hostile drones — small low-poly walker/hover units that pursue the player.
// Two types: "walker" (ground, tougher) and "hover" (floats, faster, weaker).
// ---------------------------------------------------------------------------

const BODY = 0x3a3f45;
const BODY_DARK = 0x202327;
const RED = 0xd23a2a;

function mat(color, emissive = 0x000000, ei = 1) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: true, metalness: 0.5, roughness: 0.6,
    emissive, emissiveIntensity: ei,
  });
}

const MB = mat(BODY);
const MD = mat(BODY_DARK, 0x000000);
const MEye = mat(RED, RED, 1.6);

function buildWalker() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.4), MB);
  body.position.y = 1.4;
  body.castShadow = true;
  g.add(body);
  // sensor head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), MD);
  head.position.set(0, 1.7, 0.7);
  g.add(head);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), MEye);
  eye.rotation.x = Math.PI / 2;
  eye.position.set(0, 1.7, 1.02);
  g.add(eye);
  // four legs
  const legPivots = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.5, 1.0, sz * 0.5);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), MD);
    upper.position.set(sx * 0.35, -0.5, sz * 0.35);
    upper.castShadow = true;
    leg.add(upper);
    g.add(leg);
    legPivots.push(leg);
  }
  g.userData.legs = legPivots;
  g.userData.type = 'walker';
  return g;
}

function buildHover() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), MB);
  body.position.y = 2.2;
  body.scale.y = 0.7;
  body.castShadow = true;
  g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 12), MD);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.2;
  g.add(ring);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), MEye);
  eye.position.set(0, 2.2, 0.8);
  g.add(eye);
  g.userData.ring = ring;
  g.userData.type = 'hover';
  return g;
}

export function spawnEnemy(type, x, z) {
  const e = type === 'hover' ? buildHover() : buildWalker();
  e.position.set(x, 0, z);
  e.userData.hp = type === 'hover' ? 2 : 4;
  e.userData.maxHp = e.userData.hp;
  e.userData.speed = type === 'hover' ? 6.5 : 4.0;
  e.userData.type = type;
  e.userData.hitRadius = 1.2;
  e.userData.cooldown = 1 + Math.random() * 1.5;
  e.userData.phase = Math.random() * Math.PI * 2;
  return e;
}

// Advance one enemy toward the target, animate it, and return true if it
// should fire this frame.
export function updateEnemy(e, dt, targetPos, t) {
  const ud = e.userData;
  const dx = targetPos.x - e.position.x;
  const dz = targetPos.z - e.position.z;
  const dist = Math.hypot(dx, dz) || 1;
  const nx = dx / dist, nz = dz / dist;

  // face the player
  e.rotation.y = Math.atan2(nx, nz);

  // approach until within engagement range, then strafe/hold
  const range = ud.type === 'hover' ? 14 : 10;
  if (dist > range) {
    e.position.x += nx * ud.speed * dt;
    e.position.z += nz * ud.speed * dt;
  } else {
    // slow strafe
    e.position.x += -nz * ud.speed * 0.3 * dt;
    e.position.z += nx * ud.speed * 0.3 * dt;
  }

  if (ud.type === 'walker') {
    for (let i = 0; i < ud.legs.length; i++) {
      ud.legs[i].rotation.x = Math.sin(t * 8 + i * Math.PI) * 0.4;
    }
  } else {
    e.position.y = Math.sin(t * 2 + ud.phase) * 0.4;
    if (ud.ring) ud.ring.rotation.z += dt * 3;
  }

  // fire logic
  ud.cooldown -= dt;
  if (ud.cooldown <= 0 && dist < range + 4) {
    ud.cooldown = ud.type === 'hover' ? 1.6 : 2.4;
    return true;
  }
  return false;
}
