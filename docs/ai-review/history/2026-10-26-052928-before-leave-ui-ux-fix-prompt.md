# AI Review — Báo cáo Triển khai Module Báo nghỉ (Leave Notice Module)

## 1. Task Information
- **Date**: 26/10/2026 (Asia/Saigon).
- **Scope thực hiện**: Full-stack Implementation (Database, Backend API, Web Admin, Mobile App, Documentation).
- **Type**: Feature Implementation.
- **Status**: COMPLETED.

---

## 2. Original Request
Product Owner yêu cầu triển khai toàn bộ module Báo nghỉ theo tài liệu chỉ thị `docs/ai-review/leave-notice-implementation-prompt.md` và thiết kế đã duyệt tại `docs/ai-review/leave-notice-business-architecture-plan.md`, không dừng sau planning, bảo vệ uncommitted baseline, tuân thủ nghiêm ngặt Test Data Policy (không seed/mutate dữ liệu thật).

---

## 3. Approved Scope
- **Phạm vi đối tượng**: Học sinh (do Phụ huynh còn liên kết báo), Tài xế (`DRIVER` tự báo), Giáo viên phụ xe (`BUS_ATTENDANT` tự báo). Tuyệt đối không thêm role `TEACHER`.
- **Phạm vi chuyến xe**: Chỉ áp dụng cho chuyến xe thật đã tồn tại mang trạng thái `SCHEDULED` và `actualStartTime === null`. Loại bỏ các chuyến xe dự kiến (`VIRTUAL`). Không tự động sinh chuyến xe từ các luồng báo nghỉ.
- **Quy tắc Guard đối xứng**:
  - `TO_SCHOOL`: Học sinh & Tài xế báo trước Start; Giáo viên phụ xe báo trước Ready và trước Start.
  - `TO_PARKING`: **Tất cả các đối tượng** bị chặn tạo báo nghỉ ngay khi Giáo viên phụ xe đã bấm Ready (`attendantReadyAt !== null`).
  - Điểm danh: Không bao giờ ghi đè lên học sinh đã được đánh dấu `PRESENT` hoặc đã xuống xe (`alightedAt !== null`).
- **Xác thực OTP**:
  - Học sinh: Gửi SMS tới `Student.guardianPhone` (hiện tại tạm ghi nhận qua SMS console).
  - Nhân sự (Tài xế / Giáo viên phụ xe): Gửi theo thông tin liên hệ của tài khoản: Có Email gửi Email qua SMTP, có SĐT gửi SMS qua console, có cả hai thì fan-out gửi tới cả hai.
- **Quản lý phân công & Điểm danh**:
  - Điểm danh học sinh tự động chuyển sang `ABSENT` với lý do `'Phụ huynh xin nghỉ'`, lưu snapshot điểm danh trước đó để khôi phục khi hủy báo nghỉ.
  - Nhân sự báo nghỉ chuyển trạng thái sang `PENDING_REPLACEMENT`, chuyến xe tính trạng thái `assignmentStatus = 'WAITING_ASSIGNMENT'` và server chặn `startTrip`.
  - Quản trị viên (`SYSTEM_ADMIN` xử lý Tài xế, `SCHOOL_ADMIN` xử lý Giáo viên) bố trí người thay thế trực tiếp qua modal trong tab Báo nghỉ.
  - Hủy chuyến xe khi không bố trí được người thay thế: Bắt buộc nhập lý do, bất khả nghịch, đóng toàn bộ báo nghỉ chờ liên quan.

---

## 4. Analysis & Decisions
1. **Bản chất nghiệp vụ**: Đây là **báo nghỉ mang tính thông báo**, không phải đơn xin phép; do đó khi xác thực OTP thành công thì báo nghỉ có hiệu lực ngay lập tức. Không tồn tại các trạng thái trung gian "chờ duyệt" hay "từ chối phép".
2. **Quyền xem và Hủy báo nghỉ**: Mọi Phụ huynh có liên kết hợp lệ với học sinh đều xem được lịch sử báo nghỉ của con; tuy nhiên **chỉ có tài khoản đã tạo báo nghỉ** mới có quyền bấm Hủy. Hủy báo nghỉ không yêu cầu nhập lại mã OTP nhưng kiểm tra nghiêm ngặt guard thời gian khởi hành/ready của chuyến xe.
3. **Bảo tồn Schema & Trạng thái Chuyến xe**: Giữ nguyên `TripStatus.SCHEDULED`, không thêm giá trị enum mới hoặc tạo cột trùng lặp. Trạng thái `WAITING_ASSIGNMENT` được tính toán động (computed property) trên Backend và trả về qua DTO để client render badge "Chờ phân công".
4. **Không tự sinh dữ liệu test**: Kiểm chứng logic thuần túy qua Unit Tests (in-memory mock Prisma) và Typecheck (`tsc --noEmit`), giữ vững toàn vẹn dữ liệu production và development.

