import { useEffect, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { chunkApi } from '../api/client';

export function Chunks() {
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kbFilter, setKbFilter] = useState('');

  const fetchChunks = async () => {
    try {
      setLoading(true);
      const response = await chunkApi.list({
        page: 1,
        page_size: 100,
        search: search || undefined,
        knowledge_base_id: kbFilter || undefined,
      });
      setChunks(response.items.map(chunk => ({ ...chunk, kb: chunk.knowledge_base_id })));
    } catch {
      setChunks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChunks(); }, [search, kbFilter]);

  const filtered = chunks.filter(c => c.text.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Chunks</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Browse all indexed chunks — 0 when no documents uploaded</p>
        </div>
        <div className="text-sm px-3 py-1 rounded-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>{chunks.length} chunks</div>
      </div>

      <Card className="p-4 flex gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
          <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chunks..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--text-primary)' }} />
        </div>
        <input value={kbFilter} onChange={e => setKbFilter(e.target.value)} placeholder="KB ID filter" className="px-3 py-2 rounded-lg text-sm w-48" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
      </Card>

      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No chunks yet" description="Chunks appear after you upload and index a document. Counts start at 0." />
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{c.id}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>#{c.chunk_index}</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.text}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{c.document_title} • KB {c.kb}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
