import { useState, useCallback, useEffect } from 'react';
import SpaceGame from './game/SpaceGame';
import './App.css';

type Screen = 'title' | 'playing' | 'paused' | 'gameover';
type PowerUpType = 
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

const POWER_UP_NAMES: Record<PowerUpType, string> = {
  shield: 'SHIELD BOOST',
  health: 'HULL REPAIR',
  speed_boost: 'AFTERBURNER',
  slow_motion: 'TIME DILATION',
  weapon_upgrade: 'WEAPON OVERCHARGE',
  score_multiplier: 'SCORE MULTIPLIER',
  magnet: 'POWER MAGNET',
  nuke: 'NUCLEAR BLAST',
  laser_beam: 'LASER CANNON',
  ghost_mode: 'PHASE SHIFT',
  homing_missiles: 'HOMING MISSILES',
  size_reduction: 'NANO MODE',
};

const POWER_UP_COLORS: Record<PowerUpType, string> = {
  shield: '#4488ff',
  health: '#44ff44',
  speed_boost: '#ffaa00',
  slow_motion: '#aa44ff',
  weapon_upgrade: '#ff4444',
  score_multiplier: '#ffff00',
  magnet: '#ff00ff',
  nuke: '#ff6600',
  laser_beam: '#00ffff',
  ghost_mode: '#aaaaff',
  homing_missiles: '#ff8800',
  size_reduction: '#88ff88',
};

interface LevelInfo {
  id: number;
  name: string;
  subtitle: string;
  progress: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [health, setHealth] = useState(100);
  const [shield, setShield] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [speed, setSpeed] = useState(6);
  const [finalScore, setFinalScore] = useState(0);
  const [finalDistance, setFinalDistance] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('spaceGame_highScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [powerUpNotification, setPowerUpNotification] = useState<{ type: PowerUpType; visible: boolean } | null>(null);
  const [currentLevel, setCurrentLevel] = useState<LevelInfo>({ id: 1, name: 'ASTEROID BELT', subtitle: 'The Outer Rim', progress: 0 });
  const [levelTransition, setLevelTransition] = useState(false);
  const [bossAlert, setBossAlert] = useState<string | null>(null);
  const [bossDefeated, setBossDefeated] = useState<{ name: string; points: number } | null>(null);

  const handleStart = useCallback(() => {
    setScore(0);
    setDistance(0);
    setHealth(100);
    setShield(0);
    setMultiplier(1);
    setSpeed(6);
    setCurrentLevel({ id: 1, name: 'ASTEROID BELT', subtitle: 'The Outer Rim', progress: 0 });
    setScreen('playing');
  }, []);

  const handleGameOver = useCallback((finalScore: number, finalDist: number) => {
    setFinalScore(finalScore);
    setFinalDistance(finalDist);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('spaceGame_highScore', finalScore.toString());
    }
    setScreen('gameover');
  }, [highScore]);

  const handleHealthUpdate = useCallback((newHealth: number, newShield: number) => {
    setHealth(newHealth);
    setShield(newShield);
  }, []);

  const handlePowerUp = useCallback((type: string) => {
    setPowerUpNotification({ type: type as PowerUpType, visible: true });
    setTimeout(() => setPowerUpNotification(null), 2000);
  }, []);

  const handleLevelChange = useCallback((levelId: number, levelConfig: any) => {
    setCurrentLevel({
      id: levelId,
      name: levelConfig.name,
      subtitle: levelConfig.subtitle,
      progress: 0,
    });
    setLevelTransition(true);
    setTimeout(() => setLevelTransition(false), 3000);
  }, []);

  const handleLevelProgress = useCallback((progress: number) => {
    setCurrentLevel(prev => ({ ...prev, progress }));
  }, []);

  const handleBossSpawn = useCallback((bossName: string) => {
    setBossAlert(bossName);
    setTimeout(() => setBossAlert(null), 4000);
  }, []);

