import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Code,
  FileJson,
  BrainCircuit,
  ArrowRight,
  Search,
  Copy,
  Check,
  FileText,
  TrendingUp,
  Award,
  Zap,
  Bot,
} from './icons';
import type { ApiConfig } from '../types';

interface PresetsTabProps {
  config: ApiConfig;
  onSelectPreset: (promptText: string, suggestedConfig?: Partial<ApiConfig>) => void;
}

export interface PresetItem {
  id: string;
  title: string;
  category: 'legal' | 'marketing' | 'dev' | 'biz' | 'data' | 'life';
  categoryLabel: string;
  icon: React.FC<any>;
  color: string;
  badgeColor: string;
  description: string;
  prompt: string;
  config: Partial<ApiConfig>;
}

export const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: Sparkles },
  { id: 'legal', label: '⚖️ Pháp luật & Thuế', icon: FileText },
  { id: 'marketing', label: '🚀 Marketing & Bán hàng', icon: TrendingUp },
  { id: 'dev', label: '💻 Lập trình & IT', icon: Code },
  { id: 'biz', label: '💼 Quản trị & Văn phòng', icon: Award },
  { id: 'data', label: '🔍 Dữ liệu & OCR', icon: FileJson },
  { id: 'life', label: '💡 Tư duy & Đời sống', icon: BrainCircuit },
] as const;

