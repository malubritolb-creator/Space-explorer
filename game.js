const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const healthEl = document.getElementById('health');

const keys = {};
const bullets = [];
const enemyBullets = [];
const enemies = [];
const stars = [];
const particles = [];
const pickups = [];

const game = {
  width: canvas.width,
  height: canvas.height,
  score: 0,
  wave: 1,
  lastTime: 0,
  enemySpawnTimer: 0,
  pickupTimer: 0,
  waveDelay: 0,
  started: true,
  gameOver: false,
  flashTimer: 0,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  width: 34,
  height: 28,
  speed: 420,
  health: 100,
  cooldown: 0,
  fireRate: 0.22,
  spread: 1,
  rapid: 0,
  shield: 0,
};

function createStars() {
  stars.length = 0;
  for (let i = 0; i < 140; i += 1) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.4 + 0.8,
      speed: Math.random() * 80 + 30,
      alpha: Math.random() * 0.7 + 0.3,
    });
  }
}

function updateHud() {
  scoreEl.textContent = Math.floor(game.score);
  waveEl.textContent = game.wave;
  healthEl.textContent = Math.max(0, Math.ceil(player.health));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function spawnEnemy() {
  const typeRoll = Math.random();
  let enemy = null;

  if (game.wave >= 3 && typeRoll > 0.8) {
    enemy = {
      x: Math.random() * (canvas.width - 60) + 30,
      y: -40,
      width: 38,
      height: 28,
      hp: 3,
      speed: 110 + game.wave * 10,
      drift: Math.random() * Math.PI * 2,
      radius: 18,
      shootCooldown: 1.2 + Math.random() * 1.5,
      points: 200,
      color: '#ffb266',
      kind: 'heavy',
    };
  } else {
    enemy = {
      x: Math.random() * (canvas.width - 48) + 24,
      y: -28,
      width: 28,
      height: 22,
      hp: 1,
      speed: 100 + game.wave * 12,
      drift: Math.random() * Math.PI * 2,
      radius: 14,
      shootCooldown: 1 + Math.random() * 1.6,
      points: 75,
      color: '#ff5a6b',
      kind: 'scout',
    };
  }

  enemies.push(enemy);
}

function spawnPickup(x, y) {
  const roll = Math.random();
  pickups.push({
    x,
    y,
    radius: 10,
    kind: roll < 0.34 ? 'shield' : roll < 0.68 ? 'rapid' : 'spread',
    speed: 120,
    color: roll < 0.34 ? '#7ef5b3' : roll < 0.68 ? '#ffd166' : '#9f74ff',
  });
}

function createParticles(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.5) * 180,
      life: 0.6 + Math.random() * 0.6,
      size: Math.random() * 3 + 2,
      color,
    });
  }
}

function shootPrimary() {
  if (player.cooldown > 0) return;

  const base = [
    { x: player.x, y: player.y - 16, dx: 0, dy: -520 },
  ];

  const shots = player.spread === 1 ? base : [
    { x: player.x - 12, y: player.y - 14, dx: -110, dy: -520 },
    { x: player.x, y: player.y - 18, dx: 0, dy: -560 },
    { x: player.x + 12, y: player.y - 14, dx: 110, dy: -520 },
  ];

  shots.forEach((shot) => {
    bullets.push({
      x: shot.x,
      y: shot.y,
      width: 4,
      height: 12,
      vx: shot.dx,
      vy: shot.dy,
      color: '#7ae7ff',
    });
  });

  player.cooldown = player.rapid > 0 ? 0.08 : player.fireRate;
}

function enemyFire(enemy) {
  const centerX = enemy.x;
  const centerY = enemy.y + 16;
  const dx = player.x - centerX;
  const dy = player.y - centerY;
  const dist = Math.hypot(dx, dy) || 1;

  enemyBullets.push({
    x: centerX,
    y: centerY,
    radius: 4,
    vx: (dx / dist) * 180,
    vy: (dy / dist) * 180,
    color: '#ff8c69',
  });
}

