import {
  GameState,
  GameConfig,
  DEFAULT_CONFIG,
  Spacecraft,
  Obstacle,
  PowerUp,
  Projectile,
  ObstacleType,
  PowerUpType,
  LANES,
  LANE_COUNT,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  GhostFrame,
  GhostRun,
} from './types';
import { inputManager } from './InputManager';
import { audioManager } from './AudioManager';
import { LevelConfig, LEVELS, getLevelByDistance, getLevelProgress, BOSSES } from './levels';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function createInitialPlayer(): Spacecraft {
  return {
    id: 'player',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    active: true,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 50,
    speed: 6,
    lane: Math.floor(LANE_COUNT / 2),
    targetX: 0,
    targetY: 0,
    invulnerableTimer: 0,
    boostTimer: 0,
    slowMotionTimer: 0,
  };
}

function createInitialState(): GameState {
  return {
    player: createInitialPlayer(),
    obstacles: [],
    powerUps: [],
    projectiles: [],
    particles: [],
    explosions: [],
    
    score: 0,
    distance: 0,
    multiplier: 1,
    multiplierTimer: 0,
    
    gameSpeed: 6,
    baseSpeed: 6,
    difficulty: 1,
    
    frameCount: 0,
    spawnTimer: 0,
    powerUpSpawnTimer: 0,
    
    isPaused: false,
    isGameOver: false,
    
    // Level system
    currentLevel: 1,
    levelProgress: 0,
    levelTransition: false,
    levelTransitionTimer: 0,
    bossActive: false,
    boss: null,

    introActive: true,
    introFade: 1,
    introDialogueLine: null as string | null,
    introProgress: 0,
    
    activeEffects: {
      slowMotion: false,
      speedBoost: false,
      weaponUpgrade: false,
      scoreMultiplier: false,
      magnet: false,
      laserBeam: false,
      ghostMode: false,
      homingMissiles: false,
      sizeReduction: false,
    },
    
    effectTimers: {
      magnet: 0,
      laserBeam: 0,
      ghostMode: 0,
      homingMissiles: 0,
      sizeReduction: 0,
    },
  };
}

const INTRO_FADE_FRAMES = 90;
const INTRO_SHIP_FRAMES = 120;
const INTRO_LINE_FRAMES = 70;
const EARTH_INTRO_DIALOGUES = [
  'Simulation Link Established…',
  'Pilot, you are approaching Sector Earth-01.',
  'Atmospheric debris detected.',
  'Warning: hostile aerial objects incoming.',
  'Objective: survive and navigate through the danger zone.',
];

