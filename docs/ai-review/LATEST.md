# AI Review — Kiểm kê màn hình và chuẩn bị sửa luồng nghiệp vụ mobile

## 1. Task Information

Task cập nhật chi tiết docs mobile theo các màn hình đã triển khai. Ngày 05/11/2026, Asia/Saigon. Scope Documentation, type Analysis và Documentation Implementation, status COMPLETED. Nhánh dongnnp/mobile/refactor-ui tại f075db4cdec5746aa287c29c150238f58d2195ef. Backend đã merge tại 41cf3b072cf1430f0f0071add4b131a1bc0fe6d0. Mốc branch/backend kế thừa bản audit ngay trước task này.

Ngày 13/11/2026, PO yêu cầu commit phần đã hoàn thành. Đã rà diff và phạm vi 12 file docs đang chờ, gồm audit backend, bản đồ màn hình, các chỉ mục và review/history. Commit local dùng thông điệp `docs(mobile): document implemented screens and backend integration flows`.

## 2. Original Request

PO yêu cầu cập nhật docs chi tiết hơn, bao gồm các màn hình đã implement để chuẩn bị sửa luồng nghiệp vụ mobile.

## 3. Approved Scope

Đọc source mobile, components/hooks/context/API client và DTO/service liên quan để mô tả implementation hiện tại. Bổ sung screen inventory, đường vào/ra, controls, API/params, form/popup, refresh, nghiệp vụ theo role, khoảng cách với backend và tiêu chí nghiệm thu. Đầu ra là tài liệu local. Các batch sửa mobile được ghi là đề xuất chờ giao task.

## 4. Analysis & Decisions

Kiểm kê 40 file TSX trong mobile/app, phân loại 33 entry nghiệp vụ và 7 entry hạ tầng/fallback/mẫu. Entry dùng chung, wrapper và redirect được ghi riêng để tránh hiểu là 33 màn độc lập. Source là căn cứ xác định UI/handler đã có, còn runtime, thiết bị và acceptance đa vai trò được ghi ở mức cần xác minh.

Phân tích Auth/Root, Home ba role, Profile/Notifications, Parent Tracking/Link/Profile/Route/Schedule, Leave history/create/OTP/detail và lối báo nghỉ nhanh, Update information/address/history/detail/OTP, Trip theo role/tab, navigation và incidents. Đọc cả các lời gọi gián tiếp qua component, hook và provider.

Ghi rõ các khác biệt thực tế khi giao task sửa. Picker Báo nghỉ truyền policy riêng, Đổi điểm mặc định AVAILABLE. Quick leave đi trực tiếp OTP sau xác nhận. Update OTP thành công về lịch sử theo con/type. Auth/link/leave/update có TTL/resend khác nhau. Password UI Profile tối thiểu 8 ký tự, auth DTO tối thiểu 6. Một số màn tải bằng mount/effect, lịch sử yêu cầu đã focus-aware. Route kế hoạch và Trip snapshot có nguồn dữ liệu riêng. Các khác biệt này được đưa vào SF-01–SF-07 để PO chốt hoặc UAT khi sửa.

## 5. Implementation Details

No application code changes.

- Tạo [mobile-screen-business-flows.md](../architecture/mobile-screen-business-flows.md) với bảng từng route/source, role, controls, params/API, hành trình xuyên màn, chiều đi/về, 13 nhóm popup/form, refresh matrix, SF-01–SF-07, 6 đợt giao việc liên kết M-01–M-10 và acceptance theo role.
- Bổ sung bảng ánh xạ screen IDs vào [backend sync](../architecture/mobile-backend-sync-2026-11-05.md), giữ các contract và BE dependencies đã phân tích trước.
- Cập nhật mục kiểm kê và đường tra cứu trong [UI status](../architecture/mobile-ui-implementation-status.md), [implementation README](../implementation/README.md) và [source map](../implementation/source-map.md).
- Lưu review trước nguyên bản tại [history MD](history/2026-11-05-before-mobile-screen-flows.md) và [history diff](history/2026-11-05-before-mobile-screen-flows.diff). Cập nhật LATEST.md và [LATEST.diff](LATEST.diff) cho task tài liệu này. Diff gồm đúng 5 tài liệu nội dung, so với snapshot đầu task, bao gồm file audit đang untracked từ task trước.

Ghi chú mobile-parent-student-journey.md và các history của task audit backend là thay đổi có sẵn trước lượt này.

## 6. Database Changes

