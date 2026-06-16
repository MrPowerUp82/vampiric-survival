# Vampire's Survival

Um jogo de sobrevivência em HTML5 Canvas onde você controla um vampiro e deve lutar contra infinitas hordas de monstros para sobreviver o máximo de tempo possível.

## 💻 Tecnologias Utilizadas
- HTML5 Canvas
- CSS3
- JavaScript (Vanilla)

## 🎮 Como Jogar

### No Computador (PC)
- **Movimentação:** Use as teclas `W`, `A`, `S`, `D` ou as setas do teclado.
- **Ataque Básico:** O personagem ataca automaticamente o inimigo mais próximo.
- **Ataque Especial:** Pressione a barra de espaço (`Space`) para desferir um ataque em área (360 graus) que causa dano e afasta os inimigos. Requer tempo de recarga (cooldown).

### No Celular (Mobile / Tablet)
- **Movimentação:** Use o joystick virtual no lado esquerdo da tela.
- **Ataque Básico:** Automático.
- **Ataque Especial:** Toque no botão de habilidade no lado direito da tela.

*(Nota: Os controles mobile aparecem automaticamente apenas em dispositivos com suporte a toque)*

## 🚀 Como Rodar Localmente

1. Clone o repositório ou baixe os arquivos do projeto.
2. Como o jogo é feito com tecnologias web nativas, você pode simplesmente dar um clique duplo no arquivo `index.html` para abri-lo no seu navegador.
3. **Recomendado:** Para uma melhor experiência de desenvolvimento, utilize um servidor web local.
   - Usando a extensão **Live Server** no VSCode.
   - Ou usando Python no terminal dentro da pasta do projeto:
     ```bash
     python -m http.server 8000
     ```
     E acessando `http://localhost:8000` no seu navegador.

## ✨ Funcionalidades
- Sistema de progressão de nível (Level Up)
- Sistema de status e upgrades ao subir de nível
- Ataque especial em área (Shockwave) com tempo de recarga visual no HUD
- Suporte responsivo nativo para PC e Mobile
- Detecção inteligente de dispositivo para exibição dos controles de toque
