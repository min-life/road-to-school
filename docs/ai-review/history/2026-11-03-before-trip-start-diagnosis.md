# AI Review — Attendance button order and emphasis

## 1. Task Information
03/11/2026 Asia/Saigon. Scope: Mobile / Documentation. Type: Fix. Status: COMPLETED.

## 2. Original Request
Hoán đổi vị trí Có mặt/Vắng mặt; Có mặt đậm hơn và Vắng mặt nhạt hơn để phân biệt.

## 3. Approved Scope
Chỉ cặp nút điểm danh học sinh chưa điểm danh trong màn hình chuyến xe.

## 4. Analysis & Decisions
Đặt Vắng mặt bên trái, Có mặt bên phải bằng thứ tự JSX. Có mặt dùng vàng thương hiệu colors.primary (#FFCB56), Vắng mặt chuyển sang colors.navigationHighlight (#FFF3D2), tạo phân cấp đậm/nhạt bằng token có sẵn. Giữ chữ tối dễ đọc. Không thay điều kiện disabled hoặc opacity khi chuyến chưa cho phép điểm danh.

## 5. Implementation Details
mobile/app/trip/[id].tsx: đảo nguyên vẹn hai subtree TouchableOpacity và đổi nền actionBtnAbsent. Các handlers handleMarkPresent/handleOpenAbsenceModal giữ nguyên gắn với đúng nhãn; không sửa callers, exports, fixtures, config.
Báo cáo/diff cập nhật, bản trước lưu history/2026-11-03-before-attendance-buttons-fix.md / .diff. Bảo toàn pending changes. Không dependencies/commit/push.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None.

## 8. UI/UX Changes
Vắng mặt trái, vàng nhạt; Có mặt phải, vàng đậm tương đối. Giữ icon X/check, chữ, kích thước và bố cục ngang hiện có.

## 9. Verification & Testing
PASS: assertions xác nhận đúng cặp nút và token được thay đúng một lần, giữ nguyên subtree handler/disabled.
PASS: node node_modules/typescript/bin/tsc --noEmit tại mobile, exit 0.
NOT_VERIFIED: visual trên Android/iOS thật. Không gọi API hoặc tạo dữ liệu test.

## 10. Issues & Risks
Nút disabled vẫn có opacity 0.5 theo quyền/trạng thái chuyến. Không thay logic cho phép điểm danh. Chưa xác nhận màu thực tế trên thiết bị.

## 11. Reviewer Focus
Kiểm tra Vắng mặt ở trái vẫn gọi hộp lý do vắng, Có mặt ở phải vẫn gọi xác nhận có mặt; cả hai giữ disabled={!canBoard}.

## 12. Suggested Next Step
Reload màn hình điểm danh để kiểm tra thứ tự và màu trên thiết bị.

## 13. Approval Status
Người dùng yêu cầu trực tiếp. WAITING FOR USER REVIEW / APPROVAL kết quả bàn giao.
