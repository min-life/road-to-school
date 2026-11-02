# AI Review — Icon vector cho thông tin xe Staff

## 1. Task Information
01/11/2026. Mobile Trip detail icon follow-up. Source COMPLETED; native NOT_VERIFIED.

## 2. Original Request
Thay icon PNG bằng icon Parent.

## 3. Approved Scope
Thẻ thông tin trong sheet map Driver/Bus Attendant đang được chỉnh. Giữ Parent hiện tại theo chỉ thị đã chốt; không mở rộng sang splash, map markers hoặc Home.

## 4. Analysis & Decisions
Icon xe INFO còn require Bus.png trong JSX dùng chung cả ba vai trò. Người/trường/tab đã dùng Ionicons. Chọn bus-outline màu #D97706 như màn Parent student-detail/route-detail; chỉ Staff dùng vector, Parent giữ Image cũ.

## 5. Implementation Details
mobile/app/trip/[id].tsx: điều kiện isDriverOrAttendant hiển thị Ionicons bus-outline24px vàng; nhánh còn lại giữ nguyên Image24px. Không thêm helper/dependency hoặc xóa asset còn caller. LATEST.diff riêng từ working baseline task, archive báo cáo trước tại history/2026-11-01-before-staff-info-icon.md/.diff. Cập nhật ghi chú architecture.

## 6. Database Changes
None. Không tạo dữ liệu nghiệp vụ hoặc gọi DB.

## 7. API & Swagger Changes
None. Không đổi hợp đồng/quyền/handlers.

## 8. UI/UX Changes
Xe Staff là icon nét vàng, cùng bộ Ionicons đang dùng ở Parent; các icon người/trường/tab giữ nguyên vì đã vector. Giao diện Parent giữ nguyên. Đây là thay icon nhỏ trong bố cục đã duyệt, không refactor màn hình.

## 9. Verification & Testing
PASS TypeScript app --noEmit exit0.
PASS TypeScript AST/source assertions: Staff là bus-outline24px #D97706; nhánh Parent Image giống baseline; phục hồi riêng biểu thức icon thu được source giống baseline hoàn toàn, chứng minh không thay tab/content/operation khác.
Không thêm test phản chiếu icon/style, không chạy lại export cho thay đổi trình bày nhỏ này. Không coi kết quả export/preview task trước là verification mới. Native và authenticated Trip NOT_VERIFIED; integration không thực hiện do thiếu session/dữ liệu được cấp (BLOCKED_BY_TEST_DATA_POLICY). Không cài package, tạo record, commit/push.

## 10. Issues & Risks
Chưa kiểm tra nét vẽ icon trên Android/iOS. Asset Bus.png vẫn cần cho Parent và RoleSplash nên không xóa. Phạm vi không bao gồm splash/brand assets.

## 11. Reviewer Focus
Chỉ Staff đổi sang vector; Parent Image còn nguyên; các icon khác vốn đã dùng vector.

## 12. Suggested Next Step
PO reload app để xem icon xe trong tab Thông tin Driver/Bus Attendant.

## 13. Approval Status
PO yêu cầu trực tiếp thực hiện. Source hoàn tất, chờ nghiệm thu native.
