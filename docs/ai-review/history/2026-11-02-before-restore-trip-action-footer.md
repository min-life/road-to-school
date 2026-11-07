# AI Review — Sửa tên nhân sự xuống dòng cạnh nhãn Bạn

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION layout fix. Source hoàn tất; native NOT_VERIFIED. Bảo toàn pending work.

## 2. Original Request
PO chỉ ra chữ Xế của Thằng Tài Văn Xế bị xuống dòng trong card Home.

## 3. Approved Scope
Hàng tên tài xế/phụ xe và nhãn Bạn, không đổi dữ liệu hoặc chức năng.

## 4. Analysis & Decisions
nameRow dùng flexWrap và Text chỉ flexShrink nên tên không được cấp toàn bộ khoảng còn lại cạnh badge. Dùng row không wrap, tên flex1/minWidth0; badge không shrink, căn đầu dòng. Tên dài vẫn được wrap tự nhiên trong Text, không ellipsis/cắt chữ.

## 5. Implementation Details
mobile/components/staff/staff-trip-card.tsx: áp personName cho hai tên, sửa nameRow/selfBadge. Không đổi ParentTripCard/Home caller. LATEST.diff riêng một source so với baseline; archive trước history/2026-11-02-before-staff-name-row.md/.diff; cập nhật architecture note.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Không API calls/mutations hoặc business records tự tạo.

## 8. UI/UX Changes
Tên chiếm phần rộng còn lại, nhãn Bạn ở bên phải và không ép tên co quá mức. Áp dụng cả Driver và Bus Attendant. Chữ/font/callback giữ nguyên.

## 9. Verification & Testing
PASS TypeScript --noEmit exit0.
PASS RN-web preview dùng chính StyleSheet mới và chuỗi tên từ ảnh: tại390/320px tên cao22px bằng lineHeight22px, tức một dòng; badge vẫn hiện. Preview chỉ display text/layout, không Trip/User/Student record hoặc mock API.
PASS source onPress/disabled parity; không numberOfLines. PASS git diff --check. Preview tạm đã xóa, tab đóng, viewport reset; Metro giữ nguyên.
Không thêm tests mirror style hoặc export lại cho thay đổi nhỏ. Native/full card/font scaling NOT_VERIFIED.

## 10. Issues & Risks
Tên dài hơn hoặc cỡ chữ lớn vẫn có thể xuống dòng tự nhiên để giữ đầy đủ tên. Không commit/push/dependency mới.

## 11. Reviewer Focus
Tên flex1, badge flexShrink0; không đổi fullName binding hoặc cắt tên. Pending shared-card/schedule changes không bị ghi đè.

## 12. Suggested Next Step
PO reload Home để xem lại hàng tên trên thiết bị.

## 13. Approval Status
PO yêu cầu sửa trực tiếp; source/checks hoàn tất, chờ native acceptance.
