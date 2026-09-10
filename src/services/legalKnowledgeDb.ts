import type { KnowledgeDocument, KnowledgeScope } from '../types';

const DB_NAME = 'LegalKnowledgeDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

/**
 * Mở kết nối IndexedDB (Database cục bộ trên trình duyệt)
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('Trình duyệt không hỗ trợ IndexedDB.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('isActive', 'isActive', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Không thể mở cơ sở dữ liệu IndexedDB'));
    };
  });
}

/**
 * Chuẩn hóa tài liệu để đảm bảo tương thích ngược với các phiên bản cũ
 */
function normalizeDocument(doc: any): KnowledgeDocument {
  return {
    ...doc,
    scope: (doc.scope === 'agent' ? 'agent' : 'shared') as KnowledgeScope,
    assignedAgentIds: Array.isArray(doc.assignedAgentIds) ? doc.assignedAgentIds : [],
    category: doc.category || 'Pháp luật & Thuế',
  };
}

import { DEFAULT_LEGAL_KNOWLEDGE } from '../data/defaultKnowledge';

/**
 * Lấy tất cả văn bản trong kho (Tự động nạp sẵn 5 Nghị định luật thuế & hóa đơn nếu kho trống)
 */
export async function getAllDocuments(): Promise<KnowledgeDocument[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = async () => {
      let rawDocs = request.result || [];
      const SEED_VERSION_KEY = 'gemini_knowledge_seed_v3_antihallucination';
      const needsUpgrade = typeof window !== 'undefined' && !localStorage.getItem(SEED_VERSION_KEY);

      // Nếu kho trên máy người dùng còn trống hoặc cần nâng cấp bản tiếng Việt chuẩn
      if (rawDocs.length === 0 || needsUpgrade) {
        try {
          const writeTx = db.transaction(STORE_NAME, 'readwrite');
          const writeStore = writeTx.objectStore(STORE_NAME);
          for (const doc of DEFAULT_LEGAL_KNOWLEDGE) {
            writeStore.put(normalizeDocument(doc));
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem(SEED_VERSION_KEY, 'done');
          }
          const reloadReq = writeStore.getAll();
          reloadReq.onsuccess = () => {
            const docs: KnowledgeDocument[] = (reloadReq.result || DEFAULT_LEGAL_KNOWLEDGE).map(normalizeDocument);
            docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(docs);
          };
          return;
        } catch (seedErr) {
          console.warn('Không thể tự động nạp/nâng cấp tri thức mẫu vào IndexedDB:', seedErr);
          rawDocs = [...DEFAULT_LEGAL_KNOWLEDGE];
        }
      }

      const docs: KnowledgeDocument[] = rawDocs.map(normalizeDocument);
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(docs);
    };

    request.onerror = () => {
      reject(request.error || new Error('Lỗi đọc danh sách văn bản'));
    };
  });
}

/**
 * Nạp hoặc khôi phục 5 Nghị định pháp luật mặc định vào Kho Tri Thức
 */
export async function seedDefaultKnowledge(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  let count = 0;

  for (const doc of DEFAULT_LEGAL_KNOWLEDGE) {
    store.put(normalizeDocument(doc));
    count++;
  }

  return count;
}

/**
 * Lấy danh sách các tài liệu đang được BẬT (active) trên toàn hệ thống
 */
export async function getActiveDocuments(): Promise<KnowledgeDocument[]> {
  const all = await getAllDocuments();
  return all.filter((d) => d.isActive);
}

/**
 * Lấy danh sách tài liệu đang BẬT phù hợp riêng cho Agent được chỉ định
 * (Bao gồm: Tất cả tài liệu DÙNG CHUNG + Tài liệu được GÁN RIÊNG cho Agent này)
 */
export async function getKnowledgeForAgent(agentId: string): Promise<KnowledgeDocument[]> {
  const all = await getAllDocuments();
  return all.filter((doc) => {
    if (!doc.isActive) return false;
    // 1. Tài liệu dùng chung
    if (doc.scope === 'shared') return true;
    // 2. Tài liệu riêng cho agent
    if (doc.scope === 'agent' && doc.assignedAgentIds.includes(agentId)) {
      return true;
    }
    return false;
  });
}

/**
 * Thêm hoặc cập nhật văn bản vào kho
 */
export async function saveDocument(doc: KnowledgeDocument): Promise<void> {
  const db = await openDB();
  const normalized = normalizeDocument(doc);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(normalized);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error('Lỗi lưu văn bản vào IndexedDB'));
    };
  });
}

