import React from 'react';
import {
  Sparkles,
  Activity,
  Sun,
  Moon,
  Settings,
  Lock,
  Unlock,
  MessageSquare,
  BarChart3,
  Code2,
  History,
} from './icons';
import type { ApiConfig } from '../types';

export type TabType = 'chat' | 'presets' | 'raw' | 'history' | 'benchmark' | 'settings';

interface HeaderProps {
  config: ApiConfig;
  onReset: () => void;
  onToggleTheme: () => void;
  onLockSystem?: () => void;
  lastLatency?: number;
  lastStatus?: number;
  // Embedded Tab Navigation
  activeTab?: TabType;
  onTabClick?: (tab: TabType) => void;
  historyCount?: number;
  isProtected?: boolean;
  isUnlocked?: boolean;
  onLockNow?: () => void;
  onOpenPinModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onReset: _onReset,
  onToggleTheme,
  onLockSystem,
  lastLatency,
  lastStatus,
  activeTab,
  onTabClick,
  historyCount = 0,
  isProtected,
  isUnlocked,
  onLockNow,
  onOpenPinModal,
}) => {
  const isLight = config.theme === 'light';

  return (
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-2.5 sm:px-4 py-1.5 sticky top-0 z-30 flex items-center justify-between gap-2 shadow-xs transition-colors h-13 shrink-0">
      {/* 1. Left: Brand logo & title */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[2px] shadow-blue-500/10 shadow-sm shrink-0">
          <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-cyan-400 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <h1 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1">
            <span className="hidden xs:inline">Gemini</span>{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Studio
            </span>
          </h1>
          <span className="hidden sm:inline text-[9px] px-1 py-0.1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-500/20">
            v1.1
          </span>
        </div>
      </div>

      {/* 2. Center: Embedded Navigation Tabs (Replaces separate row) */}
      {activeTab && onTabClick && (
        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar py-0.5 mx-1 max-w-full">
          {/* Tab 1: Chat Studio */}
          <button
            onClick={() => onTabClick('chat')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'chat'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          {/* Tab 2: Hiệu suất */}
          <button
            onClick={() => onTabClick('benchmark')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'benchmark'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hiệu suất</span>
            <span className="sm:hidden">Test</span>
            {!isUnlocked && isProtected && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Tab 3: Mẫu Prompt */}
          <button
            onClick={() => onTabClick('presets')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'presets'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mẫu Prompt</span>
            <span className="sm:hidden">Mẫu</span>
            {!isUnlocked && isProtected && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Tab 4: Raw JSON */}
          <button
            onClick={() => onTabClick('raw')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'raw'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON</span>
            {!isUnlocked && isProtected && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Tab 5: Lịch sử */}
          <button
            onClick={() => onTabClick('history')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'history'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lịch sử ({historyCount})</span>
            <span className="sm:hidden">Log</span>
            {!isUnlocked && isProtected && <Lock className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Tab 6: Cài đặt */}
          <button
            onClick={() => onTabClick('settings')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài đặt</span>
            {!isUnlocked && isProtected && <Lock className="w-3 h-3 text-slate-400" />}
          </button>
        </nav>
      )}

      {/* 3. Right: Status, PIN, Theme, Lock */}
      <div className="flex items-center gap-1 sm:gap-1.5 text-xs shrink-0">
        {/* Status indicator if available */}
        {lastStatus !== undefined && (
          <div
            className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono text-[11px] ${
              lastStatus >= 200 && lastStatus < 300
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>{lastStatus === 0 ? 'ERR' : lastStatus}</span>
            {lastLatency !== undefined && (
              <span className="hidden md:inline opacity-80">({(lastLatency / 1000).toFixed(1)}s)</span>
            )}
          </div>
        )}

        {/* PIN protection status */}
        {isProtected && (
          <div className="flex items-center">
            {isUnlocked ? (
              <div className="flex items-center gap-1">
                <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <Unlock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Mở</span>
                </span>
                {onLockNow && (
                  <button
                    onClick={onLockNow}
                    className="inline-flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Khóa lại cấu hình bảo vệ"
                  >
                    <Lock className="w-3 h-3" />
                    <span className="hidden md:inline">Khóa PIN</span>
                  </button>
                )}
              </div>
            ) : (
              onOpenPinModal && (
                <button
                  onClick={onOpenPinModal}
                  className="inline-flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
                  title="Nhập mã PIN để mở khóa cấu hình"
                >
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="hidden md:inline">Mở PIN</span>
                </button>
              )
            )}
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isLight ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng'}
          className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-xs shrink-0"
        >
          {isLight ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          <span className="hidden xl:inline">{isLight ? 'Tối' : 'Sáng'}</span>
        </button>

        {/* Lock System button */}
        {onLockSystem && (
          <button
            onClick={onLockSystem}
            title="Khóa cổng vào hệ thống"
            className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer font-medium text-xs shrink-0"
          >
            <Lock className="w-3 h-3 text-rose-500" />
            <span className="hidden sm:inline">Khóa</span>
          </button>
        )}
      </div>
    </header>
  );
};
