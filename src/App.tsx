import { useState, useEffect } from 'react';
import type { ApiConfig, RequestHistoryItem } from './types';
import { Header } from './components/Header';
import { ChatTab } from './components/ChatTab';
import { RawJsonTab } from './components/RawJsonTab';
import { PresetsTab } from './components/PresetsTab';
import { HistoryTab } from './components/HistoryTab';
import { BenchmarkTab } from './components/BenchmarkTab';
import { SettingsTab } from './components/SettingsTab';
import { PinLockModal } from './components/PinLockModal';
import { SystemLockScreen } from './components/SystemLockScreen';
import {
  isPinProtectionEnabled,
  isSystemAuthenticated,
  isSystemLockEnabled,
  setSystemAuthenticated,
} from './services/security';

const DEFAULT_CONFIG: ApiConfig = {
  apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || '',
  model: 'gemini-3.5-flash-lite', // Model Gemini 3.5 Flash-Lite: Quota cao nhất, hạn chế lỗi 429 Rate Limit
  apiVersion: 'v1beta',
  authMode: 'header',
  useProxy: false, // Gọi trực tiếp Google API (nhanh x3 lần, không nghẽn Proxy Node)
  streaming: true, // Bật streaming SSE cho cảm giác tức thì
  theme: 'light', // Mặc định giao diện SÁNG theo yêu cầu người dùng
  customBaseUrl: '',
  systemInstruction: '',
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192, // Tăng lên 8192 để các model suy luận (thinking) không bị ngắt giữa chừng
  enableSearchGrounding: true, // Tự động bật sẵn Tra cứu Web thời gian thực
  searchProvider: 'tavily', // Mặc định dùng Tavily Search (1.000 lượt miễn phí, không cần thẻ ngân hàng)
  tavilyApiKey: (import.meta as any).env?.VITE_TAVILY_API_KEY || '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',
};

const STORAGE_CONFIG_KEY = 'gemini_studio_config_v2';
const STORAGE_HISTORY_KEY = 'gemini_studio_history_v2';

// Helper to strip giant base64 payloads before storing in history/localStorage
function sanitizeHistoryItem(item: RequestHistoryItem): RequestHistoryItem {
  try {
    const sanitizeObj = (obj: any): any => {
      return JSON.parse(
        JSON.stringify(obj, (key, value) => {
          if (key === 'data' && typeof value === 'string' && value.length > 200) {
            return `[Base64 Data: ~${Math.round(value.length / 1024)} KB]`;
          }
          if (typeof value === 'string' && value.length > 20000) {
            return `${value.slice(0, 1000)}... [truncated ${value.length} chars]`;
          }
          return value;
        })
      );
    };

    return {
      ...item,
      requestBody: sanitizeObj(item.requestBody),
      responseBody: sanitizeObj(item.responseBody),
    };
  } catch {
    return item;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    try {
      localStorage.removeItem('gemini_studio_history_v1');
      localStorage.removeItem('gemini_studio_config_v1');
      localStorage.removeItem('gemini_studio_chat_messages_v1');
      if (key === STORAGE_HISTORY_KEY) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const minimal = parsed.slice(0, 5);
          localStorage.setItem(key, JSON.stringify(minimal));
          return;
        }
      }
      localStorage.setItem(key, value);
    } catch {
      // Bỏ qua an toàn nếu quota trình duyệt đã đầy hoàn toàn
    }
  }
}

