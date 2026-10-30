# AI Review — Bỏ nút Làm mới ở Trang chủ phụ huynh

## 1. Task Information
29/10/2026, Asia/Saigon. IMPLEMENTATION Mobile UI, thay đổi nhỏ theo yêu cầu cụ thể. Hoàn thành local, chưa commit/push.

## 2. Original Request
PO: Bỏ Làm mới ở trang Trang chủ của phụ huynh.

## 3. Approved Scope
Bỏ nút Làm mới trong tiện ích PARENT ở cả trạng thái mở rộng/thu gọn. Giữ các nút khác và cơ chế tải dữ liệu. Không backend/DB/env/dependency hoặc Trang chủ nhân sự. Bảo toàn toàn bộ uncommitted work trước task.

## 4. Analysis & Decisions
Đọc AGENTS và các docs bắt buộc theo thứ tự, đối chiếu tài liệu Parent Home và source. ParentHomeScrollView dùng một danh sách actions chung cho expanded/compact, nên bỏ một entry là đủ cả hai trạng thái. Bố cục sau thay đổi: Báo nghỉ | Đổi điểm, các ô chia đều flex hiện có. Đây là yêu cầu bỏ một nút cụ thể, không thiết kế màn hình hoặc refactor layout mới.

## 5. Implementation Details
- [home-scroll-view.tsx](../../mobile/components/parent/home-scroll-view.tsx): bỏ action Làm mới và prop onRefreshAction khỏi type/destructuring.
- [index.tsx](../../mobile/app/(tabs)/index.tsx): bỏ truyền onRefreshAction ở nhánh PARENT.
- [Tài liệu Parent Home](../architecture/mobile-parent-home-ui.md): cập nhật hai nút, component props, hành vi giữ lại và kết quả kiểm tra.
- Báo cáo OTP trước task được lưu [history](history/2026-10-29-before-remove-parent-home-refresh.md); diff hiện tại lấy snapshot ngay đầu task, không gộp các task trước.

## 6. Database Changes
Không có, không đọc/ghi DB hoặc sinh dữ liệu test.

## 7. API & Swagger Changes
Không có. Handler fetch, onRefresh, polling8000ms và RefreshControl giữ nguyên. Swagger không thuộc phạm vi thay đổi.

## 8. UI/UX Changes
Tiện ích chỉ còn Báo nghỉ và Đổi điểm, cả mở rộng/thu gọn; actionSlot flex1 tự chia đều khoảng trống. Giữ avatar, chuông, safe area, animation, hit target và route của hai nút. Kéo xuống vẫn làm mới được; nút refresh nhánh nhân sự giữ nguyên.

## 9. Verification & Testing
- PASS `npx --no-install tsc --noEmit` tại mobile, exit0.
- PASS đối chiếu source với snapshot đầu task: chỉ có các phép bỏ entry/prop/truyền prop dự kiến; không đổi handler hoặc phần JSX khác.
- PASS kiểm tra source còn đủ hai actions, RefreshControl và polling8000ms. Hai trạng thái cùng map một actions array.
- PASS kiểm tra diff/whitespace, không gộp thay đổi local trước đó.
- NOT_VERIFIED giao diện/pull-to-refresh trên Expo Go iPhone/Android và E2E có xác thực trong task này. Không chạy browser preview giả dữ liệu, không gọi mutation hoặc tạo records để test.
- Không chạy lại export/build hoặc thêm test suite cho thay đổi bỏ nút nhỏ này; Mobile không có script lint, không cài thêm công cụ.

## 10. Issues & Risks
Không có lỗi TypeScript được ghi nhận. Chưa nghiệm thu render/thao tác trên thiết bị thật. Các kết quả browser/build của task OTP trước không được coi là kiểm chứng runtime cho task này.

## 11. Reviewer Focus
Xem [diff riêng của task](LATEST.diff): không còn onRefreshAction/entry Làm mới ở component PARENT; vẫn có RefreshControl, onRefresh, polling và nút refresh nhân sự. Các entry trước trong tài liệu Parent Home được đánh dấu là lịch sử.

## 12. Suggested Next Step
PO mở Trang chủ trên Expo Go iPhone, kiểm tra tiện ích khi mở rộng và cuộn thu gọn chỉ còn Báo nghỉ/Đổi điểm.

## 13. Approval Status
IMPLEMENTED — WAITING FOR USER REVIEW. Chưa commit/push; dừng sau task.
