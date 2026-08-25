import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas3D } from '../components/3d/Canvas3D';
import { RagNetwork } from '../components/3d/RagNetwork';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, FormModal } from '../components/ui/Modal';
import {
  Plus, Play, CheckCircle, AlertCircle, Clock, Loader2, X, Target,
  Award, BarChart3, FileCheck, Filter, Search, Download, RefreshCw,
  ThumbsUp, ThumbsDown, Star, TrendingUp, Database, Brain, Zap
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

interface Evaluation {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  score?: number;
  metrics: {
    faithfulness: number;
    answerRelevancy: number;
    contextPrecision: number;
    contextRecall: number;
    helpfulness: number;
  };
  testCases: number;
  passed: number;
  failed: number;
  lastRun?: string;
  kbName: string;
  createdAt: string;
}

const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: '1',
    name: 'Financial QA Accuracy',
    description: 'Evaluates answer correctness for financial queries against gold standard',
    status: 'passed',
    score: 94,
    metrics: { faithfulness: 96, answerRelevancy: 92, contextPrecision: 95, contextRecall: 93, helpfulness: 91 },
    testCases: 50,
    passed: 47,
    failed: 3,
    lastRun: '2 hours ago',
    kbName: 'Financial Documents',
    createdAt: '2024-12-10',
  },
  {
    id: '2',
    name: 'Technical Support Quality',
    description: 'Tests response quality for technical support scenarios',
    status: 'running',
    metrics: { faithfulness: 0, answerRelevancy: 0, contextPrecision: 0, contextRecall: 0, helpfulness: 0 },
    testCases: 75,
    passed: 0,
    failed: 0,
    kbName: 'Technical Documentation',
    createdAt: '2024-12-12',
  },
  {
    id: '3',
    name: 'HR Policy Compliance',
    description: 'Verifies policy citations are accurate and complete',
    status: 'failed',
    score: 72,
    metrics: { faithfulness: 78, answerRelevancy: 85, contextPrecision: 69, contextRecall: 71, helpfulness: 74 },
    testCases: 30,
    passed: 22,
    failed: 8,
    lastRun: '1 day ago',
    kbName: 'HR Policies',
    createdAt: '2024-11-20',
  },
  {
    id: '4',
    name: 'Legal Contract Extraction',
    description: 'Tests ability to extract key clauses from legal documents',
    status: 'pending',
    metrics: { faithfulness: 0, answerRelevancy: 0, contextPrecision: 0, contextRecall: 0, helpfulness: 0 },
    testCases: 40,
    passed: 0,
    failed: 0,
    kbName: 'Legal Contracts',
    createdAt: '2024-12-05',
  },
];

const MOCK_TEST_CASES = [
  {
    id: '1',
    query: 'What is the revenue projection for Q4 2024?',
    expectedAnswer: 'The revenue projection for Q4 2024 is $47.2M, representing 15% YoY growth.',
    generatedAnswer: 'Q4 2024 revenue is projected at $47.2M, a 15% increase from last year.',
    score: 0.96,
    passed: true,
    metrics: { faithfulness: 98, answerRelevancy: 94, contextPrecision: 95, contextRecall: 93, helpfulness: 92 },
  },
  {
    id: '2',
    query: 'What is the remote work policy?',
    expectedAnswer: 'Employees may work remotely up to 3 days per week with manager approval.',
    generatedAnswer: 'Remote work is allowed 3 days per week with manager approval.',
    score: 0.91,
    passed: true,
    metrics: { faithfulness: 93, answerRelevancy: 90, contextPrecision: 91, contextRecall: 89, helpfulness: 88 },
  },
  {
    id: '3',
    query: 'What is the SLA uptime guarantee?',
    expectedAnswer: '99.9% uptime guarantee with 4-hour response for critical issues.',
    generatedAnswer: 'The SLA guarantees 99.5% uptime with 24-hour response.',
    score: 0.62,
    passed: false,
    metrics: { faithfulness: 65, answerRelevancy: 70, contextPrecision: 63, contextRecall: 61, helpfulness: 68 },
  },
];

