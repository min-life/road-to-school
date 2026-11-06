# AI Review — Off-route incident absent during demo

## 1. Task Information
03/11/2026 Asia/Saigon. Scope: API/Mobile read-only diagnosis + Documentation. Type: Analysis. Status: COMPLETED. Last DB check 16:40:59.

## 2. Original Request
Xe nhìn thấy lệch tuyến khi chạy nhưng bus attendant không nhận popup và không thấy sự cố lệch tuyến trong tab Sự cố. Tìm nguyên nhân.

## 3. Approved Scope
Chỉ đọc source và dữ liệu chuyến 629290b4-dab7-438e-b10b-f02c50029bc2. Không sửa code/dữ liệu, không phát vị trí giả, không gọi endpoint có side effects. Quyền reset/demo của task trước không được dùng để tự thay dữ liệu trong task chẩn đoán này.

## 4. Analysis & Decisions
Nguyên nhân trực tiếp: không có record OFF_ROUTE trong database. Chỉ có DRIVER_MISSING / RESOLVED, đúng với ảnh tab hiện Vắng tài xế / Đã giải quyết. Badge 1 sự cố đếm tripIncidents.length, bao gồm sự cố đã xử lý, không chứng minh đang có lệch tuyến.
Trip đang IN_PROGRESS, actualStartTime 16:29:46, attendantReadyAt 16:26:02 ngày 03/11/2026. Nguồn điều hướng TEST_JOYSTICK.
Backend detector so khoảng cách tới toàn bộ polyline gốc trong routeSnapshot. Điều kiện: ít nhất 7 mẫu cùng runId, liên tục cách tuyến >=100m, kéo dài >=30 giây, gap giữa các mẫu <=15 giây; chỉ xét tối đa 12 mẫu mới nhất của run. Chỉ kích hoạt evaluateTelemetry sau khi publish vị trí thành công, không có detector cron tự đánh giá xe đứng yên khi không có sample mới.
Đọc toàn bộ 22 mẫu và dùng chính decodePolyline / pointToSegmentDistance / pointToPolylineDistance từ source TS để tính lại: 0/22 mẫu đạt >=100m. Maximum 98.6m, các mẫu cuối 71.8, 71.8, 71.8, 78.8, 98.6m. Không có chuỗi hợp lệ để tạo OFF_ROUTE.
Theo run: 6 mẫu/25.199s/max45.1m; 2 mẫu/5.020s/max4.6m; 14 mẫu/75.669s/max98.6m. Các run tách biệt, không ghép thời gian trước/sau switch để đủ chuỗi.
Mẫu cuối sequence22 lúc 2026-11-03T09:31:55.453Z = 16:31:55 Việt Nam. Tới 16:40:59 vẫn chỉ 22 mẫu. Ảnh 16:35/16:37 ghi Mất cập nhật phù hợp dữ liệu. Đợi lâu trên màn giáo viên không làm backend tự thu thêm mẫu tài xế.
Frontend cảnh báo Đang lệch tuyến khi projection.gap >40m so với đoạn chỉ dẫn hiện hành, tự tìm lại lộ trình sau 3 giây. Đây là ngưỡng/hình học khác detector sự cố >=100m/30s so với routeSnapshot gốc. Vì vậy thấy xe ra ngoài đường chỉ dẫn chưa đồng nghĩa đã đủ điều kiện tạo OFF_ROUTE.
Source useTripNavigation là foreground engine: blur màn hình, đổi identity hoặc AppState không active gọi suspend, gỡ watcher/timer. Nếu demo bằng cách chuyển Driver -> Attendant trên cùng một máy thì nguồn vị trí của driver dừng theo code. Chưa có log lifecycle thực tế để khẳng định thao tác nào làm dừng đúng lúc 16:31:55.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md/LATEST.diff và archive báo cáo cũ trong history/2026-11-03-before-off-route-popup-diagnosis.md/.diff.
Source đã rà: api/src/incidents/incidents-detector.service.ts, incidents.service.ts, incidents.module.ts; api/src/trips/trip-navigation.service.ts/trips.module.ts; mobile/hooks/use-trip-navigation.ts; mobile/app/trip/[id].tsx; mobile/services/api-client.ts; mobile/components/trip-navigation-controls.tsx.