export function App() {
  const [config, setConfig] = useState<ApiConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Tự động nâng cấp maxOutputTokens nếu còn ở mức cũ <= 2048 để tránh dừng đột ngột
        if (!parsed.maxOutputTokens || parsed.maxOutputTokens <= 2048) {
          parsed.maxOutputTokens = 8192;
        }
        // Tự động cập nhật Tavily API Key nếu chưa có
        if (!parsed.tavilyApiKey) {
          parsed.tavilyApiKey = DEFAULT_CONFIG.tavilyApiKey;
        }
        // Tự động chuyển model sang gemini-3.5-flash-lite nếu đang dùng model quota thấp hoặc default cũ
        if (
          !parsed.model ||
          parsed.model === 'gemini-3.6-flash' ||
          parsed.model === 'gemini-3.5-flash' ||
          parsed.model === 'gemini-flash-lite-latest' ||
          parsed.model === 'gemini-1.5-flash'
        ) {
          parsed.model = 'gemini-3.5-flash-lite';
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  const [history, setHistory] = useState<RequestHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(sanitizeHistoryItem).slice(0, 30);
        }
      }
    } catch {
      try {
        localStorage.removeItem(STORAGE_HISTORY_KEY);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'benchmark' | 'presets' | 'raw' | 'history' | 'settings'>('chat');
  const [lastLatency, setLastLatency] = useState<number | undefined>();
  const [lastStatus, setLastStatus] = useState<number | undefined>();
  const [pendingPrompt, setPendingPrompt] = useState<string>('');

  // Master System Entry Lock State
  const [isSystemUnlocked, setIsSystemUnlocked] = useState<boolean>(() => {
    return !isSystemLockEnabled() || isSystemAuthenticated();
  });

  const handleSystemUnlock = () => {
    setIsSystemUnlocked(true);
  };

  const handleLockSystem = () => {
    setSystemAuthenticated(false);
    setIsSystemUnlocked(false);
  };

  // Security PIN Lock State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pendingTab, setPendingTab] = useState<'chat' | 'benchmark' | 'presets' | 'raw' | 'history' | 'settings' | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isProtected = isPinProtectionEnabled();

  const handleLockNow = () => {
    setIsUnlocked(false);
    setActiveTab('chat');
  };

  const requireUnlock = (callback: () => void, targetTab?: typeof activeTab) => {
    if (!isProtected || isUnlocked) {
      callback();
      return;
    }
    setPendingAction(() => callback);
    if (targetTab) setPendingTab(targetTab);
    setIsPinModalOpen(true);
  };

  const handleTabClick = (tabKey: typeof activeTab) => {
    if (tabKey === 'chat' || tabKey === 'presets') {
      setActiveTab(tabKey);
      return;
    }
    if (isProtected && !isUnlocked) {
      setPendingTab(tabKey);
      setPendingAction(null);
      setIsPinModalOpen(true);
      return;
    }
    setActiveTab(tabKey);
  };

  const handlePinSuccess = () => {
    setIsUnlocked(true);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  // Dynamically update viewport height for mobile keyboards (visualViewport API)
  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        document.documentElement.style.setProperty('--app-height', `${currentHeight}px`);
      } else {
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      }
    };

    updateHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      window.visualViewport.addEventListener('scroll', updateHeight);
    } else {
      window.addEventListener('resize', updateHeight);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight);
        window.visualViewport.removeEventListener('scroll', updateHeight);
      } else {
        window.removeEventListener('resize', updateHeight);
      }
    };
  }, []);

  // Manage Dark / Light theme class on html document
  useEffect(() => {
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.theme]);

  // Persist config safely
  useEffect(() => {
    safeSetStorage(STORAGE_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  // Persist history safely without overflowing quota
  useEffect(() => {
    safeSetStorage(STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
  }, [history]);

  const handleAddHistory = (item: RequestHistoryItem) => {
    const cleanItem = sanitizeHistoryItem(item);
    setHistory((prev) => [cleanItem, ...prev].slice(0, 30));
  };

  const handleClearHistory = () => {
    requireUnlock(() => {
      setHistory([]);
      try {
        localStorage.removeItem(STORAGE_HISTORY_KEY);
      } catch {
        // ignore
      }
    });
  };

  const handleToggleTheme = () => {
    setConfig((prev) => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  const handleResetConfig = () => {
    requireUnlock(() => {
      if (window.confirm('Khôi phục cấu hình về mặc định ban đầu?')) {
        setConfig(DEFAULT_CONFIG);
        localStorage.removeItem(STORAGE_CONFIG_KEY);
      }
    });
  };

  const handleSelectPreset = (promptText: string, suggestedConfig?: Partial<ApiConfig>) => {
    if (suggestedConfig) {
      setConfig((prev) => ({ ...prev, ...suggestedConfig }));
    }
    setPendingPrompt(promptText);
    setActiveTab('chat');
  };

  if (!isSystemUnlocked) {
    return (
      <SystemLockScreen
        onUnlock={handleSystemUnlock}
        theme={config.theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div
      style={{ height: 'var(--app-height, 100dvh)' }}
      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden selection:bg-blue-600/20 selection:text-blue-700 dark:selection:bg-blue-600/30 dark:selection:text-blue-200 transition-colors"
    >
      {/* Top Header */}
      {/* Top Header with Integrated Navigation Tabs */}
      <Header
        config={config}
        onReset={handleResetConfig}
        onToggleTheme={handleToggleTheme}
        onLockSystem={handleLockSystem}
        lastLatency={lastLatency}
        lastStatus={lastStatus}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        historyCount={history.length}
        isProtected={isProtected}
        isUnlocked={isUnlocked}
        onLockNow={handleLockNow}
        onOpenPinModal={() => {
          setPendingTab(null);
          setPendingAction(null);
          setIsPinModalOpen(true);
        }}
      />

      {/* Main Full-Width Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Persistent Tab Views (Keeps state, ongoing chat, input, & attachments alive when switching tabs) */}
        <div className={activeTab === 'chat' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'hidden'}>
          <ChatTab
            config={config}
            initialPrompt={pendingPrompt}
            onClearInitialPrompt={() => setPendingPrompt('')}
            onAddHistory={handleAddHistory}
            onUpdateMetrics={(lat, st) => {
              setLastLatency(lat);
              setLastStatus(st);
            }}
            onConfigChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
            onNavigateTab={(tab) => handleTabClick(tab as any)}
            isUnlocked={isUnlocked}
            onRequestUnlock={requireUnlock}
          />
        </div>

        <div className={activeTab === 'raw' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'hidden'}>
          <RawJsonTab
            config={config}
            onAddHistory={handleAddHistory}
            onUpdateMetrics={(lat, st) => {
              setLastLatency(lat);
              setLastStatus(st);
            }}
          />
        </div>

        <div className={activeTab === 'presets' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'hidden'}>
          <PresetsTab config={config} onSelectPreset={handleSelectPreset} />
        </div>

        <div className={activeTab === 'history' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'hidden'}>
          <HistoryTab history={history} onClearHistory={handleClearHistory} />
        </div>

        <div className={activeTab === 'benchmark' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'hidden'}>
          <BenchmarkTab
            config={config}
            history={history}
            onAddHistory={handleAddHistory}
            onUpdateMetrics={(lat, st) => {
              setLastLatency(lat);
              setLastStatus(st);
            }}
          />
        </div>

        <div className={activeTab === 'settings' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'hidden'}>
          <SettingsTab
            config={config}
            onChange={setConfig}
            onReset={handleResetConfig}
            onLockNow={handleLockNow}
            onLockSystem={handleLockSystem}
          />
        </div>
      </div>

      {/* Security PIN Lock Modal */}
      <PinLockModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingTab(null);
          setPendingAction(null);
        }}
        onSuccess={handlePinSuccess}
      />
    </div>
  );
}

export default App;
