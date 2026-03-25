import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameEngine } from './GameEngine';
import type { LevelConfig } from './levels';
import { GameState, Star, Nebula, Planet } from './types';

const MAX_STARS = 700;
const MAX_OBSTACLES = 60;
const MAX_PROJECTILES = 70;
const MAX_PARTICLES = 120;
const MAX_POWERUPS = 8;
const MAX_EXPLOSIONS = 20;

function generateStars(count: number, palette: string[]): Star[] {
  const colors = palette.length ? palette : ['#ffffff', '#aaccff', '#ffddaa', '#ffaaaa', '#aaffaa'];
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 300,
    y: (Math.random() - 0.5) * 150,
    z: -150 + Math.random() * 200,
    size: 0.05 + Math.random() * 0.18,
    brightness: 0.3 + Math.random() * 0.7,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

function generateNebulae(): Nebula[] {
  const colors = ['#6633ff', '#ff3366', '#33ff99', '#ff9933', '#3399ff', '#ff66aa', '#66ffcc'];
  return Array.from({ length: 8 }, (_, i) => ({
    x: (Math.random() - 0.5) * 120,
    y: (Math.random() - 0.5) * 60,
    z: -100 - i * 18,
    size: 30 + Math.random() * 45,
    color: colors[i % colors.length],
    opacity: 0.06 + Math.random() * 0.08,
    rotation: Math.random() * Math.PI * 2,
  }));
}

function generatePlanets(): Planet[] {
  const colors = ['#cc8844', '#4488cc', '#88cc44', '#cc4488', '#44cccc', '#8844cc'];
  return Array.from({ length: 5 }, (_, i) => ({
    x: -60 + i * 30 + (Math.random() - 0.5) * 25,
    y: (Math.random() - 0.5) * 30,
    z: -140 - i * 35,
    size: 6 + Math.random() * 14,
    color: colors[i % colors.length],
    hasRings: Math.random() > 0.5,
    ringColor: '#aaaaaa',
  }));
}

function Starfield({
  gameSpeed,
  starColors,
  engine,
}: {
  gameSpeed: number;
  starColors: string[];
  /** When set (Earth), stars fade in as you leave the atmosphere */
  engine?: GameEngine;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const starKey = starColors.join(',');
  const stars = useMemo(() => generateStars(MAX_STARS, starColors), [starKey, starColors]);
  
  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(stars.length * 3);
    const col = new Float32Array(stars.length * 3);
    const siz = new Float32Array(stars.length);
    const color = new THREE.Color();
    
    stars.forEach((star, i) => {
      pos[i * 3] = star.x;
      pos[i * 3 + 1] = star.y;
      pos[i * 3 + 2] = star.z;
      color.set(star.color);
      col[i * 3] = color.r * star.brightness;
      col[i * 3 + 1] = color.g * star.brightness;
      col[i * 3 + 2] = color.b * star.brightness;
      siz[i] = star.size;
    });
    
    return [pos, col, siz];
  }, [stars]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    if (engine) {
      const p = engine.getState().introLaunchProgress;
      mat.opacity = 0.1 + 0.82 * p;
    } else {
      mat.opacity = 0.9;
    }
    
    for (let i = 0; i < stars.length; i++) {
      array[i * 3 + 2] += gameSpeed * 0.028;
      if (array[i * 3 + 2] > 60) {
        array[i * 3 + 2] = -150;
        array[i * 3] = (Math.random() - 0.5) * 300;
        array[i * 3 + 1] = (Math.random() - 0.5) * 150;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={stars.length} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={stars.length} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={stars.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={0.3} vertexColors sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

function Nebulae({ colors }: { colors: string[] }) {
  const nebulae = useMemo(() => generateNebulae(), []);
  
  return (
    <group>
      {nebulae.map((nebula, i) => (
        <mesh key={i} position={[nebula.x, nebula.y, nebula.z]} rotation={[0, 0, nebula.rotation]}>
          <planeGeometry args={[nebula.size, nebula.size]} />
          <meshBasicMaterial color={colors[i % colors.length] || nebula.color} transparent opacity={nebula.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function useEarthTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#1a2835');
    g.addColorStop(0.45, '#1e2d3a');
    g.addColorStop(1, '#141a22');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(68, 70, 74, ${0.3 + Math.random() * 0.45})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 1024, Math.random() * 512, 20 + Math.random() * 110, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(82, 80, 76, ${0.2 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 1024,
        Math.random() * 512,
        35 + Math.random() * 90,
        18 + Math.random() * 45,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(28, 32, 38, 0.42)';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = 'rgba(8, 10, 12, 0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 1024, Math.random() * 512);
      for (let j = 0; j < 4; j++) {
        ctx.lineTo(Math.random() * 1024, Math.random() * 512);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

function EarthDystopia({ engine }: { engine: GameEngine }) {
  const groupRef = useRef<THREE.Group>(null);
  const tex = useEarthTexture();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const s = engine.getState();
    const p = s.introActive ? s.introLaunchProgress : 1;
    groupRef.current.rotation.y = clock.elapsedTime * 0.004;
    // Start: large planet below — feels like low orbit; end: smaller, farther (escaping)
    const y = THREE.MathUtils.lerp(-2, -24, p);
    const z = THREE.MathUtils.lerp(-138, -228, p);
    const sc = THREE.MathUtils.lerp(1.32, 1, p);
    groupRef.current.position.set(0, y, z);
    groupRef.current.scale.setScalar(sc);
  });

  if (!tex) return null;

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[62, 56, 56]} />
        <meshStandardMaterial map={tex} roughness={0.94} metalness={0.06} />
      </mesh>
      <mesh scale={[1.012, 1.012, 1.012]}>
        <sphereGeometry args={[62, 40, 40]} />
        <meshBasicMaterial color="#2a3544" transparent opacity={0.14} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[1.055, 1.055, 1.055]}>
        <sphereGeometry args={[62, 28, 28]} />
        <meshBasicMaterial
          color="#3d4a5c"
          transparent
          opacity={0.22}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={[1.002, 1.002, 1.002]}>
        <sphereGeometry args={[62, 20, 20]} />
        <meshBasicMaterial color="#1a1e24" wireframe transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EarthAtmosphericHaze({ engine }: { engine: GameEngine }) {
  const gRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!gRef.current) return;
    const p = engine.getState().introActive ? engine.getState().introLaunchProgress : 1;
    gRef.current.position.y = THREE.MathUtils.lerp(-1.2, 1.5, p);
    gRef.current.position.z = THREE.MathUtils.lerp(-8, -22, p);
  });
  return (
    <group ref={gRef}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 2 - i * 1.2, -28 - i * 32]} rotation={[0.08 * i, 0.04 * i, 0]}>
          <planeGeometry args={[220, 120]} />
          <meshBasicMaterial color="#252a32" transparent opacity={0.035 + i * 0.018} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function EarthSmogParticles({ gameSpeed }: { gameSpeed: number }) {
  const ref = useRef<THREE.Points>(null);
  const n = 180;
  const positions = useMemo(() => {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 140;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = -40 - Math.random() * 120;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const arr = (ref.current.geometry.attributes.position.array as Float32Array);
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 2] += gameSpeed * 0.018 + 0.04;
      arr[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.02;
      if (arr[i * 3 + 2] > 25) {
        arr[i * 3 + 2] = -160;
        arr[i * 3] = (Math.random() - 0.5) * 140;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 80;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={n} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.45}
        color="#6a7078"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function EarthSmogNebulae({ engine, gameSpeed }: { engine: GameEngine; gameSpeed: number }) {
  const smog = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 50,
        z: -55 - i * 14,
        size: 38 + Math.random() * 55,
        opacity: 0.04 + Math.random() * 0.06,
        rot: Math.random() * Math.PI * 2,
        seed: Math.random() * 1000,
      })),
    []
  );
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = engine.getState().introActive ? engine.getState().introLaunchProgress : 1;
    groupRef.current.position.z = THREE.MathUtils.lerp(4, -6, p);
    groupRef.current.position.y = THREE.MathUtils.lerp(-1.5, 0.8, p);
    groupRef.current.children.forEach((ch, i) => {
      const s = smog[i];
      if (!s) return;
      ch.position.z += gameSpeed * 0.012 + 0.05;
      if (ch.position.z > 20) ch.position.z = -120;
      ch.rotation.z = s.rot + clock.elapsedTime * 0.02 * (i % 2 + 1);
    });
  });
  return (
    <group ref={groupRef}>
      {smog.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation={[0.1, 0, s.rot]}>
          <planeGeometry args={[s.size, s.size * 0.55]} />
          <meshBasicMaterial color="#3a3e48" transparent opacity={s.opacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function EarthCloudLayers({ engine, gameSpeed }: { engine: GameEngine; gameSpeed: number }) {
  const layers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: (Math.random() - 0.5) * 160,
        y: -8 + Math.random() * 28,
        z: -35 - i * 18,
        w: 70 + Math.random() * 100,
        h: 35 + Math.random() * 50,
        op: 0.06 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
      })),
    []
  );
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const p = engine.getState().introActive ? engine.getState().introLaunchProgress : 1;
    ref.current.position.y = THREE.MathUtils.lerp(-4, -1, p);
    ref.current.children.forEach((mesh, i) => {
      const L = layers[i];
      if (!L) return;
      mesh.position.x += Math.sin(clock.elapsedTime * 0.15 + L.phase) * 0.02;
      mesh.position.z += gameSpeed * 0.022 + 0.06;
      if (mesh.position.z > 15) mesh.position.z = -140;
    });
  });
  return (
    <group ref={ref}>
      {layers.map((L, i) => (
        <mesh key={i} position={[L.x, L.y, L.z]} rotation={[-0.12, 0.02, 0.05]}>
          <planeGeometry args={[L.w, L.h]} />
          <meshBasicMaterial
            color="#4a5058"
            transparent
            opacity={L.op}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function EarthLaunchCameraFog({
  engine,
  active,
  fogColor,
  fogNearBase,
  fogFarBase,
}: {
  engine: GameEngine;
  active: boolean;
  fogColor: string;
  fogNearBase: number;
  fogFarBase: number;
}) {
  const { camera, scene } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!active) {
      camera.position.set(0, 6, 16);
      camera.lookAt(0, 0, -40);
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.set(fogColor);
        scene.fog.near = fogNearBase;
        scene.fog.far = fogFarBase;
      }
      return;
    }

    const s = engine.getState();
    const p = s.introLaunchProgress;
    const intro = s.introActive;

    const camY = THREE.MathUtils.lerp(2.85, 6, p);
    const camZ = THREE.MathUtils.lerp(9.8, 16, p);
    const sway = intro ? Math.sin(s.frameCount * 0.085) * 0.1 * (1 - p) : 0;
    const roll = intro ? Math.sin(s.frameCount * 0.06) * 0.02 * (1 - p) : 0;

    camera.position.set(sway, camY, camZ);
    camera.rotation.z = roll;

    const lookY = THREE.MathUtils.lerp(0.55, 0, p);
    const lookZ = THREE.MathUtils.lerp(-32, -48, p);
    look.set(0, lookY, lookZ);
    camera.lookAt(look);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(fogColor);
      scene.fog.near = THREE.MathUtils.lerp(22, fogNearBase, p);
      scene.fog.far = THREE.MathUtils.lerp(72, fogFarBase, p);
    }
  });

  return null;
}

function Planets() {
  const planets = useMemo(() => generatePlanets(), []);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.y += 0.001 * (i + 1);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {planets.map((planet, i) => (
        <group key={i} position={[planet.x, planet.y, planet.z]}>
          <mesh>
            <sphereGeometry args={[planet.size, 16, 16]} />
            <meshStandardMaterial color={planet.color} roughness={0.8} />
          </mesh>
          {planet.hasRings && (
            <mesh rotation={[Math.PI / 3, 0, 0]}>
              <torusGeometry args={[planet.size * 1.5, planet.size * 0.1, 2, 32]} />
              <meshStandardMaterial color={planet.ringColor} transparent opacity={0.5} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function PlayerShip({ state }: { state: GameState }) {
  const groupRef = useRef<THREE.Group>(null);
  const engineGlowRef = useRef<THREE.Mesh>(null);
  const laserBeamRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(true);
  const [shipScale, setShipScale] = useState(1);

  const { activeEffects } = state;

  const shipMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1D9E75',
    emissive: '#1D9E75',
    emissiveIntensity: 0.4,
    metalness: 0.7,
    roughness: 0.3,
  }), []);

  const ghostMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#aaaaff',
    emissive: '#6666ff',
    emissiveIntensity: 0.8,
    metalness: 0.7,
    roughness: 0.3,
    transparent: true,
    opacity: 0.5,
  }), []);

  const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#00ffff',
    transparent: true,
    opacity: 0.8,
  }), []);

  const laserMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#00ffff',
    transparent: true,
    opacity: 0.7,
  }), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const { player } = state;

    groupRef.current.position.x = player.position.x;
    groupRef.current.position.y = player.position.y;
    groupRef.current.rotation.z = player.rotation.z;
    groupRef.current.rotation.x = player.rotation.x;

    // Update scale based on size reduction
    const targetScale = activeEffects.sizeReduction ? 0.5 : 1;
    if (Math.abs(shipScale - targetScale) > 0.01) {
      setShipScale(shipScale + (targetScale - shipScale) * 0.1);
    }
    groupRef.current.scale.setScalar(shipScale);

    if (engineGlowRef.current) {
      const scale = activeEffects.speedBoost ? 1.5 : (0.8 + Math.sin(Date.now() * 0.01) * 0.2);
      engineGlowRef.current.scale.setScalar(scale);
    }

    // Laser beam pulsing
    if (laserBeamRef.current) {
      const pulse = 0.8 + Math.sin(Date.now() * 0.02) * 0.2;
      laserBeamRef.current.scale.x = pulse;
      laserBeamRef.current.scale.y = pulse;
    }

    const isGhostFlicker = activeEffects.ghostMode && Math.floor(Date.now() / 100) % 3 === 0;
    const isInvulnerableFlicker = player.invulnerableTimer > 0 && !activeEffects.ghostMode && Math.floor(player.invulnerableTimer / 4) % 2 === 0;
    const shouldBeVisible = !isInvulnerableFlicker && !isGhostFlicker;
    if (visible !== shouldBeVisible) setVisible(shouldBeVisible);
  });

  const currentMaterial = activeEffects.ghostMode ? ghostMaterial : shipMaterial;

  return (
    <group ref={groupRef} visible={visible}>
      {/* Main fuselage - sleek jet body */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.25, 3, 8]} />
        <primitive object={currentMaterial} attach="material" />
      </mesh>
      
      {/* Nose cone - sharp pointed jet nose */}
      <mesh position={[0, 0, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 1.2, 8]} />
        <primitive object={currentMaterial} attach="material" />
      </mesh>
      
      {/* Cockpit canopy */}
      <mesh position={[0, 0.18, -0.8]}>
        <boxGeometry args={[0.2, 0.15, 0.6]} />
        <meshStandardMaterial color="#33ddff" emissive="#00aacc" emissiveIntensity={1} transparent opacity={0.9} />
      </mesh>
      
      {/* Main swept wings */}
      <mesh position={[0, 0, 0.3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3.2, 0.06, 1.2]} />
        <primitive object={currentMaterial} attach="material" />
      </mesh>
      
      {/* Wing leading edge taper - left */}
      <mesh position={[-1.2, 0, -0.2]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.5]} />
        <primitive object={currentMaterial} attach="material" />
      </mesh>
      
      {/* Wing leading edge taper - right */}
      <mesh position={[1.2, 0, -0.2]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.5]} />
        <primitive object={currentMaterial} attach="material" />
      </mesh>
      
      {/* Vertical stabilizer (tail fin) */}
      <mesh position={[0, 0.35, 1.2]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.06, 0.7, 0.8]} />
        <primitive object={currentMaterial} attach="material" />
      </mesh>
      
      {/* Horizontal stabilizers (tail wings) */}
      <mesh position={[0, 0, 1.3]}>
        <boxGeometry args={[1.4, 0.05, 0.5]} />
        <primitive object={currentMaterial} attach="material" />
      </mesh>
      
      {/* Left engine nacelle */}
      <mesh position={[-0.5, -0.08, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Right engine nacelle */}
      <mesh position={[0.5, -0.08, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Left engine afterburner glow */}
      <mesh position={[-0.5, -0.08, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.04, 0.35, 8]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
      
      {/* Right engine afterburner glow */}
      <mesh position={[0.5, -0.08, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.04, 0.35, 8]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
      
      {/* Main afterburner glow (pulsing) */}
      <mesh ref={engineGlowRef} position={[0, 0, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.05, 0.5, 8]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
      
      {/* Wingtip lights - left */}
      <mesh position={[-1.6, 0, 0.5]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#ff3333" />
      </mesh>
      
      {/* Wingtip lights - right */}
      <mesh position={[1.6, 0, 0.5]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#33ff33" />
      </mesh>
      
      {/* Intake vents on fuselage */}
      <mesh position={[-0.15, 0.1, -0.3]}>
        <boxGeometry args={[0.08, 0.1, 0.4]} />
        <meshStandardMaterial color="#222233" />
      </mesh>
      <mesh position={[0.15, 0.1, -0.3]}>
        <boxGeometry args={[0.08, 0.1, 0.4]} />
        <meshStandardMaterial color="#222233" />
      </mesh>

      {/* LASER BEAM - when active */}
      {activeEffects.laserBeam && (
        <mesh ref={laserBeamRef} position={[0, 0, -25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 50, 8]} />
          <primitive object={laserMaterial} attach="material" />
        </mesh>
      )}

      {/* Magnet field indicator */}
      {activeEffects.magnet && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.05, 8, 32]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Homing missiles indicator */}
      {activeEffects.homingMissiles && (
        <>
          <mesh position={[-0.8, 0, 0.2]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshBasicMaterial color="#ff8800" />
          </mesh>
          <mesh position={[0.8, 0, 0.2]}>
            <coneGeometry args={[0.08, 0.3, 6]} />
            <meshBasicMaterial color="#ff8800" />
          </mesh>
        </>
      )}
      
      {/* Shield bubble when active */}
      {state.player.shield > 0 && (
        <mesh>
          <sphereGeometry args={[2.2, 16, 16]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function InstancedObstacles({ state }: { state: GameState }) {
  const asteroidRef = useRef<THREE.InstancedMesh>(null);
  const debrisRef = useRef<THREE.InstancedMesh>(null);
  const droneRef = useRef<THREE.InstancedMesh>(null);
  const mineRef = useRef<THREE.InstancedMesh>(null);
  const anomalyRef = useRef<THREE.InstancedMesh>(null);
  const bombRef = useRef<THREE.InstancedMesh>(null);
  const birdRef = useRef<THREE.InstancedMesh>(null);

  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const asteroidMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8B7355', roughness: 0.9 }), []);
  const debrisMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#666677', roughness: 0.7, metalness: 0.5 }), []);
  const droneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#D85A30', emissive: '#331100', emissiveIntensity: 0.3 }), []);
  const mineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#E24B4A', emissive: '#440000', emissiveIntensity: 0.5 }), []);
  const anomalyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9933ff', transparent: true, opacity: 0.7 }), []);
  const bombMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a2a30',
        emissive: '#331100',
        emissiveIntensity: 0.35,
        roughness: 0.55,
        metalness: 0.7,
      }),
    []
  );
  const birdMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4a4a52',
        emissive: '#222228',
        emissiveIntensity: 0.15,
        roughness: 0.85,
      }),
    []
  );

  useFrame(() => {
    const counts = { asteroid: 0, debris: 0, drone: 0, mine: 0, anomaly: 0, bomb: 0, bird: 0 };

    state.obstacles.forEach(o => {
      if (o.health <= 0) return;

      const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(o.rotation.x, o.rotation.y, o.rotation.z)
      );
      const scaleMatrix = new THREE.Matrix4().makeScale(o.scale, o.scale, o.scale);
      tempMatrix.makeTranslation(o.position.x, o.position.y, o.position.z);
      tempMatrix.multiply(rotMatrix).multiply(scaleMatrix);

      const flashColor = o.hitFlash > 0 ? '#ffffff' : null;

      switch (o.type) {
        case 'asteroid':
          if (asteroidRef.current && counts.asteroid < MAX_OBSTACLES) {
            asteroidRef.current.setMatrixAt(counts.asteroid, tempMatrix);
            tempColor.set(flashColor || '#8B7355');
            asteroidRef.current.setColorAt(counts.asteroid, tempColor);
            counts.asteroid++;
          }
          break;
        case 'debris':
          if (debrisRef.current && counts.debris < MAX_OBSTACLES) {
            debrisRef.current.setMatrixAt(counts.debris, tempMatrix);
            tempColor.set(flashColor || '#666677');
            debrisRef.current.setColorAt(counts.debris, tempColor);
            counts.debris++;
          }
          break;
        case 'drone':
          if (droneRef.current && counts.drone < MAX_OBSTACLES) {
            droneRef.current.setMatrixAt(counts.drone, tempMatrix);
            tempColor.set(flashColor || '#D85A30');
            droneRef.current.setColorAt(counts.drone, tempColor);
            counts.drone++;
          }
          break;
        case 'mine':
          if (mineRef.current && counts.mine < MAX_OBSTACLES) {
            mineRef.current.setMatrixAt(counts.mine, tempMatrix);
            tempColor.set(flashColor || '#E24B4A');
            mineRef.current.setColorAt(counts.mine, tempColor);
            counts.mine++;
          }
          break;
        case 'anomaly':
          if (anomalyRef.current && counts.anomaly < MAX_OBSTACLES) {
            anomalyRef.current.setMatrixAt(counts.anomaly, tempMatrix);
            counts.anomaly++;
          }
          break;
        case 'bomb':
          if (bombRef.current && counts.bomb < MAX_OBSTACLES) {
            bombRef.current.setMatrixAt(counts.bomb, tempMatrix);
            tempColor.set(flashColor || '#3a3a42');
            bombRef.current.setColorAt(counts.bomb, tempColor);
            counts.bomb++;
          }
          break;
        case 'bird':
          if (birdRef.current && counts.bird < MAX_OBSTACLES) {
            birdRef.current.setMatrixAt(counts.bird, tempMatrix);
            tempColor.set(flashColor || '#5a5a62');
            birdRef.current.setColorAt(counts.bird, tempColor);
            counts.bird++;
          }
          break;
      }
    });

    const flush = (ref: React.RefObject<THREE.InstancedMesh | null>, count: number) => {
      if (!ref.current) return;
      for (let i = count; i < MAX_OBSTACLES; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        ref.current.setMatrixAt(i, tempMatrix);
      }
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    };

    flush(asteroidRef, counts.asteroid);
    flush(debrisRef, counts.debris);
    flush(droneRef, counts.drone);
    flush(mineRef, counts.mine);
    flush(anomalyRef, counts.anomaly);
    flush(bombRef, counts.bomb);
    flush(birdRef, counts.bird);
  });

  return (
    <>
      <instancedMesh ref={asteroidRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 1]} />
        <primitive object={asteroidMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={debrisRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <primitive object={debrisMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={droneRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <coneGeometry args={[0.5, 1.2, 6]} />
        <primitive object={droneMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={mineRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <octahedronGeometry args={[0.6]} />
        <primitive object={mineMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={anomalyRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <torusGeometry args={[1.2, 0.3, 8, 16]} />
        <primitive object={anomalyMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={bombRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <sphereGeometry args={[0.85, 12, 12]} />
        <primitive object={bombMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birdRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <coneGeometry args={[0.35, 1.1, 5]} />
        <primitive object={birdMat} attach="material" />
      </instancedMesh>
    </>
  );
}

function InstancedProjectiles({ state }: { state: GameState }) {
  const playerBulletRef = useRef<THREE.InstancedMesh>(null);
  const enemyBulletRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);

  const playerBulletMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#00ffaa' }), []);
  const enemyBulletMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff4444' }), []);

  useFrame(() => {
    let playerIdx = 0;
    let enemyIdx = 0;

    state.projectiles.forEach(p => {
      tempMatrix.makeTranslation(p.position.x, p.position.y, p.position.z);

      if (!p.isEnemy && playerBulletRef.current && playerIdx < MAX_PROJECTILES) {
        playerBulletRef.current.setMatrixAt(playerIdx, tempMatrix);
        playerIdx++;
      } else if (p.isEnemy && enemyBulletRef.current && enemyIdx < MAX_PROJECTILES) {
        enemyBulletRef.current.setMatrixAt(enemyIdx, tempMatrix);
        enemyIdx++;
      }
    });

    if (playerBulletRef.current) {
      for (let i = playerIdx; i < MAX_PROJECTILES; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        playerBulletRef.current.setMatrixAt(i, tempMatrix);
      }
      playerBulletRef.current.instanceMatrix.needsUpdate = true;
    }

    if (enemyBulletRef.current) {
      for (let i = enemyIdx; i < MAX_PROJECTILES; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        enemyBulletRef.current.setMatrixAt(i, tempMatrix);
      }
      enemyBulletRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={playerBulletRef} args={[undefined, undefined, MAX_PROJECTILES]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <primitive object={playerBulletMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={enemyBulletRef} args={[undefined, undefined, MAX_PROJECTILES]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <primitive object={enemyBulletMat} attach="material" />
      </instancedMesh>
    </>
  );
}

function InstancedPowerUps({ state }: { state: GameState }) {
  const powerUpRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const powerUpMat = useMemo(() => new THREE.MeshStandardMaterial({
    emissive: '#ffffff',
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.9,
  }), []);

  const typeColors: Record<string, string> = {
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

  useFrame(() => {
    let idx = 0;

    state.powerUps.forEach(pu => {
      if (!pu.active || !powerUpRef.current || idx >= MAX_POWERUPS) return;

      const scale = 0.8 + Math.sin(pu.pulsePhase) * 0.2;
      const rotMatrix = new THREE.Matrix4().makeRotationY(pu.rotation.y);
      const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale);
      tempMatrix.makeTranslation(pu.position.x, pu.position.y, pu.position.z);
      tempMatrix.multiply(rotMatrix).multiply(scaleMatrix);

      powerUpRef.current.setMatrixAt(idx, tempMatrix);
      tempColor.set(typeColors[pu.type] || '#ffffff');
      powerUpRef.current.setColorAt(idx, tempColor);
      idx++;
    });

    if (powerUpRef.current) {
      for (let i = idx; i < MAX_POWERUPS; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        powerUpRef.current.setMatrixAt(i, tempMatrix);
      }
      powerUpRef.current.instanceMatrix.needsUpdate = true;
      if (powerUpRef.current.instanceColor) powerUpRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={powerUpRef} args={[undefined, undefined, MAX_POWERUPS]} frustumCulled={false}>
      <octahedronGeometry args={[0.5]} />
      <primitive object={powerUpMat} attach="material" />
    </instancedMesh>
  );
}

function InstancedParticles({ state }: { state: GameState }) {
  const particleRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);

  const particleMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffaa33',
    transparent: true,
    opacity: 0.8,
  }), []);

  useFrame(() => {
    let idx = 0;

    state.particles.forEach(p => {
      if (p.life <= 0 || !particleRef.current || idx >= MAX_PARTICLES) return;

      const scale = p.life * p.size * 3;
      const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale);
      tempMatrix.makeTranslation(p.position.x, p.position.y, p.position.z);
      tempMatrix.multiply(scaleMatrix);

      particleRef.current.setMatrixAt(idx, tempMatrix);
      idx++;
    });

    if (particleRef.current) {
      for (let i = idx; i < MAX_PARTICLES; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        particleRef.current.setMatrixAt(i, tempMatrix);
      }
      particleRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={particleRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <primitive object={particleMat} attach="material" />
    </instancedMesh>
  );
}

function InstancedExplosions({ state }: { state: GameState }) {
  const explosionRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);

  const explosionMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffaa33',
    transparent: true,
    opacity: 0.6,
  }), []);

  useFrame(() => {
    let idx = 0;

    state.explosions.forEach(e => {
      if (e.life <= 0 || !explosionRef.current || idx >= MAX_EXPLOSIONS) return;

      const scale = (1 - e.life) * e.size * 3 + 0.5;
      const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale);
      tempMatrix.makeTranslation(e.position.x, e.position.y, e.position.z);
      tempMatrix.multiply(scaleMatrix);

      explosionRef.current.setMatrixAt(idx, tempMatrix);
      idx++;
    });

    if (explosionRef.current) {
      for (let i = idx; i < MAX_EXPLOSIONS; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        explosionRef.current.setMatrixAt(i, tempMatrix);
      }
      explosionRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={explosionRef} args={[undefined, undefined, MAX_EXPLOSIONS]} frustumCulled={false}>
      <torusGeometry args={[0.5, 0.15, 8, 16]} />
      <primitive object={explosionMat} attach="material" />
    </instancedMesh>
  );
}

function GridTunnel({ gameSpeed, levelConfig }: { gameSpeed: number; levelConfig: any }) {
  const gridRef = useRef<THREE.GridHelper>(null);
  const frameRef = useRef(0);

  useFrame(() => {
    frameRef.current++;
    if (gridRef.current) {
      gridRef.current.position.z = (frameRef.current * gameSpeed * 0.04) % 10;
    }
  });

  const color1 = levelConfig?.theme?.gridColor1 || '#331166';
  const color2 = levelConfig?.theme?.gridColor2 || '#220044';

  return (
    <group position={[0, -6, 0]}>
      <gridHelper ref={gridRef} args={[250, 250, color1, color2]} position={[0, 0, -60]} />
    </group>
  );
}

function BossEnemy({ state }: { state: GameState }) {
  const { boss } = state;
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !boss) return;
    timeRef.current += delta;
    
    groupRef.current.position.set(boss.position.x, boss.position.y, boss.position.z);
    groupRef.current.rotation.y = Math.sin(timeRef.current * 0.5) * 0.2;
  });

  if (!boss || !boss.active) return null;

  const flashColor = boss.hitFlash > 0 ? '#ffffff' : boss.color;
  const pulseScale = 1 + Math.sin(timeRef.current * 3) * 0.05;

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh scale={[boss.size * pulseScale, boss.size * 0.6 * pulseScale, boss.size * 1.2 * pulseScale]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={flashColor} emissive={boss.color} emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[-boss.size * 1.2, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[boss.size * 0.8, boss.size * 0.1, boss.size * 1.5]} />
        <meshStandardMaterial color={flashColor} emissive={boss.color} emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[boss.size * 1.2, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[boss.size * 0.8, boss.size * 0.1, boss.size * 1.5]} />
        <meshStandardMaterial color={flashColor} emissive={boss.color} emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[boss.size * 0.4, 16, 16]} />
        <meshBasicMaterial color={boss.color} transparent opacity={0.6 + Math.sin(timeRef.current * 5) * 0.3} />
      </mesh>
      
      {/* Health bar */}
      <group position={[0, boss.size + 1, 0]}>
        <mesh>
          <boxGeometry args={[boss.size * 2, 0.3, 0.1]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[(boss.health / boss.maxHealth - 1) * boss.size, 0, 0.05]}>
          <boxGeometry args={[boss.size * 2 * (boss.health / boss.maxHealth), 0.25, 0.1]} />
          <meshBasicMaterial color="#ff3333" />
        </mesh>
      </group>
      
      {/* Engine glows */}
      {[...Array(3)].map((_, i) => (
        <mesh key={i} position={[(i - 1) * boss.size * 0.5, -boss.size * 0.2, boss.size * 0.8]}>
          <sphereGeometry args={[boss.size * 0.2, 8, 8]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.7 + Math.sin(timeRef.current * 10 + i) * 0.3} />
        </mesh>
      ))}
    </group>
  );
}

function SceneWithGhost({ engine, ghostPosition }: { engine: GameEngine; ghostPosition: GhostPosition | null }) {
  const state = engine.getState();
  const levelConfig = engine.getCurrentLevelConfig();
  const isEarth = levelConfig?.theme?.planetPreset === 'earth';

  useFrame(() => {
    engine.update();
  });

  const bgColor = levelConfig?.theme?.backgroundColor || '#050510';
  const fogColor = levelConfig?.theme?.fogColor || '#050510';
  const fogNear = levelConfig?.theme?.fogNear || 50;
  const fogFar = levelConfig?.theme?.fogFar || 150;
  const ambientColor = levelConfig?.theme?.ambientLightColor || '#aaccff';
  const ambientIntensity = levelConfig?.theme?.ambientLightIntensity || 0.35;
  const starColors = levelConfig?.theme?.starColors || ['#ffffff', '#aaccff'];

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight position={[15, 25, 15]} intensity={isEarth ? 0.75 : 1.2} color={isEarth ? '#8899aa' : ambientColor} />
      {isEarth ? (
        <>
          <pointLight position={[0, 2, -140]} intensity={1.4} color="#aa8866" distance={220} />
          <pointLight position={[-30, 10, -90]} intensity={0.6} color="#445566" distance={120} />
          <pointLight position={[25, -6, -70]} intensity={0.45} color="#334455" distance={100} />
        </>
      ) : (
        <>
          <pointLight position={[0, 8, -40]} intensity={2.5} color="#ff6633" distance={80} />
          <pointLight position={[-20, 12, -60]} intensity={2} color="#6633ff" distance={100} />
          <pointLight position={[20, -8, -50]} intensity={1.5} color="#33ff99" distance={70} />
        </>
      )}

      <Starfield gameSpeed={state.gameSpeed} starColors={starColors} />
      {isEarth ? (
        <>
          <EarthDystopia />
          <EarthAtmosphericHaze />
          <EarthSmogParticles gameSpeed={state.gameSpeed} />
          <EarthSmogNebulae />
        </>
      ) : (
        <>
          <Nebulae colors={levelConfig.theme.nebulaColors} />
          <Planets />
        </>
      )}
      <GridTunnel gameSpeed={state.gameSpeed} levelConfig={levelConfig} />

      {ghostPosition && <GhostShip position={ghostPosition} />}
      <PlayerShip state={state} />
      <InstancedObstacles state={state} />
      <InstancedProjectiles state={state} />
      <InstancedPowerUps state={state} />
      <InstancedParticles state={state} />
      <InstancedExplosions state={state} />
      
      {state.bossActive && <BossEnemy state={state} />}
    </>
  );
}

interface GhostPosition {
  x: number;
  y: number;
  rotationZ: number;
}

function GhostShip({ position }: { position: GhostPosition }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = position.x;
      groupRef.current.position.y = position.y;
      groupRef.current.rotation.z = position.rotationZ;
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y, 0]}>
      {/* Ghost ship - simplified translucent version */}
      <mesh>
        <coneGeometry args={[0.4, 1.5, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} wireframe />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.4, 1.2, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.25} wireframe />
      </mesh>
      {/* Trail effect */}
      <mesh position={[0, 0, 0.8]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

interface SpaceGameProps {
  onScoreUpdate?: (score: number) => void;
  onHealthUpdate?: (health: number, shield: number) => void;
  onGameOver?: (score: number, distance: number, completedGame: boolean) => void;
  onDistanceUpdate?: (distance: number) => void;
  onMultiplierUpdate?: (multiplier: number) => void;
  onSpeedUpdate?: (speed: number) => void;
  onPowerUp?: (type: string) => void;
  onLevelChange?: (level: number, levelConfig: any) => void;
  onLevelProgress?: (progress: number) => void;
  onBossSpawn?: (bossName: string) => void;
  onBossDefeat?: (bossName: string, points: number) => void;
  onGhostUpdate?: (ghostPosition: GhostPosition | null) => void;
  running: boolean;
}

export default function SpaceGame({
  onScoreUpdate,
  onHealthUpdate,
  onGameOver,
  onDistanceUpdate,
  onMultiplierUpdate,
  onSpeedUpdate,
  onPowerUp,
  onLevelChange,
  onLevelProgress,
  onBossSpawn,
  onBossDefeat,
  onGhostUpdate,
  running,
}: SpaceGameProps) {
  const engineRef = useRef<GameEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);
  const [introHud, setIntroHud] = useState({ fade: 1, line: null as string | null, active: true });

  useEffect(() => {
    engineRef.current = new GameEngine();
    engineRef.current.init();
    setIsReady(true);

    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCallbacks({
        onScoreUpdate,
        onHealthUpdate,
        onGameOver,
        onDistanceUpdate,
        onMultiplierUpdate,
        onSpeedUpdate,
        onPowerUp: onPowerUp as any,
        onLevelChange,
        onLevelProgress,
        onBossSpawn,
        onBossDefeat,
        onGhostUpdate: (pos) => {
          setGhostPosition(pos);
          onGhostUpdate?.(pos);
        },
      });
    }
  }, [onScoreUpdate, onHealthUpdate, onGameOver, onDistanceUpdate, onMultiplierUpdate, onSpeedUpdate, onPowerUp, onLevelChange, onLevelProgress, onBossSpawn, onBossDefeat, onGhostUpdate]);

  useEffect(() => {
    if (running && engineRef.current) {
      engineRef.current.startGame();
      const s = engineRef.current.getState();
      setIntroHud({ fade: s.introFade, line: s.introDialogueLine, active: s.introActive });
    }
  }, [running]);

  useEffect(() => {
    if (!running || !isReady) return;
    let id = 0;
    const tick = () => {
      const eng = engineRef.current;
      if (eng) {
        const s = eng.getState();
        setIntroHud((prev) => {
          if (
            prev.fade === s.introFade &&
            prev.line === s.introDialogueLine &&
            prev.active === s.introActive
          ) {
            return prev;
          }
          return { fade: s.introFade, line: s.introDialogueLine, active: s.introActive };
        });
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, isReady]);

  if (!isReady || !engineRef.current) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background: '#050510',
        color: '#8888aa',
      }}>
        Initializing systems...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {(introHud.active || introHud.fade > 0.02) && (
        <>
          <div
            className="mission-intro-black"
            style={{ opacity: Math.min(1, introHud.fade) }}
            aria-hidden
          />
          {introHud.line && (
            <div className="mission-intro-dialogue">
              <span className="mission-intro-label">SYSTEM</span>
              <p className="mission-intro-text">{introHud.line}</p>
            </div>
          )}
        </>
      )}
      <Canvas
        camera={{ position: [0, 6, 16], fov: 70, near: 0.1, far: 300 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: false,
          stencil: false,
          depth: true,
          powerPreference: 'high-performance',
          precision: 'mediump',
        }}
      >
        <SceneWithGhost engine={engineRef.current} ghostPosition={ghostPosition} />
      </Canvas>
    </div>
  );
}
