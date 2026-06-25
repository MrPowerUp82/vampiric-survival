// Entidades do Jogo - Vampiro Sobrevivente
import { audio } from './audio.js';

// --- CLASSE PARTÍCULA (Efeitos visuais) ---
export class Particle {
    constructor(x, y, color, radius = 3, vx = null, vy = null) {
        this.x = x;
        this.y = y;
        this.vx = vx !== null ? vx : (Math.random() - 0.5) * 4;
        this.vy = vy !== null ? vy : (Math.random() - 0.5) * 4;
        this.radius = radius;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }

    update(dt) {
        const factor = dt / 16.66;
        this.x += this.vx * factor;
        this.y += this.vy * factor;
        this.alpha -= this.decay * factor;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// --- CLASSE TEXTO DE DANO (Indicador flutuante) ---
export class DamageText {
    constructor(x, y, text, color = '#ffffff', isCritical = false) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.isCritical = isCritical;
        this.alpha = 1;
        this.vy = -1.5; // Velocidade de subida
        this.decay = 0.025;
        this.scale = isCritical ? 1.4 : 1.0;
    }

    update(dt) {
        const factor = dt / 16.66;
        this.y += this.vy * factor;
        this.alpha -= this.decay * factor;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;

        if (this.isCritical) {
            ctx.font = `bold 14px 'Cinzel', serif`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff0000';
        } else {
            ctx.font = `bold 11px 'Outfit', sans-serif`;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        }

        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// --- CLASSE PROJÉTIL ---
export class Projectile {
    constructor(x, y, vx, vy, radius, color, damage, pierce = 1, lifeTime = 2000, behavior = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
        this.damage = damage;
        this.pierce = pierce; // Inimigos que pode atravessar antes de sumir
        this.lifeTime = lifeTime;
        this.behavior = behavior; // 'normal', 'orbit', etc.
        this.angle = 0;
        this.spawnTime = Date.now();
    }

    update(dt) {
        const factor = dt / 16.66;
        this.x += this.vx * factor;
        this.y += this.vy * factor;

        // Efeito de fogo
        if (Math.random() < 0.25) {
            return new Particle(this.x, this.y, '#f97316', this.radius * 0.6, -this.vx * 0.2, -this.vy * 0.2);
        }
        return null;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    isExpired() {
        return Date.now() - this.spawnTime > this.lifeTime || this.pierce <= 0;
    }
}

// --- CLASSE GEMA DE XP ---
export class Gem {
    constructor(x, y, xpAmount = 1) {
        this.x = x;
        this.y = y;
        this.xpAmount = xpAmount;
        this.radius = 4;
        this.color = '#c084fc'; // Gema roxa brilhante
        this.attracted = false;
        this.speed = 0.5;
        this.updateVisuals();
    }

    updateVisuals() {
        // Altera a cor e o tamanho com base na quantidade de XP
        if (this.xpAmount >= 50) {
            this.color = '#ef4444'; // Vermelha super gema
            this.radius = 7;
        } else if (this.xpAmount >= 15) {
            this.color = '#3b82f6'; // Azul gema grande
            this.radius = 5.5;
        } else if (this.xpAmount >= 5) {
            this.color = '#10b981'; // Verde gema média
            this.radius = 4.5;
        } else {
            this.color = '#c084fc'; // Roxa gema comum
            this.radius = 4;
        }
    }

    update(playerX, playerY, magnetSize, dt) {
        const dist = Math.hypot(playerX - this.x, playerY - this.y);

        // Atração magnética se estiver no raio do jogador
        if (dist < magnetSize) {
            this.attracted = true;
        }

        if (this.attracted) {
            const factor = dt / 16.66;
            this.speed += 0.35 * factor; // Aceleração em direção ao jogador
            const angle = Math.atan2(playerY - this.y, playerX - this.x);
            this.x += Math.cos(angle) * this.speed * factor;
            this.y += Math.sin(angle) * this.speed * factor;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();

        // Desenha gema em formato de losango (diamond)
        ctx.moveTo(this.x, this.y - this.radius * 1.5);
        ctx.lineTo(this.x + this.radius, this.y);
        ctx.lineTo(this.x, this.y + this.radius * 1.5);
        ctx.lineTo(this.x - this.radius, this.y);

        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// --- CLASSE INIMIGO ---
export class Enemy {
    constructor(x, y, type = 'bat', difficultyMult = 1.0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isBoss = type === 'reaper';

        // Configuração de Tipos
        switch (type) {
            case 'bat': // Rápido, fraco, pequeno
                this.radius = 9;
                this.speed = 1.6;
                this.hp = Math.round(8 * difficultyMult);
                this.maxHp = this.hp;
                this.damage = 6;
                this.xpValue = 1;
                this.color = '#8b2fc9';
                break;
            case 'skeleton': // Médio
                this.radius = 12;
                this.speed = 1.0;
                this.hp = Math.round(28 * difficultyMult);
                this.maxHp = this.hp;
                this.damage = 12;
                this.xpValue = 2;
                this.color = '#cbd5e1';
                break;
            case 'zombie': // Lento e Resistente
                this.radius = 15;
                this.speed = 0.6;
                this.hp = Math.round(85 * difficultyMult);
                this.maxHp = this.hp;
                this.damage = 20;
                this.xpValue = 5;
                this.color = '#15803d';
                break;
            case 'reaper': // Chefe Gigante
                this.radius = 28;
                this.speed = 0.85;
                this.hp = Math.round(1500 * difficultyMult);
                this.maxHp = this.hp;
                this.damage = 35;
                this.xpValue = 100;
                this.color = '#991b1b';
                break;
        }

        this.knockbackX = 0;
        this.knockbackY = 0;
        this.knockbackDecay = 0.85;
        this.animationTimer = Math.random() * 100; // Timer para asas/passos
        this.difficultyMult = difficultyMult;
    }

    update(playerX, playerY, dt) {
        const factor = dt / 16.66;
        this.animationTimer += 0.15 * factor;

        // Direção ao jogador
        const angle = Math.atan2(playerY - this.y, playerX - this.x);

        // Movimento normal + aplicação de Knockback (repulsão)
        const moveX = Math.cos(angle) * this.speed + this.knockbackX;
        const moveY = Math.sin(angle) * this.speed + this.knockbackY;

        this.x += moveX * factor;
        this.y += moveY * factor;

        // Amortecimento do knockback
        this.knockbackX *= Math.pow(this.knockbackDecay, factor);
        this.knockbackY *= Math.pow(this.knockbackDecay, factor);
        if (Math.hypot(this.knockbackX, this.knockbackY) < 0.05) {
            this.knockbackX = 0;
            this.knockbackY = 0;
        }
    }

    applyKnockback(angle, force) {
        this.knockbackX = Math.cos(angle) * force;
        this.knockbackY = Math.sin(angle) * force;
    }

    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }

    draw(ctx) {
        ctx.save();

        // Sombra sob os pés dos inimigos
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius - 1, this.radius * 0.95, this.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sombras brilhantes para chefes
        if (this.isBoss) {
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff0000';
        }

        // --- Desenhar inimigos customizados com canvas ---
        if (this.type === 'bat') {
            // Asas Flutuantes Pontiagudas (Morcego gótico)
            const wingY = Math.sin(this.animationTimer) * 9;
            ctx.fillStyle = '#2b0730'; // Roxo muito escuro para asa externa
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#4e0e56';

            // Asa Esquerda
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.bezierCurveTo(this.x - 14, this.y - 15 - wingY, this.x - 22, this.y - wingY, this.x - 24, this.y + 4 - wingY);
            ctx.lineTo(this.x - 16, this.y + 1);
            ctx.lineTo(this.x - 12, this.y + 6);
            ctx.lineTo(this.x - 6, this.y + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Asa Direita
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.bezierCurveTo(this.x + 14, this.y - 15 - wingY, this.x + 22, this.y - wingY, this.x + 24, this.y + 4 - wingY);
            ctx.lineTo(this.x + 16, this.y + 1);
            ctx.lineTo(this.x + 12, this.y + 6);
            ctx.lineTo(this.x + 6, this.y + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Corpo
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            // Orelhas de morcego pontiagudas
            ctx.fillStyle = '#6d28d9';
            ctx.beginPath();
            ctx.moveTo(this.x - 5, this.y - 7);
            ctx.lineTo(this.x - 7, this.y - 13);
            ctx.lineTo(this.x - 1, this.y - 8);
            ctx.moveTo(this.x + 5, this.y - 7);
            ctx.lineTo(this.x + 7, this.y - 13);
            ctx.lineTo(this.x + 1, this.y - 8);
            ctx.fill();

            // Olhos Vermelhos brilhantes
            ctx.fillStyle = '#ff3333';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x - 3, this.y - 1, 2.5, 0, Math.PI * 2);
            ctx.arc(this.x + 3, this.y - 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Desliga

            // Pequenas presas brancas
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(this.x - 2, this.y + 2);
            ctx.lineTo(this.x - 1, this.y + 5);
            ctx.lineTo(this.x, this.y + 2);
            ctx.moveTo(this.x, this.y + 2);
            ctx.lineTo(this.x + 1, this.y + 5);
            ctx.lineTo(this.x + 2, this.y + 2);
            ctx.fill();

        } else if (this.type === 'skeleton') {
            // Corpo (Esqueleto Branco Detalhado)
            ctx.fillStyle = this.color;

            // Cabeça (Crânio estilizado)
            ctx.beginPath();
            ctx.arc(this.x, this.y - 7, this.radius * 0.65, 0, Math.PI * 2);
            ctx.fill();

            // Mandíbula e dentes
            ctx.fillRect(this.x - 4, this.y - 1, 8, 4);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(this.x - 3, this.y + 1, 1, 2);
            ctx.fillRect(this.x, this.y + 1, 1, 2);
            ctx.fillRect(this.x + 2, this.y + 1, 1, 2);

            // Olhos Vazios Pretos com pupilas vermelhas
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(this.x - 3, this.y - 7, 3, 0, Math.PI * 2);
            ctx.arc(this.x + 3, this.y - 7, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ef4444'; // Pupila vermelha maligna
            ctx.beginPath();
            ctx.arc(this.x - 3, this.y - 7, 1, 0, Math.PI * 2);
            ctx.arc(this.x + 3, this.y - 7, 1, 0, Math.PI * 2);
            ctx.fill();

            // Coluna e Costelas (Desenho do corpo)
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 3);
            ctx.lineTo(this.x, this.y + 12); // Coluna vertebral
            ctx.stroke();

            ctx.lineWidth = 2.5;
            // Costela 1
            ctx.beginPath();
            ctx.moveTo(this.x - 8, this.y + 5);
            ctx.lineTo(this.x + 8, this.y + 5);
            // Costela 2
            ctx.moveTo(this.x - 6, this.y + 8);
            ctx.lineTo(this.x + 6, this.y + 8);
            // Costela 3
            ctx.moveTo(this.x - 5, this.y + 11);
            ctx.lineTo(this.x + 5, this.y + 11);
            ctx.stroke();

            // Mão segurando espada
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + 8, this.y + 8);
            ctx.lineTo(this.x + 16, this.y + 1); // Cabo da espada
            ctx.stroke();

            ctx.strokeStyle = '#94a3b8'; // Lâmina de aço
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x + 13, this.y + 4);
            ctx.lineTo(this.x + 22, this.y - 7);
            ctx.stroke();

        } else if (this.type === 'zombie') {
            // Corpo Verde e Roupas Rasgadas
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            // Cérebro Cor-de-Rosa Exposto (Efeito gore gótico)
            ctx.fillStyle = '#f472b6'; // Rosa
            ctx.beginPath();
            ctx.arc(this.x - 3, this.y - 9, 6, Math.PI * 1.1, Math.PI * 1.9);
            ctx.fill();
            ctx.fillStyle = '#db2777'; // Detalhes do cérebro
            ctx.fillRect(this.x - 5, this.y - 12, 4, 2);
            ctx.fillRect(this.x - 2, this.y - 14, 3, 2);

            // Cabelos escuros e cicatrizes na testa
            ctx.fillStyle = '#14532d'; // Verde escarlate
            ctx.beginPath();
            ctx.arc(this.x, this.y - 4, this.radius * 0.72, Math.PI * 1.2, Math.PI * 1.8);
            ctx.fill();

            // Olhos de Zumbi (um maior que o outro, olhar insano)
            ctx.fillStyle = '#fbbf24'; // Amarelo
            ctx.beginPath();
            ctx.arc(this.x - 4, this.y - 2, 3.5, 0, Math.PI * 2); // Olho esquerdo grande
            ctx.arc(this.x + 4, this.y - 2, 2, 0, Math.PI * 2); // Olho direito pequeno
            ctx.fill();

            ctx.fillStyle = '#000000'; // Pupilas pretas
            ctx.beginPath();
            ctx.arc(this.x - 4.5, this.y - 2, 1.2, 0, Math.PI * 2);
            ctx.arc(this.x + 4, this.y - 2, 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Boca aberta sangrenta (Mandíbula caída)
            ctx.fillStyle = '#450a0a';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + 5, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Braços esticados para frente (Querendo comer cérebro!)
            ctx.fillStyle = '#166534';
            const armAngle = Math.sin(this.animationTimer) * 3;
            ctx.fillRect(this.x - 22, this.y + armAngle, 8, 4); // Braço 1
            ctx.fillRect(this.x - 20, this.y + 4 - armAngle, 8, 4); // Braço 2

        } else if (this.isBoss) {
            // Capuz Ceifador Negro Profundo
            ctx.fillStyle = '#090514';
            ctx.beginPath();
            ctx.arc(this.x, this.y - 6, this.radius, Math.PI, Math.PI * 2);
            ctx.fill();

            // Manto esfarrapado com dobras (Capa flowing)
            ctx.fillStyle = '#110c1f';
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius, this.y - 6);
            ctx.quadraticCurveTo(this.x - this.radius * 1.2, this.y + this.radius * 0.5, this.x - this.radius * 0.8, this.y + this.radius * 1.2);
            ctx.lineTo(this.x - this.radius * 0.3, this.y + this.radius * 0.8);
            ctx.lineTo(this.x, this.y + this.radius * 1.3); // Ponta central
            ctx.lineTo(this.x + this.radius * 0.3, this.y + this.radius * 0.8);
            ctx.lineTo(this.x + this.radius * 0.8, this.y + this.radius * 1.2);
            ctx.quadraticCurveTo(this.x + this.radius * 1.2, this.y + this.radius * 0.5, this.x + this.radius, this.y - 6);
            ctx.closePath();
            ctx.fill();

            // Detalhes vermelhos na borda do manto
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Olhos de Fogo com partículas de fumaça vermelha
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x - 7, this.y - 3, 4, 0, Math.PI * 2);
            ctx.arc(this.x + 7, this.y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Mãos de osso cinzentas segurando a foice
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(this.x + 12, this.y + 8, 4, 0, Math.PI * 2);
            ctx.fill();

            // Foice da Morte Gigante e Ameaçadora
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#334155'; // Cabo de metal escuro
            ctx.beginPath();
            ctx.moveTo(this.x + 12, this.y + 8);
            ctx.lineTo(this.x + 42, this.y - 28);
            ctx.stroke();

            // Lâmina curvada enorme com brilho de energia vermelha
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ef4444';
            ctx.strokeStyle = '#f87171'; // Vermelho claro no centro
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(this.x + 22, this.y - 28, 25, -Math.PI * 0.6, 0.1);
            ctx.stroke();
            ctx.restore();
        }

        // Desenhar barra de vida discreta para monstros danificados
        if (this.hp < this.maxHp && !this.isBoss) {
            const barW = this.radius * 2;
            const barH = 3.5;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8, barW, barH);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8, barW * (this.hp / this.maxHp), barH);
        } else if (this.isBoss) {
            // Boss HP bar gigante em cima do chefe
            const barW = this.radius * 2.8;
            const barH = 5.5;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(this.x - barW / 2, this.y - this.radius - 14, barW, barH);
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillRect(this.x - barW / 2, this.y - this.radius - 14, barW * (this.hp / this.maxHp), barH);
        }

        ctx.restore();
    }
}

// --- CLASSE JOGADOR (VAMPIRIC PLAYER) ---
export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 14;
        this.speed = 2.4;

        // Status do Vampiro
        this.maxHp = 100;
        this.hp = 100;
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 10;
        this.pendingLevelUps = 0;
        this.regenTimer = 0;

        // Estatísticas modificadas por itens passivos
        this.damageMult = 1.0;
        this.speedMult = 1.0;
        this.magnetSize = 80; // Área de atração das gemas
        this.areaMult = 1.0;   // Área de alcance das armas
        this.cooldownRed = 0.0; // Redução de cooldown (ex: 0.1 = 10%)

        this.iframe = 0; // Cooldown de imunidade contra hits (invincibility frame)
        this.facing = 'right'; // Direção ('left', 'right')
        this.moving = false;

        // Controle de Animações
        this.animationTimer = 0;
    }

    update(keys, canvasW, canvasH, dt, touchVector = null) {
        const factor = dt / 16.66;

        // Reduz tempo de imunidade
        if (this.iframe > 0) {
            this.iframe -= dt;
        }

        this.animationTimer += 0.1 * factor;

        // Processa Entrada de Teclas ou Toque
        let dx = 0;
        let dy = 0;

        if (touchVector && (touchVector.x !== 0 || touchVector.y !== 0)) {
            dx = touchVector.x;
            dy = touchVector.y;

            // Garantir que a magnitude do vetor de toque não ultrapasse 1, 
            // e aplicar normalização para manter consistência na velocidade.
            const length = Math.hypot(dx, dy);
            if (length > 0.01) {
                dx /= length;
                dy /= length;
            } else {
                dx = 0;
                dy = 0;
            }
        } else {
            if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
            if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
            if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
            if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;

            // Normalização diagonal
            if (dx !== 0 && dy !== 0) {
                const length = Math.hypot(dx, dy);
                dx /= length;
                dy /= length;
            }
        }

        this.moving = dx !== 0 || dy !== 0;

        if (dx > 0) this.facing = 'right';
        else if (dx < 0) this.facing = 'left';

        // Atualiza Posição e Colisão de Bordas
        const finalSpeed = this.speed * this.speedMult;
        this.x += dx * finalSpeed * factor;
        this.y += dy * finalSpeed * factor;

        // Trava nas bordas
        this.x = Math.max(this.radius, Math.min(canvasW - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasH - this.radius, this.y));

        // Regen HP
        this.regenTimer += dt;
        if (this.regenTimer >= 3000) {
            if (this.hp < this.maxHp) {
                this.hp = Math.min(this.maxHp, this.hp + 1)
            }
            this.regenTimer = 0;
        }
    }

    takeDamage(amount) {
        if (this.iframe > 0) return false;

        this.hp = Math.max(0, this.hp - amount);
        this.iframe = 600; // 600ms de imunidade

        audio.playHurt();
        return true;
    }

    gainXp(amount) {
        this.xp += amount;
        audio.playGem();

        let leveledUp = false;
        while (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level++;
            // Aumento progressivo da XP necessária por nível
            this.xpToNextLevel = Math.round(this.xpToNextLevel * 1.35) + 5;
            this.pendingLevelUps++;
            leveledUp = true;
        }

        if (leveledUp) {
            audio.playLevelUp();
            return true; // Subiu de nível
        }
        return false;
    }

    draw(ctx) {
        ctx.save();

        // Sombra sob os pés (efeito de profundidade premium)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius - 2, this.radius * 0.9, this.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Piscar vermelho se estiver imune
        if (this.iframe > 0 && Math.floor(this.iframe / 80) % 2 === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ef4444';
        } else {
            // Aura sutil de névoa escura/roxa sob o jogador
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(168, 85, 247, 0.45)';
        }

        const angle = this.facing === 'left' ? Math.PI : 0;

        // --- DESENHAR CAPA VAMPÍRICA ---
        ctx.fillStyle = '#7f1d1d'; // Vermelho capa interna
        ctx.beginPath();
        const capeWobble = this.moving ? Math.sin(this.animationTimer * 1.5) * 4 : 0;

        if (this.facing === 'right') {
            ctx.moveTo(this.x - 5, this.y - 4);
            ctx.quadraticCurveTo(this.x - 22, this.y + capeWobble, this.x - 18, this.y + 16 + capeWobble);
            ctx.lineTo(this.x, this.y + 10);
        } else {
            ctx.moveTo(this.x + 5, this.y - 4);
            ctx.quadraticCurveTo(this.x + 22, this.y + capeWobble, this.x + 18, this.y + 16 + capeWobble);
            ctx.lineTo(this.x, this.y + 10);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0f0516'; // Preto capa externa
        ctx.beginPath();
        if (this.facing === 'right') {
            ctx.moveTo(this.x - 5, this.y - 4);
            ctx.quadraticCurveTo(this.x - 25, this.y + capeWobble - 2, this.x - 12, this.y + 18 + capeWobble);
            ctx.lineTo(this.x - 2, this.y + 8);
        } else {
            ctx.moveTo(this.x + 5, this.y - 4);
            ctx.quadraticCurveTo(this.x + 25, this.y + capeWobble - 2, this.x + 12, this.y + 18 + capeWobble);
            ctx.lineTo(this.x + 2, this.y + 8);
        }
        ctx.closePath();
        ctx.fill();

        // --- CORPO DO VAMPIRO (Túnica preta e gola) ---
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1b4b'; // Azul escuro / Roxo
        ctx.fill();

        // Gola Vermelha da capa
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(this.x - 6, this.y - 6);
        ctx.lineTo(this.x, this.y + 1);
        ctx.lineTo(this.x + 6, this.y - 6);
        ctx.lineTo(this.x, this.y - 2);
        ctx.closePath();
        ctx.fill();

        // Amuleto de Ouro com Gema de Sangue no centro do peito
        ctx.fillStyle = '#eab308'; // Ouro
        ctx.beginPath();
        ctx.arc(this.x, this.y + 1, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444'; // Rubi de sangue
        ctx.beginPath();
        ctx.arc(this.x, this.y + 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // --- CABEÇA (Pele pálida de vampiro) ---
        ctx.fillStyle = '#f1f5f9'; // Pele branca pálida
        ctx.beginPath();
        ctx.arc(this.x, this.y - 5, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Cabelo Drácula Preto
        ctx.fillStyle = '#090514';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 8, this.radius * 0.68, Math.PI, Math.PI * 2);
        ctx.fill();

        // Picos de cabelo gótico nas laterais
        ctx.beginPath();
        if (this.facing === 'right') {
            ctx.moveTo(this.x - 6, this.y - 8);
            ctx.lineTo(this.x - 7, this.y - 3);
            ctx.lineTo(this.x - 3, this.y - 7);

            ctx.moveTo(this.x + 5, this.y - 8);
            ctx.lineTo(this.x + 4, this.y - 5);
            ctx.lineTo(this.x + 2, this.y - 7);
        } else {
            ctx.moveTo(this.x - 5, this.y - 8);
            ctx.lineTo(this.x - 4, this.y - 5);
            ctx.lineTo(this.x - 2, this.y - 7);

            ctx.moveTo(this.x + 6, this.y - 8);
            ctx.lineTo(this.x + 7, this.y - 3);
            ctx.lineTo(this.x + 3, this.y - 7);
        }
        ctx.closePath();
        ctx.fill();

        // --- OLHOS GLOWING RED ---
        ctx.fillStyle = '#ff1e1e';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        if (this.facing === 'right') {
            ctx.arc(this.x + 2, this.y - 6, 2, 0, Math.PI * 2);
            ctx.arc(this.x + 7, this.y - 6, 2, 0, Math.PI * 2);
        } else {
            ctx.arc(this.x - 7, this.y - 6, 2, 0, Math.PI * 2);
            ctx.arc(this.x - 2, this.y - 6, 2, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.shadowBlur = 0; // Desliga shadow para presas

        // Presas Vampíricas (Fangs) brancas sob a boca
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (this.facing === 'right') {
            // Presa 1
            ctx.moveTo(this.x + 3, this.y - 2);
            ctx.lineTo(this.x + 4, this.y + 1);
            ctx.lineTo(this.x + 5, this.y - 2);
            // Presa 2
            ctx.moveTo(this.x + 6, this.y - 2);
            ctx.lineTo(this.x + 7, this.y + 1);
            ctx.lineTo(this.x + 8, this.y - 2);
        } else {
            // Presa 1
            ctx.moveTo(this.x - 8, this.y - 2);
            ctx.lineTo(this.x - 7, this.y + 1);
            ctx.lineTo(this.x - 6, this.y - 2);
            // Presa 2
            ctx.moveTo(this.x - 5, this.y - 2);
            ctx.lineTo(this.x - 4, this.y + 1);
            ctx.lineTo(this.x - 3, this.y - 2);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// --- CLASSE WEAPON & DEFINIÇÃO DE ARMAS ---
export class Weapon {
    constructor(id, name, emoji, baseCooldown, level1Desc) {
        this.id = id;
        this.name = name;
        this.emoji = emoji;
        this.level = 0; // 0 significa bloqueada
        this.maxLevel = 5;
        this.baseCooldown = baseCooldown;
        this.lastAttack = 0;
        this.levelUpDesc = [
            level1Desc // Nível 1
        ];
    }

    getCooldown(player) {
        return this.baseCooldown * (1 - player.cooldownRed);
    }

    // Retorna se pode atacar
    canAttack(now, player) {
        return this.level > 0 && (now - this.lastAttack >= this.getCooldown(player));
    }

    // Executa o ataque e retorna matriz de novos projéteis
    attack(now, player, enemies) {
        this.lastAttack = now;
        return []; // Sobrescrito pelas armas filhas
    }
}

// 1. CHICOTE DE SANGUE (Ataca horizontalmente em frente ao vampiro)
export class BloodWhip extends Weapon {
    constructor() {
        super('whip', 'Chicote de Sangue', '🩸', 1200, 'Corta os inimigos na horizontal.');
        this.levelUpDesc = [
            'Espada de sangue que corta na direção que o jogador está virado.',
            'Aumenta o dano em 25%.',
            'Corta em ambas as direções simultaneamente.',
            'Aumenta a área do corte em 30%.',
            'Adiciona roubo de vida (cura +2 HP a cada acerto crítico).'
        ];
    }

    attack(now, player, enemies) {
        this.lastAttack = now;
        audio.playWhip();

        const damage = Math.round(15 * player.damageMult * (1 + (this.level >= 2 ? 0.25 : 0)));
        const area = 90 * player.areaMult * (this.level >= 4 ? 1.3 : 1.0);
        const height = 24 * player.areaMult;

        const attacks = [];

        // Ataque na frente
        const dir = player.facing === 'right' ? 1 : -1;
        attacks.push({
            x: player.x + (dir * area / 2),
            y: player.y,
            w: area,
            h: height,
            damage: damage,
            dir: dir,
            critical: this.level >= 5 && Math.random() < 0.2
        });

        // Nível 3 corta nas duas direções
        if (this.level >= 3) {
            attacks.push({
                x: player.x - (dir * area / 2),
                y: player.y,
                w: area,
                h: height,
                damage: damage,
                dir: -dir,
                critical: this.level >= 5 && Math.random() < 0.2
            });
        }

        return { type: 'whip', list: attacks };
    }
}

// 2. BOLAS DE FOGO SOMBRIAS (Projéteis rápidos teleguiados)
export class ShadowFireball extends Weapon {
    constructor() {
        super('fireball', 'Bola de Fogo Sombria', '🔥', 1500, 'Conjura projéteis de fogo sombrio no inimigo mais próximo.');
        this.levelUpDesc = [
            'Conjura 1 projétil mágico no inimigo mais próximo.',
            'Dispara +1 projétil adicional.',
            'Aumenta o dano das chamas em 30%.',
            'Dispara +1 projétil (totalizando 3).',
            'Os projéteis ganham perfuração (+1 inimigo atravessado).'
        ];
    }

    attack(now, player, enemies) {
        this.lastAttack = now;
        if (enemies.length === 0) return { type: 'projectile', list: [] };

        audio.playFireball();

        const count = 1 + (this.level >= 2 ? 1 : 0) + (this.level >= 4 ? 1 : 0);
        const damage = Math.round(18 * player.damageMult * (this.level >= 3 ? 1.3 : 1.0));
        const pierce = this.level >= 5 ? 2 : 1;
        const list = [];

        // Encontra os inimigos mais próximos
        const sortedEnemies = [...enemies].sort((a, b) => {
            return Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y);
        });

        for (let i = 0; i < count; i++) {
            // Se houver menos inimigos que a quantidade de tiros, ataca o mais próximo novamente com leve dispersão
            const target = sortedEnemies[i % sortedEnemies.length];
            if (!target) break;

            const angle = Math.atan2(target.y - player.y, target.x - player.x) + (i * 0.15 - (count - 1) * 0.075);
            const speed = 5.5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            list.push(new Projectile(
                player.x, player.y,
                vx, vy,
                5.5 * player.areaMult,
                '#f43f5e', // Vermelho/rosa neon fogo
                damage,
                pierce
            ));
        }

        return { type: 'projectile', list };
    }
}

// 3. AURA DE ALHO (Círculo de dano contínuo ao redor do jogador)
export class GarlicAura extends Weapon {
    constructor() {
        super('garlic', 'Névoa Vampírica', '🧄', 300, 'Aura ao redor que causa dano contínuo.');
        this.levelUpDesc = [
            'Uma nuvem tóxica de névoa escura que causa dano constante a monstros próximos.',
            'Aumenta o raio do escudo em 20%.',
            'Aumenta o dano contínuo em 30%.',
            'Repele levemente inimigos fracos (efeito knockback).',
            'Duplica a velocidade dos tiques de dano da aura.'
        ];
    }

    getCooldown(player) {
        // Reduz o cooldown do tique no nível 5
        const cd = this.level >= 5 ? this.baseCooldown / 2 : this.baseCooldown;
        return cd * (1 - player.cooldownRed);
    }

    attack(now, player, enemies) {
        this.lastAttack = now;

        const radius = 55 * player.areaMult * (this.level >= 2 ? 1.25 : 1.0);
        const damage = Math.round(3 * player.damageMult * (this.level >= 3 ? 1.35 : 1.0));

        // A aura ataca instantaneamente todos os inimigos no raio
        const list = [];
        enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist < radius + enemy.radius) {
                list.push({
                    enemy,
                    damage,
                    knockback: this.level >= 4
                });
            }
        });

        return { type: 'aura', list, radius, damage };
    }
}

// 4. FOICES ORBITANTES (Foices afiadas que giram cortando tudo ao redor)
export class OrbitScythe extends Weapon {
    constructor() {
        super('scythe', 'Foice da Morte', '🪓', 4000, 'Foices que orbitam ao seu redor fatiando os inimigos.');
        this.levelUpDesc = [
            'Conjura 1 foice que orbita ao redor do jogador por 3 segundos.',
            'Aumenta a velocidade de rotação da foice.',
            'Adiciona +1 foice orbitante (totalizando 2 em lados opostos).',
            'Aumenta a duração e o dano em 25%.',
            'Aumenta o tamanho da foice em 40% e rasga armaduras.'
        ];
    }

    attack(now, player, enemies) {
        this.lastAttack = now;

        const count = this.level >= 3 ? 2 : 1;
        const damage = Math.round(22 * player.damageMult * (this.level >= 4 ? 1.25 : 1.0));
        const duration = this.level >= 4 ? 4000 : 3000;
        const speed = this.level >= 2 ? 0.075 : 0.045; // Velocidade angular
        const radius = 10 * player.areaMult * (this.level >= 5 ? 1.4 : 1.0);
        const orbitDistance = 70 * player.areaMult;

        const scythes = [];
        for (let i = 0; i < count; i++) {
            const startAngle = (Math.PI * 2 / count) * i;
            scythes.push({
                damage,
                duration,
                speed,
                radius,
                orbitDistance,
                angle: startAngle,
                spawnTime: now
            });
        }

        return { type: 'scythe', list: scythes };
    }
}

// --- ITENS PASSIVOS ---
// Os itens passivos não atacam diretamente, mas modificam os status do jogador quando escolhidos.
export class PassiveItem {
    constructor(id, name, emoji, level1Desc) {
        this.id = id;
        this.name = name;
        this.emoji = emoji;
        this.level = 0;
        this.maxLevel = 5;
        this.levelUpDesc = [level1Desc];
    }

    applyEffect(player) {
        // Sobrescrito nas subclasses
    }
}

// 1. ESPELHO DE SANGUE (Aumenta o Dano Geral)
export class BloodMirror extends PassiveItem {
    constructor() {
        super('mirror', 'Espelho de Sangue', '🔮', 'Aumenta todo o dano causado em 12%.');
        this.levelUpDesc = [
            'Aumenta todo o dano causado em 12%.',
            'Aumenta o dano causado em 24%.',
            'Aumenta o dano causado em 36%.',
            'Aumenta o dano causado em 48%.',
            'Aumenta o dano causado em 65%.'
        ];
    }

    applyEffect(player) {
        const multipliers = [1.0, 1.12, 1.24, 1.36, 1.48, 1.65];
        player.damageMult = multipliers[this.level];
    }
}

// 2. BOTAS DE MORCEGO (Aumenta Velocidade de Movimento)
export class BatBoots extends PassiveItem {
    constructor() {
        super('boots', 'Asas de Morcego', '🥾', 'Aumenta a velocidade de movimento em 10%.');
        this.levelUpDesc = [
            'Aumenta a velocidade de movimento em 10%.',
            'Aumenta a velocidade de movimento em 20%.',
            'Aumenta a velocidade de movimento em 30%.',
            'Aumenta a velocidade de movimento em 40%.',
            'Aumenta a velocidade de movimento em 55%.'
        ];
    }

    applyEffect(player) {
        const multipliers = [1.0, 1.10, 1.20, 1.30, 1.40, 1.55];
        player.speedMult = multipliers[this.level];
    }
}

// 3. ÍMÃ DE ATRAÇÃO (Aumenta o alcance magnético para pegar XP)
export class Magnet extends PassiveItem {
    constructor() {
        super('magnet', 'Ímã de Sangue', '🧲', 'Aumenta a área de coleta de XP em 30%.');
        this.levelUpDesc = [
            'Aumenta a área de coleta de gemas de XP em 30%.',
            'Aumenta a área de coleta de gemas de XP em 60%.',
            'Aumenta a área de coleta de gemas de XP em 90%.',
            'Aumenta a área de coleta de gemas de XP em 120%.',
            'Aumenta a área de coleta de gemas de XP em 160%.'
        ];
    }

    applyEffect(player) {
        const ranges = [80, 104, 128, 152, 176, 208];
        player.magnetSize = ranges[this.level];
    }
}
