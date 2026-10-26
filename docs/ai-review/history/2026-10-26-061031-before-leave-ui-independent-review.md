# AI Review — Hoàn tất sửa UI/UX Báo nghỉ (Leave Notices)

## 1. Task Information
- **Date**: 26/10/2026 (Asia/Saigon).
- **Scope**: Frontend Web Admin, Mobile App (Parent, Driver, Bus Attendant), Backend Trips Service eligibility alignment.
- **Type**: UI/UX Bugfix & Enhancement Execution.
- **Status**: IMPLEMENTED & SAFELY VERIFIED (static check + unit tests); phần runtime OTP/notice side-effects đánh dấu `NOT_VERIFIED` theo Test Data Policy.

## 2. Original Request
Product Owner yêu cầu thực hiện sửa UI/UX Báo nghỉ theo toàn bộ chỉ thị trong `docs/ai-review/leave-notice-ui-ux-fix-prompt.md`:
1. Đồng bộ bảng danh sách Web với các trang quản trị hiện có; dùng dropdown cho bộ lọc, ngày dùng datepicker.
2. Trang lịch sử Báo nghỉ của Parent mở từ Tiện ích không có filter học sinh. Entry từ hồ sơ học sinh vẫn giữ phạm vi học sinh cố định.
3. Báo nghỉ học sinh chỉ hiển thị **Đã nhận / Đã hủy**; không hiển thị trạng thái phân công nhân sự. Giữ nguyên trạng thái riêng của tài xế/giáo viên.
4. Form Parent chọn học sinh bằng dropdown; ngày phục vụ bằng calendar datepicker, không giới hạn ba ngày gần nhất.
5. Bổ sung nút Báo nghỉ trên card trong **Lịch học & Xe đưa đón riêng của học sinh** (`mobile/app/parent/schedule.tsx`).
6. Nút Báo nghỉ trên card chuyến ở Home/Lịch mở confirm alert với học sinh, Trip, ngày và chiều đã xác định. **Không chuyển sang form nhập thông tin.**
7. Sau xác nhận alert, gửi OTP bằng selection gắn sẵn rồi mở màn OTP. **OTP hợp lệ mới tạo báo nghỉ**; không bỏ OTP. Chống gửi trùng và không dùng mặc định hôm nay/chiều đi thay dữ liệu của card.

## 3. Approved Scope
- **Web Admin**: `web/src/app/admin/leave-notices/page.tsx` đồng bộ table style, pagination, dropdown filter trạng thái (theo tab), datepicker, dropdown chiều, nút [Đặt lại]. Tab Học sinh hiển thị 4 cột (ẩn "Bố trí thay thế" & "Thao tác"), nhãn "Đã nhận" / "Đã hủy".
- **Mobile Parent History & Detail**: `mobile/app/leave-notices/index.tsx` và `mobile/app/leave-notices/[id].tsx`: bỏ thanh chips filter học sinh, hiển thị tên học sinh trên từng thẻ; trạng thái học sinh hiển thị "Đã nhận" (RECORDED) / "Đã hủy" (WITHDRAWN); bộ lọc Parent chỉ có [Tất cả, Đã nhận, Đã hủy].
- **Mobile Create Form**: `mobile/app/leave-notices/create.tsx`: chọn học sinh bằng modal dropdown (cố định khi mở từ hồ sơ); chọn ngày bằng calendar modal datepicker (dùng pure primitives React Native, không giới hạn 3 ngày); reset trip selection khi thay đổi điều kiện; hủy bỏ responses cũ khi selection thay đổi.
- **Quick Card Action**: Tạo hook dùng chung `mobile/hooks/use-quick-leave-notice.ts` với in-flight guard chống double tap. Áp dụng cho:
  - Thẻ chuyến tài xế/giáo viên tại Home (`mobile/app/(tabs)/index.tsx`).
  - Thẻ chuyến học sinh tại Home (`mobile/app/(tabs)/index.tsx`).
  - Thẻ chuyến lịch vận hành (`mobile/app/(tabs)/schedule.tsx`).
  - Thẻ chuyến lịch học riêng của học sinh (`mobile/app/parent/schedule.tsx`).
- **Backend Service Alignment**: Cập nhật `api/src/trips/trips.service.ts` để `getParentStudentSchedule` kiểm tra chính xác active leave notice của từng học sinh và trạng thái lên xe (`PRESENT` / alighted) trước khi trả cờ `canReportLeave`. `getDriverSchedule` và `getBusAttendantSchedule` chặn báo nghỉ trùng khi đã có notice `PENDING_REPLACEMENT`.
- **Ranh giới nghiêm ngặt**: Không migration DB, không sửa schema/enum, không tự cài dependency bên ngoài, không tự tạo dữ liệu test giả hay gửi OTP thử.

