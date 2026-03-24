import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Game2D from './Game2D';

const LANES = [-3, 0, 3];
const MAX_AMMO = 6;
const MAX_OBSTACLES = 30;
const MAX_BULLETS = 20;
const MAX_ENEMY_BULLETS = 30;
const MAX_SHARDS = 15;
const MAX_PARTICLES = 50;
const MAX_EXPLOSIONS = 8;

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

function RendererBooting() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        color: '#b8b4cc',
        fontSize: '0.9rem',
        textAlign: 'center',
        padding: '1rem',
      }}
    >
      Initializing renderer...
    </div>
  );
}

type GameCanvasErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: () => void;
};

type GameCanvasErrorBoundaryState = {
  hasError: boolean;
};

class GameCanvasErrorBoundary extends React.Component<GameCanvasErrorBoundaryProps, GameCanvasErrorBoundaryState> {
  state: GameCanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameCanvasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('WebGL canvas failed to initialize:', error);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  try {
    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

function GridTunnel({ stateRef }: { stateRef: React.MutableRefObject<any> }) {
  const gridRef = useRef<THREE.GridHelper>(null);
  
  useFrame(() => {
    if (gridRef.current && stateRef.current) {
      gridRef.current.position.z = (stateRef.current.frameCount * stateRef.current.speed * 0.05) % 10;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <gridHelper ref={gridRef} args={[100, 100, 0x534AB7, 0x534AB7]} position={[0, 0, -40]} />
    </group>
  );
}

function InstancedObstacles({ stateRef }: { stateRef: React.MutableRefObject<any> }) {
  const droneRef = useRef<THREE.InstancedMesh>(null);
  const turretRef = useRef<THREE.InstancedMesh>(null);
  const blockerRef = useRef<THREE.InstancedMesh>(null);
  
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const droneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#D85A30' }), []);
  const turretMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#E24B4A' }), []);
  const blockerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#333344', roughness: 0.9 }), []);

  useFrame(() => {
    const s = stateRef.current;
    if (!s) return;

    let droneIdx = 0;
    let turretIdx = 0;
    let blockerIdx = 0;

    s.obstacles.forEach((o: any) => {
      if (o.hp <= 0) return;
      
      tempMatrix.makeTranslation(o.x, o.y, o.z);
      
      if (o.type === 'drone' && droneRef.current && droneIdx < MAX_OBSTACLES) {
        droneRef.current.setMatrixAt(droneIdx, tempMatrix);
        tempColor.set(o.hitFlash > 0 ? '#ffaa88' : '#D85A30');
        droneRef.current.setColorAt(droneIdx, tempColor);
        droneIdx++;
      } else if (o.type === 'turret' && turretRef.current && turretIdx < MAX_OBSTACLES) {
        tempMatrix.makeTranslation(o.x, o.y + 0.5, o.z);
        turretRef.current.setMatrixAt(turretIdx, tempMatrix);
        tempColor.set(o.hitFlash > 0 ? '#ffaa66' : '#E24B4A');
        turretRef.current.setColorAt(turretIdx, tempColor);
        turretIdx++;
      } else if (o.type === 'blocker' && blockerRef.current && blockerIdx < MAX_OBSTACLES) {
        tempMatrix.makeTranslation(o.x, o.y + 2, o.z);
        tempMatrix.multiply(new THREE.Matrix4().makeRotationY(s.frameCount * 0.05));
        blockerRef.current.setMatrixAt(blockerIdx, tempMatrix);
        blockerIdx++;
      }
    });

    if (droneRef.current) {
      for (let i = droneIdx; i < MAX_OBSTACLES; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        droneRef.current.setMatrixAt(i, tempMatrix);
      }
      droneRef.current.instanceMatrix.needsUpdate = true;
      if (droneRef.current.instanceColor) droneRef.current.instanceColor.needsUpdate = true;
    }
    
    if (turretRef.current) {
      for (let i = turretIdx; i < MAX_OBSTACLES; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        turretRef.current.setMatrixAt(i, tempMatrix);
      }
      turretRef.current.instanceMatrix.needsUpdate = true;
      if (turretRef.current.instanceColor) turretRef.current.instanceColor.needsUpdate = true;
    }

    if (blockerRef.current) {
      for (let i = blockerIdx; i < MAX_OBSTACLES; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        blockerRef.current.setMatrixAt(i, tempMatrix);
      }
      blockerRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={droneRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <coneGeometry args={[0.6, 1.5, 6]} />
        <primitive object={droneMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={turretRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <cylinderGeometry args={[0.8, 1, 1.5, 8]} />
        <primitive object={turretMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={blockerRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <cylinderGeometry args={[0.5, 1.2, 5, 4]} />
        <primitive object={blockerMat} attach="material" />
      </instancedMesh>
    </>
  );
}

function InstancedBullets({ stateRef }: { stateRef: React.MutableRefObject<any> }) {
  const playerBulletRef = useRef<THREE.InstancedMesh>(null);
  const enemyBulletRef = useRef<THREE.InstancedMesh>(null);
  
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  
  const bulletMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9FE1CB' }), []);
  const enemyBulletMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#E24B4A' }), []);

  useFrame(() => {
    const s = stateRef.current;
    if (!s) return;

    if (playerBulletRef.current) {
      let idx = 0;
      s.bullets.forEach((b: any) => {
        if (idx < MAX_BULLETS) {
          tempMatrix.makeTranslation(b.x, b.y, b.z);
          playerBulletRef.current!.setMatrixAt(idx, tempMatrix);
          idx++;
        }
      });
      for (let i = idx; i < MAX_BULLETS; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        playerBulletRef.current.setMatrixAt(i, tempMatrix);
      }
      playerBulletRef.current.instanceMatrix.needsUpdate = true;
    }

    if (enemyBulletRef.current) {
      let idx = 0;
      s.enemyBullets.forEach((b: any) => {
        if (idx < MAX_ENEMY_BULLETS) {
          tempMatrix.makeTranslation(b.x, b.y, b.z);
          enemyBulletRef.current!.setMatrixAt(idx, tempMatrix);
          idx++;
        }
      });
      for (let i = idx; i < MAX_ENEMY_BULLETS; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        enemyBulletRef.current.setMatrixAt(i, tempMatrix);
      }
      enemyBulletRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={playerBulletRef} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <primitive object={bulletMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={enemyBulletRef} args={[undefined, undefined, MAX_ENEMY_BULLETS]} frustumCulled={false}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <primitive object={enemyBulletMat} attach="material" />
      </instancedMesh>
    </>
  );
}

function InstancedShards({ stateRef }: { stateRef: React.MutableRefObject<any> }) {
  const shardRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const shardMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#7F77DD', 
    emissive: '#7F77DD', 
    emissiveIntensity: 0.8 
  }), []);

  useFrame(() => {
    const s = stateRef.current;
    if (!s || !shardRef.current) return;

    let idx = 0;
    s.shards.forEach((sh: any) => {
      if (!sh.collected && idx < MAX_SHARDS) {
        tempMatrix.makeTranslation(sh.x, sh.y, sh.z);
        tempMatrix.multiply(new THREE.Matrix4().makeRotationY(sh.z));
        shardRef.current!.setMatrixAt(idx, tempMatrix);
        idx++;
      }
    });
    
    for (let i = idx; i < MAX_SHARDS; i++) {
      tempMatrix.makeTranslation(0, -1000, 0);
      shardRef.current.setMatrixAt(i, tempMatrix);
    }
    shardRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={shardRef} args={[undefined, undefined, MAX_SHARDS]} frustumCulled={false}>
      <octahedronGeometry args={[0.4]} />
      <primitive object={shardMat} attach="material" />
    </instancedMesh>
  );
}

function InstancedParticles({ stateRef }: { stateRef: React.MutableRefObject<any> }) {
  const particleRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempScale = useMemo(() => new THREE.Matrix4(), []);
  const particleMat = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: '#EF9F27',
    transparent: true,
    opacity: 0.8
  }), []);

  useFrame(() => {
    const s = stateRef.current;
    if (!s || !particleRef.current) return;

    let idx = 0;
    s.particles.forEach((p: any) => {
      if (idx < MAX_PARTICLES && p.life > 0) {
        tempMatrix.makeTranslation(p.x, p.y, p.z);
        tempScale.makeScale(p.life, p.life, p.life);
        tempMatrix.multiply(tempScale);
        particleRef.current!.setMatrixAt(idx, tempMatrix);
        idx++;
      }
    });
    
    for (let i = idx; i < MAX_PARTICLES; i++) {
      tempMatrix.makeTranslation(0, -1000, 0);
      particleRef.current.setMatrixAt(i, tempMatrix);
    }
    particleRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={particleRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <primitive object={particleMat} attach="material" />
    </instancedMesh>
  );
}

function InstancedExplosions({ stateRef }: { stateRef: React.MutableRefObject<any> }) {
  const explosionRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempScale = useMemo(() => new THREE.Matrix4(), []);
  const explosionMat = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: '#EF9F27',
    transparent: true,
    opacity: 0.6
  }), []);

  useFrame(() => {
    const s = stateRef.current;
    if (!s || !explosionRef.current) return;

    let idx = 0;
    s.explosions.forEach((ex: any) => {
      if (idx < MAX_EXPLOSIONS && ex.life > 0) {
        const scale = 4 - ex.life * 3;
        tempMatrix.makeTranslation(ex.x, ex.y, ex.z);
        tempScale.makeScale(scale, scale, scale);
        tempMatrix.multiply(tempScale);
        explosionRef.current!.setMatrixAt(idx, tempMatrix);
        idx++;
      }
    });
    
    for (let i = idx; i < MAX_EXPLOSIONS; i++) {
      tempMatrix.makeTranslation(0, -1000, 0);
      explosionRef.current.setMatrixAt(i, tempMatrix);
    }
    explosionRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={explosionRef} args={[undefined, undefined, MAX_EXPLOSIONS]} frustumCulled={false}>
      <torusGeometry args={[0.5, 0.1, 6, 12]} />
      <primitive object={explosionMat} attach="material" />
    </instancedMesh>
  );
}

function Player({ stateRef }: { stateRef: React.MutableRefObject<any> }) {
  const playerRef = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(true);
  
  const playerMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#1D9E75', 
    emissive: '#1D9E75', 
    emissiveIntensity: 0.5 
  }), []);

  useFrame(() => {
    const s = stateRef.current;
    if (!s || !playerRef.current) return;

    playerRef.current.position.x = s.player.x;
    const tilt = (s.player.targetX - s.player.x) * 0.1;
    playerRef.current.rotation.z = -tilt;
    
    const shouldBeVisible = !(s.player.flashTimer > 0 && Math.floor(s.player.flashTimer / 4) % 2 === 0);
    if (visible !== shouldBeVisible) {
      setVisible(shouldBeVisible);
    }
  });

  return (
    <group ref={playerRef} visible={visible}>
      <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 2, 6]} />
        <primitive object={playerMat} attach="material" />
      </mesh>
      <mesh position={[0, 0, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.8, 6]} />
        <primitive object={playerMat} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[2.5, 0.8, 0.1]} />
        <primitive object={playerMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.25, -0.5]}>
        <boxGeometry args={[0.3, 0.3, 0.6]} />
        <meshStandardMaterial color="#33ccff" emissive="#00aaaa" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.3, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.05, 0.2, 6]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      <mesh position={[0.3, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.05, 0.2, 6]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
    </group>
  );
}

function FrameLimiter() {
  const { gl } = useThree();
  
  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  }, [gl]);
  
