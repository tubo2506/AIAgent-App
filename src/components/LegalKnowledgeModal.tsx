import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Scale,
  UploadCloud,
  FileText,
  Trash2,
  Check,
  X,
  Search,
  Sparkles,
  Download,
  Upload,
  AlertCircle,
  Eye,
  RefreshCw,
} from './icons';
import type { ApiConfig, LegalDocument } from '../types';
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  toggleDocumentActive,
  exportDocumentsJson,
  importDocumentsJson,
} from '../services/legalKnowledgeDb';
import { MarkdownRenderer } from './MarkdownRenderer';

interface LegalKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onDocumentsUpdated?: () => void;
}

export const LegalKnowledgeModal: React.FC<LegalKnowledgeModalProps> = ({
  isOpen,
  onClose,
  config,
  onDocumentsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'list' | 'backup'>('list');
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Upload & Digitization state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [docTitle, setDocTitle] = useState('');
  const [docCode, setDocCode] = useState('');
  const [docIssuedDate, setDocIssuedDate] = useState('');
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [digitizeProgress, setDigitizeProgress] = useState('');
  const [digitizeError, setDigitizeError] = useState<string | null>(null);
  const [digitizeSuccessDoc, setDigitizeSuccessDoc] = useState<LegalDocument | null>(null);

  // Document Reading Preview
  const [viewingDoc, setViewingDoc] = useState<LegalDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents when modal opens
  const loadDocs = async () => {
    setIsLoadingDocs(true);
    try {
      const docs = await getAllDocuments();
      setDocuments(docs);
      onDocumentsUpdated?.();
    } catch (err) {
      console.error('Lỗi nạp văn bản từ DB:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocs();
      setDigitizeError(null);
      setDigitizeSuccessDoc(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // File selection handler
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

    // Tự động gợi ý tên văn bản từ tên file
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setDocTitle(cleanName);

    // Tự động tìm số hiệu nếu có trong tên file (ví dụ: 123-2020 hoặc 123_2020)
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

  // Run AI Digitization
  const handleStartDigitize = async () => {
    if (!selectedFile || !fileBase64) {
      alert('Vui lòng chọn một tệp PDF hoặc văn bản trước.');
      return;
    }
    if (!docTitle.trim()) {
      alert('Vui lòng nhập Tên văn bản.');
      return;
    }

    if (!config.apiKey) {
      alert('Chưa có API Key Gemini. Vui lòng vào mục Cài đặt để cấu hình API Key.');
      return;
    }

    setIsDigitizing(true);
    setDigitizeError(null);
    setDigitizeProgress('Đang gửi văn bản sang Gemini AI để đọc và phân tích cấu trúc...');

    try {
      // Chuẩn bị payload Gemini gọi trực tiếp
      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf');
      const mimeType = isPdf ? 'application/pdf' : (selectedFile.type || 'text/plain');

      const digitizationPrompt = `Bạn là chuyên gia số hóa và hệ thống hóa văn bản quy phạm pháp luật Việt Nam.
Nhiệm vụ: Hãy đọc toàn bộ văn bản/tài liệu đính kèm này và trích xuất thành văn bản thuần có cấu trúc Markdown chuẩn, bảo đảm 100% nội dung pháp lý.

Yêu cầu nghiêm ngặt:
1. Bóc tách rõ phần đầu: Tên văn bản, Số hiệu, Cơ quan ban hành, Ngày ký ban hành, Người ký (nếu có).
2. Giữ nguyên vẹn 100% nội dung của tất cả các Chương, Mục, Điều, Khoản, Điểm. Tuyệt đối KHÔNG được tóm tắt lược bỏ nội dung quy định.
3. Bỏ qua các thành phần rác: số trang, tiêu đề đầu trang lặp lại (header/footer), dấu giáp lai, lời dặn in ấn.
4. Định dạng Markdown rõ ràng với tiêu đề ## Điều 1..., ### Khoản 1...
5. Đầu ra CHỈ TRẢ VỀ nội dung văn bản số hóa, không thêm lời chào hay bình luận mở đầu/kết thúc.`;

      setDigitizeProgress('AI đang trích xuất các Chương, Điều, Khoản và nén sang Markdown siêu nhẹ...');

      // Sử dụng gemini-2.5-flash hoặc model hiện tại
      const targetModel = config.model.includes('flash') ? config.model : 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${config.apiKey}`;

      const res = await fetch(endpoint, {
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
            temperature: 0.1, // Nhiệt độ thấp để chính xác 100% từng từ luật
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message || `Lỗi từ Gemini API: HTTP ${res.status}`);
      }

      const resData = await res.json();
      const extractedText =
        resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('AI không trích xuất được nội dung chữ từ tài liệu. Vui lòng kiểm tra lại file.');
      }

      setDigitizeProgress('Đang lưu trữ dữ liệu số hóa vào cơ sở dữ liệu trên máy...');

      const originalSize = selectedFile.size;
      const compressedSize = new Blob([extractedText]).size;

      const newDoc: LegalDocument = {
        id: 'legaldoc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: docTitle.trim(),
        code: docCode.trim() || undefined,
        issuedDate: docIssuedDate.trim() || undefined,
        originalFileName: selectedFile.name,
        originalSize,
        compressedSize,
        content: extractedText,
        isActive: true, // Mặc định kích hoạt tham chiếu ngay
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
      console.error('Lỗi số hóa văn bản:', err);
      setDigitizeError(err.message || 'Đã xảy ra lỗi trong quá trình số hóa.');
    } finally {
      setIsDigitizing(false);
      setDigitizeProgress('');
    }
  };

  // Toggle active document
  const handleToggleActive = async (id: string) => {
    try {
      await toggleDocumentActive(id);
      await loadDocs();
    } catch (err) {
      console.error('Lỗi bật tắt văn bản:', err);
    }
  };

  // Delete document
  const handleDelete = async (doc: LegalDocument) => {
    if (confirm(`Bạn có chắc chắn muốn xóa văn bản "${doc.title}" khỏi kho tri thức?`)) {
      try {
        await deleteDocument(doc.id);
        await loadDocs();
        if (viewingDoc?.id === doc.id) setViewingDoc(null);
      } catch (err) {
        console.error('Lỗi xóa văn bản:', err);
      }
    }
  };

  // Export JSON backup
  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportDocumentsJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kho_van_ban_luat_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất dữ liệu sao lưu: ' + err);
    }
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const jsonStr = reader.result as string;
        const count = await importDocumentsJson(jsonStr);
        alert(`Đã khôi phục thành công ${count} văn bản vào kho!`);
        await loadDocs();
        setActiveTab('list');
      } catch (err: any) {
        alert('Lỗi nhập dữ liệu sao lưu: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeCount = documents.filter((d) => d.isActive).length;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-amber-500/10">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Kho Văn Bản Luật & Số Hóa Siêu Nhẹ
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                  {documents.length} văn bản ({activeCount} đang bật)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Số hóa PDF văn bản luật thành Markdown gọn nhẹ (tiết kiệm 99% dung lượng), lưu vĩnh viễn trên máy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Kho văn bản đã lưu ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Tải lên & Số hóa PDF mới</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Sao lưu & Khôi phục</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: DANH SÁCH VĂN BẢN */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên nghị định, thông tư, số hiệu (ví dụ: 123/2020)..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs sm:text-sm hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>+ Thêm văn bản mới</span>
                </button>
              </div>

              {/* Instructions banner */}
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Cách hoạt động:</strong> Bật công tắc <strong>"Tham chiếu"</strong> ở văn bản bạn muốn AI sử dụng. 
                  Mỗi khi bạn hỏi trong khung chat, hệ thống sẽ tự động đối chiếu nội dung số hóa siêu nhẹ (~vài chục KB) của văn bản đó để đưa ra câu trả lời chuẩn xác 100% theo từng Điều, Khoản!
                </p>
              </div>

              {/* Document List */}
              {isLoadingDocs ? (
                <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải danh sách văn bản...
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'Không tìm thấy văn bản phù hợp' : 'Kho văn bản luật hiện đang trống'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                    Tải file PDF nghị định, thông tư lên để AI số hóa thành bản văn bản nhẹ và lưu vĩnh viễn trên máy.
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                  >
                    + Tải lên và Số hóa văn bản đầu tiên
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredDocs.map((doc) => {
                    const savingsPercent = doc.originalSize > 0
                      ? Math.max(0, ((1 - doc.compressedSize / doc.originalSize) * 100)).toFixed(1)
                      : '0';

                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border transition-all ${
                          doc.isActive
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800/80 shadow-xs'
                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {doc.code && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                  {doc.code}
                                </span>
                              )}
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {doc.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              <span>Tệp gốc: {doc.originalFileName}</span>
                              <span>•</span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                Dung lượng số hóa: {formatBytes(doc.compressedSize)}
                              </span>
                              {doc.originalSize > 0 && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                  Gốc: {formatBytes(doc.originalSize)} (Giảm {savingsPercent}%)
                                </span>
                              )}
                              <span>•</span>
                              <span>{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
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
                              <span>{doc.isActive ? 'Đang tham chiếu' : 'Đang tắt'}</span>
                            </button>

                            {/* View preview button */}
                            <button
                              onClick={() => setViewingDoc(doc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Xem toàn văn số hóa"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Xóa văn bản"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TẢI LÊN & SỐ HÓA MỚI */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Success celebration card */}
              {digitizeSuccessDoc && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Số hóa thành công! Đã lưu vào Kho tri thức</span>
                  </div>
                  <p className="text-xs">
                    Văn bản <strong>"{digitizeSuccessDoc.title}"</strong> đã được chuyển đổi thành Markdown siêu nhẹ (
                    {formatBytes(digitizeSuccessDoc.compressedSize)} thay vì {formatBytes(digitizeSuccessDoc.originalSize)}
                    ). Hệ thống đã tự động bật tham chiếu cho văn bản này khi bạn trò chuyện!
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setViewingDoc(digitizeSuccessDoc)}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      Xem bản số hóa
                    </button>
                    <button
                      onClick={() => {
                        setDigitizeSuccessDoc(null);
                        setActiveTab('list');
                      }}
                      className="px-3 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                    >
                      Về danh sách văn bản
                    </button>
                  </div>
                </div>
              )}

              {/* Error message */}
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
                      Kích thước: {formatBytes(selectedFile.size)} • Nhấp để đổi file khác
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Chọn hoặc kéo thả file PDF văn bản luật vào đây
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Hỗ trợ PDF (kể cả bản scan gazette), TXT, Markdown. Tối đa 25MB.
                    </p>
                  </div>
                )}
              </div>

              {/* Meta Inputs */}
              {selectedFile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tên văn bản luật <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Ví dụ: Nghị định 123/2020/NĐ-CP Quy định về hóa đơn, chứng từ"
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Số hiệu văn bản (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={docCode}
                      onChange={(e) => setDocCode(e.target.value)}
                      placeholder="Ví dụ: 123/2020/NĐ-CP"
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ngày ban hành / có hiệu lực (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={docIssuedDate}
                      onChange={(e) => setDocIssuedDate(e.target.value)}
                      placeholder="Ví dụ: 19/10/2020 hoặc 01/07/2022"
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Digitization Progress & Start Button */}
              {isDigitizing ? (
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200">
                    {digitizeProgress || 'AI đang tiến hành số hóa tài liệu...'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Quá trình này chỉ thực hiện 1 lần duy nhất để tạo bản Markdown siêu nhẹ. Vui lòng đợi trong giây lát...
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

          {/* TAB 3: SAO LƯU & KHÔI PHỤC */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  Xuất bản sao lưu (Backup JSON)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tải toàn bộ các văn bản luật đã số hóa trên máy này về dưới dạng tệp JSON. Bạn có thể lưu giữ hoặc chuyển sang máy tính/điện thoại khác mà không cần số hóa lại.
                </p>
                <button
                  onClick={handleExportBackup}
                  disabled={documents.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải file sao lưu (.json)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Khôi phục từ tệp sao lưu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nhập tệp sao lưu JSON đã tải về trước đó để đồng bộ kho văn bản luật vào trình duyệt hiện tại.
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Dữ liệu được lưu trữ an toàn trong IndexedDB của trình duyệt máy bạn.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Viewing / Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {viewingDoc.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingDoc.code ? `Số hiệu: ${viewingDoc.code} • ` : ''}Dung lượng số hóa: {formatBytes(viewingDoc.compressedSize)}
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
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
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
