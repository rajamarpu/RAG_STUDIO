import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas3D } from '../components/3d/Canvas3D';
import { CityBackground } from '../components/3d/CityBackground';
import { ParticleField } from '../components/3d/ParticleField';
import { RagNetwork } from '../components/3d/RagNetwork';
import { VectorSpace } from '../components/3d/VectorSpace';
import { KnowledgeGraph } from '../components/3d/KnowledgeGraph';
import { StatCard, RetrievalStage } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  FileText, Database, Search, Bot, Activity,
  Plus, Network, Globe, CheckCircle,
  Clock, HardDrive, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { systemApi, knowledgeBaseApi, analyticsApi } from '../api/client';
import { EmptyState, MetricSkeleton } from '../components/ui/EmptyState';

export function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'vector' | 'graph'>('overview');
  const { retrievalActive, retrievalStage, retrievalProgress } = useUIStore((state) => ({
    retrievalActive: state.retrievalActive,
    retrievalStage: state.retrievalStage,
    retrievalProgress: state.retrievalProgress,
  }));

  const [stats, setStats] = useState({
    kb: 0, docs: 0, chunks: 0, queries: 0, latency: 0, successRate: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [vectorCount, setVectorCount] = useState(0);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const [usage, queryAnalytics, kbRes, sysHealth] = await Promise.allSettled([
        analyticsApi.usage(),
        analyticsApi.queries({ days: 7 }),
        knowledgeBaseApi.list({ page: 1, page_size: 1 }),
        systemApi.health(),
      ]);

      const usageVal: any = usage.status === 'fulfilled' ? usage.value : null;
      const queryVal: any = queryAnalytics.status === 'fulfilled' ? queryAnalytics.value : null;
      const kbVal: any = kbRes.status === 'fulfilled' ? kbRes.value : null;
      const healthVal: any = sysHealth.status === 'fulfilled' ? sysHealth.value : null;

      setStats({
        kb: usageVal?.total_knowledge_bases ?? kbVal?.total ?? 0,
        docs: usageVal?.total_documents ?? 0,
        chunks: usageVal?.total_chunks ?? 0,
        queries: queryVal?.total_queries ?? usageVal?.api_calls_today ?? 0,
        latency: queryVal?.avg_response_time_ms ? Math.round(queryVal.avg_response_time_ms) : 0,
        successRate: queryVal?.success_rate ? Math.round(queryVal.success_rate * 1000) / 10 : 0,
      });
      setVectorCount(usageVal?.total_chunks ?? 0);
      setHealth(healthVal);

      // recent activity from documents + queries
      const activities: any[] = [];
      if (usageVal) {
        // we don't have real recent activity list yet; show zero state if none
        // try to fetch documents for recent activity
        try {
          const docRes: any = await (await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/documents?page=1&page_size=5`)).json();
          if (docRes?.items?.length) {
            docRes.items.forEach((d: any, i: number) => {
              activities.push({
                id: i, type: 'document', title: d.title, action: d.status === 'completed' ? 'Indexed' : d.status, time: new Date(d.updated_at || d.created_at).toLocaleString(), status: d.status === 'completed' ? 'success' : d.status === 'failed' ? 'error' : 'processing', kb: d.knowledge_base_id,
              });
            });
          }
        } catch {}
      }
      setRecentActivity(activities);
    } catch (e) {
      console.error('fetch stats failed', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, []);

  const STATS = [
    { label: 'Knowledge Bases', value: `${stats.kb}`, change: stats.kb === 0 ? 'No data yet' : `${stats.kb} total`, icon: Database, color: 'var(--accent-primary)', trend: 'up' },
    { label: 'Documents Indexed', value: `${stats.docs}`, change: stats.docs === 0 ? 'Upload a file' : `${stats.docs} total`, icon: FileText, color: 'var(--accent-secondary)', trend: 'up' },
    { label: 'Total Chunks', value: `${stats.chunks.toLocaleString()}`, change: stats.chunks === 0 ? '0 chunks' : `${stats.chunks.toLocaleString()} total`, icon: Layers, color: 'var(--accent-tertiary)', trend: 'up' },
    { label: 'Queries Today', value: `${stats.queries}`, change: stats.queries === 0 ? 'No queries yet' : `${stats.queries} total`, icon: Search, color: 'var(--accent-info)', trend: 'up' },
    { label: 'Avg Latency', value: stats.latency ? `${stats.latency}ms` : '0ms', change: stats.latency ? `${stats.latency}ms avg` : 'No data', icon: Clock, color: 'var(--accent-success)', trend: 'down' },
    { label: 'Success Rate', value: stats.successRate ? `${stats.successRate}%` : '0%', change: stats.successRate ? `${stats.successRate}% ok` : 'No data', icon: CheckCircle, color: 'var(--accent-primary)', trend: 'up' },
  ];

  const QUICK_ACTIONS = [
    { label: 'Upload Document', icon: Plus, action: 'upload', color: 'var(--accent-primary)' },
    { label: 'Create Knowledge Base', icon: Database, action: 'create-kb', color: 'var(--accent-secondary)' },
    { label: 'New Query', icon: Search, action: 'query', color: 'var(--accent-tertiary)' },
    { label: 'Start Chat', icon: Bot, action: 'chat', color: 'var(--accent-info)' },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Real-time overview — values are 0 until you upload and query
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1">
              <Activity className="w-4 h-4" />
              Live
            </Button>
            <Button variant="default" size="sm" className="gap-1" onClick={() => navigate('/documents')}>
              <Plus className="w-4 h-4" />
              New Document
            </Button>
          </div>
        </div>

        {retrievalActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <RetrievalStage
              stage={retrievalStage || 'processing'}
              progress={retrievalProgress}
              details="Processing your query..."
            />
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
      >
        {loadingStats ? (
          Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <StatCard
                label={stat.label}
                value={stat.value}
                change={stat.change}
                icon={stat.icon}
                trend={stat.trend}
                iconColor={stat.color}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'pipeline', label: 'Pipeline', icon: Network },
            { id: 'vector', label: 'Vector Space', icon: Globe },
            { id: 'graph', label: 'Knowledge Graph', icon: Database },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? 'bg-[var(--bg-primary)] shadow-sm' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
              style={{
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0">
          {activeTab === 'overview' && <OverviewTab recentActivity={recentActivity} health={health} vectorCount={vectorCount} quickActions={QUICK_ACTIONS} />}
          {activeTab === 'pipeline' && <PipelineTab />}
          {activeTab === 'vector' && <VectorTab vectorCount={vectorCount} />}
          {activeTab === 'graph' && <GraphTab />}
        </div>
      </motion.div>
    </div>
  );
}

function OverviewTab({ recentActivity, health, vectorCount, quickActions }: any) {
  const ollamaOk = health?.checks?.ollama?.status === 'healthy';
  const chromaOk = health?.checks?.chromadb?.status === 'healthy';

  return (
    <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:col-span-2 flex flex-col"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1rem' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>View All</Button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {recentActivity.length === 0 ? (
            <EmptyState icon={FileText} title="No activity yet" description="Upload a document to see recent indexing and query activity. Counts start at 0 and grow with real usage." actionLabel="Upload Document" onAction={() => navigate('/documents')} />
          ) : (
            recentActivity.map((activity: any, index: number) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="px-4 py-3 border-b last:border-0 flex items-center gap-4"
                style={{ borderColor: 'var(--border-primary)' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: activity.status === 'success' ? 'var(--accent-success)/10' :
                      activity.status === 'processing' ? 'var(--accent-warning)/10' :
                        'var(--accent-error)/10',
                    color: activity.status === 'success' ? 'var(--accent-success)' :
                      activity.status === 'processing' ? 'var(--accent-warning)' :
                        'var(--accent-error)',
                  }}
                >
                  {activity.type === 'document' && <FileText className="w-5 h-5" />}
                  {activity.type === 'query' && <Search className="w-5 h-5" />}
                  {activity.type === 'kb' && <Database className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{activity.title}</p>
                  <p className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>{activity.action} · {activity.kb}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${activity.status === 'success' ? 'bg-[var(--accent-success)]/10 text-[var(--accent-success)]' : activity.status === 'processing' ? 'bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] animate-pulse' : 'bg-[var(--accent-error)]/10 text-[var(--accent-error)]'}`}>
                    {activity.status === 'success' ? 'Completed' : activity.status === 'processing' ? 'Processing' : 'Failed'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{activity.time}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="space-y-6"
      >
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1rem' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2">
            {quickActions.map((action: any, index: number) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleQuickAction(action.action)}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}
                whileHover={{ backgroundColor: 'var(--bg-tertiary)', borderColor: action.color }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${action.color}/10`, color: action.color }}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1rem' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>System Health</h3>
          </div>
          <div className="p-4 space-y-4">
            {[
              { label: 'Ollama LLM', status: ollamaOk ? 'healthy' : 'unhealthy', detail: health?.checks?.ollama?.models?.join(', ') || (ollamaOk ? 'llama3:8b ready' : 'not ready — pull models') },
              { label: 'Embeddings', status: health?.checks?.ollama?.embedding_model_available ? 'healthy' : 'unhealthy', detail: health?.checks?.ollama?.embedding_model_available ? 'nomic-embed-text ready' : 'missing' },
              { label: 'ChromaDB', status: chromaOk ? 'healthy' : 'unhealthy', detail: health?.checks?.chromadb?.collections ? `${health.checks.chromadb.collections} collections` : 'checking...' },
              { label: 'API Server', status: 'healthy', detail: 'FastAPI · 5176' },
              { label: 'Vector Index', status: vectorCount > 0 ? 'healthy' : 'idle', detail: vectorCount ? `${vectorCount.toLocaleString()} vectors · HNSW` : '0 vectors — upload first' },
            ].map((healthItem, index) => (
              <motion.div
                key={healthItem.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${healthItem.status === 'healthy' ? 'bg-[var(--accent-success)]' : healthItem.status === 'idle' ? 'bg-[var(--accent-warning)]' : 'bg-[var(--accent-error)]'}`} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{healthItem.label}</span>
                </div>
                <span className="text-sm truncate max-w-[150px]" style={{ color: 'var(--text-tertiary)' }}>{healthItem.detail}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PipelineTab() {
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1rem' }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>RAG Pipeline Visualization</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
            Live
          </span>
        </div>
      </div>
      <div className="flex-1 p-4 min-h-0" style={{ height: 'clamp(280px, 40vh, 500px)' }}>
        <Canvas3D fallback={<PipelineFallback />}>
          <RagNetwork
            showFlowParticles={true}
            animated={true}
            onNodeClick={(node) => console.log('Node clicked:', node)}
          />
        </Canvas3D>
      </div>
    </div>
  );
}

function VectorTab({ vectorCount }: { vectorCount: number }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1rem' }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Vector Space Explorer</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent-secondary)/10', color: 'var(--accent-secondary)' }}>
            {vectorCount.toLocaleString()} vectors
          </span>
        </div>
      </div>
      <div className="flex-1 p-4 min-h-0" style={{ height: 'clamp(280px, 40vh, 500px)' }}>
        {vectorCount === 0 ? (
          <EmptyState icon={Globe} title="No vectors yet" description="Upload a document to populate the vector space. Chunks are embedded via Ollama nomic-embed-text." />
        ) : (
          <Canvas3D fallback={<VectorFallback />}>
            <VectorSpace
              onPointClick={(point) => console.log('Point clicked:', point)}
              showQueryVector={true}
              showConnections={true}
            />
          </Canvas3D>
        )}
      </div>
    </div>
  );
}

function GraphTab() {
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1rem' }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Knowledge Graph</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent-tertiary)/10', color: 'var(--accent-tertiary)' }}>
            Entities from docs
          </span>
        </div>
      </div>
      <div className="flex-1 p-4 min-h-0" style={{ height: 'clamp(280px, 40vh, 500px)' }}>
        <Canvas3D fallback={<GraphFallback />}>
          <KnowledgeGraph
            onNodeClick={(node) => console.log('Node clicked:', node)}
            onEdgeClick={(edge) => console.log('Edge clicked:', edge)}
          />
        </Canvas3D>
      </div>
    </div>
  );
}

function PipelineFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-center p-8">
        <Network className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>RAG Pipeline Visualization</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>WebGL required for 3D</p>
      </div>
    </div>
  );
}

function VectorFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-center p-8">
        <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-secondary)', opacity: 0.5 }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Vector Space Explorer</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>WebGL required for 3D</p>
      </div>
    </div>
  );
}

function GraphFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-center p-8">
        <Database className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-tertiary)', opacity: 0.5 }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Knowledge Graph</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>WebGL required for 3D</p>
      </div>
    </div>
  );
}

function handleQuickAction(action: string) {
  switch (action) {
    case 'upload':
      window.location.href = '/documents';
      break;
    case 'create-kb':
      window.location.href = '/knowledge-bases';
      break;
    case 'query':
      window.location.href = '/retrieval';
      break;
    case 'chat':
      window.location.href = '/chat';
      break;
  }
}
