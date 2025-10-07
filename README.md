# Gemini Store Chatbox

AI Chatbox tool chuyên nghiệp cho store với Gemini AI, hỗ trợ upload tài liệu training và trả lời tự động về sản phẩm.

## Tính năng

- 🤖 **AI Chatbox nổi**: Floating chatbox góc phải màn hình với thiết kế blue gradient chuyên nghiệp
- 📄 **Upload tài liệu**: Admin panel để upload PDF, DOCX, TXT làm training data
- 💬 **Chat thông minh**: AI trả lời về sản phẩm và vấn đề pháp lý dựa trên tài liệu
- 📚 **Lưu lịch sử**: Tự động lưu lịch sử chat theo session
- ⚡ **Streaming**: Responses real-time từ Gemini AI
- 🎨 **Responsive**: Thiết kế responsive với animations mượt mà

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd gemini-store-chatbox
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env`:
```bash
cp .env.example .env
```

4. Cấu hình trong `.env`:
```env
# Google Gemini API Key (bắt buộc)
GOOGLE_API_KEY=your_gemini_api_key_here

# Admin token để truy cập admin panel (bắt buộc)
ADMIN_TOKEN=your_secure_admin_token_here

# Port server (tùy chọn, mặc định: 3000)
PORT=3000
```

5. Chạy migration để tạo database:
```bash
npm run migrate
```

6. Khởi động server:
```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### Lấy Google Gemini API Key

1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Đăng nhập với tài khoản Google
3. Click "Create API Key"
4. Copy API key và paste vào file `.env`

## Sử dụng

### Nhúng Chatbox vào website

Thêm script sau vào trang web của bạn:

```html
<script src="http://localhost:3000/widget.js" defer data-api="http://localhost:3000"></script>
```

### Admin Panel

Truy cập: `http://localhost:3000/admin.html`

**Tính năng:**
- 🔐 Xác thực admin với token
- 📤 Upload tài liệu PDF, DOCX, TXT (drag & drop)
- 📊 Thống kê tài liệu và chunks
- 🗑️ Xóa tài liệu không cần thiết
- 🔄 Làm mới danh sách real-time

**Hướng dẫn sử dụng:**
1. Nhập ADMIN_TOKEN vào ô xác thực
2. Kéo thả file hoặc click để chọn tài liệu
3. Đợi hệ thống xử lý và chunking
4. Kiểm tra kết quả trong bảng danh sách

### Demo Page

Truy cập: `http://localhost:3000/demo.html`

Trang demo để test chatbox với giao diện đẹp và hướng dẫn sử dụng.

## API Endpoints

### Chat API
- `POST /api/chat/sse` - Gửi tin nhắn và nhận streaming response
- `GET /api/chat/history` - Lấy lịch sử chat

### Upload API (cần ADMIN_TOKEN)
- `POST /api/upload` - Upload tài liệu
- `GET /api/upload/list` - Danh sách tài liệu
- `DELETE /api/upload/:id` - Xóa tài liệu

### Admin API
- `POST /api/admin/login` - Xác thực admin

## Cấu trúc dự án

```
├── server/
│   └── index.js          # Express server chính
├── src/
│   ├── db.js             # Database setup
│   ├── gemini.js         # Gemini AI integration
│   ├── routes/
│   │   ├── chat.js       # Chat routes
│   │   ├── admin.js      # Admin routes
│   │   └── upload.js     # Upload routes
│   └── utils/
│       └── text.js       # Text processing utilities
├── public/
│   ├── widget.js         # Chatbox widget
│   └── admin.html        # Admin panel
├── scripts/
│   └── migrate.js        # Database migration
└── package.json
```

## Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **AI**: Google Gemini API
- **Database**: SQLite với better-sqlite3
- **File Processing**: pdf-parse, mammoth
- **Frontend**: Vanilla JavaScript với CSS animations

## License

MIT License