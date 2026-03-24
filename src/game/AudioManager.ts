import { AudioConfig } from './types';

type SoundName = 
  | 'shoot'
  | 'explosion'
  | 'hit'
  | 'powerup'
  | 'shield_hit'
  | 'engine'
  | 'boost'
  | 'warning'
  | 'game_over'
  | 'score';

interface SoundDef {
  frequency?: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  decay?: number;
  attack?: number;
  frequencyEnd?: number;
  noise?: boolean;
}

const SOUND_DEFS: Record<SoundName, SoundDef> = {
  shoot: {
    frequency: 880,
    frequencyEnd: 440,
    duration: 0.08,
    type: 'square',
    volume: 0.15,
    decay: 0.08,
  },
  explosion: {
    duration: 0.4,
    type: 'sawtooth',
    volume: 0.3,
    noise: true,
    decay: 0.4,
  },
  hit: {
    frequency: 200,
    frequencyEnd: 80,
    duration: 0.15,
    type: 'square',
    volume: 0.25,
    decay: 0.15,
  },
  powerup: {
    frequency: 523,
    frequencyEnd: 1047,
    duration: 0.25,
    type: 'sine',
    volume: 0.2,
    attack: 0.02,
    decay: 0.2,
  },
  shield_hit: {
    frequency: 1200,
    frequencyEnd: 600,
    duration: 0.1,
    type: 'triangle',
    volume: 0.15,
    decay: 0.1,
  },
  engine: {
    frequency: 80,
    duration: 0.1,
    type: 'sawtooth',
    volume: 0.05,
  },
  boost: {
    frequency: 150,
    frequencyEnd: 300,
    duration: 0.3,
    type: 'sawtooth',
    volume: 0.2,
    attack: 0.05,
    decay: 0.25,
  },
  warning: {
    frequency: 440,
    duration: 0.15,
    type: 'square',
    volume: 0.15,
  },
  game_over: {
    frequency: 440,
    frequencyEnd: 110,
    duration: 1.0,
    type: 'sawtooth',
    volume: 0.25,
    decay: 1.0,
  },
  score: {
    frequency: 660,
    duration: 0.05,
    type: 'sine',
    volume: 0.1,
    decay: 0.05,
  },
};

export class AudioManager {
  private context: AudioContext | null = null;
  private config: AudioConfig = {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    enabled: true,
  };
  
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning = false;

  init() {
    if (this.context) return;
    
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.config.enabled = false;
    }
  }

  private ensureContext() {
    if (!this.context || !this.config.enabled) return false;
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return true;
  }

  play(name: SoundName) {
    if (!this.ensureContext() || !this.context) return;

    const def = SOUND_DEFS[name];
    const now = this.context.currentTime;
    const volume = def.volume * this.config.sfxVolume * this.config.masterVolume;

    if (def.noise) {
      this.playNoise(def, volume, now);
      return;
    }

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.type = def.type;
    oscillator.frequency.setValueAtTime(def.frequency || 440, now);
    
    if (def.frequencyEnd) {
      oscillator.frequency.exponentialRampToValueAtTime(
        def.frequencyEnd,
        now + def.duration
      );
    }

    gainNode.gain.setValueAtTime(0, now);
    
    if (def.attack) {
      gainNode.gain.linearRampToValueAtTime(volume, now + def.attack);
    } else {
      gainNode.gain.setValueAtTime(volume, now);
    }
    
    if (def.decay) {
      const decayStart = def.attack ? now + def.attack : now;
      gainNode.gain.exponentialRampToValueAtTime(0.001, decayStart + def.decay);
    }

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.start(now);
    oscillator.stop(now + def.duration + 0.1);
  }

  private playNoise(def: SoundDef, volume: number, now: number) {
    if (!this.context) return;

    const bufferSize = this.context.sampleRate * def.duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.context.createGain();
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + def.duration);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + def.duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);

    source.start(now);
  }

  startEngine() {
    if (!this.ensureContext() || !this.context || this.engineRunning) return;

    this.engineOscillator = this.context.createOscillator();
    this.engineGain = this.context.createGain();

    this.engineOscillator.type = 'sawtooth';
    this.engineOscillator.frequency.setValueAtTime(60, this.context.currentTime);

    const volume = 0.03 * this.config.sfxVolume * this.config.masterVolume;
    this.engineGain.gain.setValueAtTime(volume, this.context.currentTime);

    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.frequency.setValueAtTime(3, this.context.currentTime);
    lfoGain.gain.setValueAtTime(5, this.context.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.engineOscillator.frequency);
    lfo.start();

    this.engineOscillator.connect(this.engineGain);
    this.engineGain.connect(this.context.destination);
    this.engineOscillator.start();

    this.engineRunning = true;
  }

  stopEngine() {
    if (this.engineOscillator && this.engineGain && this.context) {
      this.engineGain.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + 0.1
      );
      setTimeout(() => {
        this.engineOscillator?.stop();
        this.engineOscillator = null;
        this.engineGain = null;
        this.engineRunning = false;
      }, 150);
    }
  }

  setEngineSpeed(speed: number) {
    if (this.engineOscillator && this.context) {
      const freq = 50 + speed * 3;
      this.engineOscillator.frequency.setTargetAtTime(
        freq,
        this.context.currentTime,
        0.1
      );
    }
  }

  setVolume(type: 'master' | 'sfx' | 'music', value: number) {
    const clamped = Math.max(0, Math.min(1, value));
    if (type === 'master') this.config.masterVolume = clamped;
    else if (type === 'sfx') this.config.sfxVolume = clamped;
    else if (type === 'music') this.config.musicVolume = clamped;
  }

  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopEngine();
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export const audioManager = new AudioManager();
