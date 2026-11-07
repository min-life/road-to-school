# AI Review — Đổi điểm mở lịch sử trước khi tạo

## 1. Task Information
Tên task: Đồng bộ luồng tiện ích Đổi điểm với Báo nghỉ. Ngày: 30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Implementation, navigation flow adjustment. Status: COMPLETED frontend; authenticated/native acceptance NOT_VERIFIED.

## 2. Original Request
Home Báo nghỉ mở lịch sử, có nút tạo mới; Home Đổi điểm đang mở chọn học sinh ngay. PO yêu cầu Đổi điểm cũng mở danh sách trước, chỉ chọn con sau khi nhấn Tạo mới.

## 3. Approved Scope
Chỉ thị trực tiếp thực hiện luồng mới; tái sử dụng hai giao diện hiện có, không thêm nghiệp vụ/backend/API/schema hoặc dependency. Cấu trúc đã thông báo trước code: lịch sử/bộ lọc/card có tên con/Tạo mới → bộ chọn → form/OTP cũ. Không tự mở rộng thiết kế sang Báo nghỉ hoặc Hồ sơ học sinh. Giữ uncommitted work task xóa description, .env.example và cache. Không commit/push trong task mới này.

## 4. Analysis & Decisions
Home expanded/compact cùng callback /parent/change-stop; giữ callback/URL nhưng đổi nội dung route thành RequestListView tổng hợp ADDRESS_UPDATE. API chỉ có danh sách theo từng con; dùng GET linked students rồi GET yêu cầu của từng ID, không tạo endpoint mới. Backend lọc parentId và kiểm link nên chỉ lấy lịch sử của tài khoản hiện tại trên con còn liên kết. Bộ chọn cũ chuyển nguyên sang route con select-student, chỉ đổi title và destination vào form tạo địa chỉ trực tiếp. Giữ danh sách riêng từ Hồ sơ học sinh và chuyển hướng sau OTP cũ. Không ép phụ huynh chọn con để xem lịch sử hoặc tự chọn con đầu tiên.

## 5. Implementation Details
Sửa mobile/app/parent/change-stop.tsx thành thin route RequestListView (không studentId, type ADDRESS_UPDATE, createRoute select-student). Thêm mobile/app/parent/change-stop/select-student.tsx tái sử dụng controller/UI/empty cũ; onPress mở /parent/create-request/address/[studentId].
Sửa mobile/components/parent/RequestListView.tsx: optional studentId; global history khi bỏ prop, giữ single-student GET/create params khi có ID; ID rỗng báo lỗi thay vì aggregate. Thêm studentName trên card tổng hợp, nhãn a11y cho Tạo mới/minHeight44; focus refresh, generation guard và detail active flag, giữ trạng thái disabled đã biết khi cùng ID.
Thêm mobile/services/parent-request-history.ts: gộp phân trang các GET hiện có, tối đa ba child workers, page request limit<=100, newest-first/tie id; tổng total thật, clamp khi tổng trang giảm, dừng đọc trang/batch tiếp theo khi stale.
Sửa docs/architecture/mobile-parent-home-ui.md và mobile-ui-implementation-status.md, thêm mobile-parent-stop-requests.md. LATEST.diff gồm đúng7files task này, không kéo task trước vào diff. Archive review trước tại history/2026-10-30-before-stop-request-history.md/.diff.

## 6. Database Changes
None. Không SQL, seed, thay dữ liệu hoặc migrations. Không tự tạo Request/Student/linked-child fixtures để test.

## 7. API & Swagger Changes
None. API client, DTO và backend/Swagger giữ nguyên. Wrapper mới chỉ gọi GET /parents/students và GET /parents/students/:id/update-requests với page/limit/type/status hiện có. Form/OTP/confirm/cancel/approve không thay. Không thực thi API mutation để test.

