const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const healthEl = document.getElementById('health');

const keys = Object.create(null);
const bullets = [];
const enemyBullets = [];
const enemies = [];
const stars = [];
const particles = [];
const lasers = [];
const TOTAL_PHASES = 5;

const game = {
  score: 0,
  phase: 1,
  state: 'playing', // playing, phaseClear, gameOver, victory
  lastTime: 0,
  spawnQueue: [],
  spawnTimer: 0,
  message: '',
  messageTimer: 0,
  audio: null,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  width: 34,
  height: 28,
  speed: 420,
  health: 100,
  maxHealth: 100,
  cooldown: 0,
  fireRate: 0.2,
  shield: 0,
};

function updateHud() {
  scoreEl.textContent = Math.floor(game.score);
  waveEl.textContent = `${game.phase} / ${TOTAL_PHASES}`;
  healthEl.textContent = Math.max(0, Math.ceil(player.health));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function initAudio() {
  if (!game.audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) game.audio = new AudioContext();
  }
  if (game.audio?.state === 'suspended') game.audio.resume();
}

function playExplosion() {
  if (!game.audio) return;
  const now = game.audio.currentTime;
  const oscillator = game.audio.createOscillator();
  const gain = game.audio.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(150, now);
  oscillator.frequency.exponentialRampToValueAtTime(35, now + 0.22);
  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  oscillator.connect(gain);
  gain.connect(game.audio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.25);
}

function createStars() {
  for (let i = 0; i < 140; i += 1) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 0.5, speed: 25 + Math.random() * 75, alpha: 0.3 + Math.random() * 0.7 });
  }
}

function createEnemy(kind, x = 70 + Math.random() * (canvas.width - 140), y = -40) {
  const types = {
    normal: { hp: 1, points: 5, width: 30, height: 24, speed: 85, color: '#ff596d', kind: 'normal' },
    orange: { hp: 2, points: 10, width: 44, height: 34, speed: 68, color: '#ff9e43', kind: 'orange' },
    armored: { hp: 3, points: 15, width: 48, height: 38, speed: 58, color: '#ffbd55', kind: 'armored' },
    miniBoss: { hp: 10, maxHp: 10, points: 20, width: 116, height: 72, speed: 35, color: '#b174ff', kind: 'miniBoss', shootCooldown: 1.2 },
    finalBoss: { hp: 20, maxHp: 20, points: 50, width: 164, height: 100, speed: 28, color: '#ff4f8b', kind: 'finalBoss', shootCooldown: 1, summonCooldown: 4, laserCooldown: 5, laserWarning: 0, laserX: canvas.width / 2 },
    kamikaze: { hp: 1, points: 5, width: 26, height: 22, speed: 190, color: '#ffdf66', kind: 'kamikaze' },
  };
  const enemy = { ...types[kind], x, y, drift: Math.random() * Math.PI * 2, fireCooldown: 1.5 + Math.random() };
  if (kind === 'miniBoss' || kind === 'finalBoss') enemy.x = canvas.width / 2;
  enemies.push(enemy);
  return enemy;
}

function phaseFormation(phase) {
  if (phase === 1) return ['normal', 'normal', 'normal', 'normal', 'normal'];
  if (phase === 2) return ['normal', 'orange', 'normal', 'normal', 'orange', 'normal', 'orange', 'normal'];
  if (phase === 3) return ['miniBoss'];
  if (phase === 4) return ['normal', 'orange', 'normal', 'armored', 'orange', 'normal', 'armored', 'orange', 'normal', 'armored'];
  return ['finalBoss'];
}

function startPhase(phase) {
  game.phase = phase;
  game.state = 'playing';
  game.spawnQueue = phaseFormation(phase);
  game.spawnTimer = phase === 1 ? 0.2 : 0.65;
  bullets.length = 0;
  enemyBullets.length = 0;
  lasers.length = 0;
  game.message = phase === 3 ? 'MINI-CHEFE ESTÁ CHEGANDO!' : phase === 5 ? 'CHEFÃO FINAL: PREPARE-SE!' : `FASE ${phase}`;
  game.messageTimer = 2.4;
  updateHud();
}

