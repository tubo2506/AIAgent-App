import os, json, re

processed_dir = r'Knowledge\processed'
pub_dir = r'public\knowledge'
os.makedirs(pub_dir, exist_ok=True)

# 1. ND 123/2020: 100% clean word text
with open(os.path.join(processed_dir, 'ND_123_2020.txt'), 'r', encoding='utf-8') as f:
    text_123 = f.read().strip()

# 2. ND 41/2022: EasyOCR Vietnamese
with open(os.path.join(processed_dir, 'ND_41_2022_vi.txt'), 'r', encoding='utf-8') as f:
    raw_41 = f.read()

lines_41 = []
for l in raw_41.splitlines():
    l = l.strip()
    if not l or l.startswith('=== TRANG') or l in ['|', '#', '8', '1', 'F']:
        continue
    lines_41.append(l)
text_41 = '\n'.join(lines_41)

# 3. ND 15/2022: EasyOCR Vietnamese
with open(os.path.join(processed_dir, 'ND_15_2022_vi.txt'), 'r', encoding='utf-8') as f:
    raw_15 = f.read()

lines_15 = []
for l in raw_15.splitlines():
    l = l.strip()
    if not l or l.startswith('=== TRANG') or l in ['|', '#', '8', '1', 'F', 'do', 'Hạnh', 'của']:
        continue
    lines_15.append(l)
text_15 = '\n'.join(lines_15)

