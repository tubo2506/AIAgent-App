import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  Sparkles,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  ChevronDown,
  Square,
  RotateCcw,
  PanelLeft,
  Download,
  Plus,
  Play,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle,
  Search,
  Cpu,
  Edit3,
  ArrowRight,
  Maximize2,
  PanelRight,
  PanelRightClose,
  Sliders,
  FileDown,
  Users,
} from './icons';
import type { ApiConfig, ChatMessage, RequestHistoryItem, UploadedFile, Agent, ChatSession } from '../types';
import {
  sendGeminiRequest,
  sendGeminiStreamingRequest,
  buildPayload,
  extractResponseText,
  extractTokenUsage,
} from '../services/geminiApi';
import { parseFollowUpQuestions } from '../services/followUpHelper';
import { MarkdownRenderer } from './MarkdownRenderer';
import { BUILT_IN_AGENTS } from '../data/defaultAgents';
import { AgentSelectorModal } from './AgentSelectorModal';
import { ChatSessionsDrawer } from './ChatSessionsDrawer';

interface ChatTabProps {
  config: ApiConfig;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onAddHistory: (item: RequestHistoryItem) => void;
  onUpdateMetrics: (latency: number, status: number) => void;
  onConfigChange?: (patch: Partial<ApiConfig>) => void;
  isUnlocked?: boolean;
  onRequestUnlock?: (callback: () => void) => void;
}

const OCR_PROMPTS = [
  'Hãy OCR và trích xuất toàn bộ văn bản trong tài liệu/ảnh này.',
  'Đọc bảng biểu trong tài liệu và xuất ra định dạng Markdown Table.',
  'Trích xuất toàn bộ thông tin quan trọng (hóa đơn, chứng từ) thành JSON có cấu trúc.',
  'Tóm tắt nội dung cốt lõi của tài liệu này trong 3 đoạn văn.',
];

const STORAGE_CUSTOM_AGENTS_KEY = 'gemini_studio_custom_agents_v1';
const STORAGE_SESSIONS_KEY = 'gemini_studio_chat_sessions_v2';
const STORAGE_ACTIVE_SESSION_KEY = 'gemini_studio_active_session_id';
const STORAGE_CHAT_WIDTH_KEY = 'gemini_studio_chat_width_v1';
const STORAGE_RIGHT_PANEL_KEY = 'gemini_studio_right_panel_open_v1';
const LEGACY_STORAGE_CHAT_KEY = 'gemini_studio_chat_messages_v1';

export type ChatWidthMode = 'wide' | 'full' | 'compact';