## 4. Analysis & Decisions
- **Web Admin Layout**: Tham khảo trực tiếp `trips-table.tsx` và `student-table.tsx`. Filter toolbar gom gọn các `<select>` và `<input type="date">` chuẩn convention. Khi chuyển role tab (Tài xế/Học sinh/Giáo viên), `statusFilter` tự động reset về `'ALL'` và `page` về 1, loại bỏ triệt để lỗi tab Học sinh vướng filter "Chờ phân công".
- **Báo nghỉ học sinh chỉ 2 trạng thái**: Học sinh không tham gia quy trình thay thế nhân sự vận hành. Vì vậy, trên UI chỉ hiển thị "Đã nhận" (RECORDED) và "Đã hủy" (WITHDRAWN). Các trạng thái "Chờ phân công" / "Đã bố trí" được ẩn hoàn toàn khỏi tab Học sinh (Web) và màn hình Parent (Mobile). Nhân sự vận hành (Tài xế, Giáo viên) vẫn giữ nguyên đầy đủ 5 trạng thái vòng đời.
- **Form Datepicker Primitives**: Thay vì cài thư viện native ngoài (vi phạm quy tắc dependencies), xây dựng Calendar Modal datepicker gọn gàng bằng React Native primitives (`Modal`, `TouchableOpacity`, `View`, `Text`) với thuật toán lịch UTC thuần túy, tính đúng offset thứ Hai đầu tuần và số ngày trong tháng của múi giờ Việt Nam.
- **Luồng Báo nghỉ nhanh từ Card (Quick Action)**: Nút "Báo nghỉ" trên card không điều hướng sang form nhập liệu mà bật popup `Alert.alert` hiển thị đầy đủ thông tin định danh: Tên học sinh/nhân sự, Ngày chuyến xe thật, Chiều di chuyển và Tên tuyến xe. Nhấn "Đóng" hủy bỏ hoàn toàn không có side-effect. Nhấn "Xác nhận" gọi `requestLeaveNoticeOtp` và điều hướng thẳng vào màn hình OTP mang theo metadata gắn sẵn.
- **In-flight Guard**: `useQuickLeaveNotice` theo dõi `requestingTripId` để vô hiệu hóa nút bấm và chặn duplicate alert/requests khi người dùng nhấn nhanh nhiều lần.

## 5. Implementation Details
1. **API**: `api/src/trips/trips.service.ts`:
   - `getParentStudentSchedule`: Thêm truy vấn `leaveNotices` và `attendances` theo `studentId`. Tính `canReportLeave = !activeStudentNotice && !isBoardedOrAlighted && t.status === TripStatus.SCHEDULED && !t.actualStartTime && (t.direction !== RouteDirection.TO_PARKING || !t.attendantReadyAt)`.
   - `getDriverSchedule` & `getBusAttendantSchedule`: Bổ sung `!hasPendingStaff` vào điều kiện `canReportLeave`.
2. **Web Admin**: `web/src/app/admin/leave-notices/page.tsx`:
   - Bỏ đoạn mô tả dài dưới tiêu đề `h1`.
   - Chuyển toàn bộ filter chips sang dropdown `<select>`, datepicker `<input type="date">`, dropdown chiều và nút [Đặt lại].
   - Tab Học sinh: chỉ hiển thị 4 cột (`Học sinh / Người báo`, `Chuyến xe`, `Ngày & Giờ`, `Trạng thái`), ẩn 2 cột thay thế và thao tác. Trạng thái badge hiển thị "Đã nhận" / "Đã hủy".
   - Switch tab tự động reset `statusFilter = 'ALL'` và `page = 1`.
3. **Mobile Hook**: `mobile/hooks/use-quick-leave-notice.ts`:
   - Quản lý trạng thái `requestingTripId`, hàm `isRequesting(tripId)`, popup xác nhận `Alert.alert` và chuyển tiếp màn OTP.
4. **Mobile Screens**:
   - `mobile/app/parent/schedule.tsx`: Thêm nút "Báo nghỉ" trên thẻ chuyến thỏa mãn `trip.canReportLeave && !trip.isVirtual`.
   - `mobile/app/(tabs)/index.tsx`: Chuyển hành động nút card Home sang `triggerQuickLeaveNotice`.
   - `mobile/app/(tabs)/schedule.tsx`: Chuyển hành động nút card Lịch vận hành sang `triggerQuickLeaveNotice`.
   - `mobile/app/leave-notices/index.tsx`: Bỏ student filter chips; lọc trạng thái Parent giới hạn 3 mục; badge học sinh hiển thị "Đã nhận" / "Đã hủy".
   - `mobile/app/leave-notices/[id].tsx`: Badge học sinh hiển thị "Đã nhận" / "Đã hủy".
   - `mobile/app/leave-notices/create.tsx`: Dropdown chọn học sinh, calendar modal datepicker, hủy request stale.