---

## 5. Implementation Details

### A. Database (`api/prisma`)
- Thêm enum `LeaveNoticeKind`: `STUDENT`, `DRIVER`, `BUS_ATTENDANT`.
- Thêm enum `LeaveNoticeStatus`: `RECORDED`, `PENDING_REPLACEMENT`, `REPLACED`, `WITHDRAWN`, `TRIP_CANCELLED`.
- Thêm enum value `OtpPurpose.LEAVE_NOTICE`.
- Thêm model `LeaveNotice` với quan hệ tới `Trip`, `Student`, `User` (reporter, replacement, processor, canceller), `OtpChallenge`, trường `attendanceBefore` lưu JSON snapshot điểm danh.
- Thêm trường audit hủy chuyến trên model `Trip`: `cancelledAt DateTime?`, `cancelledById String?`.
- Đã tạo và áp dụng migration additive: `api/prisma/migrations/20261025212318_add_leave_notices/migration.sql`.

### B. Backend API (`api/src`)
- `api/src/auth/otp.service.ts`:
  - Mở rộng hỗ trợ purpose `LEAVE_NOTICE`.
  - Thêm phương thức `createLeaveNoticeChallenge` hỗ trợ đa kênh (Email + SMS console), mặt nạ hóa đích đến (`maskIdentifier`).
- `api/src/leave-notices/`:
  - `dto/`: 8 DTOs bao phủ toàn bộ luồng nghiệp vụ (`options`, `otp`, `confirm`, `list`, `detail`, `cancel`, `candidates`, `assign-replacement`, `cancel-trip`).
  - `leave-notices.service.ts`: Xử lý nghiệp vụ lõi:
    - `getOptions`: Kiểm tra quyền truy cập chuyến xe thật, áp dụng guard Ready chiều về và điểm danh.
    - `requestOtp`: Kiểm tra điều kiện, tự động phân phối OTP đa kênh.
    - `confirmLeaveNotice`: Consume OTP nguyên tử, tạo `LeaveNotice`, cập nhật `TripAttendance` hoặc gán trạng thái chờ phân công.
    - `listLeaveNotices` & `getLeaveNoticeDetail`: Phân quyền theo vai trò (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `PARENT`, `DRIVER`, `BUS_ATTENDANT`).
    - `cancelLeaveNotice`: Chỉ người tạo được hủy, khôi phục điểm danh từ snapshot.
    - `getReplacementCandidates`: Tìm kiếm nhân sự theo vai trò và trường học, kiểm tra xung đột lịch và báo nghỉ.
    - `assignReplacement`: Phân công thay thế nguyên tử (CAS), gán nhân sự mới vào Trip và reset ca Ready nếu là giáo viên.
    - `cancelTripFromNotice`: Hủy chuyến xe với lý do bắt buộc, đóng các báo nghỉ chờ phân công liên quan.
  - `leave-notices.controller.ts`: 9 REST endpoints được trang bị đầy đủ Swagger decorators và Guard `@Roles`.
  - `leave-notices.module.ts`: Đăng ký vào `app.module.ts`.
- `api/src/trips/trips.service.ts`:
  - Bổ sung `assignmentStatus`, `canReportLeave`, `hasLeaveNotice`, `leaveNoticeId` vào các response của chuyến xe.
  - Chặn `markAttendantReady` và `startTrip` khi có báo nghỉ nhân sự đang chờ phân công.
  - Chặn cập nhật phân công thủ công qua endpoint cũ khi nhân sự có báo nghỉ đang hiệu lực.

