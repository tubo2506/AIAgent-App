import React, { useState, useMemo, useRef } from 'react';
import {
  Zap,
  Play,
  Activity,
  Clock,
  Hash,
  Check,
  BarChart3,
  TrendingUp,
  Award,
  Sparkles,
  Square,
} from './icons';
import type { ApiConfig, RequestHistoryItem } from '../types';
import {
  sendGeminiStreamingRequest,
  sendGeminiRequest,
  buildPayload,
  extractTokenUsage,
  extractResponseText,
} from '../services/geminiApi';
import { MarkdownRenderer } from './MarkdownRenderer';

interface BenchmarkTabProps {
  config: ApiConfig;
  history: RequestHistoryItem[];
  onUpdateMetrics: (latency: number, status: number) => void;
  onAddHistory: (item: RequestHistoryItem) => void;
}

interface BenchmarkResult {
  id: string;
  model: string;
  testName: string;
  prompt: string;
  response: string;
  latencyMs: number;
  ttftMs?: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  tokensPerSec: number;
  status: number;
  statusText: string;
  timestamp: string;
  error?: string;
}

const BENCHMARK_SUITES = [
  {
    id: 'speed_short',
    name: '⚡ Tốc độ phản hồi ngắn (Short Speed Test)',
    description: 'Kiểm tra TTFT (Time-To-First-Token) và độ trễ phản hồi tức thì với câu hỏi ngắn gọn.',
    prompt: 'Explain what artificial intelligence is in exactly 20 words.',
  },
  {
    id: 'reasoning',
    name: '🧠 Suy luận logic & Toán học (Reasoning Test)',
    description: 'Đánh giá khả năng tư duy từng bước và độ chính xác của logic.',
    prompt: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Explain step by step.',
  },
  {
    id: 'coding',
    name: '💻 Sinh mã nguồn TypeScript (Coding Test)',
    description: 'Đo lường throughput khi sinh khối code phức tạp có định dạng chuẩn.',
    prompt: 'Write a high-performance debounce function in TypeScript with cancel and flush methods, with detailed comments.',
  },
  {
    id: 'vietnamese_summary',
    name: '🇻🇳 Xử lý tiếng Việt (Vietnamese NLP)',
    description: 'Đo lường năng lực xử lý ngôn ngữ tiếng Việt và khả năng tóm tắt có cấu trúc.',
    prompt: 'Tóm tắt 4 lợi ích cốt lõi của công nghệ điện toán đám mây đối với doanh nghiệp vừa và nhỏ, trình bày thành 4 gạch đầu dòng rõ ràng.',
  },
];

const COMPARISON_MODELS = [
  { id: 'gemini-flash-lite-latest', name: 'gemini-flash-lite-latest (Siêu Tốc)' },
  { id: 'gemini-3.6-flash', name: 'gemini-3.6-flash (Mới Nhất / Suy Luận)' },
  { id: 'gemini-3.5-flash-lite', name: 'gemini-3.5-flash-lite' },
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash' },
];

