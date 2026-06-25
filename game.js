// Motor e Loop Principal - Vampiro Sobrevivente
import { audio } from './audio.js';
import { 
    Player, Enemy, Gem, Particle, DamageText, 
    Weapon, PassiveItem,
    BloodWhip, ShadowFireball, GarlicAura, OrbitScythe,
    BloodMirror, BatBoots, Magnet 
} from './entities.js';

// --- INICIALIZAÇÃO DE CANVASES E DOM ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const hud = document.getElementById('hud');
const xpBarFill = document.getElementById('xp-bar-fill');
const xpText = document.getElementById('xp-text');
const timerVal = document.getElementById('timer-val');
const killsVal = document.getElementById('kills-val');
const healthVal = document.getElementById('health-val');
const healthBarFill = document.getElementById('health-bar-fill');
const inventorySlots = document.getElementById('inventory-slots');
const specialRow = document.getElementById('special-row');
const specialCooldownText = document.getElementById('special-cooldown-text');
const specialBarFill = document.getElementById('special-bar-fill');

// Telas de Menu
const menuStart = document.getElementById('menu-start');
const menuUpgrade = document.getElementById('menu-upgrade');
const menuGameOver = document.getElementById('menu-game-over');
const menuPause = document.getElementById('menu-pause');
const upgradeCardsContainer = document.getElementById('upgrade-cards-container');

// Botões
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnResume = document.getElementById('btn-resume');
const btnPauseToggle = document.getElementById('btn-pause-toggle');
const btnResumeSave = document.getElementById('btn-resume-save');
const saveIndicator = document.getElementById('save-indicator');

// Controles de Toque (Celular)
const joystickContainer = document.getElementById('joystick-container');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const btnSpecialTouch = document.getElementById('btn-special-touch');

let joystickTouchId = null;
const joystickCenter = { x: 0, y: 0 };
const joystickVector = { x: 0, y: 0 };

// --- VARIÁVEIS DE ESTADO DO JOGO ---
const WORLD_SIZE = 3000; // Tamanho do mapa (limites)
let gameState = 'start'; // 'start', 'playing', 'upgrade', 'paused', 'gameover'
let player = null;
let enemies = [];
let projectiles = [];
let gems = [];
let particles = [];
let damageTexts = [];
let activeWhips = [];      // Efeitos de corte ativos na tela para o chicote
let activeScythes = [];    // Foices atualmente orbitando o jogador

// Gerenciadores de Armas e Passivos
let activeWeapons = [];
let activePassives = [];
let upgradePool = [];      // Lista de armas e passivos disponíveis para escolha

// Stats da Partida
let gameTime = 0;          // Tempo decorrido em ms
let kills = 0;
let lastTime = 0;
let spawnCooldown = 1500;  // Spawn inicial (1.5s)
let lastSpawnTime = 0;
let screenShake = 0;

// Novo: Variáveis do Ataque Especial
const specialMaxCooldown = 10000; // 10 segundos
let specialCooldownTimer = 0;
let activeShockwaves = [];

// Sistema de Câmera
const camera = { x: 0, y: 0 };

// Captura de Teclado
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Impedir barra de espaço de rolar a página e ativar especial
    if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        useSpecialAttack();
    }
    
    // Atalho para pausar via teclado (Esc ou P)
    if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && gameState === 'playing') {
        pauseGame();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Escala e Dimensões Virtuais do Canvas
let scale = 1;
let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;

// Redimensionamento do Canvas com Escala Dinâmica
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Calcula a escala responsiva
    if (window.innerWidth > window.innerHeight) {
        // Landscape: mantemos a altura virtual visível próxima de 600 unidades
        scale = window.innerHeight / 600;
    } else {
        // Portrait: mantemos a largura virtual visível próxima de 400 unidades
        scale = window.innerWidth / 400;
    }
    
    // Clampar para evitar escalas microscópicas ou exageradas
    scale = Math.max(0.6, Math.min(2.5, scale));
    
    // Determinar largura e altura virtuais na escala calculada
    viewWidth = canvas.width / scale;
    viewHeight = canvas.height / scale;
    
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- SISTEMA DE INICIALIZAÇÃO E RESETS ---

function initGame() {
    // Cria jogador no centro do mapa
    player = new Player(WORLD_SIZE / 2, WORLD_SIZE / 2);
    
    // Limpa vetores
    enemies = [];
    projectiles = [];
    gems = [];
    particles = [];
    damageTexts = [];
    activeWhips = [];
    activeScythes = [];
    activeShockwaves = [];
    specialCooldownTimer = 0;
    
    // Configura armas e passivos iniciais
    activeWeapons = [];
    activePassives = [];
    
    // Cria e adiciona a arma inicial (Chicote de Sangue no Nível 1)
    const initialWhip = new BloodWhip();
    initialWhip.level = 1;
    activeWeapons.push(initialWhip);

    // Inicializa o Pool de Upgrades Disponíveis
    upgradePool = [
        new BloodWhip(),      // Adicionado mas pode subir de nível
        new ShadowFireball(), // Bloqueado inicialmente (Level 0)
        new GarlicAura(),     // Bloqueado inicialmente (Level 0)
        new OrbitScythe(),    // Bloqueado inicialmente (Level 0)
        new BloodMirror(),    // Passivo Dano
        new BatBoots(),       // Passivo Velocidade
        new Magnet()          // Passivo Ímã
    ];
    // Atualiza o nível do chicote no pool para sincronizar
    upgradePool.find(u => u.id === 'whip').level = 1;

    // Reseta Stats
    gameTime = 0;
    kills = 0;
    screenShake = 0;
    spawnCooldown = 1500;
    lastSpawnTime = 0;
    lastSaveTime = 0;
    lastTime = performance.now();

    updateHUD();
    renderInventoryHTML();
}

function updateHUD() {
    if (!player) return;
    
    // Barra de Vida
    const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    healthBarFill.style.width = `${hpPercent}%`;
    healthVal.innerText = `${player.hp}/${player.maxHp}`;
    
    // Se vida estiver crítica (< 25%), pulsa vermelho no container
    const healthContainer = document.getElementById('health-container');
    if (hpPercent < 25) {
        healthContainer.classList.add('critical-hp');
    } else {
        healthContainer.classList.remove('critical-hp');
    }

    // Barra de XP
    const xpPercent = Math.max(0, (player.xp / player.xpToNextLevel) * 100);
    xpBarFill.style.width = `${xpPercent}%`;
    xpText.innerText = `Nível ${player.level} - ${Math.round(xpPercent)}%`;

    // Contador de Mortes
    killsVal.innerText = kills;

    // Relógio / Cronômetro
    const totalSecs = Math.floor(gameTime / 1000);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    timerVal.innerText = `${mins}:${secs}`;

    // Atualiza HUD do Especial
    if (specialCooldownTimer <= 0) {
        specialRow.classList.add('ready');
        specialCooldownText.innerText = 'PRONTO';
        specialBarFill.style.width = '100%';
        if (btnSpecialTouch) {
            btnSpecialTouch.classList.add('ready');
            btnSpecialTouch.classList.remove('cooldown');
        }
    } else {
        specialRow.classList.remove('ready');
        const remainingSecs = (specialCooldownTimer / 1000).toFixed(1);
        specialCooldownText.innerText = `${remainingSecs}s`;
        const percentage = ((specialMaxCooldown - specialCooldownTimer) / specialMaxCooldown) * 100;
        specialBarFill.style.width = `${percentage}%`;
        if (btnSpecialTouch) {
            btnSpecialTouch.classList.remove('ready');
            btnSpecialTouch.classList.add('cooldown');
        }
    }
}

// Atualiza o HUD visual do inventário de itens/armas
function renderInventoryHTML() {
    inventorySlots.innerHTML = '';
    
    // Renderiza armas ativas
    activeWeapons.forEach(w => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.innerHTML = `${w.emoji} <span class="inventory-level">Nv.${w.level}</span>`;
        slot.title = `${w.name} (Nível ${w.level})`;
        inventorySlots.appendChild(slot);
    });

    // Renderiza passivos ativos
    activePassives.forEach(p => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.innerHTML = `${p.emoji} <span class="inventory-level">Nv.${p.level}</span>`;
        slot.title = `${p.name} (Nível ${p.level})`;
        inventorySlots.appendChild(slot);
    });
}

