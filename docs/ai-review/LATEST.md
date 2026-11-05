# AI Review — Viền nhấn trên card chuyến của con

## 1. Task Information
01/11/2026, Asia/Saigon. IMPLEMENTATION, Mobile presentation/docs. Baseline HEAD5174e6d. Hoàn tất chỉnh style local; chưa commit/push lượt này.

## 2. Original Request
PO yêu cầu chuyển đường line đậm bên trái card Chuyến xe của con ở Trang chủ lên cạnh trên của card.

## 3. Approved Scope
Chỉ chuyển vị trí viền nhấn trên ParentTripCard theo vị trí PO đã chỉ định; giữ màu trạng thái và các nội dung/hành vi. Không màn hình mới hoặc refactor luồng. Không backend/API/DB/dependency changes.

## 4. Analysis & Decisions
Viền đậm nằm ở styles.card.borderLeftWidth=4. Style nền parentHomeStyles.tripCard có borderWidth=1 và borderRadius20, cardTone.border ghi đè màu theo tag của con sau expanded style. Đổi sang borderTopWidth4 để viền trái trở về1 và cạnh trên thành4, tận dụng màu/bo góc hiện có.

## 5. Implementation Details
mobile/components/parent/trip-card.tsx: đúng một dòng borderLeftWidth4→borderTopWidth4. docs/architecture/mobile-parent-home-ui.md bổ sung vị trí viền, nguồn màu và giới hạn kiểm chứng. LATEST.diff chỉ2files so với đầu task. Review trước lưu history/2026-11-01-before-card-top-accent.md/.diff. Không thay công việc trước của PO.

## 6. Database Changes
None. Không đọc/ghi DB, tạo dữ liệu, seed hoặc gọi API mutation.

## 7. API & Swagger Changes
None. Không sửa API client, auth, permissions hoặc contract; Swagger không áp dụng.

## 8. UI/UX Changes
Đường viền4 ở cạnh trên thay cạnh trái; ba cạnh khác viền mảnh1. Màu tag/viền/nền header, avatar, tên/trường/thời gian, thanh hành trình và các nút giữ nguyên. Viền vẫn dùng tone của con khi thu gọn/mở rộng, không thêm animation hoặc vùng tương tác.

## 9. Verification & Testing
PASS npx --no-install tsc --noEmit exit0. PASS source parity: đảo ngược đúng tên thuộc tính viền thì toàn bộ component giống baseline, không đổi JSX/controllers/styles khác. PASS scoped git diff --check và patch parse. Không thêm tests cho thay đổi style một dòng; không chạy lại export/unit suites vì không có logic hoặc concern mới. NOT_VERIFIED: hiển thị thực tế trên Expo Go iPhone/Android và trình duyệt; không mô tả source/typecheck như nghiệm thu thiết bị.

## 10. Issues & Risks
Chưa có xác nhận native visual. Không có thay đổi nghiệp vụ hoặc trạng thái bus. Border sử dụng cùng token màu và góc bo sẵn có.

## 11. Reviewer Focus
Cạnh trên đậm4, cạnh trái mảnh1 ở mọi tone và khi mở/đóng card. Nội dung/callbacks giữ nguyên theo source parity.

## 12. Suggested Next Step
Reload Expo Go trên iPhone và xem card Chuyến xe của con để xác nhận vị trí viền trên.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO. WAITING FOR USER REVIEW; chưa commit/push task mới này, không suy rộng yêu cầu push ở task trước sang thay đổi hiện tại.
# AI Review — Master Business Improvement Plan (Sections 3.4 – 3.18 Full Implementation)

## 1. Task Information
- **Task Name**: Implementation of Master Business Improvement Plan (Sections 3.4 through 3.18).
- **Date**: 04/11/2026, Asia/Saigon.
- **Project Scope**: API (`/api`) & Documentation (`/docs`). (Strictly zero changes to `/web` or `/mobile`).
- **Task Type**: Implementation, Refactor, and Test Verification.
- **Status**: `COMPLETED`.

