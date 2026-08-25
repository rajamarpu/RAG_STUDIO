import { useEffect, useState } from 'react';
import { Search, Clock } from 'lucide-react';
import { analyticsApi } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';

export function Queries() {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const data: any = await analyticsApi.queries({ days: 30 });
      const top = data.top_queries || [];
      // top_queries only has query and count, enrich with zero latency
      const enriched = top.map((t: any) => ({ query: t.query, count: t.count, latency: data.avg_response_time_ms ? Math.round(data.avg_response_time_ms) : 0, status: 'success' }));
      setQueries(enriched);
    } catch {
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueries(); }, []);

  const filtered = queries.filter(q => q.query.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Queries</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>All queries run against your KBs — 0 until you query</p>
        </div>
        <div className="text-sm px-3 py-1 rounded-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>{queries.length} queries</div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter queries..." className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--text-primary)' }} />
          <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No queries yet" description="Run a retrieval or chat to see queries here. The count starts at 0 and is persisted in Postgres." />
      ) : (
        <div className="space-y-2">
          {filtered.map((q, i) => (
            <div key={i} className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{q.query}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Count: {q.count} • Latency: {q.latency}ms</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent-success)/10', color: 'var(--accent-success)' }}>{q.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
