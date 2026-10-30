# AI Review — Chuyển cài đặt thông báo thiết bị sang Profile
## 1. Task Information
28/10/2026. Mobile + docs. IMPLEMENTATION. COMPLETED local; chưa commit/push.
## 2. Original Request
Chuyển tính năng bật/tắt thông báo thiết bị từ trang Thông báo sang Profile.
## 3. Approved Scope
Di chuyển UI/status/handlers trong Mobile, giữ mọi pending work. Không sửa provider/API/DB/schema/dependencies hoặc thay preference/permission/token để test.
## 4. Analysis & Decisions
Đọc AGENTS/docs/handoff/LATEST và source NotificationsScreen, SettingsScreen, NotificationsProvider/push setup. Profile dùng chung các role Mobile nên đặt thẻ Thông báo thiết bị trước Thông tin ứng dụng. Giữ hai nút và status text, không tạo switch/state suy đoán quyền từ chuỗi. Bố cục đã trình bày trước code theo yêu cầu PO; chưa có nghiệm thu UI riêng.
## 5. Implementation Details
Sửa mobile/app/notifications.tsx: bỏ UI push, destructured values và style push không dùng. Sửa mobile/app/(tabs)/settings.tsx: dùng enablePush/disablePush/pushStatus cùng provider, thêm card và hai button min48/flexWrap/accessibility label. Giữ chính xác callback cũ gồm catch Alert khi tắt lỗi. Cập nhật notifications-push-setup, handoffs, archive/report/diff.
## 6. Database Changes
None. Không DB/session/business records hoặc token mutation để test.
## 7. API & Swagger Changes
None. Không sửa NotificationsProvider, services hoặc endpoint. Đăng ký/hủy token, preference theo tài khoản/thiết bị, guards Web/Expo Go/native và permission flow cũ không đổi.
## 8. UI/UX Changes
Profile: thẻ Thông báo thiết bị, status hiện có, Bật và Tắt trên thiết bị trước Thông tin ứng dụng, có thể cuộn và wrap. Inbox: giữ list/filter/read-all/pagination/target opening; không còn push settings. Không đụng avatar, logout, name/password modals.
## 9. Verification & Testing
PASS npx --no-install tsc --noEmit tại mobile. PASS Expo export all iOS/Android/Web/server ngoài repo. PASS AST onPress handler parity với snapshot trước task; không còn enablePush/disablePush/pushStatus/styles.push trong inbox. PASS git diff --check. Không viết tests mirror thay đổi vị trí UI nhỏ.
Lệnh tsc đầu gọi nhầm root bị missing package, đã chạy lại đúng mobile PASS; không cài package. NOT_VERIFIED: layout/runtime Profile trên iPhone/Android/Safari/Chrome mobile và push permission/token thật; không bấm bật/tắt, gửi push, unregister hoặc sửa preference để test. Mobile không có lint script/config, không cài thêm.
## 10. Issues & Risks
Các giới hạn push trên Expo Go/Web/config credentials vẫn như trước. Chưa kiểm chứng native permission/status runtime sau di chuyển; handler/provider không đổi. Không tự mở rộng thành sửa cơ chế push.
## 11. Reviewer Focus
Hai nút và trạng thái chỉ xuất hiện ở Profile; provider giữ nguồn trạng thái duy nhất; callback/catch lỗi không đổi; các chức năng inbox/profile còn đủ. LATEST.diff chỉ hai source files theo snapshot task, không trộn pending changes cũ.
## 12. Suggested Next Step
PO mở Cá nhân trên iPhone Expo để kiểm tra vị trí mới.
## 13. Approval Status
PO yêu cầu triển khai. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu; chưa commit/push.
