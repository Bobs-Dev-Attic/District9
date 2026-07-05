import * as THREE from 'three';

// ---------------------------------------------------------------------------
// The world: a dusty District-9-style wasteland — cracked dirt ground with
// scattered shacks, shipping containers, debris and fences. All low-poly.
// ---------------------------------------------------------------------------

const DIRT = 0x6d5f4a;
const DIRT_DARK = 0x574b3a;
const METAL = 0x555b60;
const RUST = 0x7a4a2c;
const SHACK = 0x8a8375;

function mat(color, rough = 0.9) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: rough, metalness: 0.15 });
}

// Deterministic pseudo-random so the layout is stable between reloads.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildEnvironment(scene, worldSize) {
  const group = new THREE.Group();
  scene.add(group);
  const rng = makeRng(1337);

  // ------ Ground ------
  const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize, 40, 40);
  // gentle noise so it isn't perfectly flat
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = (rng() - 0.5) * 0.6;
    pos.setZ(i, z);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(DIRT, 1.0));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // darker patches
  for (let i = 0; i < 24; i++) {
    const r = 3 + rng() * 6;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 6), mat(DIRT_DARK, 1.0));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set((rng() - 0.5) * worldSize * 0.9, 0.05, (rng() - 0.5) * worldSize * 0.9);
    patch.receiveShadow = true;
    group.add(patch);
  }

  const obstacles = []; // {x,z,r} for collision

  function addObstacle(mesh, x, z, r) {
    mesh.position.x += x;
    mesh.position.z += z;
    group.add(mesh);
    obstacles.push({ x, z, r });
  }

  // ------ Shipping containers ------
  for (let i = 0; i < 10; i++) {
    const w = 3 + rng() * 1.5, h = 2.4 + rng(), d = 7 + rng() * 2;
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(rng() > 0.5 ? METAL : RUST, 0.85));
    c.castShadow = c.receiveShadow = true;
    c.position.y = h / 2;
    c.rotation.y = rng() * Math.PI;
    const x = (rng() - 0.5) * worldSize * 0.75;
    const z = (rng() - 0.5) * worldSize * 0.75;
    if (Math.hypot(x, z) < 12) continue; // keep spawn area clear
    addObstacle(c, x, z, Math.max(w, d) * 0.5);
  }

  // ------ Corrugated shacks ------
  for (let i = 0; i < 16; i++) {
    const shack = new THREE.Group();
    const w = 2.5 + rng() * 2, h = 2 + rng(), d = 2.5 + rng() * 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(SHACK, 0.95));
    body.position.y = h / 2;
    body.castShadow = body.receiveShadow = true;
    shack.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.2, d + 0.4), mat(METAL, 0.8));
    roof.position.y = h + 0.1;
    roof.rotation.z = (rng() - 0.5) * 0.15;
    roof.castShadow = true;
    shack.add(roof);
    shack.rotation.y = rng() * Math.PI;
    const x = (rng() - 0.5) * worldSize * 0.85;
    const z = (rng() - 0.5) * worldSize * 0.85;
    if (Math.hypot(x, z) < 14) continue;
    addObstacle(shack, x, z, Math.max(w, d) * 0.5);
  }

  // ------ Scrap debris / barrels ------
  for (let i = 0; i < 30; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 8), mat(RUST, 0.9));
    barrel.position.y = 0.55;
    barrel.castShadow = barrel.receiveShadow = true;
    const x = (rng() - 0.5) * worldSize * 0.9;
    const z = (rng() - 0.5) * worldSize * 0.9;
    if (Math.hypot(x, z) < 8) continue;
    addObstacle(barrel, x, z, 0.5);
  }

  // ------ Perimeter fence posts ------
  const half = worldSize / 2 - 2;
  for (let i = -half; i <= half; i += 6) {
    for (const [x, z] of [[i, -half], [i, half], [-half, i], [half, i]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), mat(METAL, 0.8));
      post.position.set(x, 1.5, z);
      post.castShadow = true;
      group.add(post);
    }
  }

  return { group, obstacles };
}
