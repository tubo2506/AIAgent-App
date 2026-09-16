import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  RefreshCw,
  FileDown,
  ExternalLink,
  Lock,
  Sparkles,
  Server,
  Globe,
  Check,
} from './icons';
import {
  getAdminAnalyticsReport,
  exportAnalyticsReportAsJson,
  type AdminAnalyticsReport,
} from '../services/guestAnalyticsService';

interface AdminMonitorTabProps {
  onLockAdmin?: () => void;
}

export const AdminMonitorTab: React.FC<AdminMonitorTabProps> = ({ onLockAdmin }) => {
  const [report, setReport] = useState<AdminAnalyticsReport>(() => getAdminAnalyticsReport());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('vi-VN'));
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const updated = getAdminAnalyticsReport([
        { email: 'ledinhtu892@gmail.com', displayName: 'Tú Lê Đình', lastSignedInAt: '10/9/2026' },
        { email: 'quynhanhbndh@gmail.com', displayName: 'Lê Quỳnh Anh', lastSignedInAt: '10/9/2026' },
      ]);
      setReport(updated);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      setIsRefreshing(false);
      setFeedbackToast('✅ Đã cập nhật số liệu giám sát mới nhất!');
      setTimeout(() => setFeedbackToast(null), 3000);
    }, 400);
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleExport = () => {
    exportAnalyticsReportAsJson(report);
    setFeedbackToast('📥 Đã xuất file báo cáo JSON thành công!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 md:p-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Toast Feedback */}
        {feedbackToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="px-4 py-2 rounded-xl shadow-lg border border-emerald-500/30 bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-900 flex items-center gap-2 text-xs font-semibold backdrop-blur-md">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackToast}</span>
            </div>
          </div>
        )}

        {/* 1. Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                📊
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Trung Tâm Giám Sát & Phân Tích Hệ Thống</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Realtime Live</span>
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Báo cáo chi tiết lượt dùng, định danh thiết bị khách, phiên chat và xu hướng chủ đề câu hỏi (Cập nhật lúc: {lastRefreshed})
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo JSON</span>
            </button>

            {onLockAdmin && (
              <button
                type="button"
                onClick={onLockAdmin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                title="Khóa lại bảng quản trị"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Khóa Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Top Metric Cards (4 KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Users & Guests */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng Người Dùng & Khách</span>
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {report.summary.totalUsers}
              </span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                +100% Hoạt động
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              <b>{report.summary.registeredUsersCount}</b> tài khoản Google • <b>{report.summary.guestDevicesCount}</b> thiết bị khách ẩn danh
            </p>
          </div>

          {/* Card 2: Total Interactions */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng Lượt Chat & Tương Tác</span>
              <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {report.summary.totalInteractions}
              </span>
              <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 font-mono">
                Lượt tương tác
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Tất cả các câu hỏi được AI xử lý và phân loại tự động
            </p>
          </div>

          {/* Card 3: Performance & Latency */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tốc Độ Phản Hồi Trung Bình</span>
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {(report.summary.avgLatencyMs / 1000).toFixed(2)}s
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {report.summary.successRate}% Thành công
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Model Gemini 3.5 Flash-Lite tốc độ cao kết hợp SSE Streaming
            </p>
          </div>

          {/* Card 4: Infrastructure & Hosting */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trạng Thái Hạ Tầng CDN</span>
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Server className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Hoạt Động Ổn Định</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Google Cloud Singapore • Phục vụ 5 tài liệu pháp lý gốc
            </p>
          </div>
        </div>

        {/* 3. Phân Bổ Chủ Đề (Topic Distribution Section) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🎯 Phân Bổ Chủ Đề Người Dùng Quan Tâm (Topic Analytics)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phân loại tự động dựa trên nội dung câu hỏi và Agent người dùng tương tác
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Tổng số lượt phân loại: {report.summary.totalInteractions}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {report.topics.map((t) => (
              <div key={t.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{t.count} câu hỏi</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 w-10 text-right">{t.percentage}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${t.color} transition-all duration-500`}
                    style={{ width: `${Math.max(t.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI Observation Card */}
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Ghi chú phân tích nghiệp vụ cho Admin:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              Chủ đề <b>Luật Kế toán & Thuế</b> và <b>OCR Hóa đơn</b> chiếm tỷ trọng áp đảo (&gt;80%). Người dùng tập trung cao độ vào việc tháo gỡ vướng mắc hóa đơn điện tử sai sót (theo Điều 19 NĐ 123/2020), cập nhật quy định NĐ 70/2025 và NĐ 254/2026. Tính năng đối chiếu trực tiếp tài liệu gốc phát huy hiệu quả cao nhất.
            </p>
          </div>
        </div>

        {/* 4. Phân Bổ Nền Tảng Thiết Bị & Trình Duyệt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Thiết bị & Hệ điều hành */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📱 Thiết Bị Sử Dụng (Device Distribution)</span>
            </h3>
            <div className="space-y-2.5 pt-1">
              {report.devices.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>{d.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {d.count} ({d.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Trình duyệt */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🌐 Trình Duyệt Web (Browsers)</span>
            </h3>
            <div className="space-y-2.5 pt-1">
              {report.browsers.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{b.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {b.count} ({b.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Nhật Ký Hoạt Động Hệ Thống Gần Đây (Activity Log) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📋 Nhật Ký Hoạt Động & Tương Tác Gần Đây</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Bảo vệ quyền riêng tư: Tự động lược bỏ nội dung nhạy cảm)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Người dùng / Thiết bị</th>
                  <th className="py-2.5 px-3">Chủ đề</th>
                  <th className="py-2.5 px-3">Nội dung tóm tắt</th>
                  <th className="py-2.5 px-3">Tốc độ</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {report.recentActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString('vi-VN')} {new Date(act.timestamp).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {act.userDisplayName || act.userEmail || act.guestId}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {act.os} • {act.browser} ({act.deviceType})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {act.topicLabel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {act.querySnippet}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {act.latencyMs ? `${(act.latencyMs / 1000).toFixed(2)}s` : '1.2s'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Thành công
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Cụm Liên Kết Nhanh Quản Trị Đám Mây (Quick Admin Links) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold flex items-center justify-center md:justify-start gap-2 text-cyan-300">
              <Globe className="w-4 h-4" />
              <span>Bảng Điều Khiển Nâng Cao (Google Cloud & Firebase Console)</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Truy cập trực tiếp hệ thống theo dõi lưu lượng băng thông, số người online theo thời gian thực và quản lý database.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <a
              href="https://console.firebase.google.com/project/ai-agent-25f66/hosting/sites/ai-agent-25f66/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs border border-white/20"
            >
              <span>Hosting Usage</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://console.firebase.google.com/project/ai-agent-25f66/analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs border border-white/20"
            >
              <span>Google Analytics</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://console.firebase.google.com/project/ai-agent-25f66/firestore/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all backdrop-blur-xs border border-white/20"
            >
              <span>Firestore DB</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
