import React, { useState } from 'react';
import { X, FileText, Download, ExternalLink, Search, Check, ShieldCheck, Sparkles, Eye } from './icons';
import { OFFICIAL_REFERENCE_DOCUMENTS, type ReferenceDocument } from '../data/referenceDocuments';

interface ReferenceDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceDocumentsModal: React.FC<ReferenceDocumentsModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredDocs = OFFICIAL_REFERENCE_DOCUMENTS.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.code.toLowerCase().includes(q) ||
      doc.summary.toLowerCase().includes(q) ||
      doc.keywords.some((kw) => kw.includes(q))
    );
  });

  const handleCopyLink = (doc: ReferenceDocument) => {
    const fullUrl = window.location.origin + doc.fileUrl;
    navigator.clipboard.writeText(fullUrl);
    setCopiedDocId(doc.id);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Kho Văn Bản Gốc Tra Cứu & Đối Chiếu</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                  {OFFICIAL_REFERENCE_DOCUMENTS.length} Văn bản
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Nguồn tài liệu gốc chính thức dùng để dẫn reference cho từng dòng trả lời của AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Guidance Filter */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 shrink-0 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo số hiệu nghị định (70/2025, 123/2020), máy tính tiền, sai sót..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Đã lưu trữ trực tiếp trên hệ thống - Cho phép mở xem ngay hoặc tải về không phụ thuộc trang ngoài.</span>
          </div>
        </div>

        {/* Document List */}
        <div className="p-4 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="pt-3 first:pt-0 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {doc.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        doc.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {doc.statusLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      ({doc.fileType.toUpperCase()} • {doc.fileSize})
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {doc.summary}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                    title="Mở file gốc trong tab mới"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem file gốc</span>
                  </a>

                  <a
                    href={doc.fileUrl}
                    download={doc.fileName}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                    title="Tải file gốc về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(doc)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                    title="Sao chép đường link tham chiếu"
                  >
                    {copiedDocId === doc.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Không tìm thấy văn bản pháp luật phù hợp với từ khóa "{searchQuery}".
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Bấm vào link tham chiếu bất kỳ trong câu trả lời của AI để nhảy trực tiếp tới văn bản.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
