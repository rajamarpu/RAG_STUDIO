import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas3D } from '../components/3d/Canvas3D';
import { RagNetwork } from '../components/3d/RagNetwork';
import { VectorSpace } from '../components/3d/VectorSpace';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import {
  Send, Loader2, Bot, User, Copy, ThumbsUp, ThumbsDown, RefreshCw, Trash2,
  MessageSquare, Plus, Search, Settings, Database, FileText, Brain, Zap,
  ChevronDown, ChevronRight, Download, Share2, X, MoreVertical
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { queryApi, knowledgeBaseApi } from '../api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    content: string;
    source: string;
    page: number;
    chunk: number;
    score: number;
    kb: string;
  }>;
  thinking?: string;
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  messageCount: number;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Q4 Financial Analysis', lastMessage: 'Revenue projections show 15% YoY growth', updatedAt: '2 hours ago', messageCount: 12 },
  { id: '2', title: 'API Architecture Review', lastMessage: 'The microservices pattern improves scalability', updatedAt: '5 hours ago', messageCount: 8 },
  { id: '3', title: 'HR Policy Questions', lastMessage: 'Remote work policy allows 3 days/week', updatedAt: '1 day ago', messageCount: 5 },
  { id: '4', title: 'Legal Compliance', lastMessage: 'The SLA guarantees 99.9% uptime', updatedAt: '3 days ago', messageCount: 3 },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'What were the revenue projections for Q4 2024?',
    timestamp: '2:34 PM',
  },
  {
    id: '2',
    role: 'assistant',
    content: `Based on the Q4 2024 Financial Report, the revenue projections show:

**Key Figures:**
• Total Projected Revenue: **$47.2M**
• Year-over-Year Growth: **+15%**
• Primary Drivers: Enterprise licensing model expansion and APAC market penetration

**Breakdown:**
1. **Enterprise Licensing** — 62% of revenue, driven by new multi-year contracts
2. **APAC Markets** — 18% of revenue, up from 12% in Q3
3. **Professional Services** — 20% of revenue, stable quarter-over-quarter

The growth was primarily attributed to the new enterprise licensing model which increased average contract value by 23%, combined with successful expansion into Singapore, Japan, and Australia markets.`,
    timestamp: '2:34 PM',
    sources: [
      {
        content: 'Q4 2024 revenue projection shows 15% YoY increase to $47.2M, driven by enterprise licensing and APAC expansion',
        source: 'Q4_2024_Financial_Report.pdf',
        page: 3,
        chunk: 12,
        score: 0.94,
        kb: 'Financial Documents'
      },
      {
        content: 'Enterprise licensing accounts for 62% of projected revenue, with average contract value increasing 23%',
        source: 'Q4_2024_Financial_Report.pdf',
        page: 5,
        chunk: 28,
        score: 0.89,
        kb: 'Financial Documents'
      },
      {
        content: 'APAC market contribution grew to 18% of total revenue, up from 12% in Q3',
        source: 'Q4_2024_Financial_Report.pdf',
        page: 7,
        chunk: 45,
        score: 0.85,
        kb: 'Financial Documents'
      }
    ],
  },
  {
    id: '3',
    role: 'user',
    content: 'How does this compare to the previous quarter?',
    timestamp: '2:36 PM',
  },
  {
    id: '4',
    role: 'assistant',
    content: `Comparing Q4 2024 to Q3 2024:

**Revenue Growth:**
• Q3 2024: $41.0M → Q4 2024: $47.2M (+15% QoQ)
• This represents an acceleration from Q3's 11% QoQ growth

**Key Changes:**
1. **Enterprise Segment** — Accelerated from 18% to 23% ACV growth
2. **APAC Markets** — Expanded from 12% to 18% of total revenue
3. **Operating Costs** — Decreased 3% to $12.8M due to cloud infrastructure optimization

**Profitability Impact:**
• EBITDA margin improved from 18% to 22%
• Free cash flow increased by $4.2M QoQ

The positive trend suggests continued momentum heading into 2025, particularly in the enterprise segment.`,
    timestamp: '2:36 PM',
    sources: [
      {
        content: 'Operating expenses for Q4 are projected at $12.8M, representing a 3% decrease from Q3',
        source: 'Q4_2024_Financial_Report.pdf',
        page: 5,
        chunk: 28,
        score: 0.89,
        kb: 'Financial Documents'
      },
      {
        content: 'EBITDA margin improved from 18% to 22%, with free cash flow increasing by $4.2M',
        source: 'Q4_2024_Financial_Report.pdf',
        page: 9,
        chunk: 67,
        score: 0.87,
        kb: 'Financial Documents'
      }
    ],
  }
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [showSidebar, setShowSidebar] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedKbs, setSelectedKbs] = useState<string[]>(['1', '2']);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addToast } = useUIStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    const queryText = inputValue;
    setInputValue('');
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: [],
      thinking: '',
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Try real RAG generation via Ollama, fallback to mock if no KB or error
    try {
      const kbRes: any = await knowledgeBaseApi.list({ page: 1, page_size: 1 }).catch(() => ({ items: [] }));
      const kbId = kbRes.items?.[0]?.id;
      if (!kbId) {
        // no KB — show guidance
        const fallback = 'No knowledge base found. Upload a document first to get real answers from Ollama. Showing mock response for now.';
        for (let i = 0; i < fallback.length; i++) {
          await new Promise(r => setTimeout(r, 10));
          setMessages(prev => prev.map(m => m.id === assistantMessage.id ? { ...m, content: fallback.slice(0, i + 1) } : m));
        }
        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? { ...m, isStreaming: false } : m));
        setIsStreaming(false);
        return;
      }
      // try real generation
      const res: any = await queryApi.generate({
        query: queryText,
        knowledge_base_id: kbId,
        top_k: 5,
        temperature: 0.7,
      });
      const answer = res.answer || res.response || 'No answer generated — check Ollama';
      const sources = (res.sources || []).map((s: any, idx: number) => ({
        content: s.content?.slice(0, 200) || '',
        source: s.document_title || s.document_id || `Source ${idx + 1}`,
        page: s.metadata?.chunk_index ?? idx + 1,
        chunk: s.metadata?.chunk_index ?? idx,
        score: s.score ?? 0.8,
        kb: kbId,
      }));
      // stream the answer character by character for UI effect
      for (let i = 0; i < answer.length; i++) {
        await new Promise(r => setTimeout(r, 8));
        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? { ...m, content: answer.slice(0, i + 1) } : m));
      }
      setMessages(prev => prev.map(m => m.id === assistantMessage.id ? { ...m, isStreaming: false, sources } : m));
      setIsStreaming(false);
      return;
    } catch (e: any) {
      // fallback mock
      const fallback = `Ollama not reachable or no data — mock response:\n\nBased on your query "${queryText}", here's a placeholder answer. Upload documents and ensure Ollama is running (ollama pull llama3:8b) for real generation.`;
      for (let i = 0; i < fallback.length; i++) {
        await new Promise(r => setTimeout(r, 10));
        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? { ...m, content: fallback.slice(0, i + 1) } : m));
      }
      setMessages(prev => prev.map(m => m.id === assistantMessage.id ? { ...m, isStreaming: false } : m));
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    addToast('Message copied to clipboard', 'success');
  };

  const regenerateMessage = (messageId: string) => {
    // Find the last user message before this assistant message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
      const lastUserMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        setInputValue(lastUserMessage.content);
        // Remove the assistant message and regenerate
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    }
  };

  const clearConversation = () => {
    setMessages([]);
    addToast('Conversation cleared', 'success');
  };

  return (
    <div className="flex-1 min-h-0 flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Conversations Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 flex flex-col border-r overflow-hidden"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Conversations</h2>
              <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setSelectedConversation(null); addToast('New conversation started', 'success'); }} aria-label="New conversation">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {MOCK_CONVERSATIONS.map(conv => (
                <motion.button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    selectedConversation === conv.id
                      ? 'bg-[var(--accent-primary)]/10'
                      : 'hover:bg-[var(--bg-tertiary)]'
                  }`}
                  style={{
                    background: selectedConversation === conv.id ? 'var(--accent-primary)/10' : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{conv.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{conv.lastMessage}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 ml-8">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{conv.updatedAt}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{conv.messageCount} msgs</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

        {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Chat Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-glass)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)} aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}>
              {showSidebar ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {MOCK_CONVERSATIONS.find(c => c.id === selectedConversation)?.title || 'New Conversation'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} aria-label="Chat settings" className="gap-1">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={clearConversation} aria-label="Clear conversation" className="gap-1">
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'rounded-tr-sm'
                      : 'rounded-tl-sm'
                  }`}
                    style={{
                      background: message.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-card)',
                      color: message.role === 'user' ? 'white' : 'var(--text-primary)',
                      border: message.role === 'assistant' ? '1px solid var(--border-primary)' : 'none',
                    }}
                  >
                    {message.isStreaming ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full"
                              style={{ background: 'var(--accent-primary)' }}
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Thinking...</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {message.content.split('\n').map((line, i) => {
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <p key={i} className="font-bold mt-3 mb-1">{line.slice(2, -2)}</p>;
                          }
                          if (line.startsWith('• ')) {
                            return <p key={i} className="ml-4">{line}</p>;
                          }
                          if (line.match(/^\d+\. /)) {
                            return <p key={i} className="ml-4">{line}</p>;
                          }
                          return <p key={i} className={line === '' ? 'h-2' : ''}>{line}</p>;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Message Actions */}
                  {message.role === 'assistant' && !message.isStreaming && (
                    <div className="flex items-center gap-1 mt-2 ml-1">
                      <Button variant="ghost" size="xs" onClick={() => copyMessage(message.content)} aria-label="Copy message">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="xs"
                        onClick={() => setMessageFeedback(prev => ({ ...prev, [message.id]: 'up' }))}
                        className={messageFeedback[message.id] === 'up' ? 'text-[var(--accent-success)]' : ''}
                        aria-label="Good response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="xs"
                        onClick={() => setMessageFeedback(prev => ({ ...prev, [message.id]: 'down' }))}
                        className={messageFeedback[message.id] === 'down' ? 'text-[var(--accent-error)]' : ''}
                        aria-label="Bad response"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => regenerateMessage(message.id)} aria-label="Regenerate response">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      {message.sources && message.sources.length > 0 && (
                        <Button
                          variant="ghost" size="xs"
                          onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                          className="gap-1"
                          aria-label="Show sources"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span className="text-xs">{message.sources.length} sources</span>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Sources Panel */}
                  <AnimatePresence>
                    {showSources === message.id && message.sources && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 rounded-xl overflow-hidden"
                        style={{ border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}
                      >
                        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {message.sources.length} Source{message.sources.length > 1 ? 's' : ''} Referenced
                          </span>
                          <Button variant="ghost" size="xs" onClick={() => setShowSources(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                          {message.sources.map((source, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="p-2 rounded-lg"
                              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {source.source}
                                </span>
                                <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                                  style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
                                  {Math.round(source.score * 100)}%
                                </span>
                              </div>
                              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                Page {source.page} · Chunk {source.chunk} · {source.kb}
                              </p>
                              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                                {source.content}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span className="text-xs mt-1 ml-1" style={{ color: 'var(--text-muted)' }}>
                    {message.timestamp}
                  </span>
                </div>

                {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    <User className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'var(--accent-primary)/10', color: 'var(--accent-primary)' }}>
                <Brain className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Ask me anything</h2>
              <p className="text-sm max-w-md mb-8" style={{ color: 'var(--text-tertiary)' }}>
                I'll search your knowledge bases and provide answers with source references
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {[
                  'What are the Q4 revenue projections?',
                  'Summarize the API documentation',
                  'What is the remote work policy?',
                  'Compare our SLA with competitors',
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setInputValue(suggestion)}
                    className="p-3 rounded-xl text-left text-sm transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mb-2" style={{ color: 'var(--accent-primary)' }} />
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-glass)', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                className="w-full min-h-[60px] max-h-[150px] rounded-xl border transition-all duration-200 resize-none
                  bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-primary)]
                  placeholder-[var(--text-muted)] p-4 pr-24
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]"
                style={{ fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.5 }}
                rows={2}
                disabled={isStreaming}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <Button
                  variant={inputValue.trim() && !isStreaming ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  className="gap-1"
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Using {selectedKbs.length} knowledge base{selectedKbs.length !== 1 ? 's' : ''} · {selectedKbs.map(id => MOCK_CONVERSATIONS.find(c => c.id === id)?.title || id).join(', ')}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Chat Settings"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Knowledge Bases
            </label>
            <div className="space-y-2">
              {[
                { id: '1', name: 'Financial Documents', chunks: 12340 },
                { id: '2', name: 'Technical Documentation', chunks: 28560 },
                { id: '3', name: 'HR Policies', chunks: 3420 },
                { id: '4', name: 'Legal Contracts', chunks: 8920 },
                { id: '5', name: 'Product Specifications', chunks: 15670 },
              ].map(kb => (
                <label key={kb.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--bg-tertiary)]">
                  <input
                    type="checkbox"
                    checked={selectedKbs.includes(kb.id)}
                    onChange={(e) => setSelectedKbs(prev =>
                      e.target.checked ? [...prev, kb.id] : prev.filter(id => id !== kb.id)
                    )}
                    className="w-4 h-4 rounded accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{kb.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{kb.chunks.toLocaleString()} chunks</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Top K Results
            </label>
            <input
              type="range"
              min="3"
              max="10"
              defaultValue={5}
              className="w-full accent-[var(--accent-primary)]"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>3 (Precise)</span>
              <span>5 (Balanced)</span>
              <span>10 (Broad)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Response Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Concise', 'Balanced', 'Detailed'].map(style => (
                <button
                  key={style}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    style === 'Balanced'
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/50'
                      : 'border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Include Source References
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-[var(--accent-primary)]" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Show source documents and page numbers in responses</span>
            </label>
          </div>

          <Button variant="primary" fullWidth onClick={() => { addToast('Settings saved', 'success'); setShowSettings(false); }}>
            Save Settings
          </Button>
        </div>
      </Modal>
    </div>
  );
}