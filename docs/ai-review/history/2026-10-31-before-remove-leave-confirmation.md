# AI Review — Chọn học sinh trong form đổi điểm

## 1. Task Information
Task: Chọn học sinh trong cùng form đổi điểm. Ngày: 30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Frontend implementation. Status: COMPLETED frontend; authenticated/native acceptance NOT_VERIFIED.

## 2. Original Request
Khi nhấn Tạo yêu cầu đổi điểm, thẻ chọn học sinh phải ở trên thông tin đổi điểm và nằm chung một trang, theo thiết kế Tạo báo nghỉ mới.

## 3. Approved Scope
Chỉ thị trực tiếp cho luồng/form frontend: giữ lịch sử và style trước, tạo mới mở form có dropdown học sinh ở đầu, popup chọn như Báo nghỉ; giữ tất cả thông tin và nghiệp vụ địa chỉ/OTP. Đã trình bày cấu trúc trước code: Học sinh → notice/địa chỉ hiện tại → search/map → đề xuất/tọa độ → OTP; chọn từ hồ sơ giữ fixedStudentId. Không thêm API/backend/DB/dependency; không commit/push hoặc tự tạo data test. Giữ các pending work trước.

## 4. Analysis & Decisions
Trước task createRoute mở select-student riêng rồi mới vào form địa chỉ dynamic. Bây giờ history CTA/+ cùng tới /parent/change-stop/create; một shared CreateAddressRequestView chứa cả chọn con và toàn bộ form cũ. Picker dùng dropdown/modal kiểu Create Leave Notice, không sửa source Báo nghỉ. Không tự chọn con đầu tiên; chỉ bật form/OTP khi có con AVAILABLE và detail/link hợp lệ. Fixed-student route tái sử dụng view, giữ con đã chọn từ hồ sơ. Old select-student URL redirect tương thích thay vì bị xóa.

## 5. Implementation Details
Sửa mobile/app/parent/change-stop.tsx để createRoute trỏ form mới. Thêm mobile/app/parent/change-stop/create.tsx; sửa select-student.tsx thành Redirect. Sửa mobile/app/parent/create-request/address/[studentId].tsx thành wrapper có fixedStudentId/key.
Thêm mobile/components/parent/create-address-request-view.tsx từ đầy đủ form cũ: thêm selector trên cùng, loading/error/retry/unavailable, disabled field/map/OTP trước chọn con, lifecycle/request guards. Giữ notice, current address, search/suggestions, map270, selected address/coords, OTP payload/router. Thêm linked-student-picker.tsx (presentation dropdown/modal/link/retry/disabled) và use-address-request-student.ts (GET list/detail/focus/stale guard).
Đổi con reset draft trước paint; tăng draft/search/lookup generations, hủy timer; mounted/activeStudentId chặn response hoặc callback map cũ. Map keyed studentId, không giữ marker con cũ. Không reset khi chọn lại cùng con; khóa đổi con/input/map trong lúc submit.
Cập nhật mobile-parent-stop-requests.md, mobile-parent-home-ui.md và mobile-keyboard-behavior.md. LATEST.diff chỉ10files task này theo baseline; archive review trước ở history/2026-10-30-before-inline-stop-student.md/.diff.

## 6. Database Changes
None. Không SQL, migrations, seed hoặc tạo/sửa records/ảnh học sinh. Không kết nối DB trong task.

## 7. API & Swagger Changes
None. GET linked students/detail và requestStudentUpdateOtp ADDRESS_UPDATE dùng cùng API client. AST đối chiếu call arguments request OTP, autocomplete/place detail/reverse và OTP route params giống bản cũ. Backend/VietMap service/API client/OTP screen và Swagger không đổi. Không gọi POST gửi OTP hoặc API mutation để kiểm thử.

## 8. UI/UX Changes
Tạo mới mở thẳng form: thẻ Học sinh đầu tiên, click mở modal có tên/mã/trường/checkmark, disabled học sinh DISABLED. Giữ empty/link/retry, backdrop/close/Android Back; modal giới hạn theo viewport/safe area và có ScrollView, không input. Mở picker dismiss bàn phím, không tự focus. Khi chưa chọn, giữ các phần thông tin/search/map/submit trên cùng trang; search readonly, map placeholder trung tính và OTP disabled. Không tải tile khi chưa chọn con; sau chọn dùng map thật cũ.
GET list/detail lỗi có retry; không coi lỗi mạng như không có con. Global form không tự chọn con; fixed route giữ con, readonly name ở trên. Khi đổi con xóa địa chỉ nháp/coords và chặn kết quả cũ; selected summary/coordinates hiện đúng khi đã chọn địa chỉ. Nội dung notice phê duyệt và mọi phần form cũ giữ. KeyboardScrollView tiếp tục sở hữu cuộn input; không offset cố định/KeyboardAvoidingView/dependency mới. Back từ form về history, không qua màn chọn con riêng; OTP success vẫn tới danh sách riêng con như V2.