function handleInput(dt) {
  if (keys['w'] || keys['arrowup']) player.y -= player.speed * dt;
  if (keys['s'] || keys['arrowdown']) player.y += player.speed * dt;
  if (keys['a'] || keys['arrowleft']) player.x -= player.speed * dt;
  if (keys['d'] || keys['arrowright']) player.x += player.speed * dt;

  player.x = clamp(player.x, 30, canvas.width - 30);
  player.y = clamp(player.y, 40, canvas.height - 20);

  if (keys[' '] && !game.gameOver) {
    shootPrimary();
  }

  player.cooldown = Math.max(0, player.cooldown - dt);
  player.rapid = Math.max(0, player.rapid - dt);
  player.shield = Math.max(0, player.shield - dt);
}

function updateStars(dt) {
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > canvas.height) {
      star.y = -20;
      star.x = Math.random() * canvas.width;
    }
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const shot = bullets[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;

    if (shot.y < -20 || shot.x < -20 || shot.x > canvas.width + 20) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      const intersects =
        shot.x > enemy.x - enemy.width / 2 &&
        shot.x < enemy.x + enemy.width / 2 &&
        shot.y > enemy.y - enemy.height / 2 &&
        shot.y < enemy.y + enemy.height / 2;

      if (intersects) {
        enemy.hp -= 1;
        bullets.splice(i, 1);
        createParticles(shot.x, shot.y, '#7ae7ff', 6);

        if (enemy.hp <= 0) {
          createParticles(enemy.x, enemy.y, enemy.color, 16);
          game.score += enemy.points;
          if (Math.random() < 0.18) spawnPickup(enemy.x, enemy.y);
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }
}

function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const shot = enemyBullets[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;

    const hitPlayer =
      shot.x > player.x - player.width / 2 &&
      shot.x < player.x + player.width / 2 &&
      shot.y > player.y - player.height / 2 &&
      shot.y < player.y + player.height / 2;

    if (hitPlayer) {
      enemyBullets.splice(i, 1);
      if (player.shield > 0) {
        player.shield = 0;
      } else {
        player.health -= 10;
      }
      createParticles(shot.x, shot.y, '#ff5a6b', 12);
      continue;
    }

    if (shot.y > canvas.height + 30 || shot.x < -30 || shot.x > canvas.width + 30) {
      enemyBullets.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  game.enemySpawnTimer -= dt;

  if (game.enemySpawnTimer <= 0) {
    spawnEnemy();
    const spawnDelay = Math.max(0.35, 1.15 - game.wave * 0.08);
    game.enemySpawnTimer = spawnDelay;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * dt;
    enemy.x += Math.sin((enemy.y + enemy.drift) * 0.04) * 50 * dt;
    enemy.drift += dt * 2;

    if (enemy.kind === 'scout') {
      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0) {
        enemyFire(enemy);
        enemy.shootCooldown = Math.max(0.65, 1.5 - game.wave * 0.05) + Math.random() * 0.9;
      }
    } else {
      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0) {
        enemyFire(enemy);
        enemyFire({ ...enemy, x: enemy.x - 14 });
        enemyFire({ ...enemy, x: enemy.x + 14 });
        enemy.shootCooldown = Math.max(1.1, 2.2 - game.wave * 0.08) + Math.random();
      }
    }

    const collision =
      player.x + player.width / 2 > enemy.x - enemy.width / 2 &&
      player.x - player.width / 2 < enemy.x + enemy.width / 2 &&
      player.y + player.height / 2 > enemy.y - enemy.height / 2 &&
      player.y - player.height / 2 < enemy.y + enemy.height / 2;

    if (collision) {
      player.health -= 20;
      createParticles(enemy.x, enemy.y, '#ff5a6b', 20);
      enemies.splice(i, 1);
      continue;
    }

    if (enemy.y > canvas.height + 60) {
      enemies.splice(i, 1);
    }
  }
}

