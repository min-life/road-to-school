# Tạo báo nghỉ — thời gian chờ ngay trên nút OTP

31/10/2026. Mobile frontend, local chưa commit/push.

## Hành vi

Trong [Tạo báo nghỉ](../../mobile/app/leave-notices/create.tsx), khi gửi OTP lần nữa quá sớm và server trả thời gian phải chờ:

- Nút đổi thành **Gửi lại OTP sau 287s** (ví dụ số giây từ server), có icon đồng hồ, style disabled và đếm về0.
- Không hiển thị lại popup/banner lỗi thời gian chờ; các lỗi mạng, quyền, chuyến, validation khác vẫn dùng cách hiển thị trước đây.
- Hết giờ, nút trở lại **Gửi mã xác thực OTP** và vẫn cần người dùng chủ động nhấn, với điều kiện đã chọn chuyến hợp lệ. Không tự gửi OTP, không tự tạo báo nghỉ.
- Nút cũng khóa trong lúc gửi và có ref chặn double-tap trước khi state kịp render; loading/spinner và chuyển sang màn OTP khi gửi thành công giữ nguyên.

Chỉ bắt đầu countdown khi lần yêu cầu bị server giới hạn. Không hardcode60/300giây hoặc suy ra từ TTL màn OTP; không sửa hành vi gửi lại ở màn xác thực `/leave-notices/otp` hoặc quick-leave.

## API thực tế và phạm vi chờ

[OtpService.createLeaveNoticeChallenge](../../api/src/auth/otp.service.ts) hiện ném HTTP400 BadRequestException với message **Vui lòng chờ N giây trước khi yêu cầu mã xác thực mới** khi challenge gần nhất còn hạn. Swagger có mô tả429 nhưng endpoint này chưa trả field retryAfter riêng; task này không thay backend/Swagger hoặc API contract.

[Utility](../../mobile/utils/leave-otp-cooldown.ts) nhận diện đúng toàn bộ câu chờ hiện tại, nhận số nguyên dương an toàn, không lấy bừa con số trong lỗi khác. Screen chỉ xử lý như cooldown nếu status400/429 và parse được câu; nếu không, giữ lỗi gốc. Phụ thuộc định dạng message được ghi rõ: backend đổi câu cần đồng bộ parser hoặc có task API cho field thời gian riêng, không tự đoán thời lượng dự phòng.

Backend khóa theo actor + student cho PARENT (không theo trip/date/direction); nhân sự khóa theo actor. Screen dùng scope JSON `[user.id, parent ? studentId : null]`. Đổi chuyến/ngày/chiều cùng con vẫn giữ chờ. Đổi con chuyển sang thời gian riêng; quay lại con trước còn hạn tiếp tục chờ. Callback lưu scope của lần gửi ban đầu nếu người dùng đổi con trong lúc request đang chờ. Không dùng contact/OTP/token làm key.

## Hook và vòng đời

[useLeaveOtpCooldown(scope)](../../mobile/hooks/use-leave-otp-cooldown.ts) trả `{ remainingSeconds, start(seconds): boolean }`:

- `start` nhận số giây server, tính deadline từ Date.now, từ chối số không hợp lệ/overflow.
- Lưu deadline theo scope trong state của form. Khi form còn trong stack thì giữ; unmount/remount không lưu persistent, request lại vẫn do server quyết định và trả thời gian còn lại.
- Cứ mỗi giây tính `ceil((deadline-now)/1000)` và giới hạn tối thiểu0; không trừ1 vào counter nên không bị kéo dài khi timer/background bị chậm.
- Dùng useFocusEffect + AppState để chỉ chạy timer khi form focus/foreground; dừng khi blur/background/unmount/hết giờ. Khi focus/foreground lại tính theo thời gian đã trôi qua, không bắt đầu lại từ số cũ.
- Không thay giá trị học sinh/chuyến/ngày/chiều/lý do, không gọi API trong timer. Accessibility label theo trạng thái nút, disabled/busy đúng; không live announce mỗi giây.

## Kiểm chứng và giới hạn

[Tests](../../mobile/scripts/leave-otp-cooldown.test.ts) chỉ dùng chuỗi, số và thời điểm: nhận dạng thông báo, loại lỗi không liên quan/giá trị không hợp lệ, thời gian hơn60giây, ceil và trở lại sau background/expiry. Không mock response nghiệp vụ, không Student/Trip/User fixtures hoặc DB/mutation.

Kết quả typecheck/build/source checks và giới hạn ghi ở [AI Review](../ai-review/LATEST.md). Cần nghiệm thu trên Expo Go bằng dữ liệu/OTP đã có: gửi lại quá sớm, nút đếm ngược, đổi con/chuyến, background/foreground và mở khóa khi hết thời gian. Không gửi OTP thật chỉ để kiểm thử khi chưa được PO cấp phạm vi mutation. Native timer/VoiceOver và phản hồi live chưa được chứng nhận bằng pure tests hoặc Expo export.
