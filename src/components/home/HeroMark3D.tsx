'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

/* ----------------------------------------------------------------
   The main mark — a hexagonal prism with the circuit-S texture.
   `flatShading` reads as a real 3D object, not a flat decal.
   ---------------------------------------------------------------- */
function Mark({ markUrl, dark = true }: { markUrl: string; dark?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const texture = useTexture(markUrl);

  // Material: warm metal in dark mode, soft pearl in light mode
  const baseColor = dark ? '#1c1a16' : '#f3ede0';
  const edgeColor = dark ? '#7a9080' : '#5f7565';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.18;
      group.current.rotation.x = Math.sin(t * 0.4) * 0.08;
    }
  });

  return (
    <group ref={group}>
      <Float
        speed={0.7}
        rotationIntensity={0.15}
        floatIntensity={0.5}
        floatingRange={[-0.12, 0.12]}
      >
        {/* Hexagonal prism body — extruded so the mark has real depth */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1, 1, 0.22, 6]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={0.35}
            metalness={0.7}
            flatShading
          />
        </mesh>

        {/* Front face: mark texture, slightly raised so it sits proud of the prism */}
        <mesh position={[0, 0, 0.112]}>
          <circleGeometry args={[0.985, 6]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.02}
            roughness={0.4}
            metalness={0.3}
            emissive={new THREE.Color(edgeColor)}
            emissiveIntensity={dark ? 0.4 : 0.15}
          />
        </mesh>

        {/* Back face: same texture, mirrored — looks the same from either side */}
        <mesh position={[0, 0, -0.112]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.985, 6]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.02}
            roughness={0.4}
            metalness={0.3}
            emissive={new THREE.Color(edgeColor)}
            emissiveIntensity={dark ? 0.4 : 0.15}
          />
        </mesh>
      </Float>
    </group>
  );
}

/* ----------------------------------------------------------------
   Halo ring — a hexagonal wireframe that orbits the main mark.
   Reads as "tech, schematics" without being literal.
   ---------------------------------------------------------------- */
function Halo({ radius, speed, axis = 'y', phase = 0, color = '#7a9080', opacity = 0.5 }: {
  radius: number; speed: number; axis?: 'x' | 'y' | 'z'; phase?: number; color?: string; opacity?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime() + phase;
    if (!ref.current) return;
    if (axis === 'y') ref.current.rotation.y = t * speed;
    if (axis === 'x') ref.current.rotation.x = t * speed;
    if (axis === 'z') ref.current.rotation.z = t * speed;
  });
  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[radius, 0.004, 8, 6]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------------------
   Floating particles — a sparse field of small dots that drift.
   Adds atmospheric depth without being noisy.
   ---------------------------------------------------------------- */
function Particles({ count = 60, radius = 3.5, color = '#7a9080' }: { count?: number; radius?: number; color?: string }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute in a flattened ellipsoid so particles don't all crowd the center
      const r = Math.pow(Math.random(), 0.6) * radius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color={color}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ----------------------------------------------------------------
   Auto-dolly camera — very slow, almost imperceptible. Gives
   the scene a sense of being "alive" without obvious motion.
   ---------------------------------------------------------------- */
function CameraDolly() {
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const cam = state.camera;
    cam.position.x = Math.sin(t * 0.05) * 0.18;
    cam.position.y = Math.sin(t * 0.07) * 0.12 + 0.4;
    cam.lookAt(0, 0, 0);
  });
  return null;
}

/* ----------------------------------------------------------------
   Texture cache (avoids re-decoding the same image per face).
   ---------------------------------------------------------------- */
const textureCache = new Map<string, THREE.Texture>();
function useTexture(url: string) {
  if (typeof window === 'undefined') {
    // SSR placeholder
    return new THREE.Texture();
  }
  if (textureCache.has(url)) return textureCache.get(url)!;
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textureCache.set(url, tex);
  return tex;
}

/* ----------------------------------------------------------------
   Public export — the 3D canvas used in the hero.
   ---------------------------------------------------------------- */
export function HeroMark3D({ markUrl }: { markUrl: string }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Lighting: warm key + cool fill + rim light to pick the edges */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#fbf7ee" />
      <directionalLight position={[-4, -1, 2]} intensity={0.4} color="#a8b9ac" />
      <directionalLight position={[0, 0, -3]} intensity={0.7} color="#7a9080" />

      <Mark markUrl={markUrl} dark />
      <Halo radius={1.55} speed={0.25} axis="y" phase={0} opacity={0.35} />
      <Halo radius={1.9} speed={-0.18} axis="y" phase={1.2} opacity={0.22} color="#485a4d" />
      <Halo radius={2.25} speed={0.12} axis="x" phase={2.4} opacity={0.14} color="#5f7565" />

      <Particles count={70} radius={4.2} />

      <Environment preset="apartment" />
      <CameraDolly />
    </Canvas>
  );
}