export const BenchmarkTab: React.FC<BenchmarkTabProps> = ({
  config,
  history,
  onUpdateMetrics,
  onAddHistory,
}) => {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('speed_short');
  const [targetModel, setTargetModel] = useState<string>(config.model);
  const [isComparing, setIsComparing] = useState(false);
  const [compareModel, setCompareModel] = useState<string>('gemini-3.6-flash');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningSeconds, setRunningSeconds] = useState(0);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [comparisonResults, setComparisonResults] = useState<{
    modelA: BenchmarkResult | null;
    modelB: BenchmarkResult | null;
  }>({ modelA: null, modelB: null });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Active test suite
  const activeSuite = BENCHMARK_SUITES.find((s) => s.id === selectedSuiteId) || BENCHMARK_SUITES[0];
  const testPrompt = customPrompt.trim() || activeSuite.prompt;

  // Aggregate statistics from history
  const stats = useMemo(() => {
    const validHistory = history.filter((h) => h.status === 200 && h.latencyMs > 0);
    if (validHistory.length === 0) {
      return {
        totalRequests: history.length,
        avgLatency: 0,
        successRate: history.length > 0 ? Math.round((validHistory.length / history.length) * 100) : 100,
        avgTokensPerSec: 0,
        fastestLatency: 0,
        totalTokens: 0,
      };
    }

    const totalLatency = validHistory.reduce((sum, h) => sum + h.latencyMs, 0);
    const avgLatency = Math.round(totalLatency / validHistory.length);
    const fastestLatency = Math.min(...validHistory.map((h) => h.latencyMs));

    let totalGenTokens = 0;
    let totalGenDuration = 0;
    let allTokens = 0;

    validHistory.forEach((h) => {
      const tokens = extractTokenUsage(h.responseBody);
      if (tokens?.candidatesTokens) {
        totalGenTokens += tokens.candidatesTokens;
        totalGenDuration += h.latencyMs / 1000;
      }
      if (tokens?.totalTokens) {
        allTokens += tokens.totalTokens;
      }
    });

    const avgTokensPerSec =
      totalGenDuration > 0 ? Math.round((totalGenTokens / totalGenDuration) * 10) / 10 : 0;
    const successRate = Math.round((validHistory.length / history.length) * 100);

    return {
      totalRequests: history.length,
      avgLatency,
      successRate,
      avgTokensPerSec,
      fastestLatency,
      totalTokens: allTokens,
    };
  }, [history]);

  // Performance Tier calculation
  const performanceGrade = useMemo(() => {
    if (stats.avgLatency === 0) return { grade: 'N/A', label: 'Chưa có dữ liệu', color: 'text-slate-500' };
    if (stats.avgLatency < 1200 && stats.successRate >= 95) {
      return { grade: 'S-Tier', label: '⚡ Siêu Tốc (Phản Hồi Thời Gian Thực)', color: 'text-emerald-500' };
    }
    if (stats.avgLatency < 2500) {
      return { grade: 'A-Tier', label: '🚀 Tốc Độ Nhanh', color: 'text-blue-500' };
    }
    if (stats.avgLatency < 5000) {
      return { grade: 'B-Tier', label: 'Ổn Định (Phù Hợp Suy Luận)', color: 'text-amber-500' };
    }
    return { grade: 'C-Tier', label: 'Cần Tối Ưu Mạng/Model', color: 'text-rose-500' };
  }, [stats]);

  // Execute single test
  const executeSingleTest = async (modelName: string, promptText: string): Promise<BenchmarkResult> => {
    const testConfig: ApiConfig = { ...config, model: modelName };
    const contents = [{ role: 'user', parts: [{ text: promptText }] }];
    const payload = buildPayload(contents, testConfig);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = performance.now();
    let ttft: number | undefined;
    let accumulated = '';

    try {
      let response;
      if (testConfig.streaming) {
        response = await sendGeminiStreamingRequest(
          testConfig,
          payload,
          (fullText) => {
            if (ttft === undefined) {
              ttft = Math.round(performance.now() - startTime);
            }
            accumulated = fullText;
          },
          { signal: controller.signal, timeoutMs: 60000 }
        );
      } else {
        response = await sendGeminiRequest(testConfig, payload, {
          signal: controller.signal,
          timeoutMs: 60000,
        });
        accumulated = extractResponseText(response.data);
      }

      onUpdateMetrics(response.latencyMs, response.status);
      onAddHistory({
        id: 'bench_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        model: modelName,
        endpoint: `/models/${modelName}:benchmark`,
        status: response.status,
        statusText: response.statusText,
        latencyMs: response.latencyMs,
        requestBody: payload,
        responseBody: response.data || response.error,
        error: response.error,
        headers: response.headers,
      });

      const tokens = extractTokenUsage(response.data);
      const candidatesTokens = tokens?.candidatesTokens || Math.round(accumulated.length / 4);
      const promptTokens = tokens?.promptTokens || Math.round(promptText.length / 4);
      const totalTokens = tokens?.totalTokens || promptTokens + candidatesTokens;
      const seconds = response.latencyMs / 1000;
      const tokensPerSec = seconds > 0 ? Math.round((candidatesTokens / seconds) * 10) / 10 : 0;

      return {
        id: 'res_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        model: modelName,
        testName: activeSuite.name,
        prompt: promptText,
        response: accumulated || response.error || '',
        latencyMs: response.latencyMs,
        ttftMs: ttft,
        promptTokens,
        candidatesTokens,
        totalTokens,
        tokensPerSec,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toLocaleTimeString(),
        error: response.error,
      };
    } catch (err: any) {
      return {
        id: 'err_' + Date.now(),
        model: modelName,
        testName: activeSuite.name,
        prompt: promptText,
        response: '',
        latencyMs: Math.round(performance.now() - startTime),
        promptTokens: 0,
        candidatesTokens: 0,
        totalTokens: 0,
        tokensPerSec: 0,
        status: 0,
        statusText: 'Error',
        timestamp: new Date().toLocaleTimeString(),
        error: err?.message || 'Lỗi không xác định khi benchmark',
      };
    }
  };

  // Run benchmark handler
  const handleRunBenchmark = async () => {
    if (isRunning) return;

    if (!config.apiKey) {
      alert('Vui lòng nhập Google AI API Key trong thanh cấu hình bên trái trước khi chạy benchmark!');
      return;
    }

    setIsRunning(true);
    setRunningSeconds(0);
    const interval = setInterval(() => {
      setRunningSeconds((prev) => Math.round((prev + 0.1) * 10) / 10);
    }, 100);

    try {
      if (isComparing) {
        // Run Head-to-Head Comparison
        setComparisonResults({ modelA: null, modelB: null });

        // Model A
        const resA = await executeSingleTest(targetModel, testPrompt);
        setComparisonResults((prev) => ({ ...prev, modelA: resA }));

        // Model B
        const resB = await executeSingleTest(compareModel, testPrompt);
        setComparisonResults((prev) => ({ ...prev, modelB: resB }));

        setBenchmarkResults((prev) => [resB, resA, ...prev].slice(0, 20));
      } else {
        // Single Model Test
        const result = await executeSingleTest(targetModel, testPrompt);
        setBenchmarkResults((prev) => [result, ...prev].slice(0, 20));
      }
    } finally {
      clearInterval(interval);
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopBenchmark = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors">
      {/* Top Banner */}
      <div className="p-3 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Đánh Giá Hiệu Năng & Tốc Độ (Model Performance & Benchmark)
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Live Metrics
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đo lường thời gian phản hồi (Latency), Time to First Token (TTFT), Tốc độ sinh chữ (Tokens/giây) và so sánh trực diện giữa các phiên bản mô hình Gemini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                Điểm Hiệu Năng
              </span>
              <span className={`text-xl font-black ${performanceGrade.color}`}>
                {performanceGrade.grade}
              </span>
            </div>
            <div className="h-9 w-px bg-slate-200 dark:border-slate-800"></div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
              <Award className={`w-6 h-6 ${performanceGrade.color}`} />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {performanceGrade.label}
                </span>
                <span className="text-[10px] text-slate-500">
                  {stats.avgTokensPerSec > 0 ? `~${stats.avgTokensPerSec} tok/s` : 'Sẵn sàng kiểm thử'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Độ trễ trung bình</span>
              <Clock className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {stats.avgLatency > 0 ? stats.avgLatency : '--'}
              </span>
              <span className="text-xs font-mono text-slate-500">ms</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Nhanh nhất: {stats.fastestLatency > 0 ? `${stats.fastestLatency}ms` : '--'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Tốc độ sinh (Throughput)</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.avgTokensPerSec > 0 ? stats.avgTokensPerSec : '--'}
              </span>
              <span className="text-xs font-mono text-slate-500">tok/s</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Tokens sinh ra mỗi giây
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Tỉ lệ thành công</span>
              <Check className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {stats.successRate}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {stats.totalRequests} lượt gọi trong phiên
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Tổng Token tiêu thụ</span>
              <Hash className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {stats.totalTokens.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-500">tok</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Bao gồm Prompt + Candidates
            </span>
          </div>
        </div>

        {/* Benchmark Control Panel */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thiết Lập Bài Kiểm Thử Benchmark
              </h2>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isComparing}
                onChange={(e) => setIsComparing(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Chế độ đối đầu so sánh (2 Models song song)</span>
            </label>
          </div>

          {/* Suite selection buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            {BENCHMARK_SUITES.map((suite) => (
              <button
                key={suite.id}
                onClick={() => {
                  setSelectedSuiteId(suite.id);
                  setCustomPrompt('');
                }}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSuiteId === suite.id && !customPrompt
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="font-semibold text-xs block mb-1">{suite.name}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {suite.description}
                </span>
              </button>
            ))}
          </div>

          {/* Model selection & Prompt */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
            <div className={isComparing ? 'md:col-span-3' : 'md:col-span-4'}>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {isComparing ? 'Mô hình A:' : 'Mô hình kiểm thử:'}
              </label>
              <select
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {COMPARISON_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {isComparing && (
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mô hình B (Đối đầu):
                </label>
                <select
                  value={compareModel}
                  onChange={(e) => setCompareModel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {COMPARISON_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={isComparing ? 'md:col-span-6' : 'md:col-span-8'}>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Prompt kiểm thử (Có thể tùy chỉnh):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt || activeSuite.prompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Nhập câu hỏi test hiệu năng..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
                {isRunning ? (
                  <button
                    onClick={handleStopBenchmark}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer animate-pulse shrink-0"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Dừng ({runningSeconds.toFixed(1)}s)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRunBenchmark}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Chạy Benchmark</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Head-to-Head Comparison Card (If active) */}
        {isComparing && (comparisonResults.modelA || comparisonResults.modelB || isRunning) && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Kết Quả Đối Đầu Trực Tiếp
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Model A */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                    Mô hình A: {targetModel}
                  </span>
                  {comparisonResults.modelA?.latencyMs && (
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {comparisonResults.modelA.latencyMs}ms
                    </span>
                  )}
                </div>

                {comparisonResults.modelA ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200 dark:border-slate-800 text-center font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">TTFT</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {comparisonResults.modelA.ttftMs ? `${comparisonResults.modelA.ttftMs}ms` : '--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tốc độ</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {comparisonResults.modelA.tokensPerSec} tok/s
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tokens</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {comparisonResults.modelA.totalTokens}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto text-xs">
                      <MarkdownRenderer content={comparisonResults.modelA.response} />
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {isRunning ? 'Đang chạy kiểm thử mô hình A...' : 'Chờ chạy'}
                  </div>
                )}
              </div>

              {/* Model B */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-600 dark:text-purple-400">
                    Mô hình B: {compareModel}
                  </span>
                  {comparisonResults.modelB?.latencyMs && (
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {comparisonResults.modelB.latencyMs}ms
                    </span>
                  )}
                </div>

                {comparisonResults.modelB ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200 dark:border-slate-800 text-center font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">TTFT</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {comparisonResults.modelB.ttftMs ? `${comparisonResults.modelB.ttftMs}ms` : '--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tốc độ</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {comparisonResults.modelB.tokensPerSec} tok/s
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tokens</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {comparisonResults.modelB.totalTokens}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto text-xs">
                      <MarkdownRenderer content={comparisonResults.modelB.response} />
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {isRunning ? 'Chờ kiểm thử mô hình B...' : 'Chờ chạy'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Latency Timeline Bar Chart (Visualizing Recent Requests) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Biểu Đồ Độ Trễ Thời Gian Thực (Recent Latency Timeline)
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {history.slice(0, 15).length} requests gần nhất
            </span>
          </div>

          {history.length > 0 ? (
            <div className="pt-4">
              <div className="h-40 flex items-end gap-2 px-2 border-b border-slate-200 dark:border-slate-800">
                {history.slice(0, 15).reverse().map((item, idx) => {
                  const maxLatency = Math.max(...history.slice(0, 15).map((h) => h.latencyMs), 2000);
                  const heightPercent = Math.max(10, Math.min(100, Math.round((item.latencyMs / maxLatency) * 100)));
                  const isMedium = item.latencyMs >= 1500 && item.latencyMs < 4000;
                  const isSlow = item.latencyMs >= 4000 || item.status !== 200;

                  return (
                    <div
                      key={item.id || idx}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 pointer-events-none whitespace-nowrap min-w-[140px]">
                        <span className="font-bold text-cyan-400">{item.model}</span>
                        <span>Độ trễ: {item.latencyMs}ms</span>
                        <span>Thời gian: {item.timestamp}</span>
                        <span>Status: {item.status} ({item.statusText})</span>
                      </div>

                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 group-hover:opacity-80 ${
                          isSlow
                            ? 'bg-rose-500 dark:bg-rose-600'
                            : isMedium
                            ? 'bg-amber-400 dark:bg-amber-500'
                            : 'bg-emerald-500 dark:bg-emerald-600'
                        }`}
                      ></div>
                      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                        {item.latencyMs}m
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 px-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                    <span>&lt; 1.5s (Rất Nhanh)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span>
                    <span>1.5s - 4s (Trung Bình)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
                    <span>&gt; 4s / Lỗi</span>
                  </span>
                </div>
                <span>Trục ngang: thứ tự các request gần nhất →</span>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs">
              Chưa có dữ liệu gọi API. Hãy chạy benchmark hoặc chat thử ở tab Chat Playground!
            </div>
          )}
        </div>

        {/* Detailed Benchmark Runs History Table */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Chi Tiết Các Lần Benchmark Gần Đây
              </h2>
            </div>
            {benchmarkResults.length > 0 && (
              <button
                onClick={() => setBenchmarkResults([])}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Xóa kết quả
              </button>
            )}
          </div>

          {benchmarkResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2.5">Thời gian</th>
                    <th className="pb-2.5">Mô hình</th>
                    <th className="pb-2.5">Bài test</th>
                    <th className="pb-2.5">Độ trễ (Latency)</th>
                    <th className="pb-2.5">TTFT</th>
                    <th className="pb-2.5">Tốc độ (Tok/s)</th>
                    <th className="pb-2.5">Tokens (Prompt/Gen)</th>
                    <th className="pb-2.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {benchmarkResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 text-slate-500">{r.timestamp}</td>
                      <td className="py-2.5 font-bold text-blue-600 dark:text-blue-400">{r.model}</td>
                      <td className="py-2.5 font-sans truncate max-w-[140px] text-slate-700 dark:text-slate-300">
                        {r.testName}
                      </td>
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{r.latencyMs}ms</td>
                      <td className="py-2.5 text-slate-500">{r.ttftMs ? `${r.ttftMs}ms` : '--'}</td>
                      <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {r.tokensPerSec} tok/s
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {r.promptTokens} / {r.candidatesTokens} ({r.totalTokens})
                      </td>
                      <td className="py-2.5 font-sans">
                        {r.status === 200 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            200 OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                            {r.status} Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Chưa có bài test nào được chạy. Hãy nhấn "Chạy Benchmark" ở phía trên để bắt đầu!
            </div>
          )}
        </div>

        {/* Practical Optimization Recommendations */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
              Khuyến Nghị Thực Tế Dành Cho Ứng Dụng Của Bạn
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-indigo-100 dark:border-slate-800 space-y-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                ⚡ gemini-flash-lite-latest
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Tốc độ phản hồi tức thì (~800ms - 1.2s), không có độ trễ suy luận (Thinking delay). Phù hợp nhất cho Chatbot trực tiếp, OCR văn bản nhanh và UI tương tác.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-indigo-100 dark:border-slate-800 space-y-1">
              <span className="font-bold text-blue-600 dark:text-blue-400 block">
                🧠 gemini-3.6-flash
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Model thế hệ mới tích hợp khối suy luận sâu (Thinking). Độ trễ khởi đầu cao hơn một chút (3 - 6s với file lớn), nhưng xử lý logic phức tạp, coding và giải quyết tài liệu dài cực kỳ chuẩn xác.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-indigo-100 dark:border-slate-800 space-y-1">
              <span className="font-bold text-purple-600 dark:text-purple-400 block">
                🌐 Chế độ Gọi Trực Tiếp (Direct Mode)
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Tắt tùy chọn "Dùng Local Vite Proxy" trên thanh cấu hình bên trái để truyền thẳng qua HTTPS tới Google. Giảm thêm 200 - 400ms độ trễ và tránh nghẽn khi gửi file lớn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