function spawnNextEnemy() {
  if (game.spawnQueue.length === 0) return;
  const kind = game.spawnQueue.shift();
  const index = enemies.filter((enemy) => enemy.kind !== 'miniBoss' && enemy.kind !== 'finalBoss').length;
  const spacing = 105;
  const x = clamp(100 + (index % 7) * spacing + (Math.random() - 0.5) * 55, 45, canvas.width - 45);
  createEnemy(kind, x, kind.includes('Boss') ? 105 : -30 - Math.random() * 70);
}

function createParticles(x, y, color, count = 15) {
  for (let i = 0; i < count; i += 1) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220,
      life: 0.45 + Math.random() * 0.55, size: 2 + Math.random() * 4, color });
  }
}

function shootPlayer() {
  if (player.cooldown > 0) return;
  bullets.push({ x: player.x, y: player.y - 20, vx: 0, vy: -560, color: '#70e5ff' });
  player.cooldown = player.fireRate;
}

function fireAtPlayer(enemy, spread = false) {
  const centerY = enemy.y + enemy.height * 0.35;
  const baseAngle = Math.atan2(player.y - centerY, player.x - enemy.x);
  const offsets = spread ? [-0.32, 0, 0.32] : [0];
  for (const offset of offsets) {
    const angle = baseAngle + offset;
    const speed = enemy.kind === 'finalBoss' ? 230 : 190;
    enemyBullets.push({ x: enemy.x, y: centerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 5, color: enemy.color });
  }
}

function damagePlayer(amount) {
  if (player.shield > 0) {
    player.shield = 0;
    return;
  }
  player.health -= amount;
  if (player.health <= 0) {
    player.health = 0;
    game.state = 'gameOver';
  }
}

function removeEnemy(index) {
  const enemy = enemies[index];
  createParticles(enemy.x, enemy.y, enemy.color, enemy.kind.includes('Boss') ? 48 : 18);
  playExplosion();
  game.score += enemy.points;
  enemies.splice(index, 1);
  if (enemy.kind === 'miniBoss') {
    game.message = 'MINI-CHEFE DERROTADO! O CAMINHO PARA O CHEFÃO ESTÁ ABERTO.';
    game.messageTimer = 3;
  }
  if (enemy.kind === 'finalBoss') {
    game.state = 'victory';
    game.message = 'A GALÁXIA FOI SALVA!';
    game.messageTimer = 999;
  }
}

function updatePlayerBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.y < -20) { bullets.splice(i, 1); continue; }
    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      if (bullet.x >= enemy.x - enemy.width / 2 && bullet.x <= enemy.x + enemy.width / 2 &&
          bullet.y >= enemy.y - enemy.height / 2 && bullet.y <= enemy.y + enemy.height / 2) {
        enemy.hp -= 1;
        bullets.splice(i, 1);
        createParticles(bullet.x, bullet.y, '#7ae7ff', 5);
        if (enemy.hp <= 0) removeEnemy(j);
        break;
      }
    }
  }
}

function updateEnemies(dt) {
  game.spawnTimer -= dt;
  if (game.spawnQueue.length && game.spawnTimer <= 0) {
    spawnNextEnemy();
    game.spawnTimer = game.phase === 1 ? 0.8 : 0.55;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.drift += dt;
    if (enemy.kind === 'miniBoss' || enemy.kind === 'finalBoss') {
      enemy.x = canvas.width / 2 + Math.sin(enemy.drift * 0.8) * (enemy.kind === 'finalBoss' ? 190 : 155);
      enemy.y = 105 + Math.sin(enemy.drift * 1.4) * 18;
      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0) {
        fireAtPlayer(enemy, true);
        enemy.shootCooldown = enemy.kind === 'finalBoss' ? 0.78 : 1.35;
      }
      if (enemy.kind === 'finalBoss') updateFinalBoss(enemy, dt);
    } else {
      enemy.x += Math.sin(enemy.drift * 2.2) * 42 * dt;
      enemy.y += enemy.speed * dt;
      if (enemy.kind === 'kamikaze') {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * dt;
        enemy.y += Math.sin(angle) * enemy.speed * dt;
      } else {
        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0 && enemy.kind !== 'normal') {
          fireAtPlayer(enemy);
          enemy.fireCooldown = 2.1;
        }
      }
      if (enemy.y > canvas.height + 35) {
        damagePlayer(8);
        createParticles(enemy.x, canvas.height - 10, enemy.color, 8);
        enemies.splice(i, 1);
        continue;
      }
    }

    const collision = Math.abs(player.x - enemy.x) < (player.width + enemy.width) / 2 - 5 &&
      Math.abs(player.y - enemy.y) < (player.height + enemy.height) / 2 - 5;
    if (collision) {
      damagePlayer(enemy.kind.includes('Boss') ? 30 : 18);
      if (!enemy.kind.includes('Boss')) enemies.splice(i, 1);
    }
  }
}

