import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Low-poly exosuit builder.
// Loosely modelled on the District 9 alien "Mech" exosuit: a hunched, heavily
// armoured chassis with a sensor-antenna backpack, cable-wrapped tubular arms,
// a heavy chaingun on the right arm, a manipulator claw on the left, and
// reverse-jointed (digitigrade) legs ending in clustered thruster pods.
//
// Everything is built from flat-shaded primitives so it reads as low-poly.
// The returned Group exposes named pivots on `userData` so the game loop can
// animate the walk cycle, recoil, and arm aim.
// ---------------------------------------------------------------------------

const HULL = 0x2b2e33;   // main charcoal armour
const HULL_DARK = 0x17191c; // recesses / cables
const HULL_MID = 0x3a3e44; // raised panels
const ACCENT = 0xd98a3a;  // burnt-orange trim
const GLOW = 0xff7a1a;    // emissive lights / muzzle

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    metalness: opts.metalness ?? 0.55,
    roughness: opts.roughness ?? 0.65,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

const M = {
  hull: mat(HULL),
  dark: mat(HULL_DARK, { metalness: 0.3, roughness: 0.8 }),
  mid: mat(HULL_MID),
  accent: mat(ACCENT, { emissive: GLOW, emissiveIntensity: 0.25, roughness: 0.5 }),
  glow: mat(GLOW, { emissive: GLOW, emissiveIntensity: 1.4, metalness: 0.1 }),
};

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cyl(rt, rb, h, m, seg = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A bundle of hanging cables approximated by a few thin tubes.
function cableBundle(len, count = 4) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const c = cyl(0.05, 0.05, len, M.dark, 5);
    c.position.x = (i - (count - 1) / 2) * 0.11;
    c.position.y = -len / 2;
    c.rotation.z = (i - (count - 1) / 2) * 0.05;
    g.add(c);
  }
  return g;
}

// One clustered thruster foot: a hub with several downward pods, orange banded.
function thrusterFoot() {
  const g = new THREE.Group();
  const hub = box(0.9, 0.25, 1.1, M.mid, 0, 0, 0);
  g.add(hub);
  const offsets = [
    [-0.28, 0.32], [0.28, 0.32], [-0.28, -0.3], [0.28, -0.3], [0, 0.02],
  ];
  for (const [x, z] of offsets) {
    const pod = cyl(0.17, 0.2, 0.5, M.dark, 8);
    pod.position.set(x, -0.32, z);
    g.add(pod);
    const band = cyl(0.185, 0.185, 0.09, M.accent, 8);
    band.position.set(x, -0.2, z);
    g.add(band);
    const nozzle = cyl(0.11, 0.17, 0.14, M.dark, 8);
    nozzle.position.set(x, -0.6, z);
    g.add(nozzle);
  }
  return g;
}

function buildBackpack() {
  const g = new THREE.Group();
  // Central raised block
  g.add(box(1.2, 0.9, 0.9, M.hull, 0, 0.2, -0.1));
  // Two angled antenna towers (trapezoid-ish via scaled boxes)
  for (const s of [-1, 1]) {
    const tower = box(0.42, 1.0, 0.42, M.hull, s * 0.55, 0.75, 0.05);
    tower.rotation.z = s * 0.14;
    tower.scale.set(1, 1, 0.7); // taper feel
    g.add(tower);
    // orange cap band
    const cap = box(0.44, 0.12, 0.44, M.accent, s * 0.62, 1.24, 0.05);
    cap.rotation.z = s * 0.14;
    g.add(cap);
    // thin whip antenna with orange tip
    const whip = cyl(0.02, 0.03, 1.6, M.dark, 5);
    whip.position.set(s * 0.62 - s * 0.05, 2.1, 0.05);
    whip.rotation.z = s * 0.06;
    g.add(whip);
    const tip = cyl(0.035, 0.035, 0.18, M.accent, 5);
    tip.position.set(s * 0.62 - s * 0.05 + s * 0.03, 2.9, 0.05);
    g.add(tip);
  }
  // Central tall thin mast
  const mast = cyl(0.025, 0.04, 1.9, M.dark, 5);
  mast.position.set(0, 1.9, -0.1);
  g.add(mast);
  return g;
}

