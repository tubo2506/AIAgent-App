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

      // Nếu kho trên máy người dùng còn trống, tự động nạp 5 văn bản luật nền tảng
      if (rawDocs.length === 0 && DEFAULT_LEGAL_KNOWLEDGE && DEFAULT_LEGAL_KNOWLEDGE.length > 0) {
        try {
          const writeTx = db.transaction(STORE_NAME, 'readwrite');
          const writeStore = writeTx.objectStore(STORE_NAME);
          for (const doc of DEFAULT_LEGAL_KNOWLEDGE) {
            writeStore.put(normalizeDocument(doc));
          }
          rawDocs = [...DEFAULT_LEGAL_KNOWLEDGE];
        } catch (seedErr) {
          console.warn('Không thể tự động nạp tri thức mẫu vào IndexedDB:', seedErr);
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

/**
 * Định dạng các văn bản thành ngữ cảnh tri thức để đưa vào prompt cho Gemini
 */
export function buildLegalContextPrompt(activeDocs: KnowledgeDocument[]): string {
  if (!activeDocs || activeDocs.length === 0) return '';

  let context = `\n\n[KHO TRI THỨC VĂN BẢN THAM CHIẾU (Đã nạp và số hóa sẵn cho Agent)]\n`;
  context += `Hệ thống có ${activeDocs.length} tài liệu tri thức đang kích hoạt tham chiếu dưới đây:\n\n`;

  activeDocs.forEach((doc, idx) => {
    const scopeLabel = doc.scope === 'shared' ? 'DÙNG CHUNG' : 'RIÊNG CHO AGENT';
    context += `=======================================================\n`;
    context += `TÀI LIỆU ${idx + 1} [${scopeLabel}]: ${doc.title}${doc.code ? ` (Số hiệu: ${doc.code})` : ''}\n`;
    if (doc.category) context += `Danh mục: ${doc.category}\n`;
    if (doc.issuedDate) context += `Ngày ban hành / hiệu lực: ${doc.issuedDate}\n`;
    context += `TOÀN VĂN NỘI DUNG SỐ HÓA:\n${doc.content}\n`;
    context += `=======================================================\n\n`;
  });

  context += `YÊU CẦU: Hãy căn cứ chính xác vào các Điều, Khoản, Điểm hoặc các quy định trong các tài liệu tri thức ở trên để giải đáp thắc mắc của người dùng. Trích dẫn rõ ràng tên tài liệu và vị trí điều khoản liên quan.\n`;

  return context;
}
