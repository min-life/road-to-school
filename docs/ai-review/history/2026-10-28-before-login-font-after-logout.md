# AI Review — Đồng bộ avatar Trang chủ phụ huynh với Cá nhân

## 1. Task Information
28/10/2026, Asia/Saigon. Mobile UI/Documentation. IMPLEMENTATION. COMPLETED local; native UAT pending. Chưa commit/push.

## 2. Original Request
Đồng bộ avatar ở Trang chủ phụ huynh với avatar ở Cá nhân.

## 3. Approved Scope
Chung nguồn hiển thị/style/fallback avatar giữa hai màn; giữ kích thước từng vị trí, animation header và chức năng đổi ảnh. Không backend/API/DB/auth/provider/dependency/asset/Git writes. Giữ mọi pending work khác.

## 4. Analysis & Decisions
Đọc quy tắc/business/handoffs/LATEST/Parent Home UI và code Home/Profile/Auth. Hai màn vốn đã dùng user.avatarUrl, Home nhận props qua HomeScreen và Profile đọc useAuth. Khác biệt thực tế là Home icon person nền xanh, Profile chữ đầu nền vàng; Home có state lỗi riêng. Dùng shared presentation component để không lệch fallback/style về sau. Không thêm fetch/focus refresh hoặc sửa upload flow vì AuthContext đã cập nhật cả hai. Bố cục giữ nguyên, hướng đồng bộ component/fallback đã trình bày trước code theo yêu cầu PO.

## 5. Implementation Details
- [user-avatar.tsx](../../mobile/components/user-avatar.tsx) mới: props avatarUrl/fullName/size/onLoad, ảnh cover hoặc chữ đầu màu thương hiệu; AvatarContent key theo URL reset lỗi, không effect/API/context/storage.
- [parent/home-scroll-view.tsx](../../mobile/components/parent/home-scroll-view.tsx): thay ảnh/icon/state lỗi riêng bằng UserAvatar48 trong Animated.View cũ; bỏ import/styles thừa, giữ collapse/scroll/utility handlers.
- [settings.tsx](../../mobile/app/(tabs)/settings.tsx): UserAvatar72 thay JSX ảnh/fallback riêng, giữ onLoad diagnostic; bỏ styles cũ, thêm label/role cho nút đổi ảnh. Giữ camera badge/upload disabled/handler và các phần tài khoản/thông báo/logout.
- Cập nhật Parent Home UI, UI implementation status, CURRENT_STATE, CODEX_HANDOFF. Review trước lưu history/2026-10-28-before-parent-avatar-sync.md và .diff. LATEST.diff dùng snapshot đầu task, không gom thay đổi Phase2 trước đó.

## 6. Database Changes
None. Không tạo/sửa dữ liệu hoặc đổi ảnh thật để kiểm thử.

## 7. API & Swagger Changes
None. Upload API, setUser/refreshUser, ImagePicker, push/logout calls và handler upload giữ nguyên. HomeScreen/AuthContext byte-identical với đầu task.

## 8. UI/UX Changes
Cùng ảnh/URL, circle nền colors.primary, chữ đầu foreground weight800 theo Profile cũ. Không ảnh hoặc tên phụ huynh giả. Giữ Home48px, compact scale0.8 và Profile72px, chữ theo size28/72; giữ camera badge và nhấn chọn ảnh. Thiếu tên dùng U như Profile cũ. Ảnh lỗi về chữ đầu ở cả hai, URL mới tạo content mới để không giữ trạng thái lỗi cũ. Không ảnh hưởng safe area/tab/keyboard/scroll hoặc thêm thao tác mới. Profile các role khác dùng cùng component, kiểu hiển thị72px như cũ và có fallback lỗi ảnh.

## 9. Verification & Testing
PASS npx --no-install tsc --noEmit; Expo export --platform all iOS/Android/Web/server; git diff --check và task whitespace. Không có lint script, không cài tooling mới.

PASS static parity: HomeScreen và AuthContext byte-identical; full handlePickAvatar không đổi; Profile API/context/push/logout calls giữ nguyên; Home declarations của offset/row/label/viewport/compact/heights/interpolation/fade/actions giữ nguyên.

Chromium IAB isolated preview với ParentHomeScrollView/UserAvatar thật,320/390px: fallback cùng rgb(255,203,86), chữ rgb(30,41,59)/weight800, size48/72. Ảnh A local cùng URL tải natural528px ở cả hai; URI404 về fallback2; chuyển ảnh B natural1320px phục hồi cả hai; bỏ URL về fallback2. Compact avatar đo38.4px, không tràn ngang320. Preview dùng logo PNG local đã có, không tạo User/Student/Trip, fake API response hoặc upload ảnh. Đây là kiểm tra presentation/prop change, không chứng nhận đổi ảnh tài khoản thật. Entry/server/tab/viewport tạm đã dọn.

NOT_VERIFIED Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type và upload/đổi ảnh thực tế trên tài khoản; không gọi mutation theo Test Data Policy. Muốn nghiệm thu upload cần PO chủ động chọn ảnh trên tài khoản được phép; không tự thay dữ liệu hồ sơ để test.

## 10. Issues & Risks
Không phát hiện lỗi typecheck/export. Native rendering/cache và upload runtime còn cần nghiệm thu thiết bị. Không thêm retry cho cùng URL đã lỗi; reset khi URL đổi hoặc component remount. AuthContext vẫn là nguồn tài khoản duy nhất.

## 11. Reviewer Focus
Đảm bảo cả hai nhận cùng URL/tên từ user, Profile vẫn cập nhật context sau upload, UserAvatar không sở hữu bản sao user. Kiểm tra fallback/crop/kích thước/camera badge và reset khi URL đổi. Giữ nguyên animation/utility/refresh, toàn bộ handler upload/push/logout và pending code khác.

## 12. Suggested Next Step
PO đổi ảnh ở Cá nhân rồi quay về Trang chủ trên iPhone để nghiệm thu đồng bộ thực tế.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Triển khai local theo yêu cầu PO; chưa commit/push. Dừng sau task.