5. **Unit Tests**:
   - `web/src/components/admin/leave-notices/leave-notices.test.ts`: 4 test cases cho Web table/filters.
   - `mobile/scripts/leave-notices-ui.test.ts`: 5 test cases cho Mobile status labels, calendar offset, in-flight guard.

## 6. Database Changes
- **Không có**: Tuyệt đối không thay đổi schema Prisma, enum database hay tạo migration mới.

## 7. API & Swagger Changes
- Đồng bộ DTO và logic tính `canReportLeave` trong `TripsService`.
- Kiểm chứng Swagger endpoint tại `http://localhost:3000/api/docs-json`: OpenAPI 3.0.0, 9 endpoints Báo nghỉ hoạt động bình thường, backend server NestJS compile 0 errors.

## 8. UI/UX Changes
- Bảng Web Admin đồng nhất chuẩn visual của hệ thống (màu nền `#FFFDF6`, border `#E2E8F0`, badge emerald `#DCFCE7`/slate `#F1F5F9`).
- Lịch sử Parent không còn bị vướng bộ lọc học sinh từ Tiện ích; tên con hiển thị rõ trên từng thẻ.
- Báo nghỉ học sinh chỉ thể hiện trạng thái tiếp nhận và hủy ("Đã nhận" / "Đã hủy"), không làm phụ huynh hoang mang với các thuật ngữ điều động xe.
- Form tạo báo nghỉ hỗ trợ chọn bất kỳ ngày hợp lệ qua lịch tháng trực quan, có nút "Chọn hôm nay".
- Luồng Báo nghỉ từ thẻ chuyến tức thời, an toàn qua OTP, không bắt phụ huynh nhập lại thông tin đã có trên chuyến.

## 9. Verification & Testing
- **Typecheck**:
  - `api`: `npx tsc --noEmit` -> PASS (0 errors).
  - `web`: `npx tsc --noEmit` -> PASS (0 errors).
  - `mobile`: `npx tsc --noEmit` -> PASS (0 errors).
- **Unit Tests**:
  - `api`: `npm test` (vitest) -> 29 test suites, 353 tests PASS (100%).
  - `web`: `npm test` (node:test) -> 26 test suites, 77 tests PASS (100%).
  - `mobile`: `node --test mobile/scripts/leave-notices-ui.test.ts` -> 5 tests PASS.
  - `mobile`: `node --test mobile/scripts/trip-status-label.test.ts` -> 7 tests PASS.
- **Swagger Docs**: `http://localhost:3000/api/docs-json` verified via HTTP GET -> OpenAPI 3.0.0 healthy.
- **Runtime Verification Policy Status**:
  - `NOT_VERIFIED` kèm nhãn `BLOCKED_BY_TEST_DATA_POLICY` đối với: Thao tác bấm "Xác nhận" gửi OTP trên thiết bị thật, xác nhận OTP thành công tạo bản ghi DB, và gửi email/SMS thật. Việc này cần Product Owner tiến hành trong phiên UAT với số điện thoại/email kiểm thử được cấp phép.

## 10. Issues & Risks
- **Rủi ro mạng khi gửi OTP**: Nếu thiết bị mất mạng đúng lúc bấm Xác nhận alert, `requestLeaveNoticeOtp` sẽ báo lỗi và người dùng vẫn ở lại màn hình hiện tại (không bị kẹt màn hình).
- **Trùng lặp thao tác**: Đã được xử lý triệt để thông qua `requestingTripId` guard.

## 11. Reviewer Focus
- Bảng Web Admin: Kiểm tra dropdown lọc trạng thái thay đổi theo từng tab (Học sinh vs Tài xế/Giáo viên) và nút [Đặt lại].
- Màn hình Lịch học & Xe đưa đón riêng của học sinh (`mobile/app/parent/schedule.tsx`): Kiểm tra sự xuất hiện của nút "Báo nghỉ" trên các chuyến chưa khởi hành.
- Thử bấm nút Báo nghỉ trên thẻ chuyến: Kiểm tra hộp thoại Alert hiển thị đúng thông tin của thẻ, bấm "Đóng" không tạo OTP request, bấm "Xác nhận" chuyển thẳng đến màn hình OTP.

## 12. Suggested Next Step
- Product Owner chạy ứng dụng Web (`npm run dev`) và Mobile (`npx expo start`) để kiểm tra giao diện và tiến hành kiểm thử UAT luồng Báo nghỉ bằng tài khoản kiểm thử chính thức.

## 13. Approval Status
- Triển khai hoàn tất theo toàn bộ chỉ thị trong `docs/ai-review/leave-notice-ui-ux-fix-prompt.md`.
- **STOP-AFTER-TASK**: Antigravity dừng lại tại đây và chờ phản hồi từ Product Owner.
