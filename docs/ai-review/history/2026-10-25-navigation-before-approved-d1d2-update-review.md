# AI Review — Vehicle Navigation & Simulation Architecture Plan

## 1. Task Information
- Date: 25/10/2026 (Asia/Saigon).
- Scope: API / Mobile / Web feasibility audit; Documentation writes only.
- Type: Analysis / Architecture / Planning.
- Status: COMPLETED planning; WAITING_APPROVAL cho giải pháp, dependency, wireframe và implementation. Không implementation trong task.

## 2. Original Request
PO yêu cầu audit khả thi VietMap/live GPS/saved-route navigation, reroute chỉ chặng hiện tại, hai nút TEST Auto/Joystick độc lập và cross-role vehicle tracking; so sánh WebView/Native/Hybrid, giảm DB/dependencies, lập wireframes/API/files/tests/cost plan. Không SDK install, code changes, migration, simulator implementation hoặc GPS publish thực tế.

## 3. Approved Scope
Nghiệp vụ đã duyệt trong prompt; giải pháp kỹ thuật chưa được duyệt. Được đọc source/docs/packages và tài liệu chính thức, kiểm tra tĩnh an toàn, tạo architecture plan/AI Review. Không được tự chọn persisted schema mới, background tracking hoặc giảm yêu cầu full turn-by-turn khi chưa hỏi PO.

## 4. Analysis & Decisions
Tài liệu đầy đủ 21 mục: [vehicle-navigation-simulation-architecture-plan.md](vehicle-navigation-simulation-architecture-plan.md).

### VERIFIED_BY_SOURCE
- Route có polyline toàn tuyến; RouteStop có order/coordinates; không per-leg geometry/directions/vehicle position/navigation target trong schema.
- Mobile thực tế là Leaflet1.9.4 trong WebView với VietMap tiles, khác mô tả MapLibre ở handoff; Web là MapLibre6.15.0.
- Route v4 adapter hiện bỏ instructions, vehicle=car; solveTSP fallback có đường thẳng, không được reuse làm LIVE detour thành công.
- Chưa có GPS watcher/location endpoints/store/socket/navigation SDK trong project.
- Expo58.0.19, RN0.88.0, React19.3.0, WebView14.0.1; expo-location chưa có dependency, Expo bundled manifest chỉ version phù hợp ~58.0.19.
- Reuse object-level Trip authorization, CurrentSessionId, existing active/visible refresh và stable map source.

### VERIFIED_BY_OFFICIAL_DOCS
- VietMap Route v4 có geometry/instructions; Native Navigation SDK có turn-by-turn, simulation và off-route callbacks. Không đồng nghĩa import chính xác saved polyline hoặc custom joystick GPS injection đã được hỗ trợ end-to-end trong repo.
- Source/registry Navigation SDK3.0.0 và Map SDK3.0.0 đã tra cứu read-only. Native docs/test baseline tới RN0.85.2, New Architecture required; Expo58/RN0.88 device/build NOT_VERIFIED.
- Changelog nói custom puck entry point nhưng public JS controller đọc được không có general GPS-provider injection/import saved route; không lấy puck movement làm proof navigation engine theo joystick.
- Expo Location docs và local bundled module version nhất quán; foreground-only watcher và development-build limitations đã đối chiếu. Native map Expo guide không chứng minh navigation SDK Expo58 build.
- Các nguồn chính thức, links và giới hạn từng nguồn ở mục3 của plan. Registry web fetch thất bại được kiểm tra lại bằng HTTP read-only; không install.

### Phương án khuyến nghị, chưa phê duyệt
Giữ WebView/Leaflet + Route API cho current detour, expo-location cho foreground LIVE, một controller cho ba sources, pure-TS Auto theo saved polyline và Joystick virtual position độc lập, REST publish≈3s/viewer poll≈5s. Một Backend RAM last-known entry/Trip nếu PO chấp nhận single-instance/restart loss. Không global state framework/WebSocket/GPS history hoặc native SDK mặc định.

TECHNICALLY_FEASIBLE_BUT_UNTESTED: hai simulator WebView, segment controller, GPS/publishing/observer marker. Không VERIFIED_BY_TEST/PASS cho feature mới. Gate sớm Auto trên thiết bị + observer khác phải đạt trong implementation trước khi tuyên bố ít nhất một mode hoạt động.

Các quyết định D1–D3 đã được hỏi qua công cụ câu hỏi: exact saved route/full TBT vs guidance có điều kiện; RAM single-instance/restart/resume vs durability/multi-instance; expo-location và foreground-only vs background scope. Chưa có câu trả lời khi soạn báo cáo; không suy diễn im lặng là đồng ý. D4/D5 trong plan nêu wireframes/mode gate/threshold/profile để review cùng giải pháp.

## 5. Implementation Details
No application code changes.
- Tạo docs/ai-review/vehicle-navigation-simulation-architecture-plan.md: 21 mục, source inventory, official feasibility, mandatory A/B/C matrix, segment invariants, two simulators/fallback, cross-role sharing, DB alternatives, 4 proposed API resources, wireframes, exact file plan, costs, UAT/open decisions.
- Cập nhật docs/ai-review/LATEST.md và LATEST.diff (no code changes).
- Lưu nguyên review/diff task sửa nhãn trước tại history/2026-10-25-schedule-status-label-fix-before-navigation-plan.md và .diff. Không ghi đè lịch sử task khác.
- Không sửa handoff/source để hợp thức hóa tài liệu cũ; đã ghi rõ source Mobile Leaflet khác handoff.

