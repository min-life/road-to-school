# AI Review — Kiểm kê màn hình và chuẩn bị sửa luồng nghiệp vụ mobile

## 1. Task Information

Task cập nhật chi tiết docs mobile theo các màn hình đã triển khai. Ngày 05/11/2026, Asia/Saigon. Scope Documentation, type Analysis và Documentation Implementation, status COMPLETED. Nhánh dongnnp/mobile/refactor-ui tại f075db4cdec5746aa287c29c150238f58d2195ef. Backend đã merge tại 41cf3b072cf1430f0f0071add4b131a1bc0fe6d0. Mốc branch/backend kế thừa bản audit ngay trước task này.

Ngày 13/11/2026, PO yêu cầu commit phần đã hoàn thành. Đã rà diff và phạm vi 12 file docs đang chờ, gồm audit backend, bản đồ màn hình, các chỉ mục và review/history. Commit local dùng thông điệp `docs(mobile): document implemented screens and backend integration flows`.

## 2. Original Request

PO yêu cầu cập nhật docs chi tiết hơn, bao gồm các màn hình đã implement để chuẩn bị sửa luồng nghiệp vụ mobile.

## 3. Approved Scope

Đọc source mobile, components/hooks/context/API client và DTO/service liên quan để mô tả implementation hiện tại. Bổ sung screen inventory, đường vào/ra, controls, API/params, form/popup, refresh, nghiệp vụ theo role, khoảng cách với backend và tiêu chí nghiệm thu. Đầu ra là tài liệu local. Các batch sửa mobile được ghi là đề xuất chờ giao task.

## 4. Analysis & Decisions

Kiểm kê 40 file TSX trong mobile/app, phân loại 33 entry nghiệp vụ và 7 entry hạ tầng/fallback/mẫu. Entry dùng chung, wrapper và redirect được ghi riêng để tránh hiểu là 33 màn độc lập. Source là căn cứ xác định UI/handler đã có, còn runtime, thiết bị và acceptance đa vai trò được ghi ở mức cần xác minh.

Phân tích Auth/Root, Home ba role, Profile/Notifications, Parent Tracking/Link/Profile/Route/Schedule, Leave history/create/OTP/detail và lối báo nghỉ nhanh, Update information/address/history/detail/OTP, Trip theo role/tab, navigation và incidents. Đọc cả các lời gọi gián tiếp qua component, hook và provider.

Ghi rõ các khác biệt thực tế khi giao task sửa. Picker Báo nghỉ truyền policy riêng, Đổi điểm mặc định AVAILABLE. Quick leave đi trực tiếp OTP sau xác nhận. Update OTP thành công về lịch sử theo con/type. Auth/link/leave/update có TTL/resend khác nhau. Password UI Profile tối thiểu 8 ký tự, auth DTO tối thiểu 6. Một số màn tải bằng mount/effect, lịch sử yêu cầu đã focus-aware. Route kế hoạch và Trip snapshot có nguồn dữ liệu riêng. Các khác biệt này được đưa vào SF-01–SF-07 để PO chốt hoặc UAT khi sửa.

## 5. Implementation Details

No application code changes.

- Tạo [mobile-screen-business-flows.md](../architecture/mobile-screen-business-flows.md) với bảng từng route/source, role, controls, params/API, hành trình xuyên màn, chiều đi/về, 13 nhóm popup/form, refresh matrix, SF-01–SF-07, 6 đợt giao việc liên kết M-01–M-10 và acceptance theo role.
- Bổ sung bảng ánh xạ screen IDs vào [backend sync](../architecture/mobile-backend-sync-2026-11-05.md), giữ các contract và BE dependencies đã phân tích trước.
- Cập nhật mục kiểm kê và đường tra cứu trong [UI status](../architecture/mobile-ui-implementation-status.md), [implementation README](../implementation/README.md) và [source map](../implementation/source-map.md).
- Lưu review trước nguyên bản tại [history MD](history/2026-11-05-before-mobile-screen-flows.md) và [history diff](history/2026-11-05-before-mobile-screen-flows.diff). Cập nhật LATEST.md và [LATEST.diff](LATEST.diff) cho task tài liệu này. Diff gồm đúng 5 tài liệu nội dung, so với snapshot đầu task, bao gồm file audit đang untracked từ task trước.

Ghi chú mobile-parent-student-journey.md và các history của task audit backend là thay đổi có sẵn trước lượt này.
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

None.

## 7. API & Swagger Changes

None. Tài liệu tham chiếu các API hiện có qua client/DTO/service. Runtime API và Swagger được ghi NOT_VERIFIED trong lượt tài liệu này.

## 8. UI/UX Changes

None. Danh mục mô tả các màn hiện có cùng form/modal và các đặc điểm safe area, keyboard, picker, alert, tab/role. Các đề xuất workflow và acceptance nằm trong backlog. Wireframe cho task code UI tiếp theo cần theo quy tắc phê duyệt của repository.

## 9. Verification & Testing

- PASS kiểm tra trước commit ngày 13/11/2026, `npx --no-install tsc --noEmit` tại mobile exit 0, `git diff --check` với docs trừ các bản diff lưu trữ và parse LATEST.diff. Diff api/mobile/web rỗng, toàn bộ 12 file chờ commit thuộc docs.
- PASS `npx --no-install tsc --noEmit` tại mobile, exit 0. Đây là kiểm tra kiểu baseline hiện tại.
- PASS kiểm kê 40/40 file route mobile/app được tham chiếu, 33 mã entry nghiệp vụ duy nhất, 7 entry hỗ trợ và 13 nhóm form/popup.
- PASS kiểm tra 93 relative links trong các phần docs mới/thay đổi, tất cả đích local tồn tại.
- PASS SHA256 của 545 tracked files api/mobile/web trùng snapshot đầu task, kiểm soát source/config/dependencies.
- PASS đối chiếu tĩnh màn hình với navigation/API/hooks/providers, phân biệt wrappers, legacy history render thật và redirect.
- PASS kiểm tra whitespace trên 5 tài liệu nội dung và LATEST.md, `git diff --check` trên các file tracked liên quan, `git apply --numstat docs/ai-review/LATEST.diff` xác nhận patch hợp lệ với đúng 5 tài liệu. HEAD trùng baseline, review có đủ 13 mục.
- NOT_VERIFIED hành vi thực tế iPhone/Android, deep links, keyboard/native permissions, OTP delivery/TTL, GPS, Swagger đang chạy và UAT nhiều vai trò. Task này xác minh source và tài liệu.
- BLOCKED_BY_TEST_DATA_POLICY đối với các ca acceptance cần tạo/chỉnh dữ liệu, gửi OTP hoặc mutation mà chưa được cấp dữ liệu/quyền riêng cho bước kiểm thử. Các ca này được ghi thành checklist cho task sửa sau.

Validator ban đầu đếm lặp các screen IDs ở bảng tham chiếu tiếp theo. Đã giới hạn bộ đếm nghiệp vụ vào bảng inventory và đếm unique support IDs, sau đó chạy lại đạt các số liệu ở trên.

## 10. Issues & Risks

Sáu BE dependencies từ bản audit vẫn cần chốt khi tích hợp, đặc biệt incident options/vòng đời, canCancelLeave và capability start khác guard thực thi. Các SF ghi sự khác biệt hoặc nhu cầu kiểm chứng, chưa kết luận tất cả là bug runtime. Mô tả quyền/disabledReason phải tiếp tục dựa response và service thực, tránh đồng nhất policy giữa các form chỉ vì chúng dùng chung UI.

Sáu đợt triển khai là thứ tự đề xuất theo contract và phụ thuộc hiện có. Source tại snapshot xác nhận có handler, mức hoàn thiện thực tế từng flow còn cần UAT trên môi trường được cấp.

## 11. Reviewer Focus

Kiểm tra độ phủ 40 file route, 33 entry nghiệp vụ gồm wrappers/compatibility, 7 entry hỗ trợ và 13 nhóm form. Rà quick leave khác form đầy đủ, eligibility picker, payload snapshot/challenge khi OTP resend, success destination, refresh mount/focus và privacy theo con. Đối chiếu Trip role/tab, outbound undo trước school-arrival, return boarding trước start, alighting riêng và admin finalization. Các mục đã có/cần sửa/UAT phải tiếp tục phân biệt rõ.

## 12. Suggested Next Step

Giao đợt 1 M-01 để đồng bộ nhãn, types và fallback sự cố trên Home, Trip và hai màn Sự cố theo contract đọc đã kiểm kê.

## 13. Approval Status

PO đã yêu cầu commit local ngày 13/11/2026. Các batch sửa source tiếp tục ở trạng thái WAITING FOR USER REVIEW / APPROVAL để PO giao triển khai.