## 9. Verification & Testing
PASS: final Mobile npx --no-install tsc --noEmit exit0.
PASS: final Expo export all iOS/Android/Web/server exit0, TEMP/rts-inline-stop-student-export, log TEMP/rts-inline-stop-student-export.log. Manifest server/_expo/routes.json có create route, select-student redirect route và fixed address route. Warning NO_COLOR/FORCE_COLOR không chặn build; artifacts ngoài repo.
PASS:3 primitive-only node:test checks,0fail, extracted production callback expressions into isolated VM: reset clears search/suggestions/address/coords/flags and increments generations/cancels timer; no selection/canEdit=false cannot enter work; callbacks from old activeStudentId return before setters/API work. No Student/Trip/Request fixtures, fake GET responses, DB or actual API services. Tests temporary at TEMP/rts-inline-stop-primitive-guards.test.cjs. Các checks này không nghiệm thu async live network/multi-child flow.
PASS: AST OTP/geocoding call args và OTP navigation params giữ nguyên; sáu form data sections retained, selector precedes address, fixed wrapper/Redirect/createRoute đúng.12protectedfiles SHA256 giữ nguyên: Leave create/history, OTP, VietMapPicker/API/services/history/shared list/style, profile pending, package/lock.
PASS: Chromium IAB presentation-only SSR từ shared form return JSX/styles và picker thật, empty primitives không business records, không mount data hook hoặc map/network.320/390/1440px không tràn ngang.320px selector y114 trước current-address y357, viewport scroll495/content941.390px input readonly, submit aria-disabled=true, scroll771/content924; PageDown từ readonly field làm scrollTop81, không nhập/gửi dữ liệu. Screenshot TEMP/rts-inline-stop-form-390.png; empty presentation không phải trạng thái tài khoản thật. Modal không được nghiệm thu bởi SSR (đóng), không claim click selecting/routing đã chạy. Safe-area0 là geometry preview. Tabs đóng/viewport reset/server51609 riêng dừng; không preview route trong repo.
PASS: task diff/whitespace/module links/13 sections review.
NOT_VERIFIED: authenticated selecting/multiple real children/detail-error/focus/unlink races, real delayed network/map interactions, native Expo iPhone/Android/VoiceOver, keyboard + modal on device/Safari/Chrome mobile, actual OTP sending/verification. Không tạo dữ liệu/mock API để ép PASS. Mobile chưa cấu hình lint script. Preview harness ban đầu thiếu TextInput binding, đã sửa harness và render/check thành công, không lỗi source.

## 10. Issues & Risks
Chưa có UAT có xác thực/native; primitive guards và SSR không chứng minh toàn bộ race network hoặc map bridge thật. Focus refresh có thể tạm khóa form khi đọc lại link/detail; request đã gửi không abort transport, nhưng scope/generation chặn kết quả cũ. Đổi con cố ý xóa draft để tránh gửi nhầm, không giữ draft riêng từng con. Rủi ro phân trang history nhiều GET từ task trước không đổi. Modal scroll/IME/native Back cần kiểm tra thiết bị, chưa báo PASS.

## 11. Reviewer Focus
Đảm bảo selector trên cùng và không navigate thêm page khi chọn con; profile entry fixed, history entry chọn trong form. Form fields/coords/OTP payload không mất. Rà soát draft reset, activeStudentId/mounted guards trước callback và after-await, busy disable và unavailable status cả list/detail, no auto-select child. Kiểm tra focus cleanup/current scope/no stale profile, readonly/unselected states, modal scroll/safe area and KeyboardScrollView coverage. Không backend/source Báo nghỉ/dependency/data mutations.

## 12. Suggested Next Step
Trên Expo Go iPhone, mở Tạo yêu cầu đổi điểm, chọn và đổi giữa các con có sẵn, kiểm tra thẻ/địa chỉ/bản đồ/bàn phím trên cùng form mà chưa gửi OTP.

## 13. Approval Status
Implement theo yêu cầu mới nhất của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push task này; chưa tự đánh dấu nghiệm thu thiết bị hoặc cấp quyền tạo test data.