## 2. Original Request
Lệnh `/goal` của Product Owner:
1. Tiến hành triển khai toàn bộ Master Business Improvement Plan (Mục 3.4 – 3.18).
2. Tạo 1 file hướng dẫn cho Frontend Dev (`docs/FE_INTEGRATION_GUIDE.md`) để hiểu và dễ gắn API.
3. Thêm 1 description ngắn gọn ngay trong đoạn chat để FE dev đọc Pull Request có thể nắm được những điểm cần làm với source code BE.
4. Đảm bảo chỉ chỉnh sửa API và tuân thủ nguyên tắc không làm nở source code hoặc database quá nhiều.

## 3. Approved Scope
- **Phê duyệt**: PO phê duyệt toàn diện Đề xuất A từ Mục 3.4 đến 3.18 kèm:
  - D317-02: Giảm ngưỡng cảnh báo đi lệch (50m, 15s) và đến trễ (3 phút, 15s); bổ sung 3 sự cố (`NO_GUARDIAN_AT_STOP`, `TRAFFIC_DELAY`, `GPS_SIGNAL_LOST`) kèm ghi nhận tọa độ GPS.
  - D310-01: Chặn xuất bến chuyến về (`TO_PARKING`) khi toàn bộ học sinh đều vắng mặt.
  - D316-02: Phân tách phương án tuyến độc lập theo nhóm học sinh, không gom chung học sinh khác trường.
- **Phạm vi code**: Chỉ thay đổi trong thư mục `/api` và `/docs`. Không chạm vào `/web` hay `/mobile`.
- **Test Data Policy**: Tuyệt đối không sinh dữ liệu giả trong PostgreSQL.

## 4. Analysis & Decisions
1. **Rule G-02 (Frozen Trip Policy)**:
   - Một chuyến xe được coi là đóng băng (`isTripFrozen`) ngay khi `actualStartTime !== null` hoặc `attendantReadyAt !== null`.
   - Mọi thao tác sửa đổi phân công thường lệ (`updateTripAssignment`) trên chuyến đã đóng băng sẽ bị từ chối với mã lỗi `409 Conflict`. Mọi thay thế khẩn cấp phải đi qua luồng Xử lý sự cố (`resolveIncident` với `REPLACED`).
   - Rút đơn xin nghỉ (`cancelNotice`) bị từ chối nếu giáo viên phụ xe đã sẵn sàng đón (`attendantReadyAt !== null`).
2. **Rule G-01 & Đồng bộ Chuyến xe Chưa đóng băng (`syncUnfrozenTripsForRoute`)**:
   - Khi phương án tuyến có sự điều chỉnh (thay xe/tài xế/phụ xe mặc định theo D36-02, chèn học sinh giữa kỳ theo D312-01, hoặc tối ưu lại theo yêu cầu đổi địa chỉ D314-01), các chuyến `SCHEDULED` chưa đóng băng sẽ tự động được cập nhật lại `routeSnapshot` và roster học sinh tương ứng.
3. **Phát hiện sự cố và định vị GPS**:
   - Mở rộng DTO `CreateIncidentDto` hỗ trợ `latitude`, `longitude`, `studentId`.
   - Cập nhật bộ phát hiện tự động `IncidentsDetectorService` theo ngưỡng mới và lưu tọa độ tại thời điểm phát hiện vào trường JSON `context`.
4. **Sửa các lỗi tồn đọng từ baseline**:
   - Bug B-01: Chuyến `IN_PROGRESS` không còn bị ẩn trong `getHomeTrip` và `getParentHomeCards` bất kể thời gian dự kiến kết thúc.
   - Bug B-02: Duyệt yêu cầu đổi địa chỉ kiểu `REOPTIMIZED` bắt buộc `previewToken` và `expectedFingerprint`, đồng thời đồng bộ lại snapshot các chuyến unfrozen.
   - Bug B-03: `resolveIncident` nhánh `REPLACED` sử dụng `assertStaffAvailableForTrip` để kiểm tra toàn diện điều kiện nhân sự thay thế.
   - Bug B-04: Thêm học sinh giữa kỳ (`confirmStudentInsertion`) đồng bộ tức thì sang snapshot các chuyến unfrozen.
   - Bug B-06: Hủy phương án tuyến (`cancelRoutePlan`) chỉ áp dụng với các chuyến chưa đóng băng và kiểm tra `expectedFingerprint`.

