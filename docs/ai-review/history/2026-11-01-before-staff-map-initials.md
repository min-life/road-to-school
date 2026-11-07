# AI Review — Đồng bộ map Staff, giữ Parent

## 1. Task Information
Date01/11/2026 Asia/Saigon. Branch kietdm/mobile/refactor-ui. Scope Mobile UI. Type Implementation. Status COMPLETED frontend; native integration NOT_VERIFIED.

## 2. Original Request
PO xác nhận Parent hiện tại là mẫu giữ nguyên và duyệt thực hiện code đồng bộ Driver/Bus Attendant theo wireframe, giữ chức năng riêng theo role.

## 3. Approved Scope
Staff marker appearance và footer/sheet gap. Không thiết kế lại Parent, không sửa quyền/data/API/DB/GPS/điểm danh, không commit/push. Giữ StaffTripCard và các report pending trước task. Đã đọc AGENTS/current source, đối chiếu các quyết định của chat và wireframe được duyệt.

## 4. Analysis & Decisions
Giữ renderer Trip chung, thêm staff-only marker branches; không tách lại cả map/controller. Staff pickup/dropoff dùng số thứ tự trong chính pin SVG/CSS Parent. Trích SVG thành constant để tái sử dụng nhưng đảm bảo các export parent CSS/script/size không đổi byte nào. Staff school/bus dùng outlineSVG tĩnh, Parent emoji và marker con giữ nguyên. Parking P giữ như cũ.

Footer cũ chừa74+inset kể cả Attendant IN_PROGRESS không có nội dung, trong khi thanh cao theo nội dung. Helper mới khớp chính xác các nhánh render có sẵn; onLayout đo tổng chiều cao footer (đã gồm safe area/border), sheet dùng số đo trực tiếp. Parent không có footer/offset như trước. Nội dung thao tác/capabilities không đổi.

## 5. Implementation Details
- mobile/app/trip/[id].tsx: marker flag/staff script/icon/size/anchor, memo dep role boolean; state đo footer và onLayout; bỏ constant74, sửa footer visibility theo helper. Parent layout style không đổi.
- mobile/utils/child-map-marker.ts: export mapPinSvg, innerHTML parent dùng giá trị trích nguyên bản.
- mobile/utils/staff-map-marker.ts: numbered DOM pin + fixed school/bus SVG.
- mobile/utils/trip-map-layout.ts: pure footer role/status predicate.
- mobile/scripts/trip-map-layout.test.ts và staff-map-marker.test.ts:8newtests, không business fixtures.
- docs/architecture/mobile-staff-map-alignment.md: source/behavior/limits.
- LATEST.md/.diff và archive history/2026-11-01-before-staff-map-implementation.md/.diff; task diff không gồm StaffTripCard pending từ task trước.

## 6. Database Changes
None. Không DB/API queries, records, seed hoặc mutations.

## 7. API & Swagger Changes
None. Giữ canPublish/capabilities/QR/readiness/actions/session/tracking. Mobile rendering không phải bằng chứng server authorization mới.

## 8. UI/UX Changes
Chỉ Staff: pin số có cùng silhouette/size/anchor Parent child pin; accessibility stop label; SVG school/bus thay emoji cho Staff. Icon circle thực30×30 bằng staff-only border-box, không sửa school-marker Parent. Parent giữ nguyên avatar/photo initials, own-child filtering, school/bus/parking và pin CSS/script values.

Staff sheet nằm trên footer theo kích thước thực; Attendant running/terminal không footer trống. Parent vẫn bottom0, cùng COLLAPSED_HEIGHT/EXPANDED_HEIGHT/padding và các styles như trước. Không đổi callbacks hoặc nội dung footer và không thêm thao tác mô phỏng vào production.

## 9. Verification & Testing
RED: footer test chạy trước helper, thất bại MODULE_NOT_FOUND như dự kiến. GREEN:11/11 tests/3suites bằng node:test/assert + TypeScript đã cài (4footer+4staffmarker+3existingchildboundary), exit0. Test chỉ enum/text/DOM primitives; scripts nằm ngoài app tsconfig nên test execution được báo riêng. Test DOM dùng type rõ ràng, không recursive inferred-any.
PASS app TypeScript --noEmit, exit0 sau app changes cuối.
PASS Expo export --platform all exit0 trên source cuối (staff-map-export-final ngoài app repo):Android/iOS/web/server; không native build/APK.
PASS baseline module equality parent childMapPinCss/childMapPinScript/childMapPinSize exact; operation handlers/fetchTrip/canScanQr/capabilities/mapSource/mapUpdate/updateMap/avatars unchanged theo AST. Footer children JSX parity sau normalize EOL: all buttons/text/disabled/callbacks như HEAD. Lần so sánh raw JSX đầu khác CRLF/LF, đã normalize, không sửa business code để ép pass.
PASS inline JS của mapHtml cho Parent/Staff parse với serialization geometry/stops rỗng, không business records hoặc network. Staff final template đã parse lại sau staff-only CSS.
PASS Chromium IAB gallery từ chính rendererCSS/scripts/SVG, Parent và Staff pin đều24×30; Staff trường/xe30×30. Multi-digit27 đầy đủ. Gallery chỉ DOM/text, không Leaflet network/location/trip. Gallery đầu tự đặt min-height làm icon bị kéo cao; sửa wrapperQA rồi phát hiện box sizing, bổ sung staff-only border-box để khớp Leaflet30 và kiểm tra lại kích thước30×30. Parent CSS không đổi.
PASS source diff whitespace check. Không install packages. Đã đóng gallery tabs, dừng server51618; Metro/user processes giữ nguyên.
NOT_VERIFIED actual Trip on Android/iPhone, measured footer onLayout/first layout/font scale/rotation, GPS/history/navigation, authenticated roles và pixel regression Parent. BLOCKED_BY_TEST_DATA_POLICY cho integration cần real assigned trips: Parent/Driver/Attendant và SCHEDULED ready/not-ready, IN_PROGRESS, terminal. Không tạo Trip/User giả hoặc fakeAPI để chứng minh runtime; wireframe QA trước đó không phải native proof.

## 10. Issues & Risks
Native visual acceptance cần PO kiểm tra. onLayout cập nhật offset sau layout pass; chưa đo trên thiết bị thật. Parent giữ nguyên biểu tượng emoji theo yêu cầu, nên khác rendering emoji giữa hệ điều hành ở Parent nằm ngoài scope. Staff icons nay là SVG cố định. Static equality/guards giúp tránh regression nhưng không thay pixel test/role integration. Giữ source và docs pending trước task; không commit/push.

## 11. Reviewer Focus
Parent invariance, flag chỉ Staff, numbered textContent và multi-digit, icon border-box/anchor. Footer exact measured height gồm inset, không cộng2lần; chỉ có khi có nội dung. Giữ role/capability/QR/nav operations và không đổi hành vi Parent.

## 12. Suggested Next Step
PO nghiệm thu Parent không đổi và Staff marker/footer ở hai trạng thái bảng trên điện thoại thật.

## 13. Approval Status
PO đã duyệt scope và code. Implementation completed; native/visual acceptance WAITING FOR USER REVIEW. Không có quyền tự commit/push.
