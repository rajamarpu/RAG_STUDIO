/**
 * React hooks for the RAG AI Platform API.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  systemApi,
  knowledgeBaseApi,
  documentApi,
  queryApi,
  chatApi,
  analyticsApi,
  streamGenerate,
  streamChat,
  type KnowledgeBase,
  type Document,
  type QueryResponse,
  type StreamChunk,
  type HealthCheck,
} from './client';

// ==================== System Hooks ====================

export function useHealthCheck(pollInterval = 30000) {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await systemApi.health();
      setHealth(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollInterval > 0) {
      const interval = setInterval(refresh, pollInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, pollInterval]);

  return { health, loading, error, refresh };
}

// ==================== Knowledge Base Hooks ====================

export function useKnowledgeBases(params?: {
  page?: number;
  page_size?: number;
  search?: string;
}) {
  const [data, setData] = useState<KnowledgeBase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await knowledgeBaseApi.list(params);
      setData(response.items);
      setTotal(response.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.page, params?.page_size, params?.search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, total, loading, error, refresh };
}

export function useKnowledgeBase(id: string | null) {
  const [data, setData] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    knowledgeBaseApi
      .get(id)
      .then((kb) => {
        if (!cancelled) {
          setData(kb);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, loading, error };
}

// ==================== Document Hooks ====================

export function useDocuments(params?: {
  knowledge_base_id?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  const [data, setData] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await documentApi.list(params);
      setData(response.items);
      setTotal(response.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params?.knowledge_base_id,
    params?.status,
    params?.search,
    params?.page,
    params?.page_size,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, total, loading, error, refresh };
}

// ==================== Query Hooks ====================

export function useQuery() {
  const [results, setResults] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (data: {
      query: string;
      knowledge_base_id: string;
      top_k?: number;
      similarity_threshold?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await queryApi.retrieve(data);
        setResults(response);
        return response;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { results, loading, error, execute };
}

export function useRagGeneration() {
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef(false);

  const execute = useCallback(
    async (
      data: {
        query: string;
        knowledge_base_id: string;
        top_k?: number;
        temperature?: number;
      },
      onComplete?: (fullAnswer: string, sources: any[]) => void
    ) => {
      abortRef.current = false;
      setAnswer('');
      setSources([]);
      setIsStreaming(true);
      setError(null);

      let fullAnswer = '';
      let finalSources: any[] = [];

      await streamGenerate(
        data,
        (chunk: StreamChunk) => {
          if (abortRef.current) return;

          switch (chunk.type) {
            case 'content':
              fullAnswer += chunk.content || '';
              setAnswer(fullAnswer);
              break;
            case 'source':
              finalSources = chunk.sources || [];
              setSources(finalSources);
              break;
            case 'done':
              onComplete?.(fullAnswer, finalSources);
              break;
            case 'error':
              setError(new Error(chunk.error || 'Stream error'));
              break;
          }
        },
        (err) => setError(err)
      );

      setIsStreaming(false);
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  return { answer, sources, isStreaming, error, execute, abort };
}

// ==================== Chat Hooks ====================

interface ChatMessageState {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

export function useChat(knowledgeBaseId?: string) {
  const [messages, setMessages] = useState<ChatMessageState[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create conversation on mount if needed
  useEffect(() => {
    if (!conversationId) {
      chatApi
        .createConversation({ knowledge_base_id: knowledgeBaseId })
        .then((conv) => setConversationId(conv.id))
        .catch((e) => setError(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (message: string, onComplete?: () => void) => {
      if (!conversationId || !message.trim()) return;

      // Add user message immediately
      setMessages((prev) => [...prev, { role: 'user', content: message }]);
      setIsStreaming(true);
      setError(null);

      // Add empty assistant message for streaming
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let assistantContent = '';
      let sources: any[] = [];

      await streamChat(
        conversationId,
        message,
        (chunk: StreamChunk) => {
          switch (chunk.type) {
            case 'content':
              assistantContent += chunk.content || '';
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                  sources,
                };
                return updated;
              });
              break;
            case 'source':
              sources = chunk.sources || [];
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                  sources,
                };
                return updated;
              });
              break;
            case 'done':
              onComplete?.();
              break;
            case 'error':
              setError(new Error(chunk.error || 'Stream error'));
              break;
          }
        },
        (err) => setError(err)
      );

      setIsStreaming(false);
    },
    [conversationId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    conversationId,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
  };
}

// ==================== Analytics Hooks ====================

export function useAnalytics(_days = 7) {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsApi.overview();
      setOverview(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { overview, loading, error, refresh };
}