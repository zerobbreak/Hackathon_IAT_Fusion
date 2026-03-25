import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GameEngine } from './GameEngine';
import { GameState, Star, Nebula, Planet } from './types';

/** Slightly brighten PBR on the player GLB so albedo reads under game lighting */
function enhancePlayerMaterial(m: THREE.Material): THREE.Material {
  const mat = m.clone();
  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    mat.metalness = THREE.MathUtils.clamp(mat.metalness * 0.78, 0, 0.92);
    mat.roughness = THREE.MathUtils.clamp(mat.roughness * 0.88, 0.18, 1);
    mat.envMapIntensity = (mat.envMapIntensity ?? 1) * 1.4;
    mat.color.multiplyScalar(1.12);
  }
  return mat;
}

/** Mission intro modal palette (.mission-intro-* in App.css) — cyan label, cool text, deep teal shadow */
const MODAL_ACCENT = new THREE.Color('#00ffc8');
const MODAL_TEXT = new THREE.Color('#dce4f0');
const MODAL_SHADOW = new THREE.Color('#002838');

function enhanceEarthPlanetMaterial(m: THREE.Material, modalTint: boolean): THREE.Material {
  const mat = m.clone();
  if (!modalTint) {
    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
      mat.envMapIntensity = (mat.envMapIntensity ?? 1) * 1.12;
    }
    return mat;
  }
  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    mat.color.multiplyScalar(0.88);
    mat.color.lerp(MODAL_TEXT, 0.22);
    mat.color.lerp(MODAL_SHADOW, 0.12);
    mat.emissive = mat.emissive || new THREE.Color(0);
    mat.emissive.lerp(MODAL_ACCENT, 0.1);
    mat.emissiveIntensity = (mat.emissiveIntensity ?? 0) + 0.07;
    mat.metalness = THREE.MathUtils.clamp(mat.metalness * 0.85, 0, 1);
    mat.roughness = THREE.MathUtils.clamp(mat.roughness * 1.06, 0.12, 1);
    mat.envMapIntensity = (mat.envMapIntensity ?? 1) * 1.18;
  } else if (mat instanceof THREE.MeshBasicMaterial) {
    mat.color.lerp(MODAL_TEXT, 0.2);
    mat.color.lerp(MODAL_SHADOW, 0.08);
  }
  return mat;
}

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

function Starfield({ gameSpeed, starColors }: { gameSpeed: number; starColors: string[] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const stars = useMemo(() => generateStars(MAX_STARS, starColors), [starColors]);
  
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
    
    for (let i = 0; i < stars.length; i++) {
      array[i * 3 + 2] += gameSpeed * 0.025;
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

function EarthDystopia({ introProgress, currentLevel }: { introProgress: number; currentLevel: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/Meshy_AI_A_hyper_realistic_hi_0325102523_texture.glb');
  const modalTint = currentLevel < 2;

  const planetRoot = useMemo(() => {
    const g = scene.clone(true);
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetDiameter = 124;
    const s = targetDiameter / Math.max(maxDim, 1e-6);
    g.position.sub(center);
    g.scale.setScalar(s);
    g.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const next = mats.map((m) => enhanceEarthPlanetMaterial(m, modalTint));
        mesh.material = next.length === 1 ? next[0]! : next;
      }
    });
    return g;
  }, [scene, modalTint]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.004;
    const yStart = 18;
    const yEnd = -52;
    const zStart = -95;
    const zEnd = -260;
    const t = Math.min(1, introProgress);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    groupRef.current.position.y = yStart + (yEnd - yStart) * ease;
    groupRef.current.position.z = zStart + (zEnd - zStart) * ease;
  });

  return (
    <group ref={groupRef} position={[0, 18, -95]}>
      <primitive object={planetRoot} />
      <mesh scale={[1.012, 1.012, 1.012]}>
        <sphereGeometry args={[62, 40, 40]} />
        <meshBasicMaterial color="#2a3544" transparent opacity={0.14} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[1.065, 1.065, 1.065]}>
        <sphereGeometry args={[62, 28, 28]} />
        <meshBasicMaterial
          color="#4a5a6c"
          transparent
          opacity={0.28}
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

function EarthSurface({ levelProgress, gameSpeed }: { levelProgress: number; gameSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  
  const oceanMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a3a5c',
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95,
  }), []);

  const landMasses = useMemo(() => {
    const masses: { x: number; z: number; scaleX: number; scaleZ: number; rotation: number }[] = [];
    for (let i = 0; i < 12; i++) {
      masses.push({
        x: (Math.random() - 0.5) * 200,
        z: -80 - Math.random() * 300,
        scaleX: 15 + Math.random() * 35,
        scaleZ: 12 + Math.random() * 28,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    return masses;
  }, []);

  const cloudPatterns = useMemo(() => {
    const clouds: { x: number; z: number; scale: number; opacity: number; speed: number }[] = [];
    for (let i = 0; i < 20; i++) {
      clouds.push({
        x: (Math.random() - 0.5) * 250,
        z: -30 - Math.random() * 200,
        scale: 20 + Math.random() * 40,
        opacity: 0.08 + Math.random() * 0.12,
        speed: 0.02 + Math.random() * 0.03,
      });
    }
    return clouds;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    
    const fadeOut = Math.max(0, 1 - levelProgress * 1.5);
    groupRef.current.visible = fadeOut > 0.01;
    
    groupRef.current.children.forEach((child) => {
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
        if (mat.opacity !== undefined) {
          mat.opacity = mat.userData.baseOpacity * fadeOut;
        }
      }
    });

    groupRef.current.position.z += gameSpeed * 0.008;
    if (groupRef.current.position.z > 50) {
      groupRef.current.position.z = -100;
    }
  });

  return (
    <group ref={groupRef} position={[0, -25, -60]}>
      <mesh ref={surfaceRef} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, 0, -40]}>
        <planeGeometry args={[400, 500, 64, 64]} />
        <primitive object={oceanMaterial} attach="material" />
      </mesh>

      {landMasses.map((land, i) => (
        <mesh 
          key={`land-${i}`} 
          position={[land.x, 0.5, land.z]} 
          rotation={[-Math.PI / 2.2, 0, land.rotation]}
        >
          <circleGeometry args={[land.scaleX, 32]} />
          <meshStandardMaterial 
            color={i % 3 === 0 ? '#4a5548' : i % 3 === 1 ? '#5c5a4e' : '#3d4a3c'}
            roughness={0.9}
            transparent
            opacity={0.85}
            userData={{ baseOpacity: 0.85 }}
          />
        </mesh>
      ))}

      {cloudPatterns.map((cloud, i) => (
        <mesh
          key={`cloud-${i}`}
          position={[cloud.x, 8, cloud.z]}
          rotation={[-Math.PI / 2.3, 0, 0]}
        >
          <planeGeometry args={[cloud.scale, cloud.scale * 0.6]} />
          <meshBasicMaterial
            color="#c8d0dc"
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            userData={{ baseOpacity: cloud.opacity }}
          />
        </mesh>
      ))}

      <mesh position={[0, 2, -80]} rotation={[-Math.PI / 2.5, 0, 0]}>
        <planeGeometry args={[450, 300]} />
        <meshBasicMaterial
          color="#0a1828"
          transparent
          opacity={0.15}
          depthWrite={false}
          userData={{ baseOpacity: 0.15 }}
        />
      </mesh>
    </group>
  );
}