### C. Web Admin (`web/src`)
- `web/src/lib/types.ts` & `web/src/lib/api-client.ts`: Định nghĩa đầy đủ DTOs và 5 API methods cho Web Admin.
- `web/src/components/admin/admin-nav.config.ts`: Thêm mục điều hướng "Báo nghỉ" (`id: 'leave-notices'`, href: `/admin/leave-notices`) cho `SYSTEM_ADMIN` và `SCHOOL_ADMIN`.
- `web/src/components/admin/admin-sidebar.tsx`: Gán `CalendarIcon` cho mục Báo nghỉ.
- `web/src/components/admin/admin-nav.test.ts`: Cập nhật kiểm thử phân quyền thanh điều hướng (9 mục cho System Admin, 8 mục cho School Admin).
- `web/src/components/admin/leave-notices/replacement-modal.tsx`: Modal chỉ định nhân sự thay thế với danh sách ứng viên hiển thị tính khả dụng và lý do xung đột.
- `web/src/components/admin/leave-notices/cancel-trip-modal.tsx`: Modal hủy chuyến xe với cảnh báo bất khả nghịch và ô nhập lý do bắt buộc.
- `web/src/app/admin/leave-notices/page.tsx`: Giao diện quản lý báo nghỉ hoàn chỉnh:
  - Tabs đối tượng theo quyền: Tài xế (`DRIVER`), Giáo viên (`BUS_ATTENDANT`), Học sinh (`STUDENT`).
  - Bộ lọc trạng thái, ngày phục vụ, chiều tuyến đường.
  - Bảng dữ liệu với badge màu sắc chuẩn thương hiệu và nút bấm `[Xử lý thay thế]`.

### D. Mobile App (`mobile/`)
- `mobile/services/api-client.ts`: Bổ sung 6 phương thức API (`getLeaveNoticeOptions`, `requestLeaveNoticeOtp`, `confirmLeaveNotice`, `listLeaveNotices`, `getLeaveNoticeDetail`, `cancelLeaveNotice`) và cập nhật DTOs chuyến xe.
- `mobile/app/(tabs)/index.tsx`:
  - Thay thế khối lời chào bằng thẻ **"Tiện ích"** với nút bấm "Báo nghỉ" căn giữa (icon trên, chữ dưới) theo đúng wireframe 6.1.
  - Bổ sung nút "Báo nghỉ chuyến này" trên các card chuyến xe của Tài xế, Giáo viên và Phụ huynh khi `canReportLeave === true`.
  - Hiển thị badge "Chờ phân công" khi `assignmentStatus === 'WAITING_ASSIGNMENT'`.
- `mobile/app/(tabs)/schedule.tsx`: Thêm nút "Báo nghỉ" trên từng card chuyến xe hợp lệ.
- `mobile/app/parent/student-detail/[id].tsx`: Bổ sung mục "Báo nghỉ" trong danh sách Thao tác của hồ sơ học sinh.
- `mobile/app/leave-notices/`:
  - `index.tsx`: Màn hình danh sách lịch sử báo nghỉ, hỗ trợ lọc theo học sinh (cho Phụ huynh), lọc trạng thái, xem chi tiết và nút "Hủy báo nghỉ" (chỉ người tạo).
  - `create.tsx`: Quy trình tạo báo nghỉ gồm chọn học sinh -> ngày -> chiều -> chuyến xe hợp lệ, nhập lý do tùy chọn, xem thẻ tóm tắt và bấm "Gửi mã xác thực OTP".
  - `otp.tsx`: Màn hình nhập mã OTP 6 chữ số, hiển thị đích đến đã mask (kèm nhãn `SMS console`), đếm ngược 60s và gửi lại mã.
  - `[id].tsx`: Màn hình chi tiết đơn báo nghỉ kèm timeline và thông tin nhân sự thay thế.

---

## 6. Database Changes
- Migration: `20261025212318_add_leave_notices` đã được áp dụng thành công vào cơ sở dữ liệu development:
  - Bảng mới: `leave_notices` (15 cột, khóa ngoại tới `trips`, `students`, `users`, `otp_challenges`, unique constraint trên `otpChallengeId`).
  - Bổ sung cột trên bảng `trips`: `cancelled_at TIMESTAMP(3)`, `cancelled_by_id TEXT`.
  - Enum mới: `LeaveNoticeKind`, `LeaveNoticeStatus`, giá trị enum `OtpPurpose.LEAVE_NOTICE`.
- Không thực hiện bất kỳ lệnh DML, script thêm dữ liệu giả mạo hay seed dữ liệu nào theo đúng Test Data Policy.

---

