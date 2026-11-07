# AI Review — Xác định con trong chuyến đã chọn

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Documentation / Database guidance. Type: Analysis. Status: COMPLETED.

## 2. Original Request
PO đã có chuyến đúng ngày nhưng chưa biết có đúng con mình hay không.

## 3. Approved Scope
Soạn SELECT read-only cho PO tự chạy trong pgAdmin. Không tự thực thi SQL, không tạo liên kết/roster, không sửa source hoặc commit/push.

## 4. Analysis & Decisions
Dùng users.email/role PARENT -> parent_student_links.parent_id/student_id -> students.id/full_name/code để lấy đúng các con được liên kết. Dùng trips.id PO đã tìm và JOIN routes lấy tên tuyến/ngày/chiều. LEFT JOIN trip_attendances bằng trip_id/student_id để vẫn trả về con chưa có trong roster. ta.id NULL là chưa thuộc chuyến; excluded_at NOT NULL là đã loại khỏi roster; còn lại là đang có trong danh sách. Không dùng route_stops đơn thuần làm bằng chứng roster chuyến; không kết luận UNMARKED là không thuộc chuyến.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md/LATEST.diff, lưu báo cáo trước vào history/2026-10-30-before-check-child-trip.md và .diff. Query trả mã/tên học sinh liên kết, tên tuyến/ngày/chiều/trạng thái chuyến và trạng thái điểm danh, kết quả thuộc roster.

## 6. Database Changes
None executed. Không đọc hoặc ghi DB; SELECT hướng dẫn chưa chạy. Không seed hoặc tạo dữ liệu test.

## 7. API & Swagger Changes
None. Swagger N/A.

## 8. UI/UX Changes
None. Không thay navigation hoặc logic chọn card Home.

## 9. Verification & Testing
PASS: đối chiếu Prisma models User, ParentStudentLink, Student, TripAttendance, Trip và Route cùng tên bảng/cột thực tế.
PASS: git diff --check báo cáo.
NOT_VERIFIED: nội dung DB và kết quả SELECT thực tế. Không chạy typecheck/build vì không sửa application code.

## 10. Issues & Risks
Không có dòng có thể do sai trip id, email/tài khoản phụ huynh hoặc chưa có liên kết con; không đồng nghĩa chắc chắn chuyến không có học sinh. Có trong roster không đảm bảo Home ưu tiên hiển thị chuyến đó vì còn filter/priority/time window hiện có. Không tự thêm liên kết nếu query không tìm thấy.

## 11. Reviewer Focus
LEFT JOIN giữ con không trong chuyến; xác định active theo excluded_at. Chỉ lấy học sinh thuộc tài khoản PARENT đã được PO cung cấp, không lộ thông tin học sinh khác. Không lọc ta trong WHERE làm mất tính LEFT JOIN.

## 12. Suggested Next Step
PO thay trip id vào SELECT và xem cột ket_qua để xác nhận con thuộc chuyến.

## 13. Approval Status
Hướng dẫn theo yêu cầu PO. WAITING FOR USER REVIEW / APPROVAL. Không thay đổi database.
