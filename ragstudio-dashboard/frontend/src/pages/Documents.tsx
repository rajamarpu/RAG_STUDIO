import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Upload, Search, FileText, FileCheck, Clock, AlertCircle, Trash2, Loader2, Database } from 'lucide-react';
import { documentApi, knowledgeBaseApi } from '../api/client';
import { useUIStore } from '../stores/uiStore';

export function Documents() {
  const [docs, setDocs] = useState<any[]>([]);
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedKb, setSelectedKb] = useState('');
  const { addToast } = useUIStore();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, kbRes] = await Promise.all([
        documentApi.list({ page: 1, page_size: 100, search: searchQuery || undefined }).catch(() => ({ items: [], total: 0 } as any)),
        knowledgeBaseApi.list({ page: 1, page_size: 100 }).catch(() => ({ items: [] } as any)),
      ]);
      setDocs(docRes.items || []);
      setKbs(kbRes.items || []);
      if (!selectedKb && kbRes.items?.[0]) setSelectedKb(kbRes.items[0].id);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [searchQuery]);

  const handleUpload = async () => {
    if (!selectedFile || !selectedKb) {
      addToast('Select file and knowledge base', 'warning');
      return;
    }
    try {
      setUploading(true);
      await documentApi.upload({ knowledge_base_id: selectedKb, file: selectedFile, title: selectedFile.name });
      addToast('Upload started — processing via Ollama embeddings', 'success');
      setSelectedFile(null);
      setTimeout(fetchData, 1000);
    } catch (e: any) {
      addToast(e.message || 'Upload failed — check Ollama', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, kbId: string) => {
    try {
      await documentApi.delete(id, kbId);
      addToast('Document deleted', 'success');
      fetchData();
    } catch { addToast('Delete failed', 'error'); }
  };

  const filtered = docs.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const total = docs.length;
  const indexed = docs.filter(d => d.status === 'completed').length;
  const processing = docs.filter(d => d.status === 'processing' || d.status === 'pending').length;
  const failed = docs.filter(d => d.status === 'failed').length;
  const totalSize = docs.reduce((sum, d) => sum + (d.file_size || 0), 0) / (1024 * 1024);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Documents</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{total} files uploaded • {total === 0 ? '0 — upload to see real data' : 'real counts from Postgres'}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" id="file-upload" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} accept=".pdf,.txt,.md,.docx,.html,.htm" />
          <select value={selectedKb} onChange={e => setSelectedKb(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
            {kbs.length === 0 ? <option value="">No KB — create one first</option> : kbs.map((k: any) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <label htmlFor="file-upload" className="px-4 py-2 rounded-lg cursor-pointer text-sm font-medium" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>{selectedFile ? selectedFile.name.slice(0, 20) : 'Choose file'}</label>
          <Button variant="primary" onClick={handleUpload} disabled={uploading || !selectedFile} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatItem label="Total" value={total} icon={FileText} color="var(--accent-primary)" />
        <StatItem label="Indexed" value={indexed} icon={FileCheck} color="var(--accent-success)" />
        <StatItem label="Processing" value={processing} icon={Loader2} color="var(--accent-warning)" />
        <StatItem label="Failed" value={failed} icon={AlertCircle} color="var(--accent-error)" />
        <StatItem label="Total Size" value={totalSize.toFixed(2) + ' MB'} icon={Database} color="var(--accent-secondary)" />
      </div>

      <div className="flex gap-4 mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="flex-1 max-w-md">
          <Input placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} leftIcon={<Search className="w-5 h-5" />} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={total === 0 ? 'No documents yet' : 'No matching documents'} description={total === 0 ? 'Upload 1 file and it will show as Files uploaded 1. Real data from Postgres + Chroma.' : 'Try changing filters.'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((doc: any) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: doc.status === 'completed' ? 'var(--accent-success)/10' : doc.status === 'failed' ? 'var(--accent-error)/10' : 'var(--accent-warning)/10', color: doc.status === 'completed' ? 'var(--accent-success)' : doc.status === 'failed' ? 'var(--accent-error)' : 'var(--accent-warning)' }}>
                  {doc.status === 'completed' ? <FileCheck className="w-5 h-5" /> : doc.status === 'failed' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{doc.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{doc.file_type} • {(doc.file_size / 1024).toFixed(1)} KB • {doc.chunk_count} chunks • KB {doc.knowledge_base_id.slice(0, 8)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{doc.status}</span>
                <button onClick={() => handleDelete(doc.id, doc.knowledge_base_id)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]" style={{ color: 'var(--text-muted)' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}/10`, color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}