function updatePickups(dt) {
  game.pickupTimer -= dt;

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const item = pickups[i];
    item.y += item.speed * dt;

    const collide =
      player.x + player.width / 2 > item.x - item.radius &&
      player.x - player.width / 2 < item.x + item.radius &&
      player.y + player.height / 2 > item.y - item.radius &&
      player.y - player.height / 2 < item.y + item.radius;

    if (collide) {
      if (item.kind === 'shield') {
        player.shield = 8;
      } else if (item.kind === 'rapid') {
        player.rapid = 7;
      } else {
        player.spread = 2;
        setTimeout(() => {
          player.spread = 1;
        }, 6000);
      }
      pickups.splice(i, 1);
      continue;
    }

    if (item.y > canvas.height + 20) {
      pickups.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateWave(dt) {
  const wavesAtScore = Math.floor(game.score / 700) + 1;
  if (wavesAtScore > game.wave) {
    game.wave = wavesAtScore;
  }

  if (game.wave > 1 && Math.random() < 0.003) {
    const power = Math.random();
    if (power < 0.5) {
      player.spread = 2;
      setTimeout(() => {
        player.spread = 1;
      }, 4500);
    } else if (power < 0.8) {
      player.rapid = 5;
    } else {
      player.shield = 6;
    }
  }
}

function drawStarfield() {
  ctx.fillStyle = '#020916';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(126, 245, 179, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#7ae7ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(16, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(-16, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#92d8ff';
  ctx.fillRect(-6, 8, 12, 10);
  ctx.fillStyle = '#ffb25a';
  ctx.fillRect(-3, -20, 6, 8);
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.height / 2);
  ctx.lineTo(enemy.width / 2, 0);
  ctx.lineTo(0, enemy.height / 2);
  ctx.lineTo(-enemy.width / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffe6a8';
  ctx.fillRect(-3, -8, 6, 8);
  ctx.restore();
}

function drawBullets() {
  for (const shot of bullets) {
    ctx.fillStyle = shot.color;
    ctx.fillRect(shot.x - 2, shot.y - 6, shot.width, shot.height);
  }

  for (const shot of enemyBullets) {
    ctx.beginPath();
    ctx.fillStyle = shot.color;
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups() {
  for (const item of pickups) {
    ctx.beginPath();
    ctx.fillStyle = item.color;
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#091521';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(item.x - 4, item.y);
    ctx.lineTo(item.x + 4, item.y);
    ctx.moveTo(item.x, item.y - 4);
    ctx.lineTo(item.x, item.y + 4);
    ctx.stroke();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(2, 9, 22, 0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#edf7ff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('NAVE ABATIDA', canvas.width / 2, canvas.height / 2 - 18);
  ctx.font = '24px Arial';
  ctx.fillText(`Pontuação: ${Math.floor(game.score)}`, canvas.width / 2, canvas.height / 2 + 30);
  ctx.font = '18px Arial';
  ctx.fillText('Pressione R para reiniciar', canvas.width / 2, canvas.height / 2 + 70);
}

function checkGameOver() {
  if (player.health <= 0 && !game.gameOver) {
    game.gameOver = true;
  }
}

function resetGame() {
  game.score = 0;
  game.wave = 1;
  game.enemySpawnTimer = 0.8;
  game.pickupTimer = 8;
  game.gameOver = false;
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  pickups.length = 0;
  particles.length = 0;
  player.x = canvas.width / 2;
  player.y = canvas.height - 60;
  player.health = 100;
  player.cooldown = 0;
  player.spread = 1;
  player.rapid = 0;
  player.shield = 0;
  updateHud();
}

function update(dt) {
  if (game.gameOver) {
    if (keys['r']) resetGame();
    return;
  }

  handleInput(dt);
  updateStars(dt);
  updateWave(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  updatePickups(dt);
  updateParticles(dt);
  checkGameOver();
  updateHud();
}

function draw() {
  drawStarfield();
  drawPickups();
  drawBullets();
  for (const enemy of enemies) drawEnemy(enemy);
  drawPlayer();
  drawParticles();

  if (game.gameOver) {
    drawGameOver();
  }
}

function loop(timestamp) {
  const dt = Math.min((timestamp - game.lastTime) / 1000 || 0.016, 0.033);
  game.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (key === ' ') event.preventDefault();
  if (key === 'r' && game.gameOver) resetGame();
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

createStars();
resetGame();
requestAnimationFrame(loop);
