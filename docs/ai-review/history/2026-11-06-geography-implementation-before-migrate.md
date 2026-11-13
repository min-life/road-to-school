# AI Review — Bộ lọc tỉnh/phường cho trường và học sinh, 06/11/2026

## 1. Tổng quan

SOURCE_IMPLEMENTED_WITH_LIMITATIONS / NEW_MIGRATION_PENDING / RUNTIME_NOT_VERIFIED. Đã triển khai bộ lọc tường minh, địa giới nullable và dropdown đúng scope. Không tự lọc địa chỉ học sinh ngoài kiểm eligibility khi lập phương án.

## 2. Yêu cầu và phê duyệt PO

PO duyệt provinceId String nullable, wardId String nullable, ward String nullable cho School/Student, giữ province tên tỉnh. Query provinceId/wardId optional trên school/student/preparation, AND khi cả hai, không query không lọc địa giới. Nguồn dropdown là địa giới có trong dữ liệu đúng quyền, chưa backfill. PO duyệt thêm GET schools/location-options và schools/:schoolId/students/location-options, provinceId optional, response provinces:[{id,name}], wards:[{id,name,provinceId}]. Không gọi VietMap khi GET.

## 3. Phạm vi và nguồn

IMPLEMENTATION theo phê duyệt field/contract. Đọc AGENTS/working rules/context/handoff/current state/latest/master plan, git status giữ uncommitted work. Chỉ API/docs/DDL đã duyệt, không UI/env/package/dependency/git mutation. Schema đã duyệt nhưng apply DB chưa được phép riêng; migrate audit trước không tự bao gồm địa giới mới.

## 4. Dữ liệu và provider

Helper Reverse v4 display_type=5 trích boundaries type0/tỉnh, type2/phường, ID lưu String. Giữ tên province, thêm ward tên đầy đủ; ID là provider ID, không tự coi là mã hành chính Nhà nước. Writer tạo School/Student, direct/approve Student address và scheduled School LOCATION lưu đủ metadata. School chỉ hiệu lực tại ngày hẹn, geocode lỗi lưu null theo quy tắc cũ, không giữ ID của tọa độ cũ. Không thay addressText từ provider, không sửa Trip snapshots để chuẩn hóa. Không backfill bản ghi cũ.

## 5. Filtering và eligibility

List Student thêm hai điều kiện vào cùng where với scope/search/status/hasAddress/routingStatus; count/findMany cùng where. List School lọc IDs theo vị trí hiệu lực (kể cả pending LOCATION đã đến ngày), sau đó count/pagination giữ where. Preparation giữ nguyên classify đủ/không đủ, thêm metadata, rồi filter view hai mảng chỉ khi người dùng gửi query. Không tự chọn tỉnh trường/bãi hoặc cùng phường, không đổi studentIds/Route/Trip hay đường kiểm optimize/confirm. Học sinh bị ẩn trong view không mặc nhiên không đủ điều kiện.

## 6. Database

Migration api/prisma/migrations/20261106010000_school_student_geography/migration.sql chỉ ADD6cột TEXT nullable (province_id/ward_id/ward ở schools và students), không bảng/index mới, không DML. **CHƯA APPLY**. Prisma generate và validate PASS, không migrate status/deploy/reset/seed/backfill trong task. Source/client mới đọc cột mới nên DB cũ cần apply trước runtime; DB local trước task đã có18migration và audit columns, không suy ra geography đã có.

## 7. API và Swagger

GET /api/v1/schools và /schools/:schoolId/students giữ query cũ + provinceId/wardId tùy chọn. GET /routes/preparation/:schoolId tương tự. String rỗng/không hợp lệ400, ID không có dữ liệu trả rỗng; không tự fallback tên/tỉnh trường. Field response cộng thêm nullable.

