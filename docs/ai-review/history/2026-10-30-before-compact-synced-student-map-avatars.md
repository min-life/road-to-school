# AI Review — Ghim giọt nước có avatar con trên bản đồ chuyến xe

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI Implementation. Status: COMPLETED for frontend; actual child-photo native acceptance NOT_VERIFIED.

## 2. Original Request
Từ Parent Home card -> Theo dõi lộ trình -> bản đồ, đổi marker điểm riêng của các con từ hình tròn ngôi sao sang giọt nước theo ảnh PO cung cấp, có avatar của đúng trẻ bên trong.

## 3. Approved Scope
User đã chỉ định hình marker và cung cấp ảnh tham chiếu, cho phép triển khai thay marker hiện có; không màn hình mới/refactor bố cục. Đã mô tả trước code: teal droplet52x66, portrait tròn, tip tọa độ, fallback và update không reload map. Chỉ mobile/docs; không backend/API contract/schema/dependencies hoặc dữ liệu học sinh/Trip. Không commit/push. V1 không chỉnh sửa; mẫu PO hiện tại là nguồn thiết kế của marker.

## 4. Analysis & Decisions
Màn app/trip/[id].tsx dùng Leaflet1.9.4 trong WebView, marker con dùng mychild-marker và ngôi sao. MobileTripDetailStop có own studentId/isMyChild nhưng chưa có avatar; GET /parents/students hiện có id/fullName/avatarUrl và backend lọc parentId. Tái dùng GET này bằng hook parent-only theo focus, ghép đúng ID và chỉ inject con khớp own stop. Không đổi API hoặc dùng ảnh phụ huynh/ảnh con đầu tiên cho mọi điểm.
Tạo SVG/DOM code-native theo reference, không imagegen/package/font mới. Leaflet divIcon hỗ trợ HTMLElement, iconAnchor neo tip [26,65], popup phía trên, padding trên82 khi có ghim. Các markers depot/school/other students/bus giữ nguyên.
Avatar là overlay DOM cập nhật qua injectJavaScript; không nằm trong snapshot/source HTML dependency nên đổi ảnh không reset camera/map/follow. Dữ liệu cũ account/role bị khóa theo identity và scope, blur/unmount hủy nhận callback. GET lỗi hoặc URL/ảnh lỗi dùng chữ cuối tên; URL chỉHTTP(S), SVG cố định, textContent/property assignments và serializeJSON escape script boundary. Không tạo giả arrival/GPS hoặc dời tọa độ để né chồng pin.

## 5. Implementation Details
Sửa3 files có sẵn:
- mobile/app/trip/[id].tsx: import hook/helper, marker riêng own PICKUP/DROPOFF, size/tip/popup/aria-label/padding; bridge ảnh riêng và onLoadEnd gửi lại navigation+ảnh.
- mobile/utils/trip-map-data.ts: thêm studentId chỉ cho isMyChild, không avatar/dynamic attendance trong source.
- docs/architecture/mobile-parent-home-ui.md: liên kết thiết kế marker.
Thêm4 files:
- mobile/hooks/use-parent-map-avatars.ts: GET readonly per-focus parent-only, identity cleanup, fallback.
- mobile/utils/child-map-marker.ts: CSS/SVG/DOM script, size và safe serialization.
- mobile/scripts/child-map-marker.test.ts:3 pure security/script tests, không business fixtures.
- docs/architecture/mobile-parent-map-markers.md: source/data/privacy/lifecycle/contract/verification và giới hạn.
Cập nhật LATEST.md/LATEST.diff task-only7files so với baseline; lưu review trước tại history/2026-10-30-before-child-avatar-map-pin.md/.diff. Các pending work khác bảo toàn.

## 6. Database Changes
None. Chỉ SELECT aggregate read-only theo DATABASE_URL local để kiểm avatar sẵn có: tài khoản phụ huynh đã cung cấp có2 con,0 avatar_url không rỗng. PGOPTIONS default_transaction_read_only=on/timeout, host loopback, không in credential/URL ảnh hoặc dữ liệu sinh trắc. Không upload/seed/tạo ảnh giả/ghi records. Đây là dữ liệu có trước; không có business test data mới.

## 7. API & Swagger Changes
None. Dùng getLinkedStudents GET /parents/students có sẵn; backend projection/Privacy Masking không đổi, API client byte-identical. Swagger N/A. Không gọi mutations/GPS publishing/routing tính phí để test.

