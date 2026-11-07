# Shared mobile schedule UI

02/11/2026: PO yêu cầu dùng chung giao diện Parent để sửa một chỗ và đồng bộ Parent/Driver/Bus Attendant.

## Nơi chỉnh giao diện

- mobile/components/schedule/week-selector.tsx: thanh tuần/ngày cho cả ba vai trò.
- mobile/components/schedule/trip-card.tsx: khung lịch chuyến và nút Báo nghỉ dùng chung; nhận label/callback và children cho phần riêng.
- mobile/components/schedule/schedule-styles.ts: bộ style duy nhất, trích nguyên bản Parent; cả hai màn và hai component import chung. Sửa typography, spacing, màu, card, ngày chọn hoặc empty-state styles tại đây.
- AppHeader/headerActionStyles vẫn dùng chung component có sẵn.

Không thêm bản sao style/card/week selector vào từng screen. Chỉnh component/style chung sẽ áp dụng cho cả Parent lẫn Staff; label/content riêng vẫn được truyền từ màn sử dụng.

## Phần theo vai trò

Parent screen mobile/app/parent/schedule.tsx giữ studentId/studentName, GET parent student schedule, ScheduleArrivalTime và báo nghỉ cho con. Driver/Attendant screen mobile/app/(tabs)/schedule.tsx giữ GET lịch theo vai trò, serviceDate deep link, thông tin phân công và báo nghỉ nhân sự. State/date navigation/refresh12s, phân quyền và payloads giữ nguyên.

ScheduleTripCard khóa trip virtual và chỉ hiện Báo nghỉ nếu canReportLeave && !isVirtual; onPress báo nghỉ chặn propagation trước callback để không mở map. Mở card truyền onOpen tới route Trip hiện hữu. Parent arrival-time là children ở đúng vị trí cũ, không tải dữ liệu học sinh trong shared UI.

## Bảo toàn Parent

StyleSheet shared có AST giống toàn bộ style Parent trước extraction; card markup giống sau thay callback/label/arrival bằng slot. Parent visual defaults không đổi. Hai nút tuần dùng hitSlop10px từ Staff cũ, tăng vùng chạm Parent mà không đổi kích thước vẽ. Staff nay dùng wrap/footer/typography của Parent.

TypeScript,7status tests, calendar boundary assertions, source parity và web/server export PASS. Chromium kiểm tra component tuần thật390/320px và callbacks chọn ngày/đổi tuần PASS; không mock Trip/User/API. Full card/real API/native/font scaling/báo nghỉ end-to-end chưa nghiệm thu.
