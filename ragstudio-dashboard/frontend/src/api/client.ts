/**
 * API client for the RAG AI Platform backend.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ==================== Types ====================

export interface Document {
  id: string;
  title: string;
  content?: string | null;
  metadata: Record<string, any>;
  knowledge_base_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
  error_message?: string | null;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string | null;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  distance_metric: string;
  metadata: Record<string, any>;
  status: 'active' | 'inactive' | 'indexing';
  document_count: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  last_indexed_at?: string | null;
}

export interface RetrievalResult {
  id: string;
  document_id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  document_title?: string | null;
}

export interface QueryResponse {
  query: string;
  results: RetrievalResult[];
  total_results: number;
  processing_time_ms: number;
  knowledge_base_id: string;
}

export interface SourceCitation {
  document_id: string;
  document_title: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface GenerationResponse {
  answer: string;
  sources: SourceCitation[];
  query: string;
  processing_time_ms: number;
  model: string;
}

export interface StreamChunk {
  type: 'content' | 'source' | 'done' | 'error';
  content?: string;
  sources?: SourceCitation[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  checks: Record<string, any>;
}

// ==================== Error Handling ====================

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }

    throw new ApiError(
      errorData?.error?.message || `Request failed with status ${response.status}`,
      response.status,
      errorData?.error?.code,
      errorData?.error?.details
    );
  }

  return response.json();
}

// ==================== HTTP Methods ====================

async function get<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse<T>(response);
}

async function post<T>(path: string, body?: any): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

async function patch<T>(path: string, body?: any): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

async function del<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), { method: 'DELETE' });
  return handleResponse<T>(response);
}

// ==================== System API ====================

export const systemApi = {
  health: () => get<HealthCheck>('/system/health'),
  stats: () => get('/system/stats'),
  settings: () => get('/system/settings'),
};

// ==================== Knowledge Base API ====================

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface KnowledgeBaseCreateInput {
  name: string;
  description?: string;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  distance_metric?: string;
  metadata?: Record<string, any>;
}

export const knowledgeBaseApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }) => get<Paginated<KnowledgeBase>>('/knowledge-bases', params),

  get: (id: string) => get<KnowledgeBase>(`/knowledge-bases/${id}`),

  create: (data: KnowledgeBaseCreateInput) =>
    post<KnowledgeBase>('/knowledge-bases', data),

  update: (id: string, data: Partial<KnowledgeBaseCreateInput>) =>
    patch<KnowledgeBase>(`/knowledge-bases/${id}`, data),

  delete: (id: string) => del(`/knowledge-bases/${id}`),

  reindex: (id: string) => post(`/knowledge-bases/${id}/reindex`),

  stats: (id: string) => get(`/knowledge-bases/${id}/stats`),
};

// ==================== Document API ====================

export interface DocumentUploadInput {
  knowledge_base_id: string;
  file: File;
  title?: string;
  metadata?: Record<string, any>;
}

export const documentApi = {
  upload: async (input: DocumentUploadInput): Promise<{ document_id: string; status: string; message: string }> => {
    const formData = new FormData();
    formData.append('knowledge_base_id', input.knowledge_base_id);
    formData.append('file', input.file);
    if (input.title) formData.append('title', input.title);
    if (input.metadata) formData.append('metadata', JSON.stringify(input.metadata));

    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  list: (params?: {
    knowledge_base_id?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => get<Paginated<Document>>('/documents', params),

  get: (id: string) => get<Document>(`/documents/${id}`),

  delete: (id: string, knowledgeBaseId: string) =>
    del(`/documents/${id}`, { knowledge_base_id: knowledgeBaseId }),

  reprocess: (id: string) => post(`/documents/${id}/reprocess`),
};

// ==================== Query & RAG API ====================

export const queryApi = {
  retrieve: (data: {
    query: string;
    knowledge_base_id: string;
    top_k?: number;
    similarity_threshold?: number;
    include_metadata?: boolean;
  }) => post<QueryResponse>('/query/retrieve', data),

  generate: (data: {
    query: string;
    knowledge_base_id: string;
    top_k?: number;
    similarity_threshold?: number;
    temperature?: number;
    max_tokens?: number;
    system_prompt?: string;
  }) => post<GenerationResponse>('/query/generate', data),
};

/**
 * Stream RAG generation using Server-Sent Events.
 */
export async function streamGenerate(
  data: {
    query: string;
    knowledge_base_id: string;
    top_k?: number;
    similarity_threshold?: number;
    temperature?: number;
    max_tokens?: number;
    system_prompt?: string;
    conversation_history?: Array<{ role: string; content: string }>;
  },
  onChunk: (chunk: StreamChunk) => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new ApiError(`Stream request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ApiError('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const chunk: StreamChunk = JSON.parse(line.slice(6));
            onChunk(chunk);
          } catch (e) {
            console.error('Failed to parse stream chunk:', e);
          }
        }
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

// ==================== Chat API ====================

export interface Conversation {
  id: string;
  title: string;
  knowledge_base_id?: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export const chatApi = {
  createConversation: (data: {
    title?: string;
    knowledge_base_id?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }) => post<Conversation>('/chat/conversations', data),

  listConversations: (params?: {
    knowledge_base_id?: string;
    limit?: number;
  }) => get<Conversation[]>('/chat/conversations', params),

  getConversation: (id: string) => get(`/chat/conversations/${id}`),

  updateConversation: (id: string, data: Partial<Conversation>) =>
    patch<Conversation>(`/chat/conversations/${id}`, data),

  deleteConversation: (id: string) => del(`/chat/conversations/${id}`),

  sendMessage: (conversationId: string, message: string) =>
    post(`/chat/conversations/${conversationId}/messages`, {
      conversation_id: conversationId,
      message,
    }),
};

/**
 * Stream chat responses using Server-Sent Events.
 */
export async function streamChat(
  conversationId: string,
  message: string,
  onChunk: (chunk: StreamChunk) => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(
      `${API_URL}/chat/conversations/${conversationId}/messages/stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      throw new ApiError(`Stream request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ApiError('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const chunk: StreamChunk = JSON.parse(line.slice(6));
            onChunk(chunk);
          } catch (e) {
            console.error('Failed to parse stream chunk:', e);
          }
        }
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

// ==================== Analytics API ====================

export const analyticsApi = {
  queries: (params?: { days?: number; knowledge_base_id?: string }) =>
    get('/analytics/queries', params),

  usage: (params?: { days?: number }) => get('/analytics/usage', params),

  performance: (params?: { days?: number }) => get('/analytics/performance', params),

  overview: () => get('/analytics/overview'),
};

// ==================== Evaluations API ====================

export const evaluationsApi = {
  list: (params?: { status?: string; limit?: number }) =>
    get('/evaluations', params),

  get: (id: string) => get(`/evaluations/${id}`),

  create: (data: {
    name: string;
    description?: string;
    test_cases?: any[];
  }) => post('/evaluations', data),

  run: (id: string, data: { test_cases?: any[]; temperature?: number }) =>
    post(`/evaluations/${id}/run`, { evaluation_id: id, ...data }),

  runs: (id: string) => get(`/evaluations/${id}/runs`),

  delete: (id: string) => del(`/evaluations/${id}`),
};