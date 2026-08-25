import { LifeBuoy, MessageCircle, Mail, ExternalLink, Activity, Database } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Support() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Support</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Help, docs, and system status</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6">
          <LifeBuoy className="w-8 h-8 mb-3" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Documentation</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>RAG Studio guides and API reference — see /api-docs for live spec.</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/api-docs'} className="gap-1">Open API Docs <ExternalLink className="w-4 h-4" /></Button>
        </Card>
        <Card className="p-6">
          <MessageCircle className="w-8 h-8 mb-3" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Community</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>GitHub issues and discussions for RAG Studio.</p>
          <Button variant="ghost" size="sm" onClick={() => window.open('https://github.com/anomalyco/opencode', '_blank')} className="gap-1">GitHub <ExternalLink className="w-4 h-4" /></Button>
        </Card>
        <Card className="p-6">
          <Mail className="w-8 h-8 mb-3" style={{ color: 'var(--accent-tertiary)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Contact</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>Reach the team for enterprise support.</p>
          <Button variant="ghost" size="sm" className="gap-1">support@ragstudio.ai <ExternalLink className="w-4 h-4" /></Button>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>System Status</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: 'var(--accent-success)' }} /><span>Ollama — check /system/health</span></div>
          <div className="flex items-center gap-2"><Database className="w-4 h-4" style={{ color: 'var(--accent-success)' }} /><span>Postgres/SQLite — 0 tables on fresh</span></div>
          <div className="flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: 'var(--accent-success)' }} /><span>Chroma — collection per KB</span></div>
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Version 1.0.0 • API prefix /api/v1 • Frontend :5176 strictPort</p>
      </Card>
    </div>
  );
}
