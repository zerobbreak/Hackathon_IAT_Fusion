import { useState, useCallback, useRef } from 'react';
import Game from './Game';
import './App.css';

const MAX_AMMO = 6;

export default function App() {
  const [screen, setScreen] = useState('title');
  const [score, setScore] = useState(0);
  const [dist, setDist] = useState(0);
  const [lives, setLives] = useState(3);
  const [ammo, setAmmo] = useState(MAX_AMMO);
  const [mult, setMult] = useState(1);
  const [signal, setSignal] = useState('Awaiting signal...');
  const [finalScore, setFinalScore] = useState(0);
  const [finalDist, setFinalDist] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const gameKeyRef = useRef(0);

  const handleStart = () => {
    gameKeyRef.current++;
    setScore(0); setDist(0); setLives(3); setAmmo(MAX_AMMO); setMult(1);
    setSignal('SIGNAL: "Package must reach the Underlevel. Don\'t stop."');
    setScreen('playing');
  };

  const handleGameOver = useCallback((s: number, d: number) => {
    setFinalScore(s);
    setFinalDist(d);
    setHighScore(prev => Math.max(prev, s));
    setScreen('gameover');
  }, []);

  const multColor = mult >= 6 ? '#EF9F27' : mult >= 3 ? '#9FE1CB' : '#534AB7';

  return (
    <div className="app">
      <div className="scanlines" />
      <div className="game-shell">

        {screen === 'title' && (
          <div className="overlay-screen">
            <div className="title-art">
              <div className="title-main">VOID RUNNER</div>
              <div className="title-sub">SIGNAL&nbsp;&nbsp;ZERO</div>
            </div>
            <div className="title-flavor">Armed response activated — Grid-7 collapse imminent</div>
            {highScore > 0 && <div className="high-score-tag">BEST: {highScore.toLocaleString()}</div>}
            <button className="cta-btn" onClick={handleStart}>INITIATE RUN</button>
            <div className="controls-grid">
              <div className="ctrl-row"><span className="kbd">W / ↑</span><span>move up</span></div>
              <div className="ctrl-row"><span className="kbd">S / ↓</span><span>move down</span></div>
              <div className="ctrl-row"><span className="kbd">SPACE / F</span><span>shoot</span></div>
              <div className="ctrl-row"><span className="kbd">TAP</span><span>shoot (mobile)</span></div>
              <div className="ctrl-row"><span className="kbd">SWIPE</span><span>change lane</span></div>
            </div>
          </div>
        )}

        {screen === 'gameover' && (
          <div className="overlay-screen">
            <div className="go-title">SIGNAL LOST</div>
            <div className="go-sub">The courier did not make it.</div>
            <div className="go-stats">
              <div className="go-stat"><span className="go-label">SCORE</span><span className="go-val score-val">{finalScore.toLocaleString()}</span></div>
              <div className="go-stat"><span className="go-label">DISTANCE</span><span className="go-val">{finalDist}m</span></div>
              <div className="go-stat"><span className="go-label">BEST</span><span className="go-val">{highScore.toLocaleString()}</span></div>
            </div>
            <button className="cta-btn" onClick={handleStart}>RUN AGAIN</button>
          </div>
        )}

        {screen === 'playing' && (
          <div className="hud">
            <div className="hud-group">
              <span className="hud-label">SCORE</span>
              <span className="hud-val score-val">{score.toLocaleString()}</span>
            </div>
            <div className="hud-group">
              <span className="hud-label">DIST</span>
              <span className="hud-val">{dist}m</span>
            </div>
            <div className="hud-group">
              <span className="hud-label">LIVES</span>
              <div className="pips">
                {[0,1,2].map(i => <div key={i} className={`pip life-pip${i >= lives ? ' empty' : ''}`} />)}
              </div>
            </div>
            <div className="hud-group">
              <span className="hud-label">AMMO</span>
              <div className="pips">
                {Array.from({length: MAX_AMMO}).map((_, i) => <div key={i} className={`pip ammo-pip${i >= ammo ? ' empty' : ''}`} />)}
              </div>
            </div>
            <div className="hud-group">
              <span className="hud-label">MULT</span>
              <span className="hud-val" style={{ color: multColor }}>x{mult}</span>
            </div>
          </div>
        )}

        <div className="canvas-wrap" style={{ display: screen === 'playing' ? 'flex' : 'none', overflow: 'hidden' }}>
          <Game
            key={gameKeyRef.current}
            running={screen === 'playing'}
            onScoreUpdate={setScore}
            onDistUpdate={setDist}
            onLivesUpdate={setLives}
            onAmmoUpdate={setAmmo}
            onMultUpdate={setMult}
            onSignal={setSignal}
            onGameOver={handleGameOver}
          />
        </div>

        {screen === 'playing' && (
          <div className="signal-bar">
            <span className="signal-dot" />
            <span className="signal-text">{signal}</span>
          </div>
        )}

        {screen === 'playing' && (
          <div className="controls-hint">
            <span>W/S or ↑↓ — lane</span>
            <span>SPACE / F — shoot</span>
            <span>Tap — shoot · Swipe — lane</span>
          </div>
        )}
      </div>
    </div>
  );
}
