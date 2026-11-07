# AI Review — Sửa Prisma deserialize void ở advisory lock, 06/11/2026

## 1. Tổng quan

Đã sửa lỗi source khiến tác vụ nền đối soát thất bại với Failed to deserialize column of type void. Trạng thái: FIX_IMPLEMENTED / TYPECHECK_BUILD_LINT_PASS / RUNTIME_NOT_VERIFIED.

## 2. Yêu cầu gốc

PO báo log lỗi ContractLifecycleService, SystemSettingsService và IncidentsDetectorService sau migration. Tiếp tục sửa lỗi trong phạm vi triển khai được duyệt; không chạy script test hoặc thay đổi dữ liệu nghiệp vụ để thử.

## 3. Phạm vi và nguồn đối chiếu

Đọc các tài liệu theo AGENTS và kiểm git status, giữ toàn bộ uncommitted work. Chỉ sửa cách lấy kết quả SQL của advisory transaction lock, không đổi nghiệp vụ/khóa/phân quyền/payload. Báo cáo migration trước sửa lưu history/2026-11-06-before-void-lock-fix.md.

## 4. Nguyên nhân

Helper lockOperations dùng SELECT pg_advisory_xact_lock(3202032) qua Prisma.$queryRaw. PostgreSQL trả cột void; Prisma không giải mã kiểu đó. Các cron định kỳ dùng chung helper nên báo lặp dù người dùng không gọi API. Lỗi này thuộc source khóa, không phải thiếu bảng/cột hay migration thất bại.

## 5. Thay đổi source

- api/src/trips/utils/operations-lock.ts: SELECT 1::integer AS locked FROM pg_advisory_xact_lock(3202032). Hàm vẫn được thực thi và giữ khóa tới hết transaction, kết quả trả về chỉ cột integer Prisma hỗ trợ.
- api/src/schools/service-calendar.service.ts: đường khóa lịch còn dùng SELECT void trực tiếp chuyển sang helper chung.
- api/src/notifications/notifications.service.ts: khóa theo push token cũng trả integer từ table function, giữ khóa hashtext(token) cũ.

Đã tìm toàn bộ pg_advisory trong api/src; các lời gọi còn lại đều không trả cột void trực tiếp. Không tháo bỏ khóa để né lỗi.

## 6. Database

Không đổi schema, không tạo/apply migration mới, không seed/reset/backfill. Migration audit đã apply ở lượt trước vẫn giữ nguyên; lượt sửa này không gọi DB hoặc tự chạy cron để kiểm thử.

## 7. API / Swagger

Không thay controller/DTO/request/response/status code, Swagger contract không đổi. Các endpoint nghiệp vụ dùng helper cũng hưởng bản sửa. Không cần FE đổi payload.

## 8. UI/UX

Không thay Web/Mobile, không có màn hình mới; wireframe không áp dụng.

## 9. Verification

- API npx --no-install tsc --noEmit: PASS,0 lỗi.
- npm run build: PASS trên cả ba file sửa cuối.
- oxlint ba file sửa: PASS, không warning/error.
- Rà source pg_advisory: PASS, không còn SELECT trực tiếp cột void.
- git diff --check: chạy sau lưu báo cáo.
- Test scripts/unit/e2e/DB probe/cron mutation/provider: không chạy theo giới hạn PO. RUNTIME_NOT_VERIFIED; không tuyên bố quan sát log hết lỗi.

## 10. Tác động và giới hạn

Bản sửa giải quyết nguyên nhân deserialize void thấy trong log. Typecheck/build không chứng minh mọi tác vụ nền hoàn tất runtime. API đang chạy cần nạp source/build mới; các lỗi khác nếu có cần log mới để đánh giá, không suy ra từ warning thiếu chi tiết.

## 11. Files và diff

Ba file source tại mục5; docs cập nhật CURRENT_STATE, FE guide, master plan và báo cáo. LATEST.diff là patch API/schema/DDL tích lũy so với HEAD, có cả công việc đã duyệt trước đó; lượt này chỉ thay ba đường khóa nêu trên. Báo cáo/diff trước sửa lưu history, không sửa env/dependency/git history.

## 12. Kết luận và một bước tiếp theo

Source đã sửa; bước tiếp theo duy nhất: nạp lại API và theo dõi một chu kỳ cron để xác nhận log runtime. Không tự thực thi đối soát vì có thể ghi dữ liệu nghiệp vụ.

## 13. Trạng thái bàn giao

FIX_IMPLEMENTED / TYPECHECK_BUILD_LINT_PASS / RUNTIME_NOT_VERIFIED. Không commit/push. Dừng sau task, chờ PO phản hồi log sau nạp lại API.