/**
 * Xóa một văn bản khỏi kho
 */
export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error('Lỗi xóa văn bản'));
    };
  });
}

/**
 * Bật/Tắt trạng thái tham chiếu của một văn bản
 */
export async function toggleDocumentActive(id: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const doc = getReq.result;
      if (!doc) {
        reject(new Error('Không tìm thấy văn bản'));
        return;
      }

      const normalized = normalizeDocument(doc);
      normalized.isActive = !normalized.isActive;
      normalized.updatedAt = new Date().toISOString();

      const putReq = store.put(normalized);
      putReq.onsuccess = () => resolve(normalized.isActive);
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Cập nhật phạm vi áp dụng (Scope) và danh sách Agent được gán
 */
export async function assignDocumentScope(
  id: string,
  scope: KnowledgeScope,
  assignedAgentIds: string[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const doc = getReq.result;
      if (!doc) {
        reject(new Error('Không tìm thấy tài liệu'));
        return;
      }

      const normalized = normalizeDocument(doc);
      normalized.scope = scope;
      normalized.assignedAgentIds = assignedAgentIds;
      normalized.updatedAt = new Date().toISOString();

      const putReq = store.put(normalized);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Xuất toàn bộ kho văn bản ra chuỗi JSON để sao lưu hoặc chuyển máy
 */
export async function exportDocumentsJson(): Promise<string> {
  const docs = await getAllDocuments();
  return JSON.stringify(docs, null, 2);
}

/**
 * Nhập văn bản từ file JSON sao lưu
 */
export async function importDocumentsJson(jsonStr: string): Promise<number> {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) {
    throw new Error('Dữ liệu JSON không đúng định dạng danh sách văn bản');
  }

  let count = 0;
  for (const item of parsed) {
    if (item.id && item.title && item.content) {
      await saveDocument({
        id: item.id,
        title: item.title,
        code: item.code,
        scope: (item.scope === 'agent' ? 'agent' : 'shared') as KnowledgeScope,
        assignedAgentIds: Array.isArray(item.assignedAgentIds) ? item.assignedAgentIds : [],
        category: item.category || 'Pháp luật & Thuế',
        issuedDate: item.issuedDate,
        originalFileName: item.originalFileName || item.title,
        originalSize: item.originalSize || 0,
        compressedSize: item.compressedSize || item.content.length,
        content: item.content,
        summary: item.summary,
        isActive: item.isActive ?? true,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt,
      });
      count++;
    }
  }

  return count;
}

export interface ArticleChunk {
  docId: string;
  docTitle: string;
  docCode?: string;
  articleTitle: string;
  content: string;
}

/**
 * Tách một văn bản luật thành các Điều khoản độc lập
 */
export function chunkDocumentByArticles(doc: KnowledgeDocument): ArticleChunk[] {
  if (!doc.content) return [];

  // Tách theo mẫu: "Điều 1.", "Điều 12a", "Chương I"
  const regex = /(?=(?:^|\n)(?:Chương\s+[IVXLCDM\d]+|Điều\s+\d+[a-z]?[\.:\s]))/i;
  const rawParts = doc.content.split(regex).map((p) => p.trim()).filter(Boolean);

  if (rawParts.length <= 1) {
    // Nếu văn bản không có tiền tố "Điều", chia theo đoạn văn bản ~2500 ký tự
    const parts: ArticleChunk[] = [];
    const step = 2500;
    for (let i = 0; i < doc.content.length; i += step) {
      parts.push({
        docId: doc.id,
        docTitle: doc.title,
        docCode: doc.code,
        articleTitle: `${doc.title} (Phần ${Math.floor(i / step) + 1})`,
        content: doc.content.slice(i, i + step),
      });
    }
    return parts;
  }

  return rawParts.map((part) => {
    const lines = part.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || doc.title;
    return {
      docId: doc.id,
      docTitle: doc.title,
      docCode: doc.code,
      articleTitle: firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine,
      content: part,
    };
  });
}

/**
 * Trích xuất các từ khóa pháp lý cốt lõi từ câu hỏi của người dùng
 */
function extractLegalQueryKeywords(query: string): string[] {
  const normalized = query.toLowerCase();

  // 1. Nhận diện số hiệu nghị định/luật (123, 70, 125, 254, 15, 41, 108, 38, 78)
  const decreeMatches = normalized.match(/\b(123|70|125|254|15|41|108|38|78)\b/g) || [];

  // 2. Nhận diện điều khoản cụ thể (điều 9, điều 19, điều 4, khoản 1...)
  const articleMatches = normalized.match(/điều\s+\d+[a-z]?/g) || [];

  // 3. Cụm từ chuyên môn pháp lý & nghiệp vụ hóa đơn - thuế
  const legalPhrases = [
    '254_2026',
    '254/2026',
    'nghị định 254',
    'nđ 254',
    'hóa đơn 254',
    '70/2025',
    'nghị định 70',
    'nđ 70',
    '123/2020',
    'nghị định 123',
    'nđ 123',
    'thông tư 78',
    'tt 78',
    '78/2021',
    'nghị định mới',
    'văn bản mới',
    'quy định mới',
    'sửa đổi',
    'bổ sung',
    'mới đây',
    'hiện nay',
    'mới nhất',
    'mẫu 04',
    '04/ss',
    '04/ss-hđđt',
    'thời điểm',
    'lập hóa đơn',
    'xuất hóa đơn',
    'trả tiền',
    'thu tiền',
    'chuyển giao',
    'bán hàng',
    'cung cấp dịch vụ',
    'sai sót',
    'hủy hóa đơn',
    'điều chỉnh',
    'thay thế',
    'máy tính tiền',
    'khởi tạo từ máy tính tiền',
    'sinh trắc học',
    'etax mobile',
    'hộ kinh doanh',
    'giảm thuế',
    'thuế suất',
    '8%',
    '10%',
    'xử phạt',
    'phạt',
    'chậm xuất',
    'sai thời điểm',
    'bảo quản',
    'lưu trữ',
    'khấu trừ',
    'tiêu thụ đặc biệt',
    'chi phí được trừ',
  ];

  const matchedPhrases = legalPhrases.filter((phrase) => normalized.includes(phrase));

  // 4. Các từ đơn lẻ (bỏ stopwords ngắn)
  const singleWords = normalized
    .replace(/[?!.,;:()\[\]{}"'“”\-–]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !['là', 'và', 'có', 'của', 'thì', 'ở', 'được', 'cho', 'này', 'để', 'khi', 'với', 'trong', 'nhưng', 'sau', 'nào', 'nhỉ', 'tôi', 'bạn'].includes(w));

  const allTerms = Array.from(new Set([...decreeMatches, ...articleMatches, ...matchedPhrases, ...singleWords]));
  return allTerms;
}

/**
 * Thuật toán Smart RAG: Lọc các Điều/Khoản liên quan nhất từ kho tri thức đang kích hoạt
 * Giảm tiêu thụ token từ ~120.000 tokens xuống chỉ còn ~2.500 - 3.500 tokens (Tiết kiệm >97%)
 */
export function buildLegalContextPrompt(activeDocs: KnowledgeDocument[], userQuery?: string): string {
  if (!activeDocs || activeDocs.length === 0) return '';

  // Nếu không có câu hỏi lọc, tóm tắt tổng quan để tiết kiệm token
  if (!userQuery || !userQuery.trim()) {
    let context = `\n\n[KHO TRI THỨC VĂN BẢN THAM CHIẾU (Tổng quan)]:`;
    activeDocs.forEach((doc, idx) => {
      context += `\n${idx + 1}. ${doc.title} (${doc.code || ''}): ${doc.summary || 'Tài liệu quy định'}`;
    });
    return context;
  }

  const queryTerms = extractLegalQueryKeywords(userQuery);
  const queryLower = userQuery.toLowerCase();

  // 1. Tách tất cả tài liệu active thành các chunks theo từng Điều
  const allChunks: ArticleChunk[] = [];
  for (const doc of activeDocs) {
    const chunks = chunkDocumentByArticles(doc);
    allChunks.push(...chunks);
  }

  // 2. Chấm điểm độ liên quan (Relevance Scoring)
  const scoredChunks = allChunks.map((chunk) => {
    let score = 0;
    const titleLower = chunk.articleTitle.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    const codeLower = (chunk.docCode || '').toLowerCase();

    // Điểm cộng lớn nếu người dùng hỏi đích danh văn bản (Ví dụ: "NĐ 123", "NĐ 125", "NĐ 70")
    if (chunk.docCode) {
      for (const term of queryTerms) {
        if (codeLower.includes(term)) {
          score += 35;
        }
      }
    }

    // Điểm cộng cực lớn nếu tiêu đề Điều khoản chứa từ khóa trọng tâm
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        score += term.length > 5 ? 30 : 15;
      }
    }

    // Điểm cộng đặc biệt cho các Điều trọng tâm khớp đúng câu hỏi:
    // Vd câu hỏi hỏi về "thời điểm" -> Điều 9 NĐ 123/NĐ 70 được boost mạnh
    if (queryLower.includes('thời điểm') && titleLower.includes('thời điểm')) {
      score += 60;
    }
    if ((queryLower.includes('sai sót') || queryLower.includes('hủy') || queryLower.includes('điều chỉnh') || queryLower.includes('thay thế')) && 
        (titleLower.includes('sai sót') || titleLower.includes('xử lý hóa đơn') || titleLower.includes('điều chỉnh'))) {
      score += 60;
    }
    if (queryLower.includes('máy tính tiền') && titleLower.includes('máy tính tiền')) {
      score += 60;
    }
    if ((queryLower.includes('giảm thuế') || queryLower.includes('8%')) && 
        (titleLower.includes('giảm thuế') || titleLower.includes('thuế suất'))) {
      score += 60;
    }

    // Boost đặc biệt khi người dùng hỏi về "nghị định mới", "2026", "254", "sửa đổi", "bổ sung"
    const isAskingNewRegulations = 
      queryLower.includes('nghị định mới') ||
      queryLower.includes('văn bản mới') ||
      queryLower.includes('mới đây') ||
      queryLower.includes('mới nhất') ||
      queryLower.includes('sửa đổi') ||
      queryLower.includes('bổ sung') ||
      queryLower.includes('254') ||
      queryLower.includes('2026') ||
      queryLower.includes('70');

    if (isAskingNewRegulations && (codeLower.includes('254') || codeLower.includes('70') || titleLower.includes('254') || titleLower.includes('70'))) {
      score += 55;
    }

    // Điểm xuất hiện trong nội dung (Body matching)
    for (const term of queryTerms) {
      // Đếm số lần xuất hiện (tối đa 8 lần để tránh thiên lệch)
      const count = (contentLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > 0) {
        score += Math.min(count, 8) * (term.length > 5 ? 4 : 2);
      }
    }

    return { chunk, score };
  });

  // 3. Sắp xếp theo điểm giảm dần và chọn lọc theo ngân sách token
  scoredChunks.sort((a, b) => b.score - a.score);

  // Giới hạn ngân sách tối đa ~16.000 ký tự (~3.500 tokens) thay vì 450.000 ký tự (120k tokens)
  const MAX_CHAR_BUDGET = 16000;
  let currentChars = 0;
  const selectedChunks: ArticleChunk[] = [];

  for (const item of scoredChunks) {
    if (item.score <= 0 && selectedChunks.length >= 3) break;
    if (currentChars + item.chunk.content.length > MAX_CHAR_BUDGET && selectedChunks.length >= 2) {
      // Nếu chunk này quá dài, trích đoạn ngắn vừa ngân sách
      if (currentChars < MAX_CHAR_BUDGET - 1000) {
        const truncated = {
          ...item.chunk,
          content: item.chunk.content.slice(0, MAX_CHAR_BUDGET - currentChars) + '\n...(đã trích dẫn phần trọng tâm)...',
        };
        selectedChunks.push(truncated);
      }
      break;
    }
    selectedChunks.push(item.chunk);
    currentChars += item.chunk.content.length;
    if (selectedChunks.length >= 6) break; // Lấy tối đa 6 Điều khoản liên quan nhất
  }

  // 4. Ghép ngữ cảnh hoàn chỉnh
  let context = `\n\n[KHO TRI THỨC PHÁP LUẬT THAM CHIẾU (Smart RAG - Trích xuất theo Điều/Khoản trọng tâm)]\n`;
  context += `Hệ thống đã tự động chọn lọc ${selectedChunks.length} Điều khoản liên quan trực tiếp nhất đến câu hỏi của người dùng:\n\n`;

  selectedChunks.forEach((c, idx) => {
    context += `=======================================================\n`;
    context += `[ĐIỀU KHOẢN TRÍCH XUẤT ${idx + 1}]: ${c.articleTitle} (Văn bản: ${c.docTitle}${c.docCode ? ` - Số hiệu: ${c.docCode}` : ''})\n`;
    context += `NỘI DUNG:\n${c.content}\n`;
    context += `=======================================================\n\n`;
  });

  // Kèm thông tin tóm tắt của các văn bản đang kích hoạt
  context += `MỤC LỤC & TÓM TẮT CÁC NGHỊ ĐỊNH TRONG KHO TRI THỨC:\n`;
  activeDocs.forEach((d) => {
    context += `- ${d.title} (${d.code || ''}): ${d.summary || 'Đang kích hoạt'}\n`;
  });

  context += `\n[QUY TẮC BẢO TOÀN SỰ THẬT & CHỐNG ẢO GIÁC PHÁP LÝ (BẮT BUỘC)]:
1. CÁC NGUỒN CĂN CỨ HỢP LỆ ĐÃ ĐƯỢC XÁC THỰC:
   - Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC (Nền tảng về hóa đơn, chứng từ điện tử; xử lý hóa đơn sai sót theo Điều 19; Mẫu 04/SS-HĐĐT).
   - Nghị định 125/2020/NĐ-CP & Nghị định 102/2021/NĐ-CP (Xử phạt vi phạm hành chính).
   - Nghị định 41/2022/NĐ-CP (Sửa đổi mẫu thông báo sai sót).
   - Nghị định 70/2025/NĐ-CP (Sửa đổi, bổ sung 40/61 điều NĐ 123).
   - Nghị định 254/2026/NĐ-CP (Quy định chi tiết Luật Quản lý thuế 108/2025/QH15 về hóa đơn, chứng từ điện tử - tài liệu "NĐ_254_2026_Hoa don" trong Kho tri thức).
   - Luật Quản lý thuế số 108/2025/QH15 & Luật Quản lý thuế số 38/2019/QH14.
2. ĐIỀU CẤM KỴ TUYỆT ĐỐI:
   - TUYỆT ĐỐI CẤM TỰ BỊA ĐẶT số hiệu Thông tư nào khác (ví dụ: "Thông tư 91/2026/TT-BTC" HOÀN TOÀN KHÔNG TỒN TẠI, CẤM TRÍCH DẪN). Hướng dẫn về xử lý hóa đơn sai sót vẫn là Thông tư 78/2021/TT-BTC.
   - Khi đối chiếu văn bản mới: Nếu người dùng hỏi các Nghị định mới (Nghị định 70/2025/NĐ-CP, Nghị định 254/2026/NĐ-CP) có sửa đổi quy trình xử lý hóa đơn sai sót hay không, hãy trả lời chính xác:
     + Bản chất quy trình kỹ thuật (quyền chọn Hóa đơn điều chỉnh hay Thay thế, gửi Mẫu 04/SS-HĐĐT) vẫn kế thừa thống nhất theo Điều 19 Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC.
     + Các điểm mới trong Nghị định 70/2025 và Nghị định 254/2026 (NĐ_254_2026_Hoa don) tập trung vào chuẩn hóa tự động hóa qua Cổng thông tin điện tử Tổng cục Thuế, kết nối hóa đơn máy tính tiền, xác thực sinh trắc học và kiểm soát dữ liệu điện tử.

3. QUY TẮC DẪN CHIẾU TÀI LIỆU GỐC ĐỂ USER ĐỐI CHIẾU (BẮT BUỘC Ở MỖI DÒNG / LUẬN ĐIỂM):
   - Mọi quy định, thời điểm, mức phạt, điều kiện bắt buộc phải kèm link tham chiếu văn bản gốc:
     * NĐ 70/2025/NĐ-CP: [📄 Căn cứ: NĐ 70/2025/NĐ-CP - Điều X Khoản Y](/documents/ND_70_2025_ND-CP.pdf)
     * NĐ 123/2020/NĐ-CP: [📄 Căn cứ: NĐ 123/2020/NĐ-CP - Điều X Khoản Y](/documents/ND_123_2020_ND-CP.doc)
     * NĐ 254/2026/NĐ-CP: [📄 Căn cứ: NĐ 254/2026/NĐ-CP - Điều X Khoản Y](/documents/ND_254_2026_ND-CP.pdf)
     * NĐ 15/2022/NĐ-CP: [📄 Căn cứ: NĐ 15/2022/NĐ-CP - Điều X](/documents/ND_15_2022_ND-CP.pdf)
     * NĐ 41/2022/NĐ-CP: [📄 Căn cứ: NĐ 41/2022/NĐ-CP - Điều X](/documents/ND_41_2022_ND-CP.pdf)
   - Người dùng sẽ bấm trực tiếp vào các liên kết này để mở file gốc kiểm tra.`;

  return context;
}
