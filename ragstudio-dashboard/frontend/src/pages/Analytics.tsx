import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas3D } from '../components/3d/Canvas3D';
import { RagNetwork } from '../components/3d/RagNetwork';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import {
  TrendingUp, TrendingDown, Activity, Clock, Users, Database,
  FileText, Brain, Zap, Globe, Shield, Download, Filter,
  ChevronLeft, ChevronRight, Calendar, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { analyticsApi, knowledgeBaseApi } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';

export function Analytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'usage' | 'queries'>('overview');
  const { addToast } = useUIStore();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const [ov, kbList] = await Promise.all([
          analyticsApi.overview().catch(() => null),
          knowledgeBaseApi.list({ page: 1, page_size: 20 }).catch(() => ({ items: [], total: 0 } as any)),
        ]);
        if (cancelled) return;
        // if overview null, construct zero
        if (!ov) {
          setOverview(null);
        } else {
          // augment topQueries/queries if empty
          setOverview({
            ...ov,
            // ensure shape
            queries: ov.queries || { total_queries: 0, avg_response_time_ms: 0, success_rate: 0, queries_over_time: [], top_queries: [] },
            usage: ov.usage || { total_documents: 0, total_chunks: 0, total_knowledge_bases: 0, total_conversations: 0, storage_used_mb: 0, api_calls_today: 0, active_users: 0 },
            performance: ov.performance || { avg_embedding_time_ms:0, avg_retrieval_time_ms:0, avg_generation_time_ms:0, p50_response_time_ms:0, p95_response_time_ms:0, p99_response_time_ms:0, error_rate:0, throughput_qps:0 },
            kbList: kbList,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [timeRange]);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Monitor system performance, usage patterns, and query trends
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              options={[
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
              ]}
              className="w-40"
            />
            <Button variant="secondary" className="gap-1" onClick={() => {
              const blob = new Blob([JSON.stringify(overview || {}, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics-${timeRange}.json`;
              a.click();
              URL.revokeObjectURL(url);
              addToast('Analytics exported', 'success');
            }}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'performance', label: 'Performance', icon: Activity },
          { id: 'usage', label: 'KB Usage', icon: Database },
          { id: 'queries', label: 'Top Queries', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
            style={{
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab overview={overview} loading={loading} />}
        {activeTab === 'performance' && <PerformanceTab performance={overview?.performance} />}
        {activeTab === 'usage' && <UsageTab usage={overview?.usage} queries={overview?.queries} kbList={overview?.kbList} />}
        {activeTab === 'queries' && <QueriesTab topQueries={overview?.queries?.top_queries || []} />}
      </div>
    </div>
  );
}

function OverviewTab({ overview, loading }: { overview: any; loading: boolean }) {
  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>Loading analytics...</div>;
  }
  if (!overview) {
    return <EmptyState icon={BarChart3} title="No analytics yet" description="Analytics start at 0. Upload documents and run queries to see real metrics." />;
  }
  const stats = {
    totalQueries: overview.queries?.total_queries ?? 0,
    avgLatency: Math.round(overview.queries?.avg_response_time_ms ?? 0),
    successRate: Math.round((overview.queries?.success_rate ?? 0) * 1000) / 10,
    activeUsers: overview.usage?.active_users ?? 0,
    totalDocuments: overview.usage?.total_documents ?? 0,
    totalChunks: overview.usage?.total_chunks ?? 0,
  };
  const queryVolume = (overview.queries?.queries_over_time || []).map((p: any) => ({
    date: p.timestamp,
    queries: p.value,
    latency: stats.avgLatency,
    successRate: stats.successRate,
  }));
  const kbUsage = (overview.kbList?.items || []).slice(0, 5).map((kb: any, i: number) => ({
    name: kb.name, queries: 0, latency: stats.avgLatency, chunks: kb.chunk_count || 0, color: ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-tertiary)', 'var(--accent-info)', 'var(--accent-success)'][i % 5],
  }));
  const topQueries = overview.queries?.top_queries || [];
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, queries: 0 }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={Activity} label="Total Queries" value={stats.totalQueries.toLocaleString()} change={stats.totalQueries ? `${stats.totalQueries} total` : 'No queries'} positive={true} color="var(--accent-primary)" />
        <MetricCard icon={Clock} label="Avg Latency" value={`${stats.avgLatency}ms`} change={stats.avgLatency ? `${stats.avgLatency}ms avg` : 'No data'} positive={true} color="var(--accent-success)" />
        <MetricCard icon={Shield} label="Success Rate" value={`${stats.successRate}%`} change={stats.successRate ? `${stats.successRate}%` : 'No data'} positive={true} color="var(--accent-primary)" />
        <MetricCard icon={Users} label="Active Users" value={stats.activeUsers.toString()} change={stats.activeUsers ? `${stats.activeUsers}` : '0 users'} positive={true} color="var(--accent-secondary)" />
        <MetricCard icon={FileText} label="Documents" value={stats.totalDocuments.toString()} change={stats.totalDocuments ? `${stats.totalDocuments} docs` : 'No docs'} positive={true} color="var(--accent-tertiary)" />
        <MetricCard icon={Brain} label="Total Chunks" value={stats.totalChunks.toLocaleString()} change={stats.totalChunks ? `${stats.totalChunks} chunks` : 'No chunks'} positive={true} color="var(--accent-info)" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="glass" className="h-[clamp(250px,30vh,350px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Query Volume & Latency</h3>
          </div>
          <div className="flex-1 p-4">
            {queryVolume.length && queryVolume.some((d: any) => d.queries > 0) ? <QueryVolumeChart data={queryVolume} /> : <EmptyState title="No query volume yet" description="Run a query to see volume over time." />}
          </div>
        </Card>

        <Card variant="glass" className="h-[clamp(250px,30vh,350px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Knowledge Base Usage</h3>
          </div>
          <div className="flex-1 p-4">
            {kbUsage.length ? <KBUsageChart data={kbUsage} /> : <EmptyState title="No KB usage yet" description="Create a KB and upload documents." />}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="glass" className="h-[clamp(250px,30vh,350px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Hourly Query Distribution</h3>
          </div>
          <div className="flex-1 p-4">
            <HourlyDistributionChart data={hourly} />
          </div>
        </Card>

        <Card variant="glass" className="h-[clamp(250px,30vh,350px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Top Queries</h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {topQueries.length ? <TopQueriesTable data={topQueries.map((t: any) => ({ query: t.query, count: t.count, avgLatency: stats.avgLatency, successRate: stats.successRate }))} /> : <EmptyState title="No queries yet" description="Top queries will appear after you run searches." />}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function PerformanceTab({ performance }: { performance?: any }) {
  const p = performance || { avg_embedding_time_ms: 0, avg_retrieval_time_ms: 0, avg_generation_time_ms: 0, p50_response_time_ms: 0, p95_response_time_ms: 0, p99_response_time_ms: 0, error_rate: 0, throughput_qps: 0 };
  const isZero = !p.p50_response_time_ms && !p.avg_embedding_time_ms;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="space-y-6">
      {isZero && <EmptyState icon={Activity} title="No performance data" description="Run queries to populate latency percentiles." />}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="glass" className="h-[clamp(280px,35vh,400px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Latency Trend (p50, p95, p99)</h3>
          </div>
          <div className="flex-1 p-4 flex flex-col justify-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <div>p50: {p.p50_response_time_ms}ms</div><div>p95: {p.p95_response_time_ms}ms</div><div>p99: {p.p99_response_time_ms}ms</div><div className="mt-2"><LatencyTrendChart /></div>
          </div>
        </Card>
        <Card variant="glass" className="h-[clamp(280px,35vh,400px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Success Rate Over Time</h3>
          </div>
          <div className="flex-1 p-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Error rate: {(p.error_rate * 100).toFixed(2)}% • Throughput: {p.throughput_qps} qps</div>
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="glass" className="h-[clamp(280px,35vh,400px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pipeline Stage Latency</h3>
          </div>
          <div className="flex-1 p-4"><Canvas3D fallback={<PipelineFallback />}><RagNetwork animated={true} showFlowParticles={true} /></Canvas3D></div>
        </Card>
        <Card variant="glass" className="h-[clamp(280px,35vh,400px)] flex flex-col">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Latency Percentiles</h3>
          </div>
          <div className="flex-1 p-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Embed: {p.avg_embedding_time_ms}ms • Retrieve: {p.avg_retrieval_time_ms}ms • Generate: {p.avg_generation_time_ms}ms</div>
        </Card>
      </div>
    </motion.div>
  );
}

function UsageTab({ usage, queries, kbList }: any) {
  const kbUsage = (kbList?.items || []).map((kb: any, i: number) => ({
    name: kb.name, queries: 0, latency: queries?.avg_response_time_ms || 0, chunks: kb.chunk_count || 0, color: ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-tertiary)', 'var(--accent-info)', 'var(--accent-success)'][i % 5],
  }));
  if (!kbUsage.length) {
    return <EmptyState icon={Database} title="No KB usage" description="Usage will appear after you create KBs and run queries." />;
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {kbUsage.map((kb: any, index: number) => (
          <motion.div key={kb.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <KBDetailCard kb={kb} />
          </motion.div>
        ))}
      </div>
      <Card variant="glass" className="h-[clamp(280px,35vh,400px)] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Query Distribution by Knowledge Base</h3>
        </div>
        <div className="flex-1 p-4"><KBUsageChart data={kbUsage} /></div>
      </Card>
    </motion.div>
  );
}

function QueriesTab({ topQueries }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="space-y-6">
      <Card variant="glass" className="flex flex-col">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>All Queries</h3>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Filter queries..." className="px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm w-64" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {topQueries.length ? <TopQueriesTable data={topQueries.map((t: any) => ({ query: t.query, count: t.count, avgLatency: 0, successRate: 0 }))} showAll={true} /> : <EmptyState title="No queries" description="Queries will appear here after you search." />}
        </div>
      </Card>
    </motion.div>
  );
}

// Chart Components (simplified SVG-based charts for performance)
function MetricCard({ icon: Icon, label, value, change, positive, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; change: string; positive: boolean; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className={`text-xs font-medium ${positive ? 'text-[var(--accent-success)]' : 'text-[var(--accent-error)]'}`}>
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    </motion.div>
  );
}

function QueryVolumeChart({ data }: { data: any[] }) {
  const maxQueries = Math.max(...data.map(d => d.queries), 1);
  const maxLatency = Math.max(...data.map(d => d.latency), 1);

  return (
    <div className="h-full flex items-end gap-2">
      {data.map((d, i) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex-1 flex items-end justify-center">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.queries / maxQueries) * 100}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="w-full max-w-[40px] rounded-t"
              style={{ background: 'var(--accent-primary)', minHeight: '4px' }}
            />
          </div>
          <div className="w-full flex-1 flex items-end justify-center opacity-50">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.latency / maxLatency) * 100}%` }}
              transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
              className="w-full max-w-[20px] rounded-t"
              style={{ background: 'var(--accent-secondary)', minHeight: '2px' }}
            />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(d.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-2 ml-4" style={{ borderLeft: '1px solid var(--border-primary)', paddingLeft: '1rem' }}>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: 'var(--accent-primary)' }} />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Queries</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: 'var(--accent-secondary)' }} />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Latency (ms)</span>
        </div>
      </div>
    </div>
  );
}

function KBUsageChart({ data }: { data: any[] }) {
  const totalQueries = data.reduce((sum, d) => sum + (d.queries || 0), 0);
  const maxQueries = Math.max(...data.map(d => d.queries || 0), 1);

  return (
    <div className="h-full">
      <div className="flex items-end justify-between h-[200px] gap-2 mb-4">
        {data.map((d, i) => (
          <motion.div
            key={d.name}
            initial={{ height: 0 }}
            animate={{ height: `${(d.queries / maxQueries) * 100}%` }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="flex-1 flex items-end cursor-pointer"
            style={{ minWidth: '60px' }}
          >
            <div className="w-full rounded-t transition-colors"
              style={{ background: d.color, minHeight: '4px' }}
            />
          </motion.div>
        ))}
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <motion.div
            key={d.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className="w-3 h-3 rounded" style={{ background: d.color }} />
            <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
              {d.name}
            </span>
            <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              {d.queries.toLocaleString()}
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${d.color}/10`, color: d.color }}>
              {((d.queries / totalQueries) * 100).toFixed(1)}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function HourlyDistributionChart({ data }: { data: any[] }) {
  const maxQueries = Math.max(...data.map(d => d.queries), 1);

  return (
    <div className="h-full flex items-end gap-1">
      {data.map((d, i) => (
        <motion.div
          key={d.hour}
          initial={{ height: 0 }}
          animate={{ height: `${(d.queries / maxQueries) * 100}%` }}
          transition={{ delay: i * 0.02, duration: 0.4 }}
          className="flex-1 rounded-t cursor-pointer"
          style={{ background: 'var(--accent-primary)', minHeight: '4px' }}
        />
      ))}
    </div>
  );
}

function TopQueriesTable({ data, showAll }: { data: any[]; showAll?: boolean }) {
  const displayData = showAll ? data : data.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_80px_80px_80px] text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        <span>Query</span>
        <span>Count</span>
        <span>Avg Latency</span>
        <span>Success Rate</span>
      </div>
      <div className="space-y-2" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '0.5rem' }}>
        {displayData.map((item, index) => (
          <motion.div
            key={item.query}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-4 p-2 rounded-lg hover:bg-[var(--bg-tertiary)]"
          >
            <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.query}</span>
            <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{item.count}</span>
            <span className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>{item.avgLatency}ms</span>
            <span className="text-sm" style={{ color: item.successRate >= 99 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
              {item.successRate}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function KBDetailCard({ kb }: { kb: any }) {
  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{kb.name}</h4>
        <div className="w-3 h-3 rounded" style={{ background: kb.color }} />
      </div>
      <div className="space-y-3 text-center">
        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{kb.queries.toLocaleString()}</p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>queries this period</p>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{kb.latency}ms</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Avg Latency</p>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{kb.chunks.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Chunks</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LatencyTrendChart() {
  // Simplified placeholder
  return (
    <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      <Activity className="w-12 h-12" style={{ opacity: 0.5 }} />
    </div>
  );
}

function SuccessRateChart() {
  return (
    <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      <Shield className="w-12 h-12" style={{ opacity: 0.5 }} />
    </div>
  );
}

function LatencyPercentilesChart() {
  return (
    <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      <Clock className="w-12 h-12" style={{ opacity: 0.5 }} />
    </div>
  );
}

function PipelineFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
      <Zap className="w-12 h-12" style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
    </div>
  );
}