# Gemini API Studio & Testing Playground

Ứng dụng web chuyên nghiệp dùng để kiểm thử, phân tích và tương tác với Google Gemini API, được xây dựng dựa trên mẫu cURL:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent" \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-Key: YOUR_API_KEY' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
```

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh

1. Mở terminal tại thư mục dự án:
   ```bash
   cd "C:\Users\letudivn\Documents\Gemini API Test"
   ```

2. Khởi chạy máy chủ phát triển (Vite dev server):
   ```bash
   npm run dev
   ```

3. Mở trình duyệt và truy cập:
   👉 **http://localhost:5173**

---

## 🌟 Các Tính Năng Nổi Bật

### 1. Chat Playground (Trò chuyện tương tác)
- Giao diện chat hiện đại, hỗ trợ hội thoại nhiều lượt (Multi-turn conversations).
- Tự động định dạng Markdown và Highlight khối mã nguồn (Code Blocks) kèm nút **Sao chép** tiện lợi.
- Hiển thị trực tiếp **Độ trễ (Latency ms)** và **Thống kê Token tiêu thụ** (Prompt Tokens, Candidate Tokens, Total Tokens).

### 2. Raw JSON & cURL Generator (Kiểm thử chuyên sâu)
- Trình biên tập Payload JSON trực tiếp với tính năng kiểm tra cú pháp và Format tự động (**Format JSON**).
- **Tự động sinh lệnh cURL tương ứng theo thời gian thực** để bạn có thể copy chạy ngay trong Terminal PowerShell hoặc Bash.
- Bảng hiển thị Phản hồi (Response) đầy đủ: Status Code, Response Body (JSON), Response Headers.

### 3. Cấu hình Linh hoạt & Đầy đủ (Sidebar Config)
- **API Key**: Đã nạp sẵn key của bạn, có nút ẩn/hiện và tự động lưu vào Local Storage.
- **Model Selector**:
  - `gemini-3.6-flash`: Phiên bản mới nhất Google khuyến nghị và đã được kiểm tra hoạt động thành công với API key của bạn.
  - `gemini-3-flash`: Model trong lệnh cURL ban đầu (sẽ báo hướng dẫn nâng cấp lên 3.6).
  - `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash`.
  - Tùy chọn nhập mã Model tùy ý.
- **Local Proxy Mode**: Tự động chuyển tiếp request qua server nội bộ Vite để vượt qua lỗi chặn vùng IP hoặc hạn chế CORS.
- **Hyperparameters**: Tinh chỉnh `Temperature` (từ chính xác đến sáng tạo), `Top-P`, `Top-K`, `Max Output Tokens`.
- **System Instruction**: Thiết lập hướng dẫn ngữ cảnh cho AI.

### 4. Mẫu Prompt Sẵn Có (Presets)
- Mẫu prompt từ lệnh cURL của bạn: *"Explain how AI works in a few words"*.
- Mẫu sinh code Python, trích xuất dữ liệu JSON có cấu trúc, dịch thuật và câu đố tư duy logic.

### 5. Lịch sử Kiểm thử (History Log)
- Lưu lại toàn bộ các lần gửi request trong phiên.
- Cho phép xem lại chi tiết Request/Response từng lần gọi và xuất file JSON để lưu trữ.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4 (Dark mode developer-first UI)
- **Icons**: Standalone SVG Lucide/Feather Icon system
- **Proxy**: Vite built-in reverse proxy (`/api/gemini-proxy`)
