import { ObstacleType } from './types';

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  
  // Visual theme
  theme: {
    backgroundColor: string;
    fogColor: string;
    fogNear: number;
    fogFar: number;
    gridColor1: string;
    gridColor2: string;
    ambientLightIntensity: number;
    ambientLightColor: string;
    starColors: string[];
    nebulaColors: string[];
  };
  
  // Gameplay settings
  baseSpeed: number;
  speedIncreaseRate: number;
  maxSpeed: number;
  
  // Spawning
  spawnRate: number;
  obstacleTypes: { type: ObstacleType; weight: number; }[];
  powerUpFrequency: number;
  
  // Level completion
  targetDistance: number;
  hasBoss: boolean;
  bossType?: string;
  
  // Difficulty modifiers
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "ASTEROID BELT",
    subtitle: "The Outer Rim",
    description: "Navigate through the treacherous asteroid field at the edge of the solar system.",
    theme: {
      backgroundColor: '#050510',
      fogColor: '#050510',
      fogNear: 50,
      fogFar: 150,
      gridColor1: '#331166',
      gridColor2: '#220044',
      ambientLightIntensity: 0.35,
      ambientLightColor: '#aaccff',
      starColors: ['#ffffff', '#aaccff', '#ffddaa', '#ffaaaa', '#aaffaa'],
      nebulaColors: ['#6633ff', '#ff3366', '#33ff99', '#ff9933', '#3399ff'],
    },
    baseSpeed: 6,
    speedIncreaseRate: 0.001,
    maxSpeed: 12,
    spawnRate: 40,
    obstacleTypes: [
      { type: 'asteroid', weight: 0.5 },
      { type: 'debris', weight: 0.3 },
      { type: 'drone', weight: 0.15 },
      { type: 'mine', weight: 0.05 },
    ],
    powerUpFrequency: 500,
    targetDistance: 500,
    hasBoss: false,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    enemySpeedMultiplier: 1,
  },
  {
    id: 2,
    name: "NEBULA STORM",
    subtitle: "Crimson Veil",
    description: "A dense nebula filled with ion storms and enemy patrols.",
    theme: {
      backgroundColor: '#100510',
      fogColor: '#200815',
      fogNear: 40,
      fogFar: 120,
      gridColor1: '#552233',
      gridColor2: '#330011',
      ambientLightIntensity: 0.3,
      ambientLightColor: '#ff6688',
      starColors: ['#ffaaaa', '#ff8888', '#ffccaa', '#ffffff', '#ffdddd'],
      nebulaColors: ['#ff3366', '#cc2255', '#ff6699', '#aa1144', '#ff4477'],
    },
    baseSpeed: 7,
    speedIncreaseRate: 0.0012,
    maxSpeed: 14,
    spawnRate: 35,
    obstacleTypes: [
      { type: 'asteroid', weight: 0.25 },
      { type: 'debris', weight: 0.2 },
      { type: 'drone', weight: 0.35 },
      { type: 'anomaly', weight: 0.1 },
      { type: 'mine', weight: 0.1 },
    ],
    powerUpFrequency: 450,
    targetDistance: 750,
    hasBoss: true,
    bossType: 'drone_commander',
    enemyHealthMultiplier: 1.2,
    enemyDamageMultiplier: 1.1,
    enemySpeedMultiplier: 1.1,
  },
  {
    id: 3,
    name: "FROZEN EXPANSE",
    subtitle: "Ice Giants Territory",
    description: "Navigate between massive ice asteroids near the frozen giants.",
    theme: {
      backgroundColor: '#051015',
      fogColor: '#082030',
      fogNear: 45,
      fogFar: 140,
      gridColor1: '#224466',
      gridColor2: '#112233',
      ambientLightIntensity: 0.4,
      ambientLightColor: '#88ccff',
      starColors: ['#aaddff', '#88ccff', '#ffffff', '#cceeff', '#99bbff'],
      nebulaColors: ['#3399ff', '#2277cc', '#44aaff', '#1166aa', '#55bbff'],
    },
    baseSpeed: 7.5,
    speedIncreaseRate: 0.0013,
    maxSpeed: 15,
    spawnRate: 32,
    obstacleTypes: [
      { type: 'asteroid', weight: 0.45 },
      { type: 'debris', weight: 0.25 },
      { type: 'drone', weight: 0.15 },
      { type: 'mine', weight: 0.1 },
      { type: 'anomaly', weight: 0.05 },
    ],
    powerUpFrequency: 420,
    targetDistance: 1000,
    hasBoss: false,
    enemyHealthMultiplier: 1.3,
    enemyDamageMultiplier: 1.2,
    enemySpeedMultiplier: 1,
  },
  {
    id: 4,
    name: "SOLAR FLARE",
    subtitle: "Corona Zone",
    description: "Dangerous solar winds and radiation storms near the star.",
    theme: {
      backgroundColor: '#151005',
      fogColor: '#302010',
      fogNear: 35,
      fogFar: 110,
      gridColor1: '#664422',
      gridColor2: '#442211',
      ambientLightIntensity: 0.5,
      ambientLightColor: '#ffaa66',
      starColors: ['#ffdd88', '#ffcc66', '#ffaa44', '#ffffff', '#ffee99'],
      nebulaColors: ['#ff9933', '#ff6600', '#ffaa44', '#cc5500', '#ffbb55'],
    },
    baseSpeed: 8,
    speedIncreaseRate: 0.0015,
    maxSpeed: 16,
    spawnRate: 28,
    obstacleTypes: [
      { type: 'asteroid', weight: 0.2 },
      { type: 'debris', weight: 0.15 },
      { type: 'drone', weight: 0.3 },
      { type: 'anomaly', weight: 0.25 },
      { type: 'mine', weight: 0.1 },
    ],
    powerUpFrequency: 380,
    targetDistance: 1250,
    hasBoss: true,
    bossType: 'solar_sentinel',
    enemyHealthMultiplier: 1.5,
    enemyDamageMultiplier: 1.3,
    enemySpeedMultiplier: 1.2,
  },
  {
    id: 5,
    name: "DARK MATTER RIFT",
    subtitle: "The Void Between",
    description: "A tear in space-time where reality itself is unstable.",
    theme: {
      backgroundColor: '#020008',
      fogColor: '#050010',
      fogNear: 30,
      fogFar: 100,
      gridColor1: '#440088',
      gridColor2: '#220044',
      ambientLightIntensity: 0.25,
      ambientLightColor: '#aa66ff',
      starColors: ['#aa88ff', '#8866dd', '#bb99ff', '#ffffff', '#cc99ff'],
      nebulaColors: ['#6633cc', '#8844ff', '#5522aa', '#9955ff', '#7733dd'],
    },
    baseSpeed: 8.5,
    speedIncreaseRate: 0.0018,
    maxSpeed: 18,
    spawnRate: 25,
    obstacleTypes: [
      { type: 'asteroid', weight: 0.15 },
      { type: 'debris', weight: 0.15 },
      { type: 'drone', weight: 0.25 },
      { type: 'anomaly', weight: 0.35 },
      { type: 'mine', weight: 0.1 },
    ],
    powerUpFrequency: 350,
    targetDistance: 1500,
    hasBoss: false,
    enemyHealthMultiplier: 1.7,
    enemyDamageMultiplier: 1.4,
    enemySpeedMultiplier: 1.3,
  },
  {
    id: 6,
    name: "ENEMY ARMADA",
    subtitle: "Battle Station Omega",
    description: "The heart of enemy territory. Survive the full assault.",
    theme: {
      backgroundColor: '#080505',
      fogColor: '#150808',
      fogNear: 40,
      fogFar: 130,
      gridColor1: '#662222',
      gridColor2: '#441111',
      ambientLightIntensity: 0.35,
      ambientLightColor: '#ff6666',
      starColors: ['#ff8888', '#ffaaaa', '#ff6666', '#ffffff', '#ffcccc'],
      nebulaColors: ['#ff2222', '#cc1111', '#ff4444', '#aa0000', '#ff3333'],
    },
    baseSpeed: 9,
    speedIncreaseRate: 0.002,
    maxSpeed: 20,
    spawnRate: 20,
    obstacleTypes: [
      { type: 'asteroid', weight: 0.1 },
      { type: 'debris', weight: 0.1 },
      { type: 'drone', weight: 0.5 },
      { type: 'mine', weight: 0.2 },
      { type: 'anomaly', weight: 0.1 },
    ],
    powerUpFrequency: 300,
    targetDistance: 2000,
    hasBoss: true,
    bossType: 'mothership',
    enemyHealthMultiplier: 2,
    enemyDamageMultiplier: 1.5,
    enemySpeedMultiplier: 1.4,
  },
  {
    id: 7,
    name: "QUANTUM REALM",
    subtitle: "Beyond Reality",
    description: "The final frontier. Everything you know is wrong here.",
    theme: {
      backgroundColor: '#000808',
      fogColor: '#001515',
      fogNear: 25,
      fogFar: 90,
      gridColor1: '#008888',
      gridColor2: '#004444',
      ambientLightIntensity: 0.45,
      ambientLightColor: '#00ffff',
      starColors: ['#00ffff', '#00dddd', '#00ffaa', '#ffffff', '#88ffff'],
      nebulaColors: ['#00cccc', '#00aaaa', '#00ffff', '#008888', '#00dddd'],
    },
    baseSpeed: 10,
    speedIncreaseRate: 0.0025,
    maxSpeed: 25,
    spawnRate: 18,
    obstacleTypes: [
      { type: 'asteroid', weight: 0.15 },
      { type: 'debris', weight: 0.1 },
      { type: 'drone', weight: 0.35 },
      { type: 'anomaly', weight: 0.3 },
      { type: 'mine', weight: 0.1 },
    ],
    powerUpFrequency: 280,
    targetDistance: 2500,
    hasBoss: true,
    bossType: 'quantum_overlord',
    enemyHealthMultiplier: 2.5,
    enemyDamageMultiplier: 1.8,
    enemySpeedMultiplier: 1.5,
  },
];

