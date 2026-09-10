import React, { useState } from 'react';
import {
  Key,
  Sliders,
  Eye,
  EyeOff,
  Terminal,
  Info,
  Server,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from './icons';
import type { ApiConfig, AuthMode, ApiVersion } from '../types';

interface SidebarConfigProps {
  config: ApiConfig;
  onChange: (newConfig: ApiConfig) => void;
}

const PRESET_MODELS = [
  { id: 'gemini-flash-lite-latest', name: 'gemini-flash-lite-latest', note: '⚡ SIÊU NHANH (~1s, Trả lời tức thì)' },
  { id: 'gemini-3.5-flash-lite', name: 'gemini-3.5-flash-lite', note: '⚡ Bản 3.5 Lite (Tốc độ cao)' },
  { id: 'gemini-3.6-flash', name: 'gemini-3.6-flash', note: 'Model chuẩn mới nhất (Suy luận sâu)' },
  { id: 'gemini-3-flash', name: 'gemini-3-flash', note: 'Tên model trong cURL của bạn' },
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash', note: 'Bản 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'gemini-2.5-pro', note: 'Bản 2.5 Pro cao cấp' },
];

export const SidebarConfig: React.FC<SidebarConfigProps> = ({ config, onChange }) => {
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(
    !PRESET_MODELS.some((m) => m.id === config.model)
  );

  const update = (patch: Partial<ApiConfig>) => {
    onChange({ ...config, ...patch });
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomModel(true);
    } else {
      setIsCustomModel(false);
      update({ model: val });
    }
  };

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col gap-5 overflow-y-auto shrink-0 h-[calc(100vh-61px)] transition-colors">
      {/* Tối ưu Tốc Độ Nhanh (Fast Mode / Streaming) */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Tối Ưu Tốc Độ Phản Hồi</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">
            HOT
          </span>
        </div>
        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/70 leading-relaxed">
          Bật Streaming để chữ xuất hiện ngay tức thì (tương tự ChatGPT/Gemini) và dùng model Flash-Lite để loại bỏ độ trễ!
        </p>

        <div className="space-y-1.5 pt-1">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={config.streaming}
              onChange={(e) => update({ streaming: e.target.checked })}
              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
            />
            <span>Bật Streaming SSE (Sinh từ tức thì)</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableSearchGrounding ?? true}
              onChange={(e) => update({ enableSearchGrounding: e.target.checked })}
              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
            />
            <span>🌐 Tra cứu Web ({config.searchProvider === 'google' ? 'Google' : 'Tavily'})</span>
          </label>

          {config.model !== 'gemini-flash-lite-latest' && (
            <button
              onClick={() => update({ model: 'gemini-flash-lite-latest' })}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-semibold rounded bg-amber-500/20 hover:bg-amber-500 text-amber-900 hover:text-white dark:text-amber-200 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Chuyển sang Flash-Lite (~1s)</span>
            </button>
          )}
        </div>
      </div>

      {/* Cấu hình Xác thực API Key */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Google AI API Key</span>
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="Nhập API Key (X-goog-api-Key)..."
            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={showKey ? 'Ẩn khóa' : 'Hiện khóa'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className={config.apiKey ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
            {config.apiKey ? '● Đã nạp khóa' : '○ Chưa có khóa'}
          </span>
          <span className="font-mono text-[10px] opacity-70">
            {config.apiKey ? `${config.apiKey.slice(0, 5)}...${config.apiKey.slice(-4)}` : ''}
          </span>
        </p>
      </div>

      {/* Lựa chọn Model */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Mô hình (Model)</span>
        </label>
        <select
          value={isCustomModel ? '__custom__' : config.model}
          onChange={handleModelSelect}
          className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
        >
          {PRESET_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.note}
            </option>
          ))}
          <option value="__custom__">-- Tùy chỉnh model khác --</option>
        </select>

        {isCustomModel && (
          <input
            type="text"
            value={config.model}
            onChange={(e) => update({ model: e.target.value.trim() })}
            placeholder="Nhập mã model (VD: gemini-flash-lite-latest)..."
            className="w-full mt-1 bg-slate-50 dark:bg-slate-950/80 border border-indigo-400 dark:border-indigo-500/60 rounded-lg px-3 py-1.5 text-xs font-mono text-indigo-700 dark:text-indigo-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        )}
      </div>

      {/* Chế độ gửi & Proxy */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Kết nối & Đường truyền</span>
        </label>

        {/* Local Proxy Toggle */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer">
          <input
            type="checkbox"
            checked={config.useProxy}
            onChange={(e) => update({ useProxy: e.target.checked })}
            className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
          />
          <div className="text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Dùng Local Vite Proxy</span>
              {!config.useProxy && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                  Khuyên dùng
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
              {config.useProxy
                ? 'Đang chuyển tiếp qua máy chủ nội bộ Vite. Nếu gặp độ trễ khi tải file PDF lớn, bạn nên tắt tùy chọn này để stream trực tiếp.'
                : 'Đang gọi trực tiếp đến Google API (Tốc độ tối đa, không qua trung gian Node proxy).'}
            </span>
          </div>
        </label>

        {/* Auth Mode & Version */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Phương thức Auth:</span>
            <select
              value={config.authMode}
              onChange={(e) => update({ authMode: e.target.value as AuthMode })}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="header">Header X-goog-api-Key</option>
              <option value="query">Query (?key=)</option>
            </select>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">API Version:</span>
            <select
              value={config.apiVersion}
              onChange={(e) => update({ apiVersion: e.target.value as ApiVersion })}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="v1beta">v1beta</option>
              <option value="v1">v1</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tham số sinh nội dung (Hyperparameters) */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Tham số mô hình</span>
          </span>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-0.5 cursor-pointer"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </label>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
            <span>Temperature:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{config.temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={config.temperature}
            onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-emerald-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Chính xác (0.0)</span>
            <span>Sáng tạo (2.0)</span>
          </div>
        </div>

        {/* Top-P */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
            <span>Top-P:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{config.topP.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.topP}
            onChange={(e) => update({ topP: parseFloat(e.target.value) })}
            className="w-full accent-emerald-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {showAdvanced && (
          <>
            {/* Top-K */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                <span>Top-K:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{config.topK}</span>
              </div>
              <input
                type="number"
                min="1"
                max="100"
                value={config.topK}
                onChange={(e) => update({ topK: parseInt(e.target.value) || 40 })}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                <span>Max Output Tokens:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{config.maxOutputTokens}</span>
              </div>
              <input
                type="number"
                min="64"
                max="32768"
                step="256"
                value={config.maxOutputTokens}
                onChange={(e) => update({ maxOutputTokens: parseInt(e.target.value) || 2048 })}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Custom Base URL */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Custom Base URL:</span>
              <input
                type="text"
                value={config.customBaseUrl}
                onChange={(e) => update({ customBaseUrl: e.target.value })}
                placeholder="https://generativelanguage.googleapis.com"
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
          </>
        )}
      </div>

      {/* System Instruction */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>System Instruction</span>
        </label>
        <textarea
          value={config.systemInstruction}
          onChange={(e) => update({ systemInstruction: e.target.value })}
          rows={3}
          placeholder="Ví dụ: Bạn là trợ lý trả lời ngắn gọn, súc tích và chính xác..."
          className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-purple-500 resize-none transition-colors"
        />
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Tự động lưu cấu hình vào trình duyệt.</span>
        </div>
      </div>
    </aside>
  );
};
