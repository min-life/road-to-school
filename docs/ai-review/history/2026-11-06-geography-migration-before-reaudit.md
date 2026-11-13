# AI Review — Migrate địa giới local, 06/11/2026

## 1. Tổng quan

MIGRATION_APPLIED / TYPECHECK_PASS / RUNTIME_NOT_VERIFIED. Migration20261106010000_school_student_geography đã apply thành công vào DB local roadtoschool/public localhost:5432;19migrations up to date.

## 2. Yêu cầu gốc

PO chỉ thị “migrate” cho migration6cột nullable địa giới đã trình ở lượt triển khai bộ lọc. Không mở phạm vi backfill hoặc test scripts.

## 3. Phạm vi và nguồn

IMPLEMENTATION; đọc tài liệu theo AGENTS, kiểm git status và SQL. DDL chỉ thêm province_id/ward_id/ward vào schools/students. Giữ uncommitted work trước task; không đổi source/schema/env/dependency/FE/git history.

## 4. Thực hiện

migrate status trước xác nhận chỉ migration địa giới đang chờ. prisma migrate deploy áp dụng đúng migration đó. migrate status sau báo schema up to date,19migrations. Không migrate dev/reset/seed hoặc DML dữ liệu nghiệp vụ.

## 5. Nghiệp vụ

DB có đủ cột cho filter tỉnh/phường và dropdown đã triển khai. Không tự điền ID/tên vào bản ghi cũ, không đổi quy tắc eligibility hoặc tự filter địa chỉ khi lập phương án. Báo cáo triển khai lưu history/2026-11-06-geography-implementation-before-migrate.md.

## 6. Database

SELECT information_schema.columns xác nhận đủ6cột: schools.province_id,schools.ward_id,schools.ward,students.province_id,students.ward_id,students.ward. Tất cả TEXT,nullable YES. _prisma_migrations: migration finished=true,not_rolled_back=true. Chỉ truy vấn metadata, không xuất dữ liệu cá nhân hoặc credentials. Prisma client đã generate ở task trước; schema không đổi lượt migrate nên không generate lại.

## 7. API / Swagger

Không đổi contract/API/DTO trong task migrate. Swagger UI/JSON200,2API mới/optional filters/response schemas đã kiểm task trước; không khởi động API/cron để thử migration. Base local http://localhost:3000/api/v1; docs http://localhost:3000/api/docs.

## 8. UI/UX

Không thay UI; wireframe không áp dụng. Dropdown đọc địa giới đã có trong dữ liệu đúng scope; vì không backfill nên có thể rỗng trên dữ liệu cũ. Bản ghi thiếu ID vẫn hiện khi không gửi bộ lọc.

## 9. Verification

- migrate status trước: đúng một migration pending.
- migrate deploy: PASS.
- migrate status sau: PASS,19migrations up to date.
- Metadata6cột TEXT nullable và migration finished/không rollback: PASS.
- API tsc --noEmit: PASS,0 lỗi.
- git diff --check: kiểm sau cập nhật docs.
- Test scripts/unit/e2e/provider/mutation nghiệp vụ: không chạy.
- Runtime/cron/FE integration: NOT_VERIFIED, BLOCKED_BY_TEST_DATA_POLICY; không dùng typecheck thay UAT.

## 10. Giới hạn và tác động

Điều kiện thiếu6cột trên local đã giải quyết. Không tự apply DB môi trường khác, không xác nhận coverage dữ liệu VietMap hoặc backfill. Không thể coi19migrations đồng bộ là toàn bộ nghiệp vụ đã nghiệm thu.

## 11. Files

Chỉ docs: FE_INTEGRATION_GUIDE, BUSINESS_IMPROVEMENT_TRACKER, CURRENT_STATE, master plan Z7/Z8, LATEST và history. LATEST.diff giữ patch API tích lũy trước đó, không có code change mới trong task migrate. Báo cáo/diff triển khai trước migrate đã archive.

## 12. Kết luận và một bước tiếp theo

Migration địa giới local hoàn tất, metadata xác nhận và typecheck đạt. Bước tiếp theo duy nhất: nạp lại API local để FE dùng bộ lọc mới. Không tự backfill dữ liệu hoặc gọi mutation để thử.

## 13. Trạng thái bàn giao

MIGRATION_APPLIED / TYPECHECK_PASS / RUNTIME_NOT_VERIFIED. Không commit/push/test scripts/env change/seed. Dừng sau task và chờ phản hồi PO.
