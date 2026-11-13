# AI Review — Đối chiếu giao diện lịch Staff và Parent

## 1. Task Information
02/11/2026 Asia/Saigon. DISCUSSION/read-only source review. Không sửa application code. Checkout đầu task sạch tại HEAD92fc344.

## 2. Original Request
PO hỏi màn Lịch Driver/Bus Attendant có thể dùng chung hoặc làm giống Parent để đồng bộ không.

## 3. Approved Scope
Kiểm tra hai màn và đề xuất cách reuse, giữ Parent hiện tại làm mẫu. Chưa có chỉ thị triển khai/refactor trong lượt này.

## 4. Analysis & Decisions
AppHeader/headerActionStyles, utils date, getScheduleStatusLabel, useActiveRefresh và useQuickLeaveNotice đã dùng chung. Staff và Parent vẫn duplicate week selector, card JSX và StyleSheet. Source comparison29style entries giống nhau,16entries khác về layout/typography (header badges/footer/actions/text). Container, selected-day dark style và tripCard hiện đã giống nhau; không kết luận hai màn khác hoàn toàn từ ảnh.
Đề xuất extract presentation nhỏ từ Parent cho WeekSelector và khung ScheduleTripCard, dùng styles Parent nguyên bản. Fetch/state theo màn và role giữ riêng. Staff có thể dùng yellow action variant theo quyết định nút vàng; không đổi style mặc định Parent.

## 5. Implementation Details
Chỉ đọc mobile/app/(tabs)/schedule.tsx, mobile/app/parent/schedule.tsx và route callers. AST self-check so sánh style definitions. Không tạo component hoặc sửa module. Cập nhật report bắt buộc, archive trước tại history/2026-11-02-before-schedule-ui-alignment-review.md/.diff; LATEST.diff rỗng vì read-only.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Parent dùng getParentStudentSchedule(studentId); Driver getDriverSchedule; Attendant getBusAttendantSchedule. Không cần đổi endpoint hoặc dữ liệu cho đề xuất UI.

## 8. UI/UX Changes
Chưa thay UI. Hướng đề xuất: giữ Parent hiện tại, dùng chung header/week selector/card typography và spacing; hiển thị thông tin phân công/vào map/Báo nghỉ theo Staff. Parent giữ ScheduleArrivalTime theo studentId, tên con, báo nghỉ cho con và Xem lộ trình. Trip virtual tiếp tục khóa navigation, quyền và điều kiện báo nghỉ giữ nguyên.

## 9. Verification & Testing
PASS read-only source/AST comparison. Đã kiểm tra route từ Parent student detail và tab lịch Staff. Không build/tests/runtime vì chưa implementation. Không gọi API/seed/tạo records. Không dựa vào screenshot để kết luận chức năng đã được xác minh native.

## 10. Issues & Risks
Không nên gộp cả screen/container vì data scope và action params khác nhau. Khi triển khai extraction, cần giữ Parent default JSX/styles và kiểm chứng screen hẹp/font scale, virtual trips và báo nghỉ. Chưa có wireframe riêng được duyệt cho màn lịch trong lượt này.

## 11. Reviewer Focus
Reuse presentation đủ nhỏ; dùng Parent làm chuẩn, không redesign Parent hoặc trộn logic fetch/quyền. Header đã shared nên không tạo header mới.

## 12. Suggested Next Step
Dựng wireframe màn Lịch Driver/Bus Attendant theo Parent để PO xem trước khi triển khai.

## 13. Approval Status
Hoàn tất đối chiếu và đề xuất. Chưa sửa code; chờ PO quyết định bước wireframe/implementation.
