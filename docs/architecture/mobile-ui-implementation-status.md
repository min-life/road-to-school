# Hiện trạng giao diện Mobile — Onboarding và xác thực

Ngày cập nhật: **28/10/2026 (Asia/Saigon)**. Đối chiếu source tại commit `db02de6` trên nhánh `dongnnp/mobile/refactor-ui`. Tài liệu này ghi nhận phần đã triển khai trong đợt chuyển phong cách V1 sang V2; không phải phê duyệt toàn bộ kế hoạch chuyển giao diện hoặc chứng nhận nghiệm thu thiết bị.

## 1. Phạm vi đã triển khai

| Hạng mục | Source V2 | Trạng thái |
| --- | --- | --- |
| Bốn trang onboarding | `mobile/app/(auth)/onboarding.tsx`, `mobile/components/onboarding/OnboardingCarousel.tsx` | Đã thêm; vuốt, chọn chấm trang, Tiếp theo, Bỏ qua, Bắt đầu; đã bỏ bộ đếm 1/4 |
| Login | `mobile/app/(auth)/login.tsx` | Đã restyle bằng ảnh/phong cách V1, giữ đăng nhập V2, hiện/ẩn mật khẩu, khôi phục mật khẩu và liên kết Đăng ký |
| Quên mật khẩu | `mobile/app/(auth)/forgot-password.tsx` | Đã restyle; giữ hướng dẫn, yêu cầu OTP, lỗi/đang gửi, nút quay lại và liên kết đăng nhập |
| Đăng ký phụ huynh | `mobile/app/(auth)/register.tsx` | Đã restyle; giữ họ tên, chọn SĐT/Email, identifier, mật khẩu/xác nhận, hai nút hiện/ẩn, validation và chuyển xác thực OTP |
| Tránh bàn phím che ô nhập | `mobile/components/keyboard-scroll-view.tsx` và `.web.tsx` | Đã tích hợp cho 29 TextInput trên 15 file màn hình, gồm form, modal và drawer hiện có |

Các màn OTP đăng ký và Đặt lại mật khẩu đã có nghiệp vụ V2 và đã được tích hợp xử lý bàn phím; **chưa chuyển phong cách V1 cho các màn đó** trong đợt này. Web Admin, ba tab chính, màn nghiệp vụ và bản đồ chưa được restyle theo V1. Chỉ những vùng nhập liên quan mới được điều chỉnh xử lý bàn phím.

## 2. Nguyên tắc trình bày và phần bảo toàn

- V1 cung cấp ảnh và phong cách: nền sáng, bố cục mở, phân cấp chữ, input trắng bo góc có icon, CTA vàng dạng viên thuốc. Tỷ lệ ảnh/khoảng cách được điều chỉnh theo biểu mẫu V2.
- Dùng `colors` trong `mobile/constants/theme.ts`, StyleSheet, Ionicons và font hệ thống hiện có. Có SafeAreaView, vùng nội dung tối đa 430px trên ba form đã restyle, ảnh `contain` và vùng cuộn cho form dài.
- Không nhập provider, formatter, API client, quy tắc mật khẩu hoặc OTP flow của V1. Không thêm Google login/remember-me để giữ bố cục V1.
- Auth context, JWT/session, role guard, splash sau đăng nhập, điều hướng và payload V2 được giữ. Không thay backend, Prisma/migration, package/lockfile hoặc dữ liệu nghiệp vụ trong đợt UI này.
- Loading/disabled/error của V2 vẫn có. Không gộp hoặc xóa trường nghiệp vụ chỉ vì V1 có ít trường hơn.

### Nội dung đang hiển thị sau tinh chỉnh

Login và Quên mật khẩu đặt `autoFocus={false}`; mở trang không yêu cầu focus. Đăng ký không thêm autofocus hay lời gọi focus. Người dùng chạm vào trường thì cơ chế bàn phím dùng chung mới xử lý vùng nhìn thấy.

Nhãn liên kết đăng ký trên Login hiện là **Đăng ký**. Trên Đăng ký, các nhãn họ tên/identifier/mật khẩu/xác nhận riêng phía trên ô đang được comment trong source; nội dung nhận biết nằm ở placeholder và accessibilityLabel. Bộ chọn hình thức nhận mã vẫn có nhãn **Hình thức nhận mã xác thực**. Quên mật khẩu cũng dùng placeholder nhận biết trường. Đây là hiện trạng sau các tinh chỉnh đã được đưa lên GitHub, không phải trạng thái ở mọi báo cáo lịch sử trước đó.