// The heavy chaingun / rail rifle carried on the right arm.
function buildChaingun() {
  const g = new THREE.Group();
  // receiver body
  g.add(box(0.55, 0.55, 2.6, M.hull, 0, 0, 0.6));
  g.add(box(0.4, 0.4, 0.9, M.mid, 0, 0.1, -0.7)); // breech
  // long barrel
  const barrel = cyl(0.13, 0.13, 2.2, M.dark, 8);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 2.4);
  g.add(barrel);
  // muzzle
  const muzzle = cyl(0.19, 0.19, 0.4, M.dark, 8);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0, 3.5);
  g.add(muzzle);
  // ammo-belt / cooling ribs along the side (the ladder-like detail)
  for (let i = 0; i < 9; i++) {
    const rib = box(0.62, 0.12, 0.12, M.dark, 0, -0.28, -0.1 + i * 0.28);
    g.add(rib);
  }
  // side rail accent
  g.add(box(0.06, 0.1, 2.2, M.accent, 0.3, 0.22, 0.5));
  // muzzle point marker (used for spawning shots)
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0, 3.7);
  g.add(muzzlePoint);
  g.userData.muzzle = muzzlePoint;
  return g;
}

// The manipulator claw on the left arm.
function buildClaw() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.5, 0.7, M.hull, 0, 0, 0.1));
  for (const s of [-1, 1]) {
    const finger = box(0.14, 0.14, 0.7, M.mid, s * 0.18, 0.05, 0.6);
    finger.rotation.x = -0.25;
    g.add(finger);
    const tip = box(0.12, 0.12, 0.3, M.dark, s * 0.18, -0.02, 1.0);
    tip.rotation.x = -0.55;
    g.add(tip);
  }
  const thumb = box(0.14, 0.14, 0.55, M.mid, 0, -0.22, 0.5);
  thumb.rotation.x = 0.5;
  g.add(thumb);
  return g;
}

// Build one arm. side = -1 (left) or +1 (right). The upper arm curves outward
// then the forearm hangs down, matching the silhouette in the reference art.
function buildArm(side, weapon) {
  const shoulder = new THREE.Group();

  // shoulder pauldron
  const pauldron = box(0.9, 0.7, 0.8, M.hull, side * 0.1, 0, 0);
  shoulder.add(pauldron);
  shoulder.add(box(0.95, 0.14, 0.85, M.accent, side * 0.1, 0.42, 0)); // trim

  // curved upper arm reaching out to the side
  const upper = cyl(0.26, 0.3, 1.5, M.mid, 8);
  upper.rotation.z = side * Math.PI * 0.5;
  upper.rotation.x = 0.1;
  upper.position.set(side * 0.85, 0.0, 0);
  shoulder.add(upper);

  // elbow joint
  const elbow = new THREE.Group();
  elbow.position.set(side * 1.6, -0.05, 0.05);
  shoulder.add(elbow);
  elbow.add(cyl(0.3, 0.3, 0.6, M.dark, 8));

  // Forearm bent forward at the elbow (weapons held up in front), matching
  // the walk-reference pose rather than hanging straight down.
  const FOREARM_BEND = -1.15; // radians about x: negative swings the forearm forward
  const forearm = new THREE.Group();
  forearm.position.copy(elbow.position);
  forearm.rotation.x = FOREARM_BEND;
  shoulder.add(forearm);
  const fa = cyl(0.24, 0.28, 1.5, M.mid, 8);
  fa.position.y = -0.75;
  forearm.add(fa);
  // cable bundle running along the forearm
  const cables = cableBundle(1.4, 4);
  cables.position.set(side * 0.28, 0, 0.22);
  forearm.add(cables);

  // wrist + weapon at the end of the forearm
  const wrist = new THREE.Group();
  wrist.position.set(0, -1.5, 0);
  forearm.add(wrist);
  // The weapon's "forward" (+z) should read as forward + slightly down. The
  // forearm bend already pitches the wrist, so cancel it and add a small dip.
  const AIM_PITCH = 0.28; // net downward pitch of the barrel/claw from horizontal
  if (weapon === 'gun') {
    const gun = buildChaingun();
    gun.rotation.x = AIM_PITCH - FOREARM_BEND;
    gun.position.set(0, -0.15, 0.15);
    wrist.add(gun);
    shoulder.userData.muzzle = gun.userData.muzzle;
  } else {
    const claw = buildClaw();
    claw.rotation.x = AIM_PITCH - FOREARM_BEND;
    claw.position.set(0, -0.2, 0.1);
    wrist.add(claw);
  }

  shoulder.userData.forearm = forearm;
  shoulder.userData.forearmBase = FOREARM_BEND; // animation layers on top of this
  return shoulder;
}

