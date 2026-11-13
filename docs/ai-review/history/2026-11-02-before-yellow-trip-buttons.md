# AI Review — Tự động bàn giao lái thủ công gần điểm học sinh

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION. Source hoàn tất, native/live acceptance NOT_VERIFIED. Giữ pending work trước; không commit/push.

## 2. Original Request
PO muốn Auto chuyển Manual khi xe tới gần điểm đón. Cùng lượt còn yêu cầu trước khi bị ngắt: sửa UI nút Báo sự cố theo trao đổi đưa vào tab Sự cố.

## 3. Approved Scope
Bàn giao nguồn mô phỏng TEST_AUTO→TEST_JOYSTICK gần điểm PICKUP/DROPOFF và chuyển nút báo cáo từ header vào INCIDENTS. Giữ quyền, backend, dữ liệu và Parent UI.

## 4. Analysis & Decisions
Chọn ngưỡng100m và thông báo PO trong commentary. Dùng khoảng cách địa lý hiện có giữa xe/target; chỉ điểm học sinh, không trường/bãi/GPS. Gọi change(TEST_JOYSTICK) trước ADVANCE và return, với busy/routeBusy guards. Hàm change hiện có dừng timer ngay, SWITCH qua API hiện hữu, giữ local position và geometry nếu cùng target/version/on-route; activate Manual có control zero nên chờ joystick. Không thêm session logic/backend.

## 5. Implementation Details
- mobile/utils/trip-navigation.ts: pure shouldHandOffToManual, ngưỡng0..100m, chỉ TEST_AUTO và PICKUP/DROPOFF.
- mobile/hooks/use-trip-navigation.ts: kiểm tra sau nhận sample/target, trước các nhánh routing/ADVANCE; cập nhật local position và gọi change, return.
- mobile/scripts/auto-manual-handoff.test.ts:4tests về boundary, nguồn, loại điểm, giá trị distance không hợp lệ.
- mobile/app/trip/[id].tsx: chuyển nguyên nút report và guard/onPress vào đầu ScrollView INCIDENTS; đổi styles reportIncidentButton, bỏ shadow/elevation và dùng borderRadius10/margin12 cho tab. Modal/API/permissions giữ nguyên.
- architecture addendum, LATEST.md/.diff; archive review trước tại history/2026-11-02-before-auto-manual-handoff.md/.diff. Diff riêng gồm4source/test files so với baseline task, không trộn pending work.

## 6. Database Changes
None. Không seed, record giả, migration hoặc mutation thử nghiệm.

## 7. API & Swagger Changes
None. Runtime dùng SWITCH hiện hữu, backend giữ targetStopId và tạo run mới như trước. Không gọi API side effects trong verification; không thay DTO/contract/Swagger.

## 8. UI/UX Changes
Auto tới trong bán kính100m của target học sinh sẽ dừng auto, chuyển chọn Manual và hiện joystick nếu sheet đang thu gọn. Không tự quay về Auto; driver vẫn chọn Auto bằng nút hiện có. Trường/bãi tiếp tục luồng cũ. Không tự điểm danh hoặc hoàn thành chuyến.
Báo sự cố ở đầu tab INCIDENTS khi cùng điều kiện trước: staff && (SCHEDULED || canReport). Không mở quyền báo cáo lúc đang chạy nếu API không cho phép; Parent không có nút. Disabled/error reasons và modal giữ nguyên.

## 9. Verification & Testing
RED4tests mới thất bại trước implementation vì thiếu predicate; GREEN toàn bộ44tests/10suites PASS (4handoff,33navigation hiện hữu,3joystick,4action role/status). Chỉ primitive control/geometry, không business records hoặc mock API responses.
PASS TypeScript app --noEmit exit0. PASS Expo export --platform web gồm web/server bundles exit0, output ngoài repo auto-manual-handoff-export.
PASS AST/source self-check: report onPress và eligibility guard giống baseline, button là con INCIDENTS; handoff nằm trước ADVANCE và return; toàn bộ change implementation giữ nguyên để reuse SWITCH/position preservation. PASS git diff --check.
Không chạy fake authenticated Trip/map hoặc API publisher/session để chứng minh runtime. Native, network latency/failure, vị trí thật và report modal end-to-end NOT_VERIFIED (BLOCKED_BY_TEST_DATA_POLICY khi thiếu session/dữ liệu được cấp).

## 10. Issues & Risks
Ngưỡng100m là khoảng cách địa lý, không độ dài còn lại trên đường. Nếu sheet mở rộng, joystick vẫn ẩn theo UI hiện tại cho tới khi thu gọn. SWITCH phụ thuộc mạng; khi lỗi, change hiện hữu dừng timer và hiện lỗi, không tự tiếp tục xe chạy. Cần nghiệm thu thực tế trên thiết bị. Không dependencies mới/commit/push.

## 11. Reviewer Focus
Handoff trước ADVANCE, không đổi target/điểm danh/nghiệp vụ; source manual/LIVE không kích hoạt. SWITCH giữ local position theo code hiện hữu, không reset về latestPosition DB cũ. Report chỉ đổi vị trí/style, quyền giữ nguyên.

## 12. Suggested Next Step
PO reload app, chọn Auto khi đang cách điểm học sinh trên100m và nghiệm thu xe dừng/chuyển Manual khi đến gần.

## 13. Approval Status
PO yêu cầu trực tiếp hai thay đổi; source hoàn tất, checks PASS, chờ native acceptance.
