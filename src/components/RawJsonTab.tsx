import React, { useState, useRef } from 'react';
import {
  Send,
  Code2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  AlertTriangle,
  Paperclip,
} from './icons';
import type { ApiConfig, RequestHistoryItem } from '../types';
import {
  sendGeminiRequest,
  generateCurlCommand,
  buildEndpointUrl,
} from '../services/geminiApi';

interface RawJsonTabProps {
  config: ApiConfig;
  onAddHistory: (item: RequestHistoryItem) => void;
  onUpdateMetrics: (latency: number, status: number) => void;
}

const DEFAULT_JSON = JSON.stringify(
  {
    contents: [
      {
        parts: [
          {
            text: 'Explain how AI works in a few words',
          },
        ],
      },
    ],
  },
  null,
  2
);

export const RawJsonTab: React.FC<RawJsonTabProps> = ({
  config,
  onAddHistory,
  onUpdateMetrics,
}) => {
  const [requestJson, setRequestJson] = useState(DEFAULT_JSON);
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [rawTextOutput, setRawTextOutput] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseStatusText, setResponseStatusText] = useState<string>('');
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers'>('body');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const rawFileInputRef = useRef<HTMLInputElement>(null);

  // Validate JSON on change
  const handleJsonChange = (val: string) => {
    setRequestJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const handleInsertFileBase64 = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1] || '';
      const mimeType = file.type || 'image/png';

      const multimodalPayload = {
        contents: [
          {
            parts: [
              {
                text: `Hãy OCR và phân tích chi tiết tài liệu ${file.name}:`,
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      };

      setRequestJson(JSON.stringify(multimodalPayload, null, 2));
      setJsonError(null);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBeautify = () => {
    try {
      const parsed = JSON.parse(requestJson);
      setRequestJson(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError('JSON không hợp lệ: ' + e.message);
    }
  };

  const handleSend = async () => {
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(requestJson);
    } catch (e: any) {
      alert('Payload JSON không hợp lệ! Vui lòng kiểm tra lại syntax.');
      return;
    }

    if (!config.apiKey) {
      alert('Vui lòng nhập API Key ở thanh cấu hình bên trái!');
      return;
    }

    setIsLoading(true);
    setResponseOutput(null);
    setRawTextOutput('');
    setResponseStatus(null);
    setLatency(null);

    try {
      const res = await sendGeminiRequest(config, parsedBody);
      setResponseStatus(res.status);
      setResponseStatusText(res.statusText);
      setLatency(res.latencyMs);
      setResponseHeaders(res.headers);
      setResponseOutput(res.data || res.error);
      setRawTextOutput(res.rawResponse || JSON.stringify(res.data || res.error, null, 2));

      onUpdateMetrics(res.latencyMs, res.status);

      onAddHistory({
        id: 'raw_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        model: config.model,
        endpoint: `/models/${config.model}:generateContent`,
        status: res.status,
        statusText: res.statusText,
        latencyMs: res.latencyMs,
        requestBody: parsedBody,
        responseBody: res.data || res.error,
        error: res.error,
        headers: res.headers,
      });
    } catch (err: any) {
      setResponseStatus(0);
      setResponseStatusText('Client Error');
      setResponseOutput({ error: err?.message });
      setRawTextOutput(JSON.stringify({ error: err?.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate dynamic curl based on current JSON
  let currentCurl = '';
  try {
    const parsed = JSON.parse(requestJson);
    currentCurl = generateCurlCommand(config, parsed);
  } catch {
    currentCurl = `# JSON cú pháp chưa đúng:\ncurl "${buildEndpointUrl(config)}" ...`;
  }

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(currentCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = () => {
    if (!rawTextOutput) return;
    navigator.clipboard.writeText(rawTextOutput);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      {/* Top Banner with cURL preview */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-2 sm:p-3 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="truncate">Lệnh cURL Tương Đương</span>
          </div>
          <button
            onClick={handleCopyCurl}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer shrink-0"
          >
            {copiedCurl ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Sao chép cURL</span>
              </>
            )}
          </button>
        </div>
        <pre className="text-[11px] font-mono text-cyan-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 overflow-x-auto max-h-24 select-all shadow-inner">
          <code>{currentCurl}</code>
        </pre>
      </div>

      {/* Main split view: Request on left, Response on right */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 overflow-y-auto lg:overflow-hidden">
        {/* Request Panel */}
        <div className="bg-white dark:bg-slate-950 flex flex-col min-h-[380px] lg:h-full overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Request Body (JSON)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={rawFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleInsertFileBase64}
                className="hidden"
              />
              <button
                onClick={() => rawFileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                title="Chọn ảnh hoặc file PDF để tự động tạo payload Base64 kiểm thử OCR"
              >
                <Paperclip className="w-3 h-3" />
                <span>Chèn File Base64</span>
              </button>
              <button
                onClick={handleBeautify}
                className="px-2 py-1 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                title="Format lại JSON đẹp mắt"
              >
                Format JSON
              </button>
              <button
                onClick={() => handleJsonChange(DEFAULT_JSON)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                title="Đặt lại JSON mẫu ban đầu"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Mẫu gốc</span>
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 relative flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
            <textarea
              value={requestJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              spellCheck={false}
              className={`w-full flex-1 bg-white dark:bg-slate-900/50 border rounded-lg p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none resize-none leading-relaxed shadow-xs ${
                jsonError
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-300 dark:border-slate-800 focus:border-blue-500'
              }`}
            />
            {jsonError && (
              <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{jsonError}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Target: <code className="text-blue-600 dark:text-blue-400 font-mono">POST /{config.apiVersion}/models/{config.model}:generateContent</code>
            </span>
            <button
              onClick={handleSend}
              disabled={isLoading || !!jsonError}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-medium text-xs shadow-sm transition cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi Request</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Response Panel */}
        <div className="bg-white dark:bg-slate-950 flex flex-col min-h-[380px] lg:h-full overflow-hidden">
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Phản Hồi (Response)</span>
              {responseStatus !== null && (
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    responseStatus >= 200 && responseStatus < 300
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                  }`}
                >
                  {responseStatus} {responseStatusText}
                </span>
              )}
              {latency !== null && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  {latency}ms
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveResponseTab('body')}
                className={`px-2.5 py-1 text-xs rounded transition cursor-pointer ${
                  activeResponseTab === 'body'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-xs border border-slate-200 dark:border-transparent'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Body
              </button>
              <button
                onClick={() => setActiveResponseTab('headers')}
                className={`px-2.5 py-1 text-xs rounded transition cursor-pointer ${
                  activeResponseTab === 'headers'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-xs border border-slate-200 dark:border-transparent'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Headers ({Object.keys(responseHeaders).length})
              </button>
              {rawTextOutput && (
                <button
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1 ml-2 px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                  title="Sao chép kết quả"
                >
                  {copiedResponse ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>Chép</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 p-3 overflow-auto min-h-0 bg-slate-50 dark:bg-slate-950">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-xs">Đang chờ phản hồi từ Google Generative AI...</p>
              </div>
            ) : responseOutput ? (
              activeResponseTab === 'body' ? (
                <pre className="h-full text-xs font-mono text-slate-800 dark:text-slate-200 p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800/80 overflow-auto whitespace-pre-wrap leading-relaxed shadow-xs">
                  <code>{JSON.stringify(responseOutput, null, 2)}</code>
                </pre>
              ) : (
                <div className="h-full p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800/80 overflow-auto space-y-1.5 font-mono text-xs shadow-xs">
                  {Object.entries(responseHeaders).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-blue-600 dark:text-cyan-400 font-semibold">{k}:</span>
                      <span className="text-slate-700 dark:text-slate-300 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                <Code2 className="w-8 h-8 opacity-40" />
                <p className="text-xs">Bấm "Gửi Request" để kiểm thử API và nhận kết quả tại đây.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