export const PRESETS: PresetItem[] = [
  // --- 1. PHÁP LUẬT & THUẾ - KẾ TOÁN ---
  {
    id: 'legal_invoice_timing',
    title: 'Xuất hóa đơn khi khách nợ tiền',
    category: 'legal',
    categoryLabel: 'Pháp luật & Kế toán',
    icon: FileText,
    color: 'from-blue-600 to-indigo-700',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Tư vấn thời điểm lập hóa đơn điện tử khi giao hàng tháng này nhưng tháng sau mới nhận tiền, tránh phạt theo NĐ 125/2020.',
    prompt:
      'Tình huống thực tế cho chủ doanh nghiệp: Doanh nghiệp của tôi bán lô hàng trị giá 150 triệu đồng đã giao hàng và lập biên bản bàn giao nghiệm thu ngày 25/08, nhưng theo hợp đồng đối tác sẽ thanh toán vào ngày 10/09 (tháng sau). Kế toán muốn chờ tiền về tài khoản mới xuất hóa đơn điện tử. Xin chuyên gia và luật sư tư vấn:\n1. Kế toán làm vậy có vi phạm quy định về thời điểm lập hóa đơn không?\n2. Mức phạt tiền theo Nghị định 125/2020/NĐ-CP là bao nhiêu?\n3. Có giải pháp nào vừa tuân thủ 100% pháp luật, vừa có lợi nhất cho quản lý dòng tiền và công nợ của doanh nghiệp?\nTrích dẫn đầy đủ điều, khoản tại Nghị định 123/2020/NĐ-CP, Thông tư 78/2021/TT-BTC và Nghị định 125/2020/NĐ-CP để đối chiếu.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.1 },
  },
  {
    id: 'legal_invoice_errors',
    title: 'Xử lý Hóa đơn Điện tử sai sót',
    category: 'legal',
    categoryLabel: 'Pháp luật & Kế toán',
    icon: FileText,
    color: 'from-amber-600 to-rose-600',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Phân biệt và lựa chọn lập Hóa đơn Điều chỉnh hay Thay thế khi sai đơn giá, quy trình nộp Mẫu 04/SS-HĐĐT.',
    prompt:
      'Tình huống: Doanh nghiệp tôi đã xuất hóa đơn điện tử có mã của cơ quan thuế gửi cho khách hàng, sau đó phát hiện bị sai đơn giá và thành tiền (tăng thêm 20 triệu đồng). Xin chuyên gia tư vấn chi tiết:\n1. Trường hợp này nên chọn lập Hóa đơn Điều chỉnh hay Hóa đơn Thay thế thì thuận tiện và an toàn nhất cho cả người bán lẫn người mua?\n2. Có bắt buộc phải lập biên bản thỏa thuận giữa hai bên không?\n3. Thủ tục gửi Mẫu 04/SS-HĐĐT lên cơ quan thuế được quy định như thế nào?\nTrích dẫn rõ Điều, Khoản cụ thể tại Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.1 },
  },
  {
    id: 'legal_contract_review',
    title: 'Rà soát Hợp đồng & Phạt vi phạm',
    category: 'legal',
    categoryLabel: 'Pháp luật Doanh nghiệp',
    icon: FileText,
    color: 'from-indigo-600 to-purple-700',
    badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Đánh giá tính pháp lý điều khoản phạt vi phạm 20% trong hợp đồng thương mại theo Điều 300, 301 Luật Thương mại 2005.',
    prompt:
      'Tôi đang chuẩn bị ký Hợp đồng cung ứng dịch vụ công nghệ với đối tác. Đối tác đưa vào điều khoản: "Nếu bên B chậm tiến độ giao hàng dù chỉ 1 ngày thì phải chịu phạt vi phạm 20% tổng giá trị hợp đồng và bồi thường toàn bộ thiệt hại phát sinh". Xin luật sư rà soát:\n1. Mức phạt vi phạm 20% này có vượt quá trần quy định của Luật Thương mại 2005 (Điều 301) không?\n2. Phân biệt rõ giữa "Phạt vi phạm" và "Bồi thường thiệt hại", có được áp dụng đồng thời cả hai chế tài không?\n3. Đề xuất câu chữ sửa đổi (Drafting) lại điều khoản này để cân bằng quyền lợi và bảo vệ an toàn pháp lý cho bên tôi.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.2 },
  },
  {
    id: 'legal_tax_expenses',
    title: 'Chi phí được trừ Thuế TNDN (>20 triệu)',
    category: 'legal',
    categoryLabel: 'Thuế & Tài chính',
    icon: FileText,
    color: 'from-emerald-600 to-teal-700',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Xử lý tình huống thanh toán tiền mặt hóa đơn trên 20 triệu đồng và phương án khắc phục để được trừ thuế TNDN.',
    prompt:
      'Doanh nghiệp mua lô thiết bị văn phòng trị giá 25 triệu đồng có hóa đơn GTGT hợp pháp, nhưng nhân viên mua hàng lỡ thanh toán bằng tiền mặt (rút tiền từ tài khoản cá nhân). Xin chuyên gia tư vấn:\n1. Chi phí này có được tính vào chi phí được trừ khi tính thuế TNDN và có được khấu trừ thuế GTGT đầu vào không theo Thông tư 78/2014 và Thông tư 219/2013?\n2. Doanh nghiệp có thể xử lý khắc phục bằng cách nào để chi phí này được cơ quan thuế chấp nhận hợp lệ?',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.1 },
  },
  {
    id: 'legal_labor_termination',
    title: 'Chấm dứt Hợp đồng Lao động đúng luật',
    category: 'legal',
    categoryLabel: 'Luật Lao động',
    icon: FileText,
    color: 'from-rose-600 to-pink-700',
    badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'Quy trình đơn phương chấm dứt hợp đồng lao động khi nhân viên không đạt KPI, thời hạn báo trước theo BLLĐ 2019.',
    prompt:
      'Nhân viên công ty thường xuyên đi muộn và không hoàn thành chỉ tiêu KPI 2 tháng liên tiếp. Giám đốc muốn cho nghỉ việc ngay trong tuần này. Xin tư vấn pháp lý lao động:\n1. Doanh nghiệp có được đơn phương chấm dứt hợp đồng lao động ngay không? Thời hạn báo trước theo Điều 36 Bộ luật Lao động 2019 là bao lâu?\n2. Hồ sơ, quy trình đánh giá mức độ không hoàn thành công việc cần đáp ứng tiêu chí gì để tránh bị người lao động kiện tụng vì sa thải trái pháp luật?',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.2 },
  },

  // --- 2. MARKETING, NỘI DUNG & BÁN HÀNG ---
  {
    id: 'mkt_viral_script',
    title: 'Kịch bản Video ngắn Viral 60s (TikTok/Reels)',
    category: 'marketing',
    categoryLabel: 'Marketing & Video',
    icon: TrendingUp,
    color: 'from-violet-600 to-purple-700',
    badgeColor: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    description: 'Soạn kịch bản giữ chân người xem 3 giây đầu (Hook - Story - Offer) với bảng phân vai và hình ảnh chi tiết.',
    prompt:
      'Hãy viết kịch bản video ngắn 60 giây dạng Shorts/Reels/TikTok để quảng bá sản phẩm [Trợ lý AI tự động hóa công việc cho dân văn phòng]. Kịch bản cần áp dụng công thức Hook - Story - Offer:\n- 3 giây đầu (Hook): Giật tít đánh trúng nỗi đau làm việc tăng ca tới 21h đêm.\n- 40 giây giữa (Story): Trải nghiệm chuyển đổi ngoạn mục khi áp dụng AI giải quyết công việc tồn đọng trong 15 phút.\n- 17 giây cuối (Offer & CTA): Lời kêu gọi hành động dùng thử miễn phí không thể từ chối.\nTrình bày chi tiết gồm 3 cột: [Thời lượng] - [Hình ảnh / Quay phim] - [Lời thoại Voiceover / Âm thanh].',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.7 },
  },
  {
    id: 'mkt_aida_copy',
    title: 'Viết bài PR Bán hàng theo công thức AIDA',
    category: 'marketing',
    categoryLabel: 'Copywriting & Content',
    icon: TrendingUp,
    color: 'from-fuchsia-600 to-pink-600',
    badgeColor: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
    description: 'Viết nội dung truyền thông mạng xã hội thu hút sự chú ý, tạo khao khát và kích thích hành động mua hàng.',
    prompt:
      'Viết bài viết bán hàng Facebook/LinkedIn chất lượng cao theo mô hình AIDA (Attention - Interest - Desire - Action) cho dịch vụ [Khóa đào tạo Ứng dụng AI thực chiến cho Doanh nghiệp vừa và nhỏ]:\n- Giọng văn: Chuyên nghiệp, thực tế, thuyết phục, không tâng bốc quá đà.\n- Nêu bật ROI (hiệu quả hoàn vốn), tiết kiệm thời gian và nhân sự.\n- Kèm tiêu đề ấn tượng, các gạch đầu dòng lợi ích cốt lõi và lời kêu gọi hành động dứt khoát.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.7 },
  },
  {
    id: 'mkt_cold_email',
    title: 'Email Chào hàng B2B (Cold Email súc tích)',
    category: 'marketing',
    categoryLabel: 'B2B Sales',
    icon: TrendingUp,
    color: 'from-cyan-600 to-blue-700',
    badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    description: 'Soạn email tiếp cận lãnh đạo doanh nghiệp (CEO/CTO) ngắn gọn dưới 150 từ với tỷ lệ phản hồi cao.',
    prompt:
      'Viết một bức Cold Email B2B ngắn gọn (dưới 150 từ) gửi cho Giám đốc Điều hành (CEO) / Giám đốc Kỹ thuật (CTO) của các công ty công nghệ để giới thiệu giải pháp [Hệ thống Gemini AI Studio tối ưu hóa vận hành nội bộ]:\n1. Tiêu đề email (Subject line): Gây tò mò, cá nhân hóa cao, tránh từ khóa spam.\n2. Mở đầu: Đi thẳng vào vấn đề và nỗi đau lớn nhất của doanh nghiệp.\n3. Giá trị mang lại: 1 số liệu cụ thể (VD: giảm 40% chi phí thời gian).\n4. Call to Action (CTA): Lời mời một cuộc gọi ngắn 10 phút, nhẹ nhàng không gây áp lực.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.5 },
  },
  {
    id: 'mkt_handle_objection',
    title: 'Xử lý lời chê "Giá bên em đắt quá"',
    category: 'marketing',
    categoryLabel: 'Kỹ năng Bán hàng',
    icon: TrendingUp,
    color: 'from-amber-500 to-orange-600',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Kịch bản đàm phán thông minh giúp Sales chuyển hóa từ chối thành cơ hội chốt hợp đồng giá trị cao.',
    prompt:
      'Khách hàng doanh nghiệp sau khi nghe báo giá giải pháp phần mềm liền phản hồi: "Bên em báo giá cao quá, bên đối thủ X chỉ tính giá bằng một nửa". Hãy viết kịch bản phản hồi cho nhân viên Sales:\n1. Đồng cảm và công nhận góc nhìn của khách hàng (không cãi lại).\n2. Đặt câu hỏi khai thác để làm rõ tiêu chí chất lượng và dịch vụ sau bán hàng.\n3. Tái định vị giá trị: Chứng minh sự khác biệt về bảo mật, độ ổn định và chi phí ẩn khi chọn đơn vị giá rẻ.\n4. Đưa ra đề xuất linh hoạt để chốt thỏa thuận.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.6 },
  },

  // --- 3. LẬP TRÌNH & KỸ THUẬT CNTT ---
  {
    id: 'dev_gemini_python',
    title: 'Code Python gọi Gemini API Streaming & Retry',
    category: 'dev',
    categoryLabel: 'Lập trình Python',
    icon: Code,
    color: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Sinh mã nguồn Python production-ready hỗ trợ streaming SSE và cơ chế tự động thử lại khi dính rate limit.',
    prompt:
      'Viết một script Python 3 hoàn chỉnh (production-ready) gọi Gemini 2.5 Flash API:\n- Hỗ trợ truyền System Instruction và Multi-turn Chat.\n- Cơ chế Streaming hiển thị kết quả thời gian thực ra terminal.\n- Tích hợp Exponential Backoff Retry khi gặp mã lỗi 429 (Resource Exhausted) hoặc 503.\n- Có type annotations đầy đủ, xử lý try-catch và tính toán thời gian phản hồi (latency).',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.2 },
  },
  {
    id: 'dev_sql_optimize',
    title: 'Tối ưu hóa Truy vấn SQL & Indexing',
    category: 'dev',
    categoryLabel: 'Cơ sở dữ liệu',
    icon: Code,
    color: 'from-blue-600 to-cyan-600',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Phân tích nguyên nhân làm chậm truy vấn SQL trên bảng hàng triệu bản ghi và đề xuất Composite Index tối ưu.',
    prompt:
      'Tôi có câu lệnh SQL sau chạy rất chậm (mất hơn 8 giây trên bảng 5 triệu dòng dữ liệu):\n```sql\nSELECT u.id, u.name, COUNT(o.id) AS total_orders, SUM(o.amount) AS total_spent\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE o.created_at >= \'2024-01-01\' AND u.status = \'active\'\nGROUP BY u.id, u.name\nORDER BY total_spent DESC\nLIMIT 20;\n```\nXin chuyên gia Database:\n1. Phân tích nguyên nhân làm chậm truy vấn.\n2. Đề xuất các Index (Composite Index) tối ưu trên hai bảng users và orders.\n3. Viết lại câu lệnh truy vấn tối ưu hơn (dùng CTE hoặc Subquery trước khi JOIN).',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.1 },
  },
  {
    id: 'dev_security_audit',
    title: 'Rà soát Bảo mật Mã nguồn (Code Review)',
    category: 'dev',
    categoryLabel: 'An toàn thông tin',
    icon: Code,
    color: 'from-rose-600 to-red-700',
    badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'Kiểm tra lỗ hổng OWASP Top 10 (SQL Injection, XSS, CSRF, rò rỉ secret, JWT security) trong đoạn mã backend.',
    prompt:
      'Hãy đóng vai chuyên gia An ninh mạng & Bảo mật ứng dụng. Thực hiện Security Code Review cho đoạn mã xác thực sau:\n- Phát hiện các lỗ hổng bảo mật tiềm ẩn (SQL Injection, timing attack, token expiration, secret leak).\n- Đánh giá mức độ nghiêm trọng (Low, Medium, Critical).\n- Cung cấp đoạn mã đã sửa lỗi an toàn tuyệt đối kèm giải thích chi tiết.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.2 },
  },
  {
    id: 'dev_regex_expert',
    title: 'Chuyên gia Biểu thức chính quy (Regex VN)',
    category: 'dev',
    categoryLabel: 'Kỹ thuật Regex',
    icon: Code,
    color: 'from-purple-600 to-indigo-600',
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description: 'Tạo Regex chuẩn xác kiểm tra số CCCD 12 số, số điện thoại nhà mạng Việt Nam và mã số thuế doanh nghiệp.',
    prompt:
      'Viết các biểu thức Regular Expression (Regex) chính xác cho các trường hợp tại Việt Nam:\n1. Kiểm tra Số Căn cước công dân (12 chữ số, đúng mã tỉnh và thế kỷ sinh).\n2. Kiểm tra Số điện thoại di động Việt Nam (đầu số 03, 05, 07, 08, 09 gồm 10 chữ số).\n3. Kiểm tra Mã số thuế doanh nghiệp (10 hoặc 13 số có dấu gạch ngang).\nGiải thích chi tiết cấu trúc từng đoạn Regex và cho ví dụ test cases pass/fail.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.1 },
  },

  // --- 4. QUẢN TRỊ & NĂNG SUẤT VĂN PHÒNG ---
  {
    id: 'biz_meeting_minutes',
    title: 'Biên bản họp & Bảng Phân công Hành động',
    category: 'biz',
    categoryLabel: 'Quản trị Văn phòng',
    icon: Award,
    color: 'from-sky-600 to-indigo-600',
    badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    description: 'Chuyển đổi ghi chép thô cuộc họp thành Biên bản giao ban chuẩn và bảng Action Items rõ người, rõ việc, rõ deadline.',
    prompt:
      'Dưới đây là ghi chép thô từ cuộc họp triển khai dự án quý mới:\n[Dán nội dung thảo luận thô cuộc họp vào đây]\n\nHãy giúp tôi soạn thảo một Biên bản Cuộc họp (Meeting Minutes) trang trọng, chuyên nghiệp gồm:\n1. Mục đích cuộc họp và tóm tắt tinh thần chung.\n2. Các quyết định chính đã được biểu quyết thông qua.\n3. Bảng phân công hành động (Action Plan) gồm 4 cột: [Công việc cụ thể] - [Người phụ trách] - [Thời hạn Deadline] - [Chỉ tiêu KPI nghiệm thu].',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.3 },
  },
  {
    id: 'biz_swot_analysis',
    title: 'Ma trận SWOT & 4 Chiến lược Hành động',
    category: 'biz',
    categoryLabel: 'Chiến lược Doanh nghiệp',
    icon: Award,
    color: 'from-amber-600 to-yellow-600',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Phân tích điểm mạnh, yếu, cơ hội, thách thức và đưa ra ma trận chiến lược kết hợp SO, WO, ST, WT.',
    prompt:
      'Phân tích ma trận SWOT (Điểm mạnh, Điểm yếu, Cơ hội, Thách thức) cho dự án: [Phát triển ứng dụng AI phục vụ tư vấn pháp lý và thuế tự động tại thị trường Việt Nam].\nSau khi phân tích ma trận 4 ô, hãy tổng hợp thành 4 nhóm chiến lược hành động cụ thể:\n- Chiến lược SO: Dùng điểm mạnh đón đầu cơ hội.\n- Chiến lược WO: Tận dụng cơ hội khắc phục điểm yếu.\n- Chiến lược ST: Dùng điểm mạnh phòng ngừa thách thức.\n- Chiến lược WT: Giảm thiểu điểm yếu và né tránh rủi ro thị trường.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.4 },
  },
  {
    id: 'biz_kpi_okr',
    title: 'Thiết lập OKR & KPI Quý cho Phòng Kinh doanh',
    category: 'biz',
    categoryLabel: 'Quản trị Nhân sự & KPI',
    icon: Award,
    color: 'from-teal-600 to-emerald-700',
    badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    description: 'Xây dựng mục tiêu Objectives và các kết quả then chốt Key Results định lượng rõ ràng cho đội ngũ kinh doanh.',
    prompt:
      'Thiết lập bộ mục tiêu OKR (Objectives and Key Results) và các chỉ số KPI đo lường cho Phòng Kinh doanh B2B trong Quý 4 với mục tiêu tăng trưởng doanh thu 35% so với quý trước:\n- Định nghĩa 2 Objective cốt lõi.\n- Mỗi Objective gồm 3 Key Results có số liệu định lượng (Quantifiable metrics) rõ ràng.\n- Bộ KPI phân bổ cho từng vị trí (Trưởng phòng, Nhân viên Sales, Account Manager).',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.3 },
  },

  // --- 5. DỮ LIỆU & OCR THỊ GIÁC ---
  {
    id: 'data_ocr_doc',
    title: 'OCR Nhận diện Bảng biểu & Hóa đơn Scan',
    category: 'data',
    categoryLabel: 'Thị giác & OCR',
    icon: FileJson,
    color: 'from-blue-500 to-indigo-600',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Trích xuất văn bản, bảng số liệu tài chính từ ảnh chụp hoặc file PDF đính kèm sang bảng Markdown.',
    prompt:
      'Hãy OCR toàn bộ văn bản và dữ liệu từ tài liệu đính kèm này. Nếu có bảng biểu (số liệu tài chính, hóa đơn, danh sách), hãy trích xuất chính xác từng dòng từng cột và xuất ra định dạng Markdown Table rõ ràng, giữ nguyên số liệu và đơn vị tiền tệ.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.1 },
  },
  {
    id: 'data_json_extract',
    title: 'Trích xuất JSON Cấu trúc Nghiêm ngặt',
    category: 'data',
    categoryLabel: 'Khai thác Dữ liệu',
    icon: FileJson,
    color: 'from-violet-500 to-purple-600',
    badgeColor: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    description: 'Chuyển đổi văn bản tự do thành một đối tượng JSON hợp lệ duy nhất để nạp vào API backend.',
    prompt:
      'Hãy phân tích đoạn văn bản sau và trích xuất dữ liệu thành MỘT ĐỐI TƯỢNG JSON DUY NHẤT, không kèm lời giải thích rườm rà. Định dạng JSON yêu cầu:\n{\n  "customer": { "name": string, "phone": string, "address": string },\n  "items": [ { "name": string, "quantity": number, "unit_price": number, "total": number } ],\n  "total_amount": number,\n  "payment_method": string,\n  "urgency": "low" | "medium" | "high"\n}\n\nVăn bản đầu vào: "Chị Nguyễn Thị Mai ở 123 Cầu Giấy Hà Nội, SĐT 0988123456 muốn đặt gấp 5 ram giấy A4 Double A giá 75.000đ/ram và 2 hộp bút bi Thiên Long giá 60.000đ/hộp, thanh toán chuyển khoản khi nhận hàng."',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.1 },
  },

  // --- 6. TƯ DUY & ĐỜI SỐNG ---
  {
    id: 'life_meal_plan',
    title: 'Thực đơn Eat Clean 7 ngày & Đi chợ',
    category: 'life',
    categoryLabel: 'Sức khỏe & Đời sống',
    icon: BrainCircuit,
    color: 'from-emerald-500 to-lime-600',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Lập thực đơn dinh dưỡng 1800 kcal/ngày cho dân văn phòng kèm danh sách nguyên liệu đi chợ cả tuần tiết kiệm.',
    prompt:
      'Thiết kế thực đơn ăn uống khoa học Eat Clean cho 7 ngày trong tuần cho người làm việc văn phòng (mục tiêu: duy trì vóc dáng, nhiều năng lượng, khoảng 1800 kcal/ngày):\n- Đầy đủ 3 bữa chính và 1 bữa phụ nhẹ.\n- Nguyên liệu dễ mua ở siêu thị/chợ Việt Nam, dễ nấu trong 30 phút.\n- Tổng hợp danh sách đi chợ (Shopping List) theo từng nhóm thực phẩm: Đạm, Tinh bột tốt, Rau củ, Trái cây kèm định lượng ước tính cho 1 tuần.',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.5 },
  },
  {
    id: 'life_travel_itinerary',
    title: 'Lịch trình Du lịch 3N2Đ Tối ưu Chi phí',
    category: 'life',
    categoryLabel: 'Du lịch & Trải nghiệm',
    icon: BrainCircuit,
    color: 'from-orange-500 to-amber-600',
    badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    description: 'Lên kế hoạch du lịch Đà Lạt 3N2Đ tự túc với lộ trình liền mạch, không chạy lòng vòng và dự toán chi phí chi tiết.',
    prompt:
      'Lập lịch trình du lịch Đà Lạt 3 ngày 2 đêm tự túc cho nhóm 2 người với ngân sách 4.5 triệu đồng/người:\n- Lịch trình từng ngày sáng - trưa - chiều - tối hợp lý theo cung đường để tránh di chuyển xa lòng vòng.\n- Gợi ý các quán ăn đặc sản địa phương ngon, giá chuẩn không bị chặt chém.\n- Bảng dự toán chi phí chi tiết (Khách sạn, thuê xe máy, ăn uống, vé tham quan, quà mang về).',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.5 },
  },
  {
    id: 'life_logic_puzzle',
    title: 'Suy luận Logic Đa bước (Chain of Thought)',
    category: 'life',
    categoryLabel: 'Tư duy & Đố vui',
    icon: BrainCircuit,
    color: 'from-blue-600 to-indigo-600',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Thử thách năng lực lập luận từng bước của mô hình qua câu đố người nói thật, người nói dối kinh điển.',
    prompt:
      'Một bài toán logic cần suy luận nhiều bước: "Tại một hòn đảo có 3 người A, B, C. Một người luôn nói thật, một người luôn nói dối, và một người nói ngẫu nhiên (hoặc thật hoặc dối). A nói: C là người nói dối. B nói: A là người nói thật. C nói: Tôi là người nói ngẫu nhiên. Hãy xác định chính xác danh tính của từng người và giải thích cặn kẽ từng bước suy luận logic".',
    config: { model: 'gemini-2.5-flash', streaming: true, temperature: 0.2 },
  },
];

