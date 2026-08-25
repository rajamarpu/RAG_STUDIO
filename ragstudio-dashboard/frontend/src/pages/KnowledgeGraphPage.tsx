import { useState } from 'react';
import { Canvas3D } from '../components/3d/Canvas3D';
import { KnowledgeGraph } from '../components/3d/KnowledgeGraph';
import { EmptyState } from '../components/ui/EmptyState';
import { Network, Search } from 'lucide-react';

export function KnowledgeGraphPage() {
  const [hasData, setHasData] = useState<boolean>(false);

  // In real app, fetch entities from documents/chunks; for now check if any docs exist to decide empty
  // We keep hasData false until real docs populate; user will see empty state with 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Knowledge Graph</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Visualize entities and relationships extracted from your documents — 0 nodes when empty</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>0 nodes</span>
        </div>
      </div>

      <div className="h-[500px] rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <Canvas3D fallback={<EmptyState icon={Network} title="WebGL unavailable" description="Graph requires WebGL. List view fallback shows entities." />}>
          <KnowledgeGraph onNodeClick={(n) => console.log(n)} onEdgeClick={(e) => console.log(e)} />
        </Canvas3D>
      </div>

      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search entities (real data after upload)" className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--text-primary)' }} />
        </div>
        <EmptyState icon={Network} title="No entities yet" description="Entities are extracted from document chunks after indexing. Upload a document to populate the graph." />
      </div>
    </div>
  );
}
