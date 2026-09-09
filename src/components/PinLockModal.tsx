import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, ShieldAlert, Check } from './icons';
import { verifyPin } from '../services/security';

interface PinLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Yêu Cầu Mã PIN Bảo Vệ',
  description = 'Khu vực này chứa cấu hình hệ thống, API Key và thông số nhạy cảm của Agent. Vui lòng nhập mã PIN bảo vệ để tiếp tục.',
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setIsShaking(false);
      setIsSuccess(false);
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (pin.length < 6 && !isSuccess) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length >= 4) {
        checkPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !isSuccess) {
      setPin((prev) => prev.slice(0, -1));
      setError('');
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const checkPin = (candidatePin: string) => {
    if (verifyPin(candidatePin)) {
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 350);
    } else {
      // If 4 digits entered and wrong, or if full pin wrong
      if (candidatePin.length === 4) {
        setIsShaking(true);
        setError('Mã PIN không đúng. Vui lòng thử lại.');
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 600);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Hidden input for mobile / auto focus */}
      <input
        ref={hiddenInputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        className="opacity-0 absolute -top-9999px pointer-events-none"
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
          setPin(val);
          if (val.length >= 4) {
            checkPin(val);
          }
        }}
      />

      <div
        className={`relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center transition-transform ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Đóng / Về Chat Studio"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon Badge */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner transition-colors ${
            isSuccess
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300'
              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-800'
          }`}
        >
          {isSuccess ? <Check className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {isSuccess ? 'Mở Khóa Thành Công!' : title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed px-2">
          {description}
        </p>

        {/* PIN Indicators (Dots) */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {[0, 1, 2, 3].map((idx) => {
            const hasValue = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isSuccess
                    ? 'bg-emerald-500 scale-110 shadow-xs'
                    : hasValue
                    ? 'bg-blue-600 scale-110 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium mb-3 animate-fade-in">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="h-4 mb-3" />
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-12 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 hover:bg-blue-50 dark:hover:bg-slate-700/80 active:scale-95 text-base font-semibold text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer select-none"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40 transition-all cursor-pointer select-none"
          >
            Xóa
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 hover:bg-blue-50 dark:hover:bg-slate-700/80 active:scale-95 text-base font-semibold text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40 transition-all cursor-pointer select-none flex items-center justify-center"
            title="Xóa ký tự cuối"
          >
            ⌫
          </button>
        </div>

        {/* Default PIN Hint */}
        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1">
          <span>
            Mã PIN mặc định: <strong className="font-mono text-blue-600 dark:text-blue-400">1234</strong>
          </span>
          <span className="text-[10px]">
            (Bạn có thể đổi mã PIN trong tab Cài đặt sau khi mở khóa)
          </span>
        </div>
      </div>
    </div>
  );
};
