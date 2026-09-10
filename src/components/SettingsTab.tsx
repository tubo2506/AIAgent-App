import React, { useState } from 'react';
import {
  Key,
  Sliders,
  Eye,
  EyeOff,
  Terminal,
  Zap,
  RotateCcw,
  Check,
  Cpu,
  Activity,
  ExternalLink,
  Lock,
  ShieldAlert,
  Globe,
} from './icons';
import type { ApiConfig, AuthMode, ApiVersion } from '../types';
import { sendGeminiRequest, buildPayload } from '../services/geminiApi';
import { testTavilyConnection } from '../services/tavilyApi';
import {
  setSecurityPin,
  isPinProtectionEnabled,
  setPinProtectionEnabled,
  verifyPin,
  setSystemPasscode,
  isSystemLockEnabled,
  setSystemLockEnabled,
  verifySystemPasscode,
} from '../services/security';

interface SettingsTabProps {
  config: ApiConfig;
  onChange: (newConfig: ApiConfig) => void;
  onReset: () => void;
  onLockNow?: () => void;
  onLockSystem?: () => void;
}

const PRESET_MODELS = [
  {
    id: 'gemini-3.5-flash-lite',
    name: 'gemini-3.5-flash-lite',
    badge: '⭐ MẶC ĐỊNH - NHIỀU QUOTA NHẤT (3.5 Flash-Lite)',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300',
    desc: 'Mô hình mặc định được khuyên dùng nhất: Tiết kiệm tối đa hạn ngạch Free Tier mỗi ngày (RPM & RPD lớn nhất), hạn chế triệt để lỗi 429 và phản hồi siêu nhanh.',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'gemini-3.5-flash',
    badge: '⚡ CÂN BẰNG (3.5 Flash)',
    badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300',
    desc: 'Mô hình Gemini 3.5 Flash tốc độ cao, xử lý thông minh và phản hồi tức thì.',
  },
  {
    id: 'gemini-flash-lite-latest',
    name: 'gemini-flash-lite-latest',
    badge: '⚡ SIÊU TỐC (~1s)',
    badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300',
    desc: 'Tốc độ phản hồi tức thì, không bị trễ thinking. Lý tưởng cho chatbot và hỏi đáp thông thường.',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'gemini-3.6-flash',
    badge: '🧠 SUY LUẬN SÂU (Quota Thấp)',
    badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300',
    desc: 'Mô hình suy luận thế hệ mới nhất của Google. Tối ưu cho logic phức tạp nhưng giới hạn số request miễn phí mỗi ngày ít hơn.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    badge: '⚖️ Cân bằng',
    badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300',
    desc: 'Phiên bản Flash 2.5 tiêu chuẩn.',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    badge: '💎 Pro Cao Cấp',
    badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300',
    desc: 'Mô hình suy luận chuyên sâu cho các bài toán logic phức tạp.',
  },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  onChange,
  onReset,
  onLockNow,
  onLockSystem,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Tavily AI Search Test states
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [isTestingTavily, setIsTestingTavily] = useState(false);
  const [tavilyTestResult, setTavilyTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTestTavily = async () => {
    setIsTestingTavily(true);
    setTavilyTestResult(null);
    try {
      const res = await testTavilyConnection(config.tavilyApiKey || '');
      setTavilyTestResult(res);
    } catch (err: any) {
      setTavilyTestResult({ success: false, message: err.message || 'Lỗi kiểm tra kết nối Tavily' });
    } finally {
      setIsTestingTavily(false);
    }
  };

  // System Entry Lock states
  const [systemLockEnabled, setSystemLockEnabledState] = useState<boolean>(isSystemLockEnabled);
  const [oldPasscode, setOldPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeNotice, setPasscodeNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleToggleSystemLock = (enabled: boolean) => {
    if (!enabled) {
      const entered = window.prompt('Nhập mã khóa vào hệ thống hiện tại để xác nhận tắt cổng khóa:');
      if (!entered || !verifySystemPasscode(entered)) {
        alert('Mã khóa không chính xác! Không thể tắt cổng khóa vào hệ thống.');
        return;
      }
    }
    setSystemLockEnabled(enabled);
    setSystemLockEnabledState(enabled);
    setPasscodeNotice({
      type: 'success',
      message: enabled
        ? 'Đã bật cổng khóa bảo vệ khi vào hệ thống.'
        : 'Đã tắt cổng khóa khi vào hệ thống.',
    });
  };

  const handleChangeSystemPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeNotice(null);

    if (!verifySystemPasscode(oldPasscode)) {
      setPasscodeNotice({ type: 'error', message: 'Mã khóa hiện tại không chính xác!' });
      return;
    }

    if (newPasscode.trim().length < 4 || newPasscode.trim().length > 20) {
      setPasscodeNotice({ type: 'error', message: 'Mã khóa mới phải từ 4 đến 20 ký tự!' });
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeNotice({ type: 'error', message: 'Mã khóa mới và xác nhận mã không khớp!' });
      return;
    }

    if (setSystemPasscode(newPasscode)) {
      setPasscodeNotice({
        type: 'success',
        message: 'Đổi mã khóa vào hệ thống thành công! Vui lòng ghi nhớ mã mới này.',
      });
      setOldPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
    } else {
      setPasscodeNotice({ type: 'error', message: 'Không thể cập nhật mã khóa mới. Vui lòng thử lại!' });
    }
  };

  // Security PIN states
  const [pinEnabled, setPinEnabled] = useState<boolean>(isPinProtectionEnabled);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinNotice, setPinNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTogglePin = (enabled: boolean) => {
    if (!enabled) {
      const entered = window.prompt('Nhập mã PIN hiện tại để xác nhận tắt bảo vệ:');
      if (!entered || !verifyPin(entered)) {
        alert('Mã PIN không chính xác! Không thể tắt tính năng bảo vệ.');
        return;
      }
    }
    setPinProtectionEnabled(enabled);
    setPinEnabled(enabled);
    setPinNotice({
      type: 'success',
      message: enabled
        ? 'Đã bật bảo vệ cấu hình và thông số Agent bằng mã PIN.'
        : 'Đã tắt tính năng bảo vệ bằng mã PIN.',
    });
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinNotice(null);

    if (!verifyPin(oldPin)) {
      setPinNotice({ type: 'error', message: 'Mã PIN hiện tại không chính xác!' });
      return;
    }

    if (newPin.trim().length < 4 || newPin.trim().length > 8) {
      setPinNotice({ type: 'error', message: 'Mã PIN mới phải từ 4 đến 8 chữ số!' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinNotice({ type: 'error', message: 'Mã PIN mới và xác nhận mã PIN không khớp!' });
      return;
    }

    if (setSecurityPin(newPin)) {
      setPinNotice({
        type: 'success',
        message: 'Đổi mã PIN thành công! Vui lòng ghi nhớ mã PIN mới này.',
      });
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinNotice({ type: 'error', message: 'Không thể cập nhật mã PIN mới. Vui lòng thử lại!' });
    }
  };

  const [isCustomModel, setIsCustomModel] = useState(
    !PRESET_MODELS.some((m) => m.id === config.model)
  );

  const update = (patch: Partial<ApiConfig>) => {
    onChange({ ...config, ...patch });
  };

  const handleTestConnection = async () => {
    if (!config.apiKey.trim()) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập Google AI API Key trước khi kiểm tra!',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const testPayload = buildPayload(
      [
        {
          role: 'user',
          parts: [{ text: 'Ping test. Reply with: OK' }],
        },
      ],
      config
    );

    try {
      const res = await sendGeminiRequest(config, testPayload, { timeoutMs: 15000 });
      if (res.success) {
        setTestResult({
          success: true,
          message: `Kết nối thành công! Phản hồi từ Google AI trong ${res.latencyMs}ms.`,
          latencyMs: res.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: `Thất bại (HTTP ${res.status}): ${res.error || res.statusText}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Lỗi kết nối mạng: ${err.message || 'Không thể gửi request'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 md:p-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                ⚙️
              </span>
              <span>Cài Đặt & Cấu Hình Google AI API</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tùy chỉnh khóa API, chọn mô hình mặc định, cấu hình đường truyền trực tiếp và tinh chỉnh tham số suy luận
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition-all disabled:opacity-50"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối API'}</span>
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>
          </div>
        </div>

        {/* Live Test Result Banner */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{testResult.success ? '✅' : '❌'}</span>
              <span className="font-medium">{testResult.message}</span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2x2 Grid of Configuration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1: API Key & Authentication */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Khóa Google AI API Key
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Xác thực truy cập dịch vụ Gemini
                  </span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                Bảo mật tại máy
              </span>
            </div>

            {/* Input API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value.trim() })}
                  placeholder="Nhập khóa Gemini API (AIzaSy...)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Khóa được lưu cục bộ trong trình duyệt của bạn và gửi trực tiếp đến Google API.
              </p>
            </div>

            {/* Auth Mode & Version */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phương thức truyền Key
                </label>
                <select
                  value={config.authMode}
                  onChange={(e) => update({ authMode: e.target.value as AuthMode })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="header">Header: X-goog-api-Key (Khuyên dùng)</option>
                  <option value="query">URL Query: ?key=</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phiên bản API
                </label>
                <select
                  value={config.apiVersion}
                  onChange={(e) => update({ apiVersion: e.target.value as ApiVersion })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="v1beta">v1beta (Mới nhất, đầy đủ tính năng)</option>
                  <option value="v1">v1 (Bản ổn định cũ)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-blue-600 dark:text-blue-400">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1 font-medium"
              >
                <span>Chưa có API Key? Lấy khóa miễn phí tại Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* CARD 2: Performance & Network Mode */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Tốc Độ & Đường Truyền Mạng
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tối ưu độ trễ và luồng dữ liệu
                  </span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                Tối ưu phản hồi
              </span>
            </div>

            {/* Direct vs Proxy Mode Option Cards */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chế độ kết nối:
              </label>
              {(() => {
                const isLocalhost =
                  typeof window !== 'undefined' &&
                  (window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '0.0.0.0');

                return (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => update({ useProxy: false })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        !config.useProxy || !isLocalhost
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Gọi Trực Tiếp Google
                          </span>
                          {(!config.useProxy || !isLocalhost) && (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          Khuyên Dùng • Tốc Độ Cao
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                          Gọi thẳng tới Google API qua CORS, kết nối trực tiếp không qua trung gian.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={!isLocalhost}
                      onClick={() => isLocalhost && update({ useProxy: true })}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isLocalhost
                          ? config.useProxy
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 cursor-pointer'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer'
                          : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Local Vite Proxy
                          </span>
                          {isLocalhost && config.useProxy && (
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                          {isLocalhost ? 'Bypass Mạng Local' : 'Chỉ dùng cho Localhost'}
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                          {isLocalhost
                            ? 'Chuyển tiếp qua máy chủ Vite nội bộ khi phát triển trên máy tính.'
                            : 'Trên bản Web đám mây, hệ thống tự động kết nối trực tiếp đến Google API.'}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Streaming SSE Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.streaming}
                  onChange={(e) => update({ streaming: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Bật Streaming SSE (Sinh từ tức thì)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold">
                      HOT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Mô hình sinh chữ liên tục theo thời gian thực (tương tự ChatGPT), loại bỏ cảm giác chờ đợi.
                  </p>
                </div>
              </label>

              {/* Web Search Grounding Toggle & Provider Config */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableSearchGrounding ?? false}
                    onChange={(e) => update({ enableSearchGrounding: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Tra Cứu Web Thời Gian Thực (Cập nhật Luật & Tin tức Mới Nhất)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                        LIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Tự động tra cứu dữ liệu mới nhất trên Internet năm 2024 - 2026 (nghị định mới, hóa đơn điện tử, sự kiện) để AI trả lời chính xác.
                    </p>
                  </div>
                </label>

                {/* Sub-config: Choose Search Provider */}
                {(config.enableSearchGrounding ?? false) && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-3 pl-6">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                        Chọn nguồn tra cứu Web:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Option 1: Tavily AI Search */}
                        <div
                          onClick={() => update({ searchProvider: 'tavily' })}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            (config.searchProvider || 'tavily') === 'tavily'
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              🌐 Tavily AI Search
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700">
                              Khuyên dùng (Free)
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                            1.000 lượt miễn phí/tháng, <strong>KHÔNG CẦN THẺ NGÂN HÀNG</strong>. Tối ưu riêng cho AI.
                          </p>
                        </div>

                        {/* Option 2: Google Search Grounding */}
                        <div
                          onClick={() => update({ searchProvider: 'google' })}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            config.searchProvider === 'google'
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              🔍 Google Search
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700">
                              Cần Billing
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                            Native Google Grounding. Yêu cầu Google Cloud Project đã liên kết thẻ Visa/Mastercard.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* If Tavily is selected: Tavily API Key input & test */}
                    {(config.searchProvider || 'tavily') === 'tavily' && (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Key className="w-3.5 h-3.5 text-blue-600" />
                            Tavily API Key (tvly-...)
                          </label>
                          <a
                            href="https://tavily.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>Lấy key miễn phí (30s)</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showTavilyKey ? 'text' : 'password'}
                              value={config.tavilyApiKey || ''}
                              onChange={(e) => update({ tavilyApiKey: e.target.value })}
                              placeholder="tvly-xxxxxxxxxxxxxxxxxxxx"
                              className="w-full px-3 py-1.5 pr-8 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowTavilyKey(!showTavilyKey)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showTavilyKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={isTestingTavily || !config.tavilyApiKey?.trim()}
                            onClick={handleTestTavily}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                          >
                            {isTestingTavily ? 'Đang thử...' : 'Kiểm tra'}
                          </button>
                        </div>

                        {/* Test result message */}
                        {tavilyTestResult && (
                          <div
                            className={`p-2 rounded-lg text-xs font-medium ${
                              tavilyTestResult.success
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                            }`}
                          >
                            {tavilyTestResult.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: Default AI Model Selector */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Lựa Chọn Mô Hình Mặc Định (AI Models)
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mô hình sẽ được sử dụng cho Chat và các cuộc kiểm thử API
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {config.model}
              </span>
            </div>

            {/* Model Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRESET_MODELS.map((m) => {
                const isSelected = !isCustomModel && config.model === m.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setIsCustomModel(false);
                      update({ model: m.id });
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {m.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border inline-block mb-1.5 ${m.badgeColor}`}
                      >
                        {m.badge}
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {m.desc}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Custom Model Card */}
              <button
                type="button"
                onClick={() => setIsCustomModel(true)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isCustomModel
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Tùy Chỉnh Model Khác
                    </span>
                    {isCustomModel && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 inline-block mb-1.5">
                    ⚙️ Custom ID
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Nhập trực tiếp mã model riêng của bạn (Fine-tuned hoặc bản thử nghiệm).
                  </p>
                </div>
              </button>
            </div>

            {isCustomModel && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nhập mã model:
                </label>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => update({ model: e.target.value.trim() })}
                  placeholder="VD: gemini-3.6-flash hoặc tên model tùy chỉnh..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-blue-400 dark:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* CARD 4: Hyperparameters & System Instruction */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Tham Số Sinh Nội Dung & System Instruction
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kiểm soát tính ngẫu nhiên, độ sáng tạo và hướng dẫn hệ thống
                  </span>
                </div>
              </div>
            </div>

            {/* Temperature Slider */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Nhiệt độ (Temperature): <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{config.temperature}</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {config.temperature <= 0.2
                    ? '🎯 Chính xác, Tất định (Tối ưu cho Code / Toán học / Bóc tách số liệu)'
                    : config.temperature <= 0.7
                    ? '⚖️ Cân bằng tự nhiên (Thích hợp cho hỏi đáp hàng ngày)'
                    : '✨ Sáng tạo cao (Dành cho viết văn / Brainstorm ý tưởng)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.temperature}
                onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* TopP, TopK, MaxTokens, BaseURL */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Top-P (Nucleus Sampling)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.topP}
                  onChange={(e) => update({ topP: parseFloat(e.target.value) || 0.95 })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Top-K
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.topK}
                  onChange={(e) => update({ topK: parseInt(e.target.value) || 40 })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  min="64"
                  max="32768"
                  step="256"
                  value={config.maxOutputTokens}
                  onChange={(e) => update({ maxOutputTokens: parseInt(e.target.value) || 2048 })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Custom Base URL
                </label>
                <input
                  type="text"
                  value={config.customBaseUrl}
                  onChange={(e) => update({ customBaseUrl: e.target.value.trim() })}
                  placeholder="https://generativelanguage.googleapis.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Default System Instruction */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>System Instruction Mặc Định (Chỉ thị hệ thống)</span>
                </label>
                {config.systemInstruction && (
                  <button
                    type="button"
                    onClick={() => update({ systemInstruction: '' })}
                    className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                  >
                    Xóa chỉ thị
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={config.systemInstruction}
                onChange={(e) => update({ systemInstruction: e.target.value })}
                placeholder="VD: Bạn là một trợ lý AI thông minh, nhiệt tình, trả lời bằng tiếng Việt tự nhiên và luôn giải thích từng bước rõ ràng..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed font-mono resize-y"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lưu ý: Khi bạn chọn một Agent chuyên biệt trong tab Chat Studio, System Instruction của Agent đó sẽ tự động được ưu tiên áp dụng.
              </p>
            </div>
          </div>
        </div>

        {/* KHỐI 5: BẢO MẬT & MÃ KHÓA HỆ THỐNG */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Bảo Mật: Mã Khóa Vào Hệ Thống & Mã PIN Cấu Hình</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kiểm soát cổng vào toàn bộ ứng dụng và bảo vệ các thông số nhạy cảm của Agent
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onLockNow && pinEnabled && (
                <button
                  type="button"
                  onClick={onLockNow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors cursor-pointer"
                  title="Khóa lại cấu hình và quay về Chat Studio"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khóa Cấu Hình</span>
                </button>
              )}

              {onLockSystem && (
                <button
                  type="button"
                  onClick={onLockSystem}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
                  title="Khóa toàn bộ hệ thống và trở về màn hình nhập mã khóa cổng vào"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Khóa Toàn Hệ Thống</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-5 space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* PHẦN 1: CỔNG KHÓA VÀO HỆ THỐNG */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                    <span>Cổng Khóa Vào Hệ Thống (System Access Gatekeeper)</span>
                    {systemLockEnabled ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                        Đang bật
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        Đã tắt
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Yêu cầu nhập mã khóa trước khi mở quyền sử dụng bất kỳ tính năng nào trên trang web.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSystemLock(!systemLockEnabled)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border ${
                    systemLockEnabled
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent'
                  }`}
                >
                  {systemLockEnabled ? 'Tắt Khóa Cổng' : 'Bật Khóa Cổng'}
                </button>
              </div>

              {passcodeNotice && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    passcodeNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {passcodeNotice.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span className="font-medium">{passcodeNotice.message}</span>
                </div>
              )}

              <form onSubmit={handleChangeSystemPasscode} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Đổi mã khóa vào hệ thống</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Mã mặc định ban đầu: <strong className="font-mono text-blue-600 dark:text-blue-400">123456</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Mã khóa hiện tại
                    </label>
                    <input
                      type="password"
                      value={oldPasscode}
                      onChange={(e) => setOldPasscode(e.target.value)}
                      placeholder="VD: 123456"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Mã khóa mới
                    </label>
                    <input
                      type="password"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="Tối thiểu 4 ký tự"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Xác nhận mã khóa mới
                    </label>
                    <input
                      type="password"
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="Nhập lại mã mới"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    Lưu Mã Khóa Vào Hệ Thống
                  </button>
                </div>
              </form>
            </div>

            {/* PHẦN 2: MÃ PIN BẢO VỆ CẤU HÌNH & THÔNG SỐ AGENT */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                    <span>Mã PIN Bảo Vệ Cấu Hình & Thông Số Agent</span>
                    {pinEnabled ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                        Đang bật
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        Đã tắt
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Bảo vệ API Key, System Instructions, cấu hình tham số và quyền tạo/sửa/xóa Agent. <strong>Tab Chat Studio luôn mở tự do để mọi người trò chuyện.</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePin(!pinEnabled)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border ${
                    pinEnabled
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent'
                  }`}
                >
                  {pinEnabled ? 'Tắt Bảo Vệ PIN' : 'Bật Bảo Vệ PIN'}
                </button>
              </div>

              {pinNotice && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    pinNotice.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {pinNotice.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span className="font-medium">{pinNotice.message}</span>
                </div>
              )}

              <form onSubmit={handleChangePin} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Đổi mã PIN bảo vệ cài đặt</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Mã mặc định ban đầu: <strong className="font-mono text-amber-600 dark:text-amber-400">1234</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Mã PIN hiện tại
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="VD: 1234"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Mã PIN mới (4 - 8 số)
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Nhập 4-8 số"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Xác nhận mã PIN mới
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Nhập lại mã mới"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    Lưu Mã PIN Cấu Hình
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
