import React, { useState, useEffect } from 'react';
import { X, Check, ThumbsDown, Edit3, Sparkles, MessageSquare } from './icons';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'dislike' | 'edit';
  messageId: string;
  userQuery: string;
  originalAnswer: string;
  agentName: string;
  onSaveFeedback: (data: {
    type: 'like' | 'dislike';
    reason?: string;
    comment?: string;
    correctedContent?: string;
    isGoldenExample?: boolean;
  }) => void;
}

const DISLIKE_REASONS = [
  'Trích dẫn văn bản/nghị định cũ hoặc sai điều khoản',
  'Câu trả lời chưa đúng trọng tâm câu hỏi',
  'Số liệu, mức phạt hoặc tính toán chưa chuẩn xác',
  'Văn phong chưa phù hợp hoặc quá dài dòng',
  'Lỗi thông tin hoặc ảo giác (hallucination)',
  'Lý do khác',
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  mode,
  userQuery,
  originalAnswer,
  agentName,
  onSaveFeedback,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(DISLIKE_REASONS[0]);
  const [comment, setComment] = useState<string>('');
  const [correctedText, setCorrectedText] = useState<string>(originalAnswer);
  const [saveAsGolden, setSaveAsGolden] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setCorrectedText(originalAnswer);
      setSelectedReason(DISLIKE_REASONS[0]);
      setComment('');
      setSaveAsGolden(true);
    }
  }, [isOpen, originalAnswer]);

  if (!isOpen) return null;

  const handleSubmitDislike = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFeedback({
      type: 'dislike',
      reason: selectedReason,
      comment: comment.trim() || undefined,
    });
    onClose();
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalClean = correctedText.trim();
    if (!finalClean) return;

    onSaveFeedback({
      type: 'like', // An edited answer accepted by the user is treated as a golden positive example
      correctedContent: finalClean,
      isGoldenExample: saveAsGolden,
      comment: comment.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            {mode === 'dislike' ? (
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ThumbsDown className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Edit3 className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {mode === 'dislike'
                  ? 'Góp Ý Câu Trả Lời Chưa Chuẩn Xác'
                  : 'Hiệu Chỉnh & Huấn Luyện Mẫu Chuẩn Cho AI'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Agent: <span className="font-semibold text-slate-700 dark:text-slate-300">{agentName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* User Query summary */}
          {userQuery && (
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>Câu hỏi của bạn:</span>
              </span>
              <p className="text-slate-800 dark:text-slate-200 line-clamp-2 italic">
                "{userQuery}"
              </p>
            </div>
          )}

          {mode === 'dislike' ? (
            <form onSubmit={handleSubmitDislike} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Vui lòng chọn lý do câu trả lời chưa đạt:
                </label>
                <div className="space-y-2">
                  {DISLIKE_REASONS.map((r, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedReason === r
                          ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-medium'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dislikeReason"
                        checked={selectedReason === r}
                        onChange={() => setSelectedReason(r)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ghi chú chi tiết thêm (không bắt buộc):
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Ví dụ: Theo Nghị định 70/2025 thì quy định này đã được sửa đổi tại Điều 9..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Gửi Phản Hồi
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sửa nội dung câu trả lời cho chuẩn xác 100%:
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Hỗ trợ định dạng Markdown
                  </span>
                </div>
                <textarea
                  value={correctedText}
                  onChange={(e) => setCorrectedText(e.target.value)}
                  rows={10}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-y leading-relaxed"
                  placeholder="Nhập nội dung câu trả lời chuẩn mực..."
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsGolden}
                    onChange={(e) => setSaveAsGolden(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lưu làm Mẫu Chuẩn (Few-Shot Golden Example) cho Agent này</span>
                    </span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      AI sẽ học tập câu trả lời đã chỉnh sửa này để tự động trả lời chính xác, chuẩn văn phong và điều khoản cho các câu hỏi tương tự sau này!
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú hiệu chỉnh (tùy chọn):
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ví dụ: Quy định thời điểm xuất hóa đơn theo NĐ 70/2025..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!correctedText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu & Cập Nhật</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