function EarthCurvature({ levelProgress }: { levelProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    const fadeOut = Math.max(0, 1 - levelProgress * 1.2);
    groupRef.current.visible = fadeOut > 0.01;
    
    groupRef.current.children.forEach((child) => {
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.userData.baseOpacity !== undefined) {
          mat.opacity = mat.userData.baseOpacity * fadeOut;
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -35, -120]}>
      <mesh rotation={[Math.PI / 2.8, 0, 0]}>
        <torusGeometry args={[180, 8, 16, 100, Math.PI * 0.6]} />
        <meshBasicMaterial 
          color="#1a3a5c" 
          transparent 
          opacity={0.4}
          userData={{ baseOpacity: 0.4 }}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2.8, 0, 0]} position={[0, -2, 5]}>
        <torusGeometry args={[185, 12, 16, 100, Math.PI * 0.6]} />
        <meshBasicMaterial 
          color="#5a8ab8" 
          transparent 
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          userData={{ baseOpacity: 0.15 }}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2.8, 0, 0]} position={[0, -4, 10]}>
        <torusGeometry args={[190, 20, 16, 100, Math.PI * 0.6]} />
        <meshBasicMaterial 
          color="#88b8e8" 
          transparent 
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          userData={{ baseOpacity: 0.08 }}
        />
      </mesh>
    </group>
  );
}

