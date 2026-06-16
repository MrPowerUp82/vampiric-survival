# Guia de Desenvolvimento e Modificação (Vampire's Survival)

Este documento descreve como o jogo está estruturado e serve como um guia passo a passo para fazer alterações, criar novas mecânicas, adicionar monstros e desenvolver novos poderes.

---

## 🛠️ Estrutura do Código

O projeto é construído em cima de tecnologias web nativas sem compiladores ou dependências pesadas:
1. [index.html](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/index.html): Define o layout básico, HUD, menus e o canvas principal.
2. [style.css](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/style.css): Controla o visual do HUD, menus, fontes customizadas (Outfit e Cinzel), responsividade e controles mobile.
3. [audio.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/audio.js): Gerencia a trilha sonora e os efeitos sonoros gerados por síntese de Web Audio API (sem arquivos de áudio externos!).
4. [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js): Contém as classes que definem as entidades do jogo (`Player`, `Enemy`, `Gem`, `Particle`, `DamageText`, `Projectile`, além de `Weapon` e `PassiveItem`).
5. [game.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/game.js): Contém o loop principal (`gameLoop`), controle do estado de jogo (`playing`, `upgrade`, etc.), física, tratamento de colisões e integração de controles de teclado/mobile.

---

## ⚙️ 1. Alterar Mecânicas Existentes

### Ajustar Atributos do Vampiro (Player)
No arquivo [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js), localize o construtor da classe `Player`:
```javascript
constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = 2.4; // Ajuste a velocidade de movimento base
    
    // Status do Vampiro
    this.maxHp = 100; // Ajuste a vida máxima base
    this.hp = 100;    // Vida inicial
    // ...
```
Para alterar o escalonamento de experiência (XP) necessário para subir de nível, modifique a lógica do método `gainXp(amount)` na mesma classe:
```javascript
this.xpToNextLevel = Math.round(this.xpToNextLevel * 1.35) + 5; // Modifique 1.35 para ajustar a curva
```

### Alterar a Dificuldade ou Spawn de Inimigos
No arquivo [game.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/game.js), no método `updateGame(dt)`:
- **Spawn Cooldown:** Controla o intervalo em milissegundos com que os monstros normais surgem:
  ```javascript
  spawnCooldown = Math.max(300, 1500 - (elapsedSecs * 6)); // Reduz o tempo mínimo para 300ms gradativamente
  ```
- **Dificuldade dos Inimigos:** O multiplicador que escalona a vida e o dano com o passar do tempo:
  ```javascript
  const difficultyMult = 1.0 + (elapsedSecs / 120); // Aumenta 50% de força a cada 2 minutos (120s)
  ```

---

## 🧠 2. Adicionar Novas Mecânicas

### Exemplo: Adicionar Regeneração Passiva de Vida ao Jogador
Caso queira que o jogador recupere `1 HP` a cada segundo de forma automática:

1. Adicione uma variável de controle no construtor da classe `Player` em [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js):
   ```javascript
   this.regenTimer = 0;
   ```
2. No método `update` da classe `Player` em [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js), insira a lógica de tempo e regeneração:
   ```javascript
   this.regenTimer += dt;
   if (this.regenTimer >= 1000) { // a cada 1 segundo (1000ms)
       if (this.hp < this.maxHp) {
           this.hp = Math.min(this.maxHp, this.hp + 1); // cura 1 hp
       }
       this.regenTimer = 0;
   }
   ```

---

## 👾 3. Adicionar Novos Monstros

Para criar um novo tipo de monstro, por exemplo, um **Lobisomem (Werewolf)** que é rápido e tem vida moderada:

### Passo 1: Configurar os Atributos em [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js)
No construtor da classe `Enemy`, adicione um novo `case` para `'werewolf'`:
```javascript
case 'werewolf':
    this.radius = 13;
    this.speed = 2.1; // Mais rápido que o morcego
    this.hp = Math.round(45 * difficultyMult);
    this.maxHp = this.hp;
    this.damage = 15;
    this.xpValue = 3;
    this.color = '#78350f'; // Marrom
    break;
```

### Passo 2: Definir o Desenho em [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js)
No método `draw(ctx)` da classe `Enemy`, adicione a lógica de desenho para a aparência do seu monstro utilizando o Canvas 2D:
```javascript
} else if (this.type === 'werewolf') {
    // Desenha corpo/pelagem do lobisomem
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Olhos amarelos brilhantes
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(this.x - 4, this.y - 2, 2.5, 0, Math.PI * 2);
    ctx.arc(this.x + 4, this.y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
}
```

### Passo 3: Registrar no Spawner em [game.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/game.js)
No método `spawnEnemy()` em [game.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/game.js), adicione o lobisomem na distribuição com base no tempo de jogo:
```javascript
if (elapsedSecs > 60) { // Começa a surgir após 1 minuto
    const rand = Math.random();
    if (rand < 0.2) type = 'werewolf';
}
```

---

## ⚡ 4. Adicionar Novos Poderes

