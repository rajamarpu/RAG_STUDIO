import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedQuality } from './Canvas3D';

interface ParticleFieldProps {
  count?: number;
  size?: number;
  speed?: number;
  color?: string;
  opacity?: number;
  spread?: number;
}

export function ParticleField({
  count = 2000,
  size = 0.02,
  speed = 0.1,
  color,
  opacity = 0.6,
  spread = 10,
}: ParticleFieldProps) {
  const reducedQuality = useReducedQuality();
  const { scene } = useThree();
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const themeColor = color || 'var(--scene-particle)';

  // Adjust particle count for performance
  const particleCount = useMemo(() => reducedQuality ? Math.min(count, 500) : count, [count, reducedQuality]);

  // Initialize particles
  useEffect(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    // Parse theme color
    const tempColor = new THREE.Color();
    try {
      tempColor.setStyle(themeColor);
    } catch {
      tempColor.setHex(0x3b82f6);
    }

    for (let i = 0; i < particleCount; i++) {
      // Random position in a box
      positions[i * 3] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;

      // Color with slight variation
      const hueVariation = (Math.random() - 0.5) * 0.1;
      const satVariation = (Math.random() - 0.5) * 0.2;
      const hsl = { h: 0, s: 0, l: 0 };
      tempColor.getHSL(hsl);
      const variedColor = new THREE.Color().setHSL(
        Math.max(0, Math.min(1, hsl.h + hueVariation)),
        Math.max(0, Math.min(1, hsl.s + satVariation)),
        hsl.l
      );
      colors[i * 3] = variedColor.r;
      colors[i * 3 + 1] = variedColor.g;
      colors[i * 3 + 2] = variedColor.b;

      // Random size
      sizes[i] = size * (0.5 + Math.random() * 1.5);

      // Random velocity
      velocities[i * 3] = (Math.random() - 0.5) * 0.001;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: size,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    geometryRef.current = geometry;
    materialRef.current = material;
    velocitiesRef.current = velocities;

    scene.add(points);

    return () => {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    };
  }, [scene, particleCount, spread, size, opacity, themeColor]);

  // Animation loop
  useFrame((_, delta) => {
    if (!pointsRef.current || !geometryRef.current || !velocitiesRef.current || reducedQuality) return;

    const positions = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
    const velocities = velocitiesRef.current;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      positions.array[i * 3] += velocities[i * 3] * delta * 60 * speed * 100;
      positions.array[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 * speed * 100;
      positions.array[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60 * speed * 100;

      // Wrap around boundaries
      const halfSpread = spread;
      if (positions.array[i * 3] > halfSpread) positions.array[i * 3] = -halfSpread;
      if (positions.array[i * 3] < -halfSpread) positions.array[i * 3] = halfSpread;
      if (positions.array[i * 3 + 1] > halfSpread) positions.array[i * 3 + 1] = -halfSpread;
      if (positions.array[i * 3 + 1] < -halfSpread) positions.array[i * 3 + 1] = halfSpread;
      if (positions.array[i * 3 + 2] > halfSpread) positions.array[i * 3 + 2] = -halfSpread;
      if (positions.array[i * 3 + 2] < -halfSpread) positions.array[i * 3 + 2] = halfSpread;
    }

    positions.needsUpdate = true;

    // Slow rotation
    pointsRef.current.rotation.y += delta * 0.01 * speed;
    pointsRef.current.rotation.x += delta * 0.005 * speed;
  });

  return null; // Rendered via useThree scene
}

// Wrapper component for easy use
export function ParticleFieldWrapper(props: ParticleFieldProps) {
  return (
    <>
      <ParticleField {...props} />
    </>
  );
}

// Specialized particle fields for different contexts
export function BackgroundParticles() {
  const reducedQuality = useReducedQuality();
  return (
    <ParticleField
      count={reducedQuality ? 800 : 3000}
      size={0.015}
      speed={0.05}
      opacity={0.4}
      spread={15}
    />
  );
}

export function HeroParticles() {
  const reducedQuality = useReducedQuality();
  return (
    <ParticleField
      count={reducedQuality ? 1500 : 5000}
      size={0.025}
      speed={0.15}
      opacity={0.7}
      spread={20}
    />
  );
}

export function DashboardParticles() {
  const reducedQuality = useReducedQuality();
  return (
    <ParticleField
      count={reducedQuality ? 500 : 1500}
      size={0.01}
      speed={0.03}
      opacity={0.3}
      spread={12}
    />
  );
}

