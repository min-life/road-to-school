# AI Review — Đồng bộ nghiệp vụ 3.1–3.18, phần độc lập

Ngày: 06/11/2026 (UTC+7). Mode: IMPLEMENTATION theo phê duyệt PO. Branch: chuongtv/update-be, baseline HEAD 41cf3b0. Trạng thái: SOURCE_IMPLEMENTED_WITH_LIMITATIONS; DB_MIGRATION_PENDING; RUNTIME_NOT_VERIFIED. Không tuyên bố toàn bộ master plan đã nghiệm thu.

## 1. Tổng quan hiện trạng

Đã triển khai các phần độc lập được duyệt của P0–P6: nhân sự có SĐT/email, nguyên tử OTP/nghiệp vụ, khóa vận hành chung, khả dụng/bàn giao, đồng bộ roster/default đúng mốc và giữ override, bãi theo lịch, thu hồi Parent link, correction/cancel-all-absent/reopen, vị trí/cảnh báo/sự cố, privacy và dashboard. Thay plan cùng nhóm học sinh được PO tách chốt riêng, chưa triển khai.

## 2. Yêu cầu gốc và quyết định mới nhất

Giữ payload cũ tối đa, chỉ bổ sung field; field phân vân phải hỏi PO, nghiệp vụ mới ưu tiên endpoint mới. PO duyệt ngoại lệ bắt buộc ngay email+phone khi tạo nhân sự, expectedFingerprint khi cancel/REOPTIMIZED. Địa chỉ/chèn chỉ Trip ngày mai; default từ hôm nay, giữ override. Dời bãi đến ngày mới hủy unfrozen/đánh dấu plan. GPS thủ công thiếu tọa độ nhận LAST_KNOWN/UNKNOWN. Bắt buộc cấu hình bãi trước lập lịch, không tự dùng tọa độ mặc định. Không thu hồi phiên khi cấp lại mật khẩu nhân sự.

## 3. Phạm vi và nguồn đối chiếu

Đọc AGENTS, WORKING_RULES, BUSINESS_CONTEXT, handoff, CURRENT_STATE, LATEST và master plan theo thứ tự. Quyết định PO trong hội thoại ưu tiên tài liệu lịch sử. Chỉ sửa API và docs; không sửa Web/Mobile/env/package manager/dependencies. Không commit/push/reset/discard. Thực tế uncommitted docs trước task được bảo toàn và báo cáo cũ lưu history. Mốc source mới cập nhật tại master plan mục Z, không biến đề xuất lịch sử chưa chốt thành quy tắc.

## 4. Kết quả theo nhóm nghiệp vụ

| Nhóm | Source hiện tại | Nghiệm thu |
|---|---|---|
| 3.1 | Tạo nhân sự cần email+SĐT, không backfill; giữ email/console/resend không thu hồi session; OTP link/request/leave cùng transaction nghiệp vụ | Chưa runtime |
| 3.2 | Giữ lifecycle/calendar đã chốt; thống nhất khóa trước row locks, task chốt hành chính lọc schoolId | Chưa regression runtime |
| 3.3 | Chặn inactive frozen, bàn giao recheck; dời bãi tới ngày, cron/đối soát bù và gate generation/readiness; bỏ bãi mặc định | Chưa cron/DB |
| 3.4 | Revoke Parent link reason + audit, scoped SCHOOL_ADMIN; đổi guardianPhone không unlink | Chưa runtime |
| 3.5/3.6 | Bán kính Haversine cấu hình, geocode nullable, kiểm preview/confirm; default sync đúng field, giữ overrides, recheck dưới khóa | Chưa provider/race |
| 3.7 | Reopen kiểm giờ/lịch/plan/nguồn lực/audit; firstServiceDate nullable; chặn lịch dự kiến cần reopt | Chưa generation runtime |
| 3.8 | Khả dụng active/đủ chỗ/đơn trường/overlap/nghỉ/sự cố; override audit; LATE_RUNNING_TRIP_RISK | Chưa concurrency |
| 3.9/3.10 | Correction hậu arrival có reason/CAS; cancel-all-absent chiều về; action state Start cùng rule không PRESENT | Chưa vận hành |
| 3.11 | Parent chỉ điểm con/trường, không bãi/điểm trẻ khác/toàn polyline/operationAudit | Chưa FE map |
| 3.12/3.13 | Parent không báo nghỉ sau Ready; withdrawal chỉ phục hồi mark thuộc notice; giữ REPLACED không rút, chặn thay chính người vắng | Chưa runtime |
| 3.14/3.15 | Capture snapshot legacy trước sửa; sync từ ngày mai không đụng assignments; cache/token/fingerprint/constraints; REMOVED sync roster | Chưa VRP/runtime |
| 3.16 | Cancel fingerprint bắt buộc và recheck transaction, hủy unfrozen, giữ frozen/hold, đóng việc chờ đúng Trip | Thay plan cùng nhóm deferred |
| 3.17 | GPS silence>3phút, thresholds50m/15s và trễ>3phút/15s; close ba loại, evidence fallback, notifications theo người liên quan | Chưa telemetry/provider |
| 3.18 | Hai task ADMIN_FINALIZATION/REOPTIMIZATION, filter/query tương ứng | Chưa dashboard FE |

