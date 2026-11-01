# AI Review — Avatar và bố cục card học sinh Tạo báo nghỉ

## 1. Task Information
Task: Avatar và bố cục card Học sinh ở Tạo báo nghỉ. Date: 31/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI styling. Status: COMPLETED frontend; native/photo acceptance NOT_VERIFIED.

## 2. Original Request
PO yêu cầu thêm avatar, sửa bố cục card học sinh cho đẹp và đồng bộ với các card khác, giữ nguyên thông tin trong trang Tạo báo nghỉ.

## 3. Approved Scope
Restyle identity/card và row chọn học sinh trên đúng form; giữ tên/trường/mã/Cố định/selection, API và nghiệp vụ hiện tại. Đã thông báo bố cục trước code: avatar trái, tên/trường/mã cạnh, chevron hoặc fixed badge. Chỉ frontend/local, không dependency/backend/DB writes hoặc commit/push. Bảo toàn pending work cũ, đặc biệt countdown OTP, bỏ thẻ xác nhận và Đổi điểm inline.

## 4. Analysis & Decisions
GET linked students đã có avatarUrl, fullName, schoolName, code; dùng đúng Student.avatarUrl từng con. Main card trước chỉ tên và icon person, popup có tên/mã/trường. Tách LeaveStudentCard thuần trình bày, dùng UserAvatar đã có ở Home, giữ chế độ fixed không onPress. Hiển thị thêm trường/mã sẵn có trên main card để nhìn rõ đối tượng. Popup thay icon bằng ảnh riêng và restyle row; không đổi filter/danh sách/guard chọn. Thiếu/lỗi ảnh fallback theo UserAvatar chung, không giả ảnh hoặc sửa dữ liệu cho đẹp.

## 5. Implementation Details
Thêm mobile/components/parent/leave-student-card.tsx nhận student Pick4fields/fixed/onPress; avatar48/ring, text wrap, school/code, badge Cố định hoặc chevron. Sửa mobile/app/leave-notices/create.tsx: thay hai nhánh student card bằng component fixed/mutable, thêm UserAvatar40 ở row popup, border/selected/spacing/typography; xóa4styles fixed-field hết dùng. Calendar dropdown styles vẫn nguyên.
Thêm docs/architecture/mobile-leave-student-card.md và cập nhật mobile-ui-implementation-status.md. LATEST.diff chỉ4files theo baseline; archive review trước tại history/2026-10-31-before-leave-student-card.md/.diff.

## 6. Database Changes
None về writes/schema/migrations. Chỉ SELECT read-only các display fields fullName/avatarUrl/code/schoolName của con linked với phụ huynh trong session, host loopback từ cấu hình backend, psql -X/no-password và PGOPTIONS default_transaction_read_only=on + timeout. Kết quả2rows,0avatar. Không ghi DB, upload ảnh, seed hoặc tạo student fixtures. Raw profile fields chỉ lưu TEMP cho preview, không đưa vào repo/diff; không in URL DB/password/URL ảnh.

## 7. API & Swagger Changes
None. Source API client/contracts/backend không đổi, không thêm request. Avatar lấy từ cùng getLinkedStudents payload, không dùng ảnh phụ huynh. Không gọi API mutation hoặc gửi OTP để kiểm thử; Swagger N/A.

## 8. UI/UX Changes
Main card trắng bo20/padding16/viền/shadow nhẹ theo Parent, avatar48 có ring54, tên16/22, trường12/18, mã11/16. Metadata/fixed badge wrap; không ellipsis/fixed card height hoặc cắt tên/trường/mã. Cố định giữ nhãn đầy đủ và không tương tác; mutable toàn card mở popup, chevron tròn32 và accessibilityLabel gồm identity.
Popup avatar40, row bo14/viền/default trắng, selected nền kem/viền vàng; giữ tên/mã/trường/checkmark/onPress. Không sửa chọn ngày/chiều/chuyến/lý do/modal calendar/scroll/OTP/cooldown. Thẻ Xác nhận thông tin vẫn bỏ. UserAvatar chia sẻ nguồn/fallback/image-error handling, không thay shared helper hoặc thêm image assets.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit exit0.
PASS: Expo export --platform all exit0 iOS/Android/Web/server, TEMP/rts-leave-student-card-export; log TEMP/rts-leave-student-card-export.log. Warning NO_COLOR/FORCE_COLOR không chặn build. Không app code changes sau kiểm chứng.
PASS: AST5controllers (handleRequestOtp/PrevMonth/NextMonth/SelectDay/QuickSelectToday), toàn bộ useEffects/API calls và modal student onPress giữ byte-identical. Metadata Mã/trường/checkmark, fixed prop và source avatar mapping còn.10protectedfiles SHA256 giữ nguyên gồm UserAvatar/API client/countdown helpers/OTP/Đổi điểm/Profile/package/lock. Diff/whitespace/module links checked.
PASS: read-only local SELECT 2 linked profiles,0avatars; dùng chính display fields đã có, không synthetic records/API responses. Chromium IAB SSR actual LeaveStudentCard/UserAvatar/row JSX/styles và header,320/390/1440px không tràn ngang; giữ tên/trường/mã/fixed và selected. Ảnh thiếu hiện initial theo shared component; dữ liệu có prefix UI TEST do PO chuẩn bị trước, không agent tạo trong task. Preview chỉ trình bày các mode cùng lúc để đối chiếu, không phải integrated form đang hoạt động. Không chạy callback/popup/auth flow qua SSR. Screenshot TEMP/rts-leave-student-card-390.png; tab đóng/viewport reset/server51611 riêng dừng.
NOT_VERIFIED: iPhone/Android Expo, native modal/VoiceOver/Dynamic Type, real-photo download/error. BLOCKED_BY_TEST_DATA_POLICY riêng nghiệm thu ảnh thật khi local0avatar, không tự thêm ảnh/học sinh. Không unit test mirror style hoặc API writes để ép PASS. Mobile chưa có lint script.

## 10. Issues & Risks
Ảnh thật chỉ hiện khi hồ sơ có avatarUrl hợp lệ; hiện local đọc được0ảnh, fallback là chữ đầu tên (kể cả ký tự đầu prefix tên đang có), đúng shared component/view khác. Không tự thay tên hoặc ảnh. Dữ liệu đang tải thiếu identity giữ Học sinh/Chọn học sinh như trước. Native/photo acceptance còn thiếu; preview không thay kiểm tra navigation/modal thật.

## 11. Reviewer Focus
Avatar own-student mapping, không parent avatar hoặc first-child reuse; keep name/school/code/fixed/checkmark. Text wrap, minWidth0, code/fixed chip không làm tràn và không sửa calendar field styles. Fixed không mở popup, mutable dùng callback cũ; business controllers/countdown không đổi. Read-only data preview không seed/mock và không đưa raw profiles/credentials vào diff.

## 12. Suggested Next Step
Trên Expo Go iPhone, kiểm tra thẻ học sinh và popup chọn con, đối chiếu avatar với hồ sơ khi con có ảnh hợp lệ.

## 13. Approval Status
Implement theo chỉ thị trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push; chưa nghiệm thu native hoặc tự cấp quyền sửa dữ liệu test.
