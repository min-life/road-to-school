# RoadToSchool — Gắn splash cho Tài xế

## 1. Task Information

13/11/2026, giờ Việt Nam. Mobile. Triển khai. Trạng thái `COMPLETED`.

## 2. Original Request

Người dùng yêu cầu thực hiện cách gắn SVG đã trao đổi ở lượt trước.

## 3. Approved Scope

Dùng biểu tượng người lái xe từ SVG người dùng cung cấp ở màn chào sau khi tài khoản Tài xế đăng nhập thành công.

## 4. Analysis & Decisions

Màn chào đã chọn ảnh dựa vào vai trò. Dùng asset riêng cho splash vì màn chi tiết chuyến cũng dùng `Bus.png`. Xuất PNG trong suốt 288 × 288 từ SVG gốc bằng Sharp đã có trong workspace.

## 5. Implementation Details

- [RoleSplash.tsx](../../mobile/components/RoleSplash.tsx) dùng ảnh mới cho nhánh `DRIVER`.
- [login-splash.svg](../../mobile/assets/driver/login-splash.svg) lưu đúng tệp thiết kế đã cung cấp.
- [login-splash.png](../../mobile/assets/driver/login-splash.png) là ảnh runtime, 12.105 byte.
- Bản phân tích trước triển khai nằm ở [history](history/2026-11-13-driver-login-splash-analysis.md).

## 6. Database Changes

None.

## 7. API & Swagger Changes

None.

## 8. UI/UX Changes

Biểu tượng 72 × 72 nằm giữa vòng tròn hiện có phía trên nhãn “Tài xế”. Màn chào hiện trong 1,2 giây sau đăng nhập thủ công rồi vào Trang chủ. Phạm vi bố cục đã được mô tả ở lượt trao đổi trước khi người dùng yêu cầu triển khai.

## 9. Verification & Testing

- PASS `tsc --noEmit --incremental false` trong Mobile.
- PASS `expo export --platform android --platform ios --dump-assetmap`. Hai gói cùng trỏ tới ảnh mới và nội dung PNG trong gói trùng với asset.
- PASS đối chiếu SVG với tệp người dùng gửi và kiểm tra PNG có vùng trong suốt.
- PASS `git diff --check` và kiểm tra phạm vi diff.
- NOT_VERIFIED đăng nhập và hiển thị trên điện thoại.

## 10. Issues & Risks

Cần kiểm tra ảnh và thời điểm chuyển màn khi đăng nhập bằng thiết bị thật.

## 11. Reviewer Focus

Xác nhận ảnh xuất hiện ở nhánh `DRIVER` và thời lượng màn chào là 1,2 giây.

## 12. Suggested Next Step

Đăng nhập bằng tài khoản Tài xế trên điện thoại để xem splash.

## 13. Approval Status

READY FOR USER REVIEW.
# AI Review — Migrate PostgreSQL local

## 1. Task Information

Ngày 13/11/2026, Asia/Saigon. Scope API infrastructure, local PostgreSQL và Documentation. Type Implementation/Verification. Status COMPLETED cho áp dụng migrations hiện có. Nhánh dongnnp/mobile/refactor-ui, baseline ddbb634, working tree sạch trước task.

## 2. Original Request

PO yêu cầu migrate database của project.

## 3. Approved Scope

Kiểm tra cấu hình kết nối và lịch sử migrations, đọc SQL trước khi apply, dùng Prisma migrate deploy cho database local đang cấu hình. Generate Prisma Client, kiểm tra trạng thái/metadata/typecheck và kết nối an toàn. Yêu cầu migrate được hiểu là áp dụng lịch sử migration hiện có trong source vào database local của backend.

## 4. Analysis & Decisions

