import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Users,
  Check,
  X,
  Search,
  Sparkles,
  UploadCloud,
  Download,
  Upload,
  Trash2,
  Eye,
  RefreshCw,
  Globe,
  Plus,
  AlertCircle,
} from './icons';
import type { ApiConfig, KnowledgeDocument, KnowledgeScope, Agent } from '../types';
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  toggleDocumentActive,
  assignDocumentScope,
  exportDocumentsJson,
  importDocumentsJson,
  seedDefaultKnowledge,
} from '../services/legalKnowledgeDb';
import { BUILT_IN_AGENTS } from '../data/defaultAgents';
import { MarkdownRenderer } from './MarkdownRenderer';

interface KnowledgeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  currentAgentId?: string;
  customAgents?: Agent[];
  onDocumentsUpdated?: () => void;
}

const CATEGORIES = [
  'Pháp luật & Thuế',
  'Hóa đơn & Chứng từ',
  'Kỹ thuật & Code',
  'Kinh doanh & Chiến lược',
  'Tài liệu chung',
];

export const KnowledgeHubModal: React.FC<KnowledgeHubModalProps> = ({
  isOpen,
  onClose,
  config,
  currentAgentId,
  customAgents = [],
  onDocumentsUpdated,
}) => {
  const allAgents = [...BUILT_IN_AGENTS, ...customAgents];

  // Navigation Filter state
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // 'all' | 'shared' | agentId
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Main view state
  const [viewMode, setViewMode] = useState<'list' | 'upload' | 'backup'>('list');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [docTitle, setDocTitle] = useState('');
  const [docCode, setDocCode] = useState('');
  const [docIssuedDate, setDocIssuedDate] = useState('');
  const [docCategory, setDocCategory] = useState('Pháp luật & Thuế');
  const [docScope, setDocScope] = useState<KnowledgeScope>('shared');
  const [docAssignedAgents, setDocAssignedAgents] = useState<string[]>([]);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [digitizeProgress, setDigitizeProgress] = useState('');
  const [digitizeError, setDigitizeError] = useState<string | null>(null);
  const [digitizeSuccessDoc, setDigitizeSuccessDoc] = useState<KnowledgeDocument | null>(null);

  // Viewing preview modal
  const [viewingDoc, setViewingDoc] = useState<KnowledgeDocument | null>(null);

  // Quick Assign Agent dropdown modal
  const [assigningDoc, setAssigningDoc] = useState<KnowledgeDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all documents from IndexedDB
  const loadDocs = async () => {
    setIsLoadingDocs(true);
    try {
      const docs = await getAllDocuments();
      setDocuments(docs);
      onDocumentsUpdated?.();
    } catch (err) {
      console.error('Lỗi đọc tài liệu từ DB:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocs();
      setDigitizeError(null);
      setDigitizeSuccessDoc(null);
      // Gợi ý mặc định chọn agent hiện tại nếu có
      if (currentAgentId) {
        setDocAssignedAgents([currentAgentId]);
      }
    }
  }, [isOpen, currentAgentId]);

  if (!isOpen) return null;

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Tệp quá lớn (>25MB). Vui lòng chọn tệp nhỏ hơn 25MB.');
      return;
    }

    setSelectedFile(file);
    setDigitizeError(null);
    setDigitizeSuccessDoc(null);

    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setDocTitle(cleanName);

    const codeMatch = file.name.match(/\d+[\/_]\d+/);
    if (codeMatch) {
      setDocCode(codeMatch[0].replace('_', '/'));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Run Digitization
  const handleStartDigitize = async () => {
    if (!selectedFile || !fileBase64) {
      alert('Vui lòng chọn một tệp PDF hoặc văn bản trước.');
      return;
    }
    if (!docTitle.trim()) {
      alert('Vui lòng nhập Tên tài liệu.');
      return;
    }
    if (docScope === 'agent' && docAssignedAgents.length === 0) {
      alert('Bạn đã chọn chế độ "Riêng cho Agent". Vui lòng tick chọn ít nhất một Agent nhận tài liệu này!');
      return;
    }
    if (!config.apiKey) {
      alert('Chưa có API Key Gemini. Vui lòng vào Cài đặt để cấu hình API Key.');
      return;
    }

    setIsDigitizing(true);
    setDigitizeError(null);
    setDigitizeProgress('Đang gửi tài liệu sang Gemini AI để đọc và phân tích cấu trúc...');

    try {
      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf');
      const mimeType = isPdf ? 'application/pdf' : selectedFile.type || 'text/plain';

      const digitizationPrompt = `Bạn là chuyên gia số hóa và phân tích tài liệu tri thức cho AI.
Nhiệm vụ: Đọc toàn bộ tài liệu được cung cấp và chuyển đổi thành văn bản thuần có cấu trúc Markdown chuẩn, bảo đảm 100% nội dung và dữ liệu quan trọng.

Yêu cầu nghiêm ngặt:
1. Bóc tách rõ ràng: Tiêu đề tài liệu, Số hiệu/Mã văn bản (nếu có), Cơ quan/Tổ chức ban hành, Ngày ban hành hoặc hiệu lực.
2. Giữ nguyên vẹn 100% các điều khoản, quy định, số liệu bảng biểu hoặc hướng dẫn kỹ thuật. Không lược bớt nội dung.
3. Bỏ qua các thành phần rác: số trang, tiêu đề đầu trang lặp lại (header/footer), dấu giáp lai, lời dặn in ấn.
4. Định dạng Markdown phân cấp rõ ràng (##, ###, bảng biểu |).
5. Đầu ra CHỈ TRẢ VỀ nội dung Markdown số hóa, không thêm lời chào mở đầu hay bình luận.`;

      setDigitizeProgress('AI đang trích xuất toàn bộ dữ liệu và nén sang Markdown siêu nhẹ...');

      let targetModel = config.model;
      if (targetModel === 'gemini-3.6-flash' || !targetModel.includes('flash')) {
        // Tối ưu quota cao nhất cho số hóa: ưu tiên dùng 3.5-flash-lite
        targetModel = 'gemini-3.5-flash-lite';
      }

      const requestDigitize = async (modelToUse: string) => {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${config.apiKey}`;
        return fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: fileBase64,
                    },
                  },
                  {
                    text: digitizationPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          }),
        });
      };

      let res = await requestDigitize(targetModel);

      // Nếu model bị 429 quá quota, tự động fallback sang gemini-flash-lite-latest
      if (!res.ok && res.status === 429 && targetModel !== 'gemini-flash-lite-latest') {
        setDigitizeProgress('Model đạt giới hạn quota, tự động chuyển sang gemini-flash-lite-latest...');
        res = await requestDigitize('gemini-flash-lite-latest');
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message || `Lỗi Gemini API: HTTP ${res.status}`);
      }

      const resData = await res.json();
      const extractedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('AI không trích xuất được nội dung từ tài liệu. Vui lòng kiểm tra lại file.');
      }

      setDigitizeProgress('Đang lưu trữ dữ liệu tri thức vào IndexedDB trên máy...');

      const originalSize = selectedFile.size;
      const compressedSize = new Blob([extractedText]).size;

      const newDoc: KnowledgeDocument = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: docTitle.trim(),
        code: docCode.trim() || undefined,
        scope: docScope,
        assignedAgentIds: docScope === 'agent' ? docAssignedAgents : [],
        category: docCategory,
        issuedDate: docIssuedDate.trim() || undefined,
        originalFileName: selectedFile.name,
        originalSize,
        compressedSize,
        content: extractedText,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await saveDocument(newDoc);
      await loadDocs();

      setDigitizeSuccessDoc(newDoc);
      setSelectedFile(null);
      setFileBase64('');
      setDocTitle('');
      setDocCode('');
      setDocIssuedDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Lỗi số hóa:', err);
      setDigitizeError(err.message || 'Đã xảy ra lỗi trong quá trình số hóa.');
    } finally {
      setIsDigitizing(false);
      setDigitizeProgress('');
    }
  };

  // Toggle active
  const handleToggleActive = async (id: string) => {
    try {
      await toggleDocumentActive(id);
      await loadDocs();
    } catch (err) {
      console.error('Lỗi bật tắt tài liệu:', err);
    }
  };

  // Delete
  const handleDelete = async (doc: KnowledgeDocument) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài liệu "${doc.title}"?`)) {
      try {
        await deleteDocument(doc.id);
        await loadDocs();
        if (viewingDoc?.id === doc.id) setViewingDoc(null);
        if (assigningDoc?.id === doc.id) setAssigningDoc(null);
      } catch (err) {
        console.error('Lỗi xóa tài liệu:', err);
      }
    }
  };

  // Save quick assignment
  const handleSaveAssignment = async (scope: KnowledgeScope, agentIds: string[]) => {
    if (!assigningDoc) return;
    try {
      await assignDocumentScope(assigningDoc.id, scope, agentIds);
      await loadDocs();
      setAssigningDoc(null);
    } catch (err) {
      alert('Lỗi cập nhật gán Agent: ' + err);
    }
  };

  // Export
  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportDocumentsJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kho_tri_thuc_agent_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất dữ liệu: ' + err);
    }
  };

  // Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const jsonStr = reader.result as string;
        const count = await importDocumentsJson(jsonStr);
        alert(`Đã khôi phục thành công ${count} tài liệu vào Kho tri thức!`);
        await loadDocs();
        setViewMode('list');
      } catch (err: any) {
        alert('Lỗi nhập dữ liệu sao lưu: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtering logic
  const filteredDocs = documents.filter((doc) => {
    // 1. Filter by Scope / Agent
    if (selectedFilter === 'shared') {
      if (doc.scope !== 'shared') return false;
    } else if (selectedFilter !== 'all') {
      // Selected specific Agent ID: show docs assigned to this agent OR shared docs
      const isAssigned = doc.scope === 'agent' && doc.assignedAgentIds.includes(selectedFilter);
      if (!isAssigned) return false;
    }

    // 2. Filter by Category
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
      return false;
    }

    // 3. Filter by Active status
    if (statusFilter === 'active' && !doc.isActive) return false;
    if (statusFilter === 'inactive' && doc.isActive) return false;

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchCode = doc.code ? doc.code.toLowerCase().includes(q) : false;
      const matchCategory = doc.category ? doc.category.toLowerCase().includes(q) : false;
      if (!matchTitle && !matchCode && !matchCategory) return false;
    }

    return true;
  });

  // Calculate statistics
  const sharedDocsCount = documents.filter((d) => d.scope === 'shared').length;
  const agentSpecificDocsCount = documents.filter((d) => d.scope === 'agent').length;
  const totalActiveCount = documents.filter((d) => d.isActive).length;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getAgentById = (id: string) => allAgents.find((a) => a.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/10">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Trung Tâm Quản Lý Tri Thức (Knowledge Hub)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {documents.length} tài liệu ({sharedDocsCount} dùng chung, {agentSpecificDocsCount} theo Agent • {totalActiveCount} đang bật)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phân quyền tri thức chuyên biệt theo từng Agent hoặc Dùng chung toàn hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'upload' ? 'list' : 'upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                viewMode === 'upload'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {viewMode === 'upload' ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{viewMode === 'upload' ? 'Quay lại danh sách' : 'Tải lên & Số hóa mới'}</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'backup' ? 'list' : 'backup')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              title="Sao lưu / Khôi phục"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master-Detail Layout Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR: PHÂN LOẠI & BỘ LỌC KHOA HỌC */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3 flex flex-col gap-4 overflow-y-auto hidden md:flex shrink-0">
            {/* 1. Tổng quan & Dùng chung */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5">
                Phạm Vi Tri Thức
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedFilter('all');
                    setViewMode('list');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedFilter === 'all' && viewMode === 'list'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Tất cả tài liệu</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                    {documents.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setSelectedFilter('shared');
                    setViewMode('list');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedFilter === 'shared' && viewMode === 'list'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                    <span>🌍 Dùng chung mọi Agent</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                    {sharedDocsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Theo từng Agent */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5">
                Tri Thức Theo Agent
              </span>
              <div className="space-y-1">
                {allAgents.map((agent) => {
                  const agentDocsCount = documents.filter(
                    (d) => d.scope === 'agent' && d.assignedAgentIds.includes(agent.id)
                  ).length;
                  const isSelected = selectedFilter === agent.id && viewMode === 'list';

                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedFilter(agent.id);
                        setViewMode('list');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm shrink-0">{agent.avatar}</span>
                        <span className="truncate">{agent.name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                          agentDocsCount > 0
                            ? isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {agentDocsCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Lọc theo Danh mục */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5">
                Danh Mục
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-2.5 py-1 rounded-lg text-xs font-medium ${
                    selectedCategory === 'all'
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  • Tất cả danh mục
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-2.5 py-1 rounded-lg text-xs font-medium truncate ${
                      selectedCategory === cat
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    • {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT MAIN PANEL */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            {/* VIEW 1: DANH SÁCH TÀI LIỆU */}
            {viewMode === 'list' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & Sub-filters Bar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm tài liệu theo tên, số hiệu, danh mục..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đang tham chiếu</option>
                      <option value="inactive">Tạm tắt</option>
                    </select>
                  </div>

                  {/* Active scope indicator badge */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>Đang lọc:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {selectedFilter === 'all'
                        ? 'Tất cả'
                        : selectedFilter === 'shared'
                        ? '🌍 Dùng chung mọi Agent'
                        : `🤖 ${getAgentById(selectedFilter)?.name || selectedFilter}`}
                    </strong>
                    {selectedCategory !== 'all' && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                        {selectedCategory}
                      </span>
                    )}
                  </div>
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isLoadingDocs ? (
                    <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải danh sách tri thức...
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                      <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {searchQuery ? 'Không tìm thấy tài liệu phù hợp' : 'Chưa có tài liệu nào trong danh mục này'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                        Tải file PDF hoặc tài liệu văn bản lên để AI số hóa siêu nhẹ và gán riêng cho từng Agent hoặc dùng chung.
                      </p>
                      <button
                        onClick={() => setViewMode('upload')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                      >
                        + Tải lên & Số hóa tài liệu mới
                      </button>
                    </div>
                  ) : (
                    filteredDocs.map((doc) => {
                      const savingsPercent =
                        doc.originalSize > 0
                          ? Math.max(0, ((1 - doc.compressedSize / doc.originalSize) * 100)).toFixed(1)
                          : '0';

                      return (
                        <div
                          key={doc.id}
                          className={`p-4 rounded-xl border transition-all ${
                            doc.isActive
                              ? 'bg-slate-50/70 dark:bg-slate-900/70 border-indigo-300 dark:border-indigo-800/80 shadow-xs'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Title, Code & Badges */}
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                {doc.code && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                    {doc.code}
                                  </span>
                                )}

                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {doc.title}
                                </h3>

                                {/* Scope Badge */}
                                {doc.scope === 'shared' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    <span>Dùng chung mọi Agent</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>Riêng cho {doc.assignedAgentIds.length} Agent</span>
                                  </span>
                                )}

                                {doc.category && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {doc.category}
                                  </span>
                                )}
                              </div>

                              {/* Assigned Agents Tag List */}
                              {doc.scope === 'agent' && doc.assignedAgentIds.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap my-2">
                                  <span className="text-[11px] text-slate-400 font-medium">Gán cho:</span>
                                  {doc.assignedAgentIds.map((agId) => {
                                    const ag = getAgentById(agId);
                                    if (!ag) return null;
                                    return (
                                      <span
                                        key={ag.id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold"
                                      >
                                        <span>{ag.avatar}</span>
                                        <span>{ag.name}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* File Size & Meta Info */}
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap mt-1">
                                <span>Tệp gốc: {doc.originalFileName}</span>
                                <span>•</span>
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  Dung lượng số hóa: {formatBytes(doc.compressedSize)}
                                </span>
                                {doc.originalSize > 0 && (
                                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                    Gốc: {formatBytes(doc.originalSize)} (Giảm {savingsPercent}%)
                                  </span>
                                )}
                                <span>•</span>
                                <span>{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                              </div>
                            </div>

                            {/* Actions Right */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Quick Re-assign Agent Button */}
                              <button
                                onClick={() => setAssigningDoc(doc)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                title="Đổi quyền gán cho Agent"
                              >
                                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span className="hidden sm:inline">Phân quyền</span>
                              </button>

                              {/* Toggle active button */}
                              <button
                                onClick={() => handleToggleActive(doc.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                  doc.isActive
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                                title={doc.isActive ? 'Bấm để tắt tham chiếu' : 'Bấm để bật tham chiếu khi chat'}
                              >
                                {doc.isActive ? <Check className="w-3.5 h-3.5" /> : null}
                                <span>{doc.isActive ? 'Đang bật' : 'Đang tắt'}</span>
                              </button>

                              {/* View preview button */}
                              <button
                                onClick={() => setViewingDoc(doc)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Xem toàn văn số hóa"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDelete(doc)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Xóa tài liệu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: TẢI LÊN & SỐ HÓA TRI THỨC MỚI */}
            {viewMode === 'upload' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Success celebration card */}
                {digitizeSuccessDoc && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Số hóa thành công! Đã lưu vào Kho tri thức</span>
                    </div>
                    <p className="text-xs">
                      Tài liệu <strong>"{digitizeSuccessDoc.title}"</strong> đã được chuyển đổi thành Markdown siêu nhẹ (
                      {formatBytes(digitizeSuccessDoc.compressedSize)} thay vì {formatBytes(digitizeSuccessDoc.originalSize)}
                      ). 
                      Phạm vi: <strong>{digitizeSuccessDoc.scope === 'shared' ? 'Dùng chung cho mọi Agent' : `Gán riêng cho ${digitizeSuccessDoc.assignedAgentIds.length} Agent`}</strong>.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setViewingDoc(digitizeSuccessDoc)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        Xem bản số hóa
                      </button>
                      <button
                        onClick={() => {
                          setDigitizeSuccessDoc(null);
                          setViewMode('list');
                        }}
                        className="px-3 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Về danh sách tri thức
                      </button>
                    </div>
                  </div>
                )}

                {/* Error alert */}
                {digitizeError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Lỗi số hóa:</strong> {digitizeError}
                    </div>
                  </div>
                )}

                {/* File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,text/plain,text/markdown"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-10 h-10 mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Đã chọn: {selectedFile.name}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                        Kích thước: {formatBytes(selectedFile.size)} • Nhấp để đổi tệp khác
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Chọn hoặc kéo thả file PDF văn bản luật / tài liệu vào đây
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Hỗ trợ PDF (kể cả bản scan công báo), TXT, Markdown. Tối đa 25MB.
                      </p>
                    </div>
                  )}
                </div>

                {/* Metadata & Scope Selection */}
                {selectedFile && (
                  <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tên tài liệu tri thức <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          placeholder="Ví dụ: Nghị định 70/2025/NĐ-CP Quy định về hóa đơn, chứng từ"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Số hiệu / Mã tài liệu
                        </label>
                        <input
                          type="text"
                          value={docCode}
                          onChange={(e) => setDocCode(e.target.value)}
                          placeholder="Ví dụ: 70/2025/NĐ-CP"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Danh mục
                        </label>
                        <select
                          value={docCategory}
                          onChange={(e) => setDocCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none cursor-pointer"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scope Config: Shared vs Agent-specific */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        Phạm vi sử dụng tài liệu:
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            docScope === 'shared'
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name="docScope"
                            checked={docScope === 'shared'}
                            onChange={() => setDocScope('shared')}
                            className="mt-0.5 text-emerald-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-emerald-600" />
                              Dùng chung cho MỌI Agent
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Tất cả các Agent khi trò chuyện đều tự động được tham chiếu tài liệu này.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            docScope === 'agent'
                              ? 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name="docScope"
                            checked={docScope === 'agent'}
                            onChange={() => setDocScope('agent')}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-purple-600" />
                              Gán riêng cho Agent cụ thể
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Chỉ những Agent được tick chọn mới có quyền truy cập tri thức này.
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* If Agent-specific: Checkboxes list */}
                      {docScope === 'agent' && (
                        <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-2 mt-2">
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                            Chọn các Agent được sử dụng tài liệu này:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {allAgents.map((ag) => {
                              const isChecked = docAssignedAgents.includes(ag.id);
                              return (
                                <label
                                  key={ag.id}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setDocAssignedAgents((prev) => [...prev, ag.id]);
                                      } else {
                                        setDocAssignedAgents((prev) => prev.filter((id) => id !== ag.id));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                                  />
                                  <span>{ag.avatar}</span>
                                  <span className="font-semibold truncate text-slate-800 dark:text-slate-200">
                                    {ag.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Progress & Start Button */}
                {isDigitizing ? (
                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
                    <p className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200">
                      {digitizeProgress || 'AI đang xử lý số hóa tài liệu...'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Quá trình bóc tách và nén Markdown siêu nhẹ chỉ chạy 1 lần duy nhất. Vui lòng đợi trong giây lát...
                    </p>
                  </div>
                ) : (
                  <button
                    disabled={!selectedFile || !docTitle.trim()}
                    onClick={handleStartDigitize}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>🚀 Bắt đầu Số hóa & Lưu vào Kho Tri Thức</span>
                  </button>
                )}
              </div>
            )}

            {/* VIEW 3: SAO LƯU & KHÔI PHỤC */}
            {viewMode === 'backup' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-600" />
                    Xuất bản sao lưu toàn bộ Kho Tri Thức (Backup JSON)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tải toàn bộ các tài liệu đã số hóa (bao gồm cả phân quyền riêng theo Agent và dùng chung) về dưới dạng tệp JSON. Bạn có thể lưu giữ hoặc chuyển sang máy tính/điện thoại khác mà không cần nạp lại.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    disabled={documents.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải file sao lưu ({documents.length} tài liệu)</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Khôi phục từ tệp sao lưu JSON
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Nhập tệp sao lưu JSON đã tải về trước đó để đồng bộ kho tri thức vào trình duyệt hiện tại.
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Chọn tệp sao lưu JSON để nạp</span>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
                  <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Đồng bộ 5 Nghị Định Luật Thuế & Hóa Đơn Chuẩn (Có sẵn)
                  </h3>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    Khôi phục hoặc nạp sẵn toàn bộ 5 Nghị định chuẩn vào hệ thống: NĐ 123/2020/NĐ-CP, NĐ 70/2025/NĐ-CP, NĐ 254/2026/NĐ-CP, NĐ 15/2022/NĐ-CP, NĐ 41/2022/NĐ-CP. Đã được nén tối ưu ~99% và gán sẵn cho "Cố Vấn Luật Kế Toán & Thuế".
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const count = await seedDefaultKnowledge();
                        await loadDocs();
                        alert(`🎉 Đã nạp thành công ${count} Nghị định luật thuế & hóa đơn vào hệ thống!`);
                      } catch (err: any) {
                        alert('Lỗi nạp tri thức: ' + (err.message || err));
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Nạp / Khôi phục 5 Nghị Định Chuẩn Ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Dữ liệu tri thức được lưu trữ bảo mật cục bộ trong IndexedDB của trình duyệt máy bạn.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* QUICK ASSIGN AGENT MODAL */}
      {assigningDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Phân quyền tri thức cho Agent</span>
              </h3>
              <button
                onClick={() => setAssigningDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Tài liệu: <strong className="text-slate-900 dark:text-slate-100">{assigningDoc.title}</strong>
            </p>

            {/* Scope Radios */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="quickScope"
                  checked={assigningDoc.scope === 'shared'}
                  onChange={() => setAssigningDoc({ ...assigningDoc, scope: 'shared' })}
                  className="text-emerald-600"
                />
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Dùng chung cho MỌI Agent
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="quickScope"
                  checked={assigningDoc.scope === 'agent'}
                  onChange={() => setAssigningDoc({ ...assigningDoc, scope: 'agent' })}
                  className="text-purple-600"
                />
                <Users className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Gán riêng cho Agent cụ thể
                </span>
              </label>
            </div>

            {/* Checkboxes if agent */}
            {assigningDoc.scope === 'agent' && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                {allAgents.map((ag) => {
                  const isChecked = assigningDoc.assignedAgentIds.includes(ag.id);
                  return (
                    <label
                      key={ag.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...assigningDoc.assignedAgentIds, ag.id]
                            : assigningDoc.assignedAgentIds.filter((id) => id !== ag.id);
                          setAssigningDoc({ ...assigningDoc, assignedAgentIds: next });
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>{ag.avatar}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{ag.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAssigningDoc(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleSaveAssignment(assigningDoc.scope, assigningDoc.assignedAgentIds)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READING PREVIEW MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {viewingDoc.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingDoc.code ? `Số hiệu: ${viewingDoc.code} • ` : ''}
                  Phạm vi: {viewingDoc.scope === 'shared' ? 'Dùng chung' : `Riêng cho ${viewingDoc.assignedAgentIds.length} Agent`} • 
                  Dung lượng số hóa: {formatBytes(viewingDoc.compressedSize)}
                </p>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
              <MarkdownRenderer content={viewingDoc.content} />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end shrink-0">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