function AtmosphericGlow({ levelProgress }: { levelProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    const fadeOut = Math.max(0, 1 - levelProgress * 1.4);
    groupRef.current.visible = fadeOut > 0.01;
    
    groupRef.current.children.forEach((child) => {
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.userData.baseOpacity !== undefined) {
          mat.opacity = mat.userData.baseOpacity * fadeOut;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, -8, -45]}>
        <planeGeometry args={[300, 80]} />
        <meshBasicMaterial
          color="#5a9ac8"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          userData={{ baseOpacity: 0.06 }}
        />
      </mesh>

      <mesh position={[0, -5, -35]}>
        <planeGeometry args={[350, 60]} />
        <meshBasicMaterial
          color="#88c8f8"
          transparent
          opacity={0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          userData={{ baseOpacity: 0.04 }}
        />
      </mesh>

      <mesh position={[0, -12, -55]}>
        <planeGeometry args={[280, 100]} />
        <meshBasicMaterial
          color="#2a4a68"
          transparent
          opacity={0.12}
          depthWrite={false}
          userData={{ baseOpacity: 0.12 }}
        />
      </mesh>
    </group>
  );
}

function SpaceTransition({ levelProgress }: { levelProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  
  const transitionStars = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = -50 - Math.random() * 250;
      sizes[i] = 0.1 + Math.random() * 0.3;
    }
    
    return { positions, sizes };
  }, []);
  
  useFrame(() => {
    if (!groupRef.current) return;
    const fadeIn = Math.min(1, Math.max(0, (levelProgress - 0.3) * 2));
    groupRef.current.visible = fadeIn > 0.01;
    
    if (starsRef.current) {
      const mat = starsRef.current.material as THREE.PointsMaterial;
      mat.opacity = fadeIn * 0.9;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute 
            attach="attributes-position" 
            count={transitionStars.positions.length / 3} 
            array={transitionStars.positions} 
            itemSize={3} 
          />
          <bufferAttribute 
            attach="attributes-size" 
            count={transitionStars.sizes.length} 
            array={transitionStars.sizes} 
            itemSize={1} 
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#ffffff"
          transparent
          opacity={0}
          sizeAttenuation
        />
      </points>

      <mesh position={[0, 0, -200]}>
        <planeGeometry args={[500, 300]} />
        <meshBasicMaterial
          color="#020408"
          transparent
          opacity={Math.min(1, Math.max(0, (levelProgress - 0.5) * 1.5))}
          depthWrite={false}
        />
      </mesh>

      {levelProgress > 0.4 && (
        <>
          <mesh position={[-80, 40, -180]}>
            <sphereGeometry args={[2, 8, 8]} />
            <meshBasicMaterial color="#ff8866" transparent opacity={Math.min(1, (levelProgress - 0.4) * 2)} />
          </mesh>
          <mesh position={[100, -20, -220]}>
            <sphereGeometry args={[4, 12, 12]} />
            <meshBasicMaterial color="#88aaff" transparent opacity={Math.min(1, (levelProgress - 0.5) * 2)} />
          </mesh>
          <mesh position={[40, 60, -250]}>
            <sphereGeometry args={[3, 10, 10]} />
            <meshBasicMaterial color="#ffdd88" transparent opacity={Math.min(1, (levelProgress - 0.6) * 2)} />
          </mesh>
        </>
      )}
    </group>
  );
}

function EarthAtmosphericHaze({ introProgress }: { introProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const yShift = introProgress * -18;
    groupRef.current.position.y = yShift;
    groupRef.current.position.z = introProgress * -40;
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 2 - i * 1.2, -28 - i * 32]} rotation={[0.08 * i, 0.04 * i, 0]}>
          <planeGeometry args={[220, 120]} />
          <meshBasicMaterial color="#252a32" transparent opacity={0.035 + i * 0.018} depthWrite={false} />
        </mesh>
      ))}
      
      <mesh position={[0, -3, -60]} rotation={[-0.1, 0, 0]}>
        <planeGeometry args={[300, 150]} />
        <meshBasicMaterial 
          color="#1a2838" 
          transparent 
          opacity={0.08} 
          blending={THREE.AdditiveBlending}
          depthWrite={false} 
        />
      </mesh>
      
      <mesh position={[0, 5, -25]}>
        <planeGeometry args={[280, 80]} />
        <meshBasicMaterial 
          color="#4a6080" 
          transparent 
          opacity={0.03} 
          blending={THREE.AdditiveBlending}
          depthWrite={false} 
        />
      </mesh>
    </group>
  );
}