  const handleBossDefeat = useCallback((bossName: string, points: number) => {
    setBossDefeated({ name: bossName, points });
    setTimeout(() => setBossDefeated(null), 4000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (screen === 'playing') {
          setScreen('paused');
        } else if (screen === 'paused') {
          setScreen('playing');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  const healthPercent = Math.max(0, health);
  const shieldPercent = Math.max(0, shield);
  const healthColor = healthPercent > 60 ? '#44ff88' : healthPercent > 30 ? '#ffaa44' : '#ff4444';

  return (
    <div className="app">
      <div className="scanlines" />
      <div className="game-shell">
        {screen === 'title' && (
          <div className="overlay-screen title-screen">
            <div className="title-container">
              <div className="title-glow" />
              <h1 className="title-main">STELLAR</h1>
              <h2 className="title-sub">VOID RUNNER</h2>
              <div className="title-tagline">Navigate the cosmic storm</div>
            </div>
            
            {highScore > 0 && (
              <div className="high-score-display">
                <span className="hs-label">BEST SCORE</span>
                <span className="hs-value">{highScore.toLocaleString()}</span>
              </div>
            )}

            <button className="cta-btn" onClick={handleStart}>
              <span className="btn-text">LAUNCH</span>
              <span className="btn-glow" />
            </button>

            <div className="controls-panel">
              <h3 className="controls-title">CONTROLS</h3>
              <div className="controls-grid">
                <div className="control-item">
                  <span className="key-group">
                    <span className="kbd">W</span>
                    <span className="kbd">A</span>
                    <span className="kbd">S</span>
                    <span className="kbd">D</span>
                  </span>
                  <span className="control-desc">Navigate</span>
                </div>
                <div className="control-item">
                  <span className="key-group">
                    <span className="kbd">SPACE</span>
                  </span>
                  <span className="control-desc">Fire Weapons</span>
                </div>
                <div className="control-item">
                  <span className="key-group">
                    <span className="kbd">SHIFT</span>
                  </span>
                  <span className="control-desc">Boost</span>
                </div>
                <div className="control-item">
                  <span className="key-group">
                    <span className="kbd">ESC</span>
                  </span>
                  <span className="control-desc">Pause</span>
                </div>
              </div>
              <div className="mobile-hint">
                <span>Touch: Tap to shoot, Swipe to move</span>
              </div>
            </div>
          </div>
        )}

        {screen === 'paused' && (
          <div className="overlay-screen pause-screen">
            <div className="pause-content">
              <h2 className="pause-title">SYSTEMS PAUSED</h2>
              <div className="pause-stats">
                <div className="pause-stat">
                  <span className="stat-label">SCORE</span>
                  <span className="stat-value">{score.toLocaleString()}</span>
                </div>
                <div className="pause-stat">
                  <span className="stat-label">DISTANCE</span>
                  <span className="stat-value">{distance}m</span>
                </div>
              </div>
              <div className="pause-buttons">
                <button className="cta-btn" onClick={() => setScreen('playing')}>
                  <span className="btn-text">RESUME</span>
                </button>
                <button className="secondary-btn" onClick={() => setScreen('title')}>
                  ABORT MISSION
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'gameover' && (
          <div className="overlay-screen gameover-screen">
            <div className="go-content">
              <h2 className="go-title">SIGNAL LOST</h2>
              <p className="go-subtitle">Vessel destroyed in sector 7-G</p>
              
              <div className="go-stats">
                <div className="go-stat primary">
                  <span className="go-label">FINAL SCORE</span>
                  <span className="go-value">{finalScore.toLocaleString()}</span>
                </div>
                <div className="go-stat">
                  <span className="go-label">DISTANCE</span>
                  <span className="go-value">{finalDistance}m</span>
                </div>
                <div className="go-stat">
                  <span className="go-label">BEST SCORE</span>
                  <span className="go-value highlight">{highScore.toLocaleString()}</span>
                </div>
              </div>

              {finalScore >= highScore && finalScore > 0 && (
                <div className="new-record">NEW RECORD!</div>
              )}

              <button className="cta-btn" onClick={handleStart}>
                <span className="btn-text">TRY AGAIN</span>
              </button>
              <button className="secondary-btn" onClick={() => setScreen('title')}>
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {(screen === 'playing' || screen === 'paused') && (
          <>
            <div className="hud">
              <div className="hud-left">
                <div className="hud-panel score-panel">
                  <span className="hud-label">SCORE</span>
                  <span className="hud-value score-value">{score.toLocaleString()}</span>
                </div>
                <div className="hud-panel">
                  <span className="hud-label">DISTANCE</span>
                  <span className="hud-value">{distance}m</span>
                </div>
              </div>

              <div className="hud-center">
                <div className="level-indicator">
                  <span className="level-name">{currentLevel.name}</span>
                  <span className="level-subtitle">{currentLevel.subtitle}</span>
                  <div className="level-progress-bar">
                    <div className="level-progress-fill" style={{ width: `${currentLevel.progress * 100}%` }} />
                  </div>
                </div>
                {multiplier > 1 && (
                  <div className="multiplier-display" style={{ color: multiplier >= 5 ? '#ffaa00' : '#00ffaa' }}>
                    x{multiplier}
                  </div>
                )}
              </div>

              <div className="hud-right">
                <div className="hud-panel health-panel">
                  <span className="hud-label">HULL</span>
                  <div className="bar-container">
                    <div className="bar health-bar" style={{ width: `${healthPercent}%`, backgroundColor: healthColor }} />
                  </div>
                  <span className="bar-value">{Math.round(healthPercent)}%</span>
                </div>
                {shieldPercent > 0 && (
                  <div className="hud-panel shield-panel">
                    <span className="hud-label">SHIELD</span>
                    <div className="bar-container">
                      <div className="bar shield-bar" style={{ width: `${shieldPercent * 2}%` }} />
                    </div>
                  </div>
                )}
                <div className="hud-panel speed-panel">
                  <span className="hud-label">SPEED</span>
                  <span className="hud-value speed-value">{speed.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Level Transition Overlay */}
            {levelTransition && (
              <div className="level-transition">
                <div className="level-transition-content">
                  <span className="level-number">LEVEL {currentLevel.id}</span>
                  <h2 className="level-transition-name">{currentLevel.name}</h2>
                  <span className="level-transition-subtitle">{currentLevel.subtitle}</span>
                </div>
              </div>
            )}

            {/* Boss Alert */}
            {bossAlert && (
              <div className="boss-alert">
                <span className="boss-warning">WARNING</span>
                <h2 className="boss-name">{bossAlert}</h2>
                <span className="boss-approaching">APPROACHING</span>
              </div>
            )}

            {/* Boss Defeated */}
            {bossDefeated && (
              <div className="boss-defeated">
                <h2 className="boss-defeated-title">{bossDefeated.name} DESTROYED</h2>
                <span className="boss-points">+{bossDefeated.points.toLocaleString()} POINTS</span>
              </div>
            )}

            {powerUpNotification && powerUpNotification.visible && (
              <div 
                className="powerup-notification"
                style={{ borderColor: POWER_UP_COLORS[powerUpNotification.type] }}
              >
                <span style={{ color: POWER_UP_COLORS[powerUpNotification.type] }}>
                  {POWER_UP_NAMES[powerUpNotification.type]}
                </span>
              </div>
            )}

            <div className="canvas-container">
              <SpaceGame
                running={screen === 'playing'}
                onScoreUpdate={setScore}
                onHealthUpdate={handleHealthUpdate}
                onGameOver={handleGameOver}
                onDistanceUpdate={setDistance}
                onMultiplierUpdate={setMultiplier}
                onSpeedUpdate={setSpeed}
                onPowerUp={handlePowerUp}
                onLevelChange={handleLevelChange}
                onLevelProgress={handleLevelProgress}
                onBossSpawn={handleBossSpawn}
                onBossDefeat={handleBossDefeat}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
