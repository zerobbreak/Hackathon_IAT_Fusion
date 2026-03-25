import { useState, useCallback, useEffect } from 'react';
import SpaceGame from './game/SpaceGame';
import './App.css';

type Screen = 'title' | 'playing' | 'paused' | 'gameover' | 'powerups' | 'victory';
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
  shield: 'FUEL CELL',
  health: 'OXYGEN CANISTER',
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
  shield: '#ff9a1a',
  health: '#2af0d0',
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

const POWER_UP_DESCRIPTIONS: Record<PowerUpType, string> = {
  shield: 'Refills reactor fuel reserves, restoring your ship\'s energy shield that absorbs hits before your hull takes damage.',
  health: 'Replenishes life-support oxygen, repairing cabin pressure and restoring hull integrity.',
  speed_boost: 'Activates afterburners for a temporary speed increase. Great for escaping danger.',
  slow_motion: 'Dilates time around your ship, slowing enemies and projectiles for precision dodging.',
  weapon_upgrade: 'Overcharges your weapons, increasing fire rate and enabling triple-shot mode.',
  score_multiplier: 'Doubles your score gain for a limited time. Stack with combos for massive points.',
  magnet: 'Creates a magnetic field that attracts nearby power-ups toward your ship.',
  nuke: 'Devastating nuclear blast that destroys all enemies on screen. Use wisely.',
  laser_beam: 'Fires a continuous high-powered laser that damages everything in its path.',
  ghost_mode: 'Phase shifts your ship into another dimension, making you invulnerable to all damage.',
  homing_missiles: 'Launches auto-targeting missiles that seek out and destroy nearby enemies.',
  size_reduction: 'Shrinks your ship to nano-size, making your hitbox much smaller and harder to hit.',
};

