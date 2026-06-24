// Gerenciador de Áudio com Síntese em Tempo Real (Web Audio API)
class AudioSynthManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicInterval = null;
        this.step = 0;
        this.bpm = 110;
        
        // Frequências das notas musicais para o sintetizador de fundo
        this.notes = {
            'A2': 110.00, 'C3': 130.81, 'D2': 73.42, 'D3': 146.83,
            'E2': 82.41, 'E3': 164.81, 'F2': 87.31, 'F3': 174.61, 'G2': 98.00,
            'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66,
            'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
            'C5': 523.25, 'E5': 659.25, 'G5': 783.99, 'A5': 880.00
        };

        // Linha de baixo (Bass) gótica progressiva
        this.bassSequence = [
            'A2', 'A2', 'E2', 'A2',
            'F2', 'F2', 'C3', 'F2',
            'D2', 'D2', 'A2', 'D3',
            'E2', 'E2', 'B3', 'E3'
        ];

        // Melodia melancólica de vampiro
        this.melodySequence = [
            'A3', null, 'C4', 'E4',
            'F3', null, 'A3', 'C4',
            'D3', null, 'F3', 'A3',
            'E3', 'G3', 'B3', 'E4'
        ];
    }

    init() {
        if (this.ctx) return;
        // Inicializa o contexto de áudio após interação do usuário
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
    }

    // Toca um oscilador básico com envelope de volume
    playTone(freq, type, duration, startVol, endVol, filterFreq = 0) {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gainNode.gain.setValueAtTime(startVol, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);

        let lastNode = gainNode;

        // Adiciona filtro se especificado (útil para sons de impacto/abafados)
        if (filterFreq > 0) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
            gainNode.connect(filter);
            lastNode = filter;
        }

        lastNode.connect(this.ctx.destination);
        osc.connect(gainNode);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Toca som de ruído branco (percussão / vento / chicotada / fogo)
    playNoise(duration, startVol, endVol, filterType = 'bandpass', filterFreq = 1000) {
        if (!this.ctx || this.muted) return;
        
        // Cria buffer de ruído
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(startVol, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        noise.start();
        noise.stop(this.ctx.currentTime + duration);
    }

    // Som de Chicote / Ataque Básico
    playWhip() {
        this.init();
        // Frequência decrescente rápida + Ruído curto
        this.playNoise(0.12, 0.15, 0.001, 'bandpass', 1200);
        
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // Som de Bola de Fogo / Lançamento Mágico
    playFireball() {
        this.init();
        if (!this.ctx || this.muted) return;
        
        // Frequência ascendente rápida para simular conjuração
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        // Filtro passa-baixa para suavizar a serra
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    // Som de Impacto no Inimigo (Acerto)
    playHit() {
        this.init();
        // Ruído áspero curto
        this.playNoise(0.06, 0.25, 0.01, 'bandpass', 600);
    }

    // Som de Dano no Jogador (Vampiro ferido)
    playHurt() {
        this.init();
        // Som grave e áspero descendo, simulando rosnado de dor
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.25);
        
        gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    // Som ao coletar Gema de Experiência
    playGem() {
        this.init();
        if (!this.ctx || this.muted) return;

        // Som de cristal (Nota C5 rápida seguida de G5)
        const now = this.ctx.currentTime;
        
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(this.notes['C5'], now);
        gain1.gain.setValueAtTime(0.06, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start();
        osc1.stop(now + 0.08);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(this.notes['G5'], now + 0.04);
        gain2.gain.setValueAtTime(0.06, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.04);
        osc2.stop(now + 0.15);
    }

    // Som ao subir de nível (Level Up)
    playLevelUp() {
        this.init();
        if (!this.ctx || this.muted) return;

        // Arpejo triunfante ascendente rápido
        const arpeggio = ['A4', 'C5', 'E5', 'A5'];
        const now = this.ctx.currentTime;
        
        arpeggio.forEach((note, index) => {
            const time = now + index * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(this.notes[note], time);
            
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time);
            osc.stop(time + 0.25);
        });
    }

    // Som de Morte do Vampiro
    playDeath() {
        this.init();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        // Som dramático descendo para o abismo
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 1.2);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 1.2);

        // Ruído de impacto abafado no final
        this.playNoise(1.0, 0.15, 0.001, 'lowpass', 150);
    }

    // Som do Ataque Especial (Onda de Impacto / Explosão de Sangue)
    playSpecial() {
        this.init();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        
        // 1. Rumble Grave sweep
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(now + 0.5);

        // 2. Ruído da Explosão de impacto de sangue
        this.playNoise(0.7, 0.4, 0.001, 'lowpass', 350);
    }

    // Som de Alerta / Spawn de Chefe
    playBossSpawn() {
        this.init();
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        // Som de buzina grave/bramido
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, now);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(83, now); // Desafinada para efeito de coros/terror

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(now + 1.0);
        osc2.stop(now + 1.0);
    }

    // Inicia a música tema de fundo gótica
    startMusic() {
        this.init();
        if (this.musicInterval) return;

        const intervalTime = (60 / this.bpm) * 1000 / 2; // Oitavas de tempo (eighth notes)
        
        this.musicInterval = setInterval(() => {
            if (this.muted || !this.ctx || this.ctx.state === 'suspended') return;

            const now = this.ctx.currentTime;
            
            // 1. Linha de Baixo (Toca em todos os passos ímpares ou pares de forma pulsante)
            const bassNote = this.bassSequence[this.step % this.bassSequence.length];
            if (bassNote && this.step % 2 === 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle';
                const freq = this.notes[bassNote] || 110.00;
                osc.frequency.setValueAtTime(freq, now);
                
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                
                // Filtro passa baixa para deixar o baixo encorpado e gótico
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(250, now);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start();
                osc.stop(now + 0.4);
            }

            // 2. Linha de Melodia (Toca a cada 4 passos de forma espaçada e melancólica)
            if (this.step % 4 === 0) {
                const melodyNote = this.melodySequence[(this.step / 4) % this.melodySequence.length];
                if (melodyNote) {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.type = 'sawtooth';
                    const freq = this.notes[melodyNote] || 220.00;
                    osc.frequency.setValueAtTime(freq, now);
                    
                    gain.gain.setValueAtTime(0.04, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                    
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(700, now);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);
                    
                    osc.start();
                    osc.stop(now + 0.8);
                }
            }

            // 3. Chimbal Retrô Sintetizado (Ruído de bateria muito suave)
            if (this.step % 4 === 2) {
                this.playNoise(0.04, 0.015, 0.001, 'bandpass', 6000);
            }

            this.step++;
        }, intervalTime);
    }

    // Pausa a música
    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}

// Exporta uma única instância global do gerenciador de áudio
export const audio = new AudioSynthManager();
