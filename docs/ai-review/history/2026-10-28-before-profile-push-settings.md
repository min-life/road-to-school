# AI Review — Parent post-login loading
## 1. Task Information
28/10/2026. Mobile UI/docs. IMPLEMENTATION, COMPLETED local. Chưa commit/push.
## 2. Original Request
Restyle loading phụ huynh xuất hiện sau đăng nhập; tìm và dùng ảnh V1 phù hợp.
## 3. Approved Scope
Chỉ presentation PARENT trong RoleSplash; không đổi auth/timer/navigation/API/DB/dependencies. Bảo toàn pending work trước task. V1 chỉ đọc.
## 4. Analysis & Decisions
Đọc AGENTS/docs/handoff/LATEST, UI status; xác định RoleSplash1200ms. Xem ảnh V1 student-add, driver-welcome và onboarding; chọn slide2 mẹ/con/xe buýt đã có ở V2. Dùng ui-ux-pro-max visual/accessibility guidelines đã đọc trong session. Wireframe ảnh + title + loading/bar được trình bày trước code; thực hiện theo yêu cầu PO, chưa nghiệm thu UI riêng.
## 5. Implementation Details
Thêm components/parent/login-splash.tsx; RoleSplash.tsx chỉ import và return view mới cho PARENT, chuyển barWidth đang có. Tái dùng assets/images/onboarding/slide2.jpg, không copy/chỉnh asset hoặc thêm package. Cập nhật UI status, CURRENT_STATE, CODEX_HANDOFF và archive/review/diff. Preview entry tạm đã xóa, outputs ngoài repo.
## 6. Database Changes
None. Không tạo dữ liệu/session hoặc đọc/ghi DB.
## 7. API & Swagger Changes
None. Auth context/root guard/navigation không sửa, không login/POST để test.
## 8. UI/UX Changes
Nền kem, card trắng bo28 shadow, brand, ảnh mẹ/con trước xe, Phụ huynh học sinh, spinner/Đang mở trang chủ, bar vàng. Ảnh contain cao theo viewport, frame max420, safe area/scroll. Không % tải giả hoặc action mới. Các role khác giữ JSX/style cũ; bar/duration/callback không đổi.
## 9. Verification & Testing
PASS npx --no-install tsc --noEmit tại mobile. PASS Expo export all iOS/Android/Web/server ngoài repo. PASS checksum V1/V2 slide2 trùng. PASS AST useEffect/timer/onFinish/default1200 và non-parent JSX so HEAD sau chuẩn hóa EOL; kiểm tra chuỗi ban đầu khác do CRLF/LF, không phải đổi logic.
PASS Chromium IAB isolated ParentLoginSplash320x568/390x844: ảnh loaded natural768x580, no horizontal overflow, heading nằm trong viewport. Preview progress45% cố định để xem UI, không có fake business records/API hoặc login. Preview/tab/server đã dọn.
PASS git diff --check. NOT_VERIFIED iPhone/Android/Safari iOS/Chrome Android, auth runtime1200ms thực tế, screen reader/largest Dynamic Type. Mobile không có lint script/config; không cài thêm. Không viết tests mirror style.
## 10. Issues & Risks
Browser preview không chứng nhận native/login transition; spinner và bar không phản ánh tiến độ API, vẫn là role transition timed như trước. Ảnh tái sử dụng từ onboarding. Những loading khác/Home data không thuộc scope.
## 11. Reviewer Focus
PARENT-only branch, không thay duration/onFinish/auth; image bundling/responsive/safe area; phân biệt preview progress với runtime. LATEST.diff chỉ2 source files task này; không lẫn pending changes cũ.
## 12. Suggested Next Step
PO đăng nhập lại trên iPhone Expo để nghiệm thu loading.
## 13. Approval Status
Implementation theo yêu cầu PO. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu. Không commit/push.
