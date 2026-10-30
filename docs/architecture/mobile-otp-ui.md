# Mobile OTP — kế thừa giao diện V1

Cập nhật 29/10/2026 (Asia/Saigon). Implementation local trên V2, chưa commit/push. Tài liệu này ghi nhận phần trình bày của **cả 5 màn nhập/xác nhận OTP**; không thay đổi contract xác thực hoặc chứng nhận gửi mã thực tế.

## Phạm vi và source map

| Route | File | Nội dung V2 được giữ |
| --- | --- | --- |
| `/(auth)/verify-otp` | [verify-otp.tsx](../../mobile/app/(auth)/verify-otp.tsx) | Sáu ô hiển thị dùng một TextInput ẩn, identifier, countdown, gửi lại, đăng ký/xác thực, quay lại đăng ký |
| `/(auth)/reset-password` | [reset-password.tsx](../../mobile/app/(auth)/reset-password.tsx) | OTP, banner trung tính chống dò tài khoản, hai trường mật khẩu và nút hiện/ẩn, gửi lại, hoàn tất, nhánh thành công và quay về Login |
| `/parent/verify-otp` | [verify-otp.tsx](../../mobile/app/parent/verify-otp.tsx) | Liên kết học sinh, số điện thoại che, timer/hết hạn, gửi lại, xác nhận liên kết và khóa quay lại khi đang xác thực |
| `/parent/create-request/verify-otp` | [verify-otp.tsx](../../mobile/app/parent/create-request/verify-otp.tsx) | Dùng chung cho yêu cầu cập nhật thông tin/địa chỉ, người giám hộ, thông báo hiệu lực mã, lỗi và xác nhận/gửi yêu cầu |
| `/leave-notices/otp` | [otp.tsx](../../mobile/app/leave-notices/otp.tsx) | Toàn bộ kênh nhận mã, nhãn SMS console khi có, countdown, gửi lại, lỗi và xác nhận báo nghỉ |

Các màn yêu cầu gửi mã như Đăng ký, Quên mật khẩu, Liên kết học sinh, tạo yêu cầu và tạo báo nghỉ không phải màn nhập OTP, không được sửa trong task này. Màn cập nhật học sinh không có resend trước đây nên không thêm nút resend.

## Nguồn thiết kế V1

Chỉ đọc `C:\dongnnp\study-work\code\he-thong-giam-sat-xe-dua-don-hoc-sinh`:

- `mobile/src/app/otp-verify/index.tsx`: minh họa xác thực, phân cấp tiêu đề/mô tả, sáu ô trắng bo góc, khoảng cách và CTA vàng dạng pill.
- `mobile/src/components/parent/students/ParentOtpForm.tsx` và `mobile/src/const/parent-otp-styles.ts`: cách trình bày một trường mã cho phụ huynh.
- `mobile/assets/auth/verify-phone.jpg` → [V2 asset](../../mobile/assets/images/auth/verify-phone.jpg), giữ nguyên byte, JPEG 648×652, 38.503 bytes. SHA-256 hai bản giống nhau: `6a02ced282ccc263a6293517cb5f6be845b6cb041f70268c7299f25b572ddd78`.

Kế thừa nền kem, hình minh họa điện thoại/khiên vàng, chữ đậm màu navy, bề mặt input trắng, bo góc 13 và nút vàng bo tròn. Dùng palette/font hệ thống hiện có của V2; không thêm font, package hoặc cấu trúc code V1. Không sao chép nhãn/nút để thay nghiệp vụ V2.

## Component và cách dùng

[OtpHero](../../mobile/components/auth/otp-hero.tsx) chỉ render ảnh trang trí, không có state OTP, router hoặc API. Ảnh dùng require tĩnh, contain, giữ tỉ lệ 648:652, không bắt pointer và không đọc lặp qua screen reader.

```tsx
import { OtpHero } from '@/components/auth/otp-hero';

<OtpHero />
<OtpHero compact /> // Biểu mẫu dài: Đặt lại mật khẩu
```

`compact?: boolean`, mặc định false. Chiều rộng = `max(112, min(compact ? 176 : 224, windowWidth - 128))`; chiều cao theo tỉ lệ ảnh. Kích thước phụ thuộc chiều rộng, không co hình theo chiều cao viewport khi bàn phím Android mở. Màn reset chỉ hiện hero ở nhánh chưa thành công.

[otpStyles](../../mobile/constants/otp-styles.ts) là các style trình bày dùng chung: vùng nội dung, tiêu đề, mô tả, destination, codeInput, sáu boxes/character, password field, CTA, resend/meta/hint và lỗi. Màn có thể spread từng token vào StyleSheet riêng, giữ logic và điều kiện trên màn:

```tsx
import { otpStyles } from '@/constants/otp-styles';

const styles = StyleSheet.create({
  content: { ...otpStyles.content },
  otpInput: { ...otpStyles.codeInput },
  verifyButton: { ...otpStyles.button },
});
```

