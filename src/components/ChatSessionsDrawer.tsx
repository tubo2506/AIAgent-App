import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit3,
  Check,
  X,
  FileDown,
  Clock,
  MoreVertical,
  PanelLeftClose,
  Download,
} from './icons';
import type { ChatSession } from '../types';

interface ChatSessionsDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onExportSession: (sessionId: string, format: 'markdown' | 'json') => void;
}

export const ChatSessionsDrawer: React.FC<ChatSessionsDrawerProps> = ({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onClearAllSessions,
  onExportSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Group sessions by time
  const groupedSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = sessions.filter((s) => {
      if (!query) return true;
      return (
        s.title.toLowerCase().includes(query) ||
        s.agentName.toLowerCase().includes(query) ||
        s.messages.some((m) => m.content.toLowerCase().includes(query))
      );
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const thisWeek: ChatSession[] = [];
    const older: ChatSession[] = [];

    filtered.forEach((session) => {
      const time = new Date(session.updatedAt || session.createdAt).getTime();
      if (time >= todayStart) {
        today.push(session);
      } else if (time >= yesterdayStart) {
        yesterday.push(session);
      } else if (time >= weekStart) {
        thisWeek.push(session);
      } else {
        older.push(session);
      }
    });

    return [
      { label: 'Hôm nay', items: today },
      { label: 'Hôm qua', items: yesterday },
      { label: '7 ngày trước', items: thisWeek },
      { label: 'Cũ hơn', items: older },
    ].filter((group) => group.items.length > 0);
  }, [sessions, searchQuery]);

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (sessionId: string) => {
    if (editingTitle.trim()) {
      onRenameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleKeyDownRename = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(sessionId);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-150"
        onClick={onToggle}
      />

      <div className="fixed inset-y-0 left-0 z-40 md:relative md:z-20 w-72 max-w-[85vw] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 select-none shadow-2xl md:shadow-none transition-all animate-in slide-in-from-left duration-200">
        {/* Header with New Chat button */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Lịch Sử Cuộc Trò Chuyện
              </span>
            </div>
            <button
              onClick={onToggle}
              title="Thu gọn danh sách (Ctrl/Cmd + B)"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewSession();
              if (window.innerWidth < 768) {
                onToggle();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cuộc trò chuyện mới</span>
          </button>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {groupedSessions.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-2">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có phiên chat nào'}
            </p>
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.label} className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-2">
                {group.label}
              </span>

              <div className="space-y-0.5">
                {group.items.map((session) => {
                  const isCurrent = session.id === currentSessionId;
                  const isEditing = editingSessionId === session.id;
                  const isMenuOpen = activeMenuId === session.id;

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        if (!isEditing) {
                          onSelectSession(session.id);
                          if (window.innerWidth < 768) {
                            onToggle();
                          }
                        }
                      }}
                      className={`group relative flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold border border-blue-200/80 dark:border-blue-900/60 shadow-2xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {/* Left: Avatar & Title */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                        <span className="text-sm shrink-0">{session.agentAvatar || '🤖'}</span>

                        {isEditing ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 flex-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleKeyDownRename(e, session.id)}
                              className="w-full px-1.5 py-0.5 text-xs rounded border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveRename(session.id)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 rounded text-slate-400 hover:bg-slate-200 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <span className="block truncate font-medium">{session.title}</span>
                            <span className="block text-[10px] text-slate-600 dark:text-slate-400 truncate">
                              {session.agentName} • {session.messages.length} tin
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Action button menu */}
                      {!isEditing && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="relative shrink-0 flex items-center"
                        >
                          <button
                            onClick={() =>
                              setActiveMenuId(isMenuOpen ? null : session.id)
                            }
                            className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-opacity ${
                              isMenuOpen || isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Context Menu Dropdown */}
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-36 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={(e) => handleStartRename(session, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-left"
                              >
                                <Edit3 className="w-3 h-3 text-blue-500" />
                                <span>Đổi tên</span>
                              </button>

                              <button
                                onClick={() => {
                                  onExportSession(session.id, 'markdown');
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-left"
                              >
                                <Download className="w-3 h-3 text-emerald-500" />
                                <span>Xuất Markdown</span>
                              </button>

                              <button
                                onClick={() => {
                                  onExportSession(session.id, 'json');
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-left"
                              >
                                <FileDown className="w-3 h-3 text-amber-500" />
                                <span>Xuất JSON</span>
                              </button>

                              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Xóa vĩnh viễn cuộc trò chuyện "${session.title}"?`
                                    )
                                  ) {
                                    onDeleteSession(session.id);
                                  }
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer text-left"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Xóa phiên này</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
        <span>{sessions.length} cuộc trò chuyện</span>
        {sessions.length > 1 && (
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Bạn có chắc chắn muốn xóa tất cả các cuộc trò chuyện đã lưu?'
                )
              ) {
                onClearAllSessions();
              }
            }}
            className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
          >
            Xóa tất cả
          </button>
        )}
      </div>
    </div>
  </>
);
};
