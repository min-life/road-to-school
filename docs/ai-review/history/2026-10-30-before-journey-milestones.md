# AI Review — Parent Home: card học sinh và Animated Bus Journey

## 1. Task Information
Task: cải thiện card học sinh tại mục PO gọi Con của bạn (source: Chuyến xe của con). Date: 30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Analysis / Design / Implementation. Status: COMPLETED (frontend; runtime acceptance có giới hạn bên dưới).

## 2. Original Request
Phân tích component/API/enums/điểm danh/GPS thực tế; restyle collapsed/expanded, giữ toàn bộ thông tin và thao tác V2; thêm bus progress chính xác, không fake ETA/tiến độ; hỗ trợ thiếu dữ liệu, responsive, accessibility/reduced motion. Chỉ frontend; implement, kiểm tra và báo cáo.

## 3. Approved Scope
PO chỉ định chi tiết cấu trúc collapsed/expanded và yêu cầu implement trực tiếp, tự quyết định dựa trên source. Triển khai trong phạm vi đó, wireframe đã cụ thể hóa trước code trong commentary/tài liệu; không có vòng phê duyệt riêng hoặc nghiệm thu thành phẩm. Chỉ Mobile/docs, V1 readonly; không API contract/backend/DB/schema/env/dependencies. Không commit/push, không data mutations hoặc fake API/business fixtures.

## 4. Analysis & Decisions
Đọc AGENTS, Working Rules, Business Context, hai handoffs, review cũ, module Parent Home và ui-ux-pro-max; đối chiếu V1 ParentHomeChildCard/style và source V2.
TripStatus: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED. AttendanceStatus: UNMARKED, PRESENT, ABSENT; childIsAlighted/childAlightedAt lấy theo studentId trong roster, không gán trạng thái của một con cho anh/chị/em cùng trip.
Home API hiện chỉ trả SCHEDULED/IN_PROGRESS theo thời gian/roster và chọn một chuyến ưu tiên cho mỗi con. Không đổi lựa chọn/bộ lọc. COMPLETED/CANCELLED là mapping phòng vệ, không giả vờ Home đã trả lịch sử.
Thêm readonly telemetry từ navigation/detail hiện có; không dùng publisher hook hoặc POST segment. Dedup tripId, dùng polyline và đúng điểm isMyChild/studentId. Tiến độ là chiếu lên geometry trả về, không ETA; ambiguity/off-route/thiếu geometry về neutral/last valid.
Chiều về là trường đến điểm trả riêng của con, không tới bãi xe. Chỉ PRESENT + alighted xác nhận con đã đến nơi; COMPLETED chung không tự xác nhận alighting.

## 5. Implementation Details
Application files:
- mobile/app/(tabs)/index.tsx: tích hợp journey/telemetry, CANCELLED label Parent; nhóm xe/tài xế hai hàng, phân biệt giờ điểm danh và giờ xuống xe. Fetch/poll8s/handlers/staff branch giữ nguyên.
- mobile/components/parent/trip-card.tsx: measured animated disclosure, chevron, active journey slot, wrap khi hẹp/font lớn; body display:none sau đóng, giữ UI state per studentId:tripId.
- mobile/components/parent/home-styles.ts: vehicleDetailRow/vehicleDetailText và container xe/tài xế.
- mobile/components/parent/student-journey.tsx (new): derive riêng từng con + StudentJourneyDiagram presentation, stale retention/expiry, native transform/fill/pulse.
- mobile/hooks/use-parent-journey-telemetry.ts (new): GET viewer poll5s, cache theo identity/version, dedup, access-error clear, focus/background cleanup.
- mobile/hooks/use-reduced-motion-preference.ts (new): AccessibilityInfo ban đầu/change listener, cleanup.
- mobile/utils/parent-journey.ts (new): enum-based presentation labels, validate geometry/stops, conservative route projection, freshness/boarding checks.
- mobile/scripts/parent-journey.test.ts (new):8 pure enum/geometry tests, không DB/business records/API mock.
Docs: thêm architecture/mobile-parent-student-journey.md; cập nhật mobile-parent-home-ui.md, mobile-ui-implementation-status.md, hai handoffs và LATEST. Review trước lưu history/2026-10-30-before-parent-journey.md/.diff. LATEST.diff chỉ thay đổi task so với snapshot trước task; không gồm các pending work cũ.

## 6. Database Changes
None. Không kết nối/ghi DB, không seed/fixture hoặc fake GPS, không migration.

## 7. API & Swagger Changes
None. API clients byte-identical, không contract/backend/decorators thay đổi; Swagger runtime N/A.
Dùng GET hiện có /trips/mobile/parent/home-cards (poll cũ8s), /trips/:id/navigation (5s mỗi trip cần GPS), /trips/mobile/:id (metadata khi cần/routeVersion đổi). Không gọi publisher session/position/segment/history hoặc mutation để test.