function EarthSmogParticles({ gameSpeed }: { gameSpeed: number }) {
  const ref = useRef<THREE.Points>(null);
  const n = 250;
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const dustColors = [
      [0.5, 0.55, 0.6],
      [0.45, 0.5, 0.55],
      [0.55, 0.58, 0.62],
      [0.4, 0.45, 0.52],
    ];
    
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 180;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = -30 - Math.random() * 150;
      
      const c = dustColors[Math.floor(Math.random() * dustColors.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    return [pos, col];
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const arr = (ref.current.geometry.attributes.position.array as Float32Array);
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 2] += gameSpeed * 0.02 + 0.05;
      arr[i * 3] += Math.sin(Date.now() * 0.0008 + i * 0.5) * 0.025;
      arr[i * 3 + 1] += Math.cos(Date.now() * 0.0006 + i * 0.3) * 0.015;
      if (arr[i * 3 + 2] > 30) {
        arr[i * 3 + 2] = -180;
        arr[i * 3] = (Math.random() - 0.5) * 180;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 100;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={n} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={n} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function EarthSmogNebulae({ introProgress }: { introProgress: number }) {
  const smog = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: (Math.random() - 0.5) * 140,
        y: (Math.random() - 0.5) * 70,
        z: -45 - i * 12,
        size: 35 + Math.random() * 60,
        opacity: 0.03 + Math.random() * 0.05,
        rot: Math.random() * Math.PI * 2,
        color: i % 4 === 0 ? '#3a4858' : i % 4 === 1 ? '#2a3848' : i % 4 === 2 ? '#4a5868' : '#354555',
      })),
    []
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.y = introProgress * -22;
    groupRef.current.position.z = introProgress * -55;
  });

  return (
    <group ref={groupRef}>
      {smog.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation={[0.1, 0, s.rot]}>
          <planeGeometry args={[s.size, s.size * 0.5]} />
          <meshBasicMaterial 
            color={s.color} 
            transparent 
            opacity={s.opacity} 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>
      ))}
      
      <mesh position={[0, -15, -100]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[350, 200]} />
        <meshBasicMaterial 
          color="#1a2a3a" 
          transparent 
          opacity={0.08} 
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function EarthScrollingClouds({ gameSpeed }: { gameSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const layers = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        z: -16 - i * 18,
        y: -4 + (Math.random() - 0.5) * 6,
        speed: 0.04 + Math.random() * 0.05,
        scale: 60 + Math.random() * 80,
        opacity: 0.02 + Math.random() * 0.04,
        color: i % 3 === 0 ? '#8a9aac' : i % 3 === 1 ? '#6a7a8c' : '#9aaabb',
        startX: (Math.random() - 0.5) * 200,
      })),
    []
  );

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.position.x += (layers[i].speed + gameSpeed * 0.008);
      if (mesh.position.x > 160) mesh.position.x = -160;
    });
  });

  return (
    <group ref={groupRef}>
      {layers.map((l, i) => (
        <mesh key={i} position={[l.startX, l.y, l.z]} rotation={[0.05, 0, 0]}>
          <planeGeometry args={[l.scale, l.scale * 0.4]} />
          <meshBasicMaterial 
            color={l.color} 
            transparent 
            opacity={l.opacity} 
            side={THREE.DoubleSide} 
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function ShipEngineTrail({ state }: { state: GameState }) {
  const ref = useRef<THREE.Points>(null);
  const n = 90;
  const positions = useMemo(() => new Float32Array(n * 3), []);
  const opacities = useMemo(() => new Float32Array(n).fill(0), []);
  const idxRef = useRef(0);

  useFrame(() => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const oArr = ref.current.geometry.attributes.alpha.array as Float32Array;
    const i = idxRef.current % n;
    arr[i * 3] = state.player.position.x + (Math.random() - 0.5) * 0.3;
    arr[i * 3 + 1] = state.player.position.y - 0.15 + (Math.random() - 0.5) * 0.15;
    arr[i * 3 + 2] = state.player.position.z + 1.9 + Math.random() * 0.25;
    oArr[i] = 0.85;
    for (let j = 0; j < n; j++) {
      arr[j * 3 + 2] += 0.18;
      oArr[j] = Math.max(0, oArr[j] - 0.018);
    }
    idxRef.current++;
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.geometry.attributes.alpha.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={n} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-alpha" count={n} array={opacities} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={0.38} color="#66ddff" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
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

  const { scene } = useGLTF('/Meshy_AI_A_hyper_realistic_3D__0325095037_texture.glb');
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.material) return;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((mat) => enhancePlayerMaterial(mat));
        } else {
          mesh.material = enhancePlayerMaterial(mesh.material);
        }
      }
    });
    return clone;
  }, [scene]);

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

    const baseScale = 3.0;
    const targetScale = activeEffects.sizeReduction ? baseScale * 0.5 : baseScale;
    if (Math.abs(shipScale - targetScale) > 0.01) {
      setShipScale(shipScale + (targetScale - shipScale) * 0.1);
    }
    groupRef.current.scale.setScalar(shipScale);

    if (engineGlowRef.current) {
      const scale = activeEffects.speedBoost ? 1.5 : (0.8 + Math.sin(Date.now() * 0.01) * 0.2);
      engineGlowRef.current.scale.setScalar(scale);
    }

    if (laserBeamRef.current) {
      const pulse = 0.8 + Math.sin(Date.now() * 0.02) * 0.2;
      laserBeamRef.current.scale.x = pulse;
      laserBeamRef.current.scale.y = pulse;
    }

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) {
          if (activeEffects.ghostMode) {
            mat.transparent = true;
            mat.opacity = 0.5;
            mat.emissive.set('#6666ff');
            mat.emissiveIntensity = 0.8;
          } else {
            mat.transparent = false;
            mat.opacity = 1;
            mat.emissiveIntensity = 0.2;
          }
        }
      }
    });

    const isGhostFlicker = activeEffects.ghostMode && Math.floor(Date.now() / 100) % 3 === 0;
    const isInvulnerableFlicker = player.invulnerableTimer > 0 && !activeEffects.ghostMode && Math.floor(player.invulnerableTimer / 4) % 2 === 0;
    const shouldBeVisible = !isInvulnerableFlicker && !isGhostFlicker;
    if (visible !== shouldBeVisible) setVisible(shouldBeVisible);
  });

  /**
   * Meshy GLB: Y-up, forward ~+X. Camera looks down −Z. Yaw +90° maps +X → −Z; +180° flips nose/tail.
   * Do not add −90° X on top — that tipped +Z into world +Y and made the jet stand nose-up.
   */
  const modelYaw = Math.PI / 2 + Math.PI;

  return (
    <group ref={groupRef} visible={visible}>
      <group rotation={[0, modelYaw, 0]}>
        <primitive object={clonedScene} />

        <mesh ref={engineGlowRef} position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.05, 0.5, 8]} />
          <primitive object={glowMaterial} attach="material" />
        </mesh>

        {activeEffects.laserBeam && (
          <mesh ref={laserBeamRef} position={[0, 0, -25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 50, 8]} />
            <primitive object={laserMaterial} attach="material" />
          </mesh>
        )}
      </group>

      {/* Key / fill / rim — camera is +Z; lights sit in front and sides of the ship */}
      <pointLight position={[0, 1.2, 10]} intensity={18} decay={2} distance={0} color="#ffffff" />
      <pointLight position={[6, 0.4, 4]} intensity={8} decay={2} distance={0} color="#ffe8d8" />
      <pointLight position={[-5, 0.2, 2]} intensity={7} decay={2} distance={0} color="#d0e8ff" />
      <pointLight position={[0, 3, -2]} intensity={4} decay={2} distance={0} color="#aaccff" />

      {activeEffects.magnet && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.05, 8, 32]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.4} />
        </mesh>
      )}

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
      
      {state.player.shield > 0 && (
        <mesh>
          <sphereGeometry args={[2.2, 16, 16]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

useGLTF.preload('/Meshy_AI_A_hyper_realistic_3D__0325095037_texture.glb');
useGLTF.preload('/Meshy_AI_A_hyper_realistic_hi_0325102523_texture.glb');

function InstancedObstacles({ state }: { state: GameState }) {
  const asteroidRef = useRef<THREE.InstancedMesh>(null);
  const debrisRef = useRef<THREE.InstancedMesh>(null);
  const droneRef = useRef<THREE.InstancedMesh>(null);
  const mineRef = useRef<THREE.InstancedMesh>(null);
  const anomalyRef = useRef<THREE.InstancedMesh>(null);
  const bombRef = useRef<THREE.InstancedMesh>(null);
  const birdRef = useRef<THREE.InstancedMesh>(null);
  const crateRef = useRef<THREE.InstancedMesh>(null);

  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempEuler = useMemo(() => new THREE.Euler(0, 0, 0), []);
  const rotMatrix = useMemo(() => new THREE.Matrix4(), []);
  const scaleMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const { asteroidGeo, asteroidMat } = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ 
      color: '#6b5d4d',
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });
    
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const posAttr = geo.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      const noise = 0.7 + Math.random() * 0.6;
      vertex.multiplyScalar(noise);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geo.computeVertexNormals();
    
    return { asteroidGeo: geo, asteroidMat: mat };
  }, []);
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
  const crateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8B4513',
        roughness: 0.75,
        metalness: 0.1,
      }),
    []
  );

  useFrame(() => {
    const counts = { asteroid: 0, debris: 0, drone: 0, mine: 0, anomaly: 0, bomb: 0, bird: 0, crate: 0 };

    state.obstacles.forEach(o => {
      if (o.health <= 0) return;

      tempEuler.set(o.rotation.x, o.rotation.y, o.rotation.z);
      rotMatrix.makeRotationFromEuler(tempEuler);
      scaleMatrix.makeScale(o.scale, o.scale, o.scale);
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
        case 'crate':
          if (crateRef.current && counts.crate < MAX_OBSTACLES) {
            crateRef.current.setMatrixAt(counts.crate, tempMatrix);
            tempColor.set(flashColor || '#8B4513');
            crateRef.current.setColorAt(counts.crate, tempColor);
            counts.crate++;
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
    flush(crateRef, counts.crate);
  });

  return (
    <>
      <instancedMesh ref={asteroidRef} args={[asteroidGeo, asteroidMat, MAX_OBSTACLES]} frustumCulled={false} />
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
      <instancedMesh ref={crateRef} args={[undefined, undefined, MAX_OBSTACLES]} frustumCulled={false}>
        <boxGeometry args={[1.2, 1.0, 1.5]} />
        <primitive object={crateMat} attach="material" />
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
  const oxygenRef = useRef<THREE.InstancedMesh>(null);
  const fuelRef = useRef<THREE.InstancedMesh>(null);
  const otherRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const rotMatrix = useMemo(() => new THREE.Matrix4(), []);
  const scaleMatrix = useMemo(() => new THREE.Matrix4(), []);
  const puEuler = useMemo(() => new THREE.Euler(0, 0, 0), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const oxygenGeo = useMemo(
    () => new THREE.CapsuleGeometry(0.2, 0.52, 6, 12),
    []
  );
  const fuelGeo = useMemo(
    () => new THREE.CylinderGeometry(0.2, 0.2, 0.78, 14, 1, false),
    []
  );

  const oxygenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0d4d45',
        emissive: '#2af0d0',
        emissiveIntensity: 0.85,
        metalness: 0.55,
        roughness: 0.28,
        transparent: true,
        opacity: 0.96,
      }),
    []
  );

  const fuelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a3200',
        emissive: '#ff9a1a',
        emissiveIntensity: 0.72,
        metalness: 0.35,
        roughness: 0.42,
        transparent: true,
        opacity: 0.96,
      }),
    []
  );

  const otherMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        emissive: '#ffffff',
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.9,
        metalness: 0.2,
        roughness: 0.45,
      }),
    []
  );

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

  useFrame(({ clock }) => {
    let oi = 0;
    let fi = 0;
    let ri = 0;
    const t = clock.elapsedTime;

    state.powerUps.forEach((pu) => {
      if (!pu.active) return;

      const pulse = 0.88 + Math.sin(pu.pulsePhase) * 0.14;
      const bob = Math.sin(t * 2.2 + pu.position.x * 0.4) * 0.06;

      if (pu.type === 'health') {
        if (!oxygenRef.current || oi >= MAX_POWERUPS) return;
        rotMatrix.makeRotationY(pu.rotation.y + t * 0.35);
        scaleMatrix.makeScale(pulse, pulse, pulse);
        tempMatrix.makeTranslation(pu.position.x, pu.position.y + bob, pu.position.z);
        tempMatrix.multiply(rotMatrix).multiply(scaleMatrix);
        oxygenRef.current.setMatrixAt(oi, tempMatrix);
        oi++;
        return;
      }

      if (pu.type === 'shield') {
        if (!fuelRef.current || fi >= MAX_POWERUPS) return;
        puEuler.set(Math.sin(pu.pulsePhase * 0.08) * 0.12, pu.rotation.y + t * 0.28, Math.PI / 2);
        rotMatrix.makeRotationFromEuler(puEuler);
        scaleMatrix.makeScale(pulse * 1.05, pulse * 1.05, pulse * 1.05);
        tempMatrix.makeTranslation(pu.position.x, pu.position.y + bob * 0.85, pu.position.z);
        tempMatrix.multiply(rotMatrix).multiply(scaleMatrix);
        fuelRef.current.setMatrixAt(fi, tempMatrix);
        fi++;
        return;
      }

      if (!otherRef.current || ri >= MAX_POWERUPS) return;
      rotMatrix.makeRotationY(pu.rotation.y);
      scaleMatrix.makeScale(pulse * 0.92, pulse * 0.92, pulse * 0.92);
      tempMatrix.makeTranslation(pu.position.x, pu.position.y, pu.position.z);
      tempMatrix.multiply(rotMatrix).multiply(scaleMatrix);
      otherRef.current.setMatrixAt(ri, tempMatrix);
      tempColor.set(typeColors[pu.type] || '#ffffff');
      otherRef.current.setColorAt(ri, tempColor);
      ri++;
    });

    const flush = (ref: React.RefObject<THREE.InstancedMesh | null>, count: number) => {
      if (!ref.current) return;
      for (let i = count; i < MAX_POWERUPS; i++) {
        tempMatrix.makeTranslation(0, -1000, 0);
        ref.current.setMatrixAt(i, tempMatrix);
      }
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    };

    flush(oxygenRef, oi);
    flush(fuelRef, fi);
    flush(otherRef, ri);
  });

  return (
    <>
      <instancedMesh ref={oxygenRef} args={[oxygenGeo, oxygenMat, MAX_POWERUPS]} frustumCulled={false} />
      <instancedMesh ref={fuelRef} args={[fuelGeo, fuelMat, MAX_POWERUPS]} frustumCulled={false} />
      <instancedMesh ref={otherRef} args={[undefined, undefined, MAX_POWERUPS]} frustumCulled={false}>
        <octahedronGeometry args={[0.52]} />
        <primitive object={otherMat} attach="material" />
      </instancedMesh>
    </>
  );
}

