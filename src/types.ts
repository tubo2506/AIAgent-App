export type AuthMode = 'header' | 'query';
export type ApiVersion = 'v1beta' | 'v1';

export interface ApiConfig {
  apiKey: string;
  model: string;
  apiVersion: ApiVersion;
  authMode: AuthMode;
  useProxy: boolean;
  streaming: boolean;
  theme: 'light' | 'dark';
  customBaseUrl: string;
  systemInstruction: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  enableSearchGrounding?: boolean; // Tra cứu Web thời gian thực
  searchProvider?: 'tavily' | 'google'; // Nguồn tra cứu: Tavily (miễn phí) hoặc Google Search Grounding
  tavilyApiKey?: string; // API Key cho Tavily Search (https://tavily.com)
}

export interface LegalDocument {
  id: string;
  title: string;
  code?: string; // Ví dụ: 123/2020/NĐ-CP hoặc 78/2021/TT-BTC
  issuedDate?: string;
  originalFileName: string;
  originalSize: number; // Kích thước file gốc (bytes)
  compressedSize: number; // Kích thước text Markdown số hóa (bytes)
  content: string; // Toàn văn số hóa dạng Markdown
  summary?: string; // Tóm tắt nội dung chính của văn bản
  isActive: boolean; // Có đang bật để AI tham chiếu trong chat không
  createdAt: string;
  updatedAt?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingChunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
  groundingSupports?: Array<{
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
    segment?: {
      startIndex?: number;
      endIndex?: number;
      text?: string;
    };
  }>;
}

export interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string; // Base64 raw (without prefix data:image/png;base64,)
  previewUrl: string; // Object URL or data URL for rendering in UI
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  attachments?: UploadedFile[];
  status?: 'loading' | 'success' | 'error';
  error?: string;
  latencyMs?: number;
  finishReason?: string;
  tokens?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
  suggestedQuestions?: string[];
  groundingMetadata?: GroundingMetadata;
}

export interface RequestHistoryItem {
  id: string;
  timestamp: string;
  model: string;
  endpoint: string;
  status: number;
  statusText: string;
  latencyMs: number;
  requestBody: any;
  responseBody: any;
  error?: string;
  headers: Record<string, string>;
}

export interface ApiResponseData {
  success: boolean;
  status: number;
  statusText: string;
  latencyMs: number;
  finishReason?: string;
  data?: any;
  error?: any;
  headers: Record<string, string>;
  rawResponse?: string;
}

export type AgentCategory =
  | 'general'
  | 'legal_tax'
  | 'code'
  | 'doc_ocr'
  | 'translation'
  | 'reasoning'
  | 'business'
  | 'custom';

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  category: AgentCategory;
  categoryLabel?: string;
  systemInstruction: string;
  recommendedModel?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  starterPrompts: string[];
  isBuiltIn?: boolean;
  createdAt?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  totalTokens?: number;
  isPinned?: boolean;
}

