# AI Review — Đọc mã nguồn Mobile

## 1. Task Information
- Date: 01/11/2026, Asia/Saigon.
- Task: Đọc toàn bộ code mobile. Type: Analysis / source familiarization.
- Checkout: D:\project\app-dua-don-ver2\road-to-school.
- Branch verified: kietdm/mobile/refactor-ui. Working tree sạch trước task.
- Status: COMPLETED cho lập bản đồ source và đọc các luồng chính; không phải chứng nhận audit từng dòng hoặc nghiệm thu runtime.

## 2. Original Request
Người dùng thu hẹp yêu cầu từ đọc toàn bộ dự án sang đọc toàn bộ code mobile.

## 3. Approved Scope
Đọc mobile, cấu hình, cấu trúc test và tài liệu nền tảng. Không triển khai tính năng, sửa application code, backend, DB, cài package hoặc thao tác Git ghi. Báo cáo này được lưu theo AGENTS.md và WORKING_RULES.md.

## 4. Analysis & Decisions
Thư mục chat chỉ có .git; xác minh checkout thực có mobile ở đường dẫn trên (memory chỉ dùng để tìm checkout, sau đó kiểm tra filesystem thực tế).

Inventory/parser đã duyệt 148 file .ts/.tsx, 27.377 dòng tính bằng split newline, gồm expo-env.d.ts local; không tính node_modules/.expo. Đọc trực tiếp các phần lõi và dùng AST để lập danh sách hàm/call sites, đọc logic các nhóm màn hình/component; các phần JSX/style lặp được khảo sát cấu trúc, không coi đây là kiểm định từng dòng giao diện.

- Stack hiện tại từ package.json: Expo ~58.0.19, React 19.3, RN 0.88, Expo Router, TypeScript strict; không tự lấy phiên bản từ snapshot cũ.
- Root: theme → AppAlertRoot → AuthProvider → OnboardingProvider → NotificationsProvider → navigation. Guard theo phiên, onboarding và vai trò; role splash sau manual login.
- Auth/API: access/refresh pair trong SecureStore (web localStorage), timeout, single-flight refresh và retry 401; upload avatar timeout riêng 60s. Auth context khôi phục phiên, logout và network banner.
- Vai trò: PARENT có Home/Theo dõi/Cá nhân; DRIVER/BUS_ATTENDANT có Home/Lịch/Cá nhân. Explore bị ẩn. Ẩn tab không thay thế phân quyền server.
- Staff: Home, lịch tuần, chi tiết chuyến, readiness/start/arrive/complete theo operational capabilities từ server. Attendant điểm danh PRESENT/ABSENT/UNMARKED, lý do vắng, alighting, camera QR + xác minh server và xác nhận riêng.
- Trip detail: polling 5s, metadata 20s, pause quanh mutation và invalidation scope; terminal đọc lịch sử vị trí. Màn tập trung nhiều trách nhiệm trong app/trip/[id].tsx.
- Navigation: useTripNavigation quản lý foreground GPS LIVE, TEST_AUTO/TEST_JOYSTICK, run/version/sequence, segment/guidance, publish, retry, resume. Không bật background location trong app.json.
- Maps: bản đồ chuyến/tuyến dùng Leaflet trong WebView; picker dùng MapLibre GL trong WebView và VietMap REST autocomplete/place/reverse; child marker/avatar riêng. Không phải bản đồ native react-native-maps.
- Parent: liên kết con bằng mã/QR + OTP, hồ sơ/lịch/tuyến, yêu cầu thông tin hoặc địa chỉ + OTP, lịch sử/hủy đơn. RequestListView dùng chung; lịch sử nhiều con được tổng hợp phía client.
- Parent Home: thẻ riêng studentId/tripId, trạng thái/giờ theo child attendance/alighting và trip operation. Rail hiện tại minh họa mốc nghiệp vụ bằng journeyStagePosition; không phải tiến độ GPS hay ETA động. Telemetry dedup tripId, operation/incidents 5s và detail 5s khi chờ/20s khi chạy.
- Leave: chọn con/ngày/chiều/chuyến hợp lệ → request OTP → confirm → lịch sử/hủy; staff có lifecycle phân công thay thế. Cooldown parser theo thông báo server và deadline cho form tạo.
- Incident: báo thiếu nhân sự, xem lịch sử/chi tiết, attendant giải trình OFF_ROUTE/LATE_STOP.
- Notifications: polling summary 15s, inbox 20s, target resolver và giới hạn mobilePath, native push lazy import và tắt tích hợp push trên Expo Go/web.
- UI dùng chung: theme kem/vàng, keyboard scroll riêng native/web, safe area, reduced motion, custom alert FIFO và modal host, nút gọi kiểm tra phone.
- Tests: 16 file node:test/assert, gồm helpers thật và một số specification/model tests lặp mô hình xử lý; không đồng nhất test mô hình với kiểm chứng hook/UI thật.