None.

## 7. API & Swagger Changes

None. Tài liệu tham chiếu các API hiện có qua client/DTO/service. Runtime API và Swagger được ghi NOT_VERIFIED trong lượt tài liệu này.

## 8. UI/UX Changes

None. Danh mục mô tả các màn hiện có cùng form/modal và các đặc điểm safe area, keyboard, picker, alert, tab/role. Các đề xuất workflow và acceptance nằm trong backlog. Wireframe cho task code UI tiếp theo cần theo quy tắc phê duyệt của repository.

## 9. Verification & Testing

- PASS kiểm tra trước commit ngày 13/11/2026, `npx --no-install tsc --noEmit` tại mobile exit 0, `git diff --check` với docs trừ các bản diff lưu trữ và parse LATEST.diff. Diff api/mobile/web rỗng, toàn bộ 12 file chờ commit thuộc docs.
- PASS `npx --no-install tsc --noEmit` tại mobile, exit 0. Đây là kiểm tra kiểu baseline hiện tại.
- PASS kiểm kê 40/40 file route mobile/app được tham chiếu, 33 mã entry nghiệp vụ duy nhất, 7 entry hỗ trợ và 13 nhóm form/popup.
- PASS kiểm tra 93 relative links trong các phần docs mới/thay đổi, tất cả đích local tồn tại.
- PASS SHA256 của 545 tracked files api/mobile/web trùng snapshot đầu task, kiểm soát source/config/dependencies.
- PASS đối chiếu tĩnh màn hình với navigation/API/hooks/providers, phân biệt wrappers, legacy history render thật và redirect.
- PASS kiểm tra whitespace trên 5 tài liệu nội dung và LATEST.md, `git diff --check` trên các file tracked liên quan, `git apply --numstat docs/ai-review/LATEST.diff` xác nhận patch hợp lệ với đúng 5 tài liệu. HEAD trùng baseline, review có đủ 13 mục.
- NOT_VERIFIED hành vi thực tế iPhone/Android, deep links, keyboard/native permissions, OTP delivery/TTL, GPS, Swagger đang chạy và UAT nhiều vai trò. Task này xác minh source và tài liệu.
- BLOCKED_BY_TEST_DATA_POLICY đối với các ca acceptance cần tạo/chỉnh dữ liệu, gửi OTP hoặc mutation mà chưa được cấp dữ liệu/quyền riêng cho bước kiểm thử. Các ca này được ghi thành checklist cho task sửa sau.

Validator ban đầu đếm lặp các screen IDs ở bảng tham chiếu tiếp theo. Đã giới hạn bộ đếm nghiệp vụ vào bảng inventory và đếm unique support IDs, sau đó chạy lại đạt các số liệu ở trên.

## 10. Issues & Risks

Sáu BE dependencies từ bản audit vẫn cần chốt khi tích hợp, đặc biệt incident options/vòng đời, canCancelLeave và capability start khác guard thực thi. Các SF ghi sự khác biệt hoặc nhu cầu kiểm chứng, chưa kết luận tất cả là bug runtime. Mô tả quyền/disabledReason phải tiếp tục dựa response và service thực, tránh đồng nhất policy giữa các form chỉ vì chúng dùng chung UI.

Sáu đợt triển khai là thứ tự đề xuất theo contract và phụ thuộc hiện có. Source tại snapshot xác nhận có handler, mức hoàn thiện thực tế từng flow còn cần UAT trên môi trường được cấp.

## 11. Reviewer Focus

Kiểm tra độ phủ 40 file route, 33 entry nghiệp vụ gồm wrappers/compatibility, 7 entry hỗ trợ và 13 nhóm form. Rà quick leave khác form đầy đủ, eligibility picker, payload snapshot/challenge khi OTP resend, success destination, refresh mount/focus và privacy theo con. Đối chiếu Trip role/tab, outbound undo trước school-arrival, return boarding trước start, alighting riêng và admin finalization. Các mục đã có/cần sửa/UAT phải tiếp tục phân biệt rõ.

## 12. Suggested Next Step

Giao đợt 1 M-01 để đồng bộ nhãn, types và fallback sự cố trên Home, Trip và hai màn Sự cố theo contract đọc đã kiểm kê.

## 13. Approval Status

PO đã yêu cầu commit local ngày 13/11/2026. Các batch sửa source tiếp tục ở trạng thái WAITING FOR USER REVIEW / APPROVAL để PO giao triển khai.