// --- CONTROLE DOS ESTADOS E MENUS ---

function startGame() {
    initGame();
    audio.startMusic();
    clearSave(); // Garante que inicia sem saves antigos se escolher novo jogo
    
    menuStart.classList.add('hidden');
    menuUpgrade.classList.add('hidden');
    menuGameOver.classList.add('hidden');
    menuPause.classList.add('hidden');
    hud.classList.remove('hidden');
    
    gameState = 'playing';
    requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    menuPause.classList.remove('hidden');
    audio.stopMusic();
    saveGame(); // Salva a partida automaticamente no pause
}

function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    menuPause.classList.add('hidden');
    lastTime = performance.now();
    audio.startMusic();
    requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
    gameState = 'gameover';
    audio.stopMusic();
    audio.playDeath();
    clearSave(); // Remove o save ao morrer para evitar continuar da mesma fase
    
    // Preenche as estatísticas finais na tela de Game Over
    const totalSecs = Math.floor(gameTime / 1000);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');

    document.getElementById('summary-time').innerText = `${mins}:${secs}`;
    document.getElementById('summary-level').innerText = player.level;
    document.getElementById('summary-kills').innerText = kills;

    hud.classList.add('hidden');
    menuGameOver.classList.remove('hidden');
}

// Conjura o ataque especial de 360 graus
function useSpecialAttack() {
    if (gameState !== 'playing' || !player || specialCooldownTimer > 0) return;
    
    audio.playSpecial();
    specialCooldownTimer = specialMaxCooldown;
    screenShake = 12; // Efeito tremor no ataque
    
    // Cria a onda de choque
    activeShockwaves.push({
        x: player.x,
        y: player.y,
        currentRadius: 10,
        maxRadius: 210, // Raio de 360 graus
        speed: 7.0,      // Velocidade de expansão por frame
        damage: 55,     // Dano alto
        color: '#ef4444',
        hitEnemies: new Set()
    });

    // Cria partículas ao redor do jogador para indicar o especial
    for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        particles.push(new Particle(
            player.x, player.y,
            '#ef4444',
            Math.random() * 3 + 2,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        ));
    }
}

// --- SISTEMA DE UPGRADES AO SUBIR DE NÍVEL ---

function triggerLevelUp() {
    gameState = 'upgrade';
    audio.stopMusic();
    
    // Limpa cards antigos
    upgradeCardsContainer.innerHTML = '';

    // Encontra quais itens no pool podem ser atualizados
    // 1. Armas/Passivos já desbloqueados com nível < maxLevel
    // 2. Novos itens bloqueados (Level 0), se houver espaço no inventário (max 4 armas e 3 passivos)
    const eligibleUpgrades = upgradePool.filter(item => {
        const isWeapon = item instanceof Weapon;
        const alreadyHas = isWeapon ? 
            activeWeapons.some(w => w.id === item.id) : 
            activePassives.some(p => p.id === item.id);
        
        if (alreadyHas) {
            return item.level < item.maxLevel;
        } else {
            // Se não tem, verifica se há espaço no inventário correspondente
            if (isWeapon) {
                return activeWeapons.length < 4; // Máximo 4 armas
            } else {
                return activePassives.length < 3; // Máximo 3 passivos
            }
        }
    });

    // Escolhe aleatoriamente até 3 opções elegíveis
    const choices = [];
    const poolCopy = [...eligibleUpgrades];
    
    const maxChoices = Math.min(3, poolCopy.length);
    for (let i = 0; i < maxChoices; i++) {
        const randomIndex = Math.floor(Math.random() * poolCopy.length);
        choices.push(poolCopy.splice(randomIndex, 1)[0]);
    }

    // Se nenhuma opção for elegível (tudo maximizado), oferece cura
    if (choices.length === 0) {
        createHealCard();
    } else {
        choices.forEach(item => {
            createUpgradeCard(item);
        });
    }

    menuUpgrade.classList.remove('hidden');
}

