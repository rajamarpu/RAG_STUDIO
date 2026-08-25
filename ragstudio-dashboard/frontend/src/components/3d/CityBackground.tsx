import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedQuality } from './Canvas3D';

interface GridBackgroundProps {
  color?: string;
  opacity?: number;
  gridSize?: number;
  divisions?: number;
}

export function GridBackground({
  color = 'var(--scene-grid)',
  opacity = 0.1,
  gridSize = 20,
  divisions = 40,
}: GridBackgroundProps) {
  const { scene } = useThree();
  const gridRef = useRef<THREE.GridHelper | null>(null);

  useEffect(() => {
    const grid = new THREE.GridHelper(gridSize, divisions, color, color);
    grid.material.transparent = true;
    grid.material.opacity = opacity;
    grid.material.depthWrite = false;
    grid.position.y = -2;
    gridRef.current = grid;
    scene.add(grid);

    return () => {
      scene.remove(grid);
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
    };
  }, [scene, color, opacity, gridSize, divisions]);

  return null;
}

// Alias for backwards compatibility
export function CityBackground() {
  return <GridBackground />;
}

// Wrapper component
import { Canvas3D } from './Canvas3D';

export function CityBackgroundWrapper({
  intensity = 1,
  cameraPosition = [0, 5, 15],
  enableControls = false,
}: {
  intensity?: number;
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
}) {
  return (
    <Canvas3D cameraPosition={cameraPosition} enableControls={enableControls} style={{ width: '100%', height: '100%' }}>
      <CityBackground />
    </Canvas3D>
  );
}