export const ChatTab: React.FC<ChatTabProps> = ({
  config,
  initialPrompt,
  onClearInitialPrompt,
  onAddHistory,
  onUpdateMetrics,
  onConfigChange,
  isUnlocked,
  onRequestUnlock,
}) => {
  // 1. Agents state: Built-in + Custom
  const [customAgents, setCustomAgents] = useState<Agent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_AGENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const allAgents = [...BUILT_IN_AGENTS, ...customAgents];

  const [currentAgentId, setCurrentAgentId] = useState<string>(() => {
    return BUILT_IN_AGENTS[0].id;
  });

  const currentAgent = allAgents.find((a) => a.id === currentAgentId) || BUILT_IN_AGENTS[0];

  // 2. Chat Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    // Migration from legacy single chat history
    let legacyMessages: ChatMessage[] = [];
    try {
      const legacySaved = localStorage.getItem(LEGACY_STORAGE_CHAT_KEY);
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          legacyMessages = parsed;
        }
      }
    } catch {}

    const initialAgent = BUILT_IN_AGENTS[0];
    const initialSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: legacyMessages.length > 0 ? 'Cuộc trò chuyện gần nhất' : 'Cuộc trò chuyện mới',
      agentId: initialAgent.id,
      agentName: initialAgent.name,
      agentAvatar: initialAgent.avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages:
        legacyMessages.length > 0
          ? legacyMessages
          : [
              {
                id: 'welcome',
                role: 'model',
                content:
                  'Xin chào! Tôi là **Gemini Trợ Lý Đa Năng** 🤖. Bạn có thể gõ câu hỏi, chọn Persona chuyên biệt ở góc trên, hoặc đính kèm ảnh / PDF 📎 để AI OCR và phân tích ngay!',
                timestamp: new Date().toLocaleTimeString(),
              },
            ],
    };

    return [initialSession];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
      if (savedId) return savedId;
    } catch {}
    return sessions[0]?.id || 'default_session';
  });

  // Active Session & Messages
  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];
  const messages = currentSession?.messages || [];

  // UI state (Default closed on mobile/tablet to avoid screen-covering backdrop)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return false;
    }
    return true;
  });
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Right Control & Inspector Panel state (Desktop default open, closed on mobile to prevent backdrop trap)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      return false;
    }
    try {
      const saved = localStorage.getItem(STORAGE_RIGHT_PANEL_KEY);
      if (saved !== null) return saved === 'true';
    } catch {}
    return window.innerWidth >= 1280;
  });

  const toggleRightPanel = () => {
    setIsRightPanelOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_RIGHT_PANEL_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Desktop chat layout width mode: 'wide' (~1520px, default), 'full' (96%), 'compact' (~896px)
  const [chatWidthMode, setChatWidthMode] = useState<ChatWidthMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_WIDTH_KEY);
      if (saved === 'full' || saved === 'compact' || saved === 'wide') {
        return saved;
      }
    } catch {}
    return 'wide';
  });

  const handleSetChatWidth = (mode: ChatWidthMode) => {
    setChatWidthMode(mode);
    try {
      localStorage.setItem(STORAGE_CHAT_WIDTH_KEY, mode);
    } catch {}
  };

  const containerWidthClass =
    chatWidthMode === 'full'
      ? 'max-w-[96%]'
      : chatWidthMode === 'compact'
      ? 'max-w-4xl'
      : 'max-w-6xl xl:max-w-7xl 2xl:max-w-[1520px]';

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Sync active session agent with currentAgentId
  useEffect(() => {
    if (currentSession && currentSession.agentId !== currentAgentId) {
      setCurrentAgentId(currentSession.agentId);
    }
  }, [currentSessionId]);

  // Save custom agents to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_AGENTS_KEY, JSON.stringify(customAgents));
    } catch (e) {
      console.warn('Failed to save custom agents', e);
    }
  }, [customAgents]);

  // Save sessions to localStorage safely with debounce (skip writing on every streaming chunk)
  useEffect(() => {
    if (isLoading) return; // Không ghi đĩa liên tục trong quá trình stream

    const timer = setTimeout(() => {
      try {
        const sanitizedSessions = sessions.slice(0, 25).map((s) => ({
          ...s,
          messages: s.messages.slice(-30).map((m) => {
            if (!m.attachments || m.attachments.length === 0) return m;
            return {
              ...m,
              attachments: m.attachments.map((att) => ({
                ...att,
                base64Data: '', // Bỏ base64 để không làm tràn localStorage
              })),
            };
          }),
        }));
        localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sanitizedSessions));
      } catch (e) {
        console.warn('Could not persist chat sessions, cleaning up old keys...', e);
        try {
          localStorage.removeItem(LEGACY_STORAGE_CHAT_KEY);
          localStorage.removeItem('gemini_studio_history_v1');
          localStorage.removeItem('gemini_studio_config_v1');
          // Thử lưu với số lượng phiên rút gọn
          const trimmed = sessions.slice(0, 10).map((s) => ({
            ...s,
            messages: s.messages.slice(-15).map((m) => ({ ...m, attachments: undefined })),
          }));
          localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(trimmed));
        } catch {
          // Bỏ qua nếu bộ nhớ trình duyệt đã đầy hoàn toàn
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [sessions, isLoading]);

  // Save current active session ID
  useEffect(() => {
    if (currentSessionId) {
      try {
        localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, currentSessionId);
      } catch {}
    }
  }, [currentSessionId]);

  // Live timer while request is running
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingSeconds(0);
      interval = setInterval(() => {
        setLoadingSeconds((prev) => Math.round((prev + 0.1) * 10) / 10);
      }, 100);
    } else {
      setLoadingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Keyboard shortcut: Escape to stop generation
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading) {
        handleStopGeneration();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isLoading]);

  // Auto-expanding textarea height based on content (min 44px, max 180px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 180)}px`;
    }
  }, [inputText]);

  // Stop speech synthesis & voice recognition when switching sessions or unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, [currentSessionId]);

  // Handle external preset prompts
  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  // Handle smart auto-scroll on content updates without jittering
  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleContainerScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScrollRef.current = isAtBottom;
    setShowScrollBottom(!isAtBottom && scrollHeight > clientHeight + 150);
  };

  const scrollToBottom = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
    shouldAutoScrollRef.current = true;
    setShowScrollBottom(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Update messages in the current session
  const updateCurrentMessages = (
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => {
    setSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id !== currentSessionId) return session;

        const newMessages =
          typeof updater === 'function' ? updater(session.messages) : updater;

        // Auto-generate title if this was a new session
        let newTitle = session.title;
        if (
          newTitle === 'Cuộc trò chuyện mới' ||
          newTitle === 'New Chat' ||
          newTitle.startsWith('Cuộc trò chuyện')
        ) {
          const firstUserMessage = newMessages.find((m) => m.role === 'user');
          if (firstUserMessage && firstUserMessage.content.trim()) {
            const rawTitle = firstUserMessage.content.trim().replace(/\n+/g, ' ');
            newTitle = rawTitle.slice(0, 36) + (rawTitle.length > 36 ? '...' : '');
          }
        }

        return {
          ...session,
          title: newTitle,
          messages: newMessages,
          updatedAt: new Date().toISOString(),
        };
      });
    });
  };

  // --- Session Management Handlers ---
  const handleNewSession = (agentToUse?: Agent) => {
    const targetAgent = agentToUse || currentAgent;
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'Cuộc trò chuyện mới',
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      agentAvatar: targetAgent.avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome_' + Date.now(),
          role: 'model',
          content: `Xin chào! Tôi là **${targetAgent.name}** (${targetAgent.avatar}).\n\n${targetAgent.description}\n\nBạn có thể đặt câu hỏi hoặc chọn các prompt gợi ý bên dưới để bắt đầu!`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setCurrentAgentId(targetAgent.id);

    // Sync config
    onConfigChange?.({
      systemInstruction: targetAgent.systemInstruction,
      model: targetAgent.recommendedModel || config.model,
      temperature: targetAgent.temperature ?? config.temperature,
    });
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const selectedSession = sessions.find((s) => s.id === sessionId);
    if (selectedSession) {
      const matchedAgent = allAgents.find((a) => a.id === selectedSession.agentId);
      if (matchedAgent) {
        setCurrentAgentId(matchedAgent.id);
        onConfigChange?.({
          systemInstruction: matchedAgent.systemInstruction,
          model: matchedAgent.recommendedModel || config.model,
          temperature: matchedAgent.temperature ?? config.temperature,
        });
      }
    }
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fallbackAgent = BUILT_IN_AGENTS[0];
        const freshSession: ChatSession = {
          id: 'session_' + Date.now(),
          title: 'Cuộc trò chuyện mới',
          agentId: fallbackAgent.id,
          agentName: fallbackAgent.name,
          agentAvatar: fallbackAgent.avatar,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'welcome',
              role: 'model',
              content: 'Xin chào! Tôi đã sẵn sàng để hỗ trợ bạn.',
              timestamp: new Date().toLocaleTimeString(),
            },
          ],
        };
        setCurrentSessionId(freshSession.id);
        return [freshSession];
      }

      if (currentSessionId === sessionId) {
        setCurrentSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleClearAllSessions = () => {
    const fallbackAgent = BUILT_IN_AGENTS[0];
    const freshSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: 'Cuộc trò chuyện mới',
      agentId: fallbackAgent.id,
      agentName: fallbackAgent.name,
      agentAvatar: fallbackAgent.avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome',
          role: 'model',
          content: 'Xin chào! Hãy bắt đầu cuộc trò chuyện mới.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    };
    setSessions([freshSession]);
    setCurrentSessionId(freshSession.id);
  };

  const handleExportSession = (sessionId: string, format: 'markdown' | 'json') => {
    const sessionToExport = sessions.find((s) => s.id === sessionId) || currentSession;
    if (!sessionToExport) return;

    const safeTitle = sessionToExport.title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(sessionToExport, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Gemini_Chat_${safeTitle}_${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let md = `# ${sessionToExport.title}\n\n`;
      md += `- **AI Persona**: ${sessionToExport.agentAvatar} ${sessionToExport.agentName}\n`;
      md += `- **Ngày tạo**: ${new Date(sessionToExport.createdAt).toLocaleString()}\n`;
      md += `- **Tổng số tin nhắn**: ${sessionToExport.messages.length}\n\n---\n\n`;

      sessionToExport.messages.forEach((m) => {
        const roleName = m.role === 'user' ? '👤 Người Dùng' : `🤖 ${sessionToExport.agentName}`;
        md += `### ${roleName} (${m.timestamp})\n\n`;
        md += `${m.content}\n\n`;
        if (m.attachments && m.attachments.length > 0) {
          md += `*📎 Tệp đính kèm: ${m.attachments.map((a) => a.name).join(', ')}*\n\n`;
        }
        md += `---\n\n`;
      });

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Gemini_Chat_${safeTitle}_${timestamp}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // --- Agent Management Handlers ---
  const handleSelectAgent = (agent: Agent) => {
    setCurrentAgentId(agent.id);

    // Sync config
    onConfigChange?.({
      systemInstruction: agent.systemInstruction,
      model: agent.recommendedModel || config.model,
      temperature: agent.temperature ?? config.temperature,
    });

    // Update current session's agent association
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;

        // If current session only has the welcome message, update it with new persona
        let updatedMessages = s.messages;
        if (s.messages.length <= 1) {
          updatedMessages = [
            {
              id: 'welcome_' + Date.now(),
              role: 'model',
              content: `Xin chào! Tôi là **${agent.name}** (${agent.avatar}).\n\n${agent.description}\n\nBạn có thể bắt đầu bằng cách gửi câu hỏi hoặc chọn các prompt gợi ý bên dưới!`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ];
        }

        return {
          ...s,
          agentId: agent.id,
          agentName: agent.name,
          agentAvatar: agent.avatar,
          messages: updatedMessages,
        };
      })
    );
  };

  const handleCreateAgent = (newAgentData: Omit<Agent, 'id' | 'createdAt'>) => {
    const newAgent: Agent = {
      ...newAgentData,
      id: 'custom_agent_' + Date.now(),
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
    };
    setCustomAgents((prev) => [newAgent, ...prev]);
    handleSelectAgent(newAgent);
  };

  const handleUpdateAgent = (updatedAgent: Agent) => {
    setCustomAgents((prev) =>
      prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a))
    );
    if (currentAgentId === updatedAgent.id) {
      handleSelectAgent(updatedAgent);
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    setCustomAgents((prev) => prev.filter((a) => a.id !== agentId));
    if (currentAgentId === agentId) {
      handleSelectAgent(BUILT_IN_AGENTS[0]);
    }
  };

  // File handling for OCR & Multimodal
  const processFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);

    fileList.forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} quá lớn (>20MB). Gemini inlineData hỗ trợ tối đa 20MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        const previewUrl = file.type.startsWith('image/') ? result : '';

        const newFile: UploadedFile = {
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          base64Data: base64,
          previewUrl,
        };

        setAttachments((prev) => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Clipboard paste handler (Support screenshots via Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
          const namedFile = new File([file], `screenshot_${timestamp}.png`, {
            type: file.type || 'image/png',
          });
          imageFiles.push(namedFile);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  };

  // Speech-to-Text handler (Web Speech API)
  const toggleListening = () => {
    if (isListening) {
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng mở trang trên Google Chrome hoặc Microsoft Edge để sử dụng tính năng nhận diện giọng nói!'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    }
  };

  // Text-to-Speech handler (SpeechSynthesis)
  const handleSpeak = (messageId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn chưa hỗ trợ tính năng đọc văn bản Text-to-Speech!');
      return;
    }

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown, symbols and code blocks for natural reading
    const cleanSpeechText = text
      .replace(/```[\s\S]*?```/g, 'Đoạn mã code.')
      .replace(/[#*`_~>[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeechText) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText.slice(0, 2000));
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Main Send Function
  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt !== undefined ? customPrompt : inputText).trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    if (!config.apiKey) {
      alert('Vui lòng nhập Google AI API Key trong thanh cấu hình bên trái trước khi gửi!');
      return;
    }

    const currentAttachments = [...attachments];
    const userMessage: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text || (currentAttachments.length > 0 ? 'Hãy OCR và phân tích tài liệu này' : ''),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      timestamp: new Date().toLocaleTimeString(),
    };

    const newMessages = [...messages, userMessage];
    updateCurrentMessages(newMessages);

    if (customPrompt === undefined) setInputText('');
    setAttachments([]);
    setIsLoading(true);

    shouldAutoScrollRef.current = true;
    setTimeout(() => scrollToBottom(), 50);

    // Build multi-turn contents with multimodal inlineData
    const contents = newMessages
      .filter((m) => !m.id.startsWith('welcome') && m.status !== 'error')
      .map((m) => {
        const parts: any[] = [];
        if (m.content && m.content.trim()) {
          parts.push({ text: m.content });
        }
        if (m.attachments && m.attachments.length > 0) {
          m.attachments.forEach((att) => {
            if (att.base64Data) {
              parts.push({
                inlineData: {
                  mimeType: att.mimeType,
                  data: att.base64Data,
                },
              });
            }
          });
        }
        if (parts.length === 0) return null;
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts,
        };
      })
      .filter(Boolean);

    if (contents.length === 0) {
      setIsLoading(false);
      return;
    }

    const effectiveConfig: ApiConfig = {
      ...config,
      systemInstruction: currentAgent.systemInstruction || config.systemInstruction,
    };

    const payload = buildPayload(contents as any, effectiveConfig);
    const modelMessageId = 'model_' + Date.now();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (config.streaming) {
      const streamingPlaceholder: ChatMessage = {
        id: modelMessageId,
        role: 'model',
        content: '',
        timestamp: new Date().toLocaleTimeString(),
        status: 'loading',
      };
      updateCurrentMessages((prev) => [...prev, streamingPlaceholder]);

      try {
        const response = await sendGeminiStreamingRequest(
          effectiveConfig,
          payload,
          (accumulatedText) => {
            updateCurrentMessages((prev) =>
              prev.map((msg) =>
                msg.id === modelMessageId ? { ...msg, content: accumulatedText } : msg
              )
            );
          },
          { signal: controller.signal, timeoutMs: 90000 }
        );

        onUpdateMetrics(response.latencyMs, response.status);

        onAddHistory({
          id: 'req_' + Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          model: config.model,
          endpoint: `/models/${config.model}:streamGenerateContent`,
          status: response.status,
          statusText: response.statusText,
          latencyMs: response.latencyMs,
          requestBody: payload,
          responseBody: response.data || response.error,
          error: response.error,
          headers: response.headers,
        });

        if (response.success) {
          const tokens = extractTokenUsage(response.data);
          updateCurrentMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== modelMessageId) return msg;
              const parsed = parseFollowUpQuestions(msg.content, currentAgent, true);
              return {
                ...msg,
                status: 'success',
                latencyMs: response.latencyMs,
                tokens,
                finishReason: response.finishReason,
                suggestedQuestions: parsed.questions,
              };
            })
          );
        } else {
          updateCurrentMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? {
                    ...msg,
                    status: 'error',
                    content:
                      msg.content ||
                      `⚠️ Lỗi (${response.status}): ${response.error || 'Không thể kết nối đến Gemini API'}`,
                    error: response.error,
                    latencyMs: response.latencyMs,
                  }
                : msg
            )
          );
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          updateCurrentMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? {
                    ...msg,
                    status: 'success',
                    content: (msg.content || '') + '\n\n*(Đã dừng tạo phản hồi theo yêu cầu)*',
                  }
                : msg
            )
          );
        } else {
          updateCurrentMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? {
                    ...msg,
                    status: 'error',
                    content: `⚠️ Lỗi kết nối: ${err.message || 'Không thể kết nối tới Google API'}`,
                    error: err.message,
                  }
                : msg
            )
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    } else {
      // Standard generateContent mode
      const loadingPlaceholder: ChatMessage = {
        id: modelMessageId,
        role: 'model',
        content: 'Đang gửi yêu cầu đến Gemini...',
        timestamp: new Date().toLocaleTimeString(),
        status: 'loading',
      };
      updateCurrentMessages((prev) => [...prev, loadingPlaceholder]);

      try {
        const response = await sendGeminiRequest(effectiveConfig, payload, {
          signal: controller.signal,
          timeoutMs: 90000,
        });

        onUpdateMetrics(response.latencyMs, response.status);

        onAddHistory({
          id: 'req_' + Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          model: config.model,
          endpoint: `/models/${config.model}:generateContent`,
          status: response.status,
          statusText: response.statusText,
          latencyMs: response.latencyMs,
          requestBody: payload,
          responseBody: response.data || response.error,
          error: response.error,
          headers: response.headers,
        });

        if (response.success) {
          const responseText = extractResponseText(response.data);
          const tokens = extractTokenUsage(response.data);
          const parsed = parseFollowUpQuestions(responseText, currentAgent, true);

          updateCurrentMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? {
                    ...msg,
                    content: responseText,
                    status: 'success',
                    latencyMs: response.latencyMs,
                    tokens,
                    finishReason: response.finishReason,
                    suggestedQuestions: parsed.questions,
                  }
                : msg
            )
          );
        } else {
          updateCurrentMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? {
                    ...msg,
                    content: `⚠️ Lỗi (${response.status}): ${response.error || 'Có sự cố xảy ra'}`,
                    status: 'error',
                    error: response.error,
                    latencyMs: response.latencyMs,
                  }
                : msg
            )
          );
        }
      } catch (err: any) {
        updateCurrentMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? {
                  ...msg,
                  content: `⚠️ Lỗi kết nối: ${err.message || 'Không thể gọi API'}`,
                  status: 'error',
                  error: err.message,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Return early during IME composition (Vietnamese Telex/VNI or Android keyboard suggestions)
    if (e.nativeEvent.isComposing || (e as any).isComposing || e.keyCode === 229) {
      return;
    }

    // Arrow Up when input is empty recalls the last user question
    if (e.key === 'ArrowUp' && !inputText.trim()) {
      e.preventDefault();
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg && lastUserMsg.content) {
        setInputText(lastUserMsg.content);
      }
      return;
    }

    // On mobile devices (phones/touchscreens), Enter inserts a newline rather than sending prematurely
    const isMobileDevice =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

    if (e.key === 'Enter') {
      if (isMobileDevice) {
        return; // Allow native newline on mobile
      }
      if (!e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleRetry = (lastUserPrompt: string) => {
    handleSend(lastUserPrompt);
  };

  const handleContinueGeneration = () => {
    handleSend(
      'Hãy tiếp tục hoàn thiện câu trả lời ở trên, nối tiếp trực tiếp ngay sau câu kết thúc dang dở và trình bày chi tiết các phần, căn cứ, điều khoản còn lại mà không lặp lại nội dung đã viết.'
    );
  };

  // Context document attachments
  const documentAttachments = messages
    .filter((m) => m.role === 'user' && m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments || []);
  const hasDocumentContext = documentAttachments.length > 0;
  const totalDocSizeKB = Math.round(
    documentAttachments.reduce((sum, att) => sum + (att.size || 0), 0) / 1024
  );

  const isDirectUpload = attachments.length > 0;
  const loadingMessage = isDirectUpload
    ? 'Đang đọc và OCR phân tích tài liệu...'
    : hasDocumentContext
    ? 'Đang tra cứu tài liệu và chuẩn bị phản hồi...'
    : `${currentAgent.name} đang suy nghĩ và phản hồi...`;

  // Starter prompts: either OCR prompts or current agent's prompts
  const activeStarterPrompts =
    attachments.length > 0 ? OCR_PROMPTS : currentAgent.starterPrompts;

  return (
    <div className="flex-1 min-h-0 flex h-full overflow-hidden relative">
      {/* 1. Chat Sessions Drawer */}
      <ChatSessionsDrawer
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={() => handleNewSession()}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        onExportSession={handleExportSession}
      />

      {/* 2. Main Chat Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors relative overflow-hidden"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Drag & drop overlay */}
        {isDragging && (
          <div
            onClick={() => setIsDragging(false)}
            className="absolute inset-0 bg-blue-600/10 dark:bg-blue-600/20 backdrop-blur-xs border-2 border-dashed border-blue-500 z-50 flex flex-col items-center justify-center gap-3 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center">
              <Paperclip className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-bounce" />
            </div>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
              Thả tài liệu (Hình ảnh hoặc PDF) vào đây để OCR / Phân tích
            </p>
          </div>
        )}

        {/* Top Slim Strip (Compact ~40px) */}
        <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shrink-0 shadow-2xs z-10">
          {/* Left: Drawer Toggle & Active Agent Info */}
          <div className="flex items-center gap-2 min-w-0">
            {!isDrawerOpen && (
              <button
                onClick={() => setIsDrawerOpen(true)}
                title="Mở danh sách cuộc trò chuyện (Chat History)"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors shrink-0"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setIsAgentModalOpen(true)}
                title="Bấm để đổi Persona Agent"
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left min-w-0 cursor-pointer group"
              >
                <span className="text-base shrink-0">{currentAgent.avatar}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate max-w-[140px] sm:max-w-[220px]">
                  {currentAgent.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 shrink-0" />
              </button>

              {currentSession?.title && (
                <>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline max-w-[200px] lg:max-w-[320px]" title={currentSession.title}>
                    {currentSession.title}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Actions & Right Panel Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isLoading && (
              <button
                onClick={handleStopGeneration}
                className="flex items-center gap-1 px-2 py-1 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer font-medium"
                title="Dừng phản hồi hiện tại (Esc)"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Dừng ({loadingSeconds.toFixed(1)}s)</span>
              </button>
            )}

            {/* Quick Search Toggle */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery('');
              }}
              title="Tìm kiếm trong cuộc trò chuyện (Ctrl+F)"
              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                isSearchOpen
                  ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* New Chat Button */}
            <button
              onClick={() => handleNewSession()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
              title="Mở cuộc trò chuyện mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat Mới</span>
            </button>

            {/* Right Inspector Panel Toggle */}
            <button
              onClick={toggleRightPanel}
              title={isRightPanelOpen ? "Thu gọn bảng công cụ bên phải" : "Mở bảng công cụ bên phải"}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                isRightPanelOpen
                  ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar Sub-header */}
        {isSearchOpen && (
          <div className="px-4 py-2 bg-blue-50/80 dark:bg-slate-900 border-b border-blue-200 dark:border-slate-800 flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm từ khóa trong cuộc trò chuyện (Ctrl+F)..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {searchQuery.trim() && (
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Khớp {messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase().trim())).length} tin nhắn
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Đóng tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Messages list */}
        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="flex-1 overflow-y-auto p-5 space-y-5"
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const isError = m.status === 'error';
            const isStreamingNow = isLoading && m.status === 'loading';
            const isSearchMatch =
              searchQuery.trim().length > 1 &&
              m.content.toLowerCase().includes(searchQuery.toLowerCase().trim());

            const isLatestModelMessage =
              !isUser &&
              m.id ===
                [...messages]
                  .reverse()
                  .find((msg) => msg.role === 'model' && msg.status !== 'error')?.id;

            const parsedResult =
              !isUser && !isStreamingNow && m.content
                ? parseFollowUpQuestions(m.content, currentAgent, isLatestModelMessage)
                : { cleanContent: m.content, questions: [] };

            const displayContent = isStreamingNow ? m.content : parsedResult.cleanContent;
            const followUpQuestions =
              !isUser && !isStreamingNow && !m.id.startsWith('welcome') && m.status !== 'error'
                ? m.suggestedQuestions && m.suggestedQuestions.length > 0
                  ? m.suggestedQuestions
                  : parsedResult.questions
                : [];

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${containerWidthClass} mx-auto group ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : isError
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-300 dark:border-rose-800'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-base'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : currentAgent.avatar || <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble Container */}
                <div
                  className={`flex flex-col ${
                    isUser
                      ? 'items-end max-w-[85%] sm:max-w-[78%]'
                      : chatWidthMode === 'full'
                      ? 'items-start max-w-[97%]'
                      : chatWidthMode === 'compact'
                      ? 'items-start max-w-[88%]'
                      : 'items-start max-w-[95%] md:max-w-[92%]'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isUser ? 'Bạn' : currentAgent.name}
                    </span>
                    <span>{m.timestamp}</span>
                    {m.latencyMs && !isUser && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                        {(m.latencyMs / 1000).toFixed(2)}s
                      </span>
                    )}
                    {m.tokens && !isUser && (
                      <span className="text-blue-600 dark:text-blue-400 text-[10px] font-mono">
                        {m.tokens.totalTokens} tokens
                      </span>
                    )}
                    {m.finishReason === 'MAX_TOKENS' && !isUser && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 rounded border border-amber-300 dark:border-amber-800">
                        Đạt giới hạn Tokens
                      </span>
                    )}
                  </div>

                  {/* Attachments Chips inside message */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {m.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 shadow-2xs"
                        >
                          {att.mimeType.startsWith('image/') ? (
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span className="max-w-[150px] truncate font-medium">{att.name}</span>
                          <span className="text-[10px] text-slate-400">
                            ({(att.size / 1024).toFixed(0)}KB)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm transition-all relative ${
                      isSearchMatch
                        ? 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-amber-200/50 dark:shadow-none'
                        : ''
                    } ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs selection:bg-blue-400'
                        : isError
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 rounded-tl-xs shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {isStreamingNow && !m.content ? (
                      <div className="flex items-center gap-3 py-1 text-slate-500 dark:text-slate-400">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                        </span>
                        <span className="text-xs font-medium animate-pulse">
                          {loadingMessage} ({loadingSeconds.toFixed(1)}s)
                        </span>
                        <button
                          onClick={handleStopGeneration}
                          className="ml-2 px-2 py-0.5 text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer"
                        >
                          ■ Dừng (Esc)
                        </button>
                      </div>
                    ) : isUser ? (
                      <div className="whitespace-pre-wrap break-words leading-relaxed">
                        {m.content}
                      </div>
                    ) : (
                      <div className="markdown-body prose dark:prose-invert max-w-none text-sm leading-relaxed overflow-x-auto">
                        <MarkdownRenderer content={displayContent} />
                        {isStreamingNow && (
                          <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse align-middle" />
                        )}
                      </div>
                    )}

                    {/* Suggested Follow-up Questions */}
                    {!isUser && !isStreamingNow && followUpQuestions.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                          <span>Gợi ý câu hỏi mở rộng vấn đề:</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {followUpQuestions.map((q, idx) => (
                            <div
                              key={idx}
                              className="group/q flex items-center justify-between gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-50/70 hover:bg-blue-100/90 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-blue-200/70 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-500 shadow-2xs transition-all"
                            >
                              <button
                                type="button"
                                onClick={() => handleSend(q)}
                                disabled={isLoading}
                                className="flex-1 text-left text-xs text-slate-800 dark:text-slate-200 group-hover/q:text-blue-700 dark:group-hover/q:text-blue-300 font-medium leading-relaxed cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title="Bấm để gửi ngay câu hỏi này"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 opacity-60 group-hover/q:opacity-100 group-hover/q:scale-125 transition-all"></span>
                                <span>{q}</span>
                              </button>
                              <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/q:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInputText(q);
                                    textareaRef.current?.focus();
                                  }}
                                  title="Điền câu hỏi này vào ô nhập liệu để chỉnh sửa trước khi gửi"
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSend(q)}
                                  disabled={isLoading}
                                  title="Gửi ngay"
                                  className="p-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-200/60 dark:hover:bg-blue-900/60 cursor-pointer transition-colors"
                                >
                                  <ArrowRight className="w-3 h-3 group-hover/q:translate-x-0.5 transition-transform" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Banner when generation is cut off by MAX_TOKENS */}
                  {!isUser && !isStreamingNow && m.finishReason === 'MAX_TOKENS' && (
                    <div className="w-full mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start sm:items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                        <span className="text-base leading-none">⚠️</span>
                        <div>
                          <p className="font-semibold">Nội dung bị dừng do đạt giới hạn token (Max Tokens)</p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Model đã xuất {m.tokens?.candidatesTokens || config.maxOutputTokens} tokens. Bạn có thể nhấn nút bên cạnh để AI tự động nối tiếp câu trả lời.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleContinueGeneration}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Viết tiếp nội dung</span>
                      </button>
                    </div>
                  )}

                  {/* Bottom Actions for assistant message */}
                  {!isUser && !isStreamingNow && m.content && (
                    <div className="flex items-center gap-1 mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(m.id, displayContent || m.content)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Sao chép nội dung"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      {/* Text-to-Speech button */}
                      <button
                        onClick={() => handleSpeak(m.id, displayContent || m.content)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                          speakingMessageId === m.id
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-semibold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={speakingMessageId === m.id ? 'Dừng đọc' : 'Nghe đọc câu trả lời bằng giọng nói'}
                      >
                        {speakingMessageId === m.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-500 animate-pulse" />
                            <span className="text-rose-500 font-medium">Dừng nghe</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Nghe đọc</span>
                          </>
                        )}
                      </button>

                      {isError && (
                        <button
                          onClick={() => {
                            const lastUser = [...messages].reverse().find((msg) => msg.role === 'user');
                            if (lastUser) handleRetry(lastUser.content);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors font-medium"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Thử lại câu này</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll to bottom button */}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-28 right-8 z-30 p-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-all cursor-pointer animate-in fade-in zoom-in-75"
            title="Cuộn xuống tin nhắn mới nhất"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* Starter Prompts Bar (dynamically tailored to current agent) */}
        <div className="px-5 py-2 bg-white/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800/80 shrink-0">
          <div className={`${containerWidthClass} mx-auto flex items-center gap-2 overflow-x-auto pb-1`}>
            <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Gợi ý {currentAgent.name}:</span>
            </span>
            {activeStarterPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="text-xs px-3 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-all text-left truncate max-w-xs shadow-2xs cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input box area */}
        <div className="p-2 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors shrink-0 relative z-20">
          {/* Attachment chips preview */}
          {attachments.length > 0 && (
            <div className={`${containerWidthClass} mx-auto mb-2 flex flex-wrap gap-1.5 sm:gap-2`}>
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-1.5 py-0.5 sm:py-1 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-xs"
                >
                  {att.mimeType.startsWith('image/') ? (
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className="max-w-[120px] sm:max-w-[150px] truncate font-medium">{att.name}</span>
                  <span className="text-[10px] text-slate-500">
                    ({(att.size / 1024).toFixed(0)}KB)
                  </span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                textareaRef.current?.focus();
              }
            }}
            className={`${containerWidthClass} mx-auto relative flex items-end gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl p-1.5 sm:p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-xs cursor-text`}
          >
            {/* File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Đính kèm ảnh hoặc tài liệu PDF để OCR / phân tích"
              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Input Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              title={
                isListening
                  ? 'Đang lắng nghe tiếng Việt... Bấm để dừng'
                  : 'Nói để nhập câu hỏi bằng giọng nói tiếng Việt (Chrome/Edge)'
              }
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-400'
                  : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => {
                setTimeout(() => {
                  textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 300);
              }}
              placeholder={
                isListening
                  ? '🎙️ Đang lắng nghe giọng nói của bạn...'
                  : attachments.length > 0
                  ? 'Nhập yêu cầu OCR hoặc câu hỏi về tài liệu đính kèm... (Enter để gửi)'
                  : `Hỏi ${currentAgent.name}... Dán ảnh hoặc kéo thả file`
              }
              rows={1}
              style={{ minHeight: '40px', maxHeight: '180px' }}
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck="false"
              enterKeyHint="send"
              className="flex-1 bg-transparent text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none px-2 py-2 focus:outline-none leading-relaxed select-text touch-manipulation"
            />

            {isLoading ? (
              <button
                onClick={handleStopGeneration}
                title="Dừng tạo câu trả lời (Esc)"
                className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm shrink-0 cursor-pointer animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Dừng ({loadingSeconds.toFixed(1)}s)</span>
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() && attachments.length === 0}
                className="p-2 sm:p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all shadow-sm shrink-0 cursor-pointer disabled:cursor-not-allowed"
                title="Gửi câu hỏi (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className={`${containerWidthClass} mx-auto mt-1 flex flex-wrap justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 gap-1`}>
            <span className="flex items-center gap-1.5">
              <Paperclip className="w-3 h-3 text-blue-500" />
              <span>Dán ảnh <strong className="hidden sm:inline">Ctrl+V</strong>, kéo thả file hoặc bấm 📎 để upload OCR</span>
            </span>
            <div className="hidden sm:flex items-center gap-3">
              <span><strong>↑</strong> điền lại tin nhắn cũ</span>
              <span><strong>Shift+Enter</strong> xuống dòng</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Right Inspector Panel */}
      {isRightPanelOpen && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 xl:hidden animate-in fade-in"
            onClick={() => setIsRightPanelOpen(false)}
          />

          <aside className="fixed inset-y-0 right-0 z-40 xl:relative xl:z-10 w-80 max-w-[85vw] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 shadow-2xl xl:shadow-none select-none transition-all animate-in slide-in-from-right duration-200">
            {/* Panel Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Bảng Điều Khiển & Inspector
                </span>
              </div>
              <button
                onClick={toggleRightPanel}
                title="Thu gọn bảng điều khiển"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
              {/* Card 1: AI Agent Persona */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-blue-50/40 to-transparent dark:from-slate-800/40 dark:to-transparent space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Chuyên Gia AI (Persona)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                    {currentAgent.categoryLabel || currentAgent.category}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-blue-100 dark:border-slate-700 flex items-center justify-center text-2xl shrink-0">
                    {currentAgent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                      {currentAgent.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {currentAgent.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAgentModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold cursor-pointer transition-all shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Đổi Chuyên Gia / Tạo Mới</span>
                </button>
              </div>

              {/* Card 2: Gemini Model Selection */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Mô Hình AI (Model)</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { id: 'gemini-flash-lite-latest', label: 'Flash-Lite (~1s)', desc: 'Siêu tốc độ, phản hồi nhanh nhất' },
                    { id: 'gemini-3.6-flash', label: '3.6-Flash (Chuẩn)', desc: 'Cân bằng thông minh & đa phương tiện' },
                    { id: 'gemini-2.5-pro', label: '2.5-Pro (Chuyên sâu)', desc: 'Suy luận logic cao cấp & tài liệu lớn' },
                  ].map((m) => {
                    const isSelected = config.model === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onConfigChange?.({ model: m.id })}
                        className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-400 dark:bg-blue-950/60 dark:border-blue-700 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold text-xs ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {m.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {m.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Desktop Layout Width */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Độ Rộng Khung Chat</span>
                </span>

                <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleSetChatWidth('compact')}
                    className={`py-1 text-center rounded text-[11px] font-medium transition-all cursor-pointer ${
                      chatWidthMode === 'compact'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    Gọn
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetChatWidth('wide')}
                    className={`py-1 text-center rounded text-[11px] font-medium transition-all cursor-pointer ${
                      chatWidthMode === 'wide'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    Rộng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetChatWidth('full')}
                    className={`py-1 text-center rounded text-[11px] font-medium transition-all cursor-pointer ${
                      chatWidthMode === 'full'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    Toàn cảnh
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {chatWidthMode === 'compact' && 'Khung hẹp ~900px, phù hợp màn hình nhỏ hoặc hội thoại ngắn.'}
                  {chatWidthMode === 'wide' && 'Khung rộng ~1520px, tối ưu trải nghiệm đọc & viết.'}
                  {chatWidthMode === 'full' && 'Khung 96% toàn màn hình, lý tưởng cho bảng biểu số liệu.'}
                </p>
              </div>

              {/* Card 4: Quick Actions & Exports */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Thao Tác & Xuất Dữ Liệu
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExportSession(currentSessionId, 'markdown')}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Xuất Markdown</span>
                  </button>
                  <button
                    onClick={() => handleExportSession(currentSessionId, 'json')}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Xuất JSON</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsShortcutsOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Danh Mục Phím Tắt Tiện Ích (?)</span>
                </button>
              </div>

              {/* Card 5: Session Stats & Context */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Thông Số Cuộc Trò Chuyện
                </span>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Số lượng tin nhắn:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{messages.length}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Tài liệu đính kèm:</span>
                    {hasDocumentContext ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {totalDocSizeKB} KB ({documentAttachments.length} file)
                      </span>
                    ) : (
                      <span className="text-slate-400">Không có</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>ID phiên chat:</span>
                    <span className="font-mono text-[10px] text-slate-500">{currentSessionId.slice(0, 12)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* 3. Agent Selector & Custom Agent Builder Modal */}
      <AgentSelectorModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        agents={allAgents}
        currentAgentId={currentAgentId}
        onSelectAgent={handleSelectAgent}
        onCreateAgent={handleCreateAgent}
        onUpdateAgent={handleUpdateAgent}
        onDeleteAgent={handleDeleteAgent}
        isUnlocked={isUnlocked}
        onRequestUnlock={onRequestUnlock}
      />

      {/* 4. Keyboard Shortcuts & Tips Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Danh Mục Phím Tắt & Thao Tác Tiện Ích</span>
              </h3>
              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Gửi câu hỏi / lệnh chat</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px] shadow-2xs font-semibold">Enter</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Xuống dòng trong ô nhập</span>
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xs font-semibold">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xs font-semibold">Enter</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Dán ảnh chụp màn hình (Snipping Tool)</span>
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xs font-semibold">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xs font-semibold">V</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Điền lại câu hỏi trước (khi ô chat trống)</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px] shadow-2xs font-semibold">↑ Mũi tên lên</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Tìm kiếm trong cuộc trò chuyện</span>
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xs font-semibold">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xs font-semibold">F</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Dừng phản hồi đang tạo</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px] shadow-2xs font-semibold">Esc</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Nhập bằng giọng nói (Micro)</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Bấm icon 🎙️</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
