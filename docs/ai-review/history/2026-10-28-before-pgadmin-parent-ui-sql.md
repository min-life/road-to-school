# AI Review — Login: chữ ô nhập thay đổi sau đăng xuất

## 1. Task Information
28/10/2026, Asia/Saigon. Mobile/Documentation. INVESTIGATION + FIX. COMPLETED code mitigation; original native symptom/fix NOT_VERIFIED. Chưa commit/push.

## 2. Original Request
Điều tra placeholder Email hoặc số điện thoại ở Login đổi phông sau đăng xuất, reload app thì hết; sửa nếu có thể.

## 3. Approved Scope
Điều tra auth/logout/navigation/font và vá trình bày Login phù hợp; bảo toàn dữ liệu nhập, validation/auth/API/keyboard. Không thêm dependency/font, không sửa backend/DB/node_modules hoặc Git writes. Giữ pending work trước task.

## 4. Analysis & Decisions
Không thấy global Text/TextInput defaults hoặc logout thay font. Root nạp SpaceMono, không áp lên Login; StyledText dùng font riêng nhưng Login không dùng. Hai ô Login chỉ đặt fontSize15/color; các màn link/OTP có Courier/monospace/letterSpacing khác. Logout đổi auth state và Root replace về Login, không sửa typography.

Bằng chứng source RN0.88 cài local: RCTComponentViewRegistry có recycle pool; RCTTextInputComponentView.mm prepareForRecycle386–403 xóa text/state, không reset defaultTextAttributes; RCTUITextField.mm dựng attributedPlaceholder từ defaultTextAttributes; RCTAttributedTextUtils.mm213–215 chỉ gán NSKern khi letterSpacing không NaN. RNFontUtils hỗ trợ system-ui trên iOS. Điều này phù hợp khả năng input tái sử dụng giữ thuộc tính cũ và reload xóa pool. LIKELY_CAUSE, chưa xác nhận bằng tái hiện iPhone.

Nguồn chính: [RN issue42589](https://github.com/react/react-native/issues/42589), có repro/báo cáo cộng đồng và workaround explicit letterSpacing0; issue đóng Cannot Reproduce, không coi đó là xác nhận lỗi cho project này. [RN TextStyle props](https://reactnative.dev/docs/text-style-props) xác nhận generic system font/weight/letterSpacing. Không hạ kiến trúc, sửa framework, thêm timeout/remount hoặc tắt autofill để che triệu chứng.

## 5. Implementation Details
- [login.tsx](../../mobile/app/(auth)/login.tsx): import Platform/TextStyle, thêm inputTypography chung, spread vào input/passwordInput. Native family iOS system-ui/Android sans-serif; Web không ép family. Weight400, normal, letterSpacing0; giữ size15/layout/color.
- Cập nhật UI status/keyboard docs và hai handoffs. Review trước archive history/2026-10-28-before-login-font-after-logout.md/.diff; LATEST.diff chỉ code Login so với snapshot đầu task.
- AuthContext, Settings logout, RootNavigation, KeyboardScrollView và font assets không sửa.

## 6. Database Changes
None. Không đọc/ghi hồ sơ, user/session hoặc tạo test records.

## 7. API & Swagger Changes
None. Không login/logout/OTP mutation để test. Không đổi endpoint/payload/session/token hoặc flow.

## 8. UI/UX Changes
Giữ wireframe, placeholder/copy, cỡ chữ15 và toàn bộ form. Explicit regular system typography để thay thuộc tính native cũ khi mount lại. LetterSpacing0 là phần khắc phục có bằng chứng tương ứng, không chọn một khoảng giãn mới. Không thêm input key/focus effect/timer/reset value, không tắt autofill hoặc font scaling. AutoFocus=false, secureTextEntry/toggle/onChange/keyboard owner giữ nguyên. Đây là vá rendering, không refactor giao diện hoặc đổi nghiệp vụ.

## 9. Verification & Testing
PASS npx --no-install tsc --noEmit; Expo export --platform all iOS/Android/Web/server với source cuối; git diff --check và task whitespace.

PASS AST/source parity: toàn bộ function LoginScreen (state/JSX/handlers/props) byte-equivalent trước/sau; AuthContext, Settings và Root byte-identical. Rà source native cài local xác nhận mapping letterSpacing→NSKern và đường đi placeholder/recycle; không sửa framework. Không có lint script, không cài thêm tooling.

NOT_VERIFIED: tái hiện lỗi ban đầu và hiệu quả thực tế trên Expo Go iPhone, Android/Safari/Chrome mobile, autofill/keyboard native. Windows không cung cấp iOS runtime/iPhone để chứng minh pool recycle. Không dựng preview Web hoặc fake auth response rồi ghi nhận native bug PASS. Không gọi mutation/tạo dữ liệu theo Test Data Policy; chu trình đăng nhập/đăng xuất thật cần PO chủ động thao tác tài khoản được phép.

## 10. Issues & Risks
Nguyên nhân còn là giả thuyết có bằng chứng source/issue tương đồng; không khẳng định fix chắc chắn nếu chưa nghiệm thu iPhone. Nếu còn lỗi, cần ảnh trước/sau và thông tin iOS/Expo, trạng thái placeholder so với text thực, màn đã mở trước logout để khoanh vùng tiếp. Không phát hiện lỗi typecheck/export. Patch chỉ Login, không tự mở rộng mọi TextInput trong app.

## 11. Reviewer Focus
Explicit letterSpacing0 trên cả hai ô và native system font phải giữ diện mạo ban đầu. Kiểm tra source parity và không thay global font/auth/navigation/keyboard. Phân biệt PASS compile/static với NOT_VERIFIED runtime; issue cộng đồng không thay kết quả tái hiện dự án.

## 12. Suggested Next Step
PO mở app, đăng nhập rồi đăng xuất trên iPhone, so sánh chữ ở Login với lần đầu mà không reload.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Đã vá local theo yêu cầu; native UAT còn lại. Chưa commit/push, dừng sau task.
