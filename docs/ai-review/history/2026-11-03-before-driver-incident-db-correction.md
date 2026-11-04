# AI Review — SCHEDULED trip blocked by unresolved driver incident

## 1. Task Information
03/11/2026 Asia/Saigon. Scope: API / Mobile diagnosis / Documentation. Type: Analysis. Status: COMPLETED. Chỉ kiểm tra, không sửa application code hoặc dữ liệu.

## 2. Original Request
Tìm nguyên nhân chuyến SCHEDULED lại hiện Chờ phân công và tài xế không thể bắt đầu. Chưa code/sửa dữ liệu.

## 3. Approved Scope
Đọc source backend trước; đối chiếu UI, SELECT DB thật và chạy logic đọc trạng thái với dữ liệu có sẵn. Không gọi mutation, không xử lý sự cố, không build/install. Chỉ cập nhật báo cáo theo quy tắc repository.

## 4. Analysis & Decisions
Chuyến 629290b4-dab7-438e-b10b-f02c50029bc2, Tuyến Về 01 (51B-289-2.34), 03/11/2026 17:00–17:23, TO_PARKING.
Trip status SCHEDULED, actualStartTime null; assignedDriverId c0e34c0e-a1a6-4cec-8fd0-8c9d280acf32, assignedBusAttendantId b7e45546-61cc-44fa-b969-1a2eaa62bfe8. Đây là chuyến đã gán, nên tài xế thấy chuyến đúng theo assignedDriverId.
Có sự cố 682305af-45ff-4fc8-941e-4417ec16aef2: DRIVER_MISSING, WAITING_ASSIGNMENT. createdAt 2026-11-03T02:48:53.415Z = 09:48:53 giờ Việt Nam. reportedBy là giáo viên phụ xe Phụ Văn Mẫu. Dedupe key manual và context xác định đúng tài xế hiện được gán. processedAt/resolution null. Không có LeaveNotice.
Giáo viên đã ready lúc 13:49:24 giờ Việt Nam nhưng không làm sự cố thiếu tài xế thành RESOLVED. Tài xế đăng nhập/xem chuyến cũng không đồng nghĩa xử lý sự cố.
getOperationalState ưu tiên sự cố chờ xử lý trước readiness/boarding/time: assignmentStatus WAITING_ASSIGNMENT, canStartTrip false, startDisabledReason WAITING_ASSIGNMENT. startTrip cũng từ chối tại guard tương ứng.
Hai học sinh vẫn UNMARKED. Sau xử lý sự cố, chuyến chiều về còn bị PENDING_BOARDING cho đến khi điểm danh đủ.
Local api/.env có TRIP_OPERATION_MODE=TEST: source cho phép báo sự cố ngoài cửa sổ thời gian trong TEST, giải thích khả năng báo 09:48 cho chuyến 17:00. Chưa đọc env của tiến trình API đang chạy; không khẳng định cấu hình tiến trình giống file ở mọi thời điểm.

## 5. Implementation Details
No application code changes. Chỉ lưu báo cáo, đánh dấu LATEST.diff không có code changes và lưu báo cáo trước trong history/2026-11-03-before-trip-start-diagnosis.md / .diff.
Source: api/src/trips/trips.service.ts: getDriverSchedule/getHomeTrip/getOperationalState/startTrip; api/src/incidents/incidents.service.ts: createManualIncident/resolveIncident; mobile/components/staff/staff-trip-card.tsx; mobile/app/trip/[id].tsx; mobile/components/schedule/trip-card.tsx; mobile/utils/trip-status-label.ts.

## 6. Database Changes
None. Prisma SELECT trong transaction SET TRANSACTION READ ONLY. Không cập nhật/xóa/thêm records, seed, OTP hoặc sessions.

## 7. API & Swagger Changes
None. Không gọi POST/PATCH/PUT/DELETE. Luồng xử lý hiện có: POST incidents/:id/resolve, action ARRIVED hoặc REPLACED. DRIVER_MISSING chỉ SYSTEM_ADMIN được xử lý. Chỉ đọc source, không gọi endpoint.

## 8. UI/UX Changes
None. Phát hiện thông tin thiếu nhất quán: Trang chủ dùng assignmentStatus từ operational state gồm incidents; lịch backend chỉ tính leave notices và card lịch chỉ render TripStatus => Lập lịch. Màn chi tiết thiếu nhánh WAITING_ASSIGNMENT trong startDisabledText nên rơi vào Chưa thể bắt đầu. Đây là vấn đề diễn đạt/nhất quán; không phải TripStatus sai hoặc thiếu assignedDriverId.

## 9. Verification & Testing
PASS: SELECT trip/leaveNotices/incidents/attendances và reporter/context, transaction read-only.
PASS: trích nguyên phương thức getOperationalState/assertTripAccess/isTestMode từ source TS hiện tại, transpile trong bộ nhớ, chạy trên transaction read-only với user tài xế thật và env local. Kết quả SCHEDULED, isAttendantReady true, totalStudents 2, unmarkedCount 2, assignmentStatus WAITING_ASSIGNMENT, hasPendingStaffLeaveNotice false, pendingStaffIncidentCount 1, canStartTrip false, startDisabledReason WAITING_ASSIGNMENT.
PASS: đối chiếu guard startTrip và luồng resolve ARRIVED/REPLACED bằng source.
NOT_VERIFIED: response HTTP trong phiên đăng nhập điện thoại, env thực tế tiến trình API, thao tác xử lý/end-to-end sau xử lý. Không build/typecheck vì không sửa code. Hai lần truy vấn/chạy script chẩn đoán đầu gặp lỗi chọn field/namespace và đã sửa lệnh đọc; không ghi dữ liệu.

## 10. Issues & Risks
Sự cố vẫn mở, chuyến vẫn bị chặn. Kể cả sau xử lý sự cố còn cần điểm danh 2 học sinh cho chiều về. TEST không bỏ rào cản thiếu nhân sự/điểm danh. Không kết luận ai đã bấm trên thiết bị vật lý từ reportedBy; chỉ xác nhận tài khoản ghi nhận trong DB.

## 11. Reviewer Focus
Phân biệt TripStatus và assignmentStatus. Xác nhận guard thiếu nhân sự hoạt động đúng; đánh giá nhãn Chờ phân công thay vì Chờ xử lý sự cố tài xế và đồng bộ cách tính giữa Home/Schedule/Detail. Không tự động đóng sự cố chỉ vì đăng nhập hoặc Ready.

## 12. Suggested Next Step
Quản trị viên nhà xe kiểm tra sự cố DRIVER_MISSING trên chuyến này và nếu tài xế thực sự đã có mặt thì xử lý theo hành động ARRIVED (Người cũ đã đến).

## 13. Approval Status
Chỉ chẩn đoán đã được yêu cầu. Không triển khai fix hoặc xử lý dữ liệu. WAITING FOR USER REVIEW / APPROVAL trước thay đổi tiếp theo.
