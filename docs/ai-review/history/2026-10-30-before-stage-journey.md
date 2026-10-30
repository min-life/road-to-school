# AI Review — Điểm đón và mốc giờ trên thanh hành trình

## 1. Task Information
Task: tinh chỉnh rail Parent Home theo feedback PO. Date:30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI Implementation / Fix. Status: COMPLETED (frontend; native/auth runtime chưa nghiệm thu).

## 2. Original Request
Điểm đón của con phải nằm trên thanh hành trình; giờ khởi hành/đến nơi gắn với mốc xuất phát/đích với thiết kế phù hợp, không chỉ đặt chữ dưới thanh. Chỉ giữ tag trạng thái, bỏ dòng text trạng thái lặp trong khối hành trình.

## 3. Approved Scope
Tinh chỉnh trực tiếp giao diện đã triển khai theo feedback cụ thể của PO. Trước code đã trình bày bố cục time badge nổi + stem nối mốc, node nhà trên rail và chia chặng schematic trong commentary; không có vòng duyệt wireframe riêng/PO nghiệm thu thành phẩm. Giữ toàn bộ dữ liệu/action V2, không API contract/backend/DB/env/dependencies, không commit/push. Không tạo business fixtures, fake API hoặc mutation để test.

## 4. Analysis & Decisions
Đọc lại AGENTS/WORKING_RULES/BUSINESS_CONTEXT/handoffs/review trước/module spec và ui-ux-pro-max. Source cũ chỉ đặt nhà trên rail khi có geometry, còn lúc chờ không đọc detail nên nhà rơi xuống legend. Heading trạng thái lặp tag summary.
Giờ Home scheduledTime là chuỗi start - end được backend tạo; detail có scheduledStartTime/scheduledEndTime và plannedArrivalTime từng stop. Chiều về kết thúc tuyến ở bãi, khác điểm trả con nên không dùng scheduledEndTime làm giờ về nhà. Actual arrival dùng childAlightedAt của chính con khi PRESENT + childIsAlighted; nguồn hiện dùng không có actual departure nên khởi hành luôn ghi Dự kiến.
Node chia đều theo thứ tự hành trình để không ép label khi pickup thực ở2%/98% quãng đường. Đây là schematic, không gán progress50% giả: GPS trong mỗi chặng vẫn tính từ polyline/anchor thực; thiếu homeFraction chỉ cho endpoint đã xác nhận hoặc neutral.

## 5. Implementation Details
Code sửa4 files:
- mobile/components/parent/student-journey.tsx: node nhà trên rail, time badges đầu/cuối + stem, bus pin nổi tránh che node, label/signal chỉ accessibility, quality icon không text lặp, props departure/arrival.
- mobile/hooks/use-parent-journey-telemetry.ts: detail cho mọi tripId có card (initial/focus); GPS vẫn chỉ IN_PROGRESS cần theo dõi. Metadata-only ngừng polling sau thành công; dedup nhiều con/chuyến, giữ guards/cache/sequence/version.
- mobile/utils/parent-journey.ts: parse/validate giờ, chọn thời điểm đích đúng chiều, format actual timestamp Việt Nam, ánh xạ GPS sang từng chặng schematic.
- mobile/scripts/parent-journey.test.ts: thêm6 pure clock/layout tests vào8 tests cũ.
Docs cập nhật architecture/mobile-parent-student-journey.md, mobile-ui-implementation-status.md, ai-handoff/CURRENT_STATE.md và CODEX_HANDOFF.md. Review trước được archive history/2026-10-30-before-journey-milestones.md/.diff. LATEST.diff chỉ8 file code/docs của task này so với snapshot trước task, không pending work cũ.
HomeScreen, API clients, ParentTripCard và các thao tác cũ không sửa. Preview entry tạm đã xóa; server dừng/tab đóng/viewport reset; outputs ở TEMP.

## 6. Database Changes
None. Không kết nối/ghi DB, không migrations, không seed hoặc dữ liệu mẫu.

## 7. API & Swagger Changes
None. Không sửa backend/client contract; Swagger N/A. Chỉ bổ sung lượt đọc GET detail hiện có cho card chờ/không cần GPS để hiển thị stop/time. Không gọi session/position/segment hoặc mutation.