DATABASE_URL hiệu lực lấy từ api/.env, không có process override. Target xác nhận roadtoschool/public tại 127.0.0.1:5433, role roadtoschool, PostgreSQL 18.6. Báo cáo chỉ ghi thông tin target, không ghi mật khẩu hay URL chứa credentials. Các mốc localhost:5432 trong docs trước thuộc snapshot khác, cấu hình máy này được dùng cho lượt thực thi.

Prisma status ban đầu cho biết 14 migrations đã apply và 8 pending. Kiểm tra SHA256 của 14 migration đã apply khớp file hiện tại, có xét chuẩn hóa LF/CRLF. Tám migration pending chỉ chứa additive DDL, không có seed/backfill/DML/drop/truncate. Các bảng mới chưa tồn tại. Triển khai bằng migrate deploy để giữ lịch sử.

Snapshot trước/sau thu bằng Prisma transaction có SET TRANSACTION READ ONLY, chỉ đọc migration history/catalog/row counts. Không khởi động ứng dụng/scheduler để tạo điều kiện kiểm thử.

## 5. Implementation Details

No application code changes.

Đã chạy Prisma migrate deploy và Prisma generate 6.19.3. Generated client nằm trong node_modules. Schema, migration files, package/lockfiles và api/.env giữ nguyên nội dung.

Đã cập nhật [CURRENT_STATE](../ai-handoff/CURRENT_STATE.md) bằng mốc DB local của phiên này. Báo cáo/diff trước được lưu nguyên bản tại [history MD](history/2026-11-13-before-local-db-migrate.md) và [history diff](history/2026-11-13-before-local-db-migrate.diff). [LATEST.diff](LATEST.diff) đánh dấu task không có thay đổi code.

## 6. Database Changes

Đã áp dụng 8 migrations theo đúng thứ tự trong lịch sử có sẵn.

| Migration | Nội dung |
| --- | --- |
| 20261103010000_school_lifecycle_calendar | trips.admin_finalization, bảng school_scheduled_changes và service_calendar_entries, indexes/FKs |
| 20261103023000_vehicle_status_and_route_plan_reoptimization | vehicles.is_active, route_plans.needs_reoptimization/reoptimization_reason và indexes |
| 20261104081535_add_province_and_incident_types | Ba enum sự cố NO_GUARDIAN_AT_STOP/TRAFFIC_DELAY/GPS_SIGNAL_LOST, province trên schools/students |
| 20261105010000_vehicle_iot_assignments | Bảng vehicle_iot_assignments, FKs, time check, partial unique active device/vehicle và indexes |
| 20261106000000_operation_and_parent_link_audit | trips.operation_audit và students.parent_link_audit JSONB nullable |
| 20261106010000_school_student_geography | province_id/ward_id/ward nullable trên schools/students |
| 20261106010000_student_rfid_uid | students.rfid_card_uid nullable, unique index, kiểm tra format và điều kiện học sinh DISABLED |
| 20261106020000_rfid_attendance_receipts | rfid_boarding_scan_id/rfid_alighting_scan_id nullable trên trip_attendances và unique indexes |

Sau migrate, 22/22 migrations finished, không có failed/rolled-back migration. Public có 22 bảng ứng dụng, không tính _prisma_migrations, tăng từ 19 bảng. Metadata ghi 234 → 292 columns và 81 → 97 indexes trong public, gồm metadata table và PK indexes. Ba bảng mới đều có 0 records. Số bản ghi của cả 19 bảng cũ giữ nguyên giữa hai snapshot. Migrations chỉ thay đổi cấu trúc và ghi lịch sử Prisma, không thực thi seed hay chỉnh bản ghi nghiệp vụ để kiểm thử.

Nguồn SQL nằm trong [prisma/migrations](../../api/prisma/migrations), model tại [schema.prisma](../../api/prisma/schema.prisma).

## 7. API & Swagger Changes

