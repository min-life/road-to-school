# AI Review — Apply school lifecycle migration

## 1. Task Information
03/11/2026, Asia/Saigon. Database migration / documentation. COMPLETED migration; nghiệp vụ runtime chưa nghiệm thu.

## 2. Original Request
PO yêu cầu “tiến hành migrate cho tôi” sau lỗi thiếu public.school_scheduled_changes từ cron đối soát.

## 3. Approved Scope
Áp dụng migration 3.2 đã duyệt vào DB đang cấu hình của API; xác minh cấu trúc bằng truy vấn read-only. Không seed, không script test, không thay env/source/schema/dependencies.

## 4. Analysis & Decisions
Xác nhận target localhost:5432, database roadtoschool, schema public; không in thông tin đăng nhập. Trước apply có đúng một migration pending: 20261103010000_school_lifecycle_calendar trong tổng 15 migration. Đọc SQL xác nhận chỉ DDL thêm cấu trúc, không DML/backfill. Dùng prisma migrate deploy, không reset hoặc migrate dev.

## 5. Implementation Details
No application code changes. Giữ nguyên toàn bộ uncommitted work. Archive báo cáo/diff implementation trước vào history/20261103-1793642601490-before-school-migration.md/.diff. Cập nhật note FE, tracker, plan, schema contract và CURRENT_STATE để phản ánh migration đã apply; các giới hạn runtime vẫn giữ nguyên. LATEST.diff đánh dấu không thay đổi code trong task này, diff implementation cũ nằm trong archive.

## 6. Database Changes
APPLIED: 20261103010000_school_lifecycle_calendar vào roadtoschool/public tại localhost:5432.
- Thêm school_scheduled_changes và service_calendar_entries cùng indexes/FK đã duyệt.
- Thêm trips.admin_finalization JSONB nullable.
- Không seed/backfill hoặc chủ động sửa business records. Prisma tự ghi migration metadata theo quá trình deploy.
Sau apply: 15 migrations, Database schema is up to date.

## 7. API & Swagger Changes
None trong task này. API contract/Swagger giữ source trước; không cần sinh lại Prisma Client vì đã generate ở task implementation. Cron của BE người dùng đang chạy có thể truy cập các bảng mới từ lần gọi tiếp theo. Chưa khẳng định toàn bộ cron/business flow đã chạy thành công.

## 8. UI/UX Changes
None.

## 9. Verification & Testing
- PASS: prisma migrate status trước apply xác nhận đúng một pending migration; exit 1 của status trước apply thể hiện còn pending, không phải lỗi deploy.
- PASS: npx --no-install prisma migrate deploy; All migrations have been successfully applied.
- PASS: npx --no-install prisma migrate status sau apply; Database schema is up to date.
- PASS: truy vấn read-only pg_catalog.pg_tables xác nhận hai bảng mới tồn tại; information_schema.columns xác nhận trips.admin_finalization là jsonb, nullable YES.
- PASS: npx --no-install tsc --noEmit --incremental false tại api.
- NOT_VERIFIED: log cron tiếp theo trên terminal BE của người dùng; không chủ động gọi đối soát hoặc API mutation để test.
- NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY: UAT nghiệp vụ/calendars/concurrency; không chạy bất kỳ script test, không tạo dữ liệu giả hoặc gọi provider.

## 10. Issues & Risks
Lỗi missing-table đã được xử lý ở mức cấu trúc DB được kiểm chứng. Không suy ra mọi nghiệp vụ 3.2 đã nghiệm thu từ migration thành công. Không khởi động/tắt/restart BE của người dùng trong task này; tác vụ chạy sẵn có thể tự đối soát sau khi schema sẵn sàng.

## 11. Reviewer Focus
Đúng DB local, chỉ một migration được apply, hai bảng và cột JSONB tồn tại; không reset/seed/backfill/env changes; phân biệt migration verification với runtime business acceptance.

## 12. Suggested Next Step
Theo dõi lần cron đối soát tiếp theo trên terminal BE để xác nhận không còn lỗi thiếu bảng.

## 13. Approval Status
PO đã cho phép apply migration trong chat; migration COMPLETED. Báo cáo WAITING FOR USER REVIEW / APPROVAL; runtime acceptance chưa được tự đánh dấu APPROVED.

### Bàn giao Git — 03/11/2026

PO yêu cầu commit ngắn gọn và push code. Nhánh hiện tại chuongtv/update-be, remote origin https://github.com/min-life/road-to-school.git; fetch xác nhận HEAD đồng bộ remote trước commit. Phạm vi bàn giao: source API 3.2, migration và tài liệu/tracking/history liên quan đang có trong working tree. Commit message: feat: improve school lifecycle. Không sửa application code thêm, không chạy script test, không sửa env hoặc reset/rebase. Kết quả commit/push được xác nhận bằng Git và trả trong chat sau thực hiện.