## 8. UI/UX Changes
Thu gọn: avatar học sinh, tên, trường, tag chuyến và chevron; không lộ chi tiết. Mở: bus diagram, đầy đủ tuyến/lịch/điểm danh/lý do vắng/xe/tài xế/Theo dõi/Báo nghỉ. Giữ logic disabled/busy/permission/callback.
SCHEDULED: xe ở đầu/xám; PRESENT + alighted: endpoint vàng theo hướng; IN_PROGRESS: GPS hợp lệ mới tiến; ABSENT/CANCELLED hoặc COMPLETED không có alighting: neutral. UNMARKED không được suy ra đã lên xe hoặc sắp tới nhà từ trạng thái chung.
Mất GPS giữ vị trí cùng version và pulse nhẹ; thiếu vị trí/geometry/ambiguous không đặt marker đoán. Không fake ETA/percentage. Test-mode vị trí có nhãn thử nghiệm.
Disclosure đo chiều cao, mở260ms/đóng200ms; bus cập nhật600ms giữa hai mốc; không chạy đi về lặp. Giảm chuyển động theo setting, dừng pulse khi đóng/blur/background. Responsive320/390/landscape/desktop, fontScale >=1.4 cho tag xuống dòng. Không thêm keyboard/safe-area offset; shell/form hiện có giữ nguyên.
Wireframe status: theo cấu trúc và chỉ thị thực thi của PO, trình bày trước code; chưa PO nghiệm thu UI.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit sau dọn preview.
PASS: Expo export --platform all --output-dir <TEMP>/rts-parent-journey-verified-export, iOS/Android/Web/server; không output vào repo.
PASS:8 node:test pure tests (2 suites,48 tổ hợp enum/hướng/alighted cùng phép chiếu/freshness/off-route/giao cắt/boarding). Biên dịch TS bằng TypeScript đã có ra TEMP rồi chạy node --test, không cài CLI.
PASS: AST/source parity fetchHomeData/onRefresh/getRoleLabel/getStatusBadge/getAttendanceBadge, staff JSX, router.push và triggerQuickLeaveNotice payload/callback; API clients không đổi.
PASS: Chromium IAB isolated presentation preview320/390/844/1440px, nhãn ngắn/thu gọn và nhãn dài/mở không tràn ngang; panel measured content height khớp sau resize; hai card mở độc lập; Enter/Space; CTA cục bộ không đóng card; hidden panel display:none/height0 và không xuất hiện trong AX. Một lượt automation click lúc card đang mở chưa định vị được target; đọc lại trạng thái rồi kiểm tra bằng keyboard thành công, không kết luận lỗi app.
PASS: diagram trung tính không có marker giả; diagram kiểm tra toán học không phải GPS có fill0/giữa/cuối và tâm bus khớp đường vàng. Đây chỉ là presentation/geometric checks, không fake DTO hoặc chứng nhận GPS thực tế.
PASS: diff whitespace/check, task report13 sections, task diff13 files và12 liên kết local; preview source/tab/server được dọn, viewport reset. Checker liên kết ban đầu tách sai dấu ngoặc trong đường dẫn (tabs), đã sửa parser angle-bracket và kiểm tra lại thành công; không phải lỗi link/code app.
NOT_VERIFIED: lint (Mobile không có script/config lint riêng, không cài mới).
NOT_VERIFIED: physical Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver, Dynamic Type/settings reduced motion thực, native FPS/performance nhiều card.
NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY: app có xác thực với hai con cùng Trip/điểm danh khác nhau và GPS thật/mất GPS, revocation, route/Báo nghỉ/mutations end-to-end. Không có phiên sẵn trong browser, không tự tạo dữ liệu hoặc phát vị trí chỉ để test.

## 10. Issues & Risks
Không đủ dữ liệu thì chủ ý giữ last valid hoặc neutral. PARENT không nhận current-leg geometry/accuracy/source cụ thể trong checkpoint; progress chiếu lên polyline kế hoạch/snapshot. Reroute lệch >50m/giao cắt mơ hồ không được vẽ tiến độ mới. Ngưỡng50m, ambiguity5m/100m chỉ là cách từ chối suy diễn, không ETA.
Endpoint xuống xe là milestone nghiệp vụ, không khẳng định xe chung đang ở đó sau khi đã trả con. Home8s/telemetry5s có thể lệch thời điểm ngắn; không thay controller nghiệp vụ.
Không giữ cache qua remount/restart/account change; nếu chưa có fix hợp lệ trong scope thì neutral. Các pending UI/docs/env của phiên trước được giữ nguyên. API Home không hiển thị học sinh không có chuyến phù hợp; task không thay phạm vi nghiệp vụ đó.

## 11. Reviewer Focus
Kiểm tra đúng studentId/isMyChild và boarding anchor chiều về; không dùng global completion để trả con. Kiểm tra stale expiry/sequence/version, cache account + giữ trip không đổi khi sibling đổi trip,403 clear, lifecycle polling/animation. Không thêm side-effect/navigation hoặc bỏ thông tin V2. Cần UAT native cho disclosure/dynamic text/reduced motion và GPS auth thực.

## 12. Suggested Next Step
Nghiệm thu trên Expo Go iPhone bằng tài khoản phụ huynh có hai con/chuyến/GPS hợp lệ do PO chuẩn bị, gồm hai trạng thái điểm danh khác nhau.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp của PO; kết quả WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push, không tự đánh dấu PO nghiệm thu.