## 8. UI/UX Changes
Home → Đổi điểm đón/trả: header/back/Tạo mới, status filters và lịch sử chung10items/page; mỗi card có tên học sinh, badge, địa chỉ đề xuất, resolution/time/detail cũ. Tạo mới hoặc CTA khi rỗng → chọn học sinh → form tạo đổi điểm. Back từ form về bộ chọn, rồi lịch sử, rồi Home qua push/back hiện có. Sau OTP vẫn tới danh sách riêng con như V2, không sửa OTP.
Loading/error/retry/empty/pull-refresh/focus refresh giữ và bổ sung guard chống response sai scope; không hiển thị kết quả một phần như đầy đủ khi có child GET lỗi. Không có con thì history rỗng, tạo mới mở bộ chọn có Liên kết học sinh. DISABLED vẫn thấy lịch sử khi còn liên kết nhưng không chọn tạo mới. Bộ chọn giữ maxWidth560/FlatList/safe area/ảnh cũ; không thêm input/keyboard hoặc animation. Các route riêng dùng chung view vẫn truyền studentId, giữ guard/Alert tạo yêu cầu.

## 9. Verification & Testing
PASS: final npx --no-install tsc --noEmit tại mobile, exit0.
PASS: final npx --no-install expo export --platform all --output-dir TEMP/rts-parent-stop-history-export, exit0; iOS/Android/Web/server. Log TEMP/rts-parent-stop-history-export-final.log. Cảnh báo NO_COLOR/FORCE_COLOR không chặn build; output ngoài repository.
PASS: đọc final server/_expo/routes.json, có /parent/change-stop và /parent/change-stop/select-student, không xung đột file/folder route. Hai lần kiểm manifest trước đó dùng sai đường dẫn/đọc khi export đang tái tạo thư mục nên FileNotFoundError; đã sửa đường dẫn, đợi export hoàn tất rồi kiểm thành công.
PASS: script baseline chứng minh bộ chọn mới chỉ khác title và đích tạo;13 protected files SHA256 không đổi: Home, StudentDetail (bao gồm thay đổi xóa description chưa commit), API client/backend, form/OTP/detail, hai per-student routes, Báo nghỉ và package/lock. Source checks xác nhận type ADDRESS_UPDATE/create route, GET-only wrapper, min100/max3 batch, stale guards. Đây là kiểm tra source, không nghiệm thu runtime.
PASS: git diff --check và task-only diff được rà soát; report13mục/module links kiểm tra.
Review logic phân trang: lấy top p×L từ mỗi danh sách đã sort là đủ để chọn trang chung p; không lấy riêng page p của mỗi con. Backend limit100 đã đối chiếu source.
NOT_VERIFIED: aggregate GET runtime với danh sách thực, phân trang nhiều con/nhiều trang, refresh sau yêu cầu mới, direct route/back trên Expo Go iPhone/Android/Safari/Chrome mobile, VoiceOver/chữ lớn. Không giả lập API/business fixtures hoặc gọi mutations để biến thành PASS. Không viết unit tests mirror implementation cho task này; Mobile chưa có lint script. Không tạo dữ liệu khi thiếu.

## 10. Issues & Risks
Gộp nhiều GET không có snapshot nguyên tử; total/thứ tự có thể thay đổi khi request được thêm/cập nhật trong lúc đọc. Với timestamp bằng nhau, thứ tự upstream vẫn là createdAt desc như cũ; client chỉ tie-break trong các prefix đã nhận. Số request tăng theo số con và độ sâu trang; có giới hạn3luồng, không polling liên tục. Cần task API riêng nếu muốn endpoint tổng hợp hiệu quả hơn. Rời màn không abort request đã gửi, nhưng chặn update và đọc thêm batch/page. Authenticated/native UAT chưa có. Thay đổi student profile task trước, .env.example/cache được bảo toàn.

## 11. Reviewer Focus
Không lẫn INFORMATION_UPDATE vào history Đổi điểm; không bỏ lịch sử con DISABLED còn linked; không đọc con ngoài quyền hoặc lịch sử parent khác. Kiểm tra top-K merge/global pagination/total và xử lý GET lỗi không trả thiếu. Kiểm tra optional studentId không làm hỏng per-student routes, empty-ID error, focus cleanup/generation và available guard của selector. Home callback/form/OTP/approval/cancel backend giữ nguyên.

## 12. Suggested Next Step
Kiểm tra trên Expo Go iPhone luồng Trang chủ → Đổi điểm → Tạo mới → chọn con → form và quay lại lịch sử trên dữ liệu hiện có.

## 13. Approval Status
Implementation theo yêu cầu mới nhất của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push; không tự đánh dấu nghiệm thu thiết bị hoặc nghiệp vụ OTP.
