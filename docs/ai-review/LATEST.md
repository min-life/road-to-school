# AI Review — Splash dành riêng cho phụ huynh

## 1. Task Information

13/11/2026, Asia/Saigon. Scope Mobile và Documentation. Type Implementation. Status COMPLETED. Nhánh dongnnp/mobile/refactor-ui, baseline 0235765. Working tree sạch trước task.

PO yêu cầu commit phần đã hoàn thành trong lượt tiếp theo ngày 13/11/2026. Đã rà phạm vi 12 file source/assets/docs của splash, dùng thông điệp `feat(mobile): add dedicated parent splash on login and session restore`.

## 2. Original Request

PO cung cấp SVG phụ huynh và yêu cầu implement splash này khi người dùng là phụ huynh vào app.

## 3. Approved Scope

Dùng mẫu SVG để cập nhật presentation splash PARENT và nối với luồng mở app sau xác thực phiên. Đọc RootNavigation/AuthProvider/RoleSplash và components/theme hiện có trước triển khai. Kiểm tra tĩnh, build và isolated preview, cập nhật docs theo implementation thực tế. Task thực hiện local.

## 4. Analysis & Decisions

Trước task, ParentLoginSplash dùng BrandLogo chung, RoleSplash xuất hiện sau manual login với duration mặc định 1200 ms. restoreSession xác thực user nhưng chưa đặt splashRole. User chỉ xác định được sau GET /auth/me, nên giai đoạn chờ user dùng splash chung, sau xác thực PARENT thành công dùng splash theo vai trò.

Chọn hình phụ huynh căn giữa trên nền kem, frame vuông tối đa 240 dp, tiếp nối message/thanh chuyển màn có sẵn. Mẫu và yêu cầu implement trực tiếp của PO là cơ sở trình bày, giữ bố cục loading hiện có. Các ký tự escape trong SVG chat được chuẩn hóa thành XML, giữ viewBox/hai path/fill-rule/hai màu. PNG xuất bằng sharp đã cài trong web/node_modules để render bằng React Native Image local.

Skill ui-ux-pro-max được dùng cho kiểm tra kích thước ảnh và responsive. Query safe area responsive image với stack react-native trả hướng dẫn xác định kích thước và responsive phù hợp. Tái sử dụng Image/dependencies hiện có.

## 5. Implementation Details

- [ParentLoginSplash](../../mobile/components/parent/login-splash.tsx) render ảnh phụ huynh trong frame vuông width 100%, maxWidth 240, Image contain với accessibility label.
- [AppLoadingSplash](../../mobile/components/app-loading-splash.tsx) thêm prop illustration tùy chọn, null/undefined dùng BrandLogo mặc định, chia sẻ safe area/cuộn/message/loading.
- [AuthProvider](../../mobile/context/auth-context.tsx) thêm điều kiện currentUser.role PARENT sau getMe thành công trong restoreSession để đặt splashRole PARENT. Luồng kết thúc dùng onSplashFinish hiện có.
- Thêm [SVG](../../mobile/assets/images/brand/parent-splash.svg) và [PNG](../../mobile/assets/images/brand/parent-splash.png), 720 × 720, alpha, 35.573 bytes.
- Thêm [spec splash](../architecture/mobile-parent-splash.md), cập nhật [UI status](../architecture/mobile-ui-implementation-status.md) và [bản đồ flow](../architecture/mobile-screen-business-flows.md).
- Review/diff trước được lưu nguyên bản trong history/2026-11-13-before-parent-role-splash.md và .diff. Review trước có các phần được gộp từ lịch sử merge, bản archive giữ toàn bộ nội dung đó. LATEST.diff chỉ gồm các file source/assets/docs của task này.

## 6. Database Changes

None.

## 7. API & Swagger Changes

None. Luồng khôi phục phiên tiếp tục dùng GET /auth/me hiện có. Verification không gọi API hoặc thực thi auth mutation.

## 8. UI/UX Changes

