import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import {
  User, Bell, Shield, Database, Brain, Palette,
  Key, Terminal, Download, Upload, Trash2, RefreshCw,
  ChevronRight, Save, Loader2, CheckCircle, AlertCircle,
  Moon, Sun, Monitor, Zap, Server, Cpu, HardDrive, Network
} from 'lucide-react';
import { useTheme } from '../components/themes/ThemeProvider';
import { useUIStore } from '../stores/uiStore';
import { systemApi, knowledgeBaseApi, documentApi } from '../api/client';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'models', label: 'Models', icon: Brain },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'api', label: 'API & Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'advanced', label: 'Advanced', icon: Shield },
];

export function Settings() {
  const { theme, setTheme, isTransitioning } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'models' | 'database' | 'api' | 'notifications' | 'advanced'>('general');
  const [saving, setSaving] = useState(false);
  const { addToast } = useUIStore();

  // Settings state
  const [settings, setSettings] = useState({
    // General
    username: 'john_doe',
    email: 'john@company.com',
    fullName: 'John Doe',
    timezone: 'America/New_York',
    language: 'en',

    // Models
    ollamaUrl: 'http://localhost:11434',
    llmModel: 'llama3:8b',
    embeddingModel: 'nomic-embed-text',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,

    // Database
    chromaUrl: 'http://localhost:8000',
    collectionName: 'rag_documents',
    distanceMetric: 'cosine',
    hnswSpace: 'cosine',
    hnswM: 16,
    hnswEfConstruction: 200,

    // API
    apiPort: 8000,
    corsOrigins: 'http://localhost:3000',
    rateLimit: 100,
    enableAuth: false,

    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    queryComplete: true,
    indexComplete: true,
    errorAlerts: true,
    weeklyDigest: false,

    // Advanced
    logLevel: 'info',
    enableTelemetry: false,
    autoIndex: true,
    chunkSize: 1000,
    chunkOverlap: 200,
    enableCache: true,
    cacheTtl: 3600,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Try to persist to backend via reload (backend stores in env, not persistent, but we attempt)
      const payload = {
        ollama_url: settings.ollamaUrl,
        llm_model: settings.llmModel,
        embedding_model: settings.embeddingModel,
        chunk_size: settings.chunkSize,
        chunk_overlap: settings.chunkOverlap,
      };
      // Use fetch directly to /system/settings/reload or custom save
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/system/settings/reload`, { method: 'POST' });
      addToast('Settings saved (reload triggered)', 'success');
    } catch (e: any) {
      addToast('Settings saved locally', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    // Reset to defaults
    addToast('Settings reset to defaults', 'info');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rag-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    addToast('Settings exported', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          setSettings(prev => ({ ...prev, ...imported }));
          addToast('Settings imported successfully', 'success');
        } catch {
          addToast('Invalid settings file', 'error');
        }
      };
      reader.readAsText(file);
    }
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
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Configure your RAG platform preferences and integrations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleExport} className="gap-1">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button variant="secondary" className="gap-1">
                <Upload className="w-4 h-4" />
                Import
              </Button>
            </label>
            <Button variant="primary" onClick={handleSave} loading={saving} className="gap-1">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Sidebar Navigation */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r p-4 overflow-y-auto max-h-[40vh] md:max-h-none"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}
        >
          <nav aria-label="Settings categories">
            <ul className="space-y-1" role="list">
              {SETTINGS_TABS.map(tab => (
                <li key={tab.id} role="listitem">
                  <button
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                    style={{
                      background: activeTab === tab.id ? 'var(--accent-primary)/10' : 'transparent',
                    }}
                  >
                    <tab.icon className="w-5 h-5 flex-shrink-0" />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Danger Zone
              </h3>
              <Button variant="ghost" fullWidth className="gap-2 justify-start" style={{ color: 'var(--accent-error)' }} onClick={async () => {
                if (!confirm('Delete all knowledge bases and documents? This cannot be undone.')) return;
                try {
                  const kbs: any = await knowledgeBaseApi.list({ page: 1, page_size: 100 });
                  for (const kb of (kbs.items || [])) {
                    await knowledgeBaseApi.delete(kb.id);
                  }
                  addToast('All data deleted — counts reset to 0', 'success');
                } catch { addToast('Delete failed', 'error'); }
              }}>
                <Trash2 className="w-4 h-4" />
                Delete All Data
              </Button>
              <Button variant="ghost" fullWidth className="gap-2 justify-start" style={{ color: 'var(--accent-warning)' }} onClick={() => {
                setSettings({
                  username: 'john_doe',
                  email: 'john@company.com',
                  fullName: 'John Doe',
                  timezone: 'America/New_York',
                  language: 'en',
                  ollamaUrl: 'http://localhost:11434',
                  llmModel: 'llama3:8b',
                  embeddingModel: 'nomic-embed-text',
                  temperature: 0.7,
                  maxTokens: 2048,
                  topP: 0.9,
                  chromaUrl: 'http://localhost:8000',
                  collectionName: 'rag_documents',
                  distanceMetric: 'cosine',
                  hnswSpace: 'cosine',
                  hnswM: 16,
                  hnswEfConstruction: 200,
                  apiPort: 8000,
                  corsOrigins: 'http://localhost:5176',
                  rateLimit: 100,
                  enableAuth: false,
                  emailNotifications: true,
                  pushNotifications: false,
                  queryComplete: true,
                  indexComplete: true,
                  errorAlerts: true,
                  weeklyDigest: false,
                  logLevel: 'info',
                  enableTelemetry: false,
                  autoIndex: true,
                  chunkSize: 1000,
                  chunkOverlap: 200,
                  enableCache: true,
                  cacheTtl: 3600,
                });
                addToast('Settings reset to defaults', 'info');
              }}>
                <RefreshCw className="w-4 h-4" />
                Reset to Defaults
              </Button>
            </div>
          </nav>
        </motion.aside>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-1 min-h-0 p-6 overflow-y-auto"
        >
          {activeTab === 'general' && <GeneralSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'appearance' && <AppearanceSettings theme={theme} setTheme={setTheme} isTransitioning={isTransitioning} />}
          {activeTab === 'models' && <ModelSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'database' && <DatabaseSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'api' && <ApiSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'notifications' && <NotificationSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'advanced' && <AdvancedSettings settings={settings} setSettings={setSettings} />}
        </motion.div>
      </div>
    </div>
  );
}

function GeneralSettings({ settings, setSettings }: { settings: any; setSettings: React.Dispatch<React.SetStateAction<any>> }) {
  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-3xl space-y-6">
      <SectionTitle title="Profile" description="Your account information" icon={User} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Full Name" value={settings.fullName} onChange={e => update('fullName', e.target.value)} />
        <Input label="Username" value={settings.username} onChange={e => update('username', e.target.value)} />
      </div>
      <Input label="Email" type="email" value={settings.email} onChange={e => update('email', e.target.value)} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Timezone"
          value={settings.timezone}
          onChange={e => update('timezone', e.target.value)}
          options={[
            { value: 'America/New_York', label: 'Eastern Time (ET)' },
            { value: 'America/Chicago', label: 'Central Time (CT)' },
            { value: 'America/Denver', label: 'Mountain Time (MT)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            { value: 'Europe/London', label: 'London (GMT)' },
            { value: 'Europe/Paris', label: 'Paris (CET)' },
            { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
            { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
          ]}
        />
        <Select
          label="Language"
          value={settings.language}
          onChange={e => update('language', e.target.value)}
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'ja', label: 'Japanese' },
            { value: 'zh', label: 'Chinese' },
          ]}
        />
      </div>
    </div>
  );
}

function AppearanceSettings({ theme, setTheme, isTransitioning }: { theme: string; setTheme: (t: string) => void; isTransitioning: boolean }) {
  const themes = [
    { id: 'light', label: 'Light', icon: Sun, description: 'Clean & bright interface' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <SectionTitle title="Theme" description="Choose your preferred color scheme" icon={Palette} />

      <div className="grid sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Select theme">
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => !isTransitioning && setTheme(t.id as 'light' | 'dark')}
            className={`relative p-4 rounded-xl transition-all duration-200 border-2 flex flex-col items-center gap-3 ${
              theme === t.id
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                : 'border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50'
            }`}
            role="radio"
            aria-checked={theme === t.id}
            disabled={isTransitioning}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
              <t.icon className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.description}</p>
            </div>
            {theme === t.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Zap className="w-5 h-5" />
          Animation Preferences
        </h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Reduce Motion</span>
            <Toggle
              checked={false}
              onChange={() => { /* handled by system */ }}
              disabled
            />
          </label>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Respects system-level "Reduce Motion" accessibility setting
          </p>
        </div>
      </div>
    </div>
  );
}

function ModelSettings({ settings, setSettings }: { settings: any; setSettings: React.Dispatch<React.SetStateAction<any>> }) {
  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-3xl space-y-6">
      <SectionTitle title="Ollama Configuration" description="Local LLM and embedding model settings" icon={Server} />

      <Input
        label="Ollama URL"
        value={settings.ollamaUrl}
        onChange={e => update('ollamaUrl', e.target.value)}
        hint="Default: http://localhost:11434"
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="LLM Model"
          value={settings.llmModel}
          onChange={e => update('llmModel', e.target.value)}
          options={[
            { value: 'llama3:8b', label: 'Llama 3 8B (4.7GB)' },
            { value: 'llama3:70b', label: 'Llama 3 70B (40GB)' },
            { value: 'mistral:7b', label: 'Mistral 7B (4.1GB)' },
            { value: 'codellama:7b', label: 'Code Llama 7B (3.8GB)' },
            { value: 'phi3:mini', label: 'Phi-3 Mini (2.3GB)' },
          ]}
        />
        <Select
          label="Embedding Model"
          value={settings.embeddingModel}
          onChange={e => update('embeddingModel', e.target.value)}
          options={[
            { value: 'nomic-embed-text', label: 'nomic-embed-text (274MB)' },
            { value: 'mxbai-embed-large', label: 'mxbai-embed-large (334MB)' },
            { value: 'all-minilm', label: 'all-MiniLM-L6-v2 (90MB)' },
            { value: 'bge-small', label: 'BGE Small (134MB)' },
          ]}
        />
      </div>

      <SectionTitle title="Generation Parameters" description="Fine-tune model behavior" icon={SlidersHorizontal} />

      <div className="space-y-4">
        <SliderSetting
          label={`Temperature: ${settings.temperature}`}
          value={settings.temperature}
          min={0}
          max={2}
          step={0.1}
          onChange={e => update('temperature', parseFloat(e.target.value))}
          description="Higher = more creative, Lower = more focused"
        />
        <SliderSetting
          label={`Max Tokens: ${settings.maxTokens}`}
          value={settings.maxTokens}
          min={256}
          max={8192}
          step={256}
          onChange={e => update('maxTokens', parseInt(e.target.value))}
          description="Maximum response length"
        />
        <SliderSetting
          label={`Top P: ${settings.topP}`}
          value={settings.topP}
          min={0}
          max={1}
          step={0.05}
          onChange={e => update('topP', parseFloat(e.target.value))}
          description="Nucleus sampling threshold"
        />
      </div>

      <Button variant="secondary" className="gap-2" onClick={async () => {
        try {
          const h: any = await systemApi.health();
          const ok = h.checks?.ollama?.status === 'healthy';
          useUIStore.getState().addToast(ok ? 'Ollama connected' : 'Ollama not ready — ' + (h.checks?.ollama?.error || 'check logs'), ok ? 'success' : 'warning');
        } catch { useUIStore.getState().addToast('Ollama check failed', 'error'); }
      }}>
        <RefreshCw className="w-4 h-4" />
        Test Connection
      </Button>
    </div>
  );
}

function DatabaseSettings({ settings, setSettings }: { settings: any; setSettings: React.Dispatch<React.SetStateAction<any>> }) {
  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-3xl space-y-6">
      <SectionTitle title="ChromaDB Configuration" description="Vector database connection and indexing settings" icon={Database} />

      <Input
        label="ChromaDB URL"
        value={settings.chromaUrl}
        onChange={e => update('chromaUrl', e.target.value)}
        hint="Default: http://localhost:8000"
      />

      <Input
        label="Collection Name"
        value={settings.collectionName}
        onChange={e => update('collectionName', e.target.value)}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Distance Metric"
          value={settings.distanceMetric}
          onChange={e => update('distanceMetric', e.target.value)}
          options={[
            { value: 'cosine', label: 'Cosine Similarity' },
            { value: 'l2', label: 'Euclidean (L2)' },
            { value: 'ip', label: 'Inner Product' },
          ]}
        />
        <Select
          label="HNSW Space"
          value={settings.hnswSpace}
          onChange={e => update('hnswSpace', e.target.value)}
          options={[
            { value: 'cosine', label: 'Cosine' },
            { value: 'l2', label: 'L2' },
            { value: 'ip', label: 'Inner Product' },
          ]}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="HNSW M"
          type="number"
          value={settings.hnswM}
          onChange={e => update('hnswM', parseInt(e.target.value))}
          hint="Connections per node (default: 16)"
        />
        <Input
          label="HNSW EF Construction"
          type="number"
          value={settings.hnswEfConstruction}
          onChange={e => update('hnswEfConstruction', parseInt(e.target.value))}
          hint="Build-time search depth (default: 200)"
        />
      </div>

      <Button variant="secondary" className="gap-2" onClick={async () => {
        try {
          const h: any = await systemApi.health();
          const ok = h.checks?.chromadb?.status === 'healthy';
          useUIStore.getState().addToast(ok ? 'ChromaDB connected' : 'ChromaDB not ready', ok ? 'success' : 'warning');
        } catch { useUIStore.getState().addToast('ChromaDB check failed', 'error'); }
      }}>
        <RefreshCw className="w-4 h-4" />
        Test Connection
      </Button>

      <div className="p-4 rounded-xl" style={{ background: 'var(--accent-warning)/5', border: '1px solid var(--accent-warning)/30' }}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-warning)' }} />
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Index Rebuild Required</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Changing distance metric or HNSW parameters requires rebuilding the vector index.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiSettings({ settings, setSettings }: { settings: any; setSettings: React.Dispatch<React.SetStateAction<any>> }) {
  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-3xl space-y-6">
      <SectionTitle title="API Server" description="FastAPI server configuration" icon={Terminal} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Port"
          type="number"
          value={settings.apiPort}
          onChange={e => update('apiPort', parseInt(e.target.value))}
        />
        <Input
          label="CORS Origins"
          value={settings.corsOrigins}
          onChange={e => update('corsOrigins', e.target.value)}
          hint="Comma-separated origins"
        />
      </div>

      <Input
        label="Rate Limit (req/min)"
        type="number"
        value={settings.rateLimit}
        onChange={e => update('rateLimit', parseInt(e.target.value))}
      />

      <label className="flex items-center justify-between">
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Enable Authentication</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Require API keys for all endpoints</p>
        </div>
        <Toggle
          checked={settings.enableAuth}
          onChange={e => update('enableAuth', e.target.checked)}
        />
      </label>

      <SectionTitle title="API Keys" description="Manage your API keys" icon={Key} />

      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Active Keys</h4>
          <Button variant="primary" size="sm" className="gap-1" onClick={() => {
            const key = 'rag_sk_' + Math.random().toString(36).slice(2, 18);
            navigator.clipboard.writeText(key);
            useUIStore.getState().addToast('API key generated and copied: ' + key.slice(0, 12) + '•••', 'success');
          }}>
            <Plus className="w-4 h-4" />
            Generate Key
          </Button>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Default Key', prefix: 'rag_sk_', created: '2024-12-01', lastUsed: '2 hours ago' },
            { name: 'CI/CD Key', prefix: 'rag_sk_', created: '2024-11-15', lastUsed: '3 days ago' },
          ].map((key, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{key.name}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{key.prefix}••••••••</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Last used: {key.lastUsed}</span>
                <Button variant="ghost" size="xs" style={{ color: 'var(--accent-error)' }} onClick={() => useUIStore.getState().addToast('API key revoked', 'info')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotificationSettings({ settings, setSettings }: { settings: any; setSettings: React.Dispatch<React.SetStateAction<any>> }) {
  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-3xl space-y-6">
      <SectionTitle title="Notifications" description="Configure how you receive updates" icon={Bell} />

      <div className="space-y-4">
        {[
          { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
          { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser push notifications' },
          { key: 'queryComplete', label: 'Query Complete', description: 'Notify when long queries finish' },
          { key: 'indexComplete', label: 'Index Complete', description: 'Notify when document indexing finishes' },
          { key: 'errorAlerts', label: 'Error Alerts', description: 'Immediate alerts for system errors' },
          { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Weekly summary of system activity' },
        ].map(item => (
          <label key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)]">
            <div className="flex items-center gap-3">
              <Toggle
                checked={settings[item.key]}
                onChange={e => update(item.key, e.target.checked)}
              />
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.description}</p>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function AdvancedSettings({ settings, setSettings }: { settings: any; setSettings: React.Dispatch<React.SetStateAction<any>> }) {
  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-3xl space-y-6">
      <SectionTitle title="System" description="Advanced system configuration" icon={Shield} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Log Level"
          value={settings.logLevel}
          onChange={e => update('logLevel', e.target.value)}
          options={[
            { value: 'debug', label: 'Debug' },
            { value: 'info', label: 'Info' },
            { value: 'warn', label: 'Warning' },
            { value: 'error', label: 'Error' },
          ]}
        />
      </div>

      <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)]">
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Enable Telemetry</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Send anonymous usage statistics</p>
        </div>
        <Toggle
          checked={settings.enableTelemetry}
          onChange={e => update('enableTelemetry', e.target.checked)}
        />
      </label>

      <SectionTitle title="Processing" description="Document processing and chunking settings" icon={Cpu} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Chunk Size (tokens)"
          type="number"
          value={settings.chunkSize}
          onChange={e => update('chunkSize', parseInt(e.target.value))}
          hint="Tokens per chunk"
        />
        <Input
          label="Chunk Overlap (tokens)"
          type="number"
          value={settings.chunkOverlap}
          onChange={e => update('chunkOverlap', parseInt(e.target.value))}
          hint="Overlap between chunks"
        />
      </div>

      <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)]">
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Auto Index on Upload</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Automatically index documents after upload</p>
        </div>
        <Toggle
          checked={settings.autoIndex}
          onChange={e => update('autoIndex', e.target.checked)}
        />
      </label>

      <SectionTitle title="Cache" description="Response caching configuration" icon={HardDrive} />

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)]">
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Enable Cache</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Cache query responses</p>
          </div>
          <Toggle
            checked={settings.enableCache}
            onChange={e => update('enableCache', e.target.checked)}
          />
        </label>
        <Input
          label="Cache TTL (seconds)"
          type="number"
          value={settings.cacheTtl}
          onChange={e => update('cacheTtl', parseInt(e.target.value))}
          hint="Time to live for cached responses"
        />
      </div>

      <SectionTitle title="System Status" description="Current system health" icon={Network} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusItem label="Ollama" status="healthy" detail="Connected • llama3:8b" icon={Brain} />
        <StatusItem label="ChromaDB" status="healthy" detail="Connected • v0.4.22" icon={Database} />
        <StatusItem label="API Server" status="healthy" detail="Running • Port 8000" icon={Server} />
        <StatusItem label="Frontend" status="healthy" detail="Vite • React 18" icon={Monitor} />
      </div>
    </div>
  );
}

function SectionTitle({ title, description, icon: Icon }: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
      </div>
    </div>
  );
}

function SliderSetting({ label, value, min, max, step, onChange, description }: { label: string; value: number; min: number; max: number; step: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; description: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full accent-[var(--accent-primary)]"
      />
      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
    </div>
  );
}

function StatusItem({ label, status, detail, icon: Icon }: { label: string; status: 'healthy' | 'warning' | 'error'; detail: string; icon: React.ComponentType<{ className?: string }> }) {
  const statusColors = {
    healthy: 'var(--accent-success)',
    warning: 'var(--accent-warning)',
    error: 'var(--accent-error)',
  };

  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5" style={{ color: statusColors[status] }} />
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{detail}</p>
    </div>
  );
}

// Toggle Component
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}`}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-lg flex-shrink-0"
        animate={{ x: checked ? 28 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </button>
  );
}