function updateFinalBoss(boss, dt) {
  boss.summonCooldown -= dt;
  if (boss.summonCooldown <= 0) {
    // The final boss sends kamikaze ships in pairs toward the player's current position.
    createEnemy('kamikaze', boss.x - 25, boss.y + 35);
    createEnemy('kamikaze', boss.x + 25, boss.y + 35);
    boss.summonCooldown = 5.2;
  }

  boss.laserCooldown -= dt;
  if (boss.laserCooldown <= 0 && boss.laserWarning <= 0) {
    boss.laserX = player.x;
    boss.laserWarning = 1.15;
    boss.laserCooldown = 5.7;
  } else if (boss.laserWarning > 0) {
    boss.laserWarning -= dt;
    if (boss.laserWarning <= 0) {
      lasers.push({ x: boss.laserX, life: 0.42, width: 48 });
    }
  }
}

function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const shot = enemyBullets[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (Math.abs(shot.x - player.x) < player.width / 2 + shot.radius && Math.abs(shot.y - player.y) < player.height / 2 + shot.radius) {
      damagePlayer(10);
      createParticles(shot.x, shot.y, '#ff6b73', 8);
      enemyBullets.splice(i, 1);
    } else if (shot.y < -30 || shot.y > canvas.height + 30 || shot.x < -30 || shot.x > canvas.width + 30) {
      enemyBullets.splice(i, 1);
    }
  }
  for (let i = lasers.length - 1; i >= 0; i -= 1) {
    lasers[i].life -= dt;
    if (lasers[i].life > 0 && Math.abs(player.x - lasers[i].x) < lasers[i].width / 2) damagePlayer(0.7);
    if (lasers[i].life <= 0) lasers.splice(i, 1);
  }
}

function updateEffects(dt) {
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > canvas.height) { star.y = -4; star.x = Math.random() * canvas.width; }
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life <= 0) particles.splice(i, 1);
  }
  if (game.messageTimer > 0) game.messageTimer -= dt;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.shield = Math.max(0, player.shield - dt);
}

function checkPhaseComplete() {
  if (game.state !== 'playing' || game.spawnQueue.length || enemies.length) return;
  if (game.phase === TOTAL_PHASES) return;
  game.state = 'phaseClear';
  game.message = `FASE ${game.phase} CONCLUÍDA!`;
  game.messageTimer = 999;
}

function update(dt) {
  updateEffects(dt);
  if (game.state !== 'playing') {
    if ((game.state === 'phaseClear' && (keys['enter'] || keys[' '])) || ((game.state === 'gameOver' || game.state === 'victory') && keys['r'])) {
      if (game.state === 'phaseClear') startPhase(game.phase + 1);
      else resetGame();
    }
    return;
  }
  if (keys['w'] || keys['arrowup']) player.y -= player.speed * dt;
  if (keys['s'] || keys['arrowdown']) player.y += player.speed * dt;
  if (keys['a'] || keys['arrowleft']) player.x -= player.speed * dt;
  if (keys['d'] || keys['arrowright']) player.x += player.speed * dt;
  player.x = clamp(player.x, 25, canvas.width - 25);
  player.y = clamp(player.y, 35, canvas.height - 20);
  if (keys[' ']) shootPlayer();
  updatePlayerBullets(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  checkPhaseComplete();
  updateHud();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.shield > 0) {
    ctx.strokeStyle = '#7ef5b3'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#70e5ff';
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(17, 15); ctx.lineTo(0, 9); ctx.lineTo(-17, 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffae58'; ctx.fillRect(-4, 12, 8, 8);
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save(); ctx.translate(enemy.x, enemy.y);
  const isBoss = enemy.kind.includes('Boss');
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  if (isBoss) {
    ctx.moveTo(-enemy.width * 0.48, -enemy.height * 0.22);
    ctx.lineTo(-enemy.width * 0.32, -enemy.height * 0.5);
    ctx.lineTo(enemy.width * 0.32, -enemy.height * 0.5);
    ctx.lineTo(enemy.width * 0.48, -enemy.height * 0.22);
    ctx.lineTo(enemy.width * 0.4, enemy.height * 0.4);
    ctx.lineTo(0, enemy.height * 0.25);
    ctx.lineTo(-enemy.width * 0.4, enemy.height * 0.4);
  } else {
    ctx.moveTo(0, -enemy.height / 2); ctx.lineTo(enemy.width / 2, 0);
    ctx.lineTo(0, enemy.height / 2); ctx.lineTo(-enemy.width / 2, 0);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff0ad'; ctx.fillRect(-5, -4, 10, 8);
  ctx.restore();

  if (enemy.hp > 1) {
    const barWidth = isBoss ? enemy.width : enemy.width + 8;
    const barY = enemy.y - enemy.height / 2 - (isBoss ? 16 : 10);
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, 7);
    ctx.fillStyle = enemy.kind === 'finalBoss' ? '#ff4f8b' : enemy.kind === 'miniBoss' ? '#bd83ff' : '#ff9e43';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp || enemy.hp / (enemy.kind === 'armored' ? 3 : 2)), 7);
    if (isBoss) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
      ctx.fillText(`${enemy.kind === 'finalBoss' ? 'CHEFÃO FINAL' : 'MINI-CHEFE'}  ${enemy.hp}/${enemy.maxHp}`, enemy.x, barY - 5);
    }
  }
}