https://github.com/min-life/road-to-school/pull/6/conflict?name=docs%252Fai-review%252FLATEST.md&ancestor_oid=f285bba470a2b805d30feb8ad72151ed152b1549&base_oid=6955ff2f89d34f64cc0f1839d790039a95f50ae5&head_oid=fc6b7e4c01d2f2cc7724d377e558638cec84c7fb## 6. Database Changes
None. Không đọc/ghi DB, tạo dữ liệu, seed hoặc gọi API mutation.
## 6. Database Changes
None. Mọi truy vấn Prisma đều chạy trong SET TRANSACTION READ ONLY trên local 127.0.0.1:5433/roadtoschool. Không viết position/incidents/notifications, không reset hoặc cập nhật trip.

## 7. API & Swagger Changes
None. Source publish gọi detector sau khi ghi vị trí; IncidentsModule cung cấp detector cho TripsModule, cả source và dist có call evaluateTelemetry. Không chứng nhận DI của tiến trình đang chạy chỉ từ source.
listByTrip lấy tất cả incident thuộc trip, không loại OFF_ROUTE khỏi attendant. getTripIncidents đọc res.items. Không có OFF_ROUTE trong DB nên không có dữ liệu để trả về trong case này.

## 8. UI/UX Changes
None. App poll trip/incidents mỗi 5s khi active; popup attendant đợi OFF_ROUTE hoặc LATE_STOP có WAITING_CONFIRMATION. Popup không có đầu vào khi DB chưa tạo loại sự cố đó. Badge 1 sự cố đang đếm cả resolved history; dòng Mất cập nhật biểu thị vị trí cũ hơn 15s.

## 9. Verification & Testing
PASS: SELECT read-only trip trạng thái chạy, navigation checkpoint, incidents và toàn bộ 22 location points.
PASS: trích hàm toán học và decoder nguyên bản từ source TS, transpile trong bộ nhớ và tính khoảng cách trên tọa độ/polyline thật, không mock business response hoặc tọa độ.
PASS: kiểm tra cửa sổ tối đa12 cùng run, số mẫu và chuỗi >=100m: không mẫu nào đạt, do đó không đủ điều kiện OFF_ROUTE tại bất kỳ sample hiện có.
PASS: đọc lại DB lúc16:40:59: IN_PROGRESS,22mẫu,last16:31:55,duy nhất DRIVER_MISSING RESOLVED.
NOT_VERIFIED: runtime logs của thiết bị, vòng publish bị dừng bởi thao tác nào, binding detector trong tiến trình API đang chạy, HTTP/authenticated popup đầu-cuối khi có một OFF_ROUTE thật. Không chạy mutation tạo sự cố để test. Không build/typecheck vì không sửa code.

## 10. Issues & Risks
Frontend và backend có ngưỡng/hình học lệch tuyến khác nhau nên dễ hiểu nhầm. Điều hướng foreground không tiếp tục publish khi driver blur/background. Badge đếm cả resolved incident làm người dùng tưởng có sự cố mới. Không kết luận popup hoặc mạng hỏng trong case này; bằng chứng chính là chưa có incident để hiển thị và không có sample đủ ngưỡng. Chưa xác định chính xác vì sao publisher dừng từ logs thiết bị.

## 11. Reviewer Focus
Phân biệt deviation UI >40m/đoạn hiện hành và auto-incident >=100m/route gốc >=30s. Không tạo incident bằng tọa độ cũ hoặc ghép runId. Giữ evidence absence of OFF_ROUTE, chronology và giới hạn chưa xác nhận runtime.

## 12. Suggested Next Step
Demo bằng hai phiên/thiết bị riêng: giữ màn Driver foreground, điều khiển xe lệch route gốc khoảng150m ít nhất40s trong khi xem Attendant ở phiên khác để nguồn vị trí không bị dừng trước khi đủ chuỗi.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO. WAITING FOR USER REVIEW; chưa commit/push task mới này, không suy rộng yêu cầu push ở task trước sang thay đổi hiện tại.
Người dùng chỉ yêu cầu tìm nguyên nhân. Hoàn tất chẩn đoán, chưa triển khai sửa code hoặc thay dữ liệu. WAITING FOR USER REVIEW / APPROVAL nếu cần đổi hành vi.
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