// Cria a representação visual do card de upgrade
function createUpgradeCard(item) {
    const nextLevel = item.level + 1;
    const isNew = item.level === 0;
    const description = item.levelUpDesc[nextLevel - 1] || 'Melhoria no status da arma';

    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
        <div class="upgrade-icon">${item.emoji}</div>
        <div class="upgrade-details">
            <div class="upgrade-name">${item.name}</div>
            <div class="upgrade-level">${isNew ? 'NOVO PODER' : `Nível ${nextLevel}`}</div>
            <div class="upgrade-desc">${description}</div>
        </div>
    `;

    card.addEventListener('click', () => {
        applyUpgrade(item);
    });

    upgradeCardsContainer.appendChild(card);
}

// Cria um card alternativo de cura caso tudo esteja no nível máximo
function createHealCard() {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
        <div class="upgrade-icon">🩸</div>
        <div class="upgrade-details">
            <div class="upgrade-name">Banquete de Sangue</div>
            <div class="upgrade-level">Especial</div>
            <div class="upgrade-desc">Cura +35 Pontos de Vida instantaneamente.</div>
        </div>
    `;

    card.addEventListener('click', () => {
        player.hp = Math.min(player.maxHp, player.hp + 35);
        resumeAfterUpgrade();
    });

    upgradeCardsContainer.appendChild(card);
}

// Aplica a melhoria e fecha a tela
function applyUpgrade(upgradeItem) {
    const isWeapon = upgradeItem instanceof Weapon;
    
    if (upgradeItem.level === 0) {
        // Desbloqueia novo item
        upgradeItem.level = 1;
        if (isWeapon) {
            activeWeapons.push(upgradeItem);
        } else {
            activePassives.push(upgradeItem);
        }
    } else {
        // Sobe de nível item existente
        const target = isWeapon ? 
            activeWeapons.find(w => w.id === upgradeItem.id) : 
            activePassives.find(p => p.id === upgradeItem.id);
        
        target.level++;
        upgradeItem.level = target.level;
    }

    // Aplica efeitos passivos imediatamente se for um passivo
    activePassives.forEach(p => p.applyEffect(player));

    resumeAfterUpgrade();
}

function resumeAfterUpgrade() {
    player.pendingLevelUps--;
    if (player.pendingLevelUps > 0) {
        // Se ainda restam níveis pendentes para escolher upgrades, reabre de imediato!
        triggerLevelUp();
    } else {
        menuUpgrade.classList.add('hidden');
        renderInventoryHTML();
        updateHUD();
        gameState = 'playing';
        lastTime = performance.now();
        audio.startMusic();
        requestAnimationFrame(gameLoop);
    }
}

// --- GERAÇÃO (SPAWN) DE MONSTROS ---

function spawnEnemy() {
    // Limite máximo de inimigos ativos simultâneos para evitar gargalo de processamento
    if (enemies.length >= 300) return;

    // Decide o tipo com base no tempo decorrido (em segundos)
    const elapsedSecs = gameTime / 1000;
    let type = 'bat';
    
    if (elapsedSecs > 180) { // 3 minutos ou mais
        const rand = Math.random();
        if (rand < 0.35) type = 'bat';
        else if (rand < 0.7) type = 'skeleton';
        else type = 'zombie';
    } else if (elapsedSecs > 90) { // 1.5 a 3 minutos
        const rand = Math.random();
        if (rand < 0.5) type = 'bat';
        else if (rand < 0.85) type = 'skeleton';
        else type = 'zombie';
    } else if (elapsedSecs > 30) { // 30s a 1.5 minutos
        type = Math.random() < 0.7 ? 'bat' : 'skeleton';
    }

    // Multiplicador de vida/dano dos inimigos aumenta ao longo do tempo
    const difficultyMult = 1.0 + (elapsedSecs / 120); // +50% de força a cada 2 minutos

    // Spawna inimigos em círculo logo fora do campo de visão da câmera
    const angle = Math.random() * Math.PI * 2;
    // O viewport diagonal é cerca de Math.hypot(viewWidth, viewHeight) / 2
    // Garante spawn fora da tela visível
    const viewportHalfDiagonal = Math.hypot(viewWidth, viewHeight) / 2;
    const dist = viewportHalfDiagonal + 50 + Math.random() * 100;
    const spawnX = player.x + Math.cos(angle) * dist;
    const spawnY = player.y + Math.sin(angle) * dist;

    // Garante que o spawn esteja dentro do limite do mundo
    const finalX = Math.max(20, Math.min(WORLD_SIZE - 20, spawnX));
    const finalY = Math.max(20, Math.min(WORLD_SIZE - 20, spawnY));

    enemies.push(new Enemy(finalX, finalY, type, difficultyMult));
}

// Spawna o Ceifador Boss
function spawnBoss() {
    audio.playBossSpawn();
    screenShake = 15; // Tremor forte de aviso
    
    // Spawna chefe do lado direito
    const angle = Math.random() * Math.PI * 2;
    const dist = 400;
    const spawnX = Math.max(40, Math.min(WORLD_SIZE - 40, player.x + Math.cos(angle) * dist));
    const spawnY = Math.max(40, Math.min(WORLD_SIZE - 40, player.y + Math.sin(angle) * dist));

    const difficultyMult = 1.0 + (gameTime / 1000 / 120);
    enemies.push(new Enemy(spawnX, spawnY, 'reaper', difficultyMult * 1.5));
    
    // Adiciona um aviso visual flutuante
    pushDamageText(player.x, player.y - 40, 'O CEIFADOR CHEGOU!', '#ef4444', true);
}

// --- LÓGICA DO JOGO (UPDATE) ---