## 6. Database Changes
None trong task. Đề xuất chính có điều kiện DB-B: 0 bảng, 0 fields, 0 migrations, last-known state RAM một instance. Cross-device qua Backend, không qua React state của Driver. Restart mất state và cần resume xác nhận; nhiều instances không đáp ứng bằng Map riêng. Nếu PO cần durability/multi-instance, phải duyệt DB-C/D (ví dụ một nullable last-known JSON trên Trip hoặc shared store) trước implementation; không tự tạo field/table/infrastructure.

## 7. API & Swagger Changes
None trong task. Chỉ thiết kế, không tạo endpoint/publish coords/call Route API tính phí.
Đề xuất 4 resources trong TripsModule: GET navigation; PUT navigation/session; PUT navigation/position; POST navigation/segment. Lý do: hiện chưa có position publishing/store/read; existing detail/state không phải location stream và không nên full-poll chỉ để đổi marker. Contract scope/source/lease/seq/freshness/target/error và Swagger cần cập nhật sau duyệt ở mục13 plan.

## 8. UI/UX Changes
None trong implementation. Wireframes đề xuất trong plan: Driver LIVE panel nhỏ; Driver TEST có đúng hai nút “Tự động di chuyển” và “Lái thủ công” cùng Stop, joystick không che Bottom Sheet/Fixed Action. Attendant/Parent và hai Admin chỉ xem marker/source/age. Không stop notification/arrival popup/SMS/push/auto attendance/auto arrival/auto complete. Wireframes chưa được PO phê duyệt.

## 9. Verification & Testing
- Đã đọc context theo thứ tự và source schema/adapters/guards/modules/maps/hooks/API clients/package/lock/installed versions; git status xác nhận nhiều uncommitted changes cần bảo vệ.
- PASS static check API: npx --no-install tsc --noEmit --incremental false tại api, exit0.
- PASS static check Web: cùng lệnh tại web, exit0.
- PASS static check Mobile: cùng lệnh tại mobile, exit0.
- Đã browse tài liệu VietMap/Expo chính thức, đọc official GitHub source/package/changelog/license, GET npm registry metadata. Không gửi business coordinates, gọi route calculation hoặc dùng project key.
- Không chạy lại unit tests cũ để gắn PASS cho navigation chưa tồn tại. Không thêm tests/simulator/fixtures trong task planning.
- NOT_VERIFIED: SDK build RN0.88/Expo58, native GPS/device permissions, simulator rendering/gestures, segment reroute thực tế, actual shared marker latency, memory scaling/topology production, account license/quota/actual bill.
- NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY: future UAT cần Trip/role/route và publish/operation mutations chưa được cho phép cụ thể; kế hoạch yêu cầu PO cấp môi trường/dữ liệu hoặc tự thao tác.
- Có một số doc URLs/web fetch không truy cập được; đã dùng official links/code phù hợp khác, không coi lỗi truy cập là NOT_SUPPORTED của feature.
- Final source hash và documentation checks được thực hiện để bảo đảm không đổi implementation; không migration/install/build native/commit/push.

## 10. Issues & Risks
- Exact saved geometry và đầy đủ turn instructions không có sẵn cùng nhau trong DB; route lại endpoints có thể khác đường cũ. Chưa đủ bằng chứng cam kết full TBT trên mọi saved segment.
- Native custom puck khác custom location feeding vào engine; docs/source chưa chứng minh joystick Native SDK end-to-end. Native SDK compatibility RN0.88 chưa build.
- RAM không bền qua restart/multi-instance; không chọn zero migration bằng cách bỏ cross-device backend sharing.
- Route có thể từng được tạo bằng straight-line fallback, schema không lưu provenance. Cần kiểm tra đường hợp lệ trước LIVE UAT, không invent navigation geometry.
- Thresholds/cooldown/arrival radius/stale/TTL trong plan chỉ trial proposals, không hardcoded hoặc VERIFIED. Background/locked-phone GPS ngoài minimal scope và đã hỏi PO.
- Epoch/sequence/lease ngăn competing publishers theo đề xuất; không tuyên bố GPS anti-spoof hoặc atomic DB/RAM distributed consistency đã tồn tại.
- Không số liệu benchmark/giá key thực tế; các con số latency/load/cost là ước lượng có giả định và official pricing references.

## 11. Reviewer Focus
Saved current-leg và suffix bất biến; instructions indexes đúng geometry; không VRP/straight-line fallback; Auto/Joystick độc lập và loại trừ nhau; nguồn TEST không giả thành LIVE; scope reads/writes và observer read-only; stale/restart/target-resume; one active loop, no map remount; no business milestone mutations từ GPS. Kiểm tra các quyết định đang chờ PO không bị ghi thành approved.

## 12. Suggested Next Step
PO review plan và trả lời D1–D3 đã gửi, đồng thời duyệt wireframes/policy liên quan trước khi cấp phép implementation.

## 13. Approval Status
WAITING FOR USER REVIEW / ARCHITECTURE APPROVAL.
READY_FOR_ARCHITECTURE_REVIEW; NOT_READY_FOR_IMPLEMENTATION_APPROVAL khi các quyết định chặn D1–D3 chưa có câu trả lời. Dừng sau planning, không tự triển khai.