export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private shootCooldown = 0;
  private currentLevelConfig: LevelConfig = LEVELS[0];
  private introFrame = 0;
  
  // Ghost replay system
  private ghostFrames: GhostFrame[] = [];
  private ghostRun: GhostRun | null = null;
  private ghostFrameIndex = 0;
  private recordingInterval = 3; // Record every N frames
  
  private callbacks: {
    onScoreUpdate?: (score: number) => void;
    onHealthUpdate?: (health: number, shield: number) => void;
    onGameOver?: (score: number, distance: number, completedGame: boolean) => void;
    onPowerUp?: (type: PowerUpType) => void;
    onDistanceUpdate?: (distance: number) => void;
    onMultiplierUpdate?: (multiplier: number) => void;
    onSpeedUpdate?: (speed: number) => void;
    onLevelChange?: (level: number, levelConfig: LevelConfig) => void;
    onLevelProgress?: (progress: number) => void;
    onBossSpawn?: (bossName: string) => void;
    onBossDefeat?: (bossName: string, points: number) => void;
    onGhostUpdate?: (ghostPosition: { x: number; y: number; rotationZ: number } | null) => void;
  } = {};

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = createInitialState();
    this.loadGhostRun();
  }

  init() {
    inputManager.init();
    audioManager.init();
    
    inputManager.setSwipeCallbacks({
      onSwipeLeft: () => this.movePlayerLane(-1),
      onSwipeRight: () => this.movePlayerLane(1),
      onSwipeUp: () => this.movePlayerVertical(-1),
      onSwipeDown: () => this.movePlayerVertical(1),
      onTap: () => this.playerShoot(),
    });
  }

  destroy() {
    inputManager.destroy();
    audioManager.stopEngine();
  }

  reset() {
    this.state = createInitialState();
    this.shootCooldown = 0;
    this.ghostFrames = [];
    this.ghostFrameIndex = 0;
    this.currentLevelConfig = LEVELS[0];
    this.introFrame = 0;
    this.state.introActive = true;
    this.state.introFade = 1;
    this.state.introDialogueLine = null;
    this.state.introProgress = 0;
    this.state.player.position.x = -4;
    this.state.player.position.y = -1;
    this.state.player.position.z = 2;
    this.state.player.targetX = 0;
    this.state.player.targetY = 0;
    this.callbacks.onScoreUpdate?.(0);
    this.callbacks.onHealthUpdate?.(100, 0);
    this.callbacks.onDistanceUpdate?.(0);
    this.callbacks.onMultiplierUpdate?.(1);
    this.callbacks.onSpeedUpdate?.(this.state.gameSpeed);
  }

  private updateIntroSequence() {
    const shipStart = INTRO_FADE_FRAMES;
    const shipEnd = shipStart + INTRO_SHIP_FRAMES;
    const dialogueStart = shipEnd;
    const totalDialogueFrames = EARTH_INTRO_DIALOGUES.length * INTRO_LINE_FRAMES;
    const introEndFrame = dialogueStart + totalDialogueFrames;

    this.state.introFade = Math.max(0, 1 - Math.min(1, this.introFrame / INTRO_FADE_FRAMES));
    this.state.introProgress = Math.min(1, this.introFrame / introEndFrame);

    if (this.introFrame < shipStart) {
      this.state.player.position.x = -4;
      this.state.player.position.y = -1;
      this.state.player.position.z = 2;
      this.state.introDialogueLine = null;
    } else if (this.introFrame < shipEnd) {
      const t = (this.introFrame - shipStart) / INTRO_SHIP_FRAMES;
      const e = 1 - Math.pow(1 - t, 3);
      this.state.player.position.x = -4 + 4 * e;
      this.state.player.position.y = -1 + 1 * e;
      this.state.player.position.z = 2 - 2 * e;
      this.state.introDialogueLine = null;
    } else if (this.introFrame < introEndFrame) {
      this.state.player.position.x = 0;
      this.state.player.position.y = 0;
      this.state.player.position.z = 0;
      const d = this.introFrame - dialogueStart;
      const lineIdx = Math.min(EARTH_INTRO_DIALOGUES.length - 1, Math.floor(d / INTRO_LINE_FRAMES));
      this.state.introDialogueLine = EARTH_INTRO_DIALOGUES[lineIdx];
    } else {
      this.state.introActive = false;
      this.state.introFade = 0;
      this.state.introDialogueLine = null;
      this.state.introProgress = 1;
      this.state.player.position.x = 0;
      this.state.player.position.y = 0;
      this.state.player.position.z = 0;
      this.state.spawnTimer = 0;
      this.state.powerUpSpawnTimer = 0;
      return;
    }

    this.state.player.rotation.z = (this.state.player.targetX - this.state.player.position.x) * -0.12;
    this.state.player.rotation.x = Math.min(0.15, (1 - this.state.introProgress) * 0.22);
    this.introFrame++;
  }

  private loadGhostRun() {
    try {
      const saved = localStorage.getItem('spaceGame_ghostRun');
      if (saved) {
        this.ghostRun = JSON.parse(saved);
      }
    } catch {
      this.ghostRun = null;
    }
  }

  private saveGhostRun(completedGame: boolean) {
    const newRun: GhostRun = {
      frames: this.ghostFrames,
      finalDistance: this.state.distance,
      finalScore: this.state.score,
      completedGame,
      date: new Date().toISOString(),
    };

    // Save if better distance or first completed run
    if (!this.ghostRun || 
        this.state.distance > this.ghostRun.finalDistance ||
        (completedGame && !this.ghostRun.completedGame)) {
      this.ghostRun = newRun;
      localStorage.setItem('spaceGame_ghostRun', JSON.stringify(newRun));
    }
  }

  private recordGhostFrame() {
    if (this.state.frameCount % this.recordingInterval !== 0) return;
    
    this.ghostFrames.push({
      x: this.state.player.position.x,
      y: this.state.player.position.y,
      rotationZ: this.state.player.rotation.z,
      distance: this.state.distance,
    });
  }

  private updateGhostPlayback() {
    if (!this.ghostRun || this.ghostRun.frames.length === 0) {
      this.callbacks.onGhostUpdate?.(null);
      return;
    }

    // Find the ghost frame that matches current distance
    while (this.ghostFrameIndex < this.ghostRun.frames.length - 1 &&
           this.ghostRun.frames[this.ghostFrameIndex + 1].distance <= this.state.distance) {
      this.ghostFrameIndex++;
    }

    const frame = this.ghostRun.frames[this.ghostFrameIndex];
    if (frame && this.ghostFrameIndex < this.ghostRun.frames.length) {
      this.callbacks.onGhostUpdate?.({
        x: frame.x,
        y: frame.y,
        rotationZ: frame.rotationZ,
      });
    } else {
      this.callbacks.onGhostUpdate?.(null);
    }
  }

  getGhostRun(): GhostRun | null {
    return this.ghostRun;
  }

  clearGhostRun() {
    this.ghostRun = null;
    localStorage.removeItem('spaceGame_ghostRun');
  }

  setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = callbacks;
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  getCurrentLevelConfig(): LevelConfig {
    return this.currentLevelConfig;
  }

  private movePlayerLane(direction: number) {
    const newLane = Math.max(0, Math.min(LANE_COUNT - 1, this.state.player.lane + direction));
    this.state.player.lane = newLane;
    this.state.player.targetX = LANES[newLane];
  }

  private movePlayerVertical(direction: number) {
    this.state.player.targetY = Math.max(-2, Math.min(2, this.state.player.targetY + direction));
  }

  private playerShoot() {
    if (this.shootCooldown > 0) return;
    if (this.state.projectiles.length >= this.config.maxProjectiles) return;

    const { player, activeEffects } = this.state;
    
    const projectile: Projectile = {
      id: generateId(),
      position: { x: player.position.x, y: player.position.y, z: player.position.z - 2 },
      velocity: { x: 0, y: 0, z: -1.2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      active: true,
      damage: activeEffects.weaponUpgrade ? 2 : 1,
      isEnemy: false,
      lifetime: 120,
    };

    this.state.projectiles.push(projectile);
    
    if (activeEffects.weaponUpgrade) {
      const leftProjectile: Projectile = {
        ...projectile,
        id: generateId(),
        position: { ...projectile.position, x: player.position.x - 0.5 },
        velocity: { x: -0.1, y: 0, z: -1.2 },
      };
      const rightProjectile: Projectile = {
        ...projectile,
        id: generateId(),
        position: { ...projectile.position, x: player.position.x + 0.5 },
        velocity: { x: 0.1, y: 0, z: -1.2 },
      };
      this.state.projectiles.push(leftProjectile, rightProjectile);
    }

    this.shootCooldown = activeEffects.weaponUpgrade ? 6 : 10;
    audioManager.play('shoot');
  }

  private spawnObstacle() {
    if (this.state.obstacles.length >= this.config.maxObstacles) return;
    if (this.state.bossActive) return; // Don't spawn regular obstacles during boss fight

    const { difficulty } = this.state;
    const levelConfig = this.currentLevelConfig;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    
    // Use level-specific obstacle weights
    const typeRand = Math.random();
    let cumulativeWeight = 0;
    let type: ObstacleType = 'asteroid';
    
    for (const obstacleType of levelConfig.obstacleTypes) {
      cumulativeWeight += obstacleType.weight;
      if (typeRand < cumulativeWeight) {
        type = obstacleType.type;
        break;
      }
    }
    
    let health = 1;
    let damage = 20;
    let behavior: 'static' | 'chase' | 'patrol' | 'shoot' = 'static';

    // Apply level multipliers
    const healthMult = levelConfig.enemyHealthMultiplier;
    const damageMult = levelConfig.enemyDamageMultiplier;

    let vx = 0;
    let vy = 0;
    let vz = this.state.gameSpeed * 0.04 * levelConfig.enemySpeedMultiplier;
    let motionSeed: number | undefined;

    if (type === 'asteroid') {
      health = Math.ceil(2 * healthMult);
      damage = Math.ceil(30 * damageMult);
      vz = this.state.gameSpeed * 0.038 * levelConfig.enemySpeedMultiplier;
      vx = (Math.random() - 0.5) * 0.06;
      vy = (Math.random() - 0.5) * 0.04;
    } else if (type === 'debris') {
      health = Math.ceil(1 * healthMult);
      damage = Math.ceil(15 * damageMult);
    } else if (type === 'drone') {
      health = Math.ceil(1 * healthMult);
      damage = Math.ceil(25 * damageMult);
      behavior = Math.random() < 0.3 + difficulty * 0.1 ? 'shoot' : 'chase';
    } else if (type === 'mine') {
      health = Math.ceil(1 * healthMult);
      damage = Math.ceil(40 * damageMult);
    } else if (type === 'anomaly') {
      health = 999;
      damage = Math.ceil(50 * damageMult);
    } else if (type === 'bomb') {
      health = Math.ceil(1 * healthMult);
      damage = Math.ceil(38 * damageMult);
      vz = this.state.gameSpeed * 0.026 * levelConfig.enemySpeedMultiplier;
      vx = (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.06);
      vy = -0.02 - Math.random() * 0.04;
    } else if (type === 'bird') {
      health = Math.ceil(1 * healthMult);
      damage = Math.ceil(22 * damageMult);
      vz = this.state.gameSpeed * 0.052 * levelConfig.enemySpeedMultiplier;
      motionSeed = Math.random() * Math.PI * 2;
    } else if (type === 'crate') {
      health = Math.ceil(2 * healthMult);
      damage = Math.ceil(25 * damageMult);
      vz = this.state.gameSpeed * 0.032 * levelConfig.enemySpeedMultiplier;
      vx = (Math.random() - 0.5) * 0.03;
    }

    const scale =
      type === 'asteroid'
        ? 1.2 + Math.random() * 0.5
        : type === 'bomb'
          ? 1.05 + Math.random() * 0.15
          : type === 'bird'
            ? 0.75 + Math.random() * 0.15
            : type === 'crate'
              ? 1.0 + Math.random() * 0.4
              : 1;

    const rotSpeed =
      type === 'asteroid'
        ? {
            x: (Math.random() - 0.5) * 0.08,
            y: (Math.random() - 0.5) * 0.08,
            z: (Math.random() - 0.5) * 0.06,
          }
        : type === 'bomb'
          ? {
              x: (Math.random() - 0.5) * 0.03,
              y: (Math.random() - 0.5) * 0.03,
              z: (Math.random() - 0.5) * 0.02,
            }
          : type === 'bird'
            ? { x: 0, y: 0.12 + Math.random() * 0.08, z: 0 }
            : type === 'crate'
              ? {
                  x: (Math.random() - 0.5) * 0.02,
                  y: (Math.random() - 0.5) * 0.04,
                  z: (Math.random() - 0.5) * 0.02,
                }
              : {
                  x: (Math.random() - 0.5) * 0.05,
                  y: (Math.random() - 0.5) * 0.05,
                  z: (Math.random() - 0.5) * 0.03,
                };

    const obstacle: Obstacle = {
      id: generateId(),
      position: { 
        x: LANES[lane], 
        y: (Math.random() - 0.5) * PLAY_AREA_HEIGHT * 1.5, 
        z: -70 - Math.random() * 20 
      },
      velocity: { x: vx, y: vy, z: vz },
      rotation: { x: Math.random() * Math.PI, y: Math.random() * Math.PI, z: 0 },
      scale,
      active: true,
      type,
      health,
      damage,
      rotationSpeed: rotSpeed,
      hitFlash: 0,
      shootTimer: behavior === 'shoot' ? Math.floor(Math.random() * 60) + 30 : undefined,
      behavior,
      motionSeed,
    };

    this.state.obstacles.push(obstacle);
  }

  private spawnPowerUp() {
    if (this.state.powerUps.length >= this.config.maxPowerUps) return;

    const lane = Math.floor(Math.random() * LANE_COUNT);
    const typeRand = Math.random();
    
    let type: PowerUpType;
    let duration = 0;
    let value = 0;

    if (typeRand < 0.18) {
      type = 'shield';
      value = 38;
    } else if (typeRand < 0.36) {
      type = 'health';
      value = 32;
    } else if (typeRand < 0.44) {
      type = 'speed_boost';
      duration = 300;
    } else if (typeRand < 0.52) {
      type = 'slow_motion';
      duration = 240;
    } else if (typeRand < 0.60) {
      type = 'weapon_upgrade';
      duration = 360;
    } else if (typeRand < 0.67) {
      type = 'score_multiplier';
      duration = 300;
      value = 2;
    } else if (typeRand < 0.73) {
      type = 'magnet';
      duration = 400;
    } else if (typeRand < 0.79) {
      type = 'nuke';
      value = 999;
    } else if (typeRand < 0.85) {
      type = 'laser_beam';
      duration = 240;
    } else if (typeRand < 0.90) {
      type = 'ghost_mode';
      duration = 300;
    } else if (typeRand < 0.95) {
      type = 'homing_missiles';
      duration = 360;
    } else {
      type = 'size_reduction';
      duration = 400;
    }

    const powerUp: PowerUp = {
      id: generateId(),
      position: { 
        x: LANES[lane], 
        y: (Math.random() - 0.5) * PLAY_AREA_HEIGHT, 
        z: -65 - Math.random() * 15 
      },
      velocity: { x: 0, y: 0, z: this.state.gameSpeed * 0.04 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      active: true,
      type,
      duration,
      value,
      pulsePhase: 0,
    };

    this.state.powerUps.push(powerUp);
  }

  private addExplosion(x: number, y: number, z: number, size: number = 1, color: string = '#EF9F27') {
    if (this.state.explosions.length >= this.config.maxExplosions) {
      this.state.explosions.shift();
    }

    this.state.explosions.push({
      id: generateId(),
      position: { x, y, z },
      life: 1,
      maxLife: 1,
      size,
      color,
    });

    const particleCount = Math.min(12, this.config.maxParticles - this.state.particles.length);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.4;
      this.state.particles.push({
        id: generateId(),
        position: { x, y, z },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed * 0.5,
          z: (Math.random() - 0.5) * speed,
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        active: true,
        life: 1,
        maxLife: 1,
        color,
        size: 0.15 + Math.random() * 0.1,
      });
    }

    audioManager.play('explosion');
  }

  private applyPowerUp(powerUp: PowerUp) {
    const { player, activeEffects, effectTimers } = this.state;

    switch (powerUp.type) {
      case 'shield':
        player.shield = Math.min(player.maxShield, player.shield + powerUp.value);
        break;
      case 'health':
        player.health = Math.min(player.maxHealth, player.health + powerUp.value);
        break;
      case 'speed_boost':
        player.boostTimer = powerUp.duration;
        activeEffects.speedBoost = true;
        break;
      case 'slow_motion':
        player.slowMotionTimer = powerUp.duration;
        activeEffects.slowMotion = true;
        break;
      case 'weapon_upgrade':
        activeEffects.weaponUpgrade = true;
        setTimeout(() => { activeEffects.weaponUpgrade = false; }, powerUp.duration * 16);
        break;
      case 'score_multiplier':
        this.state.multiplier = Math.min(8, this.state.multiplier + powerUp.value);
        this.state.multiplierTimer = powerUp.duration;
        activeEffects.scoreMultiplier = true;
        break;
      case 'magnet':
        activeEffects.magnet = true;
        effectTimers.magnet = powerUp.duration;
        break;
      case 'nuke':
        this.triggerNuke();
        break;
      case 'laser_beam':
        activeEffects.laserBeam = true;
        effectTimers.laserBeam = powerUp.duration;
        break;
      case 'ghost_mode':
        activeEffects.ghostMode = true;
        effectTimers.ghostMode = powerUp.duration;
        player.invulnerableTimer = powerUp.duration;
        break;
      case 'homing_missiles':
        activeEffects.homingMissiles = true;
        effectTimers.homingMissiles = powerUp.duration;
        break;
      case 'size_reduction':
        activeEffects.sizeReduction = true;
        effectTimers.sizeReduction = powerUp.duration;
        player.scale = 0.5;
        break;
    }

    this.callbacks.onPowerUp?.(powerUp.type);
    this.callbacks.onHealthUpdate?.(player.health, player.shield);
    audioManager.play('powerup');
  }

  private triggerNuke() {
    this.state.obstacles.forEach(obs => {
      if (obs.health > 0 && obs.type !== 'anomaly') {
        this.addExplosion(obs.position.x, obs.position.y, obs.position.z, obs.scale * 1.5, '#ff6600');
        const points = this.getObstaclePoints(obs.type) * this.state.multiplier;
        this.state.score += points;
        obs.health = 0;
      }
    });
    
    this.addExplosion(0, 0, -20, 5, '#ffff00');
    this.state.multiplier = Math.min(8, this.state.multiplier + 2);
    this.state.multiplierTimer = 300;
  }

  private fireHomingMissile() {
    if (this.state.projectiles.length >= this.config.maxProjectiles) return;
    
    const { player, boss, bossActive } = this.state;
    let nearestObstacle: Obstacle | null = null;
    let nearestDist = Infinity;

    this.state.obstacles.forEach(obs => {
      if (obs.health <= 0 || obs.position.z > player.position.z) return;
      const dist = Math.abs(obs.position.z - player.position.z);
      if (dist < nearestDist && dist < 50) {
        nearestDist = dist;
        nearestObstacle = obs;
      }
    });

    const projectile: Projectile = {
      id: generateId(),
      position: { x: player.position.x, y: player.position.y, z: player.position.z - 2 },
      velocity: { x: 0, y: 0, z: -0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1.5,
      active: true,
      damage: 3,
      isEnemy: false,
      lifetime: 180,
    };

    if (nearestObstacle) {
      const dx = nearestObstacle.position.x - player.position.x;
      const dy = nearestObstacle.position.y - player.position.y;
      projectile.velocity.x = dx * 0.03;
      projectile.velocity.y = dy * 0.03;
    } else if (bossActive && boss && boss.active && boss.position.z < player.position.z) {
      const dx = boss.position.x - player.position.x;
      const dy = boss.position.y - player.position.y;
      projectile.velocity.x = dx * 0.03;
      projectile.velocity.y = dy * 0.03;
    }

    this.state.projectiles.push(projectile);
    audioManager.play('shoot');
  }

  private updateLaserBeam() {
    const { player } = this.state;
    
    this.state.obstacles.forEach(obs => {
      if (obs.health <= 0) return;
      
      const dx = Math.abs(obs.position.x - player.position.x);
      if (dx < 0.8 && obs.position.z < player.position.z && obs.position.z > -50) {
        obs.health -= 0.1;
        obs.hitFlash = 5;
        
        if (obs.health <= 0) {
          this.addExplosion(obs.position.x, obs.position.y, obs.position.z, obs.scale, '#00ffff');
          const points = this.getObstaclePoints(obs.type) * this.state.multiplier;
          this.state.score += points;
        }
      }
    });
  }

  private updateMagnetEffect() {
    const { player } = this.state;
    const magnetRange = 8;

    this.state.powerUps.forEach(pu => {
      if (!pu.active) return;
      
      const dx = player.position.x - pu.position.x;
      const dy = player.position.y - pu.position.y;
      const dz = player.position.z - pu.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < magnetRange && dist > 0.5) {
        const strength = 0.15 * (1 - dist / magnetRange);
        pu.position.x += dx * strength;
        pu.position.y += dy * strength;
        pu.position.z += dz * strength * 0.5;
      }
    });
  }

  private damagePlayer(damage: number) {
    const { player } = this.state;
    
    if (player.invulnerableTimer > 0) return;

    let remainingDamage = damage;
    
    if (player.shield > 0) {
      const shieldDamage = Math.min(player.shield, remainingDamage);
      player.shield -= shieldDamage;
      remainingDamage -= shieldDamage;
      audioManager.play('shield_hit');
    }

    if (remainingDamage > 0) {
      player.health -= remainingDamage;
      audioManager.play('hit');
    }

    player.invulnerableTimer = 60;
    this.addExplosion(player.position.x, player.position.y, player.position.z, 0.8, '#E24B4A');
    
    this.callbacks.onHealthUpdate?.(player.health, player.shield);

    if (player.health <= 0) {
      this.gameOver();
    }
  }

  private updateLevel() {
    const newLevel = getLevelByDistance(this.state.distance);
    const progress = getLevelProgress(this.state.distance, newLevel);
    
    this.state.levelProgress = progress;
    this.callbacks.onLevelProgress?.(progress);
    
    // Check for level change
    if (newLevel.id !== this.state.currentLevel) {
      this.state.currentLevel = newLevel.id;
      this.currentLevelConfig = newLevel;
      this.state.levelTransition = true;
      this.state.levelTransitionTimer = 120;
      this.callbacks.onLevelChange?.(newLevel.id, newLevel);
      
      // Update base speed for new level
      this.state.baseSpeed = newLevel.baseSpeed;
    }
    
    // Handle level transition
    if (this.state.levelTransition) {
      this.state.levelTransitionTimer--;
      if (this.state.levelTransitionTimer <= 0) {
        this.state.levelTransition = false;
      }
    }
    
    // Check for boss spawn
    if (newLevel.hasBoss && progress >= 0.9 && !this.state.bossActive && !this.state.boss) {
      this.spawnBoss(newLevel.bossType!);
    }
  }

  private spawnBoss(bossType: string) {
    const bossConfig = BOSSES[bossType];
    if (!bossConfig) return;
    
    this.state.bossActive = true;
    this.state.boss = {
      id: bossConfig.id,
      name: bossConfig.name,
      position: { x: 0, y: 0, z: -40 },
      health: bossConfig.health,
      maxHealth: bossConfig.health,
      phase: 1,
      maxPhases: bossConfig.phases,
      attackTimer: 60,
      currentAttack: bossConfig.attacks[0],
      color: bossConfig.color,
      size: bossConfig.size,
      active: true,
      hitFlash: 0,
    };
    
    // Clear regular obstacles for boss fight
    this.state.obstacles = [];
    
    this.callbacks.onBossSpawn?.(bossConfig.name);
    audioManager.play('warning');
  }

  private updateBoss() {
    const { boss, player } = this.state;
    if (!boss || !boss.active) return;
    
    // Boss movement - slowly approaches and moves side to side
    const targetZ = -25;
    boss.position.z += (targetZ - boss.position.z) * 0.01;
    boss.position.x = Math.sin(this.state.frameCount * 0.02) * 4;
    boss.position.y = Math.cos(this.state.frameCount * 0.015) * 2;
    
    if (boss.hitFlash > 0) boss.hitFlash--;
    
    // Boss attacks
    boss.attackTimer--;
    if (boss.attackTimer <= 0) {
      this.bossAttack();
      boss.attackTimer = 60 + Math.random() * 40;
    }
    
    // Check phase transitions
    const healthPercent = boss.health / boss.maxHealth;
    const newPhase = Math.ceil((1 - healthPercent) * boss.maxPhases) + 1;
    if (newPhase > boss.phase && newPhase <= boss.maxPhases) {
      boss.phase = newPhase;
      // Boss gets faster and more aggressive with each phase
      boss.attackTimer = 30;
    }
    
    // Player projectile vs boss is handled after projectiles move (see update loop)
    
    // Laser beam damages boss
    if (this.state.activeEffects.laserBeam) {
      const dx = Math.abs(boss.position.x - player.position.x);
      if (dx < 1.5 && boss.position.z < player.position.z) {
        boss.health -= 0.5;
        boss.hitFlash = 5;
        if (boss.health <= 0) {
          this.defeatBoss();
        }
      }
    }
  }

  private bossAttack() {
    const { boss } = this.state;
    if (!boss) return;
    
    const bossConfig = BOSSES[boss.id];
    const attackIndex = Math.floor(Math.random() * bossConfig.attacks.length);
    boss.currentAttack = bossConfig.attacks[attackIndex];
    
    switch (boss.currentAttack) {
      case 'bullet_spray':
        this.bossAttackBulletSpray();
        break;
      case 'drone_summon':
      case 'drone_swarm':
        this.bossAttackDroneSummon();
        break;
      case 'laser_beam':
      case 'quantum_laser':
        this.bossAttackLaser();
        break;
      case 'fire_wave':
        this.bossAttackFireWave();
        break;
      case 'summon_mines':
        this.bossAttackSummonMines();
        break;
      case 'missile_barrage':
        this.bossAttackMissileBarrage();
        break;
      default:
        this.bossAttackBulletSpray();
    }
  }

  private bossAttackBulletSpray() {
    const { boss } = this.state;
    if (!boss) return;
    
    for (let i = 0; i < 5 + boss.phase * 2; i++) {
      const angle = (i / (5 + boss.phase * 2)) * Math.PI - Math.PI / 2;
      this.state.projectiles.push({
        id: generateId(),
        position: { ...boss.position, z: boss.position.z + 2 },
        velocity: { 
          x: Math.cos(angle) * 0.15, 
          y: Math.sin(angle) * 0.1, 
          z: 0.25 
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1.2,
        active: true,
        damage: 20,
        isEnemy: true,
        lifetime: 200,
      });
    }
  }

  private bossAttackDroneSummon() {
    const { boss } = this.state;
    if (!boss) return;
    
    for (let i = 0; i < 2 + boss.phase; i++) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      this.state.obstacles.push({
        id: generateId(),
        position: { x: LANES[lane], y: (Math.random() - 0.5) * 3, z: boss.position.z - 5 },
        velocity: { x: 0, y: 0, z: 0.15 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        active: true,
        type: 'drone',
        health: 2,
        damage: 25,
        rotationSpeed: { x: 0, y: 0.05, z: 0 },
        hitFlash: 0,
        behavior: 'chase',
      });
    }
  }

  private bossAttackLaser() {
    const { boss, player } = this.state;
    if (!boss) return;
    
    // Fire a line of projectiles toward player
    for (let i = 0; i < 8; i++) {
      this.state.projectiles.push({
        id: generateId(),
        position: { x: boss.position.x, y: boss.position.y, z: boss.position.z + 2 + i * 2 },
        velocity: { x: (player.position.x - boss.position.x) * 0.02, y: 0, z: 0.3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 0.8,
        active: true,
        damage: 15,
        isEnemy: true,
        lifetime: 150,
      });
    }
  }

  private bossAttackFireWave() {
    const { boss } = this.state;
    if (!boss) return;
    
    for (let i = -3; i <= 3; i++) {
      this.state.projectiles.push({
        id: generateId(),
        position: { x: i * 2, y: boss.position.y, z: boss.position.z + 3 },
        velocity: { x: 0, y: 0, z: 0.35 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1.5,
        active: true,
        damage: 25,
        isEnemy: true,
        lifetime: 180,
      });
    }
  }

  private bossAttackSummonMines() {
    const { boss } = this.state;
    if (!boss) return;
    
    for (let i = 0; i < 3 + boss.phase; i++) {
      const x = (Math.random() - 0.5) * PLAY_AREA_WIDTH * 2;
      this.state.obstacles.push({
        id: generateId(),
        position: { x, y: (Math.random() - 0.5) * 2, z: -40 - Math.random() * 20 },
        velocity: { x: 0, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        active: true,
        type: 'mine',
        health: 1,
        damage: 40,
        rotationSpeed: { x: 0.02, y: 0.02, z: 0.02 },
        hitFlash: 0,
        behavior: 'static',
      });
    }
  }

  private bossAttackMissileBarrage() {
    const { boss, player } = this.state;
    if (!boss) return;
    
    for (let i = 0; i < 4 + boss.phase; i++) {
      const offsetX = (Math.random() - 0.5) * 6;
      this.state.projectiles.push({
        id: generateId(),
        position: { x: boss.position.x + offsetX, y: boss.position.y, z: boss.position.z + 2 },
        velocity: { 
          x: (player.position.x - boss.position.x - offsetX) * 0.01, 
          y: 0, 
          z: 0.2 + Math.random() * 0.1 
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1.3,
        active: true,
        damage: 20,
        isEnemy: true,
        lifetime: 250,
      });
    }
  }

  private defeatBoss() {
    const { boss } = this.state;
    if (!boss) return;

    // Big explosion
    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * boss.size * 2;
      const offsetY = (Math.random() - 0.5) * boss.size * 2;
      this.addExplosion(
        boss.position.x + offsetX,
        boss.position.y + offsetY,
        boss.position.z,
        2 + Math.random(),
        boss.color
      );
    }

    // Award points
    const bossPoints = boss.maxHealth * 10 * this.state.multiplier;
    this.state.score += bossPoints;

    // Check if this was the final boss (Quantum Overlord)
    const isFinalBoss = boss.id === 'quantum_overlord';

    // Clear boss
    this.state.boss = null;
    this.state.bossActive = false;

    // Bonus health and shield
    this.state.player.health = Math.min(this.state.player.maxHealth, this.state.player.health + 30);
    this.state.player.shield = Math.min(this.state.player.maxShield, this.state.player.shield + 20);
    this.callbacks.onHealthUpdate?.(this.state.player.health, this.state.player.shield);

    this.callbacks.onBossDefeat?.(boss.name, bossPoints);
    audioManager.play('explosion');

    // Game completed!
    if (isFinalBoss) {
      setTimeout(() => {
        this.gameOver(true);
      }, 2000);
    }
  }

  private gameOver(completedGame: boolean = false) {
    this.state.isGameOver = true;
    audioManager.stopEngine();
    
    if (completedGame) {
      audioManager.play('powerup'); // Victory sound
    } else {
      audioManager.play('game_over');
    }
    
    this.saveGhostRun(completedGame);
    this.callbacks.onGameOver?.(this.state.score, Math.floor(this.state.distance), completedGame);
  }

  update() {
    if (this.state.isPaused || this.state.isGameOver) return;

    if (this.state.introActive) {
      this.updateIntroSequence();
      this.state.frameCount++;
      return;
    }

    const { player, activeEffects, effectTimers } = this.state;
    const input = inputManager.getState();
    const timeScale = activeEffects.slowMotion ? 0.5 : 1;

    this.state.frameCount++;
    
    // Ghost system
    this.recordGhostFrame();
    this.updateGhostPlayback();

    if (input.left) this.movePlayerLane(-1);
    if (input.right) this.movePlayerLane(1);
    
    if (inputManager.isMovingLeft()) {
      player.targetX = Math.max(-PLAY_AREA_WIDTH, player.targetX - 0.18);
    }
    if (inputManager.isMovingRight()) {
      player.targetX = Math.min(PLAY_AREA_WIDTH, player.targetX + 0.18);
    }
    if (inputManager.isMovingUp()) {
      player.targetY = Math.min(PLAY_AREA_HEIGHT, player.targetY + 0.12);
    }
    if (inputManager.isMovingDown()) {
      player.targetY = Math.max(-PLAY_AREA_HEIGHT, player.targetY - 0.12);
    }

    player.position.x += (player.targetX - player.position.x) * 0.15;
    player.position.y += (player.targetY - player.position.y) * 0.12;

    player.rotation.z = (player.targetX - player.position.x) * -0.15;
    player.rotation.x = (player.targetY - player.position.y) * 0.1;

    if (player.invulnerableTimer > 0 && !activeEffects.ghostMode) player.invulnerableTimer--;
    if (player.boostTimer > 0) {
      player.boostTimer--;
      if (player.boostTimer === 0) activeEffects.speedBoost = false;
    }
    if (player.slowMotionTimer > 0) {
      player.slowMotionTimer--;
      if (player.slowMotionTimer === 0) activeEffects.slowMotion = false;
    }

    // Update new effect timers
    if (effectTimers.magnet > 0) {
      effectTimers.magnet--;
      this.updateMagnetEffect();
      if (effectTimers.magnet === 0) activeEffects.magnet = false;
    }
    if (effectTimers.laserBeam > 0) {
      effectTimers.laserBeam--;
      this.updateLaserBeam();
      if (effectTimers.laserBeam === 0) activeEffects.laserBeam = false;
    }
    if (effectTimers.ghostMode > 0) {
      effectTimers.ghostMode--;
      if (effectTimers.ghostMode === 0) {
        activeEffects.ghostMode = false;
        player.invulnerableTimer = 0;
      }
    }
    if (effectTimers.homingMissiles > 0) {
      effectTimers.homingMissiles--;
      if (this.state.frameCount % 20 === 0) {
        this.fireHomingMissile();
      }
      if (effectTimers.homingMissiles === 0) activeEffects.homingMissiles = false;
    }
    if (effectTimers.sizeReduction > 0) {
      effectTimers.sizeReduction--;
      if (effectTimers.sizeReduction === 0) {
        activeEffects.sizeReduction = false;
        player.scale = 1;
      }
    }

    if (inputManager.isShooting() && this.state.frameCount % 8 === 0) {
      this.playerShoot();
    }
    if (this.shootCooldown > 0) this.shootCooldown--;

    this.state.difficulty = Math.min(
      this.config.maxDifficulty,
      1 + this.state.distance * this.config.difficultyIncreaseRate
    );

    // Update level system
    this.updateLevel();
    
    // Update boss if active
    if (this.state.bossActive) {
      this.updateBoss();
    }

    const speedMultiplier = activeEffects.speedBoost ? 1.5 : 1;
    const levelSpeed = this.currentLevelConfig.baseSpeed;
    const maxSpeed = this.currentLevelConfig.maxSpeed;
    this.state.gameSpeed = Math.min(maxSpeed, (levelSpeed + this.state.difficulty * 2) * speedMultiplier * timeScale);
    this.state.distance += this.state.gameSpeed * 0.05;

    audioManager.setEngineSpeed(this.state.gameSpeed);

    // Use level-specific spawn rate (Level 1: gentler spawn ramp after intro)
    const levelSpawnRate = this.currentLevelConfig.spawnRate;
    const level1Ease =
      this.currentLevelConfig.id === 1 && this.state.distance < 160
        ? 1.15 + (1 - this.state.distance / 160) * 0.35
        : 1;
    const spawnRate = Math.max(15, levelSpawnRate * level1Ease - this.state.difficulty * 5);
    this.state.spawnTimer++;
    if (this.state.spawnTimer >= spawnRate && !this.state.bossActive) {
      this.state.spawnTimer = 0;
      this.spawnObstacle();
      if (Math.random() < 0.3) this.spawnObstacle();
    }

    // Use level-specific power-up frequency
    const powerUpRate = this.currentLevelConfig.powerUpFrequency;
    this.state.powerUpSpawnTimer++;
    if (this.state.powerUpSpawnTimer >= powerUpRate) {
      this.state.powerUpSpawnTimer = 0;
      this.spawnPowerUp();
      if (Math.random() < 0.38) {
        this.spawnPowerUp();
      }
    }

    const baseSpeedZ = this.state.gameSpeed * 0.04 * timeScale;

    this.state.obstacles.forEach(o => {
      o.position.z += o.velocity.z + baseSpeedZ;
      o.rotation.x += o.rotationSpeed.x;
      o.rotation.y += o.rotationSpeed.y;
      o.rotation.z += o.rotationSpeed.z;

      if (o.type === 'bomb') {
        o.velocity.y -= 0.0014 * timeScale;
        o.position.x += o.velocity.x * timeScale;
        o.position.y += o.velocity.y * timeScale;
        o.position.x += Math.sin(this.state.frameCount * 0.018 + o.id.length) * 0.025 * timeScale;
      } else if (o.type === 'bird') {
        const w = o.motionSeed ?? 0;
        o.position.x += Math.sin(this.state.frameCount * 0.33 + w) * 0.14 * timeScale;
        o.position.y += Math.cos(this.state.frameCount * 0.29 + w * 1.7) * 0.11 * timeScale;
        o.position.x += (Math.random() - 0.5) * 0.06 * timeScale;
        o.position.y += (Math.random() - 0.5) * 0.05 * timeScale;
      } else if (o.type === 'asteroid') {
        o.position.x += Math.sin(this.state.frameCount * 0.014 + o.id.charCodeAt(0)) * 0.018 * timeScale;
        o.position.y += Math.cos(this.state.frameCount * 0.011) * 0.012 * timeScale;
      }

      if (o.behavior === 'chase') {
        const dx = player.position.x - o.position.x;
        o.position.x += Math.sign(dx) * 0.02 * this.state.difficulty;
      }

      if (o.behavior === 'shoot' && o.shootTimer !== undefined) {
        o.shootTimer--;
        if (o.shootTimer <= 0 && this.state.projectiles.length < this.config.maxProjectiles) {
          o.shootTimer = 80 - this.state.difficulty * 10;
          this.state.projectiles.push({
            id: generateId(),
            position: { ...o.position, z: o.position.z + 1 },
            velocity: { x: 0, y: 0, z: 0.3 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1,
            active: true,
            damage: 15,
            isEnemy: true,
            lifetime: 180,
          });
        }
      }

      if (o.hitFlash > 0) o.hitFlash--;
    });

    this.state.projectiles.forEach(p => {
      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      p.position.z += p.velocity.z * (p.isEnemy ? timeScale : 1);
      p.lifetime--;
    });

    this.state.powerUps.forEach(pu => {
      pu.position.z += baseSpeedZ;
      pu.pulsePhase += 0.1;
      pu.rotation.y += 0.03;
    });

    this.state.particles.forEach(p => {
      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      p.position.z += p.velocity.z;
      p.velocity.x *= 0.96;
      p.velocity.y *= 0.96;
      p.velocity.z *= 0.96;
      p.life -= 0.025;
    });

    this.state.explosions.forEach(e => {
      e.life -= 0.04;
      e.position.z += baseSpeedZ;
    });

    this.state.projectiles.forEach(proj => {
      if (!proj.isEnemy) {
        this.state.obstacles.forEach(obs => {
          if (obs.health <= 0) return;
          const dx = Math.abs(proj.position.x - obs.position.x);
          const dy = Math.abs(proj.position.y - obs.position.y);
          const dz = Math.abs(proj.position.z - obs.position.z);
          
          if (dx < 1.2 && dy < 1.2 && dz < 1.5) {
            proj.lifetime = 0;
            obs.health -= proj.damage;
            obs.hitFlash = 10;

            if (obs.health <= 0) {
              this.addExplosion(obs.position.x, obs.position.y, obs.position.z, obs.scale);
              const points = this.getObstaclePoints(obs.type) * this.state.multiplier;
              this.state.score += points;
              this.state.multiplierTimer = 180;
            }
          }
        });

        // Boss: must run after projectile movement (same timing as obstacle hits)
        const boss = this.state.boss;
        if (this.state.bossActive && boss && boss.active && proj.lifetime > 0) {
          const dx = Math.abs(proj.position.x - boss.position.x);
          const dy = Math.abs(proj.position.y - boss.position.y);
          const dz = Math.abs(proj.position.z - boss.position.z);
          const zDepth = Math.max(boss.size * 1.2, 2.5);
          if (dx < boss.size && dy < boss.size && dz < zDepth) {
            proj.lifetime = 0;
            boss.health -= proj.damage * 10;
            boss.hitFlash = 10;
            if (boss.health <= 0) {
              this.defeatBoss();
            }
          }
        }
      } else {
        const dx = Math.abs(proj.position.x - player.position.x);
        const dy = Math.abs(proj.position.y - player.position.y);
        const dz = Math.abs(proj.position.z - player.position.z);

        if (dx < 0.8 && dy < 0.8 && dz < 1) {
          proj.lifetime = 0;
          this.damagePlayer(proj.damage);
        }
      }
    });

    this.state.obstacles.forEach(obs => {
      if (obs.health <= 0) return;
      
      // Ghost mode makes player pass through obstacles
      if (activeEffects.ghostMode) return;
      
      const dx = Math.abs(player.position.x - obs.position.x);
      const dy = Math.abs(player.position.y - obs.position.y);
      const dz = Math.abs(player.position.z - obs.position.z);
      
      // Size reduction makes hitbox smaller
      const playerRadius = activeEffects.sizeReduction ? 0.4 : 0.8;
      const collisionRadius =
        (obs.type === 'asteroid' ? 1.3 : obs.type === 'bomb' ? 1.15 : obs.type === 'bird' ? 0.75 : 1) +
        playerRadius;

      if (dx < collisionRadius && dy < collisionRadius && dz < 1.2) {
        obs.health = 0;
        this.addExplosion(obs.position.x, obs.position.y, obs.position.z, obs.scale);
        this.damagePlayer(obs.damage);
      }
    });

    this.state.powerUps.forEach(pu => {
      const dx = Math.abs(player.position.x - pu.position.x);
      const dy = Math.abs(player.position.y - pu.position.y);
      const dz = Math.abs(player.position.z - pu.position.z);

      if (dx < 1.5 && dy < 1.5 && dz < 1.5) {
        pu.active = false;
        this.applyPowerUp(pu);
      }
    });

    this.state.obstacles = this.state.obstacles.filter(o => o.position.z < 10 && o.health > 0);
    this.state.projectiles = this.state.projectiles.filter(p => p.lifetime > 0 && p.position.z > -70 && p.position.z < 10);
    this.state.powerUps = this.state.powerUps.filter(pu => pu.active && pu.position.z < 10);
    this.state.particles = this.state.particles.filter(p => p.life > 0);
    this.state.explosions = this.state.explosions.filter(e => e.life > 0);

    this.state.score += Math.floor(this.state.gameSpeed * 0.1);
    
    if (this.state.multiplierTimer > 0) {
      this.state.multiplierTimer--;
      if (this.state.multiplierTimer === 0) {
        this.state.multiplier = Math.max(1, this.state.multiplier - 1);
        this.state.activeEffects.scoreMultiplier = this.state.multiplier > 1;
        this.callbacks.onMultiplierUpdate?.(this.state.multiplier);
      }
    }

    if (this.state.frameCount % 3 === 0) {
      this.callbacks.onScoreUpdate?.(this.state.score);
      this.callbacks.onDistanceUpdate?.(Math.floor(this.state.distance));
      this.callbacks.onSpeedUpdate?.(this.state.gameSpeed);
    }
  }

  private getObstaclePoints(type: ObstacleType): number {
    switch (type) {
      case 'asteroid': return 30;
      case 'debris': return 15;
      case 'drone': return 50;
      case 'mine': return 25;
      case 'anomaly': return 100;
      case 'bomb': return 35;
      case 'bird': return 40;
      case 'crate': return 35;
      default: return 20;
    }
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    if (this.state.isPaused) {
      audioManager.stopEngine();
    } else {
      audioManager.startEngine();
    }
  }

  startGame() {
    this.reset();
    audioManager.startEngine();
  }
}
