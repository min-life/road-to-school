# AI Review — Bỏ tag điểm danh trùng trong chi tiết card

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Fix. Status: COMPLETED.

## 2. Original Request
Bỏ tag điểm danh dưới kết thúc tuyến theo lịch, chỉ giữ tag ở header card.

## 3. Approved Scope
PO chỉ định trực tiếp xóa tag lặp. Thay đổi nhỏ trên UI hiện có, không cần wireframe mới. Giữ nghiệp vụ và các thông tin V2 khác, không commit/push.

## 4. Analysis & Decisions
Tag lặp nằm ở attendanceBox trong body ParentTripCard, sau journey render prop. Xóa nhãn att.label và icon đi kèm ở body. Giữ studentStatus ở header. Giữ markedAt, childAlightedAt, absenceReason; chỉ render hộp metadata khi có nội dung để tránh hộp màu trống.

## 5. Implementation Details
Sửa mobile/app/(tabs)/index.tsx: bỏ tag status trong body, giữ giờ và lý do vắng có điều kiện. Không đổi getAttendanceBadge, studentJourneyBadge, nguồn dữ liệu hoặc rail.
Cập nhật docs/architecture/mobile-parent-student-journey.md và mobile-parent-home-ui.md.
Cập nhật LATEST.md và task-only LATEST.diff gồm 3 files so với snapshot trước task. Lưu review/diff trước tại history/2026-10-30-before-remove-duplicate-attendance.md và .diff.

## 6. Database Changes
None. Không truy cập DB, seed hoặc tạo dữ liệu test.

## 7. API & Swagger Changes
None. Không gọi/sửa API; Swagger N/A.

## 8. UI/UX Changes
Header vẫn hiển thị tag điểm danh khi thu gọn hoặc mở rộng. Body chỉ giữ giờ điểm danh, giờ xuống xe, lý do vắng nếu có; không còn nhãn/icon trạng thái lặp. Không render hộp rỗng. Các nút, route và điều kiện quyền giữ nguyên.

## 9. Verification & Testing
PASS: mobile npx --no-install tsc --noEmit, exit 0.
PASS: source assertions xác nhận header studentStatus giữ nguyên, att.label đã bỏ, các biểu thức giờ/lý do giữ nguyên; toàn bộ source trước attendance block và sau Vehicle & Driver byte-equivalent sau chuẩn hóa newline.
PASS: git diff --check cho tài liệu báo cáo/task diff; source mới không trailing whitespace.
NOT_VERIFIED: runtime trên Expo Go iPhone/Android; không chạy lại build/unit tests cho thay đổi xóa tag nhỏ. Không thêm dependencies hoặc dữ liệu test.

## 10. Issues & Risks
Không phát hiện vấn đề mới trong phạm vi. Giới hạn xác định đến điểm trả chiều về đã báo cáo trước vẫn giữ nguyên, không thay nghiệp vụ trong task này.

## 11. Reviewer Focus
Chỉ còn một tag trạng thái điểm danh ở header. Giờ điểm danh/xuống xe và lý do vắng không bị lược bỏ; hộp body ẩn khi không có metadata; actions và API giữ nguyên.

## 12. Suggested Next Step
Kiểm tra card thu gọn/mở rộng trên Expo Go iPhone.

## 13. Approval Status
Triển khai theo chỉ thị PO. WAITING FOR USER REVIEW / APPROVAL đối với kết quả. Chưa commit/push.
