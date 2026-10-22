# RoadToSchool — Kiến Trúc Hệ Thống (Phase 0 Foundation)

## 1. Giới thiệu tổng quan
RoadToSchool là hệ thống hỗ trợ quản lý và giám sát xe đưa đón học sinh.
Trong giai đoạn **Phase 0 — Project Foundation**, hệ thống được thiết lập theo mô hình ba ứng dụng hoàn toàn độc lập trong một kho lưu trữ (Multi-project repo không dùng workspace):

- **`api/`**: Backend REST API sử dụng NestJS, Prisma ORM, kết nối PostgreSQL local (port 3000).
- **`web/`**: Ứng dụng Web sử dụng Next.js (App Router), Tailwind CSS (port 5173).
- **`mobile/`**: Ứng dụng di động sử dụng Expo React Native với Expo Router và 3 bottom tabs (port 8081).

---

## 2. Nguyên tắc độc lập (Package Independence)
1. **Không có package.json hay node_modules tại root.**
2. Mỗi ứng dụng (`api`, `web`, `mobile`) tự quản trị toàn bộ dependencies qua npm độc lập.
3. Không sử dụng npm/yarn/pnpm workspaces, không dependency hoisting.
4. Mỗi project có thể mở và khởi chạy độc lập từ chính thư mục của nó.

---

## 3. Cấu hình mạng & Tự động kết nối (Automatic Host Resolution)
- **Backend API**:
  - Lắng nghe trên `0.0.0.0:3000` cho phép truy cập từ `localhost`, Android Emulator (`10.0.2.2`), iOS Simulator, và thiết bị thật qua LAN Wi-Fi.
  - Global API prefix: `/api/v1`
  - CORS cho phép Next.js Web (`http://localhost:5173`).
- **Mobile Host Resolution**:
  - Tự động trích xuất host IP từ runtime Expo Metro (`Constants.expoConfig?.hostUri` / `debuggerHost`).
  - Fallback thông minh: Android Emulator sử dụng `10.0.2.2:3000`, iOS/Web sử dụng `localhost:3000`.
  - Hỗ trợ biến môi trường tùy chọn `EXPO_PUBLIC_API_URL` khi cần ghi đè.

---

## 4. Bộ màu thương hiệu (Brand Palette)
Hệ thống sử dụng bảng màu tối giản thống nhất cho Web và Mobile:

| Token | Hex | Ý nghĩa |
|---|---|---|
| Primary / Brand | `#FFCB56` | Nút bấm, tab đang chọn, điểm nhấn |
| Background | `#FFFDF6` | Nền ứng dụng chính |
| Foreground / Text | `#1E293B` | Chữ chính, tiêu đề |
| Surface / Card | `#FFFFFF` | Thẻ nội dung, thanh điều hướng |

---

## 5. Endpoints cơ sở
- `GET /api/v1/health`: Kiểm tra trạng thái hoạt động của NestJS API server.
- `GET /api/v1/health/db`: Kiểm tra kết nối cơ sở dữ liệu PostgreSQL `roadtoschool` qua Prisma.
- `GET /api/docs`: Tài liệu Swagger / OpenAPI tương tác.
