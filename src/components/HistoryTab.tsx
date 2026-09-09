import React, { useState } from 'react';
import {
  History,
  Trash2,
  Download,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from './icons';
import type { RequestHistoryItem } from '../types';

interface HistoryTabProps {
  history: RequestHistoryItem[];
  onClearHistory: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ history, onClearHistory }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-api-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Nhật Ký Gọi API (Request History)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đã ghi nhận {history.length} lần gửi yêu cầu trong phiên làm việc này.
            </p>
          </div>

          {history.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất JSON</span>
              </button>
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa lịch sử</span>
              </button>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 space-y-2 shadow-xs">
            <History className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-medium">Chưa có request nào được thực hiện.</p>
            <p className="text-xs text-slate-400 dark:text-slate-600">
              Các request từ tab Chat hoặc Raw JSON sẽ tự động được ghi lại tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const isSuccess = item.status >= 200 && item.status < 300;
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden transition shadow-xs"
                >
                  {/* Item Header */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                      )}
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                        }`}
                      >
                        {item.status || 'ERR'}
                      </span>
                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold">
                        POST {item.endpoint}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        {item.latencyMs}ms
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-400 dark:text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {item.timestamp}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/80 space-y-4">
                      {item.error && (
                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs">
                          <span className="font-bold">Lỗi: </span>
                          <span>{item.error}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Request */}
                        <div>
                          <div className="flex items-center justify-between mb-1 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                            <span>Request Payload</span>
                            <button
                              onClick={() =>
                                handleCopy(
                                  `req_${item.id}`,
                                  JSON.stringify(item.requestBody, null, 2)
                                )
                              }
                              className="hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === `req_${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Chép</span>
                            </button>
                          </div>
                          <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto max-h-52 shadow-xs">
                            <code>{JSON.stringify(item.requestBody, null, 2)}</code>
                          </pre>
                        </div>

                        {/* Response */}
                        <div>
                          <div className="flex items-center justify-between mb-1 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                            <span>Response Payload</span>
                            <button
                              onClick={() =>
                                handleCopy(
                                  `res_${item.id}`,
                                  JSON.stringify(item.responseBody, null, 2)
                                )
                              }
                              className="hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === `res_${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Chép</span>
                            </button>
                          </div>
                          <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto max-h-52 shadow-xs">
                            <code>{JSON.stringify(item.responseBody, null, 2)}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