function InstancedParticles({ state }: { state: GameState }) {
  const particleRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const scaleMatrix = useMemo(() => new THREE.Matrix4(), []);

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
      scaleMatrix.makeScale(scale, scale, scale);
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
  const scaleMatrix = useMemo(() => new THREE.Matrix4(), []);

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
      scaleMatrix.makeScale(scale, scale, scale);
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

function VastSpace({ gameSpeed, levelProgress }: { gameSpeed: number; levelProgress: number }) {
  const nebulaRef = useRef<THREE.Group>(null);
  const dustRef = useRef<THREE.Points>(null);
  
  const deepSpaceNebulae = useMemo(() => {
    const nebulae: { x: number; y: number; z: number; scale: number; color: string; opacity: number; rotation: number }[] = [];
    const colors = ['#1a1a2e', '#16213e', '#0f3460', '#1a1a3a', '#0a1628', '#12192e'];
    for (let i = 0; i < 15; i++) {
      nebulae.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 200,
        z: -100 - Math.random() * 200,
        scale: 80 + Math.random() * 150,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.03 + Math.random() * 0.05,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    return nebulae;
  }, []);

  const cosmicDust = useMemo(() => {
    const count = 300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 2] = -50 - Math.random() * 300;
      
      const brightness = 0.3 + Math.random() * 0.4;
      colors[i * 3] = brightness * 0.7;
      colors[i * 3 + 1] = brightness * 0.8;
      colors[i * 3 + 2] = brightness;
      
      sizes[i] = 0.1 + Math.random() * 0.2;
    }
    
    return { positions, colors, sizes };
  }, []);

  useFrame(() => {
    if (dustRef.current) {
      const arr = dustRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 300; i++) {
        arr[i * 3 + 2] += gameSpeed * 0.015;
        if (arr[i * 3 + 2] > 50) {
          arr[i * 3 + 2] = -350;
          arr[i * 3] = (Math.random() - 0.5) * 500;
          arr[i * 3 + 1] = (Math.random() - 0.5) * 300;
        }
      }
      dustRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    if (nebulaRef.current) {
      nebulaRef.current.rotation.z += 0.0001;
    }
  });

  const spaceOpacity = Math.min(1, 0.3 + levelProgress * 0.7);

  return (
    <group>
      <group ref={nebulaRef}>
        {deepSpaceNebulae.map((nebula, i) => (
          <mesh
            key={`nebula-${i}`}
            position={[nebula.x, nebula.y, nebula.z]}
            rotation={[0, 0, nebula.rotation]}
          >
            <planeGeometry args={[nebula.scale, nebula.scale * 0.7]} />
            <meshBasicMaterial
              color={nebula.color}
              transparent
              opacity={nebula.opacity * spaceOpacity}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={cosmicDust.positions.length / 3}
            array={cosmicDust.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={cosmicDust.colors.length / 3}
            array={cosmicDust.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.25}
          vertexColors
          transparent
          opacity={0.5 * spaceOpacity}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <mesh position={[0, 0, -280]}>
        <planeGeometry args={[600, 400]} />
        <meshBasicMaterial
          color="#020408"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[150, 80, -250]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color="#ffaa66" transparent opacity={0.7 * spaceOpacity} />
      </mesh>
      <mesh position={[-180, -40, -280]}>
        <sphereGeometry args={[2, 10, 10]} />
        <meshBasicMaterial color="#6688ff" transparent opacity={0.6 * spaceOpacity} />
      </mesh>
      <mesh position={[80, -90, -220]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#ff8888" transparent opacity={0.5 * spaceOpacity} />
      </mesh>
    </group>
  );
}

function BossEnemy({ state }: { state: GameState }) {
  const { boss } = state;
  const groupRef = useRef<THREE.Group>(null);
  const bodyMeshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const healthFillRef = useRef<THREE.Mesh>(null);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const wingMatLRef = useRef<THREE.MeshStandardMaterial>(null);
  const wingMatRRef = useRef<THREE.MeshStandardMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    const b = state.boss;
    if (!groupRef.current || !b || !b.active) return;
    timeRef.current += delta;

    groupRef.current.position.set(b.position.x, b.position.y, b.position.z);
    groupRef.current.rotation.y = Math.sin(timeRef.current * 0.5) * 0.2;

    const pulseScale = 1 + Math.sin(timeRef.current * 3) * 0.05;
    if (bodyMeshRef.current) {
      bodyMeshRef.current.scale.set(
        b.size * pulseScale,
        b.size * 0.6 * pulseScale,
        b.size * 1.2 * pulseScale
      );
    }

    const ratio = Math.max(0, b.health / b.maxHealth);
    if (healthFillRef.current) {
      healthFillRef.current.scale.x = ratio;
      healthFillRef.current.position.x = (ratio - 1) * b.size;
    }

    const flash = b.hitFlash > 0;
    const bodyColor = flash ? '#ffffff' : b.color;
    if (bodyMatRef.current) {
      bodyMatRef.current.color.set(bodyColor);
      bodyMatRef.current.emissive.set(b.color);
    }
    if (wingMatLRef.current) {
      wingMatLRef.current.color.set(bodyColor);
      wingMatLRef.current.emissive.set(b.color);
    }
    if (wingMatRRef.current) {
      wingMatRRef.current.color.set(bodyColor);
      wingMatRRef.current.emissive.set(b.color);
    }
    if (coreMatRef.current) {
      coreMatRef.current.opacity = 0.6 + Math.sin(timeRef.current * 5) * 0.3;
    }
  });

  if (!boss || !boss.active) return null;

  return (
    <group ref={groupRef}>
      {/* Main body — scale driven in useFrame so hit flash / health stay in sync with engine state */}
      <mesh ref={bodyMeshRef} scale={[boss.size, boss.size * 0.6, boss.size * 1.2]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={boss.color}
          emissive={boss.color}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Wings */}
      <mesh position={[-boss.size * 1.2, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[boss.size * 0.8, boss.size * 0.1, boss.size * 1.5]} />
        <meshStandardMaterial
          ref={wingMatLRef}
          color={boss.color}
          emissive={boss.color}
          emissiveIntensity={0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[boss.size * 1.2, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[boss.size * 0.8, boss.size * 0.1, boss.size * 1.5]} />
        <meshStandardMaterial
          ref={wingMatRRef}
          color={boss.color}
          emissive={boss.color}
          emissiveIntensity={0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[boss.size * 0.4, 16, 16]} />
        <meshBasicMaterial ref={coreMatRef} color={boss.color} transparent opacity={0.6} />
      </mesh>

      {/* Health bar — width/position updated from mutable boss.health in useFrame */}
      <group position={[0, boss.size + 1, 0]}>
        <mesh>
          <boxGeometry args={[boss.size * 2, 0.3, 0.1]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh ref={healthFillRef} position={[0, 0, 0.05]}>
          <boxGeometry args={[boss.size * 2, 0.25, 0.1]} />
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
  const introProgress = state.introProgress;
  const levelProgress = state.levelProgress;

  useFrame(({ camera }) => {
    engine.update();
    if (isEarth && state.introActive) {
      const t = Math.min(1, introProgress);
      const camYStart = 3;
      const camYEnd = 6;
      const camZStart = 20;
      const camZEnd = 16;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.y = camYStart + (camYEnd - camYStart) * ease;
      camera.position.z = camZStart + (camZEnd - camZStart) * ease;
      camera.lookAt(0, (1 - ease) * -2, -15);
    } else if (isEarth && introProgress >= 1) {
      camera.position.y += (6 - camera.position.y) * 0.04;
      camera.position.z += (16 - camera.position.z) * 0.04;
      camera.lookAt(0, 0, -15);
    } else if (!isEarth) {
      camera.position.x = 0;
      camera.position.y += (6 - camera.position.y) * 0.04;
      camera.position.z += (16 - camera.position.z) * 0.04;
      camera.lookAt(0, 0, -15);
    }
  });

  const transitionedBg = useMemo(() => {
    if (!isEarth) return levelConfig?.theme?.backgroundColor || '#050510';
    const earthStartBg = new THREE.Color('#06080c');
    const spaceBg = new THREE.Color('#020306');
    const c = earthStartBg.clone();
    c.lerp(spaceBg, Math.min(1, levelProgress * 1.5));
    return `#${c.getHexString()}`;
  }, [isEarth, levelProgress, levelConfig]);

  const transitionedFog = useMemo(() => {
    if (!isEarth) return levelConfig?.theme?.fogColor || '#050510';
    const earthStartFog = new THREE.Color('#1a1e28');
    const spaceFog = new THREE.Color('#050810');
    const c = earthStartFog.clone();
    c.lerp(spaceFog, Math.min(1, levelProgress * 1.5));
    return `#${c.getHexString()}`;
  }, [isEarth, levelProgress, levelConfig]);

  const bgColor = transitionedBg;
  const fogColor = transitionedFog;
  const baseFogNear = levelConfig?.theme?.fogNear || 50;
  const baseFogFar = levelConfig?.theme?.fogFar || 150;
  const fogNear = isEarth ? baseFogNear + levelProgress * 20 : baseFogNear;
  const fogFar = isEarth ? baseFogFar + levelProgress * 50 : baseFogFar;
  const ambientColor = levelConfig?.theme?.ambientLightColor || '#aaccff';
  const ambientIntensity = Math.min(
    0.85,
    (levelConfig?.theme?.ambientLightIntensity ?? 0.35) + (isEarth ? 0.22 - levelProgress * 0.1 : 0.16)
  );
  const starColors = levelConfig?.theme?.starColors || ['#ffffff', '#aaccff'];

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <hemisphereLight args={['#c8dcff', '#1a1a22', isEarth ? 0.45 : 0.35]} />
      <directionalLight
        position={[15, 28, 18]}
        intensity={isEarth ? 1.25 : 1.45}
        color={isEarth ? '#dde8f0' : ambientColor}
        castShadow={false}
      />
      <directionalLight position={[-18, 14, 12]} intensity={isEarth ? 0.55 : 0.65} color="#8899bb" />
      <Environment preset="city" environmentIntensity={isEarth ? 0.55 : 0.65} />
      {isEarth ? (
        <>
          <pointLight position={[0, 15, -100]} intensity={1.8} color="#b8c8d8" distance={250} />
          <pointLight position={[-40, 8, -80]} intensity={0.8} color="#5a7a9a" distance={150} />
          <pointLight position={[35, -10, -60]} intensity={0.6} color="#4a6a8a" distance={120} />
          <pointLight position={[0, -20, -120]} intensity={0.5} color="#3a5a7a" distance={180} />
          <pointLight position={[0, 5, -30]} intensity={0.9} color="#88a8c8" distance={80} />
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
          <EarthDystopia introProgress={introProgress} currentLevel={state.currentLevel} />
          <EarthSurface levelProgress={state.levelProgress} gameSpeed={state.gameSpeed} />
          <EarthCurvature levelProgress={state.levelProgress} />
          <AtmosphericGlow levelProgress={state.levelProgress} />
          <SpaceTransition levelProgress={state.levelProgress} />
          <EarthAtmosphericHaze introProgress={introProgress} />
          <EarthSmogParticles gameSpeed={state.gameSpeed} />
          <EarthSmogNebulae introProgress={introProgress} />
          <EarthScrollingClouds gameSpeed={state.gameSpeed} />
          <ShipEngineTrail state={state} />
        </>
      ) : (
        <>
          <Nebulae colors={levelConfig.theme.nebulaColors} />
          <Planets />
        </>
      )}
      <VastSpace gameSpeed={state.gameSpeed} levelProgress={state.levelProgress} />

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
  const [introHud, setIntroHud] = useState({ fade: 1, line: null as string | null, active: true, progress: 0 });

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
      setIntroHud({ fade: s.introFade, line: s.introDialogueLine, active: s.introActive, progress: s.introProgress });
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
            prev.active === s.introActive &&
            prev.progress === s.introProgress
          ) {
            return prev;
          }
          return { fade: s.introFade, line: s.introDialogueLine, active: s.introActive, progress: s.introProgress };
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
        dpr={[1, 1.25]}
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
