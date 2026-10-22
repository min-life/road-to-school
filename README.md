# RoadToSchool — Phase 0 Project Foundation

Dự án sinh viên: Hệ thống quản lý và giám sát xe đưa đón học sinh.

---

## 1. Cấu Trúc Dự Án (Three Independent Projects)

```text
road-to-school-v2/
├── api/                  # NestJS Backend API + Prisma + PostgreSQL (Port 3000)
│   ├── src/
│   │   ├── health/       # Health & DB Connectivity Module
│   │   ├── prisma/       # Prisma Service & Lifecycle Module
│   │   ├── app.module.ts
│   │   └── main.ts       # Bootstrap (0.0.0.0:3000, prefix /api/v1, Swagger, CORS)
│   ├── prisma/
│   │   ├── schema.prisma # Schema định nghĩa
│   │   └── migrations/   # Lịch sử migration đã xác minh
│   ├── .env              # Biến môi trường local (PORT, DATABASE_URL)
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
│
├── web/                  # Next.js App Router + Tailwind CSS (Port 5173)
│   ├── src/
│   │   └── app/
│   │       ├── globals.css # RoadToSchool CSS Theme Variables
│   │       ├── layout.tsx
│   │       └── page.tsx    # Next.js default page (nguyên bản)
│   ├── public/
│   ├── .env.local        # NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
│
├── mobile/               # Expo React Native + Expo Router + 3 Bottom Tabs (Port 8081)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx # 3 bottom tabs (Home, Explore, Settings)
│   │   │   ├── index.tsx   # Home Tab + Backend Connectivity Test & Retry
│   │   │   ├── explore.tsx # Explore Tab Placeholder
│   │   │   └── settings.tsx# Settings Tab Placeholder
│   │   ├── _layout.tsx
│   │   └── modal.tsx
│   ├── constants/
│   │   ├── theme.ts      # RoadToSchool Brand Colors
│   │   └── Colors.ts
│   ├── services/
│   │   └── api.ts        # Automatic Backend Host Resolution & API Client
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
│
├── docs/                 # Tài liệu dự án
│   └── architecture/
├── .gitignore            # Git ignore chung cho toàn bộ repo
└── README.md
```

> **Quy tắc quan trọng**: Không có `package.json`, `package-lock.json` hay `node_modules` ở thư mục root. Mỗi dự án quản lý hoàn toàn độc lập thông qua `npm`.

---

## 2. Công Nghệ & Phiên Bản Đã Kiểm Chứng

| Thành phần | Công nghệ | Phiên bản | Port |
|---|---|---|---|
| **Môi trường** | Node.js | `v24.21.0` | - |
| **Package Manager** | npm | `11.19.0` | - |
| **Cơ sở dữ liệu** | PostgreSQL | `18.6 (x64 Windows)` | `5432` |
| **Backend API** | NestJS + Prisma | NestJS `12.x`, Prisma `6.19.3` | `3000` |
| **Web** | Next.js (App Router) + Tailwind CSS | Next.js `16.4.2`, React `19.3.0` | `5173` |
| **Mobile** | Expo + React Native + Expo Router | Expo SDK `58.0.17`, React Native `0.88.0` | `8081` |

---

## 3. Hướng Dẫn Khởi Chạy Local

### Bước 1: Khởi động Backend API

```bash
cd api
npm install       # (nếu chạy lần đầu)
npm run dev
```

- API Base: `http://localhost:3000/api/v1`
- Swagger Documentation: `http://localhost:3000/api/docs`
- Health Endpoint: `http://localhost:3000/api/v1/health`
- Database Health: `http://localhost:3000/api/v1/health/db`

### Bước 2: Khởi động Next.js Web

Mở một terminal mới:

```bash
cd web
npm install       # (nếu chạy lần đầu)
npm run dev
```

- Web URL: `http://localhost:5173`
- Hiển thị trang mặc định của Next.js với bộ màu RoadToSchool đã tích hợp.

### Bước 3: Khởi động Expo Mobile

Mở một terminal mới:

```bash
cd mobile
npm install       # (nếu chạy lần đầu)
npx expo start
```

- Metro Bundler: `http://localhost:8081`
- Chạy trên thiết bị:
  - Nhấn `a` để mở Android Emulator (tự kết nối Backend qua `10.0.2.2:3000`).
  - Nhấn `i` để mở iOS Simulator (tự kết nối Backend qua `localhost:3000`).
  - Quét mã QR bằng ứng dụng Expo Go trên điện thoại thật (tự động kết nối Backend qua IP mạng LAN do Metro cấp).

---

## 4. Cơ Chế Tự Động Kết Nối Mobile — Backend

Mobile tự động nhận diện host IP của Backend mà không cần cấu hình thủ công:
1. Trích xuất host IP runtime từ Metro (`Constants.expoConfig?.hostUri`).
2. Tự động liên kết với cổng Backend `3000` (`http://<LAN_IP>:3000/api/v1`).
3. Fallback cho Android Emulator (`10.0.2.2:3000`) và iOS Simulator / Web (`localhost:3000`).
4. Home Screen có khu vực kiểm tra kết nối thời gian thực với tính năng **Retry Connection** độc lập, an toàn khi Backend tạm thời tắt hoặc khởi động lại.

---

## 5. Bộ Màu Thương Hiệu (Brand Palette)

- **Primary**: `#FFCB56` (Vàng ấm)
- **Background**: `#FFFDF6` (Kem sáng)
- **Foreground**: `#1E293B` (Xanh than đậm)
- **Surface**: `#FFFFFF` (Trắng tinh)