function updateGame(dt) {
    const factor = dt / 16.66;
    gameTime += dt;

    // Auto-salvar a cada 10 segundos de partida (10000ms)
    if (gameTime - lastSaveTime > 10000) {
        saveGame();
        lastSaveTime = gameTime;
    }

    // Acelera spawner conforme o tempo passa (reduz cooldown mínimo a 300ms)
    const elapsedSecs = gameTime / 1000;
    spawnCooldown = Math.max(300, 1500 - (elapsedSecs * 6));

    // 1. Spawner de Inimigos
    if (gameTime - lastSpawnTime > spawnCooldown) {
        spawnEnemy();
        lastSpawnTime = gameTime;
    }

    // Spawna Chefe a cada 2 minutos (120s, 240s, etc.)
    const currentMinuteBucket = Math.floor(elapsedSecs / 120);
    const lastMinuteBucket = Math.floor((gameTime - dt) / 120);
    if (currentMinuteBucket > lastMinuteBucket && currentMinuteBucket > 0) {
        spawnBoss();
    }

    // 2. Atualizar Jogador
    player.update(keys, WORLD_SIZE, WORLD_SIZE, dt, joystickVector);

    // 3. Spawners de Ataque das Armas
    const now = Date.now();
    activeWeapons.forEach(weapon => {
        if (weapon.canAttack(now, player)) {
            const attackData = weapon.attack(now, player, enemies);
            
            if (attackData.type === 'projectile') {
                projectiles.push(...attackData.list);
            } 
            else if (attackData.type === 'whip') {
                attackData.list.forEach(whip => {
                    activeWhips.push({
                        ...whip,
                        spawnTime: now,
                        duration: 150, // Duração visual do corte em ms
                        hitEnemies: new Set() // Evita múltiplos acertos no mesmo corte
                    });
                });
            }
            else if (attackData.type === 'aura') {
                // Tiques de dano da aura de alho
                attackData.list.forEach(item => {
                    const dead = item.enemy.takeDamage(item.damage);
                    audio.playHit();
                    
                    // Cria partículas de sangue
                    createBloodParticles(item.enemy.x, item.enemy.y, 3);
                    
                    // Texto de dano
                    pushDamageText(item.enemy.x, item.enemy.y - 10, String(item.damage), '#c084fc');

                    // Knockback se for nível 4+
                    if (item.knockback) {
                        const ang = Math.atan2(item.enemy.y - player.y, item.enemy.x - player.x);
                        item.enemy.applyKnockback(ang, 3.5);
                    }

                    if (dead) {
                        handleEnemyDeath(item.enemy);
                    }
                });
            }
            else if (attackData.type === 'scythe') {
                // Adiciona novas foices orbitantes
                activeScythes.push(...attackData.list.map(scythe => ({
                    ...scythe,
                    hitCooldowns: new Map() // Limita a frequência de golpes em cada monstro
                })));
            }
        }
    });

    // 4. Atualizar Foices Orbitantes (Scythes)
    activeScythes.forEach(scythe => {
        scythe.angle += scythe.speed * factor;
        
        // Calcula a posição global atual da foice baseada no ângulo
        const scytheX = player.x + Math.cos(scythe.angle) * scythe.orbitDistance;
        const scytheY = player.y + Math.sin(scythe.angle) * scythe.orbitDistance;

        // Limpa os tempos de cooldown dos monstros golpeados
        for (let [enemyId, cooldown] of scythe.hitCooldowns.entries()) {
            scythe.hitCooldowns.set(enemyId, cooldown - dt);
            if (scythe.hitCooldowns.get(enemyId) <= 0) {
                scythe.hitCooldowns.delete(enemyId);
            }
        }

        // Checa colisão com inimigos
        enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - scytheX, enemy.y - scytheY);
            if (dist < enemy.radius + scythe.radius) {
                // Verifica se o monstro não está no cooldown de golpe da foice
                if (!scythe.hitCooldowns.has(enemy)) {
                    scythe.hitCooldowns.set(enemy, 350); // 350ms cooldown para bater de novo no mesmo

                    const isArmorPen = player.level >= 5;
                    const dmg = isArmorPen ? Math.round(scythe.damage * 1.3) : scythe.damage;
                    const dead = enemy.takeDamage(dmg);
                    
                    audio.playHit();
                    createBloodParticles(enemy.x, enemy.y, 4);
                    pushDamageText(enemy.x, enemy.y - 12, String(dmg), '#cbd5e1', isArmorPen);

                    // Aplica repulsão leve
                    const kbAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.applyKnockback(kbAngle, 4.0);

                    if (dead) {
                        handleEnemyDeath(enemy);
                    }
                }
            }
        });
    });

    // Remove foices expiradas
    activeScythes = activeScythes.filter(scythe => now - scythe.spawnTime < scythe.duration);

    // 5. Atualizar Chicotes Ativos (Whips)
    activeWhips.forEach(whip => {
        whip.duration -= dt;
        
        // Checa colisões
        enemies.forEach(enemy => {
            if (whip.hitEnemies.has(enemy)) return; // Evita acertar duas vezes o mesmo corte

            // Checa colisão retangular aproximada
            const isHit = checkWhipCollision(whip, enemy);
            
            if (isHit) {
                whip.hitEnemies.add(enemy);
                
                const dead = enemy.takeDamage(whip.damage);
                audio.playHit();
                
                createBloodParticles(enemy.x, enemy.y, 5);
                pushDamageText(enemy.x, enemy.y - 15, String(whip.damage), '#ef4444', whip.critical);

                // Aplica repulsão
                const kbAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                enemy.applyKnockback(kbAngle, 6.0);

                // Roubo de vida no chicote nível 5 (Crítico)
                if (whip.critical) {
                    player.hp = Math.min(player.maxHp, player.hp + 2);
                }

                if (dead) {
                    handleEnemyDeath(enemy);
                }
            }
        });
    });
    
    // Filtra cortes que já expiraram
    activeWhips = activeWhips.filter(w => w.duration > 0);

    // 6. Atualizar Inimigos
    enemies.forEach(enemy => {
        enemy.update(player.x, player.y, dt);

        // Colisão com o Jogador (Dano ao Vampiro)
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.radius + enemy.radius) {
            const hitSuccess = player.takeDamage(enemy.damage);
            if (hitSuccess) {
                screenShake = 8; // Tremer tela ao tomar dano
                createBloodParticles(player.x, player.y, 10, '#ff0000'); // Sangue do jogador
                
                if (player.hp <= 0) {
                    triggerGameOver();
                }
            }
        }
    });

    // 7. Atualizar Projéteis (Otimizado com loop for e break precoce para evitar processamento inútil)
    for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
        const proj = projectiles[pIdx];
        const particleEffect = proj.update(dt);
        if (particleEffect) particles.push(particleEffect);

        // Checar colisão com inimigos
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
            if (proj.pierce <= 0) break; // Para o loop de inimigos se o projétil já expirou a perfuração

            const enemy = enemies[eIdx];
            const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
            if (dist < enemy.radius + proj.radius) {
                proj.pierce--;
                const dead = enemy.takeDamage(proj.damage);
                
                audio.playHit();
                createBloodParticles(enemy.x, enemy.y, 4);
                
                // Texto de Dano
                pushDamageText(enemy.x, enemy.y - 10, String(proj.damage), '#ef4444');

                // Knockback suave do fogo
                const kbAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                enemy.applyKnockback(kbAngle, 2.5);

                if (dead) {
                    handleEnemyDeath(enemy);
                }
            }
        }
    }

    // Remove projéteis mortos ou velhos
    projectiles = projectiles.filter(p => !p.isExpired());

    // 8. Atualizar Gemas de XP
    gems.forEach(gem => {
        gem.update(player.x, player.y, player.magnetSize, dt);
        
        // Coleta da gema
        const dist = Math.hypot(player.x - gem.x, player.y - gem.y);
        if (dist < player.radius + gem.radius) {
            const levelUp = player.gainXp(gem.xpAmount);
            gem.collected = true;
            
            if (levelUp && gameState !== 'upgrade') {
                triggerLevelUp();
            }
        }
    });
    // Remove gemas coletadas
    gems = gems.filter(g => !g.collected);

    // 9. Atualizar Partículas
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => p.alpha > 0);

    // 10. Atualizar Textos de Dano
    damageTexts.forEach(t => t.update(dt));
    damageTexts = damageTexts.filter(t => t.alpha > 0);

    // 10.5. Atualizar Cooldown do Especial e as Ondas de Choque
    if (specialCooldownTimer > 0) {
        specialCooldownTimer = Math.max(0, specialCooldownTimer - dt);
    }

    activeShockwaves.forEach(wave => {
        const factor = dt / 16.66;
        wave.currentRadius += wave.speed * factor;
        
        // Colisão com inimigos
        enemies.forEach(enemy => {
            if (wave.hitEnemies.has(enemy)) return; // Já tomou dano dessa onda
            
            const dist = Math.hypot(enemy.x - wave.x, enemy.y - wave.y);
            // Se o monstro estiver dentro da faixa de expansão da onda
            if (dist <= wave.currentRadius && dist >= wave.currentRadius - 30) {
                wave.hitEnemies.add(enemy);
                
                const dead = enemy.takeDamage(wave.damage);
                audio.playHit();
                
                // Partículas de sangue + Faíscas douradas
                createBloodParticles(enemy.x, enemy.y, 8, '#ef4444');
                for (let i = 0; i < 3; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    particles.push(new Particle(enemy.x, enemy.y, '#eab308', 2, Math.cos(ang) * 3, Math.sin(ang) * 3));
                }
                
                // Texto de Dano (Sempre Crítico no Especial)
                pushDamageText(enemy.x, enemy.y - 15, String(wave.damage), '#f43f5e', true);

                // Super repulsão (knockback forte)
                const kbAngle = Math.atan2(enemy.y - wave.y, enemy.x - wave.x);
                enemy.applyKnockback(kbAngle, 12.0); // Repulsão ultra forte
                
                if (dead) {
                    handleEnemyDeath(enemy);
                }
            }
        });
    });
    // Remove shockwaves expiradas
    activeShockwaves = activeShockwaves.filter(w => w.currentRadius < w.maxRadius);

    // 11. Decaimento do Tremer de Tela
    if (screenShake > 0) {
        screenShake -= 0.5 * factor;
    }

    // Mantém HUD atualizado
    updateHUD();
}