function buildLeg(side) {
  // Reverse-jointed digitigrade leg.
  const hip = new THREE.Group();
  hip.add(cyl(0.32, 0.32, 0.5, M.dark, 8)); // hip joint

  // thigh (angled forward)
  const thigh = new THREE.Group();
  hip.add(thigh);
  const thighMesh = box(0.6, 1.4, 0.7, M.hull, 0, -0.7, 0.1);
  thighMesh.rotation.x = -0.2;
  thigh.add(thighMesh);
  // big armour shin plate visible from front
  const plate = box(0.7, 1.3, 0.18, M.mid, 0, -0.7, 0.5);
  plate.rotation.x = -0.2;
  thigh.add(plate);
  thigh.add(box(0.72, 0.12, 0.2, M.accent, 0, -1.3, 0.55)); // trim

  // knee
  const knee = new THREE.Group();
  knee.position.set(0, -1.5, 0.35);
  thigh.add(knee);
  knee.add(cyl(0.28, 0.28, 0.5, M.dark, 8));

  // shin (angled back — the reverse joint)
  const shin = new THREE.Group();
  knee.add(shin);
  const shinMesh = box(0.5, 1.5, 0.55, M.hull, 0, -0.75, -0.25);
  shinMesh.rotation.x = 0.35;
  shin.add(shinMesh);
  // hydraulic detail
  const hyd = cyl(0.09, 0.09, 1.3, M.dark, 6);
  hyd.position.set(side * 0.22, -0.7, -0.1);
  hyd.rotation.x = 0.35;
  shin.add(hyd);

  // ankle + thruster foot
  const ankle = new THREE.Group();
  ankle.position.set(0, -1.5, -0.55);
  shin.add(ankle);
  const foot = thrusterFoot();
  foot.position.set(0, -0.1, 0.15);
  ankle.add(foot);

  hip.userData.thigh = thigh;
  hip.userData.knee = knee;
  hip.userData.shin = shin;
  return hip;
}

export function buildExosuit() {
  const suit = new THREE.Group();

  // ------ Pelvis / core (root that bobs during walk) ------
  const core = new THREE.Group();
  core.position.y = 4.2;
  suit.add(core);

  // ------ Torso ------
  const torso = new THREE.Group();
  core.add(torso);

  // upper chest — broad, faceted
  const chest = box(2.3, 1.3, 1.6, M.hull, 0, 0.9, 0);
  torso.add(chest);
  // beveled collar
  const collar = box(2.6, 0.4, 1.8, M.mid, 0, 1.5, 0);
  torso.add(collar);
  // sensor "eye" on the chest
  const eye = cyl(0.22, 0.22, 0.12, M.glow, 12);
  eye.rotation.x = Math.PI / 2;
  eye.position.set(0, 1.0, 0.82);
  torso.add(eye);

  // lower torso tapering to pelvis (the pointed "chin" of the chassis)
  const belly = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 1.0, 1.6, 6),
    M.hull
  );
  belly.position.set(0, -0.1, 0.15);
  belly.castShadow = true;
  torso.add(belly);
  // groin guard plate
  const guard = box(1.0, 0.9, 0.5, M.mid, 0, -0.5, 0.6);
  guard.rotation.x = 0.2;
  torso.add(guard);

  // backpack sits behind the collar
  const backpack = buildBackpack();
  backpack.position.set(0, 1.6, -0.9);
  torso.add(backpack);

  // ------ Arms attach to the collar sides ------
  const leftArm = buildArm(-1, 'gun');   // heavy chaingun on the suit's left
  leftArm.position.set(-1.5, 1.15, 0);
  torso.add(leftArm);

  const rightArm = buildArm(1, 'claw');
  rightArm.position.set(1.5, 1.15, 0);
  torso.add(rightArm);

  // ------ Legs attach to the pelvis ------
  // Wide, planted stance to match the hunched reference pose.
  const leftLeg = buildLeg(-1);
  leftLeg.position.set(-0.9, -0.7, 0);
  core.add(leftLeg);

  const rightLeg = buildLeg(1);
  rightLeg.position.set(0.9, -0.7, 0);
  core.add(rightLeg);

  // Resting forward hunch — the chassis tips forward over the hips.
  torso.rotation.x = 0.09;

  // Expose pivots for animation.
  suit.userData = {
    core, torso, backpack,
    legs: [leftLeg, rightLeg],
    arms: [leftArm, rightArm],
    gunArm: leftArm,
    muzzle: leftArm.userData.muzzle,
  };

  suit.scale.setScalar(0.5);
  return suit;
}
