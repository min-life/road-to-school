# AI Review — Thiết kế Báo nghỉ học sinh, tài xế và giáo viên phụ xe

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: API / Database / Web / Mobile — DESIGN ONLY. Status: WAITING_APPROVAL. Không implementation hoặc soạn prompt.

## 2. Original Request
PO yêu cầu phân tích ý tưởng Báo nghỉ cho học sinh/Driver/Bus Attendant, thử wireframe, định hướng DB/API. Yêu cầu gồm OTP khi báo, hủy không OTP theo Trip/Ready, attendance học sinh, phân công nhân sự qua modal tại tab Báo nghỉ, chờ phân công và hủy Trip không thể khôi phục.

## 3. Approved Scope
Phê duyệt phân tích/thiết kế, chưa duyệt source/schema/migration/API/UI implementation. PO đã trả lời3điểm: áp dụng lịch VIRTUAL chưa sinh Trip; OTP học sinh tới Student.guardianPhone; mỗi lần chọn một chuyến, không áp dụng toàn bộ ngày/chiều.

## 4. Analysis & Decisions
Tài liệu đầy đủ: [leave-notice-business-architecture-plan.md](leave-notice-business-architecture-plan.md).

- Báo nghỉ có hiệu lực sau OTP, không approve/reject. Student -> RECORDED; staff -> PENDING_REPLACEMENT, sau đó REPLACED/WITHDRAWN/TRIP_CANCELLED theo guard.
- Phím trên card prefill toàn bộ nhưng vẫn OTP; không yêu cầu nhập lại ngày/chiều/chuyến. Parent Student Detail fix student; card nhiều con đặt action theo từng con.
- Đề xuất materialize đúng occurrence VIRTUAL khi confirm thành công bằng helper generation nội bộ, không sinh Trip trong GET hoặc gửi OTP. Tạo đúng roster và không bypass public manual generation RBAC.
- Đề xuất một LeaveNotice record cho một Trip. Tái sử dụng OTP và TripAttendance. Không lạm dụng StudentUpdateRequest để lưu báo nghỉ.
- Đề xuất giữ Trip lifecycle SCHEDULED, thêm assignmentStatus WAITING_ASSIGNMENT dẫn xuất, UI badge và server Start guard; còn cần PO duyệt phương án này.
- Pending staff notices chặn Start; xử lý một người không mở Start nếu còn người khác pending. Đổi Attendant reset Ready; chỉ đổi Driver giữ Ready theo source hiện tại.
- Hủy Trip sử dụng CANCELLED hiện có, không khôi phục, không xóa roster/attendance/history, cron không tạo lại occurrence.
- SMS hiện chỉ console development; email có SMTP. Chưa có cơ sở khẳng định OTP SMS thật có sẵn.

## 5. Implementation Details
No application code changes. Tạo tài liệu thiết kế leave-notice-business-architecture-plan.md; cập nhật LATEST.md/.diff. Báo cáo trước đã archive theo timestamp, hậu tố before-leave-notice-design.

## 6. Database Changes
None applied. Định hướng chưa duyệt: một bảng LeaveNotice (kind,tripId,reportedBy,student?,otpChallengeId unique,status,processing/replacement/withdrawal timestamps, snapshot attendance trước tác động). Date/direction/school derive từ Trip. Thêm OtpPurpose.LEAVE_NOTICE; cân nhắc nullable Trip.cancelledAt/cancelledById cho audit hủy. Không migration/generate/seed.

## 7. API & Swagger Changes
None implemented. Đề xuất options GET pure; send OTP; confirm; list/detail; cancel notice; candidates; assign replacement; cancel Trip từ notice thuộc quyền. DTO action flags/canCancel/disabledReason và assignmentStatus trên Trip cards/operational state. Quyền SYSTEM_ADMIN xử lý Driver, SCHOOL_ADMIN xử lý Attendant đúng trường; Student không có bước duyệt. Contracts/error codes và Swagger sẽ duyệt trước implementation.

## 8. UI/UX Changes
Wireframes draft trong plan: Home Tiện ích icon trên/tên dưới căn giữa; card Home/Lịch có Báo nghỉ; Student Detail thêm action; lịch sử + form ngày/chiều/chuyến; OTP; Web tab Báo nghỉ và modal chọn nhân sự/hủy Trip. Chưa code UI. Giữ Minimal UI Copy, không nút Duyệt/Từ chối phép.

## 9. Verification & Testing
PASS: đọc tài liệu bắt buộc, source schema/OtpService/StudentRequests/Parents, generation/virtual schedule, assignment validators/guards/attendance, Mobile Home/Schedule/Student Detail và Web nav. Kiểm tra git status read-only; bảo vệ uncommitted work.

NOT_VERIFIED: tất cả flow Báo nghỉ runtime vì chưa implement. SMS delivery thật chưa có implementation qua source được đọc. Không gửi OTP thật, gọi mutation, tạo dữ liệu test, chạy migration/dependency hoặc trả phí. Không chạy typecheck/tests do chỉ sửa documentation; không dùng test counts cũ làm kết quả mới.

## 10. Issues & Risks
Cần PO chốt: xử lý học sinh đã PRESENT trước Start; chấp nhận assignmentStatus dẫn xuất hay TripStatus lưu thật; Parent khác có được hủy notice do Parent đầu tạo; SMS provider thật.

Technical review cần chú ý atomic OTP consume+business mutation; attempts sai OTP phải persist; confirm đồng thời Start/Ready; cancel vs replacement; cả Driver và Attendant nghỉ; double-book candidate ở hai Trip; virtual materialization đồng thời cron; persisted assignment/cancelled occurrence phải thắng route defaults; khôi phục snapshot attendance không ghi đè dữ liệu mới; người đã được thay vẫn đọc lịch sử notice của mình.

## 11. Reviewer Focus
- Phân biệt báo nghỉ với duyệt nghỉ và xử lý điều phối.
- Một lựa chọn một Trip, không broadcast toàn ngày/chiều.
- OTP đúng guardianPhone/registered contact, bind canonical payload/actor/subject/occurrence và revalidate ở verify.
- Chặn mọi entry point Start/Ready/assignment/attendance bypass; RBAC/object scope/privacy.
- Không xóa route stop hoặc backfill; không tự hủy Trip khi toàn bộ học sinh nghỉ.
- DB tối thiểu và scope schema chưa được duyệt.

## 12. Suggested Next Step
PO phản hồi wireframe/thiết kế và4điểm chưa chốt trong plan. Chưa soạn prompt triển khai theo đúng chỉ thị hiện tại.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL — thiết kế là đề xuất, chưa tự đánh APPROVED. STOP-AFTER-TASK, không implementation.
