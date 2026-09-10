import React, { useState } from 'react';
import {
  X,
  Search,
  Plus,
  Sparkles,
  Bot,
  Check,
  Edit3,
  Trash2,
  Copy,
  Sliders,
  Cpu,
  ArrowRight,
  Lock,
} from './icons';
import type { Agent, AgentCategory } from '../types';
import { AGENT_CATEGORIES } from '../data/defaultAgents';
import { isPinProtectionEnabled } from '../services/security';

interface AgentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  currentAgentId: string;
  onSelectAgent: (agent: Agent) => void;
  onCreateAgent: (newAgent: Omit<Agent, 'id' | 'createdAt'>) => void;
  onUpdateAgent: (updatedAgent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  isUnlocked?: boolean;
  onRequestUnlock?: (callback: () => void) => void;
}

const PRESET_EMOJIS = ['🤖', '💻', '📑', '🇻🇳', '🧠', '📊', '⚡', '🎨', '🔬', '🛡️', '📚', '✍️', '💼', '🚀'];

const PRESET_MODELS = [
  { id: 'gemini-3.5-flash', name: 'gemini-3.5-flash (Gemini 3.5 Flash - Mặc định)' },
  { id: 'gemini-flash-lite-latest', name: 'gemini-flash-lite-latest (Siêu Tốc ~1s)' },
  { id: 'gemini-3.6-flash', name: 'gemini-3.6-flash (Tiêu chuẩn / Suy luận sâu)' },
  { id: 'gemini-3.5-flash-lite', name: 'gemini-3.5-flash-lite' },
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash' },
  { id: 'gemini-2.5-pro', name: 'gemini-2.5-pro' },
];

