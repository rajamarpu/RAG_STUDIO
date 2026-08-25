import React, { Suspense, useMemo, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import { useTheme, useReducedMotion } from '../themes/ThemeProvider';

// Fallback component
function CanvasFallback({ children }: { children?: React.ReactNode }) {
  return (
    <div className="canvas-container flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
      <div className="text-center p-8">
        <div className="skeleton h-8 w-48 mx-auto mb-4 rounded" />
        <div className="skeleton h-4 w-32 mx-auto rounded" />
        {children && <div className="mt-4 text-sm">{children}</div>}
      </div>
    </div>
  );
}

// WebGL capability detection
function useWebGLSupport(): boolean {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setSupported(!!gl);
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}

// Performance monitoring
function PerformanceMonitor() {
  const { gl } = useThree();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    let frameCount = 0;
    let lastTime = performance.now();

    function checkPerformance() {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = now;

        // Auto-reduce quality if FPS drops below 30
        if (fps < 30 && gl) {
          // Removed problematic code
        }
      }
      requestAnimationFrame(checkPerformance);
    }

    requestAnimationFrame(checkPerformance);
  }, [gl, reducedMotion]);

  return null;
}

interface Canvas3DProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
  reducedMotion?: boolean;
  fallback?: React.ReactNode;
  onLoad?: () => void;
}

export function Canvas3D({
  children,
  className = '',
  style,
  cameraPosition = [0, 0, 5],
  enableControls = true,
  reducedMotion: reducedMotionProp,
  fallback,
  onLoad,
}: Canvas3DProps) {
  const { resolvedTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const webglSupported = useWebGLSupport();
  const reducedMotion = reducedMotionProp || prefersReducedMotion;

  // Show 2D fallback if WebGL not supported
  if (!webglSupported) {
    return (
      <div className={`canvas-container ${className}`} style={style}>
        {fallback || <CanvasFallback>WebGL not supported - showing 2D fallback</CanvasFallback>}
      </div>
    );
  }

  const canvasStyle = useMemo(() => ({
    ...style,
    outline: 'none',
  }), [style]);

  return (
    <div className={`canvas-container ${className}`} style={style}>
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          onLoad?.();
        }}
        style={canvasStyle}
      >
        <color attach="background" args={[`var(--scene-bg)`]} />
        <fog attach="fog" args={['var(--scene-bg)', 10, 100]} />

        {/* Environment lighting based on theme */}
        <Environment
          preset={resolvedTheme === 'dark' ? 'night' : 'warehouse'}
          background={false}
        />

        {enableControls && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={!reducedMotion}
            enableDamping={!reducedMotion}
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={50}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.2}
          />
        )}

        <Suspense fallback={fallback || <CanvasFallback />}>
          {children}
        </Suspense>

        {!reducedMotion && <PerformanceMonitor />}

        {/* HTML overlay for tooltips/labels */}
        <Html fullscreen>
          <div style={{ pointerEvents: 'none' }} />
        </Html>
      </Canvas>
    </div>
  );
}

// Lightweight 2D fallback canvas for when 3D isn't available
export function Canvas2D({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`canvas-container ${className}`} style={style}>
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--scene-bg)' }}>
        {children}
      </div>
    </div>
  );
}

// Hook for 3D components to check if they should render simplified
export function useReducedQuality(): boolean {
  const prefersReducedMotion = useReducedMotion();
  const [lowPerformance, setLowPerformance] = useState(false);

  useEffect(() => {
    // Check device capabilities
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const isLowEnd = Boolean((memory && memory < 4) || (cores && cores < 4));
    setLowPerformance(isLowEnd);
  }, []);

  return prefersReducedMotion || lowPerformance;
}