## 5. Implementation Details
No application code changes.
Documentation only: lưu bản LATEST.md/.diff trước task tại history/2026-11-01-before-mobile-code-reading.md/.diff; cập nhật LATEST.md và LATEST.diff. Không sửa memory, env hoặc dependencies.

## 6. Database Changes
None. Không query DB, seed hay tạo dữ liệu.

## 7. API & Swagger Changes
None. Không gọi API hoặc thực hiện mutation để thử nghiệm; chỉ đọc mobile contracts/call sites. Không kiểm chứng backend enforcement hoặc Swagger runtime.

## 8. UI/UX Changes
None. Không dựng preview hay thay đổi UI. Đã đọc luồng, component và xử lý keyboard/alert/navigation; không nghiệm thu visual.

## 9. Verification & Testing
- PASS: git status --short trước task không có output; branch thực tế như mục 1.
- PASS: inventory/AST traversal các file TypeScript/TSX để khảo sát source và call sites.
- PASS: mobile/node_modules/.bin/tsc.cmd --noEmit, exit 0, không diagnostics. tsconfig loại scripts nên kết quả này không chứng minh các test file chạy được.
- NOT_VERIFIED: chạy 16 test suites, Expo export/build, thiết bị Android/iPhone, camera, GPS, push, bàn phím, authenticated transitions và luồng nghiệp vụ qua backend.
- Không cài dependencies, start server, seed, POST/PATCH/PUT/DELETE runtime hoặc giả response để báo PASS.

## 10. Issues & Risks
Các điểm dưới là ghi nhận tĩnh cần kiểm tra sâu, chưa phải kết luận khai thác hoặc bug đã tái hiện:
- Tài liệu CURRENT_STATE/HANDOFF có nhiều snapshot lịch sử về branch/features/tests; source và git hiện tại mới là bằng chứng implementation.
- Trip detail rất lớn; test hình học/model không đảm bảo lifecycle, request ownership và native behavior của hook/screen hoạt động đúng trên thiết bị.
- Register truyền password/confirmPassword qua router params sang OTP; cần xem lại bề mặt lưu navigation state/URL của web nếu audit bảo mật.
- Trip/route map còn fallback tile key trong source và popup HTML từ dữ liệu; cần đánh giá cấu hình, HTML escaping và WebView boundary riêng, không đưa key vào báo cáo.
- Mobile client không chứng minh được authorization/privacy backend; chưa audit backend trong task này.
- Không kết luận app sạch lỗi hoặc production-ready từ typecheck.

## 11. Reviewer Focus
Đối chiếu mobile contracts với API thật; scope từng user/trip/child và late responses; navigation lifecycle/capabilities; OTP/navigation data; HTML trong WebView; kiểm thử thực trên thiết bị. Phân biệt test gọi helper thật với test mô phỏng lại implementation.

## 12. Suggested Next Step
Người dùng chỉ định màn hình hoặc luồng mobile cần phân tích/sửa tiếp để làm đúng phạm vi.

## 13. Approval Status
Đã thực hiện yêu cầu đọc/khảo sát source. Chưa có phê duyệt thay đổi application code. Không tự chuyển sang triển khai.
