# AI Review — Approved Navigation Decisions D1/D2 Update

## 1. Task Information

- Date: 25/10/2026, Asia/Saigon.
- Scope: Documentation; architecture API / Mobile / Web.
- Type: Planning update.
- Status: COMPLETED cho cập nhật plan; WAITING_APPROVAL cho implementation.
- Không application code changes trong task này.

## 2. Original Request

Ghi nhận D1 mới: TBT theo VietMap, geometry/instructions cùng response, có thể khác planned line; reroute current position→next stop, không toàn tuyến. Ghi nhận D2 mới: lưu lịch sử phương tiện tối thiểu, completed ưu tiên history, không fake/backfill/gap bridging. Giữ D3 foreground GPS và automatic foreground/reopen resume. Cập nhật kiến trúc, DB/API/wireframes, implementation và UAT; không implement/install/migrate/mutate.

## 3. Approved Scope

- APPROVED: cập nhật tài liệu plan trực tiếp; D1/D2 mới và D3; chủ trương bảng history nhỏ nếu cần.
- PROPOSED, chưa phê duyệt triển khai: schema chi tiết một bảng6cột + Trip.navigationState Json?, năm API resources, wireframes, cadence5s, dependency expo-location ~58.0.19.
- NOT APPROVED: sửa application code/schema, install, migrate hoặc ghi dữ liệu trong task này.
- Không hỏi lại quyết định D1/D2/D3 đã được PO chốt.

## 4. Analysis & Decisions

- Đề xuất WebView Leaflet + VietMap Route v4 từng chặng. Bỏ điều kiện instructions phải khớp saved line; current response geometry/instructions authoritative.
- P→B khi sai đường, B→C khi đến target; không request C/D trong current reroute, không đổi route order/roster. Invalid route không guidance/fallback giả.
- Một bảng TripLocationPoint sáu cột, compound PK duy nhất. Latest persisted point cho observers, không RAM last-location store.
- Một JSON nullable checkpoint chỉ control owner/run/enabled/source/target/version/timestamps, không vị trí/geometry/counter duplicate. Cần để resume đúng target và lưu manual stop trước hoặc sau point đầu.
- Telemetry transaction ngắn riêng với Trip FOR SHARE; không update Trip mỗi point hoặc mở rộng business transaction. Có thể contention ngắn, cần benchmark; không hứa zero latency impact.
- Foreground/reopen tự resume đúng Session/assignment/target; fresh GPS/run mới, không background/catch-up.
- COMPLETED dùng recorded multipart; run/gap tách đoạn, một point chỉ marker, zero history mới fallback planned.
- Hai movement providers độc lập; Auto dựa current routed leg, Joystick dịch điểm riêng. Ít nhất một mode phải vận hành PASS; route unavailable không được coi như TBT thành công.
- Giới hạn chính thức/provider và source audit có links tại plan §2–3. Latest docs VietMap/Expo/PostgreSQL được đọc read-only, không gọi route có tính phí.

## 5. Implementation Details

**No application code changes.**

Chỉnh sửa:
- docs/ai-review/vehicle-navigation-simulation-architecture-plan.md: cập nhật21mục; giữ nguyên verified source inventory §2; thay phần thiết kế bị D1/D2 làm hết hiệu lực.
- docs/ai-review/LATEST.md: báo cáo task hiện tại đủ13mục.
- docs/ai-review/LATEST.diff: chỉ ghi không code changes.

Bảo tồn tài liệu trước:
- docs/ai-review/history/2026-10-25-navigation-before-approved-d1d2-update-plan.md.
- docs/ai-review/history/2026-10-25-navigation-before-approved-d1d2-update-review.md.
- docs/ai-review/history/2026-10-25-navigation-before-approved-d1d2-update.diff.

Không đụng uncommitted source từ PO/Antigravity hoặc các task trước. Temporary planning draft ngoài repository, không dependency/helper code được thêm vào project.

## 6. Database Changes

**Actual changes: None.** Không sửa schema, tạo migration hoặc truy cập DB.

Đề xuất review: TripLocationPoint(tripId, sequence, latitude, longitude, recordedAt, runId), PK(tripId,sequence), một FK Trip Restrict; Trip.navigationState nullable JSON và inverse relation. Không source enum/history source label, không thêm secondary index. Future migration DDL-only, không historical backfill/seed. FK/delete paths và lock latency cần review khi implementation.