Hai GET location-options: trường chỉ SYSTEM_ADMIN; học sinh SYSTEM_ADMIN hoặc SCHOOL_ADMIN đúng trường. Bảo đảm school tồn tại404 và school scope403. Query provinceId chỉ thu hẹp wards, provinces toàn bộ địa giới trong dữ liệu được xem; không phụ thuộc trang hiện tại, không phải danh mục toàn quốc, không có network provider khi GET. Dropdown có thể rỗng vì chưa backfill.

Swagger decorators/types đồng bộ; kiểm HTTP localhost:3000/api/docs và /api/docs-json trả200. Có2endpoint mới, query optional trên3GET, và3field mới trong5response schemas. Chạy container metadata qua Express adapter, không app.init/listen, không khởi tạo Prisma DB lifecycle/scheduler. API live trước kiểm không truy cập được; không suy ra đã kiểm nghiệp vụ live.

## 8. UI/UX và FE

Không sửa Web/Mobile, không wireframe. FE đọc dropdown, gửi ID chuỗi, bỏ query để xem toàn scope; đổi tỉnh không giữ wardId trái tỉnh. Không tự chọn mặc định theo địa chỉ trường/bãi. Bản ghi thiếu ID vẫn hiện khi bỏ filter, không match filter cụ thể; không lọc một trang phía FE để thay filter toàn DB. Không tự xóa selection chỉ vì view đã đổi. Note FE tại FE_INTEGRATION_GUIDE mục11.

## 9. Verification

- npx --no-install prisma generate: PASS, không DB mutation.
- prisma validate: PASS.
- API tsc --noEmit: PASS.
- npm run build: PASS; sau đó chỉ format3helper/DTO bằng Prettier.
- oxlint19file liên quan: exit0,8warnings sẵn có ở SchoolsService/RoutesService; helpers mới không có warning.
- Swagger UI/JSON:200/200, optional queries/2API mới/5schema fields đạt.
- git diff --check: kiểm sau ghi docs/diff.
- Không chạy script test/unit/e2e, provider, backfill, mutation API/DB để thử. Runtime/count/permissions/provider/cron NOT_VERIFIED, BLOCKED_BY_TEST_DATA_POLICY và DDL chưa apply.

## 10. Tương thích và giới hạn

Không yêu cầu thêm field vào body tạo/cập nhật cũ; field nullable/query optional. Tạo/đổi địa chỉ thông thường vẫn gọi provider theo luồng hiện có, không tự phát sinh lô chuyển dữ liệu cũ. Metadata cũ thiếu thì chưa lọc theo ID được, dropdown có thể rỗng. Không đảm bảo danh mục địa giới đầy đủ toàn quốc/coverage provider hay pagination runtime chỉ từ typecheck. Phần thay plan cùng nhóm vẫn deferred theo task trước, không liên quan bộ lọc.

## 11. Files thay đổi

Schema/migration geography; schools/location-province.ts, geography.ts, dto/geography.dto.ts; School/Student list/response DTOs/controllers/services; scheduled-changes, contract-lifecycle và school-policy để materialize đúng ngày; student-requests writers; Routes preparation controller/service/DTO. Docs: master plan Z6/Z7, tracker, CURRENT_STATE, FE guide mục11, report/history/diff. LATEST.diff là patch API tích lũy so với HEAD, gồm cả công việc đã duyệt từ trước; không env/secrets.

## 12. Kết luận và một bước tiếp theo

Field/contract và source đã triển khai theo PO, docs/Swagger cập nhật, chưa chạy runtime/FE. **Bước tiếp theo duy nhất: PO duyệt apply migration geography mới vào local trước khi sử dụng source.** Chưa tự migrate theo quyền cũ của audit.

## 13. Trạng thái bàn giao

SOURCE_IMPLEMENTED_WITH_LIMITATIONS / NEW_MIGRATION_PENDING / RUNTIME_NOT_VERIFIED. Báo cáo trước triển khai lưu history/2026-11-06-geography-before-implementation.md. Không commit/push/test scripts/env/DB DML. Dừng sau task, chờ PO cho migrate mới.