O jogo possui dois tipos de poderes de subida de nível: **Weapon** (Armas/Poderes Ativos) e **PassiveItem** (Melhorias Passivas).

### A. Adicionar uma Nova Arma Ativa: "Tempestade de Raios" (LightningStorm)
Esta arma atinge inimigos aleatórios com raios vindos do céu em intervalos regulares.

#### Passo 1: Criar a classe em [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js)
No final do arquivo [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js), crie a classe herdando de `Weapon`:
```javascript
export class LightningStorm extends Weapon {
    constructor() {
        super('lightning', 'Tempestade de Raios', '⚡', 2200, 'Atinge inimigos aleatórios com raios do céu.');
        this.levelUpDesc = [
            'Conjura 1 raio em um inimigo aleatório.',
            'Aumenta o dano do raio em 40%.',
            'Conjura +1 raio (totalizando 2).',
            'Aumenta a área de impacto do raio.',
            'Conjura +2 raios adicionais (totalizando 4).'
        ];
    }

    attack(now, player, enemies) {
        this.lastAttack = now;
        if (enemies.length === 0) return { type: 'projectile', list: [] };

        audio.playHit(); // Ou crie um efeito em audio.js

        const count = 1 + (this.level >= 3 ? 1 : 0) + (this.level >= 5 ? 2 : 0);
        const damage = Math.round(30 * player.damageMult * (this.level >= 2 ? 1.4 : 1.0));
        const radius = 25 * player.areaMult * (this.level >= 4 ? 1.5 : 1.0);
        const list = [];

        // Escolhe inimigos aleatórios
        for (let i = 0; i < count; i++) {
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            if (!target) break;

            // Cria um projétil estático de curta duração (simulando um raio)
            list.push(new Projectile(
                target.x, target.y,
                0, 0, // velocidade zero para ficar fixo
                radius,
                '#facc15', // Cor amarela neon
                damage,
                99, // Alta perfuração para acertar quem estiver na área
                150 // Duração do raio na tela (150ms)
            ));
        }

        return { type: 'projectile', list };
    }
}
```

#### Passo 2: Registrar no Arquivo [game.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/game.js)
1. Importe a nova classe no início de `game.js`:
   ```javascript
   import { 
       Player, Enemy, Gem, Particle, DamageText, 
       Weapon, PassiveItem,
       BloodWhip, ShadowFireball, GarlicAura, OrbitScythe,
       BloodMirror, BatBoots, Magnet,
       LightningStorm // <-- Importado aqui
   } from './entities.js';
   ```
2. Adicione uma nova instância ao `upgradePool` dentro de `initGame()`:
   ```javascript
   upgradePool = [
       new BloodWhip(),
       new ShadowFireball(),
       new GarlicAura(),
       new OrbitScythe(),
       new LightningStorm(), // <-- Adicionado ao pool de upgrades
       new BloodMirror(),
       new BatBoots(),
       new Magnet()
   ];
   ```

---

### B. Adicionar um Novo Item Passivo: "Coração de Sangue" (BloodHeart)
Este item aumenta a vida máxima do jogador proporcionalmente.

#### Passo 1: Criar a classe em [entities.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/entities.js)
Crie a classe herdando de `PassiveItem`:
```javascript
export class BloodHeart extends PassiveItem {
    constructor() {
        super('heart', 'Coração de Sangue', '❤️', 'Aumenta a vida máxima em 20%.');
        this.levelUpDesc = [
            'Aumenta a vida máxima em 20%.',
            'Aumenta a vida máxima em 40%.',
            'Aumenta a vida máxima em 60%.',
            'Aumenta a vida máxima em 80%.',
            'Aumenta a vida máxima em 100%.'
        ];
    }

    applyEffect(player) {
        const baseMax = 100;
        const multipliers = [1.0, 1.20, 1.40, 1.60, 1.80, 2.00];
        
        const oldMax = player.maxHp;
        player.maxHp = baseMax * multipliers[this.level];
        
        // Cura o jogador pela quantidade que a vida máxima aumentou
        if (player.maxHp > oldMax) {
            player.hp += (player.maxHp - oldMax);
        }
    }
}
```

#### Passo 2: Registrar no Arquivo [game.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/game.js)
1. Importe `BloodHeart` no topo de [game.js](file:///c:/Users/webpa/OneDrive/Documentos/projetos/game/game.js).
2. Instancie-o na lista `upgradePool` do método `initGame()`.

---

## 🎨 Dicas de Renderização Premium no Canvas
Para desenhar elementos refinados ou fazer novos efeitos visuais:
- **Sombras e Brilho Neon:**
  ```javascript
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ef4444'; // Cor do brilho
  // ... desenha elemento ...
  ctx.restore(); // Restaura para não aplicar sombra no restante dos elementos
  ```
- **Gradientes Radiais:**
  ```javascript
  const grad = ctx.createRadialGradient(x, y, 0, x, y, raio);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = grad;
  ```
