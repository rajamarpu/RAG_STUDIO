import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, Search, Database, FileText, Layers, Clock, Trash2, Edit, Loader2 } from 'lucide-react';
import { knowledgeBaseApi } from '../api/client';
import { useUIStore } from '../stores/uiStore';

export function KnowledgeBases() {
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const { addToast } = useUIStore();

  const fetchKbs = async () => {
    try {
      setLoading(true);
      const res: any = await knowledgeBaseApi.list({ search: search || undefined, page: 1, page_size: 100 });
      setKbs(res.items || []);
    } catch {
      setKbs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKbs(); }, [search]);

  const handleCreate = async () => {
    if (!newName) return;
    try {
      await knowledgeBaseApi.create({ name: newName, description: newDesc });
      addToast('Knowledge base created', 'success');
      setNewName(''); setNewDesc(''); setShowCreate(false);
      fetchKbs();
    } catch (e: any) { addToast(e.message || 'Create failed', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeBaseApi.delete(id);
      addToast('Deleted', 'success');
      fetchKbs();
    } catch { addToast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Knowledge Bases</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{kbs.length} knowledge bases • {kbs.length === 0 ? '0 — create one to start' : 'real data from Postgres'}</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(!showCreate)} className="gap-2"><Plus className="w-4 h-4" /> New KB</Button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <Input placeholder="Name (e.g., Financial Docs)" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleCreate}>Create</Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-4 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="flex-1 max-w-md">
          <Input placeholder="Search KBs..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-5 h-5" />} />
        </div>
        <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}>{kbs.length} total</div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />)}</div>
      ) : kbs.length === 0 ? (
        <EmptyState icon={Database} title="No knowledge bases yet" description="Create one — counts start at 0 and CHUNK count reflects real Chroma vectors." actionLabel="Create Knowledge Base" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kbs.map((kb: any) => (
            <motion.div key={kb.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}><Database className="w-5 h-5" /></div>
                <div className="flex gap-1">
                  <button onClick={() => handleDelete(kb.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]" style={{ color: 'var(--text-muted)' }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{kb.name}</h3>
              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{kb.description || 'No description'}</p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{kb.document_count ?? 0}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Docs</p></div>
                <div><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{(kb.chunk_count ?? 0).toLocaleString()}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chunks</p></div>
                <div><p className="text-xs px-2 py-1 rounded-full" style={{ background: kb.status === 'active' ? 'var(--accent-success)/10' : 'var(--accent-warning)/10', color: kb.status === 'active' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{kb.status}</p></div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}><Clock className="w-3 h-3" /> {new Date(kb.updated_at).toLocaleDateString()}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
