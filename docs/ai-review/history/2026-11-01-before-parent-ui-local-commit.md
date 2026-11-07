# AI Review — Đồng bộ bộ chọn học sinh hai form

## 1. Task Information
Task: Đồng bộ bộ chọn học sinh Tạo báo nghỉ với Tạo yêu cầu đổi điểm. Date: 31/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI component integration. Status: COMPLETED frontend; native/auth acceptance NOT_VERIFIED.

## 2. Original Request
PO: “Ở tạo báo nghỉ, phần chọn học sinh phải làm giống phần chọn học sinh ở tạo yêu cầu đổi điểm.”

## 3. Approved Scope
Dùng cùng dropdown/modal hiện có của form Đổi điểm ở Tạo báo nghỉ; giữ avatar/thông tin/fixed từ yêu cầu trước và giữ nghiệp vụ từng form. Đã thông báo cấu trúc/shared component trước code. Không API/backend/DB writes/dependency hoặc commit/push. Điều chỉnh caller Đổi điểm để mode fixed cũng dùng cùng component, giữ guards/data/OTP. Không tự đổi chính sách chọn học sinh giữa các nghiệp vụ.

## 4. Analysis & Decisions
Báo nghỉ đang có LeaveStudentCard + modal riêng, Đổi điểm dùng LinkedStudentPicker. Chọn đúng component của Đổi điểm làm nguồn chung, bo12/padding14×12/label/dropdown/modal cùng style, thêm avatar40 và tên/mã/trường để giữ thông tin đã có. Fixed là readonly cùng dropdown có Cố định, không popup. Xóa component/mode modal riêng hết dùng.
Shared Picker mặc định chỉ AVAILABLE theo Đổi điểm trước đây; thêm canSelectStudent predicate để caller Báo nghỉ giữ toàn bộ linked list như source cũ, không áp ngầm rule Đổi điểm vào Báo nghỉ. Backend/options tiếp tục kiểm tra điều kiện/permission như trước. Báo nghỉ giữ auto-first, Đổi điểm giữ không auto-first; style đồng bộ không đồng nghĩa thay workflow.

## 5. Implementation Details
Sửa mobile/components/parent/linked-student-picker.tsx: avatar/metadata trên dropdown và row, props fixed/canSelectStudent, readonly badge, mode guard không mở modal, text wrap. Sửa mobile/app/leave-notices/create.tsx: dùng Shared Picker, selection vẫn setSelectedStudentId + clearTrip; bỏ local studentModalVisible/modal/student styles/imports/cached selectedStudent; giữ calendar overlay/modal. Linked GET thêm loading/error/retry/active guard, args và auto-select giữ.
Sửa mobile/components/parent/create-address-request-view.tsx: cả global/fixed dùng Shared Picker; fixed nhận detail thực vào array1 và loading/error/retry hiện một lần. Xóa mobile/components/parent/leave-student-card.tsx (component vừa tạo local trong task trước, không còn consumer), không xóa logic nghiệp vụ.
Cập nhật3docs mobile-leave-student-card.md/mobile-parent-stop-requests.md/mobile-ui-implementation-status.md. LATEST.diff chỉ7files theo baseline, gồm deletion component cũ; archive review trước tại history/2026-10-31-before-unified-student-picker.md/.diff.

## 6. Database Changes
None về writes/schema/migrations. Chỉ SELECT read-only display fields/id/status/linkedAt của2con linked thuộc tài khoản trong session, localhost backend env, psql -X/no-password/PGOPTIONS default_transaction_read_only=on + timeout.2rows/0avatar. Không tạo records/ảnh, seed hoặc API mock. Data snapshot chỉ trong TEMP cho preview, không có trong repo/diff; không in credentials/URL DB.

## 7. API & Swagger Changes
None. Cùng GET linked students/detail/options và OTP endpoints, không contract/Swagger/backend changes. Retry chỉ lặp lại GET cũ. Countdown, phone call action task trước, API client và data hooks giữ nguyên. Không chạy mutation hoặc gửi OTP để test.