None. GET health/db được kiểm tra source trước khi gọi, handler chỉ SELECT 1. Endpoint http://127.0.0.1:3000/api/v1/health/db trả lỗi kết nối ECONNREFUSED, không có HTTP response. Runtime backend/Swagger chưa xác minh trong lượt này. Kết nối trực tiếp qua Prisma tới DB mục tiêu thành công.

## 8. UI/UX Changes

None.

## 9. Verification & Testing

- PASS npx --no-install prisma validate, schema hợp lệ.
- PASS kiểm tra checksum 14 migrations đã apply, đọc đủ 8 migration pending, kiểm tra additive DDL và target local.
- PASS npx --no-install prisma migrate deploy, exit 0, áp dụng đủ 8 migrations.
- PASS npx --no-install prisma generate, exit 0, client 6.19.3.
- PASS npx --no-install prisma migrate status sau deploy, Database schema is up to date, 22 migrations.
- PASS npx --no-install tsc --noEmit --incremental false tại api, exit 0.
- PASS read-only SQL xác nhận database/role/port/version, lịch sử migrations, các cột mới, indexes/constraints/FKs và số bản ghi trước/sau.
- PASS so sánh 787 tracked files api/mobile/web và hash api/.env với đầu task, đều giữ nguyên.
- FAIL kiểm tra schema khớp hoàn toàn bằng prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code. Diff còn đúng ba thao tác rename FK tại vehicle_iot_assignments. Quan hệ/cột/hành vi tham chiếu đã đối chiếu đúng, phần chênh lệch tên mô tả bên dưới.
- NOT_VERIFIED health backend thực tế do GET cổng 3000 bị ECONNREFUSED. Native/FE/IoT runtime và các ca nghiệp vụ có dữ liệu cũng chưa nghiệm thu.

Migrate status chỉ xác nhận migration history đã apply. Migrate diff là kiểm tra bổ sung giữa DB thực tế và Prisma datamodel, hai kết quả được ghi riêng. Không chạy test suites hoặc tạo dữ liệu phục vụ nghiệm thu.

## 10. Issues & Risks

Migration SQL tạo ba FK có tên tùy chỉnh, Prisma schema không khai báo map tương ứng nên diff đề xuất các rename sau.

| Tên hiện tại theo migration | Tên Prisma datamodel kỳ vọng |
| --- | --- |
| vehicle_iot_assignments_vehicle_fkey | vehicle_iot_assignments_vehicle_id_fkey |
| vehicle_iot_assignments_assigned_by_fkey | vehicle_iot_assignments_assigned_by_id_fkey |
| vehicle_iot_assignments_released_by_fkey | vehicle_iot_assignments_released_by_id_fkey |

Metadata xác nhận các FK lần lượt tham chiếu vehicles(id), users(id), users(id), đều ON UPDATE CASCADE/ON DELETE RESTRICT. Đây là chênh lệch tên trong source SQL/datamodel. Lượt này thực hiện đúng migrations hiện có, việc chuẩn hóa cần một thay đổi source/schema được review riêng.

Backend cổng 3000 chưa có kết nối để kiểm tra health sau migrate. Prisma Client đã generate, process backend đang sử dụng client cũ cần reload khi được khởi động lại.

## 11. Reviewer Focus

Kiểm tra target 127.0.0.1:5433 khác các mốc 5432 trong lịch sử, đủ 8 migrations mới và tổng 22/22. Phân biệt migration history hoàn tất với ba FK name differences. Rà sự hiện diện của partial unique indexes/time/RFID constraints, số bản ghi 19 bảng cũ và trạng thái rỗng của ba bảng mới. Không suy diễn typecheck/direct Prisma connection thành chứng nhận backend HTTP đang chạy.

## 12. Suggested Next Step

Khởi động backend và kiểm tra GET /api/v1/health/db trên cổng 3000 để xác minh kết nối từ tiến trình ứng dụng.

## 13. Approval Status

Đã thực hiện migrate theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL đối với các vấn đề source/constraint naming và nghiệm thu runtime ghi trong báo cáo.
