'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Hexagonal extruded disc with the SOULVD mark texture.
 * Floats gently and rotates around its Y axis.
 */
function MarkDisc({ markUrl }: { markUrl: string }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);

  // Hexagon shape (flat-top), scaled to roughly the mark's aspect
  const hexShape = useMemo(() => {
    const s = new THREE.Shape();
    const r = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);

  // Texture from the mark PNG
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(markUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [markUrl]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      // gentle continuous rotation
      group.current.rotation.y = t * 0.18;
      group.current.rotation.x = Math.sin(t * 0.4) * 0.06;
    }
    if (inner.current) {
      // slight breathing scale
      const s = 1 + Math.sin(t * 0.8) * 0.015;
      inner.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={group}>
      <Float
        speed={0.8}
        rotationIntensity={0.15}
        floatIntensity={0.4}
        floatingRange={[-0.08, 0.08]}
      >
        <group ref={inner}>
          {/* Front face — mark texture */}
          <mesh position={[0, 0, 0.06]}>
            <circleGeometry args={[0.95, 6]} />
            <meshStandardMaterial
              map={texture}
              transparent
              alphaTest={0.02}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
          {/* Back face — same texture mirrored */}
          <mesh position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.95, 6]} />
            <meshStandardMaterial
              map={texture}
              transparent
              alphaTest={0.02}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
          {/* Subtle disc body for depth */}
          <mesh>
            <cylinderGeometry args={[0.95, 0.95, 0.12, 6]} />
            <meshStandardMaterial
              color="#e7e1d3"
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

export function HeroMark3D({ markUrl }: { markUrl: string }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.4], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.1} color="#fbf7ee" />
      <directionalLight position={[-3, -1, 2]} intensity={0.4} color="#a8b89a" />
      <MarkDisc markUrl={markUrl} />
      <Environment preset="apartment" />
    </Canvas>
  );
}