interface GhostRunInfo {
  finalDistance: number;
  finalScore: number;
  completedGame: boolean;
  date: string;
}

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
  const [currentLevel, setCurrentLevel] = useState<LevelInfo>({ id: 1, name: 'SECTOR EARTH-01', subtitle: 'Atmospheric Danger Zone', progress: 0 });
  const [levelTransition, setLevelTransition] = useState(false);
  const [bossAlert, setBossAlert] = useState<string | null>(null);
  const [bossDefeated, setBossDefeated] = useState<{ name: string; points: number } | null>(null);
  const [, setGameCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ghostInfo, setGhostInfo] = useState<GhostRunInfo | null>(() => {
    try {
      const saved = localStorage.getItem('spaceGame_ghostRun');
      if (saved) {
        const data = JSON.parse(saved);
        return {
          finalDistance: data.finalDistance,
          finalScore: data.finalScore,
          completedGame: data.completedGame,
          date: data.date,
        };
      }
    } catch { /* ignore */ }
    return null;
  });

  const handleStart = useCallback(() => {
    setScore(0);
    setDistance(0);
    setHealth(100);
    setShield(0);
    setMultiplier(1);
    setSpeed(6);
    setGameCompleted(false);
    setCurrentLevel({ id: 1, name: 'SECTOR EARTH-01', subtitle: 'Atmospheric Danger Zone', progress: 0 });
    setScreen('playing');
  }, []);

  const handleGameOver = useCallback((finalScore: number, finalDist: number, completedGame: boolean = false) => {
    setFinalScore(finalScore);
    setFinalDistance(finalDist);
    setGameCompleted(completedGame);
    
    // Update ghost info
    try {
      const saved = localStorage.getItem('spaceGame_ghostRun');
      if (saved) {
        const data = JSON.parse(saved);
        setGhostInfo({
          finalDistance: data.finalDistance,
          finalScore: data.finalScore,
          completedGame: data.completedGame,
          date: data.date,
        });
      }
    } catch { /* ignore */ }
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('spaceGame_highScore', finalScore.toString());
    }
    setScreen(completedGame ? 'victory' : 'gameover');
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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, toggleFullscreen]);

  const healthPercent = Math.max(0, health);
  const shieldPercent = Math.max(0, shield);
  const healthColor = healthPercent > 60 ? '#44ff88' : healthPercent > 30 ? '#ffaa44' : '#ff4444';

  return (
    <div className="app">
      <div className="scanlines" />
      <button 
        className="fullscreen-btn" 
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
      >
        {isFullscreen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
      </button>
      <div className="game-shell">
        {screen === 'title' && (
          <div className="overlay-screen title-screen">
            <div className="title-container">
              <div className="title-glow" />
              <h1 className="title-main">STELLAR</h1>
              <h2 className="title-sub">VOID RUNNER</h2>
              <div className="title-tagline">Navigate the cosmic storm</div>
            </div>
            
            <div className="title-info-row">
              {highScore > 0 && (
                <div className="high-score-display">
                  <span className="hs-label">BEST SCORE</span>
                  <span className="hs-value">{highScore.toLocaleString()}</span>
                </div>
              )}

              {ghostInfo && (
                <div className="ghost-info-panel">
                  <div className="ghost-header">
                    <span className="ghost-icon">👻</span>
                    <span className="ghost-title">SHADOW RUN</span>
                  </div>
                  <div className="ghost-stats">
                    <span>Best Distance: {Math.floor(ghostInfo.finalDistance)}m</span>
                    {ghostInfo.completedGame && <span className="ghost-completed">COMPLETED!</span>}
                  </div>
                  <div className="ghost-hint">Race against your best run</div>
                </div>
              )}
            </div>

            <div className="title-actions">
              <button className="cta-btn" onClick={handleStart}>
                <span className="btn-text">LAUNCH MISSION</span>
                <span className="btn-glow" />
              </button>
              
              <button className="secondary-btn powerups-btn" onClick={() => setScreen('powerups')}>
                POWER-UPS GUIDE
              </button>
            </div>

            <div className="controls-panel">
              <h3 className="controls-title">FLIGHT CONTROLS</h3>
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
                <div className="control-item">
                  <span className="key-group">
                    <span className="kbd">F</span>
                  </span>
                  <span className="control-desc">Fullscreen</span>
                </div>
              </div>
              <div className="mobile-hint">
                <span>Touch Controls: Tap to shoot • Swipe to move</span>
              </div>
            </div>
          </div>
        )}

        {screen === 'powerups' && (
          <div className="overlay-screen powerups-screen">
            <div className="powerups-content">
              <h2 className="powerups-title">POWER-UPS GUIDE</h2>
              <p className="powerups-subtitle">Collect these to gain tactical advantages</p>
              
              <div className="powerups-grid">
                {(Object.keys(POWER_UP_NAMES) as PowerUpType[]).map((type) => (
                  <div key={type} className="powerup-card" style={{ borderColor: POWER_UP_COLORS[type] }}>
                    <div className="powerup-header">
                      <div className="powerup-icon" style={{ backgroundColor: POWER_UP_COLORS[type] }} />
                      <span className="powerup-name" style={{ color: POWER_UP_COLORS[type] }}>
                        {POWER_UP_NAMES[type]}
                      </span>
                    </div>
                    <p className="powerup-description">{POWER_UP_DESCRIPTIONS[type]}</p>
                  </div>
                ))}
              </div>

              <button className="cta-btn" onClick={() => setScreen('title')}>
                <span className="btn-text">BACK</span>
              </button>
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
              <div className="go-icon">💥</div>
              <h2 className="go-title">SIGNAL LOST</h2>
              <p className="go-subtitle">Vessel destroyed • Mission terminated</p>
              
              <div className="go-stats">
                <div className="go-stat primary">
                  <span className="go-label">FINAL SCORE</span>
                  <span className="go-value">{finalScore.toLocaleString()}</span>
                </div>
                <div className="go-stat">
                  <span className="go-label">DISTANCE TRAVELED</span>
                  <span className="go-value">{finalDistance}m</span>
                </div>
                <div className="go-stat">
                  <span className="go-label">HIGH SCORE</span>
                  <span className="go-value highlight">{highScore.toLocaleString()}</span>
                </div>
              </div>

              {ghostInfo && finalDistance < ghostInfo.finalDistance && (
                <div className="ghost-comparison">
                  Shadow was {Math.floor(ghostInfo.finalDistance - finalDistance)}m ahead
                </div>
              )}

              {finalScore >= highScore && finalScore > 0 && (
                <div className="new-record">NEW RECORD ACHIEVED!</div>
              )}

              <div className="end-screen-buttons">
                <button className="cta-btn" onClick={handleStart}>
                  <span className="btn-text">TRY AGAIN</span>
                  <span className="btn-glow" />
                </button>
                <button className="secondary-btn" onClick={() => setScreen('title')}>
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'victory' && (
          <div className="overlay-screen victory-screen">
            <div className="victory-content">
              <div className="victory-stars">★ ★ ★</div>
              <h2 className="victory-title">MISSION COMPLETE</h2>
              <p className="victory-subtitle">You have conquered the Quantum Realm!</p>
              
              <div className="victory-stats">
                <div className="victory-stat primary">
                  <span className="victory-label">FINAL SCORE</span>
                  <span className="victory-value">{finalScore.toLocaleString()}</span>
                </div>
                <div className="victory-stat">
                  <span className="victory-label">TOTAL DISTANCE</span>
                  <span className="victory-value">{finalDistance}m</span>
                </div>
                <div className="victory-stat">
                  <span className="victory-label">LEVELS CLEARED</span>
                  <span className="victory-value">7 / 7</span>
                </div>
                <div className="victory-stat">
                  <span className="victory-label">BOSSES DEFEATED</span>
                  <span className="victory-value">4 / 4</span>
                </div>
              </div>

              <div className="victory-badge">
                <span className="badge-icon">🏆</span>
                <span className="badge-text">VOID CHAMPION</span>
              </div>

              {finalScore >= highScore && finalScore > 0 && (
                <div className="new-record victory-record">NEW HIGH SCORE!</div>
              )}

              <div className="end-screen-buttons">
                <button className="cta-btn" onClick={handleStart}>
                  <span className="btn-text">PLAY AGAIN</span>
                  <span className="btn-glow" />
                </button>
                <button className="secondary-btn" onClick={() => setScreen('title')}>
                  MAIN MENU
                </button>
              </div>
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
                  <span className="hud-label">OXYGEN</span>
                  <div className="bar-container">
                    <div className="bar health-bar" style={{ width: `${healthPercent}%`, backgroundColor: healthColor }} />
                  </div>
                  <span className="bar-value">{Math.round(healthPercent)}%</span>
                </div>
                <div className="hud-panel shield-panel">
                  <span className="hud-label">FUEL</span>
                  <div className="bar-container">
                    <div className="bar shield-bar" style={{ width: `${Math.min(100, shieldPercent * 2)}%` }} />
                  </div>
                  <span className="bar-value">{Math.round(shieldPercent)}</span>
                </div>
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
