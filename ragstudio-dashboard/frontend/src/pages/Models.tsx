import { useEffect, useState } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
  details?: Record<string, any>;
}

export function Models() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullName, setPullName] = useState('');
  const [pulling, setPulling] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/system/models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModels(data.models || []);
      if (data.error) setError(`Ollama: ${data.error}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModels(); }, []);

  const handlePull = async () => {
    const name = pullName.trim();
    if (!name) return;
    setPulling(true);
    try {
      const res = await fetch(`${API_BASE}/system/ollama/pull?model=${encodeURIComponent(name)}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Pull failed: HTTP ${res.status}`);
      setPullName('');
      await fetchModels();
    } catch (e: any) {
      setError(e?.message || 'Pull failed');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Models</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Ollama models available to the RAG engine. This page never goes blank — it shows an empty state when Ollama is offline.
          </p>
        </div>
        <button onClick={fetchModels} className="btn-secondary px-4 py-2 rounded-lg" disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>⚠ {error}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Start Ollama (`ollama serve`) and pull a model, e.g. `ollama pull llama3:8b`.</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <input
          value={pullName}
          onChange={(e) => setPullName(e.target.value)}
          placeholder="llama3:8b"
          className="px-3 py-2 rounded-lg border bg-transparent text-sm min-w-[220px]"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
        />
        <button onClick={handlePull} disabled={pulling || !pullName.trim()} className="btn-primary px-4 py-2 rounded-lg text-sm">
          {pulling ? 'Pulling…' : 'Pull model'}
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-24 rounded-lg" aria-busy="true" />
      ) : models.length === 0 ? (
        <div className="p-8 text-center rounded-lg border" style={{ borderColor: 'var(--border-primary)' }}>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No models found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Pull `llama3:8b` and `nomic-embed-text` to enable generation and embeddings.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {models.map((m) => (
            <div key={m.name} className="p-4 rounded-lg border flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {m.size ? `${(m.size / 1e9).toFixed(2)} GB` : 'size unknown'}{m.modified_at ? ` • ${new Date(m.modified_at).toLocaleString()}` : ''}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>ready</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Models;
