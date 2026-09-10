import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Sun,
  Moon,
  RefreshCw,
} from './icons';
import {
  verifySystemPasscode,
  setSystemAuthenticated,
} from '../services/security';
import {
  signInWithGoogle,
  logoutUser,
  onAuthChange,
} from '../services/cloudSyncService';
import type { User as FirebaseUser } from 'firebase/auth';

interface SystemLockScreenProps {
  onUnlock: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const SystemLockScreen: React.FC<SystemLockScreenProps> = ({
  onUnlock,
  theme = 'light',
  onToggleTheme,
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  useEffect(() => {
    inputRef.current?.focus();
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      await signInWithGoogle();
      inputRef.current?.focus();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setGoogleError('Bạn đã đóng cửa sổ đăng nhập Google.');
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setGoogleError('Chưa bật tính năng đăng nhập Google trên Firebase Console. Vui lòng vào Firebase Console > Authentication > Sign-in method và Bật (Enable) Google.');
      } else {
        setGoogleError('Lỗi đăng nhập: ' + (err.message || 'Không thể kết nối.'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setGoogleError(null);
    } catch (err: any) {
      setGoogleError('Không thể đăng xuất: ' + err.message);
    }
  };

  const handleUnlock = (candidatePasscode: string = passcode) => {
    if (!candidatePasscode.trim()) {
      setError('Vui lòng nhập mã khóa!');
      inputRef.current?.focus();
      return;
    }

    if (verifySystemPasscode(candidatePasscode)) {
      setIsSuccess(true);
      setError('');
      setSystemAuthenticated(true, rememberDevice);
      setTimeout(() => {
        onUnlock();
      }, 500);
    } else {
      setIsShaking(true);
      setError('Mã khóa không chính xác. Vui lòng thử lại!');
      setTimeout(() => {
        setIsShaking(false);
      }, 600);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUnlock();
    }
  };

  const handleKeypadDigit = (digit: string) => {
    if (isSuccess) return;
    const next = passcode + digit;
    setPasscode(next);
    setError('');
  };

  const handleKeypadBackspace = () => {
    if (isSuccess) return;
    setPasscode((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleKeypadClear = () => {
    if (isSuccess) return;
    setPasscode('');
    setError('');
  };

  const handleFillDefault = () => {
    setPasscode('123456');
    setError('');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto selection:bg-blue-600/20 transition-colors">
      {/* Ambient background soft light orbs */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-transparent dark:from-blue-600/15 dark:via-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-cyan-400/10 dark:bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`relative w-full max-w-[440px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/80 flex flex-col items-center text-center transition-all ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Top Action Bar inside card: Theme Toggle & Security Status */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Cổng Bảo Vệ Hệ Thống</span>
          </div>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={isLight ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng'}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {isLight ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isLight ? 'Tối' : 'Sáng'}</span>
            </button>
          )}
        </div>

        {/* Center Logo Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-blue-500/15 mb-3">
          <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
            {isSuccess ? (
              <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-in zoom-in" />
            ) : (
              <Sparkles className="w-7 h-7 text-blue-600 dark:text-cyan-400" />
            )}
          </div>
        </div>

        {/* System Title */}
        <div className="mb-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1.5">
            Gemini <span className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">API Studio</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hệ Thống Trợ Lý AI & Quản Trị Nghiệp Vụ Doanh Nghiệp
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed max-w-sm">
          Xác thực tài khoản và mã bảo vệ để truy cập vào không gian làm việc.
        </p>

        {/* Google Account Section */}
        <div className="w-full mb-3">
          {currentUser && !currentUser.isAnonymous ? (
            <div className="p-2.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-left flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-emerald-400 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                      {currentUser.displayName || 'Tài khoản Google'}
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogout}
                className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-emerald-200 dark:border-emerald-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors cursor-pointer shrink-0 font-medium"
                title="Đăng xuất tài khoản này"
              >
                Đổi tài khoản
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSuccess}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>
                  {isGoogleLoading ? 'Đang kết nối Google...' : 'Đăng nhập bằng tài khoản Google'}
                </span>
              </button>
              {googleError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {googleError}
                </p>
              )}
            </div>
          )}

          {/* Divider with badge */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              Yêu cầu mã bảo vệ hệ thống
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>
        </div>

        {/* Passcode Input Area */}
        <div className="w-full space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {isSuccess ? (
                <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              )}
            </div>

            <input
              ref={inputRef}
              type={showPasscode ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nhập mã khóa vào hệ thống..."
              disabled={isSuccess}
              className="w-full pl-10 pr-11 py-3 text-center text-base font-mono tracking-widest bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/15 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal placeholder:text-xs outline-none transition-all shadow-xs"
            />

            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={showPasscode ? 'Ẩn mã khóa' : 'Hiện mã khóa'}
            >
              {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 font-medium animate-in fade-in">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Keypad Toggle Button */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              type="button"
              onClick={() => setShowKeypad(!showKeypad)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              {showKeypad ? (
                <>✕ Thu gọn bàn phím số</>
              ) : (
                <>⌨️ Dùng chuột / Bàn phím số ảo</>
              )}
            </button>

            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Nhấn <strong>Enter</strong> để vào
            </span>
          </div>

          {/* Quick Keypad (Shown on toggle or easily accessible) */}
          {showKeypad && (
            <div className="grid grid-cols-3 gap-2 w-full pt-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadDigit(num)}
                  disabled={isSuccess}
                  className="h-10 rounded-xl bg-slate-100 hover:bg-blue-50 hover:border-blue-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 active:scale-95 text-base font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/70 shadow-2xs transition-all cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                disabled={isSuccess}
                className="h-10 rounded-xl bg-slate-100/60 hover:bg-slate-200/80 dark:bg-slate-800/40 dark:hover:bg-slate-800 active:scale-95 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 transition-all cursor-pointer select-none"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => handleKeypadDigit('0')}
                disabled={isSuccess}
                className="h-10 rounded-xl bg-slate-100 hover:bg-blue-50 hover:border-blue-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 active:scale-95 text-base font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/70 shadow-2xs transition-all cursor-pointer select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                disabled={isSuccess}
                className="h-10 rounded-xl bg-slate-100/60 hover:bg-slate-200/80 dark:bg-slate-800/40 dark:hover:bg-slate-800 active:scale-95 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 transition-all cursor-pointer select-none flex items-center justify-center"
                title="Xóa ký tự cuối"
              >
                ⌫
              </button>
            </div>
          )}

          {/* Remember on device checkbox */}
          <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 pt-1 px-1">
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => handleUnlock()}
            disabled={isSuccess}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white shadow-blue-500/20 hover:shadow-lg'
            }`}
          >
            {isSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Mở Khóa Thành Công! Đang Vào Hệ Thống...</span>
              </>
            ) : (
              <>
                <span>Vào Hệ Thống</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Footer Hint Box with Quick-Fill */}
        <div className="w-full pt-4 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span>Mã mặc định:</span>
            <button
              type="button"
              onClick={handleFillDefault}
              title="Bấm vào đây để tự động điền mã 123456"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs transition-colors cursor-pointer"
            >
              <span>123456</span>
              <span className="text-[10px] font-sans font-normal opacity-80">(Bấm để điền nhanh)</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Bạn có thể đổi mã khóa trong tab Cài đặt API sau khi đăng nhập.
          </span>
        </div>
      </div>
    </div>
  );
};
