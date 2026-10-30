# AI Review — Ghim nhỏ và avatar học sinh đồng bộ

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI Fix / Implementation. Status: COMPLETED frontend; actual native student-photo acceptance NOT_VERIFIED.

## 2. Original Request
Đảm bảo lấy avatar học sinh, giảm ghim bằng kích thước icon Parking/các icon khác. PO bổ sung đồng bộ avatar với các trang khác có avatar học sinh.

## 3. Approved Scope
Tiếp tục task marker đã được PO chỉ định. Chỉ thu nhỏ marker và tăng độ tin cậy nguồn ảnh/polling/fallback theo hồ sơ học sinh hiện có. Không thay ảnh hồ sơ, records/DB/backend/API contract/permissions hoặc cài dependency. Không refactor các view khác, không commit/push. Thay kích thước component có sẵn theo chỉ thị trực tiếp, không màn hình mới hoặc refactor bố cục cần wireframe mới; đã báo size và quy tắc trước code.

## 4. Analysis & Decisions
Ảnh StudentCard ở Theo dõi lấy getLinkedStudents -> student.avatarUrl; detail lấy linkedStudentDetail.avatarUrl; Home lấy studentAvatar từ cùng Student.avatarUrl. Marker tiếp tục đọc cùng nguồn authoritative GET /parents/students và ghép studentId, không lấy ảnh phụ huynh/snapshot/ảnh con đầu tiên. Chữ dự phòng đổi từ cuối tên sang chữ đầu như StudentCard/student detail/Home; thiếu tên dùng H như các trang học sinh. Các view khác không cần sửa nguồn hoặc UI.
Thu ghim52x66 xuống24x30, face18px; SVG giữ hình giọt nước theo reference, CSS/portrait/anchor tính từ cùng childMapPinSize, tip tại[12,30*65/66]. Parking CSS cũ đo32x32, trường34x34 tính cả border: pin mới có chiều cao tương đương, không quá lớn. Pseudo-element trong suốt44x44 giữ vùng click rộng, không phóng hình. FitBounds trở về padding50px cũ.
Hook dùng useActiveRefresh đã có: focus-immediate và20s khi foreground, không overlap/callback stale. Temporary GET error giữ last-good, thử lại nhịp sau;401/403/404 xóa ảnh và dừng đến focus. Mỗi lần đọc thành công tăng UI revision, bridge có dependency này để retry ảnh lỗi dù URL không đổi. DOM chỉ retry khi pin.failed; ảnh đang tải/đã tải cùng URL giữ node, không reload liên tục. Revision không là timestamp nghiệp vụ, không tạo event mới. Avatar không nằm mapData/mapSource, camera/zoom giữ.
Đọc local aggregate sau thay đổi:2 con linked,0 avatar_url; không thể cam kết có ảnh thật khi hồ sơ chưa có, nhưng fallback nay đồng bộ view khác. Không tự thêm ảnh.

## 5. Implementation Details
Sửa5 files hiện có:
- mobile/utils/child-map-marker.ts: dimensions24x30/portrait18/touch extension, first initial, failed flag/retry cùng URL.
- mobile/hooks/use-parent-map-avatars.ts: dùng shared active refresh20s/identity/isCurrent/revision, giữ last-good hoặc clear khi mất quyền.
- mobile/app/trip/[id].tsx: đọc children/revision từ hook, bridge dependency revision, tip scale đúng, bỏ padding lớn/hasChildPins đã không cần.
- docs/architecture/mobile-parent-map-markers.md: size/source matching matrix/poll/retry/fallback/limits/verification mới nhất.
- docs/architecture/mobile-parent-home-ui.md: liên kết hiện trạng compact/sync.
Cập nhật LATEST.md/LATEST.diff task-only5files theo baseline, lưu review trước tại history/2026-10-30-before-compact-synced-student-map-avatars.md/.diff. Không thêm test files/dependencies và không sửa các pending work khác.

## 6. Database Changes
None. Chỉ SELECT aggregate readonly trên local cấu hình backend, PGOPTIONS default_transaction_read_only=on và timeout, host loopback, không lộ credential/URL ảnh:2 children,0 with_avatar. Không upload ảnh giả/seed/ghi dữ liệu. Không gọi API mutation.

## 7. API & Swagger Changes
None. API client/backend/schema giữ nguyên; dùng GET /parents/students như Theo dõi. Thay cadence đọc ảnh foreground20s, không thêm endpoint/contracts; Swagger N/A. Operational/GPS polling5s không đổi.

## 8. UI/UX Changes
Visual pin24x30, round avatar18, typography10, shadow nhỏ. CSS vùng nhận nhấn44x44, marker coordinates/stop order/popup giữ. Initial cùng quy tắc chữ đầu tên, không dùng hình logo làm production avatar. Reload ảnh không đổi map source/zoom/pan/follow. Native field/current data vẫn là Student.avatarUrl, không thay ảnh các trang khác hoặc avatar phụ huynh.

## 9. Verification & Testing
PASS: final mobile npx --no-install tsc --noEmit exit0.
PASS:29 node:test/6 suites exit0,3 serializer/script tests +26 journey tests hiện có; transpile installed TypeScript vào TEMP, không fake Student/Trip/API/DB.
PASS: Expo export all iOS/Android/Web/server vào TEMP/rts-small-synced-map-avatars-export, exit0; log TEMP/rts-small-synced-map-avatars-export.log.
PASS: Chromium presentation component320/390px đo pin24x30/portrait18, touch pseudo44x44, no horizontal overflow; so với Parking32x32/school34x34 từ CSS cũ. Fallback H; payload empty xóa toàn bộ ảnh cũ và giữ initial.
PASS: static image404 ban đầu sau khi asset local có lại vẫn cùng URL, bridge retry tạo node mới/tải thành công/photo visible/initial hidden. Good URL repeated retains same node. Chỉ static logo repo + generic component selectors, không DTO nghiệp vụ hoặc fake authenticated API responses, không claim ảnh học sinh thật.
PASS: source parity14 controllers/callbacks và navigation JS giữ nguyên. SHA25613 files bảo vệ StudentCard/student-detail/UserAvatar/Home/API/map snapshot/navigation/backend/schema/package/lock giữ nguyên. Module links/task diff/whitespace/git diff --check.
PASS: actual readonly local aggregate2 children/0 avatar, no writes. Preview tab đóng, viewport reset, own server dừng, không repo preview route; screenshot C:/Users/phuon/AppData/Local/Temp/rts-compact-student-pins-preview.png.
NOT_VERIFIED: authenticated API profile polling và native Expo iPhone/Android/VoiceOver/map-camera preservation. BLOCKED_BY_TEST_DATA_POLICY để nghiệm thu ảnh học sinh thật khi local chưa có ảnh; không tự tạo ảnh/học sinh để ép test. Lint Mobile không có script/config, không cài tool.

## 10. Issues & Risks
Không thể hiển thị ảnh thật nếu avatar_url NULL/URL ảnh không truy cập được. Shared source là đồng bộ hồ sơ theo ID, không global new shared-store; refresh có latency request/tải ảnh và chỉ active, không hứa tức thời/offline. Marker trùng tọa độ vẫn chồng như cũ. Extra GET mỗi20s khi map foreground, không role staff/background. Ảnh lỗi liên tục chỉ được thử lại theo bridge refresh nhịp chậm, không vòng lặp nhanh. Native UAT chưa có.

## 11. Reviewer Focus
Source Student.avatarUrl/own studentId/identity giữ privacy; never use parent avatar or first-child fallback. Revision chỉ metadata để retry ảnh lỗi, không đưa vào mapSource. Keep good node and clear/retry failed node race safely. Geometry/anchor scaling và44px hitbox không đổi point coordinates. Không sửa profile view behavior hoặc create data.

## 12. Suggested Next Step
Kiểm tra trên Expo Go iPhone sau khi học sinh có ảnh hồ sơ hợp lệ qua luồng quản lý hiện có, đối chiếu ảnh giữa Theo dõi/chi tiết/Home và bản đồ.

## 13. Approval Status
Triển khai theo hai yêu cầu mới nhất của PO. WAITING FOR USER REVIEW / APPROVAL. Không sửa dữ liệu hồ sơ và chưa commit/push.
