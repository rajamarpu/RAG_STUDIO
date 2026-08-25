import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../themes/ThemeProvider';
import { useReducedQuality } from './Canvas3D';

interface GraphNode {
  id: string;
  label: string;
  type: 'document' | 'chunk' | 'topic';
  position: [number, number, number];
  color: string;
  size: number;
  metadata?: Record<string, unknown>;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeHover?: (node: GraphNode | null) => void;
  onNodeClick?: (node: GraphNode) => void;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function KnowledgeGraph({
  nodes = [],
  edges = [],
  onNodeHover,
  onNodeClick,
  animate = true,
}: KnowledgeGraphProps) {
  const reducedQuality = useReducedQuality();
  const prefersReducedMotion = useReducedMotion();
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const edgeRefs = useRef<Map<string, THREE.Line>>(new Map());
  const forceRef = useRef<{ x: number; y: number; z: number }[]>([]);

  // Initialize force-directed positions if not set
  useEffect(() => {
    if (forceRef.current.length !== nodes.length) {
      forceRef.current = nodes.map(() => ({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 4,
      }));
    }
  }, [nodes.length]);

  // Force-directed layout simulation
  useFrame((_, delta) => {
    if (!animate || prefersReducedMotion || reducedQuality || nodes.length === 0) return;

    const k = 0.1; // Spring constant
    const repulsion = 2;
    const damping = 0.9;

    const forces = new Array(nodes.length).fill(0).map(() => ({ x: 0, y: 0, z: 0 }));

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = forceRef.current[i].x - forceRef.current[j].x;
        const dy = forceRef.current[i].y - forceRef.current[j].y;
        const dz = forceRef.current[i].z - forceRef.current[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        forces[i].x += fx;
        forces[i].y += fy;
        forces[i].z += fz;
        forces[j].x -= fx;
        forces[j].y -= fy;
        forces[j].z -= fz;
      }
    }

    // Attraction along edges
    edges.forEach(edge => {
      const sourceIdx = nodes.findIndex(n => n.id === edge.source);
      const targetIdx = nodes.findIndex(n => n.id === edge.target);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const dx = forceRef.current[targetIdx].x - forceRef.current[sourceIdx].x;
      const dy = forceRef.current[targetIdx].y - forceRef.current[sourceIdx].y;
      const dz = forceRef.current[targetIdx].z - forceRef.current[sourceIdx].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
      const force = k * dist * edge.weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      forces[sourceIdx].x += fx;
      forces[sourceIdx].y += fy;
      forces[sourceIdx].z += fz;
      forces[targetIdx].x -= fx;
      forces[targetIdx].y -= fy;
      forces[targetIdx].z -= fz;
    });

    // Apply forces with damping
    applyForces(forceRef.current, forces, delta, damping);
  });

  // Helper function to apply forces with damping
  function applyForces(
    positions: { x: number; y: number; z: number }[],
    forces: { x: number; y: number; z: number }[],
    delta: number,
    damping: number
  ) {
    for (let idx = 0; idx < positions.length; idx++) {
      const p = positions[idx];
      p.x += forces[idx].x * delta * 60;
      p.y += forces[idx].y * delta * 60;
      p.z += forces[idx].z * delta * 60;
      p.x *= damping;
      p.y *= damping;
      p.z *= damping;

      // Keep within bounds
      const maxDist = 10;
      const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      if (dist > maxDist) {
        const scale = maxDist / dist;
        p.x *= scale;
        p.y *= scale;
        p.z *= scale;
      }
    }
  }

