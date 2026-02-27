/* global THREE */

const container = document.getElementById("game-container");
const scoreText = document.getElementById("score");
const speedText = document.getElementById("speed");

const WIDTH = 560;
const HEIGHT = 560;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070c18);
scene.fog = new THREE.Fog(0x070c18, 15, 55);

const camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 0.1, 200);
camera.position.set(0, 3, 6);
camera.lookAt(0, 0, -20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const LANE_COUNT = 7;
const WORLD_HALF = 3.5;
const LANE_WIDTH = (2 * WORLD_HALF) / LANE_COUNT;
const CUBE_SIZE = 0.85;
const PLAYER_DEPTH = 1.2;
const PLAYER_WIDTH = 0.7;
const SPAWN_Z = -45;
const BASE_SPEED = 16;
const SPAWN_EVERY = 1.35;

// Only lanes 1–5 are used; lanes 0 and 6 are always clear so you can pass along the edges.
// Each row has at most 3 blocks so there are always wide gaps.
const patterns = [
  [2, 4],
  [1, 3, 5],
  [3],
  [1, 4],
  [2, 5],
  [1, 5],
  [2, 3, 4],
  [4],
  [1, 2],
  [3, 5],
  [1, 3],
  [2],
  [4, 5],
  [1, 2, 4],
  [3, 4]
];

const state = {
  running: true,
  over: false,
  score: 0,
  elapsed: 0,
  spawnTimer: 0,
  moveLeft: false,
  moveRight: false,
  playerX: 0,
  playerSpeed: 5,
  obstacles: [],
  obstacleMeshes: []
};

let playerMesh = null;
const playerGroup = new THREE.Group();
scene.add(playerGroup);

function laneCenterX(laneIndex) {
  return -WORLD_HALF + (laneIndex + 0.5) * LANE_WIDTH;
}

function createPlayer() {
  if (playerMesh) {
    playerGroup.remove(playerMesh);
    if (playerMesh.geometry) playerMesh.geometry.dispose();
    if (playerMesh.material) playerMesh.material.dispose();
  }
  const geometry = new THREE.ConeGeometry(0.5, 1.2, 8);
  const material = new THREE.MeshPhongMaterial({
    color: 0x71e9ff,
    shininess: 80,
    specular: 0x444444
  });
  playerMesh = new THREE.Mesh(geometry, material);
  playerMesh.rotation.x = -Math.PI / 2;
  playerMesh.position.z = 0;
  playerGroup.add(playerMesh);
}

function createObstacleMesh() {
  const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
  const material = new THREE.MeshPhongMaterial({
    color: 0xff7d9f,
    shininess: 60,
    specular: 0x333333
  });
  return new THREE.Mesh(geometry, material);
}

function addLights() {
  const ambient = new THREE.AmbientLight(0x404060);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(2, 8, 10);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x71a0ff, 0.25);
  fill.position.set(-3, 2, 5);
  scene.add(fill);
}