## 8. UI/UX Changes
Điểm nhà có tâm cùng đường y với rail, không còn legend nhà nằm ngoài thanh. TO_SCHOOL có3 node (xuất phát/đón con/trường), TO_PARKING có2 (trường/điểm trả con). Không nhầm điểm trả với bãi.
Time badge trắng bo12 phía trên, số giờ nổi bật/tabular, stem nối đúng node đầu/cuối. Arrival thực tế nền vàng nhạt và caption Thực tế; lịch ghi Dự kiến; thiếu giờ —:— / Chưa có giờ. Số giờ auto-fit đủ5 ký tự, các nhãn khác wrap.
Bỏ heading/dòng trạng thái trong diagram. Tag chuyến và tag điểm danh V2 vẫn giữ; ngữ nghĩa trạng thái/GPS còn trong accessibilityLabel của image-group và icon nhỏ cho người nhìn. Không thêm button giả.
Bus nổi trên rail với pin stem, không che icon nhà. Giữ animation/native driver/reduced motion/focus/background, loading/error/neutral/last-known behavior và mọi callback/permissions hiện có. Không đổi safe area/keyboard/desktop shell.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit sau dọn preview. Lượt đầu phát hiện dấu JSX } thừa, đã sửa và chạy lại thành công.
PASS: Expo export --platform all --output-dir <TEMP>/rts-journey-milestones-final-export; iOS/Android/Web/server, exit0. Log ở TEMP/rts-journey-milestones-export.log, không output vào repo. NO_COLOR/FORCE_COLOR warnings không chặn build.
PASS:14 node:test tests/3 suites, không DB/API (8 trạng thái/hình học cũ +6 giờ/schematic mới). Test inputs chỉ enum primitives, clock strings, timestamp và tọa độ toán học; không tạo records/DTO giả.
PASS: source parity HomeScreen và hai API clients byte-identical; studentJourneyMilestone/validCoordinate/locateOnJourney/studentJourneyPath/observedJourneyProgress/progressForJourneyFix giữ nguyên body. Không diff API/Web.
PASS: Chromium IAB isolated presenter,3 diagrams ×4 widths320/390/844/1440px; không tràn ngang. Tâm tất cả node cùng y với rail; trục time badges khớp đầu/cuối, sai số lớn nhất0.015625px. Không text trạng thái lặp trong DOM hiển thị; accessibility vẫn có ngữ nghĩa đầy đủ.
PASS: preview toán học điểm đón2%/98%; bus tại home node sau ánh xạ (sai số đọc0.172px), body pin nằm trên icon nhà với khoảng hở2px. Nhãn giờ chỉ là typography kiểm tra, không chứng nhận dữ liệu giờ/GPS thực tế.
PASS: diff whitespace check, report13 sections, scoped diff8 files, liên kết module và cleanup preview.
NOT_VERIFIED: lint vì Mobile không có script/config lint riêng; không cài tool.
NOT_VERIFIED: Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type/reduced-motion settings trên thiết bị thật, metadata/auth/GPS end-to-end. BLOCKED_BY_TEST_DATA_POLICY cho runtime cần dữ liệu/phiên hợp lệ chưa có sẵn; không tự tạo hoặc sửa dữ liệu để test. Kết quả disclosure/callback runtime của task trước không được chạy lại hoặc coi là nghiệm thu mới.

## 10. Issues & Risks
Khởi hành chỉ có giờ dự kiến theo dữ liệu frontend đang dùng, không thể hiện giờ xuất phát thực. Actual arrival là mốc xuống xe xác nhận của con, không phải timestamp xe đến trường theo GPS. Chiều về thiếu plannedArrivalTime ở DROPOFF thì không điền giờ về bãi thay thế.
Schematic spacing không biểu thị tỷ lệ km. Không hiển thị phần trăm/ETA; khi thiếu geometry không suy ra marker trung gian. Giới hạn GPS/reroute/viewer-source ở spec module vẫn áp dụng.
Metadata card không chạy GPS được cache sau lần tải đầu và refresh khi focus; không thêm publisher/watch vị trí. Native/full integration chưa nghiệm thu; không có rủi ro dữ liệu DB mới được phát hiện.

## 11. Reviewer Focus
Kiểm tra thời gian trả con đúng studentId/isMyChild, không dùng parking ETA, actual/planned đúng caption. Kiểm tra node-on-rail, time alignment, không che nhà, schematic mapping trước/sau home và không fake progress khi thiếu dữ liệu. Soát metadata-only lifecycle, cache account/sibling/version và không làm thay đổi Home/action/API.

## 12. Suggested Next Step
Nghiệm thu bố cục trên Expo Go iPhone bằng chuyến thật đã có điểm đón/trả và lịch hợp lệ.

## 13. Approval Status
Thực hiện theo feedback trực tiếp của PO; kết quả WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push hoặc tự đánh dấu PO nghiệm thu.
