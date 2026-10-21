# MobiAgri — Quản lý vùng nguyên liệu

Ứng dụng quản lý vùng nguyên liệu cho hợp tác xã và đội sản xuất. Mục tiêu là thay thế việc ghi chép rời rạc bằng một luồng quản lý thống nhất:

- Frontend React/Vite
- Backend Express + Prisma + SQLite
- Số hóa hộ nông dân, diện tích và cây trồng
- Nhật ký bón phân, phun thuốc, thu hoạch
- Theo dõi mùa vụ và dự báo sản lượng
- Dashboard hỗ trợ HTX chủ động kế hoạch thu mua, thương lái và siêu thị

## Cấu trúc

- `backend/`: API Node.js/Express
- `frontend/`: giao diện React
- `backend/prisma/schema.prisma`: mô hình dữ liệu Prisma mẫu

## Chạy nhanh

```bash
cd D:\PROJECT\mobiagri-app
npm install
npm --prefix backend install
npm --prefix frontend install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

Khi muốn backend phục vụ luôn giao diện đã build (phù hợp khi chạy production):

```bash
npm run build
npm start
```

Sau đó mở http://localhost:4000. Các route `/api/*` vẫn được Express xử lý như bình thường.

## Cấu hình khu vực

Sao chép `backend/.env.example` thành `backend/.env` để đặt tên khu vực và tọa độ mặc định khi người dùng không cấp quyền GPS. Khi được cấp quyền, thời tiết sẽ ưu tiên tọa độ thiết bị và lấy dữ liệu trực tiếp từ Open-Meteo. Hệ thống không dùng dữ liệu thời tiết mẫu khi API lỗi.

## Cấu hình AI thật

Chẩn đoán AI dùng Gemini qua OpenAI-compatible endpoint. Đặt các biến sau trong `backend/.env`:

```env
AI_API_KEY=your-provider-key
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL=gemini-3.6-flash
```

`AI_API_KEY` là Gemini API key lấy từ Google AI Studio. Không đưa key vào frontend, git hoặc tin nhắn công khai. Nếu dùng model Gemini khác được tài khoản hỗ trợ, thay giá trị `AI_MODEL` tương ứng.

Endpoint AI yêu cầu đăng nhập, giới hạn lượt gọi và hỗ trợ ảnh JPEG/PNG/WebP. Nếu chưa cấu hình key, giao diện sẽ báo dịch vụ chưa sẵn sàng thay vì trả kết quả giả.

## API chính

- `GET /api/health`
- `GET /api/ai/health`
- `POST /api/ai/detect` (yêu cầu đăng nhập)
- `GET /api/weather/forecast`
- `GET /api/farm/farmers`
- `GET /api/farm/seasons`
- `GET /api/farm/plots`
- `POST /api/farm/plots`
- `GET /api/farm/logs`
- `POST /api/farm/logs`
- `GET /api/forum/posts`

## Kịch bản thuyết trình 5–7 phút

1. Mở `http://localhost:5173`, giới thiệu bài toán: hộ dân sản xuất nhỏ lẻ khiến HTX khó kiểm soát sản lượng và chất lượng.
2. Ở **Tổng quan**, trình bày 4 KPI: số hộ, diện tích vùng nguyên liệu, số nhật ký và sản lượng dự báo.
3. Mở **Hộ nông dân** để tra cứu một hộ: liên hệ, địa chỉ, diện tích, cây trồng và trạng thái.
4. Mở **Nhật ký canh tác**, chọn **+ Ghi nhật ký**, nhập hoạt động bón phân/phun thuốc/thu hoạch rồi lưu. Dữ liệu mới sẽ xuất hiện trên danh sách và KPI.
5. Mở **Mùa vụ & dự báo**, giải thích ngày gieo trồng, ngày thu hoạch và tổng sản lượng dự kiến. Đây là căn cứ để HTX lên kế hoạch ký hợp đồng.
6. Kết luận bằng quy trình 4 bước trên trang tổng quan: thêm hộ dân → ghi nhật ký → theo dõi mùa vụ → dự báo và ký hợp đồng.

## Ghi chú kỹ thuật

- Dữ liệu nghiệp vụ lưu trong SQLite qua Prisma; dữ liệu mẫu chỉ được dùng khi seed database ban đầu.
- Sản lượng mùa vụ vẫn là số liệu cán bộ nhập/dự báo, chưa phải mô hình ML.
- Khi triển khai production cần dùng HTTPS, JWT secret riêng, backup SQLite hoặc chuyển sang PostgreSQL, xác thực email và quy trình cấp quyền.