function draw() {
  ctx.fillStyle = '#020916'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const star of stars) {
    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
  }
  // Preview laser target and the active beam.
  for (const boss of enemies) {
    if (boss.kind === 'finalBoss' && boss.laserWarning > 0) {
      ctx.fillStyle = 'rgba(255,75,120,.2)'; ctx.fillRect(boss.laserX - 18, 0, 36, canvas.height);
      ctx.strokeStyle = '#ff557a'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(boss.laserX, 0); ctx.lineTo(boss.laserX, canvas.height); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.fillText('LASER!', boss.laserX, 45);
    }
  }
  for (const laser of lasers) {
    ctx.fillStyle = `rgba(255,65,112,${Math.min(0.85, laser.life * 2)})`;
    ctx.fillRect(laser.x - laser.width / 2, 0, laser.width, canvas.height);
  }
  for (const bullet of bullets) { ctx.fillStyle = bullet.color; ctx.fillRect(bullet.x - 2, bullet.y - 7, 4, 14); }
  for (const bullet of enemyBullets) { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); }
  for (const enemy of enemies) drawEnemy(enemy);
  drawPlayer();
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
  ctx.globalAlpha = 1;

  if (game.messageTimer > 0 && game.state === 'playing') {
    ctx.fillStyle = 'rgba(5,12,30,.78)'; ctx.fillRect(0, 18, canvas.width, 44);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText(game.message, canvas.width / 2, 48);
  }
  if (game.state !== 'playing') drawOverlay();
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(2, 8, 22, .82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.fillStyle = '#edf7ff';
  let title = game.message;
  let subtitle = 'Pressione ENTER para continuar';
  if (game.state === 'gameOver') { title = 'NAVE DESTRUÍDA'; subtitle = 'Pressione R para tentar novamente'; }
  if (game.state === 'victory') { title = 'VITÓRIA! A GALÁXIA FOI SALVA!'; subtitle = 'Pressione R para jogar de novo'; }
  ctx.font = 'bold 34px Arial'; ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 18);
  ctx.font = '20px Arial'; ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 28);
  ctx.font = '16px Arial'; ctx.fillText(`Pontuação: ${Math.floor(game.score)}`, canvas.width / 2, canvas.height / 2 + 62);
}

function resetGame() {
  game.score = 0; game.phase = 1; game.state = 'playing'; game.message = ''; game.messageTimer = 0;
  enemies.length = 0; bullets.length = 0; enemyBullets.length = 0; particles.length = 0; lasers.length = 0;
  player.x = canvas.width / 2; player.y = canvas.height - 60; player.health = player.maxHealth; player.cooldown = 0; player.shield = 0;
  startPhase(1);
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
  if (key === ' ' || key.startsWith('arrow')) event.preventDefault();
  if (key === ' ' || key === 'enter') initAudio();
});
window.addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });

createStars();
startPhase(1);
requestAnimationFrame(loop);
