# Splash dành cho phụ huynh

Cập nhật ngày 13/11/2026. PO cung cấp SVG phụ huynh và yêu cầu dùng khi tài khoản PARENT vào app. Bố cục dùng hình này căn giữa trên nền kem, tiếp nối dòng tải và thanh chuyển màn hiện có.

## Hình ảnh và bố cục

- [SVG gốc](../../mobile/assets/images/brand/parent-splash.svg) giữ viewBox `94.6 99.7 1048.4 1048.4`, hai path, fill-rule evenodd và hai màu `#0C3159`, `#FFCA34` từ mẫu. Các ký tự escape của văn bản gửi trong chat được chuyển thành XML hợp lệ.
- [PNG dùng trong app](../../mobile/assets/images/brand/parent-splash.png) xuất trực tiếp từ SVG bằng sharp sẵn có trong web/node_modules, 720 × 720, nền trong suốt, 35.573 bytes. Ảnh được bundle local bằng require, dùng được trên iOS/Android/Web.
- [ParentLoginSplash](../../mobile/components/parent/login-splash.tsx) đặt ảnh trong frame vuông rộng tối đa 240 dp, co theo chiều rộng khả dụng, resizeMode contain. Image lấp frame với width/height 100% để kích thước intrinsic của PNG không làm tăng chiều cao trên Web.
- Nền lấy colors.background. AppLoadingSplash cung cấp SafeAreaView, ScrollView, padding 24, frame tối đa 320, gap 32, dòng “Đang mở trang chủ...” và thanh vàng 180 × 4. Màn thấp cuộn theo nội dung. Ảnh có accessibility label “RoadToSchool dành cho phụ huynh”, vùng tải có role progressbar và busy.
- Hình giữ tĩnh. Thanh tiến trình biểu diễn thời gian chuyển màn 1.200 ms của RoleSplash.

## Điều kiện xuất hiện

| Lối vào | Hành vi |
| --- | --- |
| Đăng nhập thủ công thành công với PARENT | AuthProvider đặt splashRole từ user trả về, RootNavigation render RoleSplash, nhánh PARENT dùng hình mới |
| Khởi động lại app có token, GET /auth/me xác thực được PARENT | restoreSession đặt user và splashRole PARENT, kết thúc loading rồi render cùng splash theo vai trò |
| Đang đọc token hoặc đang chờ xác định user | RootNavigation hiển thị AppLoadingSplash với BrandLogo mặc định |
| Khôi phục phiên thiếu token, hết hạn hoặc lỗi | Tiếp tục nhánh onboarding/login hoặc xử lý mạng/phiên hiện có. Chỉ response xác thực PARENT thành công kích hoạt hình phụ huynh |
| DRIVER/BUS_ATTENDANT | RoleSplash tiếp tục chọn presentation theo role |
| Tự đăng nhập sau xác minh đăng ký | registerVerify dùng quy tắc bỏ qua role splash đã có |
| Trở lại foreground của cùng instance app | AuthProvider đang mount tiếp tục phiên hiện tại. Đây là splash khởi động/đăng nhập, không gắn thêm vào AppState resume |

RoleSplash sở hữu Animated.Value, durationMs mặc định 1200, callback onFinish. onSplashFinish của AuthProvider xóa splashRole. RootNavigation giữ guard chờ splash kết thúc trước điều hướng và navigation reopen. ParentLoginSplash chỉ nhận progressWidth để trình bày.

Nguồn điều kiện và vòng đời nằm ở [AuthProvider](../../mobile/context/auth-context.tsx), [RootNavigation](../../mobile/app/_layout.tsx), [RoleSplash](../../mobile/components/RoleSplash.tsx).

## Component dùng chung

[AppLoadingSplash](../../mobile/components/app-loading-splash.tsx) có các props sau.

| Prop | Kiểu | Cách dùng |
| --- | --- | --- |
| message | string, tùy chọn | Mặc định “Đang tải...”, dùng cho text và accessibility label |
| progressWidth | Animated.AnimatedInterpolation&lt;string&gt;, tùy chọn | Có giá trị thì render thanh tiến trình, thiếu thì render spinner |
| illustration | ReactNode, tùy chọn | Render hình được truyền vào. Khi null/undefined, dùng BrandLogo mặc định |

Caller muốn dùng hình theo role truyền illustration và để RoleSplash/AuthProvider quản lý thời điểm hiển thị. Hình được truyền cần tự có tỷ lệ/kích thước giới hạn và accessibility label phù hợp.

## Kiểm chứng ngày 13/11/2026

| Hạng mục | Kết quả |
| --- | --- |
| Mobile npx --no-install tsc --noEmit | PASS |
| Expo export --platform all | PASS iOS, Android, Web và server, PNG có trong danh sách assets |
| Chromium IAB preview source component thật | PASS 320 × 568, 375 × 812, 390 × 844. Ảnh tải natural 720 × 720, frame 240 × 240, không tràn ngang |
| Landscape 568 × 320 | PASS chiều ngang, ScrollView clientHeight 320/scrollHeight 360, có vùng cuộn cho nội dung |
| Splash chung 1440 × 900 | PASS BrandLogo hai ảnh tải đúng kích thước và spinner có label Đang tải... |
| DRIVER/BUS_ATTENDANT ở 320 × 568 | PASS nhãn theo role, không render ảnh phụ huynh, không tràn ngang |
| Phân nhánh restore/session và timer | Kiểm tra source. RoleSplash/RootNavigation giữ nội dung, auth restore bổ sung điều kiện PARENT sau getMe thành công |
| Native Expo Go iPhone/Android, VoiceOver/Dynamic Type, đăng nhập và restore thật | NOT_VERIFIED |

Preview render riêng các component React Native Web bằng SSR, cấp SafeAreaInsetsContext 44/34 ở portrait và 0 ở landscape. Đây là insets kiểm tra bố cục, chưa đo trên thiết bị thật. SSR giữ thanh ở giá trị đầu, nên preview xác minh presentation và phân nhánh role, còn transition 1.200 ms cần kiểm tra trên app chạy thật. Không tạo User/Session/records hoặc gọi API auth để kiểm thử. Mobile package.json chưa có lint script.

## Kiểm tra trên thiết bị

Dùng phiên PARENT hợp lệ, đóng/mở lại app để kiểm tra hình sau khôi phục phiên, rồi kiểm tra lối đăng nhập thủ công với tài khoản được cấp. Quan sát hình đủ nét/tỷ lệ, safe area, kết thúc splash vào Home và trạng thái khi API phiên trả lỗi. Các thao tác auth phục vụ UAT cần theo quyền và dữ liệu được PO cấp.