## 5. Thiết kế xử lý các sai lệch chính

- Writer dùng advisory transaction lock 3202032 trước row locks. Chọn lại khóa sinh chuyến đã tồn tại, không thêm hạ tầng/bảng khóa; tránh thứ tự School/Trip ngược và hai writer dùng cùng nguồn lực giữa các trường. Chưa chứng minh bằng kiểm thử DB đồng thời.
- Sync không còn sao chép cả ba phân công; field kế thừa được kiểm cùng giá trị trước/audit. Roster dùng ngày phục vụ thực, cập nhật cả giờ HH:mm và scheduledStartAt/scheduledEndAt. Snapshot cũ được chụp trước khi Route/Student đổi.
- Availability duyệt toàn bộ leave/incident intervals thay vì lấy bản ghi đầu; xe kiểm active/sức chứa roster và đơn trường; default/Trip/leave/incident/inactive kiểm lại trong vùng khóa.
- Cancel fingerprint gồm phiên bản/danh tính Trip/roster/Ready/assignments, được đọc lại dưới khóa; điều kiện UPDATE cũng giữ unfrozen.
- Dời bãi chỉ lên lịch, hủy hẹn trước ngày giữ dữ liệu; đến ngày đánh dấu plan và hủy unfrozen. Hiệu lực/gate dùng ngày, cron chỉ đối soát; server tắt không tự ghi DB. Lần cấu hình đầu không giả một bãi cũ.
- OTP sai tăng attempts được commit; OTP đúng chỉ consume khi business callback thành công. Không mở rộng chính sách OTP register/reset ngoài task.
- GPS không biết vị trí được ghi UNKNOWN thay vì giả tọa độ. Reverse-geocode được bọc riêng, lỗi trả null. Định dạng boundaries[type=0] tham chiếu tài liệu chính thức [Vietmap Reverse v4](https://maps.vietmap.vn/docs/map-api/reverse-version/reverse-v4/); không gọi provider thật để kiểm chứng.

## 6. Database và Minimal DB Impact

PO đã duyệt **hai field nullable**, không có bảng mới: Trip.operationAudit @map(operation_audit), Student.parentLinkAudit @map(parent_link_audit), JSONB. Migration DDL: api/prisma/migrations/20261106000000_operation_and_parent_link_audit/migration.sql. **Chưa apply DB**, không migrate deploy/dev/reset/seed/backfill. Prisma generate đã đạt, schema validate đã đạt. Không thay province/enum cũ hoặc thêm replacesPlanId. Source/client mới có thể báo thiếu cột ở cả GET nếu DB chưa apply; chưa sẵn sàng chạy nghiệp vụ trên DB hiện tại.

## 7. API contract và Swagger

Năm endpoint mới: POST trips/:id/attendance/:studentId/correction; trips/:id/cancel-all-absent; trips/:id/reopen; schools/:schoolId/students/:studentId/parent-links/:parentId/revoke; incidents/:id/close. Roles, body, errors và giới hạn ghi trong Swagger/FE guide. Revoke dùng HTTP201; ba Trip actions/close dùng HTTP200. Giữ alias assignment cũ và field vehicleId/driverId/busAttendantId.

Ngoại lệ tương thích đã duyệt: thiếu phone/email tạo nhân sự400; thiếu expectedFingerprint cancel/REOPTIMIZED400, stale409; PUT attendance hậu arrival chuyển correction; thiếu bãi409. Field cộng thêm gồm firstServiceDate, operationAudit, parentLinkAudit, province nullable và task kinds. Không tự đổi status đã lưu thành effectiveStatus.

Swagger UI http://localhost:3000/api/docs và JSON /api/docs-json trả200; 5paths mới có POST, required phone của2DTO và cancel fingerprint đã kiểm. Phục vụ từ Nest container qua Express adapter **không app.init/listen**, do đó không gọi Prisma onModuleInit/scheduler. Đây là kiểm metadata/HTTP docs, không xác minh JWT/DB nghiệp vụ.

## 8. UI/UX và tình huống biên

Không sửa UI, wireframe không áp dụng. FE cần phân biệt địa chỉ hồ sơ với điểm đón snapshot hôm nay, lịch hẹn với đã áp dụng, SENT với đã nhận email, firstServiceDate với đã có Trip, hoàn tất hành chính với alighting thật. Khi409, refresh state/preview/impact, không tự retry dùng fingerprint cũ. Parent không vẽ lại polyline đầy đủ từ điểm trẻ khác.

## 9. Kiểm chứng kỹ thuật

| Kiểm tra | Kết quả |
|---|---|
| api npx --no-install tsc --noEmit | PASS, 0 lỗi sau thay đổi cuối |
| npm run build | PASS trên source cuối |
| npx --no-install prisma validate | PASS |
| npx --no-install prisma generate | PASS, không apply DB |
| oxlint các file TS đổi/thêm | Exit0, 17 cảnh báo/0 lỗi trên61 file TS đổi/thêm; không coi là lint sạch |
| git diff --check | PASS source/docs sau lưu; LATEST.diff dùng zero-context để tránh dòng context rỗng bị báo whitespace |
| HTTP Swagger UI/OpenAPI | 200/200, 5API mới và required fields có mặt |
| Test scripts / unit / e2e | NOT_RUN_BY_PO_REQUEST, không chạy |
| DB/cron/race/provider/FE flows | NOT_VERIFIED, BLOCKED_BY_TEST_DATA_POLICY và chưa apply migration |

Không mượn kết quả193 tests trong tài liệu04/11 để xác nhận source06/11. Không gọi mutation nghiệp vụ, tạo record, seed, sửa record thật hoặc gửi SMS/email thử. Chỉ command build/type/schema/lint và HTTP docs.

## 10. Tác động bàn giao và rủi ro còn lại

- Migration chưa apply là điều kiện bắt buộc trước runtime. Chưa chứng minh race/deadlock/rollback/cron restart hoặc full regression bằng dữ liệu thật.
- Các mock test cũ chưa được chạy/đánh giá tương thích với OTP callback và advisory lock mới; không tuyên bố test đạt.
- Override legacy bằng đúng ID default nhưng không có audit không thể suy ra ý định; giữ theo khác giá trị và các dấu điều phối đã có. Không tự backfill audit.
- Snapshot legacy chỉ chụp view hiện tại trước lần sửa; không phục dựng được lịch sử đã bị ghi đè trước đây.
- Cron và provider phụ thuộc server/config hiện tại; chưa đo thực địa GPS/geocode/eSMS/email/VRP. Đợt này không cài dependency mới.
- Reopen cố ý không nhận chuyến từng chạy/nhận trẻ. Workflow chuyển xe/cứu hộ/thu phí/full offline/chuyển trường không thêm.
- Thay plan cùng nhóm còn thiếu contract giữ chỗ/chuyển roster, được PO deferred; không hứa toàn bộ3.16 hoàn tất.

## 11. Files và trọng tâm reviewer

Nhóm source: auth/parents/student-requests/leave; routes/resource-availability; trips/navigation/helpers; schools/lifecycle/calendar; system-settings; drivers/vehicles/students; incidents/notifications/overview; Prisma schema/migration. Danh sách source cụ thể:

- api/prisma/schema.prisma
- api/src/auth/otp.service.ts
- api/src/drivers/drivers.controller.ts
- api/src/drivers/drivers.service.ts
- api/src/drivers/dto/create-driver.dto.ts
- api/src/incidents/dto/create-incident.dto.ts
- api/src/incidents/dto/incident-response.dto.ts
- api/src/incidents/incidents-detector.service.ts
- api/src/incidents/incidents.controller.ts
- api/src/incidents/incidents.service.ts
- api/src/leave-notices/leave-notices.service.ts
- api/src/notifications/notification-events.ts
- api/src/notifications/notification-writer.ts
- api/src/overview/operations-policy.ts
- api/src/overview/overview.dto.ts
- api/src/overview/overview.service.ts
- api/src/parents/parents.service.ts
- api/src/routes/dto/approval-readiness.dto.ts
- api/src/routes/dto/cancel-route-plan.dto.ts
- api/src/routes/dto/list-route-plans-query.dto.ts
- api/src/routes/dto/route-plan-response.dto.ts
- api/src/routes/resource-availability.service.ts
- api/src/routes/routes.controller.ts
- api/src/routes/routes.module.ts
- api/src/routes/routes.service.ts
- api/src/schools/contract-lifecycle.service.ts
- api/src/schools/contract-resource-policy.ts
- api/src/schools/dto/create-school-admin.dto.ts
- api/src/schools/dto/school-response.dto.ts
- api/src/schools/scheduled-changes.service.ts
- api/src/schools/school-lifecycle.controller.ts
- api/src/schools/school-policy.ts
- api/src/schools/schools.controller.ts
- api/src/schools/schools.service.ts
- api/src/schools/service-calendar.service.ts
- api/src/schools/trip-finalization.service.ts
- api/src/student-requests/dto/routing-preview.dto.ts
- api/src/student-requests/student-requests.service.ts
- api/src/student-requests/system-requests.controller.ts
- api/src/students/dto/student-response.dto.ts
- api/src/students/students.controller.ts
- api/src/students/students.service.ts
- api/src/system-settings/dto/parking-lot.dto.ts
- api/src/system-settings/system-settings.controller.ts
- api/src/system-settings/system-settings.service.ts
- api/src/trips/dto/trip-response.dto.ts
- api/src/trips/trip-navigation.service.ts
- api/src/trips/trips.controller.ts
- api/src/trips/trips.service.ts
- api/src/trips/utils/staff-availability.helper.ts
- api/src/trips/utils/trip-sync.helper.ts
- api/src/vehicles/vehicles.controller.ts
- api/src/vehicles/vehicles.service.ts
- api/prisma/migrations/20261106000000_operation_and_parent_link_audit/migration.sql
- api/src/incidents/dto/close-incident.dto.ts
- api/src/schools/first-service-date.ts
- api/src/schools/location-province.ts
- api/src/system-settings/parking-policy.ts
- api/src/trips/dto/trip-actions.dto.ts
- api/src/trips/utils/capture-trip-snapshots.ts
- api/src/trips/utils/close-cancelled-trip-tasks.ts
- api/src/trips/utils/operations-lock.ts
- api/src/trips/utils/trip-assignment-audit.ts

Docs cập nhật: FE_INTEGRATION_GUIDE, BUSINESS_IMPROVEMENT_TRACKER, CURRENT_STATE, auth-api-improvement-plan, master plan mụcZ, LATEST và LATEST.diff/history. Reviewer ưu tiên transactions/lock order, frozen/override, mốc ngày, OTP rollback, resource holds, privacy/map và response/action flags.

## 12. Kết luận và một bước tiếp theo

Phần độc lập được duyệt đã có source và tài liệu tích hợp; chưa đủ bằng chứng tuyên bố docs/API/runtime trùng khớp toàn bộ hay FE tích hợp thành công. **Bước tiếp theo duy nhất: xin PO cho áp dụng migration audit đã duyệt để mở điều kiện nghiệm thu local.** Chưa tự thực hiện migration.

## 13. Trạng thái bàn giao

SOURCE_IMPLEMENTED_WITH_LIMITATIONS / DB_MIGRATION_PENDING / RUNTIME_NOT_VERIFIED. Master plan mụcZ giữ checklist source riêng checklist nghiệm thu; FE guide ghi base URL/commands/contract/mã lỗi và điểm nâng cấp client. Báo cáo cũ lưu history/2026-11-06-before-implementation-report.md và .diff; LATEST.diff chỉ bao gồm code/schema/DDL task này, không env/secret. Không commit/push. Dừng sau task, chờ PO cho bước tiếp theo.
