# AI Review — Chọn học sinh ở Tạo báo nghỉ giống Đổi điểm

## 1. Task Information
Task: Đồng bộ trạng thái ban đầu và thao tác chọn học sinh của Tạo báo nghỉ với Tạo yêu cầu đổi điểm. Date: 01/11/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI flow fix. Status: COMPLETED implementation/static checks/build; native acceptance NOT_VERIFIED.

## 2. Original Request
PO yêu cầu cùng thiết kế: Thẻ Học sinh → nhấn Chọn học sinh → hiện card tất cả học sinh; phần chọn ở Tạo báo nghỉ phải giống Tạo yêu cầu đổi điểm.

## 3. Approved Scope
Chỉnh trực tiếp form Báo nghỉ theo cấu trúc/tham chiếu đã được PO nêu rõ. Bố cục đã thông báo trước code. Dùng đúng LinkedStudentPicker của Đổi điểm. Không thay API/backend, database, thư viện, policy hợp lệ theo nghiệp vụ hoặc code Đổi điểm. Không commit/push lần sửa này. Giữ .env.example và cache Python ngoài phạm vi.

## 4. Analysis & Decisions
Hai form đã dùng cùng component, vì vậy dropdown/popup/row style vốn giống nhau. Khác biệt thực tế: GET linked students của Báo nghỉ tự set ID con đầu tiên, làm nhãn Chọn học sinh biến mất ngay sau khi tải; Đổi điểm giữ chưa chọn. Bỏ auto-select ở Báo nghỉ để khởi đầu rỗng kể cả danh sách chỉ có một con. Không tạo thêm component/variant mới hoặc restyle lại nguồn tham chiếu. Điểm vào có studentId từ hồ sơ/chuyến vẫn cố định con đó theo navigation hiện có.

## 5. Implementation Details
- mobile/app/leave-notices/create.tsx: bỏ setSelectedStudentId(res[0].id) khi GET danh sách hoàn tất; bỏ selectedStudentId khỏi dependencies của effect danh sách vì effect không còn dùng ID này. Giữ cleanup/loading/error/retry. Chọn con không còn refetch danh sách hoặc tạm khóa dropdown vì lần refetch đó.
- Khi PARENT chưa chọn con, vùng chuyến hiển thị nhắc ngắn Chọn học sinh để xem chuyến xe phù hợp; thay cho thông báo không có chuyến khi còn chưa biết học sinh. Options effect vẫn không gọi GET khi thiếu studentId, nút OTP vẫn khóa khi thiếu chuyến.
- Giữ callback chọn con: set ID và clear selectedTripId; Shared Picker đóng popup. Giữ params.studentId, fixed badge, avatar/tên/mã/trường, tất cả cards trong popup và policy riêng từng nghiệp vụ.
- docs/architecture/mobile-leave-student-card.md: cập nhật wireframe, khởi đầu chưa chọn, fixed entry, GET dependencies và thông báo chuyến.
- docs/architecture/mobile-parent-stop-requests.md: ghi nhận hai form cùng khởi đầu Chọn học sinh; không sửa implementation Đổi điểm.
- docs/architecture/mobile-ui-implementation-status.md: cập nhật trạng thái lần sửa01/11.
- Archive report/diff trước tại history/2026-11-01-before-leave-explicit-student-selection.md/.diff. LATEST.diff chỉ gồm bốn file của task, loại mọi file env/cache.

## 6. Database Changes
None. Không đọc/ghi DB, không seed hoặc tạo dữ liệu thử nghiệm.

## 7. API & Swagger Changes
None. API client/contract/Swagger không đổi. GET options giữ nguyên arguments và guards; chỉ bắt đầu sau khi phụ huynh chọn con. Không gọi mutation hoặc gửi OTP để kiểm thử.

## 8. UI/UX Changes
Wireframe theo chỉ thị PO: HỌC SINH → [Chọn học sinh v] → popup card các con → chọn một card → dropdown hiện avatar/tên/mã/trường. Hai form dùng nguyên LinkedStudentPicker, giữ bo12/padding14×12, avatar40, màu/typography/selection/checkmark, ScrollView/safe area và dismiss bàn phím như trước. Không thêm input hoặc autoFocus. Khi vào có studentId vẫn hiện con và Cố định, không mở popup. Empty/error/retry/link behavior giữ nguyên. Nhãn/chỉ dẫn tối giản, không thêm description dài.

## 9. Verification & Testing
PASS: mobile npx --no-install tsc --noEmit exit0.
PASS: npx --no-install expo export --platform all --output-dir TEMP/rts-leave-explicit-selection-export-e1fae8b4780440938d0eb2385ead58a1 exit0; output/log ngoài repository. Không application edits sau các kiểm tra này.
PASS static AST/source comparison against HEAD e00218d: sáu declarations handleRequestOtp/date handlers/currentTrip và toàn bộ GET leave-options effect giữ nguyên; list effect không gọi setSelectedStudentId; params.studentId initializer và callback chọn/clear chuyến giữ nguyên.
PASS source parity: LinkedStudentPicker, CreateAddressRequestView, useAddressRequestStudent, useLeaveOtpCooldown, leave-notices/otp.tsx, api-client.ts đều không đổi so với HEAD. Không có duplicate dropdown/modal mới.
PASS: scoped git diff --check; report13sections và task-only diff.
Skill ui-ux-pro-max quick-reference dùng cho targeted UI correction; truy vấn form explicit selection trả hướng dẫn label/submit feedback chung, không phải bằng chứng cho interaction cụ thể. Quyết định layout theo component thật và yêu cầu PO, không phát sinh design system mới.
NOT_VERIFIED: Expo Go iPhone/Android thực tế, popup tap/scroll/selection với dữ liệu xác thực, VoiceOver/Dynamic Type, bàn phím và tải ảnh. Không tạo API mock/business fixtures hoặc dữ liệu để vượt giới hạn. Không chạy browser preview mới trong task; screenshot31/10 là lịch sử, không chứng nhận lần sửa này. Mobile không có lint script cấu hình, không cài thêm lint tool. Build/static checks không thay native UAT.

## 10. Issues & Risks
Sau thay đổi phụ huynh phải chọn con rõ ràng trước khi đọc chuyến/gửi OTP, kể cả khi chỉ liên kết một con; đây là luồng PO yêu cầu giống Đổi điểm. Các policy/API về điều kiện báo nghỉ không đổi. Điểm vào cố định không bị chuyển thành chọn lại. Native acceptance còn thiếu. File mobile/.env.example và Python __pycache__ có từ trước, không sửa/xóa/stage.

## 11. Reviewer Focus
Xác nhận đúng nguyên nhân auto-first thay vì tạo UI trùng lặp. Kiểm tra không còn dependency refetch danh sách theo selectedId, retry vẫn hoạt động; no-student message chỉ dành PARENT chưa chọn. Giữ fixed entry, chính sách chọn của mỗi form, các trips/options guards, OTP/cooldown, staff branch và shared component không đổi. Không có backend/data/dependency/Git mutation ngoài yêu cầu.

## 12. Suggested Next Step
Trên Expo Go iPhone, mở Tạo báo nghỉ từ nút tạo mới rồi nhấn Chọn học sinh và đối chiếu popup/card với Tạo yêu cầu đổi điểm.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp và cấu trúc UI PO chỉ định. WAITING FOR USER REVIEW / APPROVAL. Không tự đánh dấu acceptance, chưa commit/push lần sửa này.
