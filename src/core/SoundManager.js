export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
        this.initialized = false;
        this.sounds = {};
        this.ambientSource = null;
        this.ambientGain = null;
        this.menuMusicSource = null;
        this.menuMusicGain = null;
        this.footstepInterval = null;
        this.lastFootstepTime = 0;
    }

    async init() {
        if (this.initialized) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;

        await this.loadSound('coin', '/assets/sounds/coin.wav');
        await this.loadSound('obstacle', '/assets/sounds/hit.mp3');
        await this.loadSound('river', '/assets/sounds/river.mp3');
        await this.loadSound('footstep', '/assets/sounds/footstep.mp3');
        await this.loadSound('ambientSpring', '/assets/sounds/ambient_spring.mp3');
        await this.loadSound('ambientSummer', '/assets/sounds/ambient_summer.wav');
        await this.loadSound('ambientAutumn', '/assets/sounds/ambient_autumn.wav');
        await this.loadSound('ambientWinter', '/assets/sounds/ambient_winter.wav');
        await this.loadSound('menuMusic', '/assets/sounds/background_game.wav');

        // Phát nhạc nền menu ngay khi init
        this.startMenuMusic();
    }

    startMenuMusic() {
        this.stopAmbient();
        this.stopMenuMusic();

        const result = this.playSound('menuMusic', 0.5, true);
        if (result) {
            this.menuMusicSource = result.source;
            this.menuMusicGain = result.gainNode;
        }
    }

    stopMenuMusic() {
        if (this.menuMusicSource) {
            try {
                this.menuMusicSource.stop();
            } catch (e) {}
            this.menuMusicSource = null;
            this.menuMusicGain = null;
        }
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
            console.log(`Loaded sound: ${name}`);
        } catch (error) {
            console.warn(`Could not load sound: ${name} from ${url}`, error);
        }
    }

    async ensureContext() {
        if (!this.audioContext) {
            await this.init();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    playSound(name, volume = 1.0, loop = false) {
        if (this.isMuted || !this.sounds[name]) return null;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = this.sounds[name];
        source.loop = loop;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        source.start(0);

        return { source, gainNode };
    }

    playCoinSound() {
        this.playSound('coin', 0.7);
    }

    playObstacleSound() {
        this.playSound('obstacle', 0.8);
    }

    playRiverSound() {
        this.playSound('river', 0.9);
    }

    playFootstepSound() {
        this.playSound('footstep', 0.3);
    }

    startAmbientForSeason(seasonIndex) {
        this.stopAmbient();

        let soundName;
        switch (seasonIndex) {
            case 0: soundName = 'ambientSpring'; break;
            case 1: soundName = 'ambientSummer'; break;
            case 2: soundName = 'ambientAutumn'; break;
            case 3: soundName = 'ambientWinter'; break;
            default: soundName = 'ambientSpring';
        }

        const result = this.playSound(soundName, 0.4, true);
        if (result) {
            this.ambientSource = result.source;
            this.ambientGain = result.gainNode;
        }
    }

    stopAmbient() {
        if (this.ambientSource) {
            try {
                this.ambientSource.stop();
            } catch (e) {}
            this.ambientSource = null;
            this.ambientGain = null;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ambientGain) {
            this.ambientGain.gain.setValueAtTime(
                this.isMuted ? 0 : 0.4,
                this.audioContext.currentTime
            );
        }
        return this.isMuted;
    }
}
