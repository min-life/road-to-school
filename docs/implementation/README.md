# RoadToSchool V2 — Hướng dẫn implementation và vận hành

Cập nhật 29/10/2026 (Asia/Saigon), source tham chiếu `db02de6`, nhánh `dongnnp/mobile/refactor-ui`. Bộ tài liệu này và phần bổ sung UI trong docs đang **chưa commit**. Căn cứ source; không chứng nhận production hoặc thiết bị thật.

## Mục lục

- [Kiến trúc, tính năng và luồng nghiệp vụ](features.md)
- [Thiết lập, kiểm tra và xử lý lỗi local](local-operations.md)
- [API backend](api-catalog.md)
- [Schema, enum, quan hệ, indexes và migrations](data-model.md)
- [SQL pgAdmin tạo tuyến DRAFT và liên kết học sinh để PO tự test UI local](pgadmin-parent-ui-data.md)
- [Tên biến môi trường và source sử dụng](environment.md)
- [Bản đồ routes, services, DTO, tests và scripts](source-map.md)
- [Onboarding, Login, Quên mật khẩu, Đăng ký đã triển khai trong session](../architecture/mobile-ui-implementation-status.md)
- [Trang chủ phụ huynh: phong cách V1, bảo toàn context V2](../architecture/mobile-parent-home-ui.md)
- [Phase 2: header/tab điều hướng, component API, role và safe area](../architecture/mobile-navigation-phase2.md)
- [Toàn bộ 5 màn OTP: ảnh V1, component/style, hành vi và kiểm chứng](../architecture/mobile-otp-ui.md)
- [Bàn phím, focus, modal/drawer và checklist](../architecture/mobile-keyboard-behavior.md)

Đọc [WORKING_RULES](../WORKING_RULES.md) và [BUSINESS_CONTEXT](../BUSINESS_CONTEXT.md) trước khi thay đổi. Các bản thiết kế cũ có trạng thái chưa duyệt và số migration cũ; dùng schema/controller/service hiện tại để xác định implementation. Không coi đề xuất chưa duyệt là chức năng đã hoàn thành.

## Cách sử dụng tài liệu

Người mới bắt đầu từ local-operations, sau đó features và routes. Khi sửa một tính năng, đọc controller → DTO → service → Prisma rồi API client → provider/hook → screen. API catalog là route được khai báo backend; các kiểu TypeScript phía client không thay cho DTO backend. Khi cần response chính xác, dùng DTO được controller import và Swagger của chính backend đang chạy.

## Cập nhật Phase 2 Mobile

Header/tab đã triển khai local sau mốc Phase 1 nêu ở đầu tài liệu. Kết quả hiện tại và giới hạn runtime có trong tài liệu Phase 2 ở mục lục; chưa commit/push đợt này.

## Tình trạng xác minh

Task docs chỉ kiểm tra source, manifest, scripts và liên kết. Kết quả typecheck/15 tests onboarding-keyboard/bundle đã chạy trong session trước được ghi ở tài liệu UI, với mốc/phạm vi riêng. Không chạy seed, migration, integration/E2E hoặc mutation để viết tài liệu này. Các luồng nhiều role, email/SMS thực tế, GPS/camera, push và bàn phím thiết bị vẫn phải nghiệm thu riêng.
