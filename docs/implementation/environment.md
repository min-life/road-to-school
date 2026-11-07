# Biến môi trường được tham chiếu trong source

Không đọc hoặc sao chép .env. Bảng là tên biến và nơi sử dụng, không khẳng định tất cả bắt buộc hoặc mọi tính năng cần cấu hình. Bắt buộc nền tảng: DATABASE_URL và secret JWT riêng; các nhóm dịch vụ chỉ cần khi dùng tính năng tương ứng. Đọc fallback/nhánh kiểm tra ở file dẫn để biết điều kiện.

| Biến | Source tham chiếu |
| --- | --- |
| AUTH_ACCESS_TOKEN_TTL_SECONDS | [api/src/auth/auth.module.ts](../../api/src/auth/auth.module.ts), [api/src/auth/auth.service.ts](../../api/src/auth/auth.service.ts) |
| AUTH_EMAIL_MODE | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| AUTH_JWT_ACCESS_SECRET | [api/src/auth/auth.guard.ts](../../api/src/auth/auth.guard.ts), [api/src/auth/auth.module.ts](../../api/src/auth/auth.module.ts) |
| AUTH_OTP_LENGTH | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| AUTH_OTP_TTL_SECONDS | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| AUTH_REFRESH_TOKEN_TTL_SECONDS | [api/src/auth/auth.service.ts](../../api/src/auth/auth.service.ts) |
| BOOTSTRAP_ADMIN_EMAIL | [api/scripts/seed-admin.ts](../../api/scripts/seed-admin.ts) |
| BOOTSTRAP_ADMIN_PASSWORD | [api/scripts/seed-admin.ts](../../api/scripts/seed-admin.ts) |
| CLOUDINARY_API_KEY | [api/src/schools/cloudinary.service.ts](../../api/src/schools/cloudinary.service.ts) |
| CLOUDINARY_API_SECRET | [api/src/schools/cloudinary.service.ts](../../api/src/schools/cloudinary.service.ts) |
| CLOUDINARY_CLOUD_NAME | [api/src/schools/cloudinary.service.ts](../../api/src/schools/cloudinary.service.ts) |
| DATABASE_URL | [api/prisma/schema.prisma](../../api/prisma/schema.prisma) |
| EXPO_PUBLIC_API_URL | [mobile/services/api.ts](../../mobile/services/api.ts) |
| EXPO_PUBLIC_VIETMAP_API_KEY | [mobile/services/vietmap.service.ts](../../mobile/services/vietmap.service.ts) |
| EXPO_PUBLIC_VIETMAP_SERVICES_KEY | [mobile/services/vietmap.service.ts](../../mobile/services/vietmap.service.ts) |
| EXPO_PUSH_ACCESS_TOKEN | [api/src/notifications/push-delivery.service.ts](../../api/src/notifications/push-delivery.service.ts) |
| NEXT_PUBLIC_API_URL | [web/src/lib/api-client.ts](../../web/src/lib/api-client.ts) |
| NEXT_PUBLIC_VIETMAP_SERVICES_KEY | [web/src/lib/vietmap/vietmap.service.ts](../../web/src/lib/vietmap/vietmap.service.ts) |
| NEXT_PUBLIC_VIETMAP_TILEMAP_KEY | [web/src/components/admin/routes/route-map.tsx](../../web/src/components/admin/routes/route-map.tsx), [web/src/components/admin/schools/vietmap-picker.tsx](../../web/src/components/admin/schools/vietmap-picker.tsx) |
| NODE_ENV | [api/src/drivers/drivers.service.ts](../../api/src/drivers/drivers.service.ts), [api/src/schools/schools.service.ts](../../api/src/schools/schools.service.ts) |
| PORT | [api/src/main.ts](../../api/src/main.ts) |
| PUSH_NOTIFICATIONS_ENABLED | [api/src/notifications/push-delivery.service.ts](../../api/src/notifications/push-delivery.service.ts) |
| SMTP_FROM | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| SMTP_HOST | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| SMTP_PASSWORD | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| SMTP_PORT | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| SMTP_USER | [api/src/auth/otp.service.ts](../../api/src/auth/otp.service.ts) |
| TRIP_GENERATION_LOOKAHEAD_DAYS | [api/src/trips/trips.service.ts](../../api/src/trips/trips.service.ts) |
| TRIP_OPERATION_MODE | [api/src/incidents/incidents.service.ts](../../api/src/incidents/incidents.service.ts), [api/src/trips/trips.service.ts](../../api/src/trips/trips.service.ts) |
| VIETMAP_SERVICES_KEY | [api/src/routes/vietmap-vrp.service.ts](../../api/src/routes/vietmap-vrp.service.ts), [api/src/trips/vietmap-navigation.service.ts](../../api/src/trips/vietmap-navigation.service.ts) |
