import React from 'react';
import {
  Sparkles,
  Code,
  FileJson,
  Languages,
  BrainCircuit,
  ArrowRight,
} from './icons';
import type { ApiConfig } from '../types';

interface PresetsTabProps {
  config: ApiConfig;
  onSelectPreset: (promptText: string, suggestedConfig?: Partial<ApiConfig>) => void;
}

const PRESETS = [
  {
    id: 'legal_invoice_timing',
    title: '⚖️ Tình Huống Ad-hoc: Xuất Hóa Đơn Khách Nợ Tiền',
    category: 'Luật & Kế toán',
    icon: FileJson,
    color: 'from-blue-600 to-indigo-700',
    description: 'Tư vấn pháp luật về thời điểm xuất hóa đơn khi khách hàng trả tiền chậm sang tháng sau, tránh mức phạt NĐ 125/2020 và tối ưu công nợ.',
    prompt:
      'Tình huống thực tế cho chủ doanh nghiệp: Doanh nghiệp của tôi bán lô hàng trị giá 150 triệu đồng đã giao hàng và lập biên bản bàn giao nghiệm thu ngày 25/08, nhưng theo hợp đồng đối tác sẽ thanh toán vào ngày 10/09 (tháng sau). Kế toán muốn chờ tiền về tài khoản mới xuất hóa đơn điện tử. Xin chuyên gia và luật sư tư vấn:\n1. Kế toán làm vậy có vi phạm quy định về thời điểm lập hóa đơn không?\n2. Mức phạt tiền theo Nghị định 125/2020/NĐ-CP là bao nhiêu?\n3. Có giải pháp nào vừa tuân thủ 100% pháp luật, vừa có lợi nhất cho quản lý dòng tiền và công nợ của doanh nghiệp?\nTrích dẫn đầy đủ điều, khoản tại Nghị định 123/2020/NĐ-CP, Thông tư 78/2021/TT-BTC và Nghị định 125/2020/NĐ-CP để đối chiếu.',
    config: { model: 'gemini-3.6-flash', streaming: true, temperature: 0.1 },
  },
  {
    id: 'legal_invoice_errors',
    title: '📝 Xử Lý Hóa Đơn Sai Sót (Điều Chỉnh vs Thay Thế)',
    category: 'Luật & Kế toán',
    icon: FileJson,
    color: 'from-amber-600 to-rose-600',
    description: 'Tư vấn lựa chọn lập Hóa đơn Điều chỉnh hay Hóa đơn Thay thế khi phát hiện sai đơn giá/thành tiền theo Điều 19 NĐ 123 và TT 78.',
    prompt:
      'Tình huống: Doanh nghiệp tôi đã xuất hóa đơn điện tử có mã của cơ quan thuế gửi cho khách hàng, sau đó phát hiện bị sai đơn giá và thành tiền (tăng thêm 20 triệu đồng). Xin chuyên gia tư vấn chi tiết:\n1. Trường hợp này nên chọn lập Hóa đơn Điều chỉnh hay Hóa đơn Thay thế thì thuận tiện và an toàn nhất cho cả người bán lẫn người mua?\n2. Có bắt buộc phải lập biên bản thỏa thuận giữa hai bên không?\n3. Thủ tục gửi Mẫu 04/SS-HĐĐT lên cơ quan thuế được quy định như thế nào?\nTrích dẫn rõ Điều, Khoản cụ thể tại Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC.',
    config: { model: 'gemini-3.6-flash', streaming: true, temperature: 0.1 },
  },
  {
    id: 'ocr_doc',
    title: '📄 OCR & Phân Tích Tài Liệu / Hóa Đơn',
    category: 'Thị giác / OCR',
    icon: FileJson,
    color: 'from-indigo-500 to-blue-600',
    description: 'Yêu cầu Gemini OCR nhận diện chữ, bảng biểu và thông tin từ ảnh chụp hoặc file PDF đính kèm.',
    prompt: 'Hãy OCR toàn bộ văn bản trong tài liệu đính kèm, trích xuất các trường dữ liệu quan trọng và định dạng thành bảng Markdown rõ ràng.',
    config: { model: 'gemini-flash-lite-latest', streaming: true, temperature: 0.2 },
  },
  {
    id: 'fast_test',
    title: '⚡ Thử Nghiệm Siêu Tốc (Fast Mode ~1s)',
    category: 'Tốc độ cao',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-500',
    description: 'Sử dụng model gemini-flash-lite-latest kết hợp Streaming SSE để trải nghiệm tốc độ phản hồi tức thì.',
    prompt: 'Giải thích cơ chế hoạt động của trí tuệ nhân tạo (AI) trong 2 câu ngắn.',
    config: { model: 'gemini-flash-lite-latest', streaming: true, temperature: 0.5 },
  },
  {
    id: 'user_curl',
    title: 'Mẫu cURL Gốc (Explain AI)',
    category: 'Cơ bản',
    icon: Sparkles,
    color: 'from-blue-500 to-cyan-500',
    description: 'Prompt chính xác từ lệnh cURL bạn đã cung cấp để kiểm tra phản hồi từ mô hình.',
    prompt: 'Explain how AI works in a few words',
    config: { temperature: 0.7, topP: 0.95 },
  },
  {
    id: 'code_gen',
    title: 'Sinh Code & Thuật toán',
    category: 'Lập trình',
    icon: Code,
    color: 'from-emerald-500 to-teal-500',
    description: 'Yêu cầu viết thuật toán kèm giải thích và xử lý ngoại lệ chuẩn production.',
    prompt:
      'Viết một script Python hoàn chỉnh dùng requests để gọi Gemini API v1beta, xử lý retry khi bị rate limit và in ra token usage.',
    config: { temperature: 0.2, topP: 0.8 },
  },
  {
    id: 'json_extraction',
    title: 'Trích xuất JSON có cấu trúc',
    category: 'Dữ liệu',
    icon: FileJson,
    color: 'from-violet-500 to-purple-500',
    description: 'Kiểm tra khả năng xuất dữ liệu dạng JSON thuần túy để tích hợp vào ứng dụng backend.',
    prompt:
      'Hãy phân tích đoạn văn sau và trả về DUY NHẤT một JSON hợp lệ dạng: {"title": string, "tags": string[], "sentiment": "positive"|"negative"|"neutral"}\n\nĐoạn văn: "Gemini Flash mang lại tốc độ cực nhanh với chi phí rất tiết kiệm, giúp việc tích hợp AI vào sản phẩm mượt mà hơn bao giờ hết."',
    config: { temperature: 0.1 },
  },
  {
    id: 'translation',
    title: 'Dịch thuật Đa ngữ & Bản địa hóa',
    category: 'Ngôn ngữ',
    icon: Languages,
    color: 'from-pink-500 to-rose-500',
    description: 'Thử nghiệm khả năng dịch tự nhiên, chuẩn văn phong tiếng Việt chuyên ngành công nghệ.',
    prompt:
      'Dịch đoạn văn sau sang tiếng Việt chuẩn văn phong IT, giữ nguyên thuật ngữ kỹ thuật khi cần: "Large language models leverage transformer architectures with multi-head self-attention mechanisms to predict the next token sequence with high contextual awareness."',
    config: { temperature: 0.3 },
  },
  {
    id: 'reasoning',
    title: 'Tư duy Logic & Giải quyết vấn đề',
    category: 'Suy luận',
    icon: BrainCircuit,
    color: 'from-blue-600 to-indigo-600',
    description: 'Đặt câu đố tư duy logic từng bước (Chain-of-Thought) để đánh giá chiều sâu của mô hình.',
    prompt:
      'Một người đàn ông có 1 con cáo, 1 con vịt và 1 túi ngũ cốc. Anh ta cần qua một con sông bằng chiếc thuyền chỉ chở được anh ta và một thứ khác. Nếu để cáo và vịt ở cùng nhau không có anh ta, cáo sẽ ăn vịt. Nếu để vịt và ngũ cốc ở cùng nhau, vịt sẽ ăn ngũ cốc. Làm thế nào để đưa tất cả qua sông an toàn? Hãy giải thích từng bước.',
    config: { temperature: 0.4 },
  },
];

export const PresetsTab: React.FC<PresetsTabProps> = ({ onSelectPreset }) => {
  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Mẫu Prompt Kiểm Thử Sẵn Có (Presets & Test Cases)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chọn một mẫu bên dưới để nạp nhanh prompt và thông số tối ưu vào phiên kiểm thử của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <div
                key={preset.id}
                className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {preset.category}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.color} p-[1px] shadow-sm`}
                    >
                      <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[7px] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {preset.description}
                  </p>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 italic line-clamp-2">
                    "{preset.prompt}"
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Model: {preset.config.model || 'Hiện tại'}
                  </span>
                  <button
                    onClick={() => onSelectPreset(preset.prompt, preset.config)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-200 dark:border-blue-500/30 hover:border-transparent text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Thử ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
