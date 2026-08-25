import { useState } from 'react';
import { FileText, ExternalLink, Copy, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function ApiDocs() {
  const [copied, setCopied] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endpoints = [
    { method: 'POST', path: '/knowledge-bases', desc: 'Create KB — persisted in Postgres' },
    { method: 'GET', path: '/knowledge-bases', desc: 'List KBs — total 0 when empty' },
    { method: 'POST', path: '/documents/upload', desc: 'Upload file → chunks → embeddings via Ollama' },
    { method: 'GET', path: '/documents', desc: 'List docs — 0 when empty' },
    { method: 'POST', path: '/query/retrieve', desc: 'Retrieve top_k chunks' },
    { method: 'POST', path: '/query/generate', desc: 'RAG generate with Ollama' },
    { method: 'POST', path: '/query/stream', desc: 'Streaming SSE' },
    { method: 'GET', path: '/system/health', desc: 'Ollama/Chroma/DB health' },
    { method: 'GET', path: '/analytics/overview', desc: 'Real DB aggregation, zero defaults' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>API Docs</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Live spec at {apiUrl.replace('/api/v1','')}/docs when DEBUG=true</p>
        </div>
        <Button variant="secondary" onClick={() => window.open(`${apiUrl.replace('/api/v1','')}/docs`, '_blank')} className="gap-2"><ExternalLink className="w-4 h-4" /> Open Swagger</Button>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{apiUrl}</span>
        </div>
        <button onClick={() => copy(apiUrl)} className="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          {copied ? <Check className="w-4 h-4" style={{ color: 'var(--accent-success)' }} /> : <Copy className="w-4 h-4" />}
        </button>
      </Card>

      <div className="space-y-2">
        {endpoints.map(e => (
          <div key={e.path} className="p-4 rounded-xl flex items-center gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: e.method === 'GET' ? 'var(--accent-info)/15' : e.method === 'POST' ? 'var(--accent-success)/15' : 'var(--accent-tertiary)/15', color: e.method === 'GET' ? 'var(--accent-info)' : e.method === 'POST' ? 'var(--accent-success)' : 'var(--accent-tertiary)' }}>{e.method}</span>
            <span className="font-mono text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{e.path}</span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{e.desc}</span>
          </div>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Ollama Requirement</h3>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Answer generation requires Ollama running with models:</p>
        <pre className="mt-2 p-3 rounded-lg text-xs overflow-x-auto" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>{`ollama pull llama3:8b
ollama pull nomic-embed-text
# verify
curl http://localhost:11434/api/tags
curl http://localhost:8000/api/v1/system/health`}</pre>
      </Card>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-primary)', height: '500px' }}>
        <iframe title="Swagger" src={`${apiUrl.replace('/api/v1','')}/docs`} className="w-full h-full" style={{ background: 'white' }} />
      </div>
    </div>
  );
}