## 7. API & Swagger Changes

**Actual changes: None.** Không endpoint hoặc Swagger runtime thay đổi.

Plan §13 có GET navigation, PUT navigation/session, POST navigation/segment, PUT navigation/position, GET location-history; role scope, DTOs, cursor/snapshot, idempotency, error cases, cadence, same-response route. Swagger /api/docs verification phải thực hiện sau implementation; hiện NOT_VERIFIED vì chưa có API này.

## 8. UI/UX Changes

**Actual changes: None.** Wireframes chờ PO duyệt tại plan §14–15:
- Driver current-leg guidance, hai nút TEST riêng, một mode, automatic resume không thêm bước thao tác thường trực.
- Observer map/freshness và COMPLETED recorded/planned; gaps không nối tắt.
- Parent privacy masking giữ nguyên, minimal copy và brand tokens.
- Không thông báo stop hoặc tự milestones.

## 9. Verification & Testing

- PASS: đọc context/rules và đối chiếu source/schema/Trip lock/Session hiện có.
- PASS: git status kiểm tra trước task; repository đã có nhiều modified/staged/untracked files cần bảo vệ. Không commit/push/reset/discard.
- PASS: api — npx --no-install tsc --noEmit --incremental false, exit0.
- PASS: web — npx --no-install tsc --noEmit --incremental false, exit0.
- PASS: mobile — npx --no-install tsc --noEmit --incremental false, exit0.
- Flags --no-install và --incremental false tránh tải package/tạo incremental artifact.
- PASS: SHA256 toàn bộ334files thuộc api/web/mobile (tracked + untracked, bỏ env) trước/sau không đổi: 38aa0b15dcb43c8b62e7b9a3427e4109bfad336a26584d0e883f0ade731ef338.
- PASS: plan có đủ21mục, không placeholder hoặc Unicode replacement character; nội dung được review so với bản plan đã archive.
- NOT_VERIFIED: TBT/GPS/binary/resume/Auto/Joystick/cross-role tracking, race/latency DB và Swagger runtime. Đây là kế hoạch, chưa implementation; tsc không xác minh các tính năng mới.
- BLOCKED_BY_TEST_DATA_POLICY: future UAT cần phát sinh location points/start/complete/POST/PUT mà chưa được cấp môi trường/Trip/phạm vi ghi; không tự tạo dữ liệu trong task.
- Không chạy seed, migration, route request có tính phí hoặc API có side effects.

## 10. Issues & Risks

- Custom WebView navigation phải chứng minh instruction/progress chính xác với GPS thực tế, không nghiệm thu chỉ bằng marker.
- expo-location chưa được duyệt cài; native runtime/pin/accuracy chưa test.
- Foreground-only tạo gaps; không thể phục hồi đoạn chưa đo. Recorded line là xấp xỉ giữa samples.
- DB history tăng trưởng; FOR SHARE có contention ngắn với Trip writes; cần đo, không tự thêm cache/index/retention.
- VietMap vehicle profile/key/quota/giá tài khoản chưa xác nhận cho nghiệm thu LIVE.
- JSON checkpoint cần validation/version và quyền server-side; chưa có vấn đề nghiệp vụ D1/D2/D3 còn thiếu.

## 11. Reviewer Focus

Rà soát current-leg route/instruction cùng response và late-response guards; không reroute remaining route; gaps/zero vs single-point history; tính cần thiết checkpoint một field và không duplicate location; compound key/idempotency/throttle; row locks không kéo dài TripOperation; Session/assignment/privacy5roles; auto resume không tự business operations; dependency/wireframe/DDL approval và UAT Test Data Policy.

## 12. Suggested Next Step

Product Owner review/phê duyệt plan cập nhật gồm schema/checkpoint, contracts, wireframes và dependency GPS đề xuất trước khi giao triển khai.

## 13. Approval Status

WAITING FOR USER REVIEW / APPROVAL cho plan implementation chi tiết. D1/D2 mới và D3 là quyết định nghiệp vụ đã được PO duyệt; không tự đánh dấu phần thiết kế triển khai mới APPROVED. STOP AFTER UPDATED PLAN.