function addCorridor() {
  const corridorGeom = new THREE.BufferGeometry();
  const w = WORLD_HALF + 1;
  const step = 4;
  const vertices = [];
  for (let z = -80; z <= 20; z += step) {
    vertices.push(-w, -0.5, z, w, -0.5, z);
    vertices.push(w, -0.5, z, w, -0.5, z + step);
    vertices.push(w, -0.5, z + step, -w, -0.5, z + step);
    vertices.push(-w, -0.5, z + step, -w, -0.5, z);
  }
  corridorGeom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  corridorGeom.computeBoundingSphere();
  const corridorMat = new THREE.LineBasicMaterial({
    color: 0x2a3f66,
    transparent: true,
    opacity: 0.6
  });
  const corridor = new THREE.LineSegments(corridorGeom, corridorMat);
  scene.add(corridor);

  const floorGeom = new THREE.PlaneGeometry(w * 2, 120, 1, 30);
  const floorMat = new THREE.MeshBasicMaterial({
    color: 0x0a0f1a,
    side: THREE.DoubleSide
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -30;
  scene.add(floor);
}

addLights();
addCorridor();
createPlayer();

function resetGame() {
  state.running = true;
  state.over = false;
  state.score = 0;
  state.elapsed = 0;
  state.spawnTimer = 0;
  state.playerX = 0;

  for (const mesh of state.obstacleMeshes) {
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }
  state.obstacles = [];
  state.obstacleMeshes = [];
}

function currentSpeedMultiplier() {
  return Math.min(1.5, 1 + state.elapsed * 0.015);
}

function spawnPatternRow() {
  const blockedLanes = patterns[Math.floor(Math.random() * patterns.length)];
  for (const lane of blockedLanes) {
    const x = laneCenterX(lane);
    const mesh = createObstacleMesh();
    mesh.position.set(x, 0, SPAWN_Z);
    scene.add(mesh);
    state.obstacleMeshes.push(mesh);
    state.obstacles.push({ x, z: SPAWN_Z, mesh });
  }
}

function updatePlayer(dt) {
  if (state.moveLeft) state.playerX -= state.playerSpeed * dt;
  if (state.moveRight) state.playerX += state.playerSpeed * dt;
  state.playerX = Math.max(-WORLD_HALF + PLAYER_WIDTH, Math.min(WORLD_HALF - PLAYER_WIDTH, state.playerX));
  playerGroup.position.x = state.playerX;
}

function updateObstacles(dt) {
  const speed = BASE_SPEED * currentSpeedMultiplier();
  const toRemove = [];
  for (let i = 0; i < state.obstacles.length; i++) {
    const ob = state.obstacles[i];
    ob.z += speed * dt;
    ob.mesh.position.z = ob.z;
    if (ob.z > 15) toRemove.push(i);
  }
  for (let i = toRemove.length - 1; i >= 0; i--) {
    const idx = toRemove[i];
    const mesh = state.obstacleMeshes[idx];
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
    state.obstacles.splice(idx, 1);
    state.obstacleMeshes.splice(idx, 1);
  }
}

function checkCollisions() {
  const half = PLAYER_WIDTH;
  const zMin = -PLAYER_DEPTH;
  const zMax = PLAYER_DEPTH;
  const cubeHalf = CUBE_SIZE / 2;
  for (const ob of state.obstacles) {
    if (ob.z < zMin - cubeHalf || ob.z > zMax + cubeHalf) continue;
    const dx = Math.abs(ob.x - state.playerX);
    if (dx < half + cubeHalf) {
      state.over = true;
      state.running = false;
      return;
    }
  }
}

function updateCamera() {
  camera.position.x = state.playerX * 0.3;
  camera.position.y = 3;
  camera.position.z = 6;
  camera.lookAt(state.playerX * 0.5, 0, -25);
}

function updateHud() {
  scoreText.textContent = `Score: ${Math.floor(state.score)}`;
  speedText.textContent = `Speed: ${currentSpeedMultiplier().toFixed(1)}x`;
}

function drawGameOver() {
  if (!state.over) return;
  const overlay = document.getElementById("game-over-overlay");
  if (overlay) overlay.classList.add("visible");
}

const overlayHtml = `
  <div id="game-over-overlay" class="game-over-overlay" aria-hidden="true">
    <div class="game-over-content">
      <p class="game-over-title">Crash!</p>
      <p class="game-over-hint">Press R to restart</p>
    </div>
  </div>
`;
container.insertAdjacentHTML("beforeend", overlayHtml);

function hideGameOver() {
  const overlay = document.getElementById("game-over-overlay");
  if (overlay) overlay.classList.remove("visible");
}

function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

let prev = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;

  if (state.running) {
    state.elapsed += dt;
    state.score += dt * 40 * currentSpeedMultiplier();
    state.spawnTimer += dt;
    if (state.spawnTimer >= SPAWN_EVERY) {
      state.spawnTimer -= SPAWN_EVERY;
      spawnPatternRow();
    }
    updatePlayer(dt);
    updateObstacles(dt);
    checkCollisions();
    updateCamera();
  } else {
    drawGameOver();
  }

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") state.moveLeft = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") state.moveRight = true;
  if (e.code === "KeyR" && state.over) {
    hideGameOver();
    resetGame();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") state.moveLeft = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") state.moveRight = false;
});

window.addEventListener("resize", onResize);
onResize();

resetGame();
requestAnimationFrame(tick);
