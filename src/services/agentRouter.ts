import type { Agent, UploadedFile } from '../types';

export interface RouteResult {
  bestAgent: Agent;
  confidence: number;
  reason: string;
}

/**
 * Keywords & Pattern definitions for domain auto-detection
 */
const DOMAIN_RULES: Array<{
  agentId: string;
  category: string;
  weight: number;
  keywords: string[];
  patterns?: RegExp[];
  reason: string;
}> = [
  {
    agentId: 'tax-accounting-law',
    category: 'legal_tax',
    weight: 2,
    reason: 'Pháp luật Thuế & Kế toán hóa đơn',
    keywords: [
      'hóa đơn',
      'nghị định',
      'thông tư',
      'thuế',
      'vat',
      'gtgt',
      'tndn',
      'tncn',
      'khấu trừ',
      'mst',
      'mã số thuế',
      'xuất hóa đơn',
      'xử phạt',
      'tiền phạt',
      'kế toán',
      'tổng cục thuế',
      'cục thuế',
      'hóa đơn điện tử',
      'nđ 123',
      'nđ 70',
      'nđ 125',
      'nđ 254',
      'nđ 41',
      'tt 78',
      'tt 133',
      'tt 200',
      'luật quản lý thuế',
      'thanh tra thuế',
      'etax',
      'máy tính tiền',
      'mẫu 01/tb-hđss',
      'kê khai thuế',
      'quyết toán thuế',
      'tiền chậm nộp',
      'biếu tặng',
      'chiết khấu thương mại',
      'giảm thuế',
      'hoàn thuế',
      'chi phí hợp lý',
      'hợp lệ',
      'thời điểm xuất',
      'sai sót hóa đơn',
      'điều chỉnh hóa đơn',
      'thay thế hóa đơn',
      'hủy hóa đơn',
      'chứng từ',
      'phiếu thu',
      'phiếu chi',
      'báo cáo tài chính',
    ],
    patterns: [
      /n(ghị)?\s*đ(ịnh)?\s*(70|123|125|254|41|102|15)/i,
      /thông\s*tư\s*(78|133|200|88)/i,
      /luật\s*(quản\s*lý\s*)?thuế/i,
      /thuế\s*(gtgt|tndn|tncn)/i,
      /xuất\s*hóa\s*đơn/i,
      /thời\s*điểm\s*lập\s*(hóa\s*đơn)?/i,
    ],
  },
  {
    agentId: 'code-expert',
    category: 'code',
    weight: 2,
    reason: 'Lập trình & Kỹ thuật phần mềm',
    keywords: [
      'code',
      'lập trình',
      'viết hàm',
      'function',
      'class',
      'component',
      'typescript',
      'javascript',
      'python',
      'react',
      'vue',
      'angular',
      'nodejs',
      'golang',
      'rust',
      'java',
      'c++',
      'c#',
      'sql',
      'database',
      'query',
      'cơ sở dữ liệu',
      'bug',
      'debug',
      'lỗi code',
      'refactor',
      'clean code',
      'microservices',
      'api',
      'endpoint',
      'rest api',
      'css',
      'tailwind',
      'html',
      'frontend',
      'backend',
      'fullstack',
      'algorithm',
      'thuật toán',
      'regex',
      'git',
      'docker',
      'async',
      'await',
      'promise',
      'hook',
      'state management',
      'redux',
      'zustand',
    ],
    patterns: [
      /(viết|tạo|sửa|refactor|tối ưu)\s*(code|hàm|function|class|query|api)/i,
      /\b(const|let|var|def|import|export|function|interface|type)\b/,
      /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i,
    ],
  },
  {
    agentId: 'math-reasoning',
    category: 'reasoning',
    weight: 2,
    reason: 'Toán học & Suy luận Logic',
    keywords: [
      'toán',
      'bài toán',
      'giải bài toán',
      'phương trình',
      'hệ phương trình',
      'xác suất',
      'thống kê',
      'suy luận logic',
      'câu đố',
      'nghịch lý',
      'tính toán',
      'katex',
      'latex',
      'chứng minh',
      'monty hall',
      'định lý',
      'tích phân',
      'đạo hàm',
      'chuỗi số',
      'tổ hợp',
      'chỉnh hợp',
      'người thợ cạo',
      'qua sông',
      'chó sói',
      'con cừu',
      'bắp cải',
      'suy luận',
      'mâu thuẫn logic',
    ],
    patterns: [
      /bài\s*toán\s*(đố|logic|xác\s*suất)?/i,
      /giải\s*(bài\s*toán|phương\s*trình)/i,
      /suy\s*luận\s*từng\s*bước/i,
    ],
  },
  {
    agentId: 'vi-translator',
    category: 'translation',
    weight: 2,
    reason: 'Biên dịch & Sáng tạo nội dung',
    keywords: [
      'dịch',
      'translate',
      'tiếng anh sang tiếng việt',
      'tiếng việt sang tiếng anh',
      'dịch nghĩa',
      'song ngữ',
      'copywriting',
      'viết bài',
      'bài đăng',
      'chuẩn seo',
      'headline',
      'tiêu đề thu hút',
      'giật tít',
      'soạn email',
      'thư từ chối',
      'thư mời',
      'trau chuốt câu từ',
      'chỉnh sửa ngữ pháp',
      'văn phong',
      'bản dịch',
      'thông điệp truyền thông',
    ],
    patterns: [
      /dịch\s*(đoạn|bài|từ|sang|giúp)/i,
      /viết\s*(bài|email|thư|content|headline|tiêu\s*đề)/i,
    ],
  },
  {
    agentId: 'business-analyst',
    category: 'business',
    weight: 2,
    reason: 'Chiến lược kinh doanh & Dữ liệu',
    keywords: [
      'kpi',
      'okrs',
      'swot',
      'bcg',
      'chiến lược',
      'kế hoạch kinh doanh',
      'churn rate',
      'cac',
      'ltv',
      'tỷ lệ rời bỏ',
      'tăng trưởng',
      'thị phần',
      'mô hình kinh doanh',
      'roi',
      'margin',
      'doanh thu thuần',
      'phân tích đối thủ',
      'go to market',
      'product market fit',
    ],
    patterns: [
      /kế\s*hoạch\s*(kinh\s*doanh|okr|chiến\s*lược)/i,
      /phân\s*tích\s*(swot|kpi|dữ\s*liệu|thị\s*trường)/i,
    ],
  },
];

