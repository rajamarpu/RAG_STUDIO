import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { systemApi } from '../api/client';

export function OllamaStatusBanner() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const h = await systemApi.health();
      setHealth(h);
    } catch {
      setHealth({ status: 'unhealthy', checks: { ollama: { status: 'unhealthy', error: 'API unreachable' } } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading || !health) return null;

  const ollama = health.checks?.ollama;
  const isUnhealthy = !ollama || ollama.status !== 'healthy';
  const missingModels = ollama && (!ollama.llm_model_available || !ollama.embedding_model_available);

  if (!isUnhealthy && !missingModels) return null;

  return (
    <div
      className="mx-6 mt-4 p-3 rounded-lg flex items-center justify-between gap-3 border"
      style={{
        background: isUnhealthy ? 'var(--accent-error)/08' : 'var(--accent-warning)/08',
        borderColor: isUnhealthy ? 'var(--accent-error)/20' : 'var(--accent-warning)/20',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex items-center gap-3">
        {isUnhealthy ? <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-error)' }} /> : <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-warning)' }} />}
        <div className="text-sm">
          <p className="font-medium">
            {isUnhealthy ? 'Ollama unavailable — answer generation will fail' : 'Ollama models missing'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {isUnhealthy
              ? ollama?.error || 'Check OLLAMA_BASE_URL (default http://localhost:11434) and docker compose logs rag-ollama'
              : `LLM ${ollama.llm_model_available ? 'ok' : 'missing'} • Embeddings ${ollama.embedding_model_available ? 'ok' : 'missing'} — run: ollama pull llama3:8b && ollama pull nomic-embed-text`}
          </p>
          {missingModels && ollama.models && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Available models: {ollama.models.length ? ollama.models.join(', ') : 'none'}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={fetchHealth}
        className="p-2 rounded-lg flex items-center gap-1 text-xs"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}
        aria-label="Recheck Ollama"
      >
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  );
}
