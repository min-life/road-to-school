# AI Review — Đồng bộ màu card với tag trạng thái học sinh

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI Fix / Implementation. Status: COMPLETED.

## 2. Original Request
Đồng bộ màu status tag ở header với viền và màu card giống Chưa điểm danh đã làm.

## 3. Approved Scope
PO yêu cầu trực tiếp chỉnh màu component hiện có. Đồng bộ theo studentStatus (tag Chưa điểm danh/Đã điểm danh/Chưa xuống/Đã xuống/Vắng), không đổi mapping nghiệp vụ hoặc global trip status. Không màn hình mới/refactor bố cục nên không cần wireframe mới; đã nêu trước sửa rằng viền và nền header dùng màu tag, phần chi tiết trắng. Không backend/API/DB/dependency/commit/push.

## 4. Analysis & Decisions
ParentTripCard trước chỉ có attentionCard/attentionSummary màu warning cho UNMARKED; expandedCard mặc định border vàng. Lấy cardTone từ journeyTones[studentStatus.tone] dùng chung với badge. Root dùng cardTone.border sau expandedCard để không bị màu vàng ghi đè; summary dùng cardTone.bg. Student tone ưu tiên hơn attention; thiếu studentStatus giữ attention warning như cũ, không có cả hai giữ default. Không đổi constant colors hoặc thêm mã HEX.
Mapping: Chưa điểm danh=warning/vàng; Đã điểm danh=info/xanh dương; Chưa xuống xe=purple/tím; Đã xuống xe=success/xanh lá; Đã báo nghỉ/Vắng mặt=danger/đỏ. Có tone neutral khi caller dùng thì cũng đồng bộ.
Theo mẫu Chưa điểm danh hiện tại, nền tint chỉ áp dụng header, phần chi tiết trắng để dễ đọc. Tag trạng thái chuyến và cảnh báo sự cố giữ semantic màu riêng, không ghi đè màu theo tình trạng riêng con. Tái dùng ui-ux-pro-max: focused ux search status color distinction, Color Only guidance phù hợp; giữ chữ/icon cùng màu nên không chỉ dựa vào màu.

## 5. Implementation Details
Sửa3 files:
- mobile/components/parent/trip-card.tsx: derive cardTone, đồng bộ root border/header background, bỏ2 styles attention riêng không còn dùng; giữ props attention fallback.
- docs/architecture/mobile-parent-student-journey.md: bảng màu card/tag, thứ tự ưu tiên, mở/đóng và contract component.
- docs/architecture/mobile-parent-home-ui.md: ghi nhận quy tắc màu hiện hành.
Cập nhật LATEST.md và task-only LATEST.diff3files theo baseline trước task; lưu review trước tại history/2026-10-30-before-parent-card-status-colors.md/.diff. Không sửa các pending work khác hoặc thêm test files.

## 6. Database Changes
None. Không kết nối/ghi DB, seed hoặc tạo test business records/fixtures.

## 7. API & Swagger Changes
None. API/backend/permissions giữ nguyên, Swagger N/A.

## 8. UI/UX Changes
Viền card gồm viền trái4px và nền summary đồng bộ tone tag con ở collapsed/expanded. Cố định borderLeftWidth4, padding/gap/size/fonts không đổi, nên thay màu không thay bề ngang. Chi tiết surface trắng, nhãn/icon trạng thái/ảnh/nút/chevron và tag chuyến/sự cố giữ nguyên. Hiệu ứng mở/đóng, pressed opacity, focus/accessibility/safe area/keyboard không đổi. Không thay vị trí bus hoặc các trường hợp đã chốt.

## 9. Verification & Testing
PASS: mobile npx --no-install tsc --noEmit exit0.
PASS: kiểm chứng style thực trích TypeScript AST của component, dùng React Native Web StyleSheet hiện có để merge đúng thứ tự:48 tổ hợp6tones x expanded x pressed x attention. Root border bằng badge border, summary bg bằng badge bg; expanded không ghi đè vàng, left border4px và root surface trắng, pressed opacity đúng. Thêm4 tổ hợp không studentStatus xác nhận fallback attention/default không đổi. Inputs chỉ tone/booleans trình bày, không Student/Trip DTO/mock API/business data.
PASS: AST parity useEffect animation, onPress/onLayout và accessibility props với baseline trước task. SHA25610 files bảo vệ Home/mapping/bus/palette/styles/API/telemetry/tests/backend/schema giữ nguyên.
PASS: task-only diff3files,13 mục review và git diff --check.
NOT_VERIFIED: render trình duyệt và thiết bị Expo iPhone/Android, tương tác native thực tế. Kiểm style qua RN Web không được coi là kiểm ảnh/native UAT. Không chạy lại26 pure journey tests hoặc export vì thay đổi chỉ style, mapping/import/dependencies không đổi và tests đó đã PASS task trước; không thêm tests mirror implementation. Mobile không có lint script/config, không cài mới.

## 10. Issues & Risks
Màu chủ đạo theo tag con, có thể khác màu tag chung Đang di chuyển/Chờ khởi hành hoặc sự cố vì các tag phản ánh khía cạnh khác nhau; giữ ý nghĩa riêng thay vì sửa trạng thái. Khi không có studentStatus, fallback expanded vàng trước đây vẫn giữ cho tương thích. Chưa native UAT; không thay đổi đã chứng minh nào ngoài màu hoặc tự nhận animation thật đã được chạy.

## 11. Reviewer Focus
Thứ tự style: cardTone border đứng sau expandedCard; background tint cùng palette với badge. Không attention warning ghi đè purple/success/info/danger. Border width cố định; preserve white details, callbacks/accessibility và API/rail.

## 12. Suggested Next Step
Kiểm tra các màu trạng thái và thao tác mở/đóng card trên Expo Go iPhone.

## 13. Approval Status
Triển khai theo chỉ thị PO. WAITING FOR USER REVIEW / APPROVAL kết quả; chưa commit/push.