## 3. Onboarding: trạng thái và điều hướng

- Bốn trang có nội dung: RoadToSchool; An tâm mỗi hành trình; Cùng chăm sóc học sinh; Luôn kết nối. Dữ liệu ảnh/copy ở `mobile/constants/onboarding.ts`.
- `mobile/context/onboarding-context.tsx` quản lý nạp, đã hoàn thành, đang lưu và lỗi lưu. Chặn ghi lặp trong lúc đang lưu. Có Thử lại hoặc Tiếp tục không lưu nếu lưu thất bại; lựa chọn không lưu chỉ có hiệu lực trong phiên hiện tại.
- `mobile/services/onboarding-storage.ts` lưu khóa `r2s_onboarding_v1_completed`: SecureStore trên native, localStorage trên Web. Khóa riêng với token, áp dụng theo thiết bị/trình duyệt và được giữ khi logout.
- `mobile/utils/onboarding-route.ts` quyết định điểm vào: chờ nạp preference; phiên đã xác thực bỏ qua onboarding; lần đầu chưa đăng nhập đi qua onboarding từ điểm vào/Login; hoàn thành hoặc bỏ qua chuyển về Login.
- Các liên kết trực tiếp tới Đăng ký, OTP, Quên/Đặt lại mật khẩu không bị onboarding chặn. Guard đăng nhập/phân quyền gốc vẫn xử lý các trường hợp còn lại trong `mobile/app/_layout.tsx`.
- Sau khi đã hoàn thành, Reload không tự xóa preference. **Chưa có nút Xem lại giới thiệu**; đề xuất đó mới được thảo luận, chưa triển khai. Không mô tả route onboarding như một cách xem lại khi marker đã hoàn thành.
- Có chỉ báo chấm trang, vùng chạm lớn, hỗ trợ reduced motion; không có số đếm 1/4 hoặc tự chạy slide.

## 4. Các luồng xác thực V2 được giữ

| Màn hình | Hành vi giữ trong source |
| --- | --- |
| Login | Trim identifier; kiểm tra dữ liệu trống; gọi `useAuth().login`; hiển thị lỗi API/fallback; giữ trạng thái đang gửi, role splash và điều hướng của AuthProvider |
| Quên mật khẩu | Gọi `forgotPasswordRequestOtp` với identifier đã trim; chuyển `/(auth)/reset-password` cùng `identifier` và `initialMessage` từ phản hồi trung tính; không thêm cách xác minh khác |
| Đăng ký phụ huynh | Tên tối thiểu 2 ký tự, identifier bắt buộc, mật khẩu tối thiểu 6 ký tự, xác nhận trùng; gọi `registerRequestOtp`; chuyển `/(auth)/verify-otp` cùng dữ liệu đăng ký hiện có. Không tạo User ngay trong màn này |
| Bộ chọn SMS/Email | Đổi nhãn/placeholder và kiểu bàn phím identifier; giữ hành vi xóa identifier khi chuyển kênh |

Đây là mô tả implementation hiện tại, không bổ sung contract hoặc chứng nhận gửi OTP/email/SMS thực tế. Không ghi credentials, token hay dữ liệu nhập của người dùng vào tài liệu.

## 5. Xử lý bàn phím dùng chung

