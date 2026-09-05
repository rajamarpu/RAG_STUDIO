import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../themes/ThemeProvider';
import { useReducedQuality } from './Canvas3D';

interface ChunkPoint {
  id: string;
  position: [number, number, number];
  color: string;
  kbId: string;
  kbName: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  similarity?: number;
}

interface QueryPoint {
  position: [number, number, number];
  text: string;
}

interface VectorSpaceProps {
  chunks?: ChunkPoint[];
  query?: QueryPoint | null;
  retrievedIds?: string[];
  radius?: number;
  showRadius?: boolean;
  onChunkHover?: (chunk: ChunkPoint | null) => void;
  onChunkClick?: (chunk: ChunkPoint) => void;
  showLabels?: boolean;
  showQueryVector?: boolean;
  showConnections?: boolean;
  onPointClick?: (point: ChunkPoint) => void;
  queryVector?: number[];
}

export function VectorSpace({
  chunks = [],
  query = null,
  retrievedIds = [],
  radius = 3,
  showRadius = false,
  onChunkHover,
  onChunkClick,
  showLabels = false,
}: VectorSpaceProps) {
  const reducedQuality = useReducedQuality();
  const prefersReducedMotion = useReducedMotion();
  const [hoveredChunk, setHoveredChunk] = useState<ChunkPoint | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<ChunkPoint | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const queryRef = useRef<THREE.Mesh | null>(null);
  const radiusRef = useRef<THREE.Mesh | null>(null);
  const lineRefs = useRef<Map<string, THREE.Line>>(new Map());

  // Create chunk geometry and material
  const { geometry, material } = useMemo(() => {
    const count = chunks.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const originalColors = new Float32Array(count * 3);

    chunks.forEach((chunk, i) => {
      positions[i * 3] = chunk.position[0];
      positions[i * 3 + 1] = chunk.position[1];
      positions[i * 3 + 2] = chunk.position[2];

      const color = new THREE.Color(chunk.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      originalColors[i * 3] = color.r;
      originalColors[i * 3 + 1] = color.g;
      originalColors[i * 3 + 2] = color.b;

      sizes[i] = 0.06 + (chunk.text.length / 1000) * 0.04;
      alphas[i] = 1;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('originalColor', new THREE.BufferAttribute(originalColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    return { geometry, material };
  }, [chunks, reducedQuality]);

  // Initialize points
  useEffect(() => {
    if (!pointsRef.current && geometry && material) {
      const points = new THREE.Points(geometry, material);
      pointsRef.current = points;
      groupRef.current?.add(points);
    }
  }, [geometry, material]);

  // Update geometry when chunks change
  useEffect(() => {
    if (pointsRef.current && geometry) {
      pointsRef.current.geometry.dispose();
      pointsRef.current.geometry = geometry;
    }
  }, [geometry]);

  // Query point mesh
  useEffect(() => {
    if (query && !queryRef.current) {
      const geometry = new THREE.SphereGeometry(0.2, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: '#ffd700',
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...query.position);
      queryRef.current = mesh;
      groupRef.current?.add(mesh);

      // Pulse animation
      if (!prefersReducedMotion) {
        const animate = () => {
          if (!queryRef.current) return;
          mesh.scale.setScalar(1 + Math.sin(performance.now() * 0.003) * 0.2);
          requestAnimationFrame(animate);
        };
        animate();
      }
    } else if (!query && queryRef.current) {
      groupRef.current?.remove(queryRef.current);
      queryRef.current.geometry.dispose();
      if (queryRef.current.material) {
        if (Array.isArray(queryRef.current.material)) {
          queryRef.current.material.forEach(m => m.dispose());
        } else {
          queryRef.current.material.dispose();
        }
      }
      queryRef.current = null;
    }
  }, [query, prefersReducedMotion]);

  // Search radius sphere
  useEffect(() => {
    if (query && showRadius && !radiusRef.current) {
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: '#ffd700',
        transparent: true,
        opacity: 0.05,
        wireframe: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...query.position);
      radiusRef.current = mesh;
      groupRef.current?.add(mesh);
    } else if ((!query || !showRadius) && radiusRef.current) {
      groupRef.current?.remove(radiusRef.current);
      radiusRef.current.geometry.dispose();
      if (radiusRef.current.material) {
        if (Array.isArray(radiusRef.current.material)) {
          radiusRef.current.material.forEach(m => m.dispose());
        } else {
          radiusRef.current.material.dispose();
        }
      }
      radiusRef.current = null;
    }
  }, [query, showRadius, radius]);

  // Connection lines to retrieved chunks
  useEffect(() => {
    if (!query || !retrievedIds.length) {
      lineRefs.current.forEach(line => {
        groupRef.current?.remove(line);
        line.geometry.dispose();
        if (line.material) {
          if (Array.isArray(line.material)) {
            line.material.forEach(m => m.dispose());
          } else {
            line.material.dispose();
          }
        }
      });
      lineRefs.current.clear();
      return;
    }

    const queryPos = new THREE.Vector3(...query.position);
    const retrievedChunks = chunks.filter(c => retrievedIds.includes(c.id));

    retrievedChunks.forEach(chunk => {
      const key = chunk.id;
      if (lineRefs.current.has(key)) return;

      const chunkPos = new THREE.Vector3(...chunk.position);
      const points = [queryPos.clone(), chunkPos];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const color = new THREE.Color(chunk.color);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      lineRefs.current.set(key, line);
      groupRef.current?.add(line);
    });

    // Remove lines for chunks no longer retrieved
    lineRefs.current.forEach((line, key) => {
      if (!retrievedIds.includes(key)) {
        groupRef.current?.remove(line);
        line.geometry.dispose();
        if (line.material) {
          if (Array.isArray(line.material)) {
            line.material.forEach(m => m.dispose());
          } else {
            line.material.dispose();
          }
        }
        lineRefs.current.delete(key);
      }
    });
  }, [query, retrievedIds, chunks]);

  // Raycasting for hover/click
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!groupRef.current) return;

    const { camera, gl } = useThree();
    const mouse = new THREE.Vector2();
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    raycaster.params.Points.threshold = 0.1;

    if (pointsRef.current) {
      const intersects = raycaster.intersectObject(pointsRef.current);
      if (intersects.length > 0) {
        const index = intersects[0].index ?? 0;
        const chunk = chunks[index];
        if (chunk && chunk !== hoveredChunk) {
          setHoveredChunk(chunk);
          onChunkHover?.(chunk);
        }
      } else if (hoveredChunk) {
        setHoveredChunk(null);
        onChunkHover?.(null);
      }
    }
  }, [chunks, hoveredChunk, onChunkHover]);

  const handleClick = useCallback(() => {
    if (hoveredChunk) {
      setSelectedChunk(hoveredChunk);
      onChunkClick?.(hoveredChunk);
    }
  }, [hoveredChunk, onChunkClick]);

  // Animate chunk colors on hover/retrieval
  useFrame(() => {
    if (!pointsRef.current || prefersReducedMotion) return;

    const colors = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
    const alphas = pointsRef.current.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    const originalColors = pointsRef.current.geometry.getAttribute('originalColor') as THREE.BufferAttribute;

    chunks.forEach((chunk, i) => {
      let targetAlpha = 1;
      let targetColor = new THREE.Color(
        originalColors.array[i * 3],
        originalColors.array[i * 3 + 1],
        originalColors.array[i * 3 + 2]
      );

      const isRetrieved = retrievedIds.includes(chunk.id);
      const isHovered = hoveredChunk?.id === chunk.id;
      const isSelected = selectedChunk?.id === chunk.id;

      if (isHovered || isSelected) {
        targetAlpha = 1;
        targetColor = new THREE.Color('#ffd700');
      } else if (isRetrieved) {
        targetAlpha = 1;
        // Brighten retrieved chunks
        targetColor = targetColor.clone().multiplyScalar(1.5);
        targetColor.r = Math.min(targetColor.r, 1);
        targetColor.g = Math.min(targetColor.g, 1);
        targetColor.b = Math.min(targetColor.b, 1);
      } else if (query && retrievedIds.length > 0) {
        // Fade non-retrieved when query active
        targetAlpha = 0.15;
      }

      // Smooth interpolation
      const currentColor = new THREE.Color(colors.array[i * 3], colors.array[i * 3 + 1], colors.array[i * 3 + 2]);
      currentColor.lerp(targetColor, 0.1);
      colors.array[i * 3] = currentColor.r;
      colors.array[i * 3 + 1] = currentColor.g;
      colors.array[i * 3 + 2] = currentColor.b;

      const currentAlpha = alphas.array[i];
      alphas.array[i] += (targetAlpha - currentAlpha) * 0.1;
    });

    colors.needsUpdate = true;
    alphas.needsUpdate = true;
  });

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove} onClick={handleClick}>
      {/* Chunk Points */}
      <primitive
        ref={pointsRef}
        object={new THREE.Points(geometry, material)}
        dispose={null}
      />

      {/* Query Point */}
      {query && (
        <group>
          <mesh
            ref={queryRef}
            geometry={new THREE.SphereGeometry(0.2, 32, 32)}
            material={new THREE.MeshBasicMaterial({
              color: '#ffd700',
              transparent: true,
              opacity: 1,
              depthWrite: false,
            })}
            position={query.position}
          >
            {!prefersReducedMotion && (
              <animate
                attributeName="scale"
                values="1; 1.4; 1"
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </mesh>

          {/* Query Label */}
          <Html
            transform
            position={[query.position[0], query.position[1] + 0.6, query.position[2]]}
            style={{ pointerEvents: 'none', textAlign: 'center' }}
          >
            <motion.div
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: 'var(--bg-glass)',
                color: '#ffd700',
                border: '1px solid #ffd700',
                backdropFilter: 'blur(8px)',
                boxShadow: 'var(--shadow-lg)',
                whiteSpace: 'nowrap',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              🔍 Query
            </motion.div>
          </Html>
        </group>
      )}

      {/* Search Radius */}
      {query && showRadius && (
        <mesh
          ref={radiusRef}
          geometry={new THREE.SphereGeometry(radius, 32, 32)}
          material={new THREE.MeshBasicMaterial({
            color: '#ffd700',
            transparent: true,
            opacity: 0.05,
            wireframe: true,
            depthWrite: false,
          })}
          position={query.position}
        >
          {!prefersReducedMotion && (
            <animate
              attributeName="scale"
              values="1; 1.05; 1"
              dur="3s"
              repeatCount="indefinite"
            />
          )}
        </mesh>
      )}

      {/* Connection Lines */}
      {Array.from(lineRefs.current.values()).map((line, i) => (
        <primitive key={i} object={line} dispose={null} />
      ))}

      {/* Chunk Labels */}
      {showLabels && chunks.map(chunk => (
        <Html
          key={chunk.id}
          transform
          position={[chunk.position[0], chunk.position[1] + 0.4, chunk.position[2]]}
          style={{ pointerEvents: 'none', zIndex: 10 }}
        >
          <div
            className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none"
            style={{
              background: 'var(--bg-glass)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-glass)',
              backdropFilter: 'blur(8px)',
              opacity: hoveredChunk?.id === chunk.id ? 1 : 0.4,
              transform: hoveredChunk?.id === chunk.id ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }}
          >
            {chunk.documentName} • #{chunk.chunkIndex}
          </div>
        </Html>
      ))}

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredChunk && (
          <Html
            transform
            position={[
              hoveredChunk.position[0],
              hoveredChunk.position[1] + 1.2,
              hoveredChunk.position[2]
            ]}
            style={{ pointerEvents: 'none', zIndex: 100 }}
          >
            <motion.div
              className="three-tooltip"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
            >
              <div className="tooltip-title">{hoveredChunk.documentName}</div>
              <div className="tooltip-row">
                <span className="tooltip-label">KB</span>
                <span className="tooltip-value">{hoveredChunk.kbName}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Chunk</span>
                <span className="tooltip-value">#{hoveredChunk.chunkIndex}</span>
              </div>
              {hoveredChunk.similarity !== undefined && (
                <div className="tooltip-row">
                  <span className="tooltip-label">Similarity</span>
                  <span className="tooltip-value" style={{ color: 'var(--accent-success)' }}>
                    {(hoveredChunk.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="tooltip-row">
                <span className="tooltip-label">Preview</span>
                <span className="tooltip-value" style={{ maxWidth: '200px', textAlign: 'right', opacity: 0.7 }}>
                  {hoveredChunk.text.slice(0, 80)}...
                </span>
              </div>
            </motion.div>
          </Html>
        )}
      </AnimatePresence>

      {/* Selected Chunk Detail Panel */}
      <AnimatePresence>
        {selectedChunk && (
          <Html
            transform
            position={[0, -4, 0]}
            style={{ pointerEvents: 'auto', zIndex: 100 }}
          >
            <motion.div
              className="glass-strong rounded-xl p-4 max-w-md"
              style={{
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border-focus)',
                maxHeight: '300px',
                overflow: 'auto',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="font-semibold">{selectedChunk.documentName}</div>
                  <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {selectedChunk.kbName} • Chunk #{selectedChunk.chunkIndex}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedChunk(null); onChunkHover?.(null); }}
                  className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedChunk.similarity !== undefined && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--accent-success)', width: `${selectedChunk.similarity * 100}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedChunk.similarity * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-sm font-mono" style={{ color: 'var(--accent-success)' }}>
                    {(selectedChunk.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {selectedChunk.text}
              </div>
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
}

// Controls component
export function VectorSpaceControls({
  onResetCamera,
  onToggleRadius,
  showRadius,
  onToggleLabels,
  showLabels,
  onToggle2D,
  is3D,
}: {
  onResetCamera: () => void;
  onToggleRadius: () => void;
  showRadius: boolean;
  onToggleLabels: () => void;
  showLabels: boolean;
  onToggle2D: () => void;
  is3D: boolean;
}) {
  return (
    <div className="vector-space-controls">
      <div className="control-row">
        <button
          onClick={onResetCamera}
          className="btn-ghost px-3 py-1.5 text-sm gap-1"
          title="Reset Camera (R)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M21 12a9 9 0 1 1-9 9 9.75 9.75 0 0 1 6.74-2.74L21 16" />
          </svg>
          Reset View
        </button>

        <button
          onClick={onToggleRadius}
          className={`btn-ghost px-3 py-1.5 text-sm gap-1 ${showRadius ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : ''}`}
          title="Toggle Search Radius"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
          </svg>
          Search Radius
        </button>

        <button
          onClick={onToggleLabels}
          className={`btn-ghost px-3 py-1.5 text-sm gap-1 ${showLabels ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : ''}`}
          title="Toggle Labels"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            <path d="M15 5l4 4" />
          </svg>
          Labels
        </button>

        <button
          onClick={onToggle2D}
          className={`btn-ghost px-3 py-1.5 text-sm gap-1 ${!is3D ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : ''}`}
          title={`Switch to ${is3D ? '2D' : '3D'} View`}
        >
          {is3D ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 16.5 12 21 7 16.5" />
              <path d="M15 11 12 15 9 11" />
              <path d="M12 2.5 20 7 20 17 12 22.5 4 17 4 7z" />
              <path d="M12 22.5 4 17" />
              <path d="M12 22.5 20 17" />
            </svg>
          )}
          {is3D ? '2D View' : '3D View'}
        </button>
      </div>
    </div>
  );
}

// 2D Fallback using Canvas/SVG
export function VectorSpace2D({
  chunks = [],
  query = null,
  retrievedIds = [],
  onChunkHover,
  onChunkClick,
  width = 600,
  height = 400,
}: {
  chunks: ChunkPoint[];
  query?: QueryPoint | null;
  retrievedIds?: string[];
  onChunkHover?: (chunk: ChunkPoint | null) => void;
  onChunkClick?: (chunk: ChunkPoint) => void;
  width?: number;
  height?: number;
}) {
  const [hoveredChunk, setHoveredChunk] = useState<ChunkPoint | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Project 3D to 2D (simple orthographic)
  const project = useCallback((pos: [number, number, number]) => {
    const scale = Math.min(width, height) / 10;
    return {
      x: width / 2 + pos[0] * scale,
      y: height / 2 - pos[1] * scale,
      z: pos[2],
    };
  }, [width, height]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw chunks
      chunks.forEach(chunk => {
        const p = project(chunk.position);
        const isRetrieved = retrievedIds.includes(chunk.id);
        const isHovered = hoveredChunk?.id === chunk.id;

        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 8 : isRetrieved ? 6 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#ffd700' : isRetrieved ? chunk.color : chunk.color + 'CC';
        ctx.fill();

        if (isRetrieved) {
          ctx.strokeStyle = chunk.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw query
      if (query) {
        const q = project(query.position);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw radius
        const radiusPx = 3 * (Math.min(width, height) / 10);
        ctx.beginPath();
        ctx.arc(q.x, q.y, radiusPx, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd70040';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Connections
        chunks.filter(c => retrievedIds.includes(c.id)).forEach(chunk => {
          const c = project(chunk.position);
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(c.x, c.y);
          ctx.strokeStyle = chunk.color + '80';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // Draw hovered label
      if (hoveredChunk) {
        const p = project(hoveredChunk.position);
        ctx.font = '12px system-ui';
        ctx.fillStyle = 'var(--text-primary)';
        ctx.textAlign = 'center';
        ctx.fillText(`${hoveredChunk.documentName} #${hoveredChunk.chunkIndex}`, p.x, p.y - 15);
      }
    };

    draw();
  }, [chunks, query, retrievedIds, hoveredChunk, width, height, project]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let found: ChunkPoint | null = null;
    let minDist = 20;

    chunks.forEach(chunk => {
      const p = project(chunk.position);
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < minDist) {
        minDist = dist;
        found = chunk;
      }
    });

    if (found !== hoveredChunk) {
      setHoveredChunk(found);
      onChunkHover?.(found);
    }
  }, [chunks, hoveredChunk, onChunkHover, project]);

  const handleClick = useCallback(() => {
    if (hoveredChunk) {
      onChunkClick?.(hoveredChunk);
    }
  }, [hoveredChunk, onChunkClick]);

  return (
    <div className="w-full" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredChunk(null); onChunkHover?.(null); }}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          background: 'var(--scene-bg)',
          border: '1px solid var(--border-primary)',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
}

// Wrapper with Canvas3D
interface VectorSpaceWrapperProps extends Omit<VectorSpaceProps, 'className' | 'style'> {
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
}

export async function VectorSpaceWrapper({
  cameraPosition = [0, 0, 8],
  enableControls = true,
  ...props
}: VectorSpaceWrapperProps) {
  const { Canvas3D } = await import('./Canvas3D');
  return (
    <Canvas3D cameraPosition={cameraPosition} enableControls={enableControls}>
      <VectorSpace {...props} />
    </Canvas3D>
  );
}