// Auxiliares para Colisão do Chicote horizontal/vertical
function checkWhipCollision(whip, enemy) {
    // Projeta o chicote como um retângulo orientado
    const whipHalfW = whip.w / 2;
    const whipHalfH = whip.h / 2;
    
    // Distância absoluta horizontal/vertical
    const distX = Math.abs(enemy.x - whip.x);
    const distY = Math.abs(enemy.y - whip.y);
    
    if (distX > (whipHalfW + enemy.radius)) return false;
    if (distY > (whipHalfH + enemy.radius)) return false;
    
    if (distX <= whipHalfW) return true;
    if (distY <= whipHalfH) return true;
    
    const dx = distX - whipHalfW;
    const dy = distY - whipHalfH;
    return (dx*dx + dy*dy <= enemy.radius * enemy.radius);
}

// Cria estouro de partículas de sangue/mana
function createBloodParticles(x, y, count, overrideColor = null) {
    // Reduz a quantidade de partículas geradas se houver muitas na tela para evitar gargalos
    if (particles.length > 150) {
        count = Math.max(1, Math.floor(count / 2));
    }
    if (particles.length >= 300) return; // Limite máximo de partículas simultâneas

    for (let i = 0; i < count; i++) {
        const color = overrideColor || (Math.random() < 0.2 ? '#fca5a5' : '#7f1d1d');
        const radius = Math.random() * 2 + 1.5;
        const vx = (Math.random() - 0.5) * 6;
        const vy = (Math.random() - 0.5) * 6;
        particles.push(new Particle(x, y, color, radius, vx, vy));
    }
}

// Cria gemas no chão e as consolida se o limite for atingido para otimizar a renderização
function spawnGem(x, y, xpValue) {
    if (gems.length > 150) {
        // Encontra uma gema próxima (num raio de 120px) que ainda não esteja sendo sugada pelo player
        const nearbyGem = gems.find(g => !g.attracted && Math.hypot(g.x - x, g.y - y) < 120);
        if (nearbyGem) {
            nearbyGem.xpAmount += xpValue;
            nearbyGem.updateVisuals();
            return;
        }
    }
    gems.push(new Gem(x, y, xpValue));
}