Ảnh phụ huynh trên nền colors.background, tối đa 240 dp, message Đang mở trang chủ... và thanh vàng 180 × 4. SafeAreaView/ScrollView/padding 24/frame max 320 từ component hiện có. Hình tĩnh, thanh dùng timer RoleSplash 1200 ms. Accessible image label và progressbar/busy.

Đăng nhập thủ công PARENT và khôi phục phiên PARENT thành công đi qua cùng presentation. Trước khi xác định role dùng splash chung. registerVerify tiếp tục quy tắc bỏ qua role splash sau tự đăng nhập đăng ký. Resume foreground của cùng instance không gắn thêm splash.

## 9. Verification & Testing

- PASS mobile `npx --no-install tsc --noEmit`, exit 0.
- PASS `npx --no-install expo export --platform all --output-dir <TEMP>/rts-parent-splash-export-20261113`, exit 0, tạo iOS/Android/Web/server bundles và bundle PNG mới.
- PASS XML parse, viewBox gốc, hai path, hai màu. PNG byte-identical với lần rasterize lại trực tiếp từ SVG.
- PASS 562 protected source hashes so baseline, gồm RoleSplash, RootNavigation, API/web, package/lockfiles. AuthProvider chỉ thêm ba dòng điều kiện PARENT trong restoreSession.
- PASS Chromium IAB isolated SSR của các component thực, React Native Web và SafeAreaView.web. Portrait 320 × 568, 375 × 812, 390 × 844 không tràn ngang, ảnh natural 720 × 720/frame 240 × 240. Ở 320 px, progress nằm trong vùng top 405/bottom 445. Preview cấp insets 44/34.
- PASS landscape 568 × 320, insets 0, ScrollView clientHeight 320/scrollHeight 360, có khoảng cuộn cho nội dung; scrollWidth 568.
- PASS splash chung ở 1440 × 900 render BrandLogo hai ảnh và spinner, DRIVER/BUS_ATTENDANT ở 320 × 568 đúng label theo role, không render ảnh phụ huynh và không tràn ngang.
- PASS `git diff --check` source/docs, kiểm tra whitespace file mới và 7 links của spec mới. LATEST.diff có text patch và binary PNG patch phục vụ review.
- NOT_VERIFIED native iPhone Expo Go/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type, timer/route transitions và khôi phục/đăng nhập thật trên thiết bị. SSR giữ progress ở giá trị đầu, xác minh presentation và branch role. Source kiểm tra wiring, chưa chứng nhận auth runtime.
- Mobile package.json chưa có lint script. Các ca cần tạo bản ghi/phiên hoặc mutation để UAT phải theo dữ liệu/quyền được PO cấp, BLOCKED_BY_TEST_DATA_POLICY khi thiếu quyền đó.

Ảnh preview tại TEMP/rts-parent-splash-375.png. Preview server đã dừng, tab đã đóng và viewport override đã reset. Output build/preview nằm ngoài repo.

## 10. Issues & Risks

Vai trò chỉ biết sau xác thực phiên, splash phụ huynh xuất hiện từ thời điểm đó. Native launch screen trước JavaScript vẫn theo Expo app config. Thời gian 1.200 ms biểu diễn chuyển màn, chưa phản ánh phần trăm tải dữ liệu Home. Native safe area và auth restore thực cần kiểm tra trên tài khoản/thiết bị của PO.

## 11. Reviewer Focus

Kiểm tra exact SVG path/viewBox và asset PNG, prop illustration fallback, giới hạn kích thước theo width, label/a11y và cuộn màn thấp. Rà điều kiện PARENT nằm sau getMe thành công, không suy đoán role từ token cũ. Xác nhận RoleSplash giữ timer/callback, root giữ navigation guard và registerVerify giữ quy tắc hiện có. Đối chiếu các kết quả preview với giới hạn SSR/native đã ghi.

## 12. Suggested Next Step

Kiểm tra trên Expo Go iPhone bằng phiên phụ huynh được cấp, gồm mở lại app và đăng nhập thủ công để nghiệm thu splash và chuyển vào Home.

## 13. Approval Status

Implement và commit local theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu trên thiết bị.