  // Update node positions
  useFrame(() => {
    if (!animate || prefersReducedMotion) return;

    nodes.forEach((node, i) => {
      const mesh = nodeRefs.current.get(node.id);
      if (mesh) {
        const targetPos = forceRef.current[i] || node.position;
        mesh.position.lerp(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), 0.1);
      }
    });

    // Update edge positions
    edges.forEach(edge => {
      const line = edgeRefs.current.get(`${edge.source}-${edge.target}`);
      if (line) {
        const sourceIdx = nodes.findIndex(n => n.id === edge.source);
        const targetIdx = nodes.findIndex(n => n.id === edge.target);
        if (sourceIdx === -1 || targetIdx === -1) return;

        const sourcePos = forceRef.current[sourceIdx] || nodes[sourceIdx].position;
        const targetPos = forceRef.current[targetIdx] || nodes[targetIdx].position;

        const positions = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        positions.array[0] = sourcePos.x;
        positions.array[1] = sourcePos.y;
        positions.array[2] = sourcePos.z;
        positions.array[3] = targetPos.x;
        positions.array[4] = targetPos.y;
        positions.array[5] = targetPos.z;
        positions.needsUpdate = true;
      }
    });
  });

  // Create nodes
  useEffect(() => {
    if (!groupRef.current) return;

    nodes.forEach(node => {
      if (nodeRefs.current.has(node.id)) return;

      const geometry = new THREE.SphereGeometry(node.size, reducedQuality ? 8 : 16, reducedQuality ? 8 : 16);
      const material = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const pos = forceRef.current[nodes.indexOf(node)] || node.position;
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = { nodeId: node.id };

      nodeRefs.current.set(node.id, mesh);
      groupRef.current?.add(mesh);
    });

    // Remove old nodes
    nodeRefs.current.forEach((mesh, id) => {
      if (!nodes.some(n => n.id === id)) {
        groupRef.current?.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
        nodeRefs.current.delete(id);
      }
    });
  }, [nodes, reducedQuality]);

  // Create edges
  useEffect(() => {
    if (!groupRef.current) return;

    edges.forEach(edge => {
      const key = `${edge.source}-${edge.target}`;
      if (edgeRefs.current.has(key)) return;

      const sourceIdx = nodes.findIndex(n => n.id === edge.source);
      const targetIdx = nodes.findIndex(n => n.id === edge.target);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const sourcePos = forceRef.current[sourceIdx] || nodes[sourceIdx].position;
      const targetPos = forceRef.current[targetIdx] || nodes[targetIdx].position;

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      positions[0] = sourcePos.x;
      positions[1] = sourcePos.y;
      positions[2] = sourcePos.z;
      positions[3] = targetPos.x;
      positions[4] = targetPos.y;
      positions[5] = targetPos.z;
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: 'var(--scene-edge)',
        transparent: true,
        opacity: edge.weight * 0.4,
        linewidth: 1,
      });

      const line = new THREE.Line(geometry, material);
      line.renderOrder = -1;

      edgeRefs.current.set(key, line);
      groupRef.current?.add(line);
    });

    // Remove old edges
    edgeRefs.current.forEach((line, key) => {
      if (!edges.some(e => `${e.source}-${e.target}` === key)) {
        groupRef.current?.remove(line);
        line.geometry.dispose();
        if (line.material) {
          if (Array.isArray(line.material)) {
            line.material.forEach(m => m.dispose());
          } else {
            line.material.dispose();
          }
        }
        edgeRefs.current.delete(key);
      }
    });
  }, [edges, nodes]);

  // Raycasting for hover/click
  const handlePointerMove = (event: React.PointerEvent) => {
    if (!groupRef.current) return;

    const { camera, gl } = useThree();
    const mouse = new THREE.Vector2();
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const meshes = Array.from(nodeRefs.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const nodeId = intersects[0].object.userData.nodeId;
      const node = nodes.find(n => n.id === nodeId);
      if (node && node !== hoveredNode) {
        setHoveredNode(node);
        onNodeHover?.(node);
      }
    } else if (hoveredNode) {
      setHoveredNode(null);
      onNodeHover?.(null);
    }
  };

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      onNodeClick?.(hoveredNode);
    }
  };

  // Hover highlight animation
  useFrame(() => {
    if (prefersReducedMotion) return;

    nodeRefs.current.forEach((mesh, id) => {
      const node = nodes.find(n => n.id === id);
      if (!node) return;

      const isHovered = hoveredNode?.id === id;
      const isSelected = selectedNode?.id === id;

      if (isHovered || isSelected) {
        mesh.scale.lerp(new THREE.Vector3(1.5, 1.5, 1.5), 0.1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      } else {
        mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
      }
    });

    // Highlight connected edges on hover
    if (hoveredNode) {
      edgeRefs.current.forEach((line, key) => {
        const [source, target] = key.split('-');
        const isConnected = source === hoveredNode.id || target === hoveredNode.id;
        (line.material as THREE.LineBasicMaterial).opacity = isConnected ? 0.8 : 0.2;
        (line.material as THREE.LineBasicMaterial).color.set(isConnected ? hoveredNode.color : 'var(--scene-edge)');
      });
    } else {
      edgeRefs.current.forEach(line => {
        (line.material as THREE.LineBasicMaterial).opacity = 0.4;
        (line.material as THREE.LineBasicMaterial).color.set('var(--scene-edge)');
      });
    }
  });

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove} onClick={handleClick}>
      {/* Edges */}
      {Array.from(edgeRefs.current.values()).map((line, i) => (
        <primitive key={i} object={line} dispose={null} />
      ))}

      {/* Nodes */}
      {Array.from(nodeRefs.current.values()).map((mesh, i) => (
        <primitive key={i} object={mesh} dispose={null} />
      ))}

      {/* Hover Tooltip */}
      {hoveredNode && (
        <Html
          transform
          position={[
            hoveredNode.position[0],
            hoveredNode.position[1] + 1,
            hoveredNode.position[2]
          ]}
          style={{ pointerEvents: 'none', zIndex: 100 }}
        >
          <motion.div
            className="three-tooltip"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
          >
            <div className="tooltip-title">{hoveredNode.label}</div>
            <div className="tooltip-row">
              <span className="tooltip-label">Type</span>
              <span className="tooltip-value" style={{ textTransform: 'capitalize' }}>{hoveredNode.type}</span>
            </div>
            {hoveredNode.metadata && Object.entries(hoveredNode.metadata).map(([key, value]) => (
              <div key={key} className="tooltip-row">
                <span className="tooltip-label">{key}</span>
                <span className="tooltip-value">{String(value)}</span>
              </div>
            ))}
          </motion.div>
        </Html>
      )}

      {/* Selected Node Panel */}
      {selectedNode && (
        <Html
          transform
          position={[0, -4, 0]}
          style={{ pointerEvents: 'auto', zIndex: 100 }}
        >
          <motion.div
            className="glass-strong rounded-xl p-4 max-w-md"
            style={{ boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-focus)' }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="font-semibold">{selectedNode.label}</div>
                <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {selectedNode.type}
                </div>
              </div>
              <button
                onClick={() => { setSelectedNode(null); onNodeHover?.(null); }}
                className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {selectedNode.metadata && (
              <div className="space-y-2">
                {Object.entries(selectedNode.metadata).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span style={{ color: 'var(--text-tertiary)' }}>{key}:</span>
                    <span className="ml-2" style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </Html>
      )}
    </group>
  );
}

// Generate sample data for demo
export function generateSampleGraph(docCount: number = 5, chunksPerDoc: number = 3) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const topics = ['AI', 'ML', 'NLP', 'RAG', 'Vector DB', 'Embeddings', 'LLM', 'Transformers'];

  // Document nodes
  for (let i = 0; i < docCount; i++) {
    nodes.push({
      id: `doc-${i}`,
      label: `Document ${i + 1}`,
      type: 'document',
      position: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0],
      color: '#3b82f6',
      size: 0.25,
      metadata: { chunks: chunksPerDoc, pages: Math.floor(Math.random() * 20) + 5 },
    });
  }

  // Chunk nodes
  for (let i = 0; i < docCount; i++) {
    for (let j = 0; j < chunksPerDoc; j++) {
      const chunkId = `chunk-${i}-${j}`;
      nodes.push({
        id: chunkId,
        label: `Chunk ${j + 1}`,
        type: 'chunk',
        position: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0],
        color: '#8b5cf6',
        size: 0.12,
        metadata: { docIndex: i, tokens: Math.floor(Math.random() * 300) + 100 },
      });

      // Connect chunk to document
      edges.push({
        source: `doc-${i}`,
        target: chunkId,
        weight: 1,
      });
    }
  }

  // Topic nodes (shared across documents)
  topics.forEach((topic, i) => {
    const topicId = `topic-${i}`;
    nodes.push({
      id: topicId,
      label: topic,
      type: 'topic',
      position: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0],
      color: '#10b981',
      size: 0.18,
    });

    // Connect topics to random chunks
    const numConnections = Math.floor(Math.random() * 3) + 1;
    for (let k = 0; k < numConnections; k++) {
      const chunkIdx = Math.floor(Math.random() * (docCount * chunksPerDoc));
      edges.push({
        source: `chunk-${Math.floor(chunkIdx / chunksPerDoc)}-${chunkIdx % chunksPerDoc}`,
        target: topicId,
        weight: Math.random() * 0.5 + 0.5,
      });
    }
  });

  return { nodes, edges };
}

