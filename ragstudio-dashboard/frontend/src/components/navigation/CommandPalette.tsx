import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Home,
  Database,
  FileText,
  Bot,
  CheckCircle,
  TrendingUp,
  Settings,
  Clock,
  Zap,
  FolderOpen,
  MessageSquare,
  BarChart2,
} from 'lucide-react';
import { useTheme } from '../themes/ThemeProvider';

interface SearchResult {
  id: string;
  type: 'page' | 'knowledgeBase' | 'document' | 'conversation' | 'query' | 'setting';
  title: string;
  description?: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  score: number;
  metadata?: Record<string, unknown>;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBases?: Array<{ id: string; name: string; documentCount: number }>;
  documents?: Array<{ id: string; name: string; kbName: string }>;
  recentQueries?: Array<{ id: string; query: string; timestamp: number }>;
  conversations?: Array<{ id: string; title: string; updatedAt: number }>;
}

const PAGE_RESULTS: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', description: 'Overview & metrics', path: '/', icon: Home, score: 1 },
  { id: 'retrieval', type: 'page', title: 'Retrieval', description: 'Run RAG queries', path: '/retrieval', icon: Search, score: 1 },
  { id: 'knowledge-bases', type: 'page', title: 'Knowledge Bases', description: 'Manage knowledge bases', path: '/knowledge-bases', icon: Database, score: 1 },
  { id: 'documents', type: 'page', title: 'Documents', description: 'Upload & manage documents', path: '/documents', icon: FileText, score: 1 },
  { id: 'chat', type: 'page', title: 'AI Assistant', description: 'Chat with your data', path: '/chat', icon: Bot, score: 1 },
  { id: 'evaluations', type: 'page', title: 'Evaluations', description: 'Test & evaluate RAG quality', path: '/evaluations', icon: CheckCircle, score: 1 },
  { id: 'analytics', type: 'page', title: 'Analytics', description: 'Usage & performance metrics', path: '/analytics', icon: TrendingUp, score: 1 },
  { id: 'settings', type: 'page', title: 'Settings', description: 'Configure platform', path: '/settings', icon: Settings, score: 1 },
];

