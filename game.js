const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreText = document.getElementById("score");
const speedText = document.getElementById("speed");

const state = {
  running: true,
  over: false,
  score: 0,
  elapsed: 0,
  spawnTimer: 0,
  moveLeft: false,
  moveRight: false,
  player: {
    x: canvas.width / 2,
    y: canvas.height - 90,
    size: 26,
    speed: 340
  },
  obstacles: []
};

const LANE_COUNT = 7;
const WORLD_MARGIN = 30;
const LANE_GAP = (canvas.width - WORLD_MARGIN * 2) / LANE_COUNT;
const OBSTACLE_SIZE = 42;
const BASE_OBSTACLE_SPEED = 230;
const SPAWN_EVERY = 0.42;

const patterns = [
  [0, 1, 2, 4, 5, 6], // center lane safe
  [1, 2, 3, 4, 5], // two side lanes safe
  [0, 2, 4, 6], // checker stripe
  [0, 1, 5, 6], // two center lanes safe
  [0, 3, 6], // wide gaps
  [0, 1, 2, 3, 4, 6], // tight single lane on right
  [0, 2, 3, 5, 6], // zig opportunity
  [1, 3, 5] // odd lanes blocked
];

function resetGame() {
  state.running = true;
  state.over = false;
  state.score = 0;
  state.elapsed = 0;
  state.spawnTimer = 0;
  state.obstacles.length = 0;
  state.player.x = canvas.width / 2;
}

function currentSpeedMultiplier() {
  return Math.min(3, 1 + state.elapsed * 0.06);
}

function spawnPatternRow() {
  const blockedLanes = patterns[Math.floor(Math.random() * patterns.length)];
  for (const lane of blockedLanes) {
    const x = WORLD_MARGIN + lane * LANE_GAP + (LANE_GAP - OBSTACLE_SIZE) / 2;
    state.obstacles.push({
      x,
      y: -OBSTACLE_SIZE,
      w: OBSTACLE_SIZE,
      h: OBSTACLE_SIZE
    });
  }
}

function updatePlayer(dt) {
  if (state.moveLeft) {
    state.player.x -= state.player.speed * dt;
  }
  if (state.moveRight) {
    state.player.x += state.player.speed * dt;
  }

  const minX = WORLD_MARGIN + state.player.size / 2;
  const maxX = canvas.width - WORLD_MARGIN - state.player.size / 2;
  state.player.x = Math.max(minX, Math.min(maxX, state.player.x));
}

function updateObstacles(dt) {
  const speed = BASE_OBSTACLE_SPEED * currentSpeedMultiplier();
  for (const ob of state.obstacles) {
    ob.y += speed * dt;
  }
  state.obstacles = state.obstacles.filter((ob) => ob.y < canvas.height + OBSTACLE_SIZE);
}

function triangleHitbox() {
  // Use a compact AABB centered on the triangle's body.
  const w = state.player.size * 0.65;
  const h = state.player.size * 0.85;
  return {
    x: state.player.x - w / 2,
    y: state.player.y - h / 2 + 4,
    w,
    h
  };
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function checkCollisions() {
  const playerBox = triangleHitbox();
  for (const obstacle of state.obstacles) {
    if (intersects(playerBox, obstacle)) {
      state.over = true;
      state.running = false;
      return;
    }
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#111a2f");
  grad.addColorStop(1, "#070c18");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(130, 160, 245, 0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= LANE_COUNT; i += 1) {
    const x = WORLD_MARGIN + i * LANE_GAP;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
}

function drawPlayer() {
  const { x, y, size } = state.player;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#71e9ff";
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(size / 2, size / 2);
  ctx.lineTo(-size / 2, size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawObstacles() {
  ctx.fillStyle = "#ff7d9f";
  for (const ob of state.obstacles) {
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
  }
}

function drawGameOver() {
  if (!state.over) {
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Crash!", canvas.width / 2, canvas.height / 2 - 12);

  ctx.font = "22px Segoe UI";
  ctx.fillStyle = "#d7e3ff";
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 30);
}

function updateHud() {
  scoreText.textContent = `Score: ${Math.floor(state.score)}`;
  speedText.textContent = `Speed: ${currentSpeedMultiplier().toFixed(1)}x`;
}

let prev = performance.now();
function tick(now) {
  const dt = Math.min(0.032, (now - prev) / 1000);
  prev = now;

  if (state.running) {
    state.elapsed += dt;
    state.score += dt * 36 * currentSpeedMultiplier();
    state.spawnTimer += dt;

    if (state.spawnTimer >= SPAWN_EVERY) {
      state.spawnTimer -= SPAWN_EVERY;
      spawnPatternRow();
    }

    updatePlayer(dt);
    updateObstacles(dt);
    checkCollisions();
  }

  drawBackground();
  drawObstacles();
  drawPlayer();
  drawGameOver();
  updateHud();

  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    state.moveLeft = true;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    state.moveRight = true;
  }
  if (event.code === "KeyR" && state.over) {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    state.moveLeft = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    state.moveRight = false;
  }
});

resetGame();
requestAnimationFrame(tick);
