export interface ReferenceDocument {
  id: string;
  code: string;
  name: string;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'doc';
  fileSize: string;
  status: 'active' | 'amended' | 'upcoming';
  statusLabel: string;
  effectiveDate: string;
  summary: string;
  keywords: string[];
}

export const OFFICIAL_REFERENCE_DOCUMENTS: ReferenceDocument[] = [
  {
    id: 'nd-70-2025',
    code: '70/2025/NĐ-CP',
    name: 'Nghị định 70/2025/NĐ-CP',
    fileName: 'ND_70_2025_ND-CP.pdf',
    fileUrl: '/documents/ND_70_2025_ND-CP.pdf',
    fileType: 'pdf',
    fileSize: '24.2 MB',
    status: 'active',
    statusLabel: 'Hiệu lực thi hành (Sửa đổi NĐ 123)',
    effectiveDate: '20/03/2025',
    summary:
      'Sửa đổi, bổ sung 40/61 điều NĐ 123/2020: Bắt buộc HĐĐT từ máy tính tiền kết nối CQT với hộ kinh doanh > 1 tỷ đồng; xác thực sinh trắc học eTax Mobile; chuẩn hóa thời điểm xuất hóa đơn cho hàng hóa, dịch vụ, xuất khẩu, bảo hiểm.',
    keywords: ['70/2025', 'nghị định 70', 'nđ 70', 'nd 70', '70/2025/nđ-cp'],
  },
  {
    id: 'nd-123-2020',
    code: '123/2020/NĐ-CP',
    name: 'Nghị định 123/2020/NĐ-CP',
    fileName: 'ND_123_2020_ND-CP.doc',
    fileUrl: '/documents/ND_123_2020_ND-CP.doc',
    fileType: 'doc',
    fileSize: '2.4 MB',
    status: 'amended',
    statusLabel: 'Văn bản gốc nền tảng (Được sửa đổi bởi NĐ 70)',
    effectiveDate: '19/10/2020',
    summary:
      'Quy định chi tiết về hóa đơn, chứng từ điện tử; nguyên tắc lập, định dạng chuẩn dữ liệu, hóa đơn có mã và không có mã, thời điểm lập và xử lý hóa đơn sai sót (Điều 19; Mẫu 04/SS-HĐĐT).',
    keywords: ['123/2020', 'nghị định 123', 'nđ 123', 'nd 123', '123/2020/nđ-cp'],
  },
  {
    id: 'nd-254-2026',
    code: '254/2026/NĐ-CP',
    name: 'Nghị định 254/2026/NĐ-CP',
    fileName: 'ND_254_2026_ND-CP.pdf',
    fileUrl: '/documents/ND_254_2026_ND-CP.pdf',
    fileType: 'pdf',
    fileSize: '6.8 MB',
    status: 'active',
    statusLabel: 'Chi tiết Luật Quản lý thuế 108/2025',
    effectiveDate: '30/06/2026',
    summary:
      'Quy định chi tiết thi hành Luật Quản lý thuế số 108/2025/QH15 về hóa đơn, chứng từ điện tử; chuẩn hóa định dạng XML, kết nối chia sẻ dữ liệu liên ngành và chính sách thưởng cho người tiêu dùng tố giác vi phạm.',
    keywords: ['254/2026', 'nghị định 254', 'nđ 254', 'nd 254', '254_2026', '254/2026/nđ-cp'],
  },
  {
    id: 'nd-15-2022',
    code: '15/2022/NĐ-CP',
    name: 'Nghị định 15/2022/NĐ-CP',
    fileName: 'ND_15_2022_ND-CP.pdf',
    fileUrl: '/documents/ND_15_2022_ND-CP.pdf',
    fileType: 'pdf',
    fileSize: '28.3 MB',
    status: 'active',
    statusLabel: 'Chính sách miễn, giảm thuế GTGT 8%',
    effectiveDate: '28/01/2022',
    summary:
      'Quy định giảm thuế giá trị gia tăng từ 10% xuống 8%; danh mục hàng hóa dịch vụ không được giảm thuế (Phụ lục I, II, III); chi phí được trừ khi tính thuế TNDN.',
    keywords: ['15/2022', 'nghị định 15', 'nđ 15', 'nd 15', '15/2022/nđ-cp', 'thuế 8%'],
  },
  {
    id: 'nd-41-2022',
    code: '41/2022/NĐ-CP',
    name: 'Nghị định 41/2022/NĐ-CP',
    fileName: 'ND_41_2022_ND-CP.pdf',
    fileUrl: '/documents/ND_41_2022_ND-CP.pdf',
    fileType: 'pdf',
    fileSize: '1.3 MB',
    status: 'active',
    statusLabel: 'Sửa đổi Mẫu 01/TB-HĐSS (Nghị định 123)',
    effectiveDate: '20/06/2022',
    summary:
      'Ban hành Mẫu 01/TB-HĐSS thay thế Mẫu 01/TB-SSĐT (thông báo kết quả xử lý hóa đơn sai sót); hướng dẫn lập hóa đơn có nhiều mức thuế suất thuế GTGT khác nhau.',
    keywords: ['41/2022', 'nghị định 41', 'nđ 41', 'nd 41', '41/2022/nđ-cp', '01/tb-hđss'],
  },
];

export function detectReferencedDocuments(text: string): ReferenceDocument[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched: ReferenceDocument[] = [];

  for (const doc of OFFICIAL_REFERENCE_DOCUMENTS) {
    const isDirectMatch = doc.keywords.some((kw) => lower.includes(kw));
    const isUrlMatch = lower.includes(doc.fileName.toLowerCase()) || lower.includes(doc.id);
    if (isDirectMatch || isUrlMatch) {
      matched.push(doc);
    }
  }

  return matched;
}