export interface BossConfig {
  id: string;
  name: string;
  health: number;
  phases: number;
  attacks: string[];
  color: string;
  size: number;
}

export const BOSSES: Record<string, BossConfig> = {
  drone_commander: {
    id: 'drone_commander',
    name: 'DRONE COMMANDER',
    health: 500,
    phases: 2,
    attacks: ['bullet_spray', 'drone_summon'],
    color: '#ff6633',
    size: 3,
  },
  solar_sentinel: {
    id: 'solar_sentinel',
    name: 'SOLAR SENTINEL',
    health: 750,
    phases: 3,
    attacks: ['laser_beam', 'fire_wave', 'summon_mines'],
    color: '#ffaa33',
    size: 4,
  },
  mothership: {
    id: 'mothership',
    name: 'MOTHERSHIP',
    health: 1000,
    phases: 3,
    attacks: ['missile_barrage', 'drone_swarm', 'tractor_beam'],
    color: '#ff3333',
    size: 5,
  },
  quantum_overlord: {
    id: 'quantum_overlord',
    name: 'QUANTUM OVERLORD',
    health: 1500,
    phases: 4,
    attacks: ['reality_warp', 'quantum_laser', 'teleport_strike', 'time_slow'],
    color: '#00ffff',
    size: 6,
  },
};

export function getLevelByDistance(distance: number): LevelConfig {
  let cumulativeDistance = 0;
  for (const level of LEVELS) {
    cumulativeDistance += level.targetDistance;
    if (distance < cumulativeDistance) {
      return level;
    }
  }
  return LEVELS[LEVELS.length - 1];
}

export function getLevelProgress(distance: number, level: LevelConfig): number {
  let startDistance = 0;
  for (const l of LEVELS) {
    if (l.id === level.id) break;
    startDistance += l.targetDistance;
  }
  const levelDistance = distance - startDistance;
  return Math.min(1, Math.max(0, levelDistance / level.targetDistance));
}

export function getTotalLevelDistance(levelId: number): number {
  let total = 0;
  for (const level of LEVELS) {
    if (level.id <= levelId) {
      total += level.targetDistance;
    }
  }
  return total;
}

export function shouldSpawnBoss(distance: number, level: LevelConfig): boolean {
  if (!level.hasBoss) return false;
  const progress = getLevelProgress(distance, level);
  return progress >= 0.95;
}