// Wrapper with Canvas3D
interface KnowledgeGraphWrapperProps extends Omit<KnowledgeGraphProps, 'className' | 'style'> {
  cameraPosition?: [number, number, number];
}

export async function KnowledgeGraphWrapper({
  cameraPosition = [0, 0, 10],
  ...props
}: KnowledgeGraphWrapperProps) {
  const { Canvas3D: Canvas3DComponent } = await import('./Canvas3D');
  return (
    <Canvas3DComponent cameraPosition={cameraPosition} enableControls={true} style={{ width: '100%', height: '100%' }}>
      <KnowledgeGraph {...props} />
    </Canvas3DComponent>
  );
}

// Mini version for cards
export async function MiniKnowledgeGraph({ nodeCount = 10, edgeCount = 15 }: { nodeCount?: number; edgeCount?: number }) {
  const { nodes, edges } = useMemo(() => generateSampleGraph(3, 2), []);
  const { Canvas3D: Canvas3DComponent } = await import('./Canvas3D');

  return (
    <div className="kb-graph w-full h-32">
      <Canvas3DComponent cameraPosition={[0, 0, 12]} enableControls={false} style={{ width: '100%', height: '100%' }}>
        <KnowledgeGraph
          nodes={nodes.slice(0, nodeCount)}
          edges={edges.slice(0, edgeCount)}
          animate={true}
        />
      </Canvas3DComponent>
    </div>
  );
}