export const AgentSelectorModal: React.FC<AgentSelectorModalProps> = ({
  isOpen,
  onClose,
  agents,
  currentAgentId,
  onSelectAgent,
  onCreateAgent,
  onUpdateAgent,
  onDeleteAgent,
  isUnlocked,
  onRequestUnlock,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form State for Create / Edit
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAvatar, setFormAvatar] = useState('🤖');
  const [formCategory, setFormCategory] = useState<AgentCategory>('custom');
  const [formSystemInstruction, setFormSystemInstruction] = useState('');
  const [formModel, setFormModel] = useState('gemini-flash-lite-latest');
  const [formTemperature, setFormTemperature] = useState(0.7);
  const [formPrompts, setFormPrompts] = useState<string[]>(['', '']);

  const isProtected = isPinProtectionEnabled();

  const requireAuth = (action: () => void) => {
    if (isProtected && !isUnlocked && onRequestUnlock) {
      onRequestUnlock(action);
      return;
    }
    action();
  };

  if (!isOpen) return null;

  // Filtered list
  const filteredAgents = agents.filter((a) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'custom' ? !a.isBuiltIn : a.category === selectedCategory);
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.systemInstruction.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenCreate = () => {
    requireAuth(() => {
      setEditingAgent(null);
      setFormName('');
      setFormDescription('');
      setFormAvatar('🤖');
      setFormCategory('custom');
      setFormSystemInstruction('');
      setFormModel('gemini-flash-lite-latest');
      setFormTemperature(0.7);
      setFormPrompts(['Hỏi câu thứ nhất...', 'Hỏi câu thứ hai...']);
      setIsCreating(true);
    });
  };

  const handleOpenEdit = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(() => {
      setEditingAgent(agent);
      setFormName(agent.name);
      setFormDescription(agent.description);
      setFormAvatar(agent.avatar);
      setFormCategory(agent.category);
      setFormSystemInstruction(agent.systemInstruction);
      setFormModel(agent.recommendedModel || 'gemini-flash-lite-latest');
      setFormTemperature(agent.temperature ?? 0.7);
      setFormPrompts(
        agent.starterPrompts.length > 0 ? [...agent.starterPrompts] : ['Prompt 1', 'Prompt 2']
      );
      setIsCreating(true);
    });
  };

  const handleCloneAgent = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(() => {
      setEditingAgent(null);
      setFormName(`${agent.name} (Bản sao)`);
      setFormDescription(agent.description);
      setFormAvatar(agent.avatar);
      setFormCategory('custom');
      setFormSystemInstruction(agent.systemInstruction);
      setFormModel(agent.recommendedModel || 'gemini-flash-lite-latest');
      setFormTemperature(agent.temperature ?? 0.7);
      setFormPrompts([...agent.starterPrompts]);
      setIsCreating(true);
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập tên cho Agent!');
      return;
    }
    if (!formSystemInstruction.trim()) {
      alert('Vui lòng nhập System Instruction định hướng hành vi cho Agent!');
      return;
    }

    const cleanPrompts = formPrompts.map((p) => p.trim()).filter((p) => p.length > 0);

    if (editingAgent) {
      onUpdateAgent({
        ...editingAgent,
        name: formName.trim(),
        description: formDescription.trim(),
        avatar: formAvatar,
        category: formCategory,
        systemInstruction: formSystemInstruction.trim(),
        recommendedModel: formModel,
        temperature: formTemperature,
        starterPrompts: cleanPrompts,
      });
    } else {
      onCreateAgent({
        name: formName.trim(),
        description: formDescription.trim(),
        avatar: formAvatar,
        category: formCategory,
        categoryLabel: 'Tùy chỉnh',
        systemInstruction: formSystemInstruction.trim(),
        recommendedModel: formModel,
        temperature: formTemperature,
        starterPrompts: cleanPrompts,
        isBuiltIn: false,
      });
    }

    setIsCreating(false);
    setEditingAgent(null);
  };

  const handlePromptChange = (index: number, val: string) => {
    const updated = [...formPrompts];
    updated[index] = val;
    setFormPrompts(updated);
  };

  const handleAddPromptField = () => {
    if (formPrompts.length < 5) {
      setFormPrompts([...formPrompts, '']);
    }
  };

  const handleRemovePromptField = (index: number) => {
    if (formPrompts.length > 1) {
      setFormPrompts(formPrompts.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">Thư Viện AI Agents</span>
                <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium shrink-0">
                  {agents.length}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                Chọn Persona tối ưu cho từng mục đích hoặc tự tạo Agent riêng biệt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isCreating && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Tạo Agent Mới</span>
                <span className="sm:hidden">Tạo mới</span>
                {!isUnlocked && isProtected && (
                  <Lock className="w-3 h-3 text-blue-200" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isCreating ? (
          /* Form Tạo / Sửa Agent */
          <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
                <span>{editingAgent ? 'Chỉnh Sửa Agent' : 'Thiết Lập Agent Tùy Chỉnh Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                ← Quay lại danh sách
              </button>
            </div>

            {/* Avatar & Name */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Icon đại diện
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center justify-center text-2xl shadow-xs">
                    {formAvatar}
                  </div>
                  <input
                    type="text"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value.slice(0, 4))}
                    className="w-16 px-2 py-2 text-center text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-1 focus:ring-blue-500"
                    placeholder="Emoji"
                  />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormAvatar(emoji)}
                      className="text-xs p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tên Agent *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Senior React Architect, Chuyên Gia Tóm Tắt Luật..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Danh mục
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as AgentCategory)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="legal_tax">⚖️ Luật & Thuế Kế toán</option>
                      <option value="code">💻 Lập trình & Kỹ thuật</option>
                      <option value="doc_ocr">📑 Tài liệu & OCR</option>
                      <option value="translation">🇻🇳 Viết lách & Dịch thuật</option>
                      <option value="reasoning">🧠 Tư duy & Toán logic</option>
                      <option value="business">📊 Kinh doanh & Phân tích</option>
                      <option value="general">🤖 Đa năng tổng hợp</option>
                      <option value="custom">✨ Tùy chỉnh khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Model khuyến nghị
                    </label>
                    <select
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {PRESET_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Mô tả ngắn vai trò
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="VD: Hỗ trợ review code TypeScript, phát hiện lỗ hổng bảo mật và tối ưu hóa truy vấn SQL."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* System Instruction (Core) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>System Instruction (Chỉ thị hệ thống / Persona) *</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                    (Quyết định phong cách và chuyên môn của Agent)
                  </span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {formSystemInstruction.length} ký tự
                </span>
              </div>
              <textarea
                required
                rows={5}
                value={formSystemInstruction}
                onChange={(e) => setFormSystemInstruction(e.target.value)}
                placeholder="Bạn là ai? Phong cách trả lời của bạn là gì? Bạn có những nguyên tắc bắt buộc nào? (Ví dụ: Luôn viết code kèm giải thích, luôn trả lời bằng tiếng Việt...)"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y leading-relaxed"
              />
            </div>

            {/* Temperature & Parameters */}
            <div className="p-3.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Nhiệt độ sáng tạo (Temperature): {formTemperature}</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {formTemperature <= 0.2
                    ? '🎯 Chính xác, Tất định (Dành cho Code / Toán)'
                    : formTemperature <= 0.7
                    ? '⚖️ Cân bằng tự nhiên'
                    : '✨ Sáng tạo cao (Viết văn / Ý tưởng)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formTemperature}
                onChange={(e) => setFormTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Starter Prompts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gợi ý câu hỏi khởi đầu (Starter Prompts)
                </label>
                {formPrompts.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddPromptField}
                    className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm gợi ý</span>
                  </button>
                )}
              </div>
              {formPrompts.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4 font-mono">{idx + 1}.</span>
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => handlePromptChange(idx, e.target.value)}
                    placeholder={`Câu hỏi gợi ý số ${idx + 1}...`}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-1 focus:ring-blue-500"
                  />
                  {formPrompts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePromptField(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Form actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors cursor-pointer"
              >
                {editingAgent ? 'Cập Nhật Agent' : 'Tạo Agent Mới'}
              </button>
            </div>
          </form>
        ) : (
          /* Danh sách Agent */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters bar */}
            <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2.5 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar">
                {AGENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm Agent..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Grid of Agents */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {filteredAgents.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Không tìm thấy Agent nào phù hợp
                  </p>
                  <button
                    onClick={handleOpenCreate}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    + Tạo một Agent mới ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAgents.map((agent) => {
                    const isCurrent = agent.id === currentAgentId;

                    return (
                      <div
                        key={agent.id}
                        onClick={() => {
                          onSelectAgent(agent);
                          onClose();
                        }}
                        className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/60 hover:shadow-sm'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Top Row: Avatar, Name, Category */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shadow-2xs">
                                {agent.avatar}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {agent.name}
                                  </h4>
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-bold flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" />
                                      <span>Đang dùng</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {agent.categoryLabel || agent.category}
                                  {agent.isBuiltIn ? ' (Gốc)' : ' (Tự tạo)'}
                                </span>
                              </div>
                            </div>

                            {/* Actions menu */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                            >
                              <button
                                onClick={(e) => handleCloneAgent(agent, e)}
                                title="Nhân bản làm Agent mới"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {!agent.isBuiltIn && (
                                <>
                                  <button
                                    onClick={(e) => handleOpenEdit(agent, e)}
                                    title="Chỉnh sửa"
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requireAuth(() => {
                                        if (
                                          window.confirm(
                                            `Bạn có chắc muốn xóa Agent "${agent.name}" không?`
                                          )
                                        ) {
                                          onDeleteAgent(agent.id);
                                        }
                                      });
                                    }}
                                    title="Xóa Agent này"
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {agent.description}
                          </p>

                          {/* Starter Prompts chips */}
                          {agent.starterPrompts && agent.starterPrompts.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {agent.starterPrompts.slice(0, 2).map((prompt, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 truncate max-w-[200px]"
                                >
                                  "{prompt}"
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Model & Temp */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              <Cpu className="w-3 h-3 text-blue-500" />
                              <span>{agent.recommendedModel || 'gemini-flash-lite-latest'}</span>
                            </span>
                            <span>Temp: {agent.temperature ?? 0.7}</span>
                          </div>

                          <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>Sử dụng</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