// Limita o número de textos de dano simultâneos para otimizar o canvas
function pushDamageText(x, y, text, color = '#ffffff', isCritical = false) {
    if (damageTexts.length >= 40) {
        damageTexts.shift(); // Remove o mais antigo
    }
    damageTexts.push(new DamageText(x, y, text, color, isCritical));
}

// --- SISTEMA DE SALVAMENTO PERSISTENTE (LOCALSTORAGE) ---

// Variáveis de controle de salvamento
let lastSaveTime = 0;
let saveIndicatorTimeout = null;

// Exibe uma notificação visual discreta de salvamento na interface
function showSaveIndicator() {
    if (!saveIndicator) return;
    
    saveIndicator.classList.remove('hidden');
    saveIndicator.style.opacity = '1';

    // Cancela timeouts anteriores para evitar bugs de piscar
    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
    saveIndicatorTimeout = setTimeout(() => {
        saveIndicator.style.opacity = '0';
        // Aguarda transição do CSS acabar para ocultar completamente
        setTimeout(() => {
            if (saveIndicator.style.opacity === '0') {
                saveIndicator.classList.add('hidden');
            }
        }, 500);
    }, 1500);
}

// Mapeador de IDs de string para as classes originais importadas
function getWeaponOrPassiveClassById(id) {
    switch (id) {
        case 'whip': return BloodWhip;
        case 'fireball': return ShadowFireball;
        case 'garlic': return GarlicAura;
        case 'scythe': return OrbitScythe;
        case 'mirror': return BloodMirror;
        case 'boots': return BatBoots;
        case 'magnet': return Magnet;
        default: return null;
    }
}

// Salva o estado atual da partida no localStorage
function saveGame() {
    if (!player || gameState === 'gameover' || gameState === 'start') return;

    const saveData = {
        gameTime,
        kills,
        spawnCooldown,
        player: {
            x: player.x,
            y: player.y,
            hp: player.hp,
            maxHp: player.maxHp,
            level: player.level,
            xp: player.xp,
            xpToNextLevel: player.xpToNextLevel,
            pendingLevelUps: player.pendingLevelUps,
            weapons: activeWeapons.map(w => ({ id: w.id, level: w.level })),
            passives: activePassives.map(p => ({ id: p.id, level: p.level }))
        },
        enemies: enemies.map(e => ({
            x: e.x,
            y: e.y,
            type: e.type,
            hp: e.hp,
            difficultyMult: e.difficultyMult || 1.0
        })),
        gems: gems.map(g => ({
            x: g.x,
            y: g.y,
            xpAmount: g.xpAmount
        }))
    };

    try {
        localStorage.setItem('vampiric_survival_save', JSON.stringify(saveData));
        showSaveIndicator();
    } catch (err) {
        console.error("Erro ao salvar o jogo no localStorage:", err);
    }
}

// Limpa o save do localStorage (chamado ao morrer no Game Over)
function clearSave() {
    try {
        localStorage.removeItem('vampiric_survival_save');
        if (btnResumeSave) btnResumeSave.classList.add('hidden');
    } catch (err) {
        console.error("Erro ao remover o save do localStorage:", err);
    }
}

// Verifica se há um save disponível e exibe o botão de retomar
function checkExistingSave() {
    try {
        const save = localStorage.getItem('vampiric_survival_save');
        if (save && btnResumeSave) {
            btnResumeSave.classList.remove('hidden');
        } else if (btnResumeSave) {
            btnResumeSave.classList.add('hidden');
        }
    } catch (err) {
        console.error("Erro ao verificar o save no localStorage:", err);
    }
}

// Restaura e inicia o jogo a partir do save
function loadGame() {
    const saveStr = localStorage.getItem('vampiric_survival_save');
    if (!saveStr) return;

    try {
        const saveData = JSON.parse(saveStr);

        // 1. Instanciar o jogador e restaurar status básicos
        player = new Player(saveData.player.x, saveData.player.y);
        player.hp = saveData.player.hp;
        player.maxHp = saveData.player.maxHp;
        player.level = saveData.player.level;
        player.xp = saveData.player.xp;
        player.xpToNextLevel = saveData.player.xpToNextLevel;
        player.pendingLevelUps = saveData.player.pendingLevelUps;

        // 2. Limpar e recriar o Pool de Upgrades
        upgradePool = [
            new BloodWhip(),
            new ShadowFireball(),
            new GarlicAura(),
            new OrbitScythe(),
            new BloodMirror(),
            new BatBoots(),
            new Magnet()
        ];
        // Reseta todos no pool para nível 0 inicialmente
        upgradePool.forEach(item => item.level = 0);

        // 3. Restaurar Armas Ativas
        activeWeapons = [];
        saveData.player.weapons.forEach(wData => {
            const WeaponClass = getWeaponOrPassiveClassById(wData.id);
            if (WeaponClass) {
                const weapon = new WeaponClass();
                weapon.level = wData.level;
                activeWeapons.push(weapon);

                // Sincronizar nível no pool de upgrades
                const poolItem = upgradePool.find(item => item.id === wData.id);
                if (poolItem) poolItem.level = wData.level;
            }
        });

        // 4. Restaurar Passivos Ativos
        activePassives = [];
        saveData.player.passives.forEach(pData => {
            const PassiveClass = getWeaponOrPassiveClassById(pData.id);
            if (PassiveClass) {
                const passive = new PassiveClass();
                passive.level = pData.level;
                activePassives.push(passive);

                // Sincronizar nível no pool de upgrades
                const poolItem = upgradePool.find(item => item.id === pData.id);
                if (poolItem) poolItem.level = pData.level;
            }
        });

        // Aplicar efeitos passivos para restaurar os multiplicadores corretos
        activePassives.forEach(p => p.applyEffect(player));

        // 5. Restaurar Stats do Jogo
        gameTime = saveData.gameTime;
        kills = saveData.kills;
        spawnCooldown = saveData.spawnCooldown;
        lastSpawnTime = gameTime;
        lastSaveTime = gameTime;

        // 6. Restaurar Inimigos
        enemies = [];
        saveData.enemies.forEach(eData => {
            const enemy = new Enemy(eData.x, eData.y, eData.type, eData.difficultyMult);
            enemy.hp = eData.hp;
            enemies.push(enemy);
        });

        // 7. Restaurar Gemas de XP
        gems = [];
        saveData.gems.forEach(gData => {
            const gem = new Gem(gData.x, gData.y, gData.xpAmount);
            gems.push(gem);
        });

        // 8. Limpar Efeitos e Partículas ativas do loop anterior
        projectiles = [];
        particles = [];
        damageTexts = [];
        activeWhips = [];
        activeScythes = [];
        activeShockwaves = [];
        specialCooldownTimer = 0;
        screenShake = 0;

        // Iniciar som e ocultar menus
        audio.startMusic();
        menuStart.classList.add('hidden');
        menuUpgrade.classList.add('hidden');
        menuGameOver.classList.add('hidden');
        menuPause.classList.add('hidden');
        hud.classList.remove('hidden');

        renderInventoryHTML();
        updateHUD();

        gameState = 'playing';
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);

    } catch (err) {
        console.error("Erro ao carregar o save do localStorage:", err);
        // Limpa save corrompido e inicia novo jogo normal em caso de pane
        clearSave();
        startGame();
    }
}

