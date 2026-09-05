import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../themes/ThemeProvider';
import { useReducedQuality } from './Canvas3D';

const STAGE_CONFIG: Array<{ id: string; label: string; icon: string; color: string; position: [number, number, number] }> = [
  { id: 'documents', label: 'Documents', icon: '📄', color: '#3b82f6', position: [-8, 2, 0] },
  { id: 'chunks', label: 'Text Chunks', icon: '✂️', color: '#8b5cf6', position: [-4, 2, 0] },
  { id: 'embeddings', label: 'Embeddings', icon: '🔢', color: '#ec4899', position: [0, 2, 0] },
  { id: 'vectorSpace', label: 'Vector Space', icon: '🌐', color: '#06b6d4', position: [4, 2, 0] },
  { id: 'retrieval', label: 'Retrieval', icon: '🔍', color: '#f59e0b', position: [8, 2, 0] },
  { id: 'reranker', label: 'Reranker', icon: '📊', color: '#ef4444', position: [4, -2, 0] },
  { id: 'llm', label: 'LLM', icon: '🤖', color: '#10b981', position: [0, -2, 0] },
  { id: 'answer', label: 'Answer', icon: '✨', color: '#8b5cf6', position: [-4, -2, 0] },
];

const CONNECTIONS = [
  { from: 'documents', to: 'chunks' },
  { from: 'chunks', to: 'embeddings' },
  { from: 'embeddings', to: 'vectorSpace' },
  { from: 'vectorSpace', to: 'retrieval' },
  { from: 'retrieval', to: 'reranker' },
  { from: 'reranker', to: 'llm' },
  { from: 'llm', to: 'answer' },
];

interface RagNetworkProps {
  activeStage?: string | null;
  hoveredStage?: string | null;
  onStageHover?: (stageId: string | null) => void;
  onStageClick?: (stageId: string) => void;
  onNodeClick?: (node: StageData) => void;
  showFlow?: boolean;
  flowProgress?: number; // 0-1
  animated?: boolean;
  showFlowParticles?: boolean;
  highlightStage?: string;
}

interface StageData {
  id: string;
  label: string;
  icon: string;
  color: string;
  position: [number, number, number];
  isActive: boolean;
  isHovered: boolean;
  progress: number; // 0-1 for flow animation
}