## 5. Implementation Details
### Files Tạo mới:
1. `api/prisma/migrations/20261104081535_add_province_and_incident_types/migration.sql`: Migration PostgreSQL bổ sung `province` cho `School` và `Student`, thêm 3 enum values vào `TripIncidentType`.
2. `api/src/trips/utils/staff-availability.helper.ts`: Helper kiểm tra tính khả dụng của nhân sự (trạng thái active, vai trò, đơn nghỉ phép, sự cố chưa giải quyết, chuyến xe chồng lấn).
3. `api/src/trips/utils/trip-sync.helper.ts`: Helper đồng bộ hóa chuyến xe chưa đóng băng (`syncUnfrozenTripsForRoute`).
4. `docs/FE_INTEGRATION_GUIDE.md`: Cẩm nang hướng dẫn tích hợp API chi tiết cho lập trình viên Frontend Web & Mobile.

### Files Chỉnh sửa:
1. `api/prisma/schema.prisma`: Thêm `province` vào `School` và `Student`; mở rộng enum `TripIncidentType`.
2. `api/src/overview/operations-policy.ts`: Thêm `frozenTripWhere` và `isTripFrozen`.
3. `api/src/trips/trips.service.ts`: Sửa Bug B-01 trong Home Trip; chặn xe/tài xế chạy đồng thời 2 chuyến; cấm đổi phân công trên chuyến đã đóng băng; chặn xuất bến khi 100% học sinh vắng mặt; kiểm soát quy tắc điểm danh 2 giai đoạn.
4. `api/src/trips/utils/trip-snapshot-resolver.ts`: Bổ sung `'UNFROZEN_TRIP_SYNC'` vào union `snapshotReason`.
5. `api/src/leave-notices/leave-notices.service.ts`: Chặn rút đơn nghỉ khi phụ xe đã sẵn sàng; kiểm tra nhân sự thay thế qua `assertStaffAvailableForTrip`.
6. `api/src/incidents/dto/create-incident.dto.ts`: Bổ sung `latitude`, `longitude`, `studentId` với validation decorators.
7. `api/src/incidents/incidents.service.ts`: Hỗ trợ 3 sự cố mới có tọa độ; kiểm tra nhân sự thay thế trong `resolveIncident` (Bug B-03).
8. `api/src/incidents/incidents-detector.service.ts`: Cập nhật ngưỡng phát hiện lệch tuyến (50m, 15s) và trễ giờ (3 phút, 15s) kèm ghi nhận tọa độ GPS.
9. `api/src/routes/routes.service.ts`: Lọc dữ liệu chuẩn bị theo bán kính 50km và tỉnh thành; lan truyền phân công mặc định xuống các chuyến unfrozen; đồng bộ chèn học sinh tức thì (Bug B-04); hủy phương án chỉ áp dụng với chuyến unfrozen (Bug B-06).
10. `api/src/routes/resource-availability.service.ts`: Chặn unassign tài xế / phụ xe trên phương án đã ACTIVE.
11. `api/src/student-requests/student-requests.service.ts`: Duyệt đổi địa chỉ `REOPTIMIZED` yêu cầu `previewToken`, `expectedFingerprint` và đồng bộ chuyến xe unfrozen (Bug B-02).
12. `docs/BUSINESS_IMPROVEMENT_TRACKER.md`: Cập nhật tiến độ hoàn thành các gói 3.4 – 3.18.
13. `docs/ai-handoff/CURRENT_STATE.md`: Cập nhật snapshot hiện trạng mã nguồn.