  return null;
}

function Scene({ onScoreUpdate, onSignal, onGameOver, onAmmoUpdate, onLivesUpdate, onMultUpdate, onDistUpdate, running }: GameProps) {
  const stateRef = useRef<any>({
    player: { lane: 1, x: LANES[1], targetX: LANES[1], flashTimer: 0 },
    obstacles: [],
    shards: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    explosions: [],
    score: 0, dist: 0, mult: 1, multTimer: 0,
    lives: 3, ammo: MAX_AMMO, reloadTimer: 0,
    speed: 4, frameCount: 0, spawnTimer: 0,
    signalTimer: 0, signalIdx: 0,
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (running) {
      stateRef.current = {
        player: { lane: 1, x: LANES[1], targetX: LANES[1], flashTimer: 0 },
        obstacles: [], shards: [], bullets: [], enemyBullets: [], particles: [], explosions: [],
        score: 0, dist: 0, mult: 1, multTimer: 0,
        lives: 3, ammo: MAX_AMMO, reloadTimer: 0,
        speed: 4, frameCount: 0, spawnTimer: 0,
        signalTimer: 0, signalIdx: 0,
      };
    }
  }, [running]);

  const playerShoot = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.ammo <= 0 || s.reloadTimer > 0) return;
    if (s.bullets.length < MAX_BULLETS) {
      s.bullets.push({ x: s.player.x, y: 0, z: -2, speed: 0.8 });
      s.ammo--;
      if (s.ammo <= 0) s.reloadTimer = 85;
      onAmmoUpdate(s.ammo);
    }
  }, [onAmmoUpdate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      keysRef.current[e.key] = e.type === 'keydown';
      const s = stateRef.current;
      if (!s || !running) return;
      if (e.type === 'keydown') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          s.player.lane = Math.max(0, s.player.lane - 1);
          s.player.targetX = LANES[s.player.lane];
          e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          s.player.lane = Math.min(2, s.player.lane + 1);
          s.player.targetX = LANES[s.player.lane];
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
    let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const s = stateRef.current;
      if (!s || !running) return;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dt = Date.now() - touchStartTime;
      if (Math.abs(dy) < 12 && Math.abs(dx) < 12 && dt < 220) { playerShoot(); }
      else if (dx < -20) { s.player.lane = Math.max(0, s.player.lane - 1); s.player.targetX = LANES[s.player.lane]; }
      else if (dx > 20) { s.player.lane = Math.min(2, s.player.lane + 1); s.player.targetX = LANES[s.player.lane]; }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchend', onTouchEnd); };
  }, [running, playerShoot]);

  const addExplosion = useCallback((x: number, y: number, z: number) => {
    const s = stateRef.current;
    if (s.explosions.length < MAX_EXPLOSIONS) {
      s.explosions.push({ id: Math.random(), x, y, z, life: 1 });
    }

    const particlesToAdd = Math.min(8, MAX_PARTICLES - s.particles.length);
    for (let i = 0; i < particlesToAdd; i++) {
      s.particles.push({
        id: Math.random(),
        x, y, z,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        vz: (Math.random() - 0.5) * 0.8,
        life: 1,
      });
    }
  }, []);

  useFrame((_, delta) => {
    if (!running) return;
    const s = stateRef.current;

    s.frameCount++;
    s.dist += s.speed * 0.05;
    s.speed = 6 + Math.floor(s.dist / 70) * 0.8;
    const baseSpeedZ = s.speed * 0.04;
    const enemyBulletSpeed = baseSpeedZ + 0.15;
    const droneExtraSpeed = baseSpeedZ * 1.5;

    s.player.x += (s.player.targetX - s.player.x) * 0.18;
    if (s.player.flashTimer > 0) s.player.flashTimer--;
    if (s.reloadTimer > 0) {
      s.reloadTimer--;
      if (s.reloadTimer === 0) { s.ammo = MAX_AMMO; onAmmoUpdate(s.ammo); }
    }

    if (keysRef.current[' '] || keysRef.current['f'] || keysRef.current['F']) {
      if (s.ammo > 0 && s.reloadTimer <= 0 && s.frameCount % 8 === 0) playerShoot();
    }

    const spawnRate = Math.max(25, 60 - Math.floor(s.dist / 50) * 5);
    s.spawnTimer++;
    if (s.spawnTimer >= spawnRate && s.obstacles.length < MAX_OBSTACLES) {
      s.spawnTimer = 0;
      if (Math.random() < 0.82) {
        const lane = Math.floor(Math.random() * 3);
        const typeRand = Math.random();
        let type = 'drone';
        if (typeRand > 0.75) type = 'turret';
        else if (typeRand > 0.45) type = 'blocker';

        s.obstacles.push({
          id: s.frameCount,
          x: LANES[lane], y: 0, z: -40, type,
          hp: type === 'turret' ? 2 : type === 'blocker' ? 999 : 1,
          shootTimer: type === 'turret' ? Math.floor(Math.random() * 60) + 10 : 9999,
          hitFlash: 0
        });
      } else if (s.shards.length < MAX_SHARDS) {
        const lane = Math.floor(Math.random() * 3);
        s.shards.push({ id: s.frameCount, x: LANES[lane], y: 0, z: -40 });
      }
    }

    s.obstacles.forEach((o: any) => {
      if (o.type === 'drone') o.z += droneExtraSpeed;
      else o.z += baseSpeedZ;

      if (o.type === 'turret') {
        o.shootTimer--;
        const fireRate = Math.max(25, 75 - Math.floor(s.dist / 90) * 8);
        if (o.shootTimer <= 0 && o.hp > 0 && s.enemyBullets.length < MAX_ENEMY_BULLETS) {
          o.shootTimer = fireRate;
          s.enemyBullets.push({ id: Math.random(), x: o.x, y: 0, z: o.z + 1, speed: enemyBulletSpeed });
        }
      }
      if (o.hitFlash > 0) o.hitFlash--;
    });

    s.bullets.forEach((b: any) => b.z -= b.speed);
    s.enemyBullets.forEach((b: any) => b.z += b.speed);
    s.shards.forEach((sh: any) => sh.z += baseSpeedZ);
    s.particles.forEach((p: any) => { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.life -= 0.04; });
    s.explosions.forEach((ex: any) => { ex.life -= 0.05; ex.z += baseSpeedZ; });

    s.bullets.forEach((b: any) => {
      s.obstacles.forEach((o: any) => {
        if (o.hp > 0 && Math.abs(b.z - o.z) < 1.5 && Math.abs(b.x - o.x) < 1) {
          b.z = -100;
          o.hp--;
          o.hitFlash = 10;
          if (o.hp <= 0) {
            addExplosion(o.x, o.y, o.z);
            const pts = o.type === 'turret' ? 50 * s.mult : 25 * s.mult;
            s.score += pts;
            s.multTimer = 200;
            s.mult = Math.min(s.mult + 1, 8);
            onMultUpdate(s.mult);
          }
        }
      });
    });

    s.obstacles.forEach((o: any) => {
      if (o.hp > 0 && Math.abs(0 - o.z) < 1 && Math.abs(s.player.x - o.x) < 1.0) {
        o.hp = 0;
        addExplosion(o.x, o.y, o.z);
        if (s.player.flashTimer <= 0) {
          s.player.flashTimer = 55;
          addExplosion(s.player.x, 0, 0);
          s.lives--;
          s.mult = 1; s.multTimer = 0;
          onLivesUpdate(s.lives);
          onMultUpdate(1);
          if (s.lives <= 0) { onGameOver(s.score, Math.floor(s.dist)); return; }
        }
      }
    });

    s.enemyBullets.forEach((b: any) => {
      if (Math.abs(0 - b.z) < 1 && Math.abs(s.player.x - b.x) < 1.0) {
        b.z = 100;
        if (s.player.flashTimer <= 0) {
          s.player.flashTimer = 55;
          addExplosion(s.player.x, 0, 0);
          s.lives--;
          s.mult = 1; s.multTimer = 0;
          onLivesUpdate(s.lives);
          onMultUpdate(1);
          if (s.lives <= 0) { onGameOver(s.score, Math.floor(s.dist)); return; }
        }
      }
    });

    s.shards.forEach((sh: any) => {
      if (!sh.collected && Math.abs(0 - sh.z) < 1.5 && Math.abs(s.player.x - sh.x) < 1.0) {
        sh.collected = true;
        addExplosion(sh.x, sh.y, sh.z);
        s.score += 10 * s.mult;
        s.multTimer = 180;
        s.mult = Math.min(s.mult + 1, 8);
        onMultUpdate(s.mult);
      }
    });

    s.obstacles = s.obstacles.filter((o: any) => o.z < 5 && o.hp > 0);
    s.bullets = s.bullets.filter((b: any) => b.z > -40);
    s.enemyBullets = s.enemyBullets.filter((b: any) => b.z < 5);
    s.shards = s.shards.filter((sh: any) => sh.z < 5 && !sh.collected);
    s.particles = s.particles.filter((p: any) => p.life > 0);
    s.explosions = s.explosions.filter((ex: any) => ex.life > 0);

    s.score += Math.floor(s.speed * 0.1);
    if (s.multTimer > 0) { s.multTimer--; if (s.multTimer === 0) { s.mult = Math.max(1, s.mult - 1); onMultUpdate(s.mult); } }

    s.signalTimer++;
    if (s.signalTimer > 300) { s.signalTimer = 0; onSignal(SIGNALS[s.signalIdx % SIGNALS.length]); s.signalIdx++; }

    const now = performance.now();
    if (now - lastUpdateRef.current > 50) {
      lastUpdateRef.current = now;
      onScoreUpdate(s.score);
      onDistUpdate(Math.floor(s.dist));
    }
  });

  return (
    <>
      <color attach="background" args={['#0a0b10']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} color="#ccaaff" />
      <pointLight position={[0, 5, -20]} intensity={1.5} color="#EF9F27" distance={50} />

      <FrameLimiter />
      <GridTunnel stateRef={stateRef} />
      <Player stateRef={stateRef} />
      <InstancedObstacles stateRef={stateRef} />
      <InstancedBullets stateRef={stateRef} />
      <InstancedShards stateRef={stateRef} />
      <InstancedParticles stateRef={stateRef} />
      <InstancedExplosions stateRef={stateRef} />
    </>
  );
}

export default function Game(props: GameProps) {
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean | null>(null);
  const [useCompatMode, setUseCompatMode] = useState(false);

  useEffect(() => {
    setIsWebGLSupported(supportsWebGL());
  }, []);

  if (isWebGLSupported === null) return <RendererBooting />;
  if (!isWebGLSupported || useCompatMode) return <Game2D {...props} />;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GameCanvasErrorBoundary
        fallback={<Game2D {...props} />}
        onError={() => setUseCompatMode(true)}
      >
        <Canvas
          camera={{ position: [0, 4, 8], fov: 60, rotation: [-0.2, 0, 0] }}
          dpr={[1, 1.25]}
          gl={{
            antialias: false,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: 'low-power',
            precision: 'mediump',
          }}
        >
          <Scene {...props} />
        </Canvas>
      </GameCanvasErrorBoundary>
    </div>
  );
}
