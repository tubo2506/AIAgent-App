import type { Agent } from '../types';

export interface ParsedMessageContent {
  cleanContent: string;
  questions: string[];
}

const DEFAULT_FALLBACK_QUESTIONS: Record<string, string[]> = {
  'tax-accounting-law': [
    'Quy định pháp luật hiện hành về thời điểm xuất hóa đơn đối với hoạt động bán hàng hóa và dịch vụ?',
    'Điều kiện và lộ trình bắt buộc áp dụng hóa đơn điện tử khởi tạo từ máy tính tiền kết nối cơ quan thuế?',
    'Thủ tục chi tiết và các bước xử lý khi phát hiện hóa đơn điện tử đã gửi khách hàng có sai sót?',
    'Quy định về việc xác thực định danh, sinh trắc học của người đại diện khi sử dụng hóa đơn điện tử?',
  ],
  'code-expert': [
    'Cách viết Unit Test và xử lý các trường hợp biên (Edge Cases) cho bài toán này?',
    'Đoạn mã trên có thể tối ưu hiệu năng (Big-O) hoặc kiến trúc Clean Code hơn không?',
    'Những rủi ro bảo mật tiềm ẩn và cách phòng chống lỗ hổng là gì?',
  ],
  'doc-ocr': [
    'Hãy trích xuất toàn bộ dữ liệu quan trọng sang định dạng bảng JSON chi tiết',
    'Tổng hợp các chỉ số và con số tài chính nổi bật trong tài liệu này',
    'Kiểm tra tính hợp lệ và đối chiếu các thông tin pháp lý trên chứng từ',
  ],
  'vi-translator': [
    'Cung cấp thêm phương án viết theo phong cách chuyên nghiệp và trang trọng',
    'Tối ưu lại đoạn văn trên để đăng mạng xã hội kèm các hashtags thu hút',
    'Viết 3 tiêu đề (Headline) giật tít, thu hút người đọc cho bài viết này',
  ],
  'business-analyst': [
    'Lập bảng phân tích rủi ro và phương án ứng phó (Risk Mitigation Matrix)',
    'Đề xuất 3 chỉ số OKRs trọng tâm để đo lường hiệu quả kế hoạch này',
    'Lộ trình triển khai cụ thể theo từng tuần trong quý tới (Roadmap)',
  ],
  'math-reasoning': [
    'Có phương pháp giải nào khác ngắn gọn hoặc trực quan hơn không?',
    'Tổng quát hóa bài toán này cho trường hợp n biến số',
    'Ứng dụng thực tế của nguyên lý logic này trong khoa học máy tính là gì?',
  ],
  general: [
    'Bạn có thể giải thích chi tiết hơn bằng một ví dụ thực tế cụ thể không?',
    'Những sai lầm phổ biến cần tránh khi thực hiện việc này là gì?',
    'Có tài liệu tham khảo hoặc công cụ tốt nhất nào để tìm hiểu sâu hơn không?',
  ],
};

/**
 * Parses Gemini response text to extract follow-up suggestions section.
 * Strips raw markdown bullets so the UI can render them as interactive chips.
 */
export function parseFollowUpQuestions(
  content: string,
  agent?: Agent,
  isLatestModelMessage = false
): ParsedMessageContent {
  if (!content || !content.trim()) {
    return { cleanContent: '', questions: [] };
  }

  // Regex looking for the suggestions section at the end of the response
  const suggestionSectionRegex =
    /(?:---+|\*\*\*+)?\s*(?:###\s*)?(?:[💡✨💬❓🔍👉]?\s*)(?:\*{0,2})(?:Gợi ý câu hỏi tiếp theo|Gợi ý mở rộng vấn đề|Câu hỏi mở rộng|Câu hỏi gợi ý|Các câu hỏi bạn có thể quan tâm|Vấn đề có thể mở rộng|Câu hỏi tiếp theo|Gợi ý tiếp theo)(?:\*{0,2})[:\s\n]*([\s\S]*)$/i;

  const match = content.match(suggestionSectionRegex);

  if (match) {
    const rawSection = match[1] || '';
    const extractedLines = rawSection
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[-*•\d.]+\s+/.test(l))
      .map((l) =>
        l
          .replace(/^[-*•\d.]+\s+/, '')
          .replace(/^\[|\]$/g, '')
          .replace(/^"|"$/g, '')
          .replace(/^\*\*|\*\*$/g, '')
          .trim()
      )
      .filter((q) => q.length >= 6 && q.length <= 250);

    if (extractedLines.length > 0) {
      const splitIndex = content.lastIndexOf(match[0]);
      let clean = splitIndex > 0 ? content.slice(0, splitIndex).trim() : content;
      // Also remove any trailing horizontal rules
      clean = clean.replace(/---+\s*$/, '').trim();

      return {
        cleanContent: clean || content,
        questions: extractedLines.slice(0, 4),
      };
    }
  }

  // Fallback: If no explicit section was found and this is the latest completed model message,
  // provide domain-aware contextual fallback questions.
  if (isLatestModelMessage) {
    const agentCategory = agent?.id || 'general';
    const fallback =
      DEFAULT_FALLBACK_QUESTIONS[agentCategory] ||
      (agent?.starterPrompts && agent.starterPrompts.length > 0
        ? agent.starterPrompts.slice(0, 3)
        : DEFAULT_FALLBACK_QUESTIONS.general);

    return {
      cleanContent: content,
      questions: fallback,
    };
  }

  return { cleanContent: content, questions: [] };
}
