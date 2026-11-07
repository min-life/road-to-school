# AI Review — Profile device notification Switch
## 1. Task Information
28/10/2026. Mobile/docs. IMPLEMENTATION. COMPLETED local, native UAT pending. Chưa commit/push.
## 2. Original Request
Gộp Thông báo thiết bị vào nhóm đổi ảnh/tên/mật khẩu/logout, trên Đăng xuất; dùng Switch ngang hàng label.
## 3. Approved Scope
Profile presentation và state binding cần thiết trong NotificationsProvider; giữ mọi pending work. Không API/backend/DB/dependencies/Git writes hoặc thay permissions/tokens để test.
## 4. Analysis & Decisions
Đọc AGENTS/docs/handoff/LATEST/push setup, Settings và NotificationsProvider. Provider trước chỉ có status string, không thể dùng chuỗi làm giá trị Switch. Bổ sung bool confirmed registration scoped user/role; Profile controlled Switch, không optimistic on. Wireframe row trên logout đã trình bày trước code, theo yêu cầu PO; chưa có nghiệm thu riêng.
## 5. Implementation Details
Settings.tsx thêm Switch trong actionList trước logout; xóa card/2 buttons/styles riêng. handlePushChange gọi enable/disable cũ, ref/state khóa pending, disabled lúc logout và Alert nếu throw. Notification context thêm pushEnabled từ enabledIdentity; set khi register thành công, clear khi unregister thành công/permission denied/identity change; reset status khi identity đổi. Provider expose field mới, không đổi request/storage/permission calls. Cập nhật push guide/handoffs/review, archive LATEST cũ; preview entry đã xóa khỏi repo.
## 6. Database Changes
None. Không DB/data/session mutation để test. Runtime user toggle vẫn dùng storage/token API cũ khi người dùng chủ động thao tác.
## 7. API & Swagger Changes
None. Register/unregister/permissions/SecureStore operations giữ nguyên method/args; native/Web/ExpoGo guard giữ nguyên. Chỉ thêm presentation state, không thêm endpoint/schema/dependency.
## 8. UI/UX Changes
Một hàng icon, label Thông báo thiết bị/status và Switch cùng nhóm tài khoản, trên logout. Native Switch màu brand, min row56, text flex/wrap và status live region. Enabled chỉ sau xác nhận, không dùng chuỗi status. State ban đầu false tới khi đăng ký xác nhận, reset theo identity. Lỗi/không hỗ trợ không tự bật true. Avatar/name/password/logout UI và role visibility giữ nguyên.
## 9. Verification & Testing
PASS npx --no-install tsc --noEmit tại mobile. PASS Expo export all iOS/Android/Web/server ngoài repo. PASS AST parity exact API/storage/permission call expressions so baseline và source placement: Switch trước logout, không còn card2buttons. Kiểm tra đầu lọc cả chained .then làm khác state callback, đã giới hạn lại đúng call leaf; không đổi API operations.
PASS IAB Chromium isolated actual JSX/handler320px: label/Switch cùng hàng trước logout, off→on→off với mock local async callbacks. Không có User/Student/Trip records, API hoặc permissions/tokens thật. Preview entry/server/tab đã dọn. PASS git diff --check.
NOT_VERIFIED: iPhone/Android/Safari/Chrome mobile, native enable/disable, permission rejection/config missing/SDK failure/concurrency/account-switch restore runtime và lớn nhất Dynamic Type. Không mutation hoặc login để test. Mobile không có lint script/config, không cài thêm.
## 10. Issues & Risks
Switch phản ánh đăng ký thành công trong provider hiện tại, ban đầu false trước xác nhận; không khẳng định đồng bộ tức thì mọi thay đổi quyền ngoài app. Web/Expo Go không hỗ trợ remote push nên guard/Alert cũ vẫn áp dụng. Pending guard ở Profile; không refactor registration engine hoặc sửa lỗi push ngoài scope. Native flow chưa nghiệm thu.
## 11. Reviewer Focus
Confirmed state per identity, logout reset, only success marks enabled, failure/unsupported leaves off, no string matching, busy ref prevents repeated toggles while mounted. Đủ account actions và row đúng vị trí. LATEST.diff chỉ Settings/context so snapshots task, không trộn pending source trước.
## 12. Suggested Next Step
PO kiểm tra hàng Switch mới ở Cá nhân trên iPhone Expo.
## 13. Approval Status
Implementation theo yêu cầu PO. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu. Chưa commit/push.