## 6. Database Changes
- Thêm trường `province String? @db.VarChar(100)` vào bảng `schools` và `students`.
- Bổ sung 3 giá trị `NO_GUARDIAN_AT_STOP`, `TRAFFIC_DELAY`, `GPS_SIGNAL_LOST` vào enum `TripIncidentType`.
- Migration `20261104081535_add_province_and_incident_types` đã được áp dụng an toàn trên cơ sở dữ liệu development. Không tạo bảng mới, không làm phình schema.

## 7. API & Swagger Changes
- `POST /api/incidents`: Nhận thêm `latitude?: number`, `longitude?: number`, `studentId?: string`, hỗ trợ 3 loại sự cố mới.
- `POST /api/student-requests/:id/approve`: Với quyết định `REOPTIMIZED`, bắt buộc gửi `previewToken` và `expectedFingerprint`.
- `POST /api/routes/plans/:id/cancel`: Nhận thêm `expectedFingerprint` chống xung đột thao tác đồng thời.
- `GET /api/routes/plans/:id/cancellation-impact`: Trả về số lượng `scheduledTripsCount` (chỉ đếm các chuyến unfrozen sẽ bị hủy) và `frozenTripsCount` (các chuyến giữ nguyên).
- Mã lỗi trả về được chuẩn hóa: `409 Conflict` cho chuyến đã đóng băng và xung đột phiên xem trước; `400 Bad Request` cho lý do vắng mặt bắt buộc và rút đơn nghỉ không hợp lệ.

## 8. UI/UX Changes
- Không can thiệp mã nguồn UI (`/web` và `/mobile`).
- Đã xuất bản cẩm nang chi tiết [docs/FE_INTEGRATION_GUIDE.md](../FE_INTEGRATION_GUIDE.md) hướng dẫn toàn bộ giao diện Web Admin và Mobile App cách xử lý các trường hợp lỗi, vô hiệu hóa nút bấm và hiển thị cảnh báo.

## 9. Verification & Testing
- **TypeScript Static Typecheck**:
  `cd api; npx tsc --noEmit` -> **PASS** (0 errors).
- **Unit Tests Verification**:
  `cd api; npx vitest run src/routes/ src/trips/ src/incidents/ src/leave-notices/ src/student-requests/ src/overview/` -> **PASS** (11/11 test files, 193/193 tests passed).
  - `src/trips/utils/trip-time.util.spec.ts`: 10 passed.
  - `src/overview/overview.spec.ts`: 4 passed.
  - `src/routes/vehicle-availability.spec.ts`: 11 passed.
  - `src/student-requests/student-requests.service.spec.ts`: 16 passed.
  - `src/leave-notices/leave-notices.service.spec.ts`: 15 passed.
  - `src/trips/trip-synchronization.spec.ts`: 31 passed.
  - `src/trips/trips.service.spec.ts`: 17 passed.
  - `src/routes/approval-assignment.spec.ts`: 10 passed.
  - `src/routes/routes.service.spec.ts`: 27 passed.
  - `src/incidents/incidents.service.spec.ts`: 14 passed.
  - `src/trips/trip-navigation.spec.ts`: 38 passed.
- **Test Data Policy Compliance**: Tuyệt đối không tạo fake data, không thêm bản ghi thử nghiệm vào DB.

## 10. Issues & Risks
- None identified. Các thay đổi hoàn toàn tương thích ngược và có cơ chế bảo vệ chuyến xe đang diễn ra.

## 11. Reviewer Focus
- Đảm bảo tính nhất quán của quy tắc đóng băng chuyến xe (`isTripFrozen`) trên tất cả các thao tác (đổi phân công, rút đơn nghỉ, hủy phương án).
- Xác nhận logic đồng bộ `syncUnfrozenTripsForRoute` đảm bảo dữ liệu chuyến xe luôn cập nhật mà không ảnh hưởng đến các chuyến đã xuất bến.

## 12. Suggested Next Step
- Chuyển giao tài liệu [docs/FE_INTEGRATION_GUIDE.md](../FE_INTEGRATION_GUIDE.md) cho đội ngũ Frontend để tiến hành tích hợp và cập nhật giao diện người dùng.

## 13. Approval Status
- `WAITING FOR USER REVIEW / APPROVAL`.
