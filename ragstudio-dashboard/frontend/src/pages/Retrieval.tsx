import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas3D } from '../components/3d/Canvas3D';
import { CityBackground } from '../components/3d/CityBackground';
import { RagNetwork } from '../components/3d/RagNetwork';
import { VectorSpace } from '../components/3d/VectorSpace';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import {
  Search, Send, Loader2, X, Filter, ChevronDown, ChevronUp,
  Database, FileText, Brain, Zap, CheckCircle, AlertCircle,
  Copy, Download, Eye, Settings, SlidersHorizontal
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { queryApi, knowledgeBaseApi } from '../api/client';

const MOCK_KNOWLEDGE_BASES = [
  { id: '1', name: 'Financial Documents', documents: 47, chunks: 12340, color: 'var(--accent-primary)' },
  { id: '2', name: 'Technical Documentation', documents: 123, chunks: 28560, color: 'var(--accent-secondary)' },
  { id: '3', name: 'HR Policies', documents: 12, chunks: 3420, color: 'var(--accent-tertiary)' },
  { id: '4', name: 'Legal Contracts', documents: 34, chunks: 8920, color: 'var(--accent-info)' },
];

const MOCK_RESULTS = [
  {
    id: '1',
    content: 'The Q4 2024 revenue projection shows a 15% increase year-over-year, driven primarily by the new enterprise licensing model and expansion into APAC markets. Total projected revenue: $47.2M.',
    score: 0.94,
    metadata: { source: 'Q4_Financial_Report.pdf', page: 3, chunk: 12, kb: 'Financial Documents' },
    highlights: ['15% increase', '$47.2M', 'enterprise licensing', 'APAC markets']
  },
  {
    id: '2',
    content: 'Operating expenses for Q4 are projected at $12.8M, representing a 3% decrease from Q3 due to optimization of cloud infrastructure costs and reduction in contractor spend.',
    score: 0.89,
    metadata: { source: 'Q4_Financial_Report.pdf', page: 5, chunk: 28, kb: 'Financial Documents' },
    highlights: ['$12.8M', '3% decrease', 'cloud infrastructure', 'contractor spend']
  },
  {
    id: '3',
    content: 'The new vector database implementation using ChromaDB with HNSW indexing reduced query latency by 67% compared to the previous Pinecone setup, with p99 latency dropping from 380ms to 127ms.',
    score: 0.87,
    metadata: { source: 'Technical_Docs_v3.2.md', page: 12, chunk: 45, kb: 'Technical Documentation' },
    highlights: ['67% reduction', '127ms', 'ChromaDB', 'HNSW indexing']
  },
  {
    id: '4',
    content: 'Employee handbook section 4.2 outlines the remote work policy: employees may work remotely up to 3 days per week with manager approval. Full remote requests require VP-level sign-off.',
    score: 0.82,
    metadata: { source: 'Employee_Handbook_2024.pdf', page: 8, chunk: 3, kb: 'HR Policies' },
    highlights: ['3 days per week', 'manager approval', 'VP-level sign-off']
  },
  {
    id: '5',
    content: 'Service Level Agreement for Enterprise tier: 99.9% uptime guarantee, 4-hour response time for critical issues, 24/7 support access, dedicated success manager.',
    score: 0.78,
    metadata: { source: 'Enterprise_SLA.pdf', page: 2, chunk: 7, kb: 'Legal Contracts' },
    highlights: ['99.9% uptime', '4-hour response', '24/7 support', 'dedicated success manager']
  },
];

export function Retrieval() {
  const [query, setQuery] = useState('');
  const [realKbs, setRealKbs] = useState<any[]>([]);
  const [selectedKb, setSelectedKb] = useState<string[]>([]);
  const [topK, setTopK] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [results, setResults] = useState<typeof MOCK_RESULTS>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeResult, setActiveResult] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState<'pipeline' | 'vector' | 'both'>('both');
  const { setRetrievalActive, setRetrievalStage, setRetrievalProgress, addToast } = useUIStore();

  const queryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    knowledgeBaseApi.list({ page: 1, page_size: 100 }).then((res: any) => {
      const items = res.items || [];
      setRealKbs(items);
      if (items.length && selectedKb.length === 0) {
        setSelectedKb([items[0].id]);
      }
    }).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isSearching) return;
    if (!selectedKb.length) {
      addToast('Select at least one knowledge base', 'warning');
      return;
    }

    setIsSearching(true);
    setRetrievalActive(true);
    setResults([]);

    setSearchHistory(prev => [query, ...prev.filter(q => q !== query)].slice(0, 10));

    const stages = [
      { stage: 'embedding', progress: 15, label: 'Generating query embedding...' },
      { stage: 'retrieval', progress: 40, label: 'Searching vector space...' },
      { stage: 'reranking', progress: 65, label: 'Re-ranking results...' },
      { stage: 'synthesis', progress: 90, label: 'Synthesizing answer...' },
      { stage: 'complete', progress: 100, label: 'Complete' },
    ];

    for (const s of stages) {
      setRetrievalStage(s.stage);
      setRetrievalProgress(s.progress);
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      const kbId = selectedKb[0];
      const res: any = await queryApi.retrieve({
        query,
        knowledge_base_id: kbId,
        top_k: topK,
        similarity_threshold: similarityThreshold,
      });
      const mapped = (res.results || []).map((r: any, idx: number) => ({
        id: r.id || `${r.document_id}_${idx}`,
        content: r.content,
        score: r.score ?? 0.8,
        metadata: { source: r.document_title || r.metadata?.title || 'Unknown', page: r.metadata?.chunk_index ?? 1, chunk: r.metadata?.chunk_index ?? idx, kb: kbId },
        highlights: [],
      }));
      setResults(mapped);
      addToast(mapped.length ? `Found ${mapped.length} relevant chunks` : 'No relevant chunks — upload documents first', mapped.length ? 'success' : 'warning');
    } catch (e: any) {
      // fallback to mock for demo if backend unavailable, but show real error
      addToast(e.message || 'Retrieval failed — check Ollama and docs', 'error');
      setResults([]);
    } finally {
      setIsSearching(false);
      setRetrievalActive(false);
      setRetrievalStage(null);
      setRetrievalProgress(0);
    }
  }, [query, isSearching, topK, similarityThreshold, selectedKb, setRetrievalActive, setRetrievalStage, setRetrievalProgress, addToast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setActiveResult(null);
    queryRef.current?.focus();
  };

  const copyResult = (content: string) => {
    navigator.clipboard.writeText(content);
    addToast('Copied to clipboard', 'success');
  };

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
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Retrieval</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Query your knowledge bases with real-time 3D pipeline visualization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="gap-1">
              <SlidersHorizontal className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Panel: Query Input & Results */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:w-1/2 flex flex-col min-w-0"
        >
          {/* Query Input Card */}
          <Card variant="glass" className="flex-shrink-0">
            <div className="p-6 space-y-4">
              {/* Knowledge Base Selector */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Knowledge Bases <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({selectedKb.length} selected)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {realKbs.length === 0 ? (
                    <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-primary)' }}>
                      No knowledge bases — create one at <a href="/knowledge-bases" style={{ color: 'var(--accent-primary)' }}>Knowledge Bases</a>
                    </div>
                  ) : realKbs.map((kb: any) => (
                    <label
                      key={kb.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200 border ${
                        selectedKb.includes(kb.id)
                          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/50 text-[var(--accent-primary)]'
                          : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKb.includes(kb.id)}
                        onChange={(e) => setSelectedKb(prev =>
                          e.target.checked ? [...prev, kb.id] : prev.filter(id => id !== kb.id)
                        )}
                        className="w-4 h-4 rounded accent-[var(--accent-primary)]"
                      />
                      <span className="font-medium">{kb.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        {(kb.chunk_count ?? 0).toLocaleString()} chunks
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Query Input */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Query
                </label>
                <div className="relative">
                  <textarea
                    ref={queryRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your documents... (Press Enter to search, Shift+Enter for new line)"
                    className={`
                      w-full min-h-[100px] max-h-[200px] rounded-lg border transition-all duration-200 resize-none
                      bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-primary)]
                      placeholder-[var(--text-muted)] p-4 focus:outline-none
                      focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]
                    `}
                    style={{ fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1.6 }}
                    rows={4}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <Button
                      variant={query.trim() ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={handleSearch}
                      disabled={isSearching || !query.trim()}
                      className="gap-1"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Search
                        </>
                      )}
                    </Button>
                    {query.trim() && !isSearching && (
                      <Button variant="ghost" size="sm" onClick={clearSearch} aria-label="Clear query">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pt-4 border-t space-y-4"
                    style={{ borderColor: 'var(--border-primary)' }}
                  >
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Top K Results: {topK}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={topK}
                          onChange={(e) => setTopK(Number(e.target.value))}
                          className="w-full accent-[var(--accent-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Similarity Threshold: {similarityThreshold}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={similarityThreshold}
                          onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                          className="w-full accent-[var(--accent-primary)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[var(--accent-primary)]" />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hybrid Search (BM25 + Vector)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[var(--accent-primary)]" />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Re-rank with Cross-Encoder</span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Recent Searches</span>
                    <button
                      onClick={() => setSearchHistory([])}
                      className="text-xs text-[var(--accent-primary)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.slice(0, 5).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuery(q); handleSearch(); }}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                      >
                        {q.length > 40 ? q.slice(0, 40) + '...' : q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex-1 min-h-0"
          >
            {isSearching ? (
              <Card variant="glass" className="flex-1 min-h-0 flex flex-col">
                <div className="p-6">
                  <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Searching...</h3>
                  <div className="space-y-3">
                    {['Embedding query', 'Vector search', 'Re-ranking', 'Synthesizing'].map((stage, i) => (
                      <motion.div
                        key={stage}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <motion.div
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--accent-primary)' }}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{stage}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : results.length > 0 ? (
              <Card variant="glass" className="flex-1 min-h-0 flex flex-col">
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Results <span className="text-lg font-normal text-[var(--text-muted)]">({results.length})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={visualizationMode}
                      onChange={(e) => setVisualizationMode(e.target.value as typeof visualizationMode)}
                      className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                    >
                      <option value="both">Both</option>
                      <option value="pipeline">Pipeline</option>
                      <option value="vector">Vector Space</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <AnimatePresence mode="popLayout">
                    {results.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group"
                      >
                        <ResultCard
                          result={result}
                          index={index + 1}
                          isActive={activeResult === result.id}
                          onClick={() => setActiveResult(activeResult === result.id ? null : result.id)}
                          onCopy={() => copyResult(result.content)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </Card>
            ) : query.trim() && !isSearching ? (
              <Card variant="glass" className="h-full flex items-center justify-center">
                <div className="text-center p-12">
                  <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>No results found</h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Try adjusting your query or lowering the similarity threshold
                  </p>
                </div>
              </Card>
            ) : (
              <Card variant="glass" className="h-full flex items-center justify-center">
                <div className="text-center p-12">
                  <Brain className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Ready to search</h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Enter a query above to search your knowledge bases
                  </p>
                </div>
              </Card>
            )}
          </motion.div>
        </motion.div>

        {/* Right Panel: 3D Visualizations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="lg:w-1/2 flex flex-col gap-6 min-w-0"
        >
          {/* Pipeline Visualization */}
          {(visualizationMode === 'pipeline' || visualizationMode === 'both') && (
            <Card variant="glass" className="flex-1 min-h-0" style={{ minHeight: visualizationMode === 'both' ? '300px' : '500px' }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Zap className="w-5 h-5" />
                  RAG Pipeline
                </h3>
                <span className={`w-2 h-2 rounded-full ${isSearching ? 'bg-[var(--accent-primary)] animate-pulse' : 'bg-[var(--accent-success)]'}`} />
              </div>
              <div className="flex-1 p-4" style={{ height: visualizationMode === 'both' ? '250px' : '450px' }}>
                <Canvas3D fallback={<PipelineFallback />}>
                  <RagNetwork
                    showFlowParticles={isSearching}
                    animated={true}
                    highlightStage={isSearching ? 'retrieval' : undefined}
                  />
                </Canvas3D>
              </div>
            </Card>
          )}

          {/* Vector Space Visualization */}
          {(visualizationMode === 'vector' || visualizationMode === 'both') && (
            <Card variant="glass" className="flex-1 min-h-0" style={{ minHeight: visualizationMode === 'both' ? '300px' : '500px' }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Database className="w-5 h-5" />
                  Vector Space
                </h3>
                <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--accent-secondary)/10', color: 'var(--accent-secondary)' }}>
                  {results.length} results
                </span>
              </div>
              <div className="flex-1 p-4" style={{ height: visualizationMode === 'both' ? '250px' : '450px' }}>
                <Canvas3D fallback={<VectorFallback />}>
                  <VectorSpace
                    showQueryVector={true}
                    showConnections={true}
                    queryVector={query.trim() ? [0.1, 0.2, 0.3] : undefined}
                  />
                </Canvas3D>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  index,
  isActive,
  onClick,
  onCopy,
}: {
  result: typeof MOCK_RESULTS[0];
  index: number;
  isActive: boolean;
  onClick: () => void;
  onCopy: () => void;
}) {
  const kb = MOCK_KNOWLEDGE_BASES.find(k => k.id === result.metadata.kb);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-4 transition-all duration-200 cursor-pointer ${
        isActive
          ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
          : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
      }`}
      style={{ border: '1px solid var(--border-primary)' }}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: `${kb?.color}/10`, color: kb?.color }}>
                {result.metadata.kb}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {result.metadata.source} · p.{result.metadata.page} · ch.{result.metadata.chunk}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onCopy(); }} aria-label="Copy">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <span className="font-mono font-semibold px-2 py-0.5 rounded text-xs"
                style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
                {Math.round(result.score * 100)}%
              </span>
            </div>
          </div>

          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
            {result.content}
          </p>

          {/* Highlights */}
          {result.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.highlights.map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)/30' }}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Expanded Details */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Source:</span>
                  <p className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{result.metadata.source}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Knowledge Base:</span>
                  <p className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{result.metadata.kb}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Page:</span>
                  <p className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{result.metadata.page}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Chunk:</span>
                  <p className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{result.metadata.chunk}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Expand Indicator */}
        <div className="flex-shrink-0 p-1" style={{ color: 'var(--text-muted)' }}>
          {isActive ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
    </div>
  );
}

function PipelineFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-center p-8">
        <Zap className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pipeline Visualization</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>WebGL required for 3D</p>
      </div>
    </div>
  );
}

function VectorFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-center p-8">
        <Database className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-secondary)', opacity: 0.5 }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Vector Space</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>WebGL required for 3D</p>
      </div>
    </div>
  );
}