// Gerencia a morte do inimigo (Soma morte, gera gema de XP)
function handleEnemyDeath(enemy) {
    kills++;
    
    // Remove da lista de inimigos (será filtrado depois ou removemos direto)
    const idx = enemies.indexOf(enemy);
    if (idx !== -1) {
        enemies.splice(idx, 1);
    }
    
    // Cria gemas no local da morte
    spawnGem(enemy.x, enemy.y, enemy.xpValue);

    // Se for chefe, explode em partículas vermelhas brilhantes e dá muita XP
    if (enemy.isBoss) {
        screenShake = 10;
        createBloodParticles(enemy.x, enemy.y, 40, '#ef4444');
    } else {
        createBloodParticles(enemy.x, enemy.y, 6);
    }
}

// --- RENDERIZAÇÃO GRÁFICA (DRAW) ---

function drawGame() {
    // Limpa a tela inteira
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Atualizar e Limitar Câmera
    camera.x = player.x - viewWidth / 2;
    camera.y = player.y - viewHeight / 2;

    // Impede a câmera de sair do mapa de tamanho WORLD_SIZE
    camera.x = Math.max(0, Math.min(WORLD_SIZE - viewWidth, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - viewHeight, camera.y));

    ctx.save();
    
    // Aplicar escala responsiva
    ctx.scale(scale, scale);
    
    // 2. Aplicar Screen Shake (Efeito tremor)
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
    }

    // 3. Aplicar Translação de Câmera (Tudo desenhado depois ficará no espaço global do mundo)
    ctx.translate(-camera.x, -camera.y);

    // 4. Desenhar Fundo (Ladrilhos/Flagstone góticos infinitos)
    drawFloorGrid();

    // 5. Desenhar Limites do Mapa (Bordas de Névoa de Sangue)
    drawWorldBorders();

    // 6. Desenhar Gemas de XP
    gems.forEach(g => g.draw(ctx));

    // 7. Desenhar Projéteis
    projectiles.forEach(p => p.draw(ctx));

    // 8. Desenhar Efeitos de Chicote (Whips) ativos
    drawWhipSlashes();

    // 9. Desenhar Foices Orbitantes (Scythes)
    drawOrbitingScythes();

    // 9.5. Desenhar Ondas de Choque Especiais
    activeShockwaves.forEach(wave => {
        ctx.save();
        ctx.strokeStyle = wave.color;
        
        // Efeito de desbotar conforme expande
        const opacity = 1 - (wave.currentRadius / wave.maxRadius);
        ctx.globalAlpha = Math.max(0, opacity);
        
        ctx.lineWidth = 6 * opacity + 1;
        ctx.shadowBlur = 20 * opacity;
        ctx.shadowColor = wave.color;
        
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });

    // 10. Desenhar Inimigos
    enemies.forEach(e => e.draw(ctx));

    // 11. Desenhar Jogador (Vampiro)
    player.draw(ctx);

    // 12. Desenhar Partículas de Efeito
    particles.forEach(p => p.draw(ctx));

    // 13. Desenhar Textos de Dano Flutuantes
    damageTexts.forEach(t => t.draw(ctx));

    ctx.restore();
}

// Desenha uma grade de pedra estilizada para transmitir movimento
function drawFloorGrid() {
    const spacing = 120;
    const startX = Math.floor(camera.x / spacing) * spacing;
    const startY = Math.floor(camera.y / spacing) * spacing;

    ctx.strokeStyle = '#120b22'; // Linha escura roxa gótica
    ctx.lineWidth = 1;

    for (let gx = startX; gx < startX + viewWidth + spacing; gx += spacing) {
        ctx.beginPath();
        ctx.moveTo(gx, camera.y);
        ctx.lineTo(gx, camera.y + viewHeight);
        ctx.stroke();
    }
    for (let gy = startY; gy < startY + viewHeight + spacing; gy += spacing) {
        ctx.beginPath();
        ctx.moveTo(camera.x, gy);
        ctx.lineTo(camera.x + viewWidth, gy);
        ctx.stroke();
    }

    // Desenha pequenas cruzes ou texturas nas interseções para detalhar
    ctx.fillStyle = '#1e1136';
    for (let gx = startX; gx < startX + viewWidth + spacing; gx += spacing) {
        for (let gy = startY; gy < startY + viewHeight + spacing; gy += spacing) {
            if (gx >= 0 && gx <= WORLD_SIZE && gy >= 0 && gy <= WORLD_SIZE) {
                ctx.fillRect(gx - 2, gy - 2, 4, 4);
            }
        }
    }
}

// Desenha a borda vermelha do mapa
function drawWorldBorders() {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    
    ctx.shadowBlur = 0; // Desliga shadow
}