export const PresetsTab: React.FC<PresetsTabProps> = ({ onSelectPreset }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter presets based on category and search query
  const filteredPresets = useMemo(() => {
    return PRESETS.filter((preset) => {
      const matchCategory = selectedCategory === 'all' || preset.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchCategory;

      const matchText =
        preset.title.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.prompt.toLowerCase().includes(query) ||
        preset.categoryLabel.toLowerCase().includes(query);

      return matchCategory && matchText;
    });
  }, [selectedCategory, searchQuery]);

  // Copy prompt helper
  const handleCopyPrompt = (e: React.MouseEvent, preset: PresetItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(preset.prompt);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return PRESETS.length;
    return PRESETS.filter((p) => p.category === catId).length;
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Thư Viện Mẫu Prompt Chuyên Nghiệp
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Đã mở khóa tự do
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Tuyển tập các mẫu câu lệnh chuyên sâu theo từng ngành nghề. Bấm <strong>Thử ngay</strong> để nạp prompt vào ô chat và tương tác tức thì!
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mẫu prompt..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = getCategoryCount(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results Counter if filtered */}
        {(selectedCategory !== 'all' || searchQuery) && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>
              Hiển thị <strong>{filteredPresets.length}</strong> mẫu prompt phù hợp
            </span>
            {(selectedCategory !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {/* Presets Grid */}
        {filteredPresets.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Bot className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Không tìm thấy mẫu prompt nào phù hợp
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hãy thử tìm với từ khóa khác hoặc chọn danh mục "Tất cả"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPresets.map((preset) => {
              const Icon = preset.icon;
              const isCopied = copiedId === preset.id;
              const isExpanded = expandedId === preset.id;

              return (
                <div
                  key={preset.id}
                  className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50/70 dark:hover:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-900/40 p-5 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Category badge & Icon */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full border ${preset.badgeColor}`}
                      >
                        {preset.categoryLabel}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${preset.color} p-[1px] shadow-sm`}
                      >
                        <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[11px] flex items-center justify-center">
                          <Icon className="w-4 h-4 text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform" />
                        </div>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {preset.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Prompt Preview Snippet */}
                    <div className="mt-3 relative rounded-xl bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-3">
                      <p
                        className={`text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed ${
                          isExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {preset.prompt}
                      </p>

                      {preset.prompt.length > 180 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                          className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1.5 block cursor-pointer"
                        >
                          {isExpanded ? '▲ Thu gọn' : '▼ Xem toàn bộ prompt'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>{preset.config.model || 'gemini-2.5-flash'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Copy Button */}
                      <button
                        onClick={(e) => handleCopyPrompt(e, preset)}
                        title="Sao chép prompt"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium transition cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">Sao chép</span>
                          </>
                        )}
                      </button>

                      {/* Try Now Button */}
                      <button
                        onClick={() => onSelectPreset(preset.prompt, preset.config)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <span>Thử ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
