# AI Review — Countdown trên nút gửi OTP báo nghỉ

## 1. Task Information
Task: Countdown chờ gửi OTP trên nút Tạo báo nghỉ. Date: 31/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UX implementation. Status: COMPLETED frontend; native/live OTP acceptance NOT_VERIFIED.

## 2. Original Request
Khi nhấn Gửi mã xác thực OTP thêm lần nữa ở Tạo báo nghỉ và gặp yêu cầu chờ Ns, thay thông báo chờ bằng countdown ngay nút gửi.

## 3. Approved Scope
Yêu cầu trực tiếp thêm trạng thái nút trên form hiện có. Dùng thời gian thật backend, giữ luồng gửi/OTP/validation và lỗi khác. Không API/backend/DB/schema/dependency changes; không tự gửi OTP để test. Chỉ local, không commit/push. Bảo toàn các pending work trước, gồm bỏ thẻ Xác nhận thông tin và form Đổi điểm inline.

## 4. Analysis & Decisions
Source OtpService.createLeaveNoticeChallenge ném BadRequestException HTTP400 với nguyên câu Vui lòng chờ N giây trước khi yêu cầu mã xác thực mới; không có retryAfter riêng cho endpoint, dù Swagger có mô tả429. Không sửa backend/contract: frontend parse đúng toàn câu ở status400/429, từ chối lỗi không liên quan/giá trị sai. Không đoán60/300giây hoặc lấy TTL của màn OTP.
Chỉ start khi backend từ chối gửi lại quá sớm; success vẫn navigate OTP như cũ. Countdown dùng deadline và ceil, timer chỉ focus/foreground; hết chờ không tự gửi. Scope theo actor+student (nhân sự actor) đúng query backend, không theo Trip; đổi con không dùng nhầm chờ, đổi chuyến cùng con vẫn giữ. Callback captures scope của request cũ nếu user chuyển con trong lúc request pending.

## 5. Implementation Details
Sửa mobile/app/leave-notices/create.tsx: hook scope, in-flight ref ngăn double-tap trước render, guard wait; catch cooldown start timer rồi return trước setError/Alert, lỗi khác giữ; label/icon/disabled/a11y busy trên nút. Request body/OTP route params không đổi.
Thêm mobile/hooks/use-leave-otp-cooldown.ts: deadline dictionary, start(seconds):boolean, remainingSeconds, useFocusEffect/AppState/clearInterval/cleanup. Thêm mobile/utils/leave-otp-cooldown.ts: parser/deadline/remaining thuần; thêm mobile/scripts/leave-otp-cooldown.test.ts.
Thêm docs/architecture/mobile-leave-otp-cooldown.md và cập nhật mobile-ui-implementation-status.md. LATEST.diff chỉ6files task này theo baseline. Archive review trước tại history/2026-10-31-before-leave-otp-cooldown.md/.diff.

## 6. Database Changes
None. Không DB query/seed/migrations/records. Không sinh OTP hoặc dữ liệu test.

## 7. API & Swagger Changes
None. Backend/Swagger/API client giữ nguyên; frontend nhận diện lỗi HTTP400 thực tế, cũng cho429 cùng định dạng. Không thêm endpoint/response field/call trong timer. AST kiểm tra requestLeaveNoticeOtp/getLeaveNoticeOptions/router.push arguments giống baseline. Màn leave-notices/otp và quick-leave giữ nguyên, không tự mở rộng sửa countdown của chúng.

## 8. UI/UX Changes
Lần gửi lại bị giới hạn: nút hiện Gửi lại OTP sau Ns với đồng hồ và disabled style, thay popup/banner chờ. Lỗi khác vẫn banner/Alert cũ. Hết thời gian trở về Gửi mã xác thực OTP, bật nếu đang chọn chuyến hợp lệ; không auto-send. Spinner khi gửi, form values/validation, keyboard/safe-area/navigation giữ. AccessibilityLabel đổi cùng text, disabled/busy đúng và không live announce mỗi giây. Không làm hiện lại thẻ Xác nhận thông tin. Countdown tính lại theo thời gian thực khi focus/foreground, không trừ counter đơn thuần.

## 9. Verification & Testing
PASS: final npx --no-install tsc --noEmit tại mobile exit0. Lượt đầu phát hiện AppState.currentState có thể null/undefined trong type RN; đã mở kiểu activate phù hợp và chạy lại đạt.
PASS:9 node:test/2suites,0fail, từ installed TypeScript transpile vào TEMP, node --test --test-reporter=tap. Chỉ text/numbers/clocks: parse đúng287s/1s, case/whitespace/punctuation; loại thông báo khác/giá trị sai; deadline/ceil/background elapsed/expiry/NaN/Infinity/overflow. Không business DTOs, fake API response/Student/Trip fixture hoặc network mutation.
PASS: Expo export --platform all exit0, iOS/Android/Web/server vào TEMP/rts-leave-otp-cooldown-export; log TEMP/rts-leave-otp-cooldown-export.log. Warning NO_COLOR/FORCE_COLOR không chặn build.
PASS: source/AST check request OTP/options/OTP params unchanged; cooldown branch trước Alert, actor/child scope đúng, focus/subscription/interval cleanup có và timer không gọi API.10protectedfiles SHA256 giữ: OTP backend/leave service/controller, API client, OTP screen/quick-leave, shared Đổi điểm/history view và package/lock. Whitespace/task diff/module links/13sections checked.
NOT_VERIFIED: actual rate-limit response runtime, React hook timer/cross-child interaction, iPhone/Android Expo/native AppState/VoiceOver and authenticated OTP flow. Không browser/native UI preview hoặc gửi OTP thật trong task. Pure deadline tests không thay native hook acceptance. Mobile chưa có lint script.

## 10. Issues & Risks
Phụ thuộc đúng câu chờ hiện tại vì API chưa có field riêng; nếu backend đổi câu parser không nhận sẽ giữ lỗi gốc, không tự bịa thời gian. Chờ trong bộ nhớ form; unmount/remount cần server trả lại số giây còn lại, không persist. Backend vẫn quyết định cấp OTP, countdown không bypass guard. Màn OTP gửi lại có hành vi countdown riêng ngoài phạm vi task. Native/live chưa nghiệm thu.

## 11. Reviewer Focus
Nhận diện đúng cooldown HTTP400 thực tế, không biến mọi lỗi400/429 thành timer. Không cap60giây hoặc auto-send. Scope actor/student captures request, same-child trip changes preserve deadline; focus/background cleanup tính elapsed chính xác. Chặn double-tap và deadline >0, giữ API payload/OTP params/errors khác. Không đụng backend/OTP screen hoặc tạo records test.

## 12. Suggested Next Step
Trên Expo Go iPhone, kiểm tra lần gửi lại quá sớm với OTP hiện có: countdown trên nút, background/foreground và trở lại nút gửi khi hết chờ.

## 13. Approval Status
Implement theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push; không tự gửi OTP hoặc cấp quyền mutation để test.