## 8. UI/UX Changes
Hai form cùng LinkedStudentPicker: Học sinh uppercase, white dropdown bo12/padding14×12/min48, avatar40, tên14/20 và mã/trường11/16 wrap. Popup dùng chung row/selected/checkmark/close/scroll/safe area, thêm avatar theo từng child profile; chưa có dữ liệu giữ placeholder hoặc loading/error/retry/link/empty đúng. Không còn card riêng bo20/shadow hoặc modal riêng ở Báo nghỉ.
fixed hiển thị Cố định và readonly, không được mở modal. Shared component nhận policy từ caller; Đổi điểm defaultAVAILABLE và guard cũ, Báo nghỉ linked-list policy cũ. Không đổi selection resetTrip/auto-first của Báo nghỉ hoặc draft reset/OTP guards Đổi điểm. Mở popup dismiss keyboard như reference, không input/autoFocus mới. Calendar riêng, ngày/chiều/chuyến/lý do/OTP/cooldown vẫn nguyên. Avatar thiếu/lỗi dùng UserAvatar chung.

## 9. Verification & Testing
PASS: final Mobile npx --no-install tsc --noEmit exit0.
PASS: Expo export all iOS/Android/Web/server exit0, TEMP/rts-unified-student-picker-export, log TEMP/rts-unified-student-picker-export.log; không app edits sau final typecheck/build. Warning NO_COLOR/FORCE_COLOR không chặn build.
PASS: normalized-newline AST/source comparison6Leave declarations (OTP/date/currentTrip),8address controllers/guards và toàn bộ calendar Modal JSX giữ nguyên. Shared component references/policy/fixed/avatar fields/metadata/no truncation checked. First assertion attempt khác CRLF/LF, rerun normalized confirmed semantic/text parity; không sửa controllers để ép kiểm tra.
PASS: readonly2linked profiles/0avatar, no writes. Chromium IAB SSR actual Shared Picker/UserAvatar/row JSX/styles, real stored display fields.320/390/1440px không tràn ngang;390px hai dropdown cùng358×79,320px cả hai273×79 trong preview có document scrollbar. Tên/mã/trường/fixed/avatar fallback/selected row giữ đầy đủ. Các mode hiển thị chung chỉ để so sánh, không integrated form/API/auth mock. Screenshot TEMP/rts-unified-student-picker-compare.png (crop header+hai selectors) và rts-unified-student-picker-390.png. Modal đóng trong component SSR; standalone row preview không nghiệm thu native modal/callback interaction. Initial harness thiếu Pressable binding đã sửa, không lỗi application. Tab đã đóng/viewport reset/server51613 riêng dừng.
PASS:10protectedfileSHA256 giữ data hooks/countdown/OTP/API/UserAvatar/map phone task/package/lock; scoped diff/whitespace/module links/13sections checked.
NOT_VERIFIED: native Expo iPhone/Android selection/modal/focus/keyboard/VoiceOver/Dynamic Type, authenticated linked GET retry and actual photo loading. BLOCKED_BY_TEST_DATA_POLICY riêng real-photo acceptance vì0avatar và chưa được tự thêm ảnh. Không unit tests mirror style hoặc fake business/API responses; Mobile chưa có lint script.

## 10. Issues & Risks
Shared identity hiển thị thêm metadata/avatar ở Đổi điểm để giữ thông tin như Báo nghỉ; cả hai dùng cùng bố cục mới, không giữ selector tên-only. Báo nghỉ linked GET vẫn refetch khi selectedId đổi như trước, thêm loading/retry có thể tạm khóa dropdown khi đọc danh sách. Predicate chọn giữa hai form cố ý khác theo logic cũ, API guards vẫn quyết định. Native/auth/photo acceptance còn thiếu; dữ liệu UI TEST đã tồn tại do PO chuẩn bị, không agent tạo trong task.

## 11. Reviewer Focus
Dùng đúng một component cho selector và modal hai forms; fixed readonly vẫn đủ avatar/tên/mã/trường/Cố định. Không lấy parent avatar, không cắt text. Kiểm tra policy defaultAVAILABLE của Đổi điểm và explicit Báo nghỉ để không thay nghiệp vụ; same selection/resetTrip, calendar preserved, auto-first difference retained. Loading/error/retry cleanup của linked GET, fixed detail error không lặp, OTP/countdown/phone action unrelated giữ nguyên. Xóa đúng obsolete UI component, không discard pending work khác.

## 12. Suggested Next Step
Trên Expo Go iPhone, đối chiếu chọn học sinh ở hai form và thử chọn con/mở đóng popup cùng chế độ cố định từ hồ sơ.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push hoặc tự cấp quyền tạo test data/OTP mutations.