export function RagNetwork({
  activeStage = null,
  hoveredStage: hoveredStageProp = null,
  onStageHover,
  onStageClick,
  showFlow = true,
  flowProgress = 0,
}: RagNetworkProps) {
  const reducedQuality = useReducedQuality();
  const prefersReducedMotion = useReducedMotion();
  const [internalHovered, setInternalHovered] = useState<string | null>(null);
  const nodeScalesRef = useRef<Record<string, number>>({});
  const groupRef = useRef<THREE.Group>(null);
  const particleRefs = useRef<THREE.Points[]>([]);

  const hoveredStage = hoveredStageProp ?? internalHovered;

  const stages = useMemo((): StageData[] => {
    return STAGE_CONFIG.map((config) => {
      const isActive = activeStage === config.id;
      const isHovered = hoveredStage === config.id;
      let progress = 0;

      if (showFlow && flowProgress > 0) {
        const stageIndex = STAGE_CONFIG.findIndex(s => s.id === config.id);
        const totalStages = STAGE_CONFIG.length;
        const stageStart = stageIndex / totalStages;
        const stageEnd = (stageIndex + 1) / totalStages;

        if (flowProgress >= stageEnd) {
          progress = 1;
        } else if (flowProgress > stageStart) {
          progress = (flowProgress - stageStart) / (stageEnd - stageStart);
        }
      }

      return { ...config, isActive, isHovered, progress };
    });
  }, [activeStage, hoveredStage, showFlow, flowProgress]);

  // Initialize node scales
  useEffect(() => {
    const initialScales: Record<string, number> = {};
    STAGE_CONFIG.forEach(s => { initialScales[s.id] = 1; });
    nodeScalesRef.current = initialScales;
  }, []);

  // Animate node scales on hover/active
  useFrame((_, _delta) => {
    if (prefersReducedMotion) return;

    nodeScalesRef.current = {
      ...nodeScalesRef.current,
      ...stages.reduce((acc, stage) => {
        const target = stage.isHovered ? 1.3 : stage.isActive ? 1.15 : 1;
        const current = nodeScalesRef.current[stage.id] || 1;
        const diff = target - current;

        if (Math.abs(diff) > 0.01) {
          acc[stage.id] = current + diff * 0.15;
        } else if (current !== target) {
          acc[stage.id] = target;
        }
        return acc;
      }, {} as Record<string, number>),
    };
  });

  // Flow particles along connections
  useFrame((_, delta) => {
    if (!showFlow || prefersReducedMotion || reducedQuality) return;

    particleRefs.current.forEach((particles, i) => {
      const connection = CONNECTIONS[i];
      const fromStage = stages.find(s => s.id === connection.from);
      const toStage = stages.find(s => s.id === connection.to);

      if (!fromStage || !toStage) return;

      const geometry = particles.geometry;
      const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
      const alphas = geometry.getAttribute('alpha') as THREE.BufferAttribute;
      const count = positions.count;

      for (let j = 0; j < count; j++) {
        let alpha = alphas.array[j];
        alpha += delta * 2; // Speed

        if (alpha > 1) {
          alpha = 0;
          // Reset to start position
          positions.array[j * 3] = fromStage.position[0];
          positions.array[j * 3 + 1] = fromStage.position[1];
          positions.array[j * 3 + 2] = fromStage.position[2];
        } else {
          // Interpolate along path
          const t = alpha;
          positions.array[j * 3] = THREE.MathUtils.lerp(fromStage.position[0], toStage.position[0], t);
          positions.array[j * 3 + 1] = THREE.MathUtils.lerp(fromStage.position[1], toStage.position[1], t);
          positions.array[j * 3 + 2] = THREE.MathUtils.lerp(fromStage.position[2], toStage.position[2], t);
        }
        alphas.array[j] = alpha;
      }

      positions.needsUpdate = true;
      alphas.needsUpdate = true;
    });
  });

  // Create flow particles for a connection
  const createFlowParticles = useCallback((from: StageData, to: StageData, index: number) => {
    if (reducedQuality || prefersReducedMotion) return null;

    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const color = new THREE.Color(from.color);
    const toColor = new THREE.Color(to.color);

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      positions[i * 3] = THREE.MathUtils.lerp(from.position[0], to.position[0], t);
      positions[i * 3 + 1] = THREE.MathUtils.lerp(from.position[1], to.position[1], t);
      positions[i * 3 + 2] = THREE.MathUtils.lerp(from.position[2], to.position[2], t);
      alphas[i] = Math.random();
      sizes[i] = 0.08 + Math.random() * 0.04;

      const interpColor = color.clone().lerp(toColor, t);
      colors[i * 3] = interpColor.r;
      colors[i * 3 + 1] = interpColor.g;
      colors[i * 3 + 2] = interpColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    particleRefs.current[index] = particles;

    return particles;
  }, [reducedQuality, prefersReducedMotion]);

  
  // Handle mouse interaction for 3D objects
  const handlePointerOver = useCallback((_event: ThreeEvent<PointerEvent>, stageId: string) => {
    setInternalHovered(stageId);
    onStageHover?.(stageId);
  }, [onStageHover]);

  const handlePointerOut = useCallback(() => {
    setInternalHovered(null);
    onStageHover?.(null);
  }, [onStageHover]);

  const handleClick = useCallback((stageId: string) => {
    onStageClick?.(stageId);
  }, [onStageClick]);

  return (
    <group ref={groupRef}>
      {/* Connection Lines */}
      {CONNECTIONS.map((conn, i) => {
        const fromStage = stages.find(s => s.id === conn.from);
        const toStage = stages.find(s => s.id === conn.to);
        if (!fromStage || !toStage) return null;

        const isActiveConnection = fromStage.isActive || toStage.isActive || fromStage.progress > 0 || toStage.progress > 0;

        return (
          <group key={conn.from + '-' + conn.to}>
            <primitive
              object={new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(...fromStage.position),
                  new THREE.Vector3(...toStage.position),
                ]),
                new THREE.LineBasicMaterial({
                  color: isActiveConnection ? fromStage.color : 'var(--scene-edge)',
                  transparent: true,
                  opacity: isActiveConnection ? 0.8 : 0.3,
                  linewidth: 2,
                })
              )}
              renderOrder={-1}
              dispose={null}
            />
            {showFlow && (() => {
              const particles = createFlowParticles(fromStage, toStage, i);
              return particles ? <primitive object={particles} dispose={null} /> : null;
            })()}
          </group>
        );
      })}

      {/* Stage Nodes */}
      {stages.map((stage) => {
        const scale = nodeScalesRef.current[stage.id] || 1;
        const isActive = stage.isActive;
        const isHovered = stage.isHovered;
        const progress = stage.progress;

        return (
          <group
            key={stage.id}
            onPointerOver={(e) => handlePointerOver(e, stage.id)}
            onPointerOut={handlePointerOut}
            onClick={() => handleClick(stage.id)}
            position={stage.position}
            scale={scale}
          >
            {/* Outer glow ring when active/hovered */}
            {(isActive || isHovered || progress > 0) && (
              <mesh
                geometry={new THREE.RingGeometry(0.8, 1.0, 32)}
                material={new THREE.MeshBasicMaterial({
                  color: stage.color,
                  transparent: true,
                  opacity: isHovered ? 0.4 : isActive ? 0.3 : progress * 0.2,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                })}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={1 + (isHovered ? 0.5 : isActive ? 0.3 : progress * 0.5)}
              >
                <animate
                  attributeName="scale"
                  values={`${1 + (isHovered ? 0.5 : 0.3)}; ${1.5 + (isHovered ? 0.5 : 0.3)}; ${1 + (isHovered ? 0.5 : 0.3)}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
              </mesh>
            )}

            {/* Node sphere */}
            <mesh
              geometry={new THREE.SphereGeometry(0.6, reducedQuality ? 16 : 32, reducedQuality ? 16 : 32)}
              material={new THREE.MeshStandardMaterial({
                color: stage.color,
                transparent: true,
                opacity: 0.9,
                metalness: 0.3,
                roughness: 0.4,
                emissive: stage.color,
                emissiveIntensity: isActive ? 0.3 : isHovered ? 0.2 : 0,
              })}
              onPointerOver={(e) => handlePointerOver(e, stage.id)}
              onPointerOut={handlePointerOut}
              onClick={() => handleClick(stage.id)}
            >
              {isActive && (
                <animate
                  attributeName="scale"
                  values="1; 1.1; 1"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              )}
            </mesh>

            {/* Icon/Label using HTML overlay */}
            <Html
              transform
              position={[0, -1.5, 0]}
              style={{
                pointerEvents: 'none',
                textAlign: 'center',
                minWidth: '120px',
              }}
            >
              <div className="text-center">
                <div className="text-2xl mb-1" style={{ filter: `drop-shadow(0 2px 4px ${stage.color}80)` }}>
                  {stage.icon}
                </div>
                <div
                  className="text-xs font-medium px-2 py-1 rounded whitespace-nowrap"
                  style={{
                    background: `var(--bg-glass)`,
                    color: `var(--text-primary)`,
                    border: `1px solid var(--border-glass)`,
                    backdropFilter: 'blur(8px)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {stage.label}
                </div>
                {isActive && (
                  <motion.div
                    className="mt-1 flex items-center justify-center gap-1 text-xs"
                    style={{ color: stage.color }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                  </motion.div>
                )}
                {progress > 0 && progress < 1 && (
                  <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ width: '80px', background: 'var(--bg-tertiary)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: stage.color, width: `${progress * 100}%` }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </div>
            </Html>

            {/* Tooltip on hover */}
            <AnimatePresence>
              {isHovered && (
                <Html
                  transform
                  position={[0, 2.2, 0]}
                  style={{ pointerEvents: 'none', zIndex: 100 }}
                >
                  <motion.div
                    className="three-tooltip"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  >
                    <div className="tooltip-title">{stage.label}</div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Status</span>
                      <span className="tooltip-value" style={{ color: stage.color }}>
                        {isActive ? 'Active' : isHovered ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                    <div className="tooltip-row">
                      <span className="tooltip-label">Progress</span>
                      <span className="tooltip-value">{Math.round(progress * 100)}%</span>
                    </div>
                  </motion.div>
                </Html>
              )}
            </AnimatePresence>
          </group>
        );
      })}
    </group>
  );
}

// Wrapper with Canvas3D
interface RagNetworkWrapperProps extends Omit<RagNetworkProps, 'className' | 'style'> {
  cameraPosition?: [number, number, number];
}

export async function RagNetworkWrapper({
  cameraPosition = [0, 0, 12],
  ...props
}: RagNetworkWrapperProps) {
  const { Canvas3D } = await import('./Canvas3D');
  return (
    <Canvas3D cameraPosition={cameraPosition} enableControls={false}>
      <RagNetwork {...props} />
    </Canvas3D>
  );
}

// Compact version for dashboard cards
export async function MiniRagNetwork({ activeStage }: { activeStage?: string }) {
  const { Canvas3D } = await import('./Canvas3D');
  return (
    <div className="kb-graph w-full h-32">
      <Canvas3D cameraPosition={[0, 0, 15]} enableControls={false} style={{ width: '100%', height: '100%' }}>
        <RagNetwork
          activeStage={activeStage}
          showFlow={!!activeStage}
          flowProgress={activeStage ? 1 : 0}
        />
      </Canvas3D>
    </div>
  );
}