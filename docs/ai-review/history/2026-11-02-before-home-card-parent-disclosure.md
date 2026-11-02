# AI Review — Dùng chung lịch Parent/Driver/Bus Attendant

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION. Source hoàn tất, native/authenticated acceptance NOT_VERIFIED. Không commit/push hoặc dependency mới.

## 2. Original Request
PO xác nhận dùng chung giao diện lịch Parent để sửa một chỗ thì cả hai màn cùng cập nhật.

## 3. Approved Scope
Trích UI Parent hiện tại thành component/style dùng chung, nối Parent và Staff. Giữ Parent visual defaults, role data/actions, endpoint và quyền. Đây là extraction mẫu Parent được PO chọn, không thiết kế màn mới hoặc thay bố cục Parent.

## 4. Analysis & Decisions
Header/utils đã shared. Trích hai component presentation (WeekSelector/TripCard) và một style module từ Parent. Không gộp screen hoặc fetch/hook. Card nhận trip, label, onOpen, onReportLeave, loading flag và children cho Parent arrival time. Không thêm role flags/variants/generic factory; Staff dùng cùng Parent default UI.

## 5. Implementation Details
- mobile/components/schedule/week-selector.tsx: markup Parent tuần/ngày, chung date callback; hitSlop10px giữ vùng chạm Staff và không đổi Parent visual.
- mobile/components/schedule/trip-card.tsx: markup Parent, giữ virtual guard, status mapping, Báo nghỉ eligibility/propagation; label/callback/content slots.
- mobile/components/schedule/schedule-styles.ts: toàn bộ styles Parent dùng chung cho hai screens/components, không local StyleSheet.create nữa.
- mobile/app/parent/schedule.tsx: dùng chung UI; giữ ScheduleArrivalTime child và dữ liệu/nội dung Parent.
- mobile/app/(tabs)/schedule.tsx: dùng chung UI; giữ Driver/Attendant schedule/leave/navigation và serviceDate parsing.
- docs/architecture/mobile-shared-schedule-ui.md: điểm chỉnh UI chung cho lần sau. LATEST.diff chứa đúng5source files so với baseline; archive báo cáo trước tại history/2026-11-02-before-shared-schedule-implementation.md/.diff.

## 6. Database Changes
None. Không seed/records/migration hoặc dữ liệu nghiệp vụ giả.

## 7. API & Swagger Changes
None. Parent/student schedule, Driver schedule, Attendant schedule và quick leave endpoints giữ nguyên. Không gọi mutation để test.

## 8. UI/UX Changes
Một bộ UI cho tuần/ngày, card/footer, typography/spacing và list/empty-state styles. Staff có wrap/min-width/footer layout tốt như Parent. Labels riêng giữ nguyên (Parent Chiều đi học/Chiều về nhà/Xem lộ trình; Staff Chiều đi/Chiều về/Xem bản đồ). Parent arrival-time và header/back/subject giữ nguyên; Staff notification header giữ nguyên. Sau này sửa shared components/styles sẽ áp dụng cả ba vai trò.

## 9. Verification & Testing
Xác nhận follow-up02/11: Parent schedule và Staff schedule đều import/render ScheduleTripCard từ cùng module, và cùng scheduleStyles; card đã shared, không cần thêm thay đổi application source.
PASS TypeScript --noEmit sau từng bước và source cuối.
PASS7/7 tests status labels hiện hữu; calendar assertions tuần02–08/11 và chuyển tuần26/10,09/11.
PASS AST parity toàn bộ shared style so với Parent baseline; shared card markup giống Parent sau chuẩn hóa callback/label/arrival slots. PASS source AST toàn bộ state/fetch/refresh/date logic trước return ở hai màn giữ nguyên; quick-leave payload và router.push arguments giữ nguyên. Parent-only ScheduleArrivalTime, virtual/card guards và nested stopPropagation còn giữ.
PASS Chromium RN-web WeekSelector thật390x844/320x640: chọn04/11, next09–15/11, previous02–08/11; không tràn ngang (320px clientWidth=scrollWidth=320). Chỉ date primitives, không mock Trip/User/API. Không coi đây là full schedule card/authentication proof.
PASS Expo export --platform web gồm web/server bundles exit0, output ngoài repo shared-schedule-export. PASS git diff --check.
Preview tạm đã xóa; tab đóng, viewport reset; giữ Metro có sẵn. Full native/card populated/leave mutation/real API acceptance NOT_VERIFIED (BLOCKED_BY_TEST_DATA_POLICY khi thiếu dữ liệu/session được cấp). Không thêm tests mirror markup hoặc fake business fixtures.

## 10. Issues & Risks
Shared UI chủ ý khiến lần chỉnh sau tác động cả Parent và Staff nên cần review cả hai. Native typography/font scale/card data dài cần nghiệm thu. Không thay logic dữ liệu hoặc quyền theo vai trò.

## 11. Reviewer Focus
Hai screens thật sự import cùng component/styles, không bản sao. Parent style/markup được bảo toàn; payload Student leave không truyền sang Staff. Shared card không fetch student data; virtual guard và stopPropagation giữ nguyên.

## 12. Suggested Next Step
PO reload app và đối chiếu màn Lịch Parent/Driver/Bus Attendant trên thiết bị.

## 13. Approval Status
PO yêu cầu trực tiếp dùng chung Parent và đồng bộ thay đổi về sau; source hoàn tất, checks PASS, chờ nghiệm thu native.
