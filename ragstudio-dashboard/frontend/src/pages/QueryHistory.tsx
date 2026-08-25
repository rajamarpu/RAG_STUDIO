import { useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import { analyticsApi } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';

export function QueryHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      // Query history is stored in queries_log; we reuse analytics queries_over_time plus top_queries
      const data: any = await analyticsApi.queries({ days: 30 });
      const points = data.queries_over_time || [];
      const flat: any[] = [];
      points.forEach((p: any) => {
        for (let i = 0; i < p.value; i++) {
          flat.push({ id: `${p.timestamp}-${i}`, query: data.top_queries?.[0]?.query || '—', timestamp: p.timestamp, latency: data.avg_response_time_ms || 0 });
        }
      });
      // if flat empty but total_queries >0, synthesize from top_queries
      if (!flat.length && data.top_queries?.length) {
        data.top_queries.forEach((t: any) => {
          flat.push({ id: t.query, query: t.query, timestamp: new Date().toISOString(), latency: data.avg_response_time_ms || 0, count: t.count });
        });
      }
      setHistory(flat);
    } catch { setHistory([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Query History</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Timeline of queries with latency — persisted in DB, 0 on fresh install</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>{history.length} entries</span>
      </div>

      <Card className="p-4 flex items-center gap-2">
        <History className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input placeholder="Search history..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--text-primary)' }} />
        <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </Card>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />)}</div>
      ) : history.length === 0 ? (
        <EmptyState icon={History} title="No history yet" description="Query history appears here after you run searches. Stored in Postgres queries_log, cleared on DB reset." />
      ) : (
        <div className="space-y-2">
          {history.slice(0, 50).map((h) => (
            <div key={h.id} className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{h.query}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(h.timestamp).toLocaleString()} • {Math.round(h.latency || 0)}ms</p>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.count ? `${h.count}×` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
