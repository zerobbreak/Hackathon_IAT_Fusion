import { useEffect, useRef, useCallback } from 'react';

const LANES = 3;
const LH = 100;
const LC = [50, 150, 250];
const PX = 80;
const MAX_AMMO = 6;

const SIGNALS = [
  'INTERCEPT: "Armed drones deployed on Grid-7. Courier is priority target."',
  'BROADCAST: "Return fire authorised. Protect the package."',
  'STATIC: "...they\'re shooting at anything that moves..."',
  'PING: "Destroy the turrets. Clear a path."',
  'SIGNAL: "Every drone you drop is one less between you and the exit."',
  'NOISE: "...reload fast... they never stop coming..."',
  'TRANSMISSION: "Shoot first. Don\'t wait for a lock."',
];

interface GameProps {
  onScoreUpdate: (score: number) => void;
  onSignal: (signal: string) => void;
  onGameOver: (score: number, dist: number) => void;
  onAmmoUpdate: (ammo: number) => void;
  onLivesUpdate: (lives: number) => void;
  onMultUpdate: (mult: number) => void;
  onDistUpdate: (dist: number) => void;
  running: boolean;
}

export default function Game2D({ onScoreUpdate, onSignal, onGameOver, onAmmoUpdate, onLivesUpdate, onMultUpdate, onDistUpdate, running }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>({});
  const keysRef = useRef<Record<string, boolean>>({});
  const animRef = useRef(null);

  const reset = useCallback(() => {
    stateRef.current = {
      player: { lane: 1, y: LC[1], targetY: LC[1], flashTimer: 0 },
      obstacles: [], shards: [], bullets: [], enemyBullets: [],
      particles: [], explosions: [], floatTexts: [],
      score: 0, dist: 0, mult: 1, multTimer: 0,
      lives: 3, ammo: MAX_AMMO, reloadTimer: 0,
      speed: 4, frameCount: 0, spawnTimer: 0,
      signalTimer: 0, signalIdx: 0,
    };
  }, []);

  const spawnExplosion = (s: any, x: number, y: number, type: string) => {
    const colors = type === 'turret'
      ? ['#E24B4A', '#EF9F27', '#F5C4B3', '#BA7517']
      : ['#D85A30', '#EF9F27', '#F0997B', '#993C1D'];
    const numShards = type === 'turret' ? 14 : 9;
    const shards = Array.from({ length: numShards }, (_, i) => {
      const angle = (i / numShards) * Math.PI * 2 + Math.random() * 0.4;
      const spd = (type === 'turret' ? 3.5 : 2.5) + Math.random() * 3;
      return {
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: (type === 'turret' ? 5 : 3.5) + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1, rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      };
    });
    const numRings = type === 'turret' ? 3 : 2;
    const rings = Array.from({ length: numRings }, (_, i) => ({
      x, y, r: 4 + i * 6,
      maxR: (type === 'turret' ? 55 : 38) + i * 10,
      life: 1, color: colors[0],
    }));
    s.explosions.push({ shards, rings, life: 1 });
  };

  const addParticles = (s: any, x: number, y: number, color: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3.5;
      s.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, color });
    }
  };

  const playerShoot = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.ammo <= 0 || s.reloadTimer > 0) return;
    s.bullets.push({ x: PX + 16, y: s.player.y, speed: 13 });
    s.ammo--;
    if (s.ammo <= 0) s.reloadTimer = 85;
    onAmmoUpdate(s.ammo);
  }, [onAmmoUpdate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      keysRef.current[e.key] = e.type === 'keydown';
      const s = stateRef.current;
      if (!s || !running) return;
      if (e.type === 'keydown') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          s.player.lane = Math.max(0, s.player.lane - 1);
          s.player.targetY = LC[s.player.lane];
          e.preventDefault();
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          s.player.lane = Math.min(2, s.player.lane + 1);
          s.player.targetY = LC[s.player.lane];
          e.preventDefault();
        }
        if (e.key === ' ' || e.key === 'f' || e.key === 'F') {
          playerShoot();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKey); };
  }, [running, playerShoot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const s = stateRef.current;
      if (!s || !running) return;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dt = Date.now() - touchStartTime;
      if (Math.abs(dy) < 12 && Math.abs(dx) < 12 && dt < 220) { playerShoot(); }
      else if (dy < -20) { s.player.lane = Math.max(0, s.player.lane - 1); s.player.targetY = LC[s.player.lane]; }
      else if (dy > 20) { s.player.lane = Math.min(2, s.player.lane + 1); s.player.targetY = LC[s.player.lane]; }
      e.preventDefault();
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => { canvas.removeEventListener('touchstart', onTouchStart); canvas.removeEventListener('touchend', onTouchEnd); };
  }, [running, playerShoot]);

  useEffect(() => {
    if (!running) { cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.height = 300;
        canvas.width = Math.max(300, Math.floor(300 * (parent.clientWidth / parent.clientHeight)));
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    reset();

    const loop = () => {
      const W = canvas.width;
      const s = stateRef.current;
      s.frameCount++;
      s.dist += s.speed * 0.05;
      s.speed = 4 + Math.floor(s.dist / 80) * 0.5;
      const enemyBulletSpeed = 5.5 + Math.floor(s.dist / 100) * 0.6;
      const droneExtraSpeed = 2.5 + Math.floor(s.dist / 60) * 0.4;

      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, W, 300);

      // Grid
      ctx.strokeStyle = 'rgba(83,74,183,0.1)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < LANES; i++) { ctx.beginPath(); ctx.moveTo(0, i * LH); ctx.lineTo(W, i * LH); ctx.stroke(); }
      const scroll = (s.frameCount * s.speed * 0.35) % 60;
      ctx.strokeStyle = 'rgba(83,74,183,0.05)';
      for (let x = -scroll; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke(); }

      s.player.y += (s.player.targetY - s.player.y) * 0.18;
      if (s.player.flashTimer > 0) s.player.flashTimer--;
      if (s.reloadTimer > 0) {
        s.reloadTimer--;
        if (s.reloadTimer === 0) { s.ammo = MAX_AMMO; onAmmoUpdate(s.ammo); }
      }

      const spawnRate = Math.max(30, 80 - Math.floor(s.dist / 60) * 4);
      s.spawnTimer++;
      if (s.spawnTimer >= spawnRate) {
        s.spawnTimer = 0;
        if (Math.random() < 0.72) {
          const lane = Math.floor(Math.random() * 3);
          const type = Math.random() < 0.48 ? 'drone' : 'turret';
          s.obstacles.push({
            x: W + 30, lane, y: LC[lane],
            w: type === 'drone' ? 28 : 24,
            h: type === 'drone' ? 16 : 28,
            type, hp: type === 'turret' ? 2 : 1,
            shootTimer: type === 'turret' ? Math.floor(Math.random() * 60) + 10 : 9999,
            pulse: 0, hitFlash: 0,
          });
        } else {
          const lane = Math.floor(Math.random() * 3);
          s.shards.push({ x: W + 20, lane, y: LC[lane], r: 7, collected: false });
        }
        if (Math.random() < 0.32) {
          const lane = Math.floor(Math.random() * 3);
          s.shards.push({ x: W + 20, lane, y: LC[lane], r: 7, collected: false });
        }
      }

      s.obstacles.forEach(o => {
        if (o.hp <= 0) return;
        o.x -= s.speed;
        if (o.type === 'drone') o.x -= droneExtraSpeed;
        if (o.type === 'turret') {
          o.shootTimer--;
          const fireRate = Math.max(40, 90 - Math.floor(s.dist / 100) * 7);
          if (o.shootTimer <= 0) {
            o.shootTimer = fireRate;
            s.enemyBullets.push({ x: o.x - o.w / 2 - 16, y: o.y, speed: enemyBulletSpeed });
          }
        }
      });

      s.bullets.forEach(b => { b.x += b.speed; });
      s.enemyBullets.forEach(b => { b.x -= b.speed; });
      s.shards.forEach(sh => { sh.x -= s.speed; });
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
      s.floatTexts.forEach(ft => { ft.y += ft.vy; ft.life -= 0.022; });
      s.explosions.forEach(exp => {
        exp.life -= 0.025;
        exp.rings.forEach(ring => { ring.r += (ring.maxR - ring.r) * 0.12; ring.life -= 0.04; });
        exp.shards.forEach(sh => { sh.x += sh.vx; sh.y += sh.vy; sh.vx *= 0.93; sh.vy *= 0.93; sh.rot += sh.rotSpeed; sh.life -= 0.028; });
      });

      s.bullets = s.bullets.filter(b => b.x < W + 20);
      s.enemyBullets = s.enemyBullets.filter(b => b.x > -20);
      s.obstacles = s.obstacles.filter(o => o.x > -60);
      s.shards = s.shards.filter(sh => sh.x > -20);
      s.particles = s.particles.filter(p => p.life > 0);
      s.explosions = s.explosions.filter(e => e.life > 0);
      s.floatTexts = s.floatTexts.filter(ft => ft.life > 0);

      // Bullet-obstacle collisions
      s.bullets.forEach(b => {
        s.obstacles.forEach(o => {
          if (o.hp <= 0) return;
          if (Math.abs(b.x - o.x) < o.w / 2 + 7 && Math.abs(b.y - o.y) < o.h / 2 + 7) {
            b.x = W + 100;
            o.hp--;
            o.hitFlash = 10;
            if (o.hp <= 0) {
              spawnExplosion(s, o.x, o.y, o.type);
              const pts = o.type === 'turret' ? 50 * s.mult : 25 * s.mult;
              s.score += pts;
              s.floatTexts.push({ x: o.x, y: o.y - 20, text: '+' + pts, color: o.type === 'turret' ? '#EF9F27' : '#F0997B', life: 1, vy: -1.2 });
              s.multTimer = 200;
              s.mult = Math.min(s.mult + 1, 8);
              onMultUpdate(s.mult);
            } else {
              addParticles(s, o.x, o.y, '#EF9F27', 5);
            }
          }
        });
      });

      // Player-obstacle collisions
      s.obstacles.forEach(o => {
        if (o.hp <= 0) return;
        if (Math.abs(PX - o.x) < o.w / 2 + 13 && Math.abs(s.player.y - o.y) < o.h / 2 + 10) {
          spawnExplosion(s, o.x, o.y, o.type);
          o.hp = 0;
          if (s.player.flashTimer <= 0) {
            s.player.flashTimer = 55;
            addParticles(s, PX, s.player.y, '#E24B4A', 10);
            s.lives--;
            s.mult = 1; s.multTimer = 0;
            onLivesUpdate(s.lives);
            onMultUpdate(1);
            if (s.lives <= 0) { onGameOver(s.score, Math.floor(s.dist)); return; }
          }
        }
      });

      // Enemy bullet-player collisions
      s.enemyBullets.forEach(b => {
        if (Math.abs(b.x - PX) < 16 && Math.abs(b.y - s.player.y) < 14) {
          addParticles(s, b.x, b.y, '#E24B4A', 8);
          b.x = -100;
          if (s.player.flashTimer <= 0) {
            s.player.flashTimer = 55;
            addParticles(s, PX, s.player.y, '#E24B4A', 10);
            s.lives--;
            s.mult = 1; s.multTimer = 0;
            onLivesUpdate(s.lives);
            onMultUpdate(1);
            if (s.lives <= 0) { onGameOver(s.score, Math.floor(s.dist)); return; }
          }
        }
      });

      // Shard collection
      s.shards.forEach(sh => {
        if (sh.collected) return;
        if (Math.abs(PX - sh.x) < 20 && Math.abs(s.player.y - sh.y) < 20) {
          sh.collected = true;
          addParticles(s, sh.x, sh.y, '#7F77DD', 8);
          s.score += 10 * s.mult;
          s.multTimer = 180;
          s.mult = Math.min(s.mult + 1, 8);
          onMultUpdate(s.mult);
        }
      });

      s.score += Math.floor(s.speed * 0.1);
      if (s.multTimer > 0) { s.multTimer--; if (s.multTimer === 0) { s.mult = Math.max(1, s.mult - 1); onMultUpdate(s.mult); } }

      s.signalTimer++;
      if (s.signalTimer > 300) { s.signalTimer = 0; onSignal(SIGNALS[s.signalIdx % SIGNALS.length]); s.signalIdx++; }

      onScoreUpdate(s.score);
      onDistUpdate(Math.floor(s.dist));

      // Draw obstacles
      s.obstacles.forEach(o => {
        if (o.hp <= 0) return;
        o.pulse = ((o.pulse || 0) + 0.07) % (Math.PI * 2);
        const flash = o.hitFlash > 0 && Math.floor(o.hitFlash / 3) % 2 === 0;
        if (o.type === 'drone') {
          ctx.fillStyle = flash ? '#ffaa88' : '#993C1D';
          ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
          ctx.fillStyle = flash ? 'rgba(255,180,120,0.4)' : 'rgba(216,90,48,0.25)';
          ctx.fillRect(o.x - o.w / 2 - 5, o.y - 3, o.w + 10, 6);
          ctx.fillStyle = flash ? '#ffeecc' : '#E24B4A';
          ctx.fillRect(o.x - 3, o.y - 3, 6, 6);
          const tf = Math.sin(o.pulse * 4) * 3;
          ctx.fillStyle = 'rgba(239,159,39,0.7)';
          ctx.beginPath();
          ctx.moveTo(o.x - o.w / 2, o.y - 3);
          ctx.lineTo(o.x - o.w / 2 - 8 - tf, o.y);
          ctx.lineTo(o.x - o.w / 2, o.y + 3);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.fillStyle = flash ? '#ffaa66' : '#712B13';
          ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
          ctx.fillStyle = flash ? 'rgba(255,160,80,0.5)' : '#993C1D';
          ctx.fillRect(o.x - o.w / 2 + 3, o.y - 4, o.w - 6, 8);
          ctx.strokeStyle = flash ? '#ffddaa' : '#E24B4A';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(o.x - o.w / 2, o.y); ctx.lineTo(o.x - o.w / 2 - 16, o.y); ctx.stroke();
          if (o.hp === 2) {
            ctx.fillStyle = 'rgba(226,75,74,0.6)';
            ctx.beginPath(); ctx.arc(o.x, o.y - o.h / 2 - 5, 4, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (o.hitFlash > 0) o.hitFlash--;
      });

      // Draw shards
      s.shards.forEach(sh => {
        if (sh.collected) return;
        ctx.fillStyle = '#7F77DD';
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y - sh.r);
        ctx.lineTo(sh.x + sh.r * 0.6, sh.y);
        ctx.lineTo(sh.x, sh.y + sh.r);
        ctx.lineTo(sh.x - sh.r * 0.6, sh.y);
        ctx.closePath(); ctx.fill();
      });

      // Draw player bullets
      s.bullets.forEach(b => {
        ctx.fillStyle = '#9FE1CB';
        ctx.beginPath(); ctx.ellipse(b.x, b.y, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(159,225,203,0.25)';
        ctx.beginPath(); ctx.ellipse(b.x - 5, b.y, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
      });

      // Draw enemy bullets
      s.enemyBullets.forEach(b => {
        ctx.fillStyle = '#E24B4A';
        ctx.beginPath(); ctx.ellipse(b.x, b.y, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(226,75,74,0.25)';
        ctx.beginPath(); ctx.ellipse(b.x + 5, b.y, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
      });

      // Draw explosions
      s.explosions.forEach(exp => {
        exp.rings.forEach(ring => {
          ctx.globalAlpha = Math.max(0, ring.life * 0.55);
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2); ctx.stroke();
        });
        exp.shards.forEach(sh => {
          ctx.globalAlpha = Math.max(0, sh.life);
          ctx.save();
          ctx.translate(sh.x, sh.y);
          ctx.rotate(sh.rot);
          ctx.fillStyle = sh.color;
          ctx.fillRect(-sh.size / 2, -sh.size / 2, sh.size, sh.size);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
      });

      // Draw particles
      s.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw float texts
      s.floatTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = '500 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';

      // Draw player
      const py = s.player.y;
      if (!(s.player.flashTimer > 0 && Math.floor(s.player.flashTimer / 4) % 2 === 0)) {
        ctx.fillStyle = '#1D9E75';
        ctx.beginPath();
        ctx.moveTo(PX + 18, py); ctx.lineTo(PX - 10, py - 12); ctx.lineTo(PX - 6, py); ctx.lineTo(PX - 10, py + 12);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(29,158,117,0.13)';
        ctx.beginPath(); ctx.arc(PX, py, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(29,158,117,0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(PX, py, 22, 0, Math.PI * 2); ctx.stroke();
      }

      // Reload bar
      if (s.reloadTimer > 0) {
        const pct = 1 - s.reloadTimer / 85;
        ctx.fillStyle = 'rgba(83,74,183,0.18)';
        ctx.fillRect(PX - 22, py + 26, 44, 4);
        ctx.fillStyle = '#534AB7';
        ctx.fillRect(PX - 22, py + 26, 44 * pct, 4);
      }

      // Auto-shoot if space held
      if (keysRef.current[' '] || keysRef.current['f'] || keysRef.current['F']) {
        if (s.ammo > 0 && s.reloadTimer <= 0 && s.frameCount % 8 === 0) playerShoot();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animRef.current);
    };
  }, [running, reset, onScoreUpdate, onSignal, onGameOver, onAmmoUpdate, onLivesUpdate, onMultUpdate, onDistUpdate, playerShoot]);

  return (
    <canvas
      ref={canvasRef}
      id="gc"
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
    />
  );
}
