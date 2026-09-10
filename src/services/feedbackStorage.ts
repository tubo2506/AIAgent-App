import type { GoldenExample } from '../types';

const STORAGE_KEY = 'gemini_agent_golden_examples_v1';

export function getGoldenExamples(agentId?: string): GoldenExample[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: GoldenExample[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (agentId && agentId !== 'all') {
      return list.filter((item) => item.agentId === agentId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveGoldenExample(
  data: Omit<GoldenExample, 'id' | 'createdAt'>
): GoldenExample {
  const existing = getGoldenExamples();
  // Check if example for same query and agent already exists
  const existingIdx = existing.findIndex(
    (e) => e.agentId === data.agentId && e.userQuery.trim().toLowerCase() === data.userQuery.trim().toLowerCase()
  );

  const newExample: GoldenExample = {
    ...data,
    id: existingIdx >= 0 ? existing[existingIdx].id : 'golden_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    createdAt: existingIdx >= 0 ? existing[existingIdx].createdAt : new Date().toISOString(),
  };

  let updated: GoldenExample[];
  if (existingIdx >= 0) {
    updated = [...existing];
    updated[existingIdx] = newExample;
  } else {
    // Put newest first, cap at 50 examples to avoid storage bloat
    updated = [newExample, ...existing].slice(0, 50);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save golden example to localStorage', err);
  }

  return newExample;
}

export function deleteGoldenExample(id: string): void {
  const existing = getGoldenExamples();
  const updated = existing.filter((e) => e.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete golden example', err);
  }
}

/**
 * Lọc và định dạng 1-2 Mẫu Chuẩn (Golden Examples) liên quan nhất đến câu hỏi hiện tại
 * để nhúng vào system instruction / Few-shot prompt cho Gemini học tập.
 */
export function formatGoldenExamplesPrompt(
  agentId: string,
  currentQuery?: string,
  maxExamples: number = 2
): string {
  const examples = getGoldenExamples(agentId);
  if (examples.length === 0) return '';

  let selected = examples;

  if (currentQuery && currentQuery.trim().length > 3) {
    const queryWords = currentQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    // Score examples by keyword overlap with user query
    const scored = examples.map((ex) => {
      let score = 0;
      const combined = (ex.userQuery + ' ' + ex.finalAnswer).toLowerCase();
      queryWords.forEach((word) => {
        if (combined.includes(word)) score += 1;
      });
      return { ex, score };
    });

    scored.sort((a, b) => b.score - a.score);
    selected = scored.slice(0, maxExamples).map((s) => s.ex);
  } else {
    selected = examples.slice(0, maxExamples);
  }

  if (selected.length === 0) return '';

  let prompt = `\n\n--- [BỘ VÍ DỤ MẪU CHUẨN ĐÃ ĐƯỢC DUYỆT (FEW-SHOT GOLDEN EXAMPLES)] ---\n`;
  prompt += `Dưới đây là câu trả lời mẫu đã được người dùng kiểm duyệt và đánh giá chính xác cao nhất cho Agent này. Hãy noi theo cấu trúc, văn phong và tính chuẩn xác của các ví dụ sau:\n\n`;

  selected.forEach((ex, idx) => {
    prompt += `Ví dụ ${idx + 1}:\n`;
    prompt += `👤 Câu hỏi của người dùng:\n${ex.userQuery.trim()}\n\n`;
    prompt += `🤖 Câu trả lời mẫu chuẩn mực:\n${ex.finalAnswer.trim()}\n`;
    if (ex.note) {
      prompt += `*Ghi chú duyệt*: ${ex.note}\n`;
    }
    prompt += `--------------------------------------------------\n`;
  });

  prompt += `Hãy áp dụng phong cách và độ sắc bén của các ví dụ trên khi phản hồi câu hỏi tiếp theo!\n---\n`;
  return prompt;
}