export function Evaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>(MOCK_EVALUATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'running' | 'pending'>('all');
  const [selectedEval, setSelectedEval] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const { addToast } = useUIStore();

  const filtered = evaluations
    .filter(e => {
      if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !e.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      return true;
    });

  const handleCreateEval = async (data: Record<string, unknown>) => {
    await new Promise(r => setTimeout(r, 1000));
    addToast('Evaluation suite created', 'success');
  };

  const handleRunEval = async (id: string) => {
    addToast('Evaluation started', 'info');
    setEvaluations(prev => prev.map(e => e.id === id ? { ...e, status: 'running' as const } : e));
    // Simulate running
    await new Promise(r => setTimeout(r, 3000));
    setEvaluations(prev => prev.map(e => e.id === id ? {
      ...e,
      status: 'passed' as const,
      score: 89,
      metrics: { faithfulness: 91, answerRelevancy: 88, contextPrecision: 90, contextRecall: 87, helpfulness: 85 },
      passed: e.testCases - 2,
      failed: 2,
      lastRun: 'just now',
    } : e));
  };

  const handleDeleteEval = async (id: string) => {
    setEvaluations(prev => prev.filter(e => e.id !== id));
    addToast('Evaluation deleted', 'success');
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
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Evaluations</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Test and measure RAG system quality with comprehensive metrics
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Evaluation
          </Button>
        </div>
      </motion.div>

      {viewMode === 'overview' ? (
        <>
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            <EvalStatCard
              label="Avg Score"
              value="88%"
              icon={Award}
              color="var(--accent-primary)"
              trend="+5%"
            />
            <EvalStatCard
              label="Passing Tests"
              value="69 / 195"
              icon={CheckCircle}
              color="var(--accent-success)"
              trend="+12"
            />
            <EvalStatCard
              label="Active Evaluations"
              value="4"
              icon={Target}
              color="var(--accent-secondary)"
              trend="+1"
            />
            <EvalStatCard
              label="Failed Tests"
              value="11"
              icon={AlertCircle}
              color="var(--accent-error)"
              trend="-3"
            />
          </motion.div>

          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 mb-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '1rem', padding: '1rem' }}
          >
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search evaluations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'passed', label: 'Passed' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'running', label: 'Running' },
                  { value: 'pending', label: 'Pending' },
                ]}
                className="w-40"
              />
              <Button variant="ghost" size="sm" onClick={() => {
                const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'evaluations.json';
                a.click();
                URL.revokeObjectURL(url);
                useUIStore.getState().addToast('Evaluations exported', 'success');
              }} className="gap-1">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </motion.div>

          {/* Evaluations List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex-1 overflow-y-auto space-y-3"
          >
            {filtered.map((evalSuite, index) => (
              <motion.div
                key={evalSuite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EvalCard
                  evaluation={evalSuite}
                  onClick={() => { setSelectedEval(evalSuite.id); setViewMode('detail'); }}
                  onRun={() => handleRunEval(evalSuite.id)}
                  onDelete={() => handleDeleteEval(evalSuite.id)}
                />
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Target className="w-16 h-16 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {searchQuery || statusFilter !== 'all' ? 'No evaluations found' : 'No evaluations yet'}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first evaluation suite'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button variant="primary" onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Evaluation
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </>
      ) : (
        /* Detail View */
        <EvaluationDetail
          evaluation={evaluations.find(e => e.id === selectedEval)!}
          onBack={() => setViewMode('overview')}
          onRun={() => handleRunEval(selectedEval!)}
        />
      )}

      {/* Create Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEval}
        title="Create Evaluation Suite"
        description="Set up a new evaluation to test RAG quality"
        submitText="Create"
      >
        <Input name="name" label="Name" placeholder="e.g., Financial QA Accuracy" required />
        <Input name="description" label="Description" placeholder="What will this evaluate?" />
        <Select
          name="kbId"
          label="Knowledge Base"
          options={[
            { value: '1', label: 'Financial Documents' },
            { value: '2', label: 'Technical Documentation' },
            { value: '3', label: 'HR Policies' },
            { value: '4', label: 'Legal Contracts' },
          ]}
        />
        <Select
          name="type"
          label="Evaluation Type"
          options={[
            { value: 'qa', label: 'Question Answering' },
            { value: 'faithfulness', label: 'Faithfulness' },
            { value: 'relevancy', label: 'Answer Relevancy' },
            { value: 'context', label: 'Context Precision/Recall' },
          ]}
        />
        <Input name="testCases" label="Test Cases" type="number" placeholder="50" />
      </FormModal>
    </div>
  );
}

function EvalStatCard({ label, value, icon: Icon, color, trend }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; trend: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-xs font-medium" style={{ color: isPositive ? 'var(--accent-success)' : 'var(--accent-error)' }}>
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    </div>
  );
}

function EvalCard({ evaluation, onClick, onRun, onDelete }: { evaluation: Evaluation; onClick: () => void; onRun: () => void; onDelete: () => void }) {
  const statusConfig = {
    passed: { icon: CheckCircle, color: 'var(--accent-success)', label: 'Passed', bg: 'var(--accent-success)/10' },
    failed: { icon: AlertCircle, color: 'var(--accent-error)', label: 'Failed', bg: 'var(--accent-error)/10' },
    running: { icon: Loader2, color: 'var(--accent-warning)', label: 'Running', bg: 'var(--accent-warning)/10', animate: true },
    pending: { icon: Clock, color: 'var(--accent-info)', label: 'Pending', bg: 'var(--accent-info)/10' },
  };

  const config = statusConfig[evaluation.status];
  const Icon = config.icon;

  return (
    <div
      className="p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{evaluation.name}</h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
              style={{ background: config.bg, color: config.color }}>
              <Icon className={`w-3 h-3 ${'animate' in config && config.animate ? 'animate-spin' : ''}`} />
              {config.label}
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>{evaluation.description}</p>

          {/* Score Bar (if completed) */}
          {evaluation.score !== undefined && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Overall Score</span>
                <span className="text-sm font-bold" style={{ color: evaluation.score >= 85 ? 'var(--accent-success)' : evaluation.score >= 70 ? 'var(--accent-warning)' : 'var(--accent-error)' }}>
                  {evaluation.score}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: evaluation.score >= 85 ? 'var(--accent-success)' : evaluation.score >= 70 ? 'var(--accent-warning)' : 'var(--accent-error)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${evaluation.score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Progress for running */}
          {evaluation.status === 'running' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Running test cases...</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{evaluation.passed + evaluation.failed} / {evaluation.testCases}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-warning)' }}
                  animate={{ width: `${(evaluation.passed + evaluation.failed) / evaluation.testCases * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: 'var(--text-tertiary)' }}>
              {evaluation.kbName}
            </span>
            {evaluation.status === 'passed' || evaluation.status === 'failed' ? (
              <>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-success)/10', color: 'var(--accent-success)' }}>
                  {evaluation.passed} passed
                </span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-error)/10', color: 'var(--accent-error)' }}>
                  {evaluation.failed} failed
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>{evaluation.testCases} test cases</span>
            )}
            {evaluation.lastRun && (
              <span style={{ color: 'var(--text-muted)' }}>· {evaluation.lastRun}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {evaluation.status !== 'running' && (
            <Button variant="ghost" size="sm" onClick={onRun} className="gap-1">
              <Play className="w-4 h-4" />
              Run
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1" style={{ color: 'var(--accent-error)' }}>
            <X className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function EvaluationDetail({ evaluation, onBack, onRun }: { evaluation: Evaluation; onBack: () => void; onRun: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'testcases' | 'metrics'>('overview');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </Button>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{evaluation.name}</h2>
        </div>
        <Button variant="primary" size="sm" onClick={onRun} className="gap-1">
          <Play className="w-4 h-4" />
          Run Evaluation
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'testcases', label: 'Test Cases', icon: FileCheck },
          { id: 'metrics', label: 'Metrics', icon: Target },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
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
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(evaluation.metrics).map(([key, value]) => (
                <MetricCard
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                  value={value === 0 ? 'N/A' : value}
                  color={value >= 85 ? 'var(--accent-success)' : value >= 70 ? 'var(--accent-warning)' : value > 0 ? 'var(--accent-error)' : 'var(--text-muted)'}
                />
              ))}
            </div>

            <Card variant="glass">
              <div className="p-6">
                <h3 className="font-semibold mb-4" style={{}}>Evaluation Summary</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt style={{ color: 'var(--text-tertiary)' }}>Knowledge Base</dt>
                        <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{evaluation.kbName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt style={{ color: 'var(--text-tertiary)' }}>Test Cases</dt>
                        <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{evaluation.testCases}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt style={{ color: 'var(--text-tertiary)' }}>Passed</dt>
                        <dd className="font-medium" style={{ color: 'var(--accent-success)' }}>{evaluation.passed}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt style={{ color: 'var(--text-tertiary)' }}>Failed</dt>
                        <dd className="font-medium" style={{ color: 'var(--accent-error)' }}>{evaluation.failed}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt style={{ color: 'var(--text-tertiary)' }}>Created</dt>
                        <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{evaluation.createdAt}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex items-center justify-center">
                    <Canvas3D fallback={<MetricFallback />}>
                      <RagNetwork animated={false} showFlowParticles={false} />
                    </Canvas3D>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'testcases' && (
          <div className="space-y-3">
            {MOCK_TEST_CASES.map((testCase, index) => {
              return (
                <motion.div
                  key={testCase.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{testCase.query}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        testCase.passed ? 'bg-[var(--accent-success)]/10 text-[var(--accent-success)]' : 'bg-[var(--accent-error)]/10 text-[var(--accent-error)]'
                      }`}>
                        {testCase.passed ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {testCase.passed ? 'Pass' : 'Fail'}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
                        {Math.round(testCase.score * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Expected Answer:</p>
                      <p style={{ color: 'var(--text-primary)' }}>{testCase.expectedAnswer}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Generated Answer:</p>
                      <p style={{ color: testCase.passed ? 'var(--text-primary)' : 'var(--accent-error)' }}>{testCase.generatedAnswer}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-primary)' }}>
                    <ThumbsUp className="w-3.5 h-3.5" style={{ color: testCase.metrics.faithfulness >= 85 ? 'var(--accent-success)' : 'var(--accent-error)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Faithfulness: {testCase.metrics.faithfulness}% · Relevancy: {testCase.metrics.answerRelevancy}% · Precision: {testCase.metrics.contextPrecision}% · Recall: {testCase.metrics.contextRecall}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(evaluation.metrics).map(([key, value], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MetricCard
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                  value={value === 0 ? 'N/A' : value}
                  color={value >= 85 ? 'var(--accent-success)' : value >= 70 ? 'var(--accent-warning)' : value > 0 ? 'var(--accent-error)' : 'var(--text-muted)'}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {typeof value === 'number' && value > 0 && (
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

function MetricFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
      <Target className="w-12 h-12" style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
    </div>
  );
}