## 8. UI/UX Changes
Own pickup/dropoff pin teal52x66, face38px cover/circle/rings theo reference; each studentId có avatar riêng. Thiếu/loading/error ảnh giữ initial, không mất marker. Ảnh không đổi giữ cùng node; ảnh đổi callback cũ không đè, ảnh thiếu xóa ảnh cũ. Aria-label điểm đón/trả+con trên wrapper Leaflet, focus ring wrapper, artwork aria-hidden. Giữ popup/navigation/route/attendance/GPS/bottom sheet và safe area. Tăng đệm fitBounds khi marker cao hơn để không cắt đầu; không tự pan khi ảnh tải. Điểm trùng tọa độ vẫn có thể chồng, chưa clustering.

## 9. Verification & Testing
PASS: final mobile npx --no-install tsc --noEmit exit0.
PASS: final29 node:test/6 suites exit0:3 mới boundary/Unicode/script syntax +26 journey tests có sẵn; transpile TypeScript sẵn có vào TEMP, không thêm dependency/business DTO/API mocks/DB.
PASS: final Expo export --platform all vào TEMP/rts-child-map-pin-final-export, iOS/Android/Web/server, exit0; log TEMP/rts-child-map-pin-final-export.log.
PASS: source parity14 existing arrow handlers/controllers và navigation JS trong map byte-equivalent; original updateMap/fetchTrip/action callbacks không đổi. Snapshot excludes avatar/dynamic fields; own-only studentId projection3 primitive bool variants kiểm chứng. SHA25611 files bảo vệ: Home, card, stage helper, API client, navigation service/hook, backend trips/parents/schema và mobile package/lockfile giữ nguyên.
PASS: Chromium IAB presentation-only marker DOM tại320/390px, shape52x66, circular face, image load, missing/error fallback, reject javascript URL, recover valid image, same URL keeps node. No horizontal overflow. Preview dùng logo repo trong khung ảnh và empty/generic component selectors, không Student/Trip records hoặc fake authenticated API responses; không chứng nhận data integration thực.
PASS: readonly actual local count2 children/0 avatars; không sửa dữ liệu.
PASS: task-only7file diff, module local links, whitespace/git diff --check; đóng tab/reset viewport/dừng preview server. Screenshot component ở C:/Users/phuon/AppData/Local/Temp/rts-child-map-pin-preview.png. Preview/source/build output ở TEMP, không để route test trong repo.
NOT_VERIFIED: physical Expo Go iPhone/Android, authenticated end-to-end avatar update, VoiceOver/native WebView camera preservation. BLOCKED_BY_TEST_DATA_POLICY cho test ảnh thật vì cả2 con local chưa có ảnh và không tự tạo/ghi dữ liệu. Không chạy suite trip-state-synchronization chứa fixture Trip giả; invariants kiểm bằng source. Mobile không có lint script/config, không cài thêm.

## 10. Issues & Risks
Avatar thiếu thì UI chỉ có initial; cần ảnh học sinh đã có hợp lệ để nghiệm thu actual-photo. Prototype screenshot dùng logo chỉ chứng minh khung ảnh, không avatar được đưa vào production. HTTP ảnh có thể bị chính sách native hạn chế, khi đó fallback; chưa thiết bị thật. API ảnh đọc theo focus, không polling5s; thay ảnh khi đang giữ màn sẽ nhận sau focus lại. Marker trùng tọa độ có thể chồng; không tự thay vị trí thật. Các popup HTML cũ nằm ngoài scope, không tuyên bố toàn bộ bản đồ được harden XSS từ task này. User phản hồi màu card Đã điểm danh trước chưa được xác nhận trên iPhone; không âm thầm thay vào task marker.

## 11. Reviewer Focus
Own-child ID join/role/identity, không lộ hoặc tải ảnh học sinh khác. Safe URL, serialize boundary, static SVG, image callbacks race. Avatar update không đổi mapData/mapSource, onLoadEnd vẫn đẩy navigation; size/tip/popup/padding hợp lệ. Không đổi operations/permissions/API hoặc tạo ảnh giả để báo PASS.

## 12. Suggested Next Step
Kiểm tra trên Expo Go iPhone với ảnh học sinh đã được cập nhật qua luồng quản lý hiện có, xem đúng ảnh từng con và pan/zoom khi ảnh tải.

## 13. Approval Status
Triển khai theo yêu cầu PO, kết quả WAITING FOR USER REVIEW / APPROVAL. Không tự thêm ảnh hoặc dữ liệu để UAT. Chưa commit/push.
