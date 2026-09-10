import React, { useState } from 'react';
import { type User } from 'firebase/auth';
import { X, Cloud, RefreshCw, Check, LogOut, Sparkles, AlertCircle } from './icons';
import { signInWithGoogle, logoutUser } from '../services/cloudSyncService';

export interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  isSyncing: boolean;
  onTriggerSync: () => Promise<void>;
  sessionsCount: number;
  goldenCount: number;
  customAgentsCount: number;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isSyncing,
  onTriggerSync,
  sessionsCount,
  goldenCount,
  customAgentsCount,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      setSyncSuccessMsg('🎉 Đăng nhập Google thành công!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
      await onTriggerSync();
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Bạn đã đóng cửa sổ đăng nhập.');
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setAuthError('Đăng nhập Google chưa được kích hoạt trên Firebase Console. Vui lòng bật Google Provider trong Firebase Auth.');
      } else {
        setAuthError(`Lỗi đăng nhập: ${err.message || 'Không thể kết nối dịch vụ xác thực.'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setSyncSuccessMsg('Đã đăng xuất tài khoản.');
      setTimeout(() => setSyncSuccessMsg(null), 2500);
    } catch (err: any) {
      setAuthError('Không thể đăng xuất: ' + err.message);
    }
  };

  const handleManualSync = async () => {
    try {
      await onTriggerSync();
      setSyncSuccessMsg('✅ Đã đồng bộ toàn bộ dữ liệu lên Cloud Firestore thành công!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (err: any) {
      setAuthError('Lỗi khi đồng bộ: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Đồng Bộ Đám Mây (Cloud Firestore)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lưu trữ & đồng bộ đa thiết bị (Máy tính ↔ Điện thoại)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Success Toast */}
          {syncSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{authError}</span>
              </div>
            </div>
          )}

          {/* Account Profile Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            {currentUser && !currentUser.isAnonymous ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-10 h-10 rounded-full border border-blue-400 shadow-2xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {currentUser.displayName || 'Tài khoản Google'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Đang đồng bộ Cloud
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium cursor-pointer transition-colors shrink-0"
                  title="Đăng xuất tài khoản này"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Thoát</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    👤
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Chưa liên kết tài khoản Google
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Đăng nhập Google 1-chạm để sao lưu và xem chung lịch sử chat trên cả máy tính và điện thoại.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>{isLoggingIn ? 'Đang kết nối Google...' : 'Đăng nhập bằng tài khoản Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Cloud Sync Data Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="block text-base font-bold text-blue-600 dark:text-blue-400">
                {sessionsCount}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Phiên Chat</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="block text-base font-bold text-amber-600 dark:text-amber-400">
                {goldenCount}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Mẫu Chuẩn ⭐</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="block text-base font-bold text-purple-600 dark:text-purple-400">
                {customAgentsCount}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Agent Tự Tạo</span>
            </div>
          </div>

          {/* Action: Manual Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang tải dữ liệu lên Cloud...' : 'Đồng Bộ Dữ Liệu Ngay Lập Tức'}</span>
          </button>

          {/* Security & Infrastructure Note */}
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            <p className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Bảo Mật Google Cloud & Chi Phí 0đ:</span>
            </p>
            Dữ liệu được lưu trữ trực tiếp trên cụm máy chủ **Google Cloud Firestore (Khu vực Singapore - asia-southeast1)**. Hệ thống tận dụng gói miễn phí vĩnh viễn (50.000 lượt đọc/ngày) đảm bảo tốc độ cao nhất và bảo mật riêng tư tuyệt đối.
          </div>
        </div>
      </div>
    </div>
  );
};