Mở rộng bằng token/override trình bày có phạm vi; không chuyển validation, countdown, route params hoặc quyền truy cập vào component ảnh/style. Trường OTP vẫn nhận paste theo TextInput hiện có. Có accessibilityLabel cho trường mã; auth heading có role header.

## Bảo toàn hành vi V2

- State, effects, timer, format countdown, API payloads, handler thành công/lỗi, Alert và router giữ nguyên. Không sửa backend, schema, migrations, auth context hoặc API client.
- Đăng ký vẫn sáu ô với một input ẩn; input giữ hình học phủ đúng hàng ô để đo vùng đang nhập. Các màn còn lại vẫn một ô mã, không tách form reset thành bước mới.
- Liên kết học sinh vẫn có `maxLength={8}` và điều kiện chấp nhận 4–8 ký tự hiện có. Bốn màn còn lại giữ giới hạn 6. Không áp validation mới để đồng nhất hình thức.
- Giữ `editable`, `disabled`, loading, resend cooldown và autoFocus đúng từng màn. Không thêm autoFocus cho reset hoặc bỏ autoFocus ở các màn OTP đang có. Login/Quên mật khẩu không bị sửa.
- Thông điệp V2 và mọi nút nghiệp vụ được giữ; không seed dữ liệu, gửi OTP hoặc xác nhận qua API để thử UI.

## Responsive, safe area và bàn phím

Vùng form tối đa 430px, căn giữa, padding ngang 24px; input/nút co theo vùng nội dung. Sáu ô dùng flex, maxWidth 46, minWidth 0, gap 8; không cố định tổng chiều rộng gây tràn trên màn hẹp. Destination dài được xuống dòng, kênh nhận OTP báo nghỉ dùng flexShrink thông qua vùng text flex/minWidth 0. Nút tối thiểu 52px, vùng chạm resend/back/eye tối thiểu 48px; chiều cao dùng minHeight để nội dung có thể tăng.

Hai màn auth dùng SafeAreaView; ba màn nghiệp vụ giữ AppHeader và safe area phía trên hiện có. Link/báo nghỉ bổ sung padding dưới theo inset; màn cập nhật giữ cách cộng inset dưới sẵn có. Nội dung nằm trong luồng, không có header/CTA overlay mới.

Tất cả giữ [KeyboardScrollView](mobile-keyboard-behavior.md) làm chủ cuộn và phần bàn phím che khuất. Không thêm KeyboardAvoidingView hoặc độ đẩy bàn phím cố định. Form reset dài và nội dung thấp hơn màn hình vẫn cuộn được; state nhập không bị reset do thay key/remount input. Kiểu chữ field thường đặt system font/weight/letterSpacing 0; OTP khai báo spacing riêng. Web giữ focus outline màu thương hiệu.

## Kiểm chứng và giới hạn

| Kiểm tra | Kết quả |
| --- | --- |
| `npx --no-install tsc --noEmit` tại mobile | PASS |
| `npx --no-install expo export --platform all` | PASS iOS/Android/Web/server; build output ngoài repo |
| So sánh AST trước/sau của 5 màn | PASS: state/effects/handlers, control props/callbacks, text và lời gọi API/router; chỉ thêm hook inset trình bày ở link/báo nghỉ |
| Auth context, API client, hai KeyboardScrollView | Byte-identical với đầu task |
| SHA-256 ảnh V1/V2 | PASS |
| Chromium IAB preview 5 cây JSX/style tại 320×568, 390×844, 1440×900 | 15 lượt: ảnh tải đúng, không tràn ngang, input nằm trong viewport theo chiều ngang; form dài cuộn được; sáu ô đăng ký hiển thị mã nhập; giới hạn input link vẫn 8 |
| Runtime đầy đủ có xác thực, gửi lại/xác nhận OTP, timer theo thời gian, error/loading/success qua backend | NOT_VERIFIED — `BLOCKED_BY_TEST_DATA_POLICY`; không gọi mutation, không tạo bản ghi/challenge để test |
| Expo Go iPhone/Android, bàn phím thật, notch/home indicator, Safari iOS/Chrome Android, VoiceOver/font scale | NOT_VERIFIED — không có thiết bị/simulator mobile kết nối |

Preview tạm lấy JSX và StyleSheet thực của năm màn, dùng chuỗi placeholder và callback cục bộ không gọi API; không giả phiên đăng nhập hoặc trả phản hồi backend giả cho app. Không thay cho kiểm thử route/auth trên ứng dụng thật. Toolbar preview không thuộc sản phẩm. Script preview đã được xóa khỏi repo sau kiểm tra.

Build có cảnh báo môi trường `NO_COLOR`/`FORCE_COLOR`, không làm thất bại export. Mobile không có script lint trong package.json; không cài CLI bổ sung. Các cập nhật local trước task được bảo toàn. [Báo cáo task](../ai-review/LATEST.md) và [diff riêng](../ai-review/LATEST.diff).

Bước nghiệm thu tiếp theo: PO kiểm tra đủ năm màn trên Expo Go iPhone bằng các luồng/dữ liệu được phép, gồm bàn phím và nút cuối form.