# Dictionary for restoring Vietnamese diacritics in ND 70 and ND 254
VN_MAP = [
    (r'\bCHiNH PHU\b', 'CHÍNH PHỦ'),
    (r'\bCHINH PHU\b', 'CHÍNH PHỦ'),
    (r'\bCONG HOA XA HOI CHU NGHIA VIET NAM\b', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'),
    (r'\bCONGHOA XA HOICHU NGHIA VIET NAM\b', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'),
    (r'\bCONGHOA XA HOI CHU NGHIA VIET NAM\b', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'),
    (r'\bDoc lap-Tudo-Hanhphic\b', 'Độc lập - Tự do - Hạnh phúc'),
    (r'\bDoe lap-Tudo-Hanh phic\b', 'Độc lập - Tự do - Hạnh phúc'),
    (r'\bNGHI DINH\b', 'NGHỊ ĐỊNH'),
    (r'\bNGHIDINH\b', 'NGHỊ ĐỊNH'),
    (r'\bHa Noi, ngay\b', 'Hà Nội, ngày'),
    (r'\bthang (\d+) nam (\d+)\b', r'tháng \1 năm \2'),
    (r'\bSira doi, bo sung\b', 'Sửa đổi, bổ sung'),
    (r'\bSura doi, bo sung\b', 'Sửa đổi, bổ sung'),
    (r'\bsira doi, bo sung\b', 'sửa đổi, bổ sung'),
    (r'\bsura doi, bo sung\b', 'sửa đổi, bổ sung'),
    (r'\bsia doi, bo sung\b', 'sửa đổi, bổ sung'),
    (r'\bbo sung\b', 'bổ sung'),
    (r'\bcia Chinh phi\b', 'của Chính phủ'),
    (r'\bChinh phi\b', 'Chính phủ'),
    (r'\bChinh phu\b', 'Chính phủ'),
    (r'\bcia\b', 'của'),
    (r'\bchuing tir\b', 'chứng từ'),
    (r'\bchirng tir\b', 'chứng từ'),
    (r'\bchurng tir\b', 'chứng từ'),
    (r'\bching tit\b', 'chứng từ'),
    (r'\bchtrng tir\b', 'chứng từ'),
    (r'\bchimg tir\b', 'chứng từ'),
    (r'\bchtrng tu\b', 'chứng từ'),
    (r'\bduroc\b', 'được'),
    (r'\bdugc\b', 'được'),
    (r'\bkhau trir\b', 'khấu trừ'),
    (r'\bkhau tru\b', 'khấu trừ'),
    (r'\bluru trit\b', 'lưu trữ'),
    (r'\bluru trur\b', 'lưu trữ'),
    (r'\bluu tru\b', 'lưu trữ'),
    (r'\bdien tir\b', 'điện tử'),
    (r'\bdien tur\b', 'điện tử'),
    (r'\bdien ti\b', 'điện tử'),
    (r'\bdien tu\b', 'điện tử'),
    (r'\bhoa don\b', 'hóa đơn'),
    (r'\bHoa don\b', 'Hóa đơn'),
    (r'\bDieu (\d+)\b', r'Điều \1'),
    (r'\bDieu (\d+)a\b', r'Điều \1a'),
    (r'\bkhoan (\d+)\b', r'khoản \1'),
    (r'\bdiém ([a-zđ])\b', r'điểm \1'),
    (r'\bdiem ([a-zđ])\b', r'điểm \1'),
    (r'\bco quan thue\b', 'cơ quan thuế'),
    (r'\bco quan thue\b', 'cơ quan thuế'),
    (r'\bnguoi nop thue\b', 'người nộp thuế'),
    (r'\bnguoi nop thue\b', 'người nộp thuế'),
    (r'\bnguoi ban\b', 'người bán'),
    (r'\bnguoi mua\b', 'người mua'),
    (r'\bgia tri gia tang\b', 'giá trị gia tăng'),
    (r'\bho kinh doanh\b', 'hộ kinh doanh'),
    (r'\bmay tinh tien\b', 'máy tính tiền'),
    (r'\bkhoi tao tur\b', 'khởi tạo từ'),
    (r'\bkhoi tao\b', 'khởi tạo'),
    (r'\bdoanh nghiep\b', 'doanh nghiệp'),
    (r'\bthiet bi\b', 'thiết bị'),
    (r'\bchirc nang\b', 'chức năng'),
    (r'\bmurc thue\b', 'mức thuế'),
    (r'\bthue suat\b', 'thuế suất'),
    (r'\bthue gia tri gia tang\b', 'thuế giá trị gia tăng'),
    (r'\bthue thu nhap doanh nghiep\b', 'thuế thu nhập doanh nghiệp'),
    (r'\bthue thu nhap ca nhan\b', 'thuế thu nhập cá nhân'),
    (r'\bquy dinh\b', 'quy định'),
    (r'\bQuy dinh\b', 'Quy định'),
    (r'\bhieu luc thi hanh\b', 'hiệu lực thi hành'),
    (r'\bHieu luc\b', 'Hiệu lực'),
    (r'\bto chirc\b', 'tổ chức'),
    (r'\bca nhan\b', 'cá nhân'),
    (r'\btrach nhiem\b', 'trách nhiệm'),
    (r'\bkhach hang\b', 'khách hàng'),
    (r'\bhuy hoa don\b', 'hủy hóa đơn'),
    (r'\bdieu chinh\b', 'điều chỉnh'),
    (r'\bthay the\b', 'thay thế'),
    (r'\bsai sot\b', 'sai sót'),
    (r'\bchuyen doi\b', 'chuyển đổi'),
    (r'\bphuong phap\b', 'phương pháp'),
    (r'\btong cuc thue\b', 'Tổng cục Thuế'),
    (r'\bTong cuc Thue\b', 'Tổng cục Thuế'),
    (r'\bbo tai chinh\b', 'Bộ Tài chính'),
    (r'\bBo Tai chinh\b', 'Bộ Tài chính'),
    (r'\bQuoc hoi\b', 'Quốc hội')
]

def restore_vn(text):
    for pat, rep in VN_MAP:
        text = re.sub(pat, rep, text)
    lines = []
    for l in text.splitlines():
        l = l.strip()
        if not l or l.startswith('=== TRANG') or re.match(r'^\d+$', l) or 'LuatVietnam' in l or 'Tien ich van ban' in l or 'THUVIEN PHAPLUAT' in l:
            continue
        lines.append(l)
    return '\n'.join(lines)

with open(os.path.join(processed_dir, 'ND_70_2025_core.txt'), 'r', encoding='utf-8') as f:
    text_70 = restore_vn(f.read())

with open(os.path.join(processed_dir, 'ND_254_2026_core.txt'), 'r', encoding='utf-8') as f:
    text_254 = restore_vn(f.read())

docs = [
    {
        'id': 'doc_nd123_2020',
        'title': 'Nghị định 123/2020/NĐ-CP Quy định về hóa đơn, chứng từ',
        'code': '123/2020/NĐ-CP',
        'scope': 'agent',
        'assignedAgentIds': ['tax-accounting-law'],
        'category': 'Hóa đơn & Chứng từ',
        'issuedDate': '19/10/2020',
        'originalFileName': '123_2020_ND-CP_445980.doc',
        'originalSize': 2494976,
        'compressedSize': len(text_123.encode('utf-8')),
        'summary': 'Văn bản nền tảng quy định chi tiết về hóa đơn điện tử, chứng từ điện tử; nguyên tắc lập, định dạng dữ liệu, hóa đơn có mã và không có mã, thời điểm lập và xử lý sai sót.',
        'content': text_123,
        'isActive': True,
        'createdAt': '2026-09-10T10:00:00.000Z'
    },
    {
        'id': 'doc_nd70_2025',
        'title': 'Nghị định 70/2025/NĐ-CP Sửa đổi, bổ sung Nghị định 123/2020/NĐ-CP về hóa đơn, chứng từ',
        'code': '70/2025/NĐ-CP',
        'scope': 'agent',
        'assignedAgentIds': ['tax-accounting-law'],
        'category': 'Hóa đơn & Chứng từ',
        'issuedDate': '20/03/2025',
        'originalFileName': 'Nghị định-70-2025.pdf',
        'originalSize': 24215154,
        'compressedSize': len(text_70.encode('utf-8')),
        'summary': 'Sửa đổi, bổ sung 40/61 điều của NĐ 123/2020/NĐ-CP; bắt buộc hóa đơn điện tử khởi tạo từ máy tính tiền kết nối CQT với hộ kinh doanh doanh thu trên 1 tỷ đồng; xác thực sinh trắc học eTax Mobile; chuẩn hóa thời điểm xuất hóa đơn cho hàng hóa, dịch vụ, xuất khẩu, bảo hiểm, casino.',
        'content': text_70,
        'isActive': True,
        'createdAt': '2026-09-10T10:05:00.000Z'
    },
    {
        'id': 'doc_nd254_2026',
        'title': 'Nghị định 254/2026/NĐ-CP Quy định chi tiết Luật Quản lý thuế số 108/2025/QH15 về hóa đơn, chứng từ điện tử',
        'code': '254/2026/NĐ-CP',
        'scope': 'agent',
        'assignedAgentIds': ['tax-accounting-law'],
        'category': 'Hóa đơn & Chứng từ',
        'issuedDate': '30/06/2026',
        'originalFileName': 'NĐ_254_2026_Hoa don.pdf',
        'originalSize': 6860675,
        'compressedSize': len(text_254.encode('utf-8')),
        'summary': 'Quy định chi tiết thi hành Luật Quản lý thuế 108/2025/QH15; các trường hợp sử dụng HĐĐT có mã và không có mã, hóa đơn khởi tạo từ máy tính tiền; chia sẻ kết nối dữ liệu; chính sách thưởng cho người tiêu dùng tố giác vi phạm hóa đơn.',
        'content': text_254,
        'isActive': True,
        'createdAt': '2026-09-10T10:10:00.000Z'
    },
    {
        'id': 'doc_nd15_2022',
        'title': 'Nghị định 15/2022/NĐ-CP Chính sách miễn, giảm thuế theo Nghị quyết 43/2022/QH15',
        'code': '15/2022/NĐ-CP',
        'scope': 'agent',
        'assignedAgentIds': ['tax-accounting-law'],
        'category': 'Pháp luật & Thuế',
        'issuedDate': '28/01/2022',
        'originalFileName': 'NĐ_15_2022.pdf',
        'originalSize': 28339661,
        'compressedSize': len(text_15.encode('utf-8')),
        'summary': 'Quy định chính sách giảm thuế giá trị gia tăng từ 10% xuống 8%; danh mục hàng hóa dịch vụ không được giảm (Phụ lục I, II, III); chi phí được trừ khi xác định thu nhập chịu thuế TNDN cho các khoản tài trợ phòng chống dịch Covid-19.',
        'content': text_15,
        'isActive': True,
        'createdAt': '2026-09-10T10:15:00.000Z'
    },
    {
        'id': 'doc_nd41_2022',
        'title': 'Nghị định 41/2022/NĐ-CP Sửa đổi Nghị định 123/2020/NĐ-CP và Nghị định 15/2022/NĐ-CP',
        'code': '41/2022/NĐ-CP',
        'scope': 'agent',
        'assignedAgentIds': ['tax-accounting-law'],
        'category': 'Hóa đơn & Chứng từ',
        'issuedDate': '20/06/2022',
        'originalFileName': 'NĐ_41_2022.pdf',
        'originalSize': 1357309,
        'compressedSize': len(text_41.encode('utf-8')),
        'summary': 'Ban hành Mẫu 01/TB-HĐSS thay thế Mẫu 01/TB-SSĐT (thông báo tiếp nhận và kết quả xử lý HĐĐT sai sót); hướng dẫn lập hóa đơn chung có nhiều mức thuế suất thuế GTGT khác nhau theo NĐ 15/2022.',
        'content': text_41,
        'isActive': True,
        'createdAt': '2026-09-10T10:20:00.000Z'
    }
]

json_path = os.path.join(pub_dir, 'he-thong-nghi-dinh-hoa-don-thue.json')
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(docs, f, ensure_ascii=False, indent=2)
print('Exported JSON to:', json_path, 'Size:', os.path.getsize(json_path))

ts_path = r'src\data\defaultKnowledge.ts'
with open(ts_path, 'w', encoding='utf-8') as f:
    f.write('import type { KnowledgeDocument } from \'../types\';\n\n')
    f.write('export const DEFAULT_LEGAL_KNOWLEDGE: KnowledgeDocument[] = ')
    json.dump(docs, f, ensure_ascii=False, indent=2)
    f.write(';\n')
print('Exported TS to:', ts_path, 'Size:', os.path.getsize(ts_path))