## 7. API & Swagger Changes
- Đồng bộ Swagger decorators trên Controller và DTOs:
  - `GET /api/v1/leave-notices/options`
  - `POST /api/v1/leave-notices/otp`
  - `POST /api/v1/leave-notices/confirm`
  - `GET /api/v1/leave-notices`
  - `GET /api/v1/leave-notices/{id}`
  - `POST /api/v1/leave-notices/{id}/cancel`
  - `GET /api/v1/leave-notices/{id}/replacement-candidates`
  - `POST /api/v1/leave-notices/{id}/assign-replacement`
  - `POST /api/v1/leave-notices/{id}/cancel-trip`
- Kiểm chứng thực tế tại `http://localhost:3000/api/docs-json`: Xác nhận 100% cả 9 endpoints đều hiện diện và có đầy đủ schema response/request.

---

## 8. UI/UX Changes
- Áp dụng triết lý **Minimal UI Copy**: Không dùng đoạn văn dài, ưu tiên badges trực quan, cards rõ ràng.
- Bảng màu chuẩn thương hiệu: Primary `#FFCB56`, Background `#FFFDF6`, Text `#1E293B`, Card `#FFFFFF`, Amber `#D97706` cho Chờ phân công, Emerald `#10B981` cho Đã ghi nhận.
- Cấu trúc Wireframe Mobile 6.1, 6.2 và Web 7.0 được triển khai chính xác theo bản kế hoạch PO đã duyệt.

---

## 9. Verification & Testing
1. **Typecheck tĩnh (`npx tsc --noEmit`)**:
   - `api`: PASS (0 lỗi).
   - `web`: PASS (0 lỗi).
   - `mobile`: PASS (0 lỗi).
2. **Unit Tests tự động**:
   - `api`: 353/353 tests PASS (bao gồm 15/15 tests chuyên biệt mới cho `LeaveNoticesService`).
   - `web`: 73/73 tests PASS (bao gồm 6 tests kiểm tra thanh điều hướng quản trị `admin-nav.test.ts`).
3. **Swagger Verification**:
   - Live endpoint `http://localhost:3000/api/docs-json` phản hồi mã 200, hiển thị đầy đủ 9 đường dẫn mới.
4. **Giới hạn Test Data Policy**:
   - Các hành vi gửi SMS thực tế qua nhà mạng viễn thông, gửi email SMTP thực qua mạng internet và các tương tác ghi dữ liệu UAT runtime trên thiết bị thật được đánh dấu là `NOT_VERIFIED` kèm nhãn `BLOCKED_BY_TEST_DATA_POLICY` do chưa được PO cấp phạm vi và tài khoản test chuyên biệt.

---

## 10. Issues & Risks
- **SMS Console**: Hiện tại SMS OTP được ghi nhận qua console log (chế độ development mô phỏng an toàn), cần tích hợp API của nhà cung cấp SMS Brandname khi tiến hành triển khai môi trường production thật.
- **Race Condition khi nhiều người cùng nhận phân công**: Hệ thống đã áp dụng kiểm tra atomic CAS khi phân công người thay thế; tuy nhiên ở quy mô lớn cần tiếp tục duy trì row-level locking trên bảng `trips`.

---

## 11. Reviewer Focus
- Đã tuân thủ quy tắc người tạo báo nghỉ là người duy nhất được phép hủy (`reportedById === user.id`).
- Đã tuân thủ quy tắc guard Ready chiều về: Chặn tạo báo nghỉ cho tất cả các đối tượng (kể cả Phụ huynh và Tài xế) khi Giáo viên phụ xe đã bấm Ready chiều về (`attendantReadyAt !== null`).
- Đã bảo toàn và khôi phục điểm danh chính xác từ `attendanceBefore` snapshot khi phụ huynh hủy báo nghỉ.
- Không tự ý commit/push mã nguồn, toàn bộ baseline được bảo vệ nguyên vẹn trong working tree.

---

## 12. Suggested Next Step
Product Owner xem xét báo cáo triển khai và kiểm chứng mã nguồn của phân hệ Báo nghỉ; sau đó có thể chỉ định tài khoản/môi trường cụ thể để nghiệm thu UAT runtime nếu cần.

---

## 13. Approval Status
- **Implementation Status**: COMPLETED.
- **Verification Status**: STATIC_VERIFIED (Typecheck + Unit Tests PASS 100%).
- **Runtime Acceptance**: PENDING PO UAT REVIEW (STOP-AFTER-TASK).