/**
 * Intelligent Agent Router
 * Analyzes user query & attachments to determine the most qualified Agent
 */
export function detectBestAgent(
  query: string,
  attachments: UploadedFile[] = [],
  availableAgents: Agent[] = [],
  currentAgentId?: string
): RouteResult | null {
  const normalizedQuery = query.toLowerCase().trim();

  // 1. Multimodal / Attachment priority
  if (attachments.length > 0) {
    const hasImageOrPdf = attachments.some(
      (a) => a.mimeType.startsWith('image/') || a.mimeType === 'application/pdf'
    );

    if (hasImageOrPdf) {
      // Check if user specifically asks a tax question about the document
      const isTaxQuestion = DOMAIN_RULES.find((r) => r.agentId === 'tax-accounting-law')?.patterns?.some(
        (p) => p.test(normalizedQuery)
      );

      if (!isTaxQuestion) {
        const ocrAgent = availableAgents.find((a) => a.id === 'doc-ocr');
        if (ocrAgent && currentAgentId !== 'doc-ocr') {
          return {
            bestAgent: ocrAgent,
            confidence: 0.95,
            reason: 'Phát hiện tệp tài liệu/ảnh cần OCR & bóc tách dữ liệu',
          };
        }
      }
    }
  }

  // If query is too short (e.g. "hi", "ok", "alo", "chào bạn"), keep current agent
  if (normalizedQuery.length < 5) {
    return null;
  }

  // 2. Score evaluation across built-in domain rules
  const scores: Record<string, { score: number; reason: string }> = {};

  for (const rule of DOMAIN_RULES) {
    let score = 0;

    // Pattern regex matching (high weight)
    if (rule.patterns) {
      for (const pattern of rule.patterns) {
        if (pattern.test(normalizedQuery)) {
          score += 4 * rule.weight;
        }
      }
    }

    // Keyword matching
    for (const kw of rule.keywords) {
      if (normalizedQuery.includes(kw)) {
        score += 1.5 * rule.weight;
      }
    }

    if (score > 0) {
      scores[rule.agentId] = { score, reason: rule.reason };
    }
  }

  // 3. Score custom agents (if any)
  for (const agent of availableAgents) {
    if (agent.isBuiltIn) continue;

    let score = 0;
    const nameLower = agent.name.toLowerCase();
    const descLower = agent.description.toLowerCase();

    // Check if query mentions name of agent
    if (normalizedQuery.includes(nameLower)) {
      score += 10;
    }

    // Check if query matches keywords in custom agent description
    const descWords = descLower.split(/\s+/).filter((w) => w.length > 3);
    const descMatchCount = descWords.filter((w) => normalizedQuery.includes(w)).length;
    if (descMatchCount >= 2) {
      score += descMatchCount * 1.5;
    }

    // Check starter prompts of custom agent
    if (agent.starterPrompts) {
      for (const sp of agent.starterPrompts) {
        const spWords = sp.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const matchCount = spWords.filter((w) => normalizedQuery.includes(w)).length;
        if (matchCount >= 2) {
          score += matchCount * 2;
        }
      }
    }

    if (score > 0) {
      scores[agent.id] = { score, reason: `Phù hợp với chuyên môn "${agent.name}"` };
    }
  }

  // 4. Find the best scoring agent
  let highestScore = 0;
  let targetAgentId = '';
  let matchReason = '';

  for (const [agentId, data] of Object.entries(scores)) {
    if (data.score > highestScore) {
      highestScore = data.score;
      targetAgentId = agentId;
      matchReason = data.reason;
    }
  }

  // Score threshold for switching: at least 3 points to avoid false positives
  if (highestScore >= 3 && targetAgentId) {
    const targetAgent = availableAgents.find((a) => a.id === targetAgentId);
    if (targetAgent && targetAgent.id !== currentAgentId) {
      return {
        bestAgent: targetAgent,
        confidence: Math.min(highestScore / 10, 1),
        reason: matchReason,
      };
    }
  }

  return null;
}
