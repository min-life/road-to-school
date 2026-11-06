# AI Review — Giờ đến dự kiến trong lịch học sinh

## 1. Task Information
Task: Bổ sung giờ đến dự kiến ở Lịch học & Xe đưa đón. Date:01/11/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI/data presentation implementation. Status: COMPLETED frontend; virtual-return arrival unavailable in current contract; native/auth acceptance NOT_VERIFIED.

## 2. Original Request
PO: “Bổ sung thêm thời gian dự kiến đến nơi ở Lịch học & Xe đưa đón”.

## 3. Approved Scope
Thêm dòng giờ dự kiến trong card lịch học sinh PARENT, giữ tất cả dữ liệu/actions cũ. Đã thông báo bố cục/mapping và giới hạn API trước code. Chỉ frontend, tái sử dụng GET và refresh/formatting hiện có; không backend/API contract/schema/dependency changes. Không dùng giờ về bãi làm giờ trả con, không tạo ETA hoặc record test. Không commit/push, bảo vệ pending work.

## 4. Analysis & Decisions
MobileScheduleItem/getParentStudentSchedule hiện chỉ trả start/end, không có stop ETA theo con. TO_SCHOOL end là mốc trường; TO_PARKING end là kết thúc tuyến tại bãi, không phải điểm trả của con. Chọn dùng end cho chiều đi (gồm virtual); chiều về thật đọc detail hiện có và chọn đúng DROPOFF/studentId/isMyChild. Virtual return không có snapshot theo ngày trong payload, không GET detail với virtual ID hoặc dùng giờ tuyến mặc định có thể khác lịch tuần; hiển thị thiếu giờ một cách trung tính. Đây là giờ theo lịch, không GPS ETA hay actual arrival.

## 5. Implementation Details
- mobile/app/parent/schedule.tsx: thêm đúng import ScheduleArrivalTime và một row sau schoolName, trước footer. Giữ nguyên range start–end/header/status/tuyến/trường/xe/Báo nghỉ/Xem lộ trình và toàn bộ controllers/refresh/week/day/route.
- mobile/components/parent/schedule-arrival-time.tsx (mới): outbound/static virtual branch; ReturnArrivalTime chỉ mount cho chiều về thật của ngày đang chọn. getMobileTripDetail, id/direction check, DROPOFF/child/isMyChild filter, journeyClock. Scope key actor/con/week/trip/route/direction/start/end reset state, useActiveRefresh12s focus/foreground/coalescing/isCurrent;403/404 stop auto polling, retry allowed. Lỗi xóa time cũ; loading/missing/failure có text rõ.
- ArrivalTimeRow: icon flag/label/time, theme colors, flexWrap; retry48px stopPropagation để không mở card route khi thử lại.
- docs/architecture/mobile-parent-schedule-arrival.md (mới): layout/source/meaning/props/refresh/limits; mobile-ui-implementation-status.md cập nhật tính năng.
- Archive review trước tại history/2026-11-01-before-schedule-arrival.md/.diff. LATEST.diff chỉ4files so với baseline task; không gom pending timeline/FAB/OTP/search/env.

## 6. Database Changes
None. Không SELECT/ghi DB mới trong task; kiểm tra selector/preview đọc snapshot read-only existing stops của task timeline trước từ TEMP, không sửa nội dung. Không tạo/mutate records/challenges/seed.

## 7. API & Swagger Changes
No backend/contract/Swagger changes. UI thêm GET /trips/mobile/:id chỉ cho card chiều về thật của ngày hiện tại, refresh12s khi focus/app active; không đọc chi tiết toàn bộ tuần, không thêm GET cho chiều đi/virtual. API client/refresh helper không sửa. Không gọi mutation hoặc fake API responses để test.

## 8. UI/UX Changes
Sau tuyến/trường có dòng Đến trường dự kiến hoặc Đến điểm trả dự kiến, giờ HH:mm đậm. Giữ nguyên khung giờ cũ và tất cả controls. Dòng nền kem/bo10, icon vàng nâu/label xám/value navy theo theme, không ellipsis/fixed height. Loading spinner+Đang tải; thiếu stop/time → Chưa có giờ dự kiến; lỗi → Chưa tải được + retry48. Không đổi keyboard/safe area hoặc thêm input. Virtual return hiện missing thay vì bịa giờ/đổi API chưa được duyệt.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit exit0.
PASS: Expo export --platform all exit0, TEMP/rts-schedule-arrival-export-1261aeff40a947fc9832f39f6cd9a1a1, log cùng prefix+.log. No application edits sau checks.
PASS source parity: xóa ngược đúng import/row mới cho Parent schedule byte-equivalent sau LF normalization với baseline; mọi controller/actions/labels/layout cũ giữ nguyên.
PASS actual extracted clock with3primitives:7:05:00→07:05,null→null,25:00→null. Selector arrow thực thi trên snapshot2DROPOFF thực đã có cho hai con, chọn đúng stop/clock theo studentId và không PARKING_END. Không tạo/đổi business fixture hoặc API result. First TEMP harness runs còn export/TypeScript annotation hoặc chọn nhầm outer arrow gây SyntaxError; sửa extraction/compile harness, không đổi application logic để ép checks.
PASS:10protected hashes giữ API client/active refresh/loop/journey time helper/quick leave/staff schedule/trip screen/package/lock/env. Scoped diff/whitespace/module links và13sections.
PASS presentation-only Chromium IAB actual ArrivalTimeRow/styles, một clock từ snapshot thật và các primitive UI states missing/loading/error (không API/User/Trip DTO mocks).320×568/390×844/1440×900 không overflow ngang; retry48×48. Screenshot TEMP/rts-schedule-arrival-preview.png crop390×155 của dòng giờ đã có. Không mount data hook hoặc fake session, không thử click API. Tabs closed, viewport reset, preview server51614 dừng; không động Metro của PO.
NOT_VERIFIED: full authenticated fetch/poll/retry/403 race behavior, native iPhone/Android/Safari/Chrome, parent card press/stopPropagation, VoiceOver/largest font scale. Source review/isCurrent guard không được coi là runtime acceptance. Mobile không có lint script; không cài tool mới hoặc thêm tests mirror style.

## 10. Issues & Risks
Virtual chiều về thiếu planned child drop-off theo ngày trong contract, phải giữ Chưa có giờ dự kiến; muốn đủ giờ cần PO duyệt mở rộng API sau. Planned arrival có thể khác thực tế, UI không gọi là ETA động. GET detail thêm tải mạng chỉ cho selected-day real return cards khi active; polling stops in background/blur qua helper cũ. In-flight/permission/native tests còn thiếu. Source PARENT role/link authorization vẫn do API, UI không tự cấp quyền hoặc lấy giờ của học sinh khác. Các thay đổi trước task giữ nguyên.

## 11. Reviewer Focus
Kiểm tra ý nghĩa end time chiều về so với DROPOFF từng con; không fallback về parking end hoặc tuyến current không cùng ngày. Key scope/id/direction/myChild guard và cleanup isCurrent; virtual/outbound không gọi GET. Giữ all schedule/actions/canReportLeave/virtual navigation. Review retry stopPropagation, loading/missing/error/read-only polling và nullable time; diff scope không lẫn pending work.

## 12. Suggested Next Step
Trên Expo Go iPhone, mở lịch con và đối chiếu giờ chiều đi/chiều về thật với mốc trường/điểm trả trong Theo dõi lộ trình.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO; WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push, không tự cấp quyền đổi contract/tạo dữ liệu test hoặc chứng nhận native/auth acceptance.
