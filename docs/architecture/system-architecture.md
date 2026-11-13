# RoadToSchool v2.0 — System Architecture

> Trạng thái: `AS-IS`, đối chiếu với source code ngày 27/10/2026 (GMT+7).
> Phạm vi: kiến trúc runtime cấp hệ thống; không mô tả chi tiết toàn bộ endpoint hay quan hệ ERD.

```mermaid
flowchart LR
    subgraph actors["Người dùng"]
        webUsers["SYSTEM_ADMIN / SCHOOL_ADMIN"]
        mobileUsers["DRIVER / BUS_ATTENDANT / PARENT"]
    end

    subgraph clients["Client applications"]
        web["Web Admin | Next.js 16 + React 19 | Port 5173"]
        mobile["Mobile App | Expo 58 + React Native | Metro 8081"]
    end

    subgraph backend["Backend — một NestJS modular monolith | Port 3000"]
        api["REST API /api/v1 | JWT + RBAC + Validation | Swagger /api/docs"]
        domain["Business modules | Auth, Schools, Students, Parents, Drivers, Vehicles, Routes, Trips, Leave Notices"]
        scheduler["Daily scheduler | Sinh chuyến lúc 02:00 Asia/Ho_Chi_Minh"]
        prisma["Prisma ORM 6"]
    end

    subgraph data["Data layer"]
        postgres[("PostgreSQL | SystemHealth + 16 domain models")]
    end

    subgraph external["Third-party services"]
        vietmap["VietMap | Search, Geocode, VRP, Route v4, Map Tiles"]
        cloudinary["Cloudinary | School, student, user images"]
        smtp["SMTP provider | OTP email"]
    end

    webUsers -->|"Web browser"| web
    mobileUsers -->|"iOS / Android"| mobile

    web -->|"REST JSON over HTTP(S) | Bearer JWT | polling 5–15s"| api
    mobile -->|"REST JSON over HTTP(S) | Bearer JWT | polling 5–12s"| api
    mobile -->|"GPS position publish every 5s while navigating"| api

    api --> domain
    scheduler --> domain
    domain --> prisma
    prisma -->|"DATABASE_URL | PostgreSQL protocol"| postgres

    domain -->|"VRP and Route v4"| vietmap
    domain -->|"Upload / delete images"| cloudinary
    domain -->|"Send OTP email"| smtp
    web -->|"Direct search, geocode and map tiles"| vietmap
    mobile -->|"Direct search, geocode and map tiles via MapLibre WebView"| vietmap

    classDef actor fill:#FFFDF6,stroke:#FFCB56,color:#1E293B,stroke-width:2px;
    classDef client fill:#FFFFFF,stroke:#2563EB,color:#1E293B,stroke-width:2px;
    classDef core fill:#FFF7D6,stroke:#D79B00,color:#1E293B,stroke-width:2px;
    classDef store fill:#E8F5E9,stroke:#2E7D32,color:#1E293B,stroke-width:2px;
    classDef ext fill:#F3E8FF,stroke:#7E22CE,color:#1E293B,stroke-width:2px;

    class webUsers,mobileUsers actor;
    class web,mobile client;
    class api,domain,scheduler,prisma core;
    class postgres store;
    class vietmap,cloudinary,smtp ext;
```

## Những điểm kiến trúc đã xác nhận từ code

- Repository có ba project độc lập: `api`, `web`, `mobile`; không dùng monorepo tooling hay shared package.
- Backend là một NestJS modular monolith. Các module gọi Prisma trực tiếp; không có microservice, generic repository, CQRS hay message broker.
- Web và Mobile gọi cùng REST API `/api/v1`, dùng access/refresh JWT và RBAC cho 5 role.
- Đồng bộ trạng thái/GPS hiện dùng REST polling và ghi vị trí định kỳ; chưa có WebSocket/SSE server.
- PostgreSQL là nguồn dữ liệu trung tâm. Prisma schema hiện có `SystemHealth` và 16 model nghiệp vụ.
- VietMap được gọi từ backend cho VRP/Route v4 và trực tiếp từ Web/Mobile cho tìm kiếm, geocode và map tiles.
- Cloudinary lưu ảnh; Nodemailer gửi OTP qua SMTP. Nhánh SMS hiện chỉ log console trong development/test, chưa phải SMS provider production.
- Không có Google OAuth, Gemini, Redis, Amazon S3, Kafka/RabbitMQ hay WebSocket trong implementation hiện tại.

## Ranh giới chưa được xác định trong repository

- Source code không khai báo topology production như reverse proxy, load balancer, container platform, CDN, domain/TLS termination hay managed PostgreSQL provider. Vì vậy sơ đồ không tự suy diễn các thành phần này.
- Sơ đồ mô tả logical/runtime architecture hiện tại; không phải deployment architecture cho production.
