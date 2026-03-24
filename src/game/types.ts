export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Ghost/Shadow replay system
export interface GhostFrame {
  x: number;
  y: number;
  rotationZ: number;
  distance: number;
}

export interface GhostRun {
  frames: GhostFrame[];
  finalDistance: number;
  finalScore: number;
  completedGame: boolean;
  date: string;
}

export interface GameEntity {
  id: string;
  position: Vector3;
  velocity: Vector3;
  rotation: Vector3;
  scale: number;
  active: boolean;
}

export interface Spacecraft extends GameEntity {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  speed: number;
  lane: number;
  targetX: number;
  targetY: number;
  invulnerableTimer: number;
  boostTimer: number;
  slowMotionTimer: number;
}

export type ObstacleType = 'asteroid' | 'debris' | 'drone' | 'anomaly' | 'mine';

export interface Obstacle extends GameEntity {
  type: ObstacleType;
  health: number;
  damage: number;
  rotationSpeed: Vector3;
  hitFlash: number;
  shootTimer?: number;
  behavior?: 'static' | 'chase' | 'patrol' | 'shoot';
}

export type PowerUpType = 
  | 'shield' 
  | 'health' 
  | 'speed_boost' 
  | 'slow_motion' 
  | 'weapon_upgrade' 
  | 'score_multiplier'
  | 'magnet'
  | 'nuke'
  | 'laser_beam'
  | 'ghost_mode'
  | 'homing_missiles'
  | 'size_reduction';

export interface PowerUp extends GameEntity {
  type: PowerUpType;
  duration: number;
  value: number;
  pulsePhase: number;
}

export interface Projectile extends GameEntity {
  damage: number;
  isEnemy: boolean;
  lifetime: number;
}

export interface Particle extends GameEntity {
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Explosion {
  id: string;
  position: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  color: string;
}

export interface Nebula {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  opacity: number;
  rotation: number;
}

export interface Planet {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  hasRings: boolean;
  ringColor?: string;
}

export interface Boss {
  id: string;
  name: string;
  position: Vector3;
  health: number;
  maxHealth: number;
  phase: number;
  maxPhases: number;
  attackTimer: number;
  currentAttack: string;
  color: string;
  size: number;
  active: boolean;
  hitFlash: number;
}

export interface GameState {
  player: Spacecraft;
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  projectiles: Projectile[];
  particles: Particle[];
  explosions: Explosion[];
  
  score: number;
  distance: number;
  multiplier: number;
  multiplierTimer: number;
  
  gameSpeed: number;
  baseSpeed: number;
  difficulty: number;
  
  frameCount: number;
  spawnTimer: number;
  powerUpSpawnTimer: number;
  
  isPaused: boolean;
  isGameOver: boolean;
  
  // Level system
  currentLevel: number;
  levelProgress: number;
  levelTransition: boolean;
  levelTransitionTimer: number;
  bossActive: boolean;
  boss: Boss | null;
  
  activeEffects: {
    slowMotion: boolean;
    speedBoost: boolean;
    weaponUpgrade: boolean;
    scoreMultiplier: boolean;
    magnet: boolean;
    laserBeam: boolean;
    ghostMode: boolean;
    homingMissiles: boolean;
    sizeReduction: boolean;
  };
  
  effectTimers: {
    magnet: number;
    laserBeam: number;
    ghostMode: number;
    homingMissiles: number;
    sizeReduction: number;
  };
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shoot: boolean;
  boost: boolean;
  pause: boolean;
  mouseX: number;
  mouseY: number;
  touch: { x: number; y: number } | null;
}

export interface AudioConfig {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  enabled: boolean;
}

export interface GameConfig {
  maxObstacles: number;
  maxProjectiles: number;
  maxParticles: number;
  maxPowerUps: number;
  maxExplosions: number;
  
  spawnRateBase: number;
  powerUpSpawnRate: number;
  
  playerMaxHealth: number;
  playerMaxShield: number;
  playerBaseSpeed: number;
  
  difficultyIncreaseRate: number;
  maxDifficulty: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  maxObstacles: 60,
  maxProjectiles: 70,
  maxParticles: 120,
  maxPowerUps: 8,
  maxExplosions: 20,
  
  spawnRateBase: 35,
  powerUpSpawnRate: 450,
  
  playerMaxHealth: 100,
  playerMaxShield: 50,
  playerBaseSpeed: 6,
  
  difficultyIncreaseRate: 0.001,
  maxDifficulty: 3,
};

export const LANES = [-8, -5, -2, 0, 2, 5, 8];
export const LANE_COUNT = 7;
export const PLAY_AREA_WIDTH = 10;
export const PLAY_AREA_HEIGHT = 5;
