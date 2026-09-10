import type { LegalDocument } from '../types';

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
 * Lấy tất cả văn bản trong kho
 */
export async function getAllDocuments(): Promise<LegalDocument[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sắp xếp văn bản mới nhất lên trước
      const docs: LegalDocument[] = request.result || [];
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(docs);
    };

    request.onerror = () => {
      reject(request.error || new Error('Lỗi đọc danh sách văn bản'));
    };
  });
}

/**
 * Lấy danh sách các văn bản đang được BẬT (active) để làm ngữ cảnh chat
 */
export async function getActiveDocuments(): Promise<LegalDocument[]> {
  const all = await getAllDocuments();
  return all.filter((d) => d.isActive);
}

/**
 * Thêm hoặc cập nhật văn bản vào kho
 */
export async function saveDocument(doc: LegalDocument): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(doc);

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
      const doc: LegalDocument = getReq.result;
      if (!doc) {
        reject(new Error('Không tìm thấy văn bản'));
        return;
      }

      doc.isActive = !doc.isActive;
      doc.updatedAt = new Date().toISOString();

      const putReq = store.put(doc);
      putReq.onsuccess = () => resolve(doc.isActive);
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
 * Định dạng các văn bản đang bật thành ngữ cảnh chuẩn bị đưa vào prompt cho Gemini
 */
export function buildLegalContextPrompt(activeDocs: LegalDocument[]): string {
  if (!activeDocs || activeDocs.length === 0) return '';

  let context = `\n\n[KHO VĂN BẢN PHÁP LUẬT THAM CHIẾU (Đã số hóa sẵn từ hệ thống)]\n`;
  context += `Hệ thống có ${activeDocs.length} văn bản pháp luật chính thức đang được kích hoạt tham chiếu dưới đây:\n\n`;

  activeDocs.forEach((doc, idx) => {
    context += `=======================================================\n`;
    context += `VĂN BẢN ${idx + 1}: ${doc.title}${doc.code ? ` (Số hiệu: ${doc.code})` : ''}\n`;
    if (doc.issuedDate) context += `Ngày ban hành: ${doc.issuedDate}\n`;
    context += `TOÀN VĂN NỘI DUNG SỐ HÓA:\n${doc.content}\n`;
    context += `=======================================================\n\n`;
  });

  context += `YÊU CẦU: Hãy căn cứ chính xác vào các Điều, Khoản, Điểm của các văn bản pháp luật số hóa ở trên để giải đáp câu hỏi của người dùng. Khi trích dẫn, hãy ghi rõ tên văn bản và số điều khoản cụ thể.\n`;

  return context;
}