Chi tiết implementation, phạm vi form/modal/drawer và checklist: [mobile-keyboard-behavior.md](mobile-keyboard-behavior.md). Quy tắc bắt buộc tại [WORKING_RULES.md mục 3.5](../WORKING_RULES.md#35-mobile-keyboard--focus-visibility).

Native dùng keyboard frame và bounds đo thực tế; iOS có automatic keyboard insets, Android dùng resize hiện có. Web dùng giao điểm scroll region với VisualViewport. Chỉ cuộn phần vượt vùng nhìn thấy, có khoảng đọc nhỏ; bỏ phần bù khi đóng bàn phím/focus rời vùng tương ứng. Không thêm KeyboardAvoidingView bù trùng, chiều cao bàn phím giả định hoặc key làm remount form. Input/textarea trong modal và drawer có vùng cuộn riêng.

## 6. Ảnh đã sao chép từ V1

Đường dẫn nguồn dưới `V1/mobile/assets/`; đích dưới `V2/mobile/assets/images/`. V1 chỉ đọc. Không sao chép toàn bộ asset hoặc thêm SVG/font dependency.

| Nguồn | Đích | Bytes |
| --- | --- | ---: |
| `onboarding/slide1.jpg` | `onboarding/slide1.jpg` | 64.029 |
| `onboarding/slide2.jpg` | `onboarding/slide2.jpg` | 61.531 |
| `onboarding/slide3.jpg` | `onboarding/slide3.jpg` | 53.939 |
| `onboarding/slide4.jpg` | `onboarding/slide4.jpg` | 44.737 |
| `auth/login.jpg` | `auth/login.jpg` | 72.114 |
| `auth/forget-password.jpg` | `auth/forget-password.jpg` | 33.267 |
| `auth/register.jpg` | `auth/register.jpg` | 67.982 |

Ảnh giữ nguyên nội dung/định dạng, tham chiếu bằng require tĩnh. Checksum được kiểm tra khi sao chép; báo cáo từng màn nằm trong history. Chưa chuyển các ảnh reset-password, reset-success hoặc verify-phone của V1.

## 7. Kiểm chứng và giới hạn

| Kiểm chứng đã ghi nhận trong đợt triển khai | Kết quả và phạm vi |
| --- | --- |
| Mobile TypeScript | PASS tại các bước triển khai/publish; lần gần nhất trước commit `db02de6` bao gồm tinh chỉnh nhãn |
| Kiểm thử thuần điều hướng onboarding | 7/7 PASS; không DB/API |
| Kiểm thử thuần hình học tránh bàn phím | 8/8 PASS; không thay cho bàn phím thật |
| Export iOS | PASS cho từng đợt restyle; export Đăng ký có ảnh mới, trước tinh chỉnh nhãn cuối |
| Export Android/Web/server | PASS tại đợt keyboard; chưa chạy lại cho toàn bộ các tinh chỉnh giao diện sau đó |
| So sánh source | Các báo cáo từng đợt ghi kết quả giữ handler/input/actions; kiểm kê text trước các tinh chỉnh nhãn chỉ áp dụng tại mốc đó |
| Expo iPhone/Android, Safari iOS, Chrome Android, VoiceOver, ảnh render và bàn phím thật | NOT_VERIFIED; session triển khai không có thiết bị/browser surface kết nối |
| Đăng nhập, gửi/nhập OTP và tạo tài khoản thực tế | NOT_VERIFIED trong đợt restyle; không tự tạo record hay gửi API có side effects để test |

Nguồn kiểm chứng lịch sử: `docs/ai-review/history/2026-10-28-before-publish-login-keyboard.md`, `2026-10-28-before-forgot-manual-focus.md`, `2026-10-28-before-publish-register.md` và `2026-10-28-before-register-ui.md`. Các kết quả trên là đã ghi nhận trước task tài liệu này; không phải mọi kiểm tra đều vừa được chạy lại.

## 8. Mốc Git và phần còn lại

| Commit | Nội dung |
| --- | --- |
| `113c249` | Bốn trang onboarding và bỏ bộ đếm trang |
| `579ccaf` | Restyle Login, shared keyboard handling, Login manual focus |
| `d228c1d` | Restyle Quên mật khẩu, manual focus |
| `db02de6` | Restyle Đăng ký phụ huynh và tinh chỉnh nhãn Login/Đăng ký |

Các commit đã push lên nhánh `dongnnp/mobile/refactor-ui` theo yêu cầu riêng của PO; chưa có bằng chứng merge vào main hoặc nghiệm thu cuối. Task tài liệu không tự commit/push.

Phần chưa triển khai của chuyển phong cách V1: restyle OTP, Đặt lại mật khẩu, các màn thành công nếu được giao, phần Web và các màn nghiệp vụ Mobile. Tính năng V2 hiện có vẫn sử dụng được; chưa restyle không đồng nghĩa chưa có nghiệp vụ. Không tự làm tiếp hoặc thêm API để khớp V1.