// Renderiza visualmente o corte do chicote
function drawWhipSlashes() {
    activeWhips.forEach(whip => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = whip.critical ? '#fca5a5' : '#ef4444';
        ctx.strokeStyle = whip.critical ? '#ffffff' : '#b91c1c';
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        // Desenha um arco horizontal em chicotada
        const startX = whip.x - (whip.w / 2) * whip.dir;
        const endX = whip.x + (whip.w / 2) * whip.dir;
        
        ctx.moveTo(startX, whip.y - 6);
        ctx.quadraticCurveTo(whip.x, whip.y + 12, endX, whip.y - 6);
        ctx.stroke();
        
        // Efeito flash do corte
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        
        ctx.restore();
    });
}

// Renderiza visualmente as foices girando
function drawOrbitingScythes() {
    activeScythes.forEach(scythe => {
        const scytheX = player.x + Math.cos(scythe.angle) * scythe.orbitDistance;
        const scytheY = player.y + Math.sin(scythe.angle) * scythe.orbitDistance;

        ctx.save();
        
        // Brilho prateado
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#94a3b8';
        
        // Desenha foice
        ctx.translate(scytheX, scytheY);
        ctx.rotate(scythe.angle + Math.PI * 0.75); // Rotaciona de acordo com o giro

        // Lâmina curvada
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, scythe.radius, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        // Cabo da foice
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-scythe.radius * 0.8, scythe.radius * 0.8);
        ctx.stroke();

        ctx.restore();
    });
}

// --- LOOP PRINCIPAL DE EXECUÇÃO ---

function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    // Calcula tempo delta (dt) entre quadros
    let dt = timestamp - lastTime;
    
    // Limita dt máximo para evitar pulos gigantescos por travamento de aba
    if (dt > 100) dt = 16.66;
    
    lastTime = timestamp;

    updateGame(dt);
    drawGame();

    requestAnimationFrame(gameLoop);
}

// --- REGISTRO DE EVENTOS E TRIGGERS ---

btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);
btnResume.addEventListener('click', resumeGame);
btnPauseToggle.addEventListener('click', () => {
    if (gameState === 'playing') pauseGame();
    else if (gameState === 'paused') resumeGame();
});

// --- SISTEMA DE CONTROLES DE TOQUE (MOBILE) ---

// 1. Detectar dispositivo de toque no primeiro evento touchstart
function enableTouchMode() {
    // Verifica se o dispositivo é realmente móvel ou tablet
    const isMobileDevice = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           (window.matchMedia("(pointer: coarse)").matches && window.innerWidth <= 1024);

    if (isMobileDevice && !document.body.classList.contains('touch-device')) {
        document.body.classList.add('touch-device');
        // Tenta desbloquear o AudioContext caso esteja pausado/bloqueado
        if (audio && audio.ctx && audio.ctx.state === 'suspended') {
            audio.ctx.resume().catch(err => console.log('Erro ao resumir AudioContext via touch:', err));
        }
    }
}
window.addEventListener('touchstart', enableTouchMode, { passive: true });

// 2. Manipulação do Joystick Virtual
if (joystickBase && joystickKnob) {
    const maxDragRadius = 40; // Limite de movimento do knob em pixels

    joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Impede rolagem e comportamento indesejado
        enableTouchMode();

        // Se já houver um toque controlando o joystick, ignora novos toques nele
        if (joystickTouchId !== null) return;

        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;

        // Calcula a posição do centro físico do joystick na tela
        const rect = joystickBase.getBoundingClientRect();
        joystickCenter.x = rect.left + rect.width / 2;
        joystickCenter.y = rect.top + rect.height / 2;

        handleJoystickMove(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (joystickTouchId === null) return;

        // Encontra o toque correspondente ao joystick
        let activeTouch = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === joystickTouchId) {
                activeTouch = e.touches[i];
                break;
            }
        }

        if (activeTouch) {
            e.preventDefault(); // Impede comportamento padrão de rolagem
            handleJoystickMove(activeTouch.clientX, activeTouch.clientY);
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (joystickTouchId === null) return;

        // Verifica se o toque do joystick terminou
        let finished = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                finished = true;
                break;
            }
        }

        if (finished) {
            resetJoystick();
        }
    });

    window.addEventListener('touchcancel', (e) => {
        if (joystickTouchId === null) return;
        
        let finished = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                finished = true;
                break;
            }
        }

        if (finished) {
            resetJoystick();
        }
    });

    function handleJoystickMove(clientX, clientY) {
        let dx = clientX - joystickCenter.x;
        let dy = clientY - joystickCenter.y;
        const dist = Math.hypot(dx, dy);

        if (dist > maxDragRadius) {
            dx = (dx / dist) * maxDragRadius;
            dy = (dy / dist) * maxDragRadius;
        }

        // Posiciona visualmente o knob
        joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

        // Define o vetor normalizado para o movimento do jogador (valores entre -1 e 1)
        joystickVector.x = dx / maxDragRadius;
        joystickVector.y = dy / maxDragRadius;
    }

    function resetJoystick() {
        joystickTouchId = null;
        joystickKnob.style.transform = 'translate(0px, 0px)';
        joystickVector.x = 0;
        joystickVector.y = 0;
    }
}

// 3. Manipulação do Botão de Especial Touch
if (btnSpecialTouch) {
    btnSpecialTouch.addEventListener('touchstart', (e) => {
        e.preventDefault();
        enableTouchMode();
        
        if (gameState === 'playing') {
            useSpecialAttack();
        }
    }, { passive: false });
}

// Inicialização automática das telas de menu ao carregar a página
window.onload = () => {
    menuStart.classList.remove('hidden');
    hud.classList.add('hidden');
    menuUpgrade.classList.add('hidden');
    menuGameOver.classList.add('hidden');
    menuPause.classList.add('hidden');
    
    // Verifica se há partida anterior para retomar
    checkExistingSave();
};

// Evento para retomar o jogo salvo
if (btnResumeSave) {
    btnResumeSave.addEventListener('click', () => {
        loadGame();
    });
}

// Salva a partida automaticamente ao fechar o navegador/aba
window.addEventListener('beforeunload', () => {
    if (gameState === 'playing' || gameState === 'upgrade' || gameState === 'paused') {
        saveGame();
    }
});