export function CommandPalette({
  isOpen,
  onClose,
  knowledgeBases = [],
  documents = [],
  recentQueries = [],
  conversations = [],
}: CommandPaletteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      // Show default pages + recent activity
      const defaultResults: SearchResult[] = [
        ...PAGE_RESULTS.map(r => ({ ...r, score: 1 })),
        ...recentQueries.slice(0, 3).map((q, i) => ({
          id: `recent-${q.id}`,
          type: 'query' as const,
          title: q.query,
          description: `Searched ${formatTimeAgo(q.timestamp)}`,
          icon: Clock,
          score: 0.9 - i * 0.1,
        })),
        ...conversations.slice(0, 2).map((c, i) => ({
          id: `conv-${c.id}`,
          type: 'conversation' as const,
          title: c.title,
          description: `Updated ${formatTimeAgo(c.updatedAt)}`,
          path: `/chat/${c.id}`,
          icon: MessageSquare,
          score: 0.8 - i * 0.1,
        })),
      ];
      setResults(defaultResults);
      return;
    }

    const searchTerm = query.toLowerCase();
    const scoredResults: SearchResult[] = [];

    // Search pages
    PAGE_RESULTS.forEach(page => {
      const titleMatch = page.title.toLowerCase().includes(searchTerm);
      const descMatch = page.description?.toLowerCase().includes(searchTerm);
      if (titleMatch || descMatch) {
        scoredResults.push({
          ...page,
          score: titleMatch ? 1 : 0.8,
        });
      }
    });

    // Search knowledge bases
    knowledgeBases.forEach((kb, i) => {
      if (kb.name.toLowerCase().includes(searchTerm)) {
        scoredResults.push({
          id: `kb-${kb.id}`,
          type: 'knowledgeBase',
          title: kb.name,
          description: `${kb.documentCount} documents`,
          path: `/knowledge-bases/${kb.id}`,
          icon: Database,
          score: 0.95 - i * 0.02,
        });
      }
    });

    // Search documents
    documents.forEach((doc, i) => {
      if (doc.name.toLowerCase().includes(searchTerm)) {
        scoredResults.push({
          id: `doc-${doc.id}`,
          type: 'document',
          title: doc.name,
          description: `In ${doc.kbName}`,
          icon: FileText,
          score: 0.9 - i * 0.02,
        });
      }
    });

    // Search recent queries
    recentQueries.forEach((q, i) => {
      if (q.query.toLowerCase().includes(searchTerm)) {
        scoredResults.push({
          id: `recent-${q.id}`,
          type: 'query',
          title: q.query,
          description: `Searched ${formatTimeAgo(q.timestamp)}`,
          icon: Clock,
          score: 0.85 - i * 0.02,
        });
      }
    });

    // Search conversations
    conversations.forEach((c, i) => {
      if (c.title.toLowerCase().includes(searchTerm)) {
        scoredResults.push({
          id: `conv-${c.id}`,
          type: 'conversation',
          title: c.title,
          description: `Updated ${formatTimeAgo(c.updatedAt)}`,
          path: `/chat/${c.id}`,
          icon: MessageSquare,
          score: 0.8 - i * 0.02,
        });
      }
    });

    // Sort by score
    scoredResults.sort((a, b) => b.score - a.score);
    setResults(scoredResults.slice(0, 10));
    setSelectedIndex(0);
  }, [query, knowledgeBases, documents, recentQueries, conversations]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Tab':
        // Allow tab to cycle through results
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
    }
  }, [results, selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    if (result.path) {
      navigate(result.path);
    } else if (result.type === 'query') {
      // Navigate to retrieval with pre-filled query
      navigate('/retrieval', { state: { prefillQuery: result.title } });
    }
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      const groupKey = r.type === 'page' ? 'Navigation' :
                       r.type === 'knowledgeBase' ? 'Knowledge Bases' :
                       r.type === 'document' ? 'Documents' :
                       r.type === 'conversation' ? 'Conversations' :
                       r.type === 'query' ? 'Recent Searches' : 'Other';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(r);
    });
    return groups;
  }, [results]);

  return (
    <motion.div
      className="command-palette"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <motion.div
        className="command-palette-content"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="listbox"
        aria-label="Search results"
      >
        {/* Search Input */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search everything... (Ctrl+K)"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-base input"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search"
              aria-autocomplete="list"
              aria-controls="command-results"
              aria-activedescendant={results[selectedIndex]?.id}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-primary)' }}>
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-results"
          className="max-h-[500px] overflow-y-auto"
          role="listbox"
        >
          {Object.entries(groupedResults).map(([groupName, groupResults]) => (
            <div key={groupName} className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                {groupName}
              </div>
              <AnimatePresence>
                {groupResults.map((result, index) => {
                  const globalIndex = results.indexOf(result);
                  const isSelected = globalIndex === selectedIndex;
                  const Icon = result.icon;

                  return (
                    <motion.button
                      key={result.id}
                      data-selected={isSelected}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors duration-150 group ${
                        isSelected ? 'bg-[var(--accent-primary)]/10' : 'hover:bg-[var(--bg-tertiary)]'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                      style={{
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.1, delay: index * 0.02 }}
                    >
                      <motion.div
                        className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{
                          background: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: isSelected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        }}
                        animate={{ scale: isSelected ? 1.1 : 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{highlightMatch(result.title, query)}</div>
                        {result.description && (
                          <div className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {highlightMatch(result.description, query)}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <ChevronRight
                          className="w-4 h-4 flex-shrink-0 text-[var(--accent-primary)]"
                          aria-hidden="true"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}

          {results.length === 0 && query.trim() && (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <Search className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.5 }} />
              <p>No results found for "{query}"</p>
            </div>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="p-6 space-y-3">
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Quick Actions
              </div>
              <QuickAction onClick={() => { navigate('/documents'); onClose(); }} icon={FileText} label="Upload Document" description="Add new files to knowledge base" />
              <QuickAction onClick={() => { navigate('/knowledge-bases'); onClose(); }} icon={Database} label="Create Knowledge Base" description="Organize documents into collections" />
              <QuickAction onClick={() => { navigate('/retrieval'); onClose(); }} icon={Search} label="Run RAG Query" description="Search and generate answers" />
              <QuickAction onClick={() => { navigate('/chat'); onClose(); }} icon={Bot} label="Start AI Chat" description="Conversational interface with your data" />
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}>
          <kbd className="px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>↑ ↓</kbd>
          <span>Navigate</span>
          <kbd className="px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>Enter</kbd>
          <span>Open</span>
          <kbd className="px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>Esc</kbd>
          <span>Close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuickAction({
  onClick,
  icon: Icon,
  label,
  description,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] text-left"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{description}</div>
      </div>
    </button>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} className="search-highlight">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Hook for global keyboard shortcut
export function useCommandPalette(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}