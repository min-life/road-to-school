# AI Review — Trip State Synchronization Audit & Fix Plan

## 1. Task Information
- Task Name: Cross-platform Trip State Synchronization Audit.
- Date: 25/10/2026 (Asia/Saigon).
- Project Scope: API / Web / Mobile (read-only source audit); Documentation (writes).
- Task Type: Analysis / Review / Planning.
- Status: COMPLETED (audit và kế hoạch); runtime synchronization NOT_VERIFIED; implementation WAITING_APPROVAL.

## 2. Original Request
Audit source thực tế của Trip state trên Backend, Web, Mobile và đủ 5 roles; trace mutation/read/UI lifecycle; lập ma trận SYNC-01 đến SYNC-10; phân biệt evidence tĩnh và runtime; tìm nguyên nhân, đề xuất kiến trúc tối giản và kế hoạch theo files/phases. Không business implementation, migration, DB test data, dependencies hoặc commit/push.

## 3. Approved Scope
Được đọc source/docs, safe checks, side-effect-free tests, GET API an toàn, tạo audit plan và cập nhật AI Review. Implementation: NOT APPROVED. Không tự login/mutate Trip/Attendance/assignment hay khởi động AppModule/cron phục vụ test.

## 4. Analysis & Decisions
Chi tiết đầy đủ A–O: [trip-state-synchronization-audit-plan.md](trip-state-synchronization-audit-plan.md).

- 11 phát hiện từ source: 2 P0, 6 P1, 3 P2; tất cả `POTENTIAL_ISSUE — STATIC_EVIDENCE_ONLY`. Không có lỗi cross-role runtime được tái hiện trong task này.
- P0: thiếu object/school/parent authorization ở một số API đọc; rủi ro read-check-write concurrency giữa các mutation. P0 concurrency có điều kiện theo isolation/transaction thực tế chưa kiểm chứng.
- P1: Home, schedules Mobile và lists/detail Web không auto-refresh; Mobile detail giữ snapshot Parent attendance/assignment; scalar child state không xử lý nhiều con cùng Trip; controls chưa khóa đầy đủ sau transition.
- P2: stale/out-of-order responses; lifecycle polling chưa immediate/terminal-aware; mutation full loader làm unmount map.
- Backend DB là source of truth; state milestones đã persist đủ. Existing polling chỉ cover operational-state/roster trong detail, không cover toàn bộ client data.
- Chọn existing APIs + smart polling + focus/foreground/online + mutation refetch, coordinator single-flight/generation guard. Không cần WebSocket, migration hoặc dependency mới.
- Cần sửa API scope/Parent child contract/Swagger và bảo vệ mutation concurrency; không cần endpoint sync mới. Giữ UI hiện tại, không tự thêm screen/badge khi chưa duyệt wireframe.

## 5. Implementation Details
No application code changes.

Tài liệu tạo/cập nhật:
- Tạo `docs/ai-review/trip-state-synchronization-audit-plan.md`: inventory, evidence file/dòng, 5-role matrix, 11 issues, plan A–D và 18 acceptance scenarios.
- Cập nhật `docs/ai-review/LATEST.md`: báo cáo này.
- Cập nhật `docs/ai-review/LATEST.diff`: đánh dấu không code changes của task.
- Lưu nguyên bản báo cáo trước tại `docs/ai-review/history/2026-10-25-trip-state-sync-pre-audit-handoff.md`.
- Lưu nguyên bản diff trước tại `docs/ai-review/history/2026-10-25-trip-state-sync-pre-audit-handoff.diff`.

Không ghi đè history đã tồn tại, không đưa uncommitted application diff của PO vào diff task audit.

## 6. Database Changes
None. Không migration/schema/seed/business data mutation hoặc truy vấn business records. Kế hoạch không thêm bảng/field/enum; đề xuất transaction isolation/retry ở service, chưa thực hiện.

## 7. API & Swagger Changes
None trong task audit. GET `http://localhost:3000/api/docs-json` thành công, các endpoints Trip được liệt kê. Không coi endpoint discovery là xác minh toàn contract/authorization/behavior.

Đề xuất sau duyệt: object scope guards, Parent children array chỉ con có quyền, role-shaped state, transaction conflict/retry, Swagger 403/404/409 và mô tả Complete/Alighting đầy đủ; reuse endpoints.

## 8. UI/UX Changes
None. Không viết/refactor UI. Đề xuất chỉ refresh/data binding/action availability, giữ layout và Minimal UI Copy. UI mới hoặc refactor đáng kể vẫn phải trình wireframe theo Working Rules. Không remount Map WebView vì dynamic state update.

## 9. Verification & Testing
- PASS: API `npx --no-install tsc --noEmit --incremental false`, exit 0.
- PASS: Web cùng lệnh, exit 0.
- PASS: Mobile cùng lệnh, exit 0.
- PASS: API `npx --no-install vitest run src/trips/trips.service.spec.ts src/trips/utils/trip-time.util.spec.ts`: 27/27 tests, 2 files. Đã đọc test/config/import liên quan; Prisma là mock in-memory; không khởi tạo real Prisma client hoặc app/cron. Không dùng tổng 270 tests của phiên trước làm kết quả phiên này.
- PASS: runtime Swagger JSON GET về endpoint discovery.
- Đã thực hiện: git status, source trace và final documentation/diff checks. Repository main đồng bộ origin/main theo status; nhiều uncommitted/intent-to-add/untracked đã có trước task cần giữ nguyên.
- NOT_VERIFIED: authenticated UI, focus/foreground trên thiết bị, map reload count, network latency/recovery, cross-role/multi-device, real PostgreSQL isolation/concurrency.
- NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY: UAT cần mutation Trip/Attendance/assignment/generation DB thật; không tự chạy. Dữ liệu/role và assertions cần thiết được liệt kê ở mục M2 của plan.
- NOT_IMPLEMENTED: Trip cancellation workflow; không xây workflow mới để test.
- Không chạy E2E hiện có vì bootstrap AppModule/Prisma/scheduler, chưa chứng minh zero side effects. Web/Mobile existing tests được đọc nhưng không phải cross-platform sync tests; không chạy tests ngoài scope để tăng số PASS.

## 10. Issues & Risks
Chi tiết 11 issues cùng evidence/trigger/expected/actual/repro đề xuất/root cause/fix/DB/API/UI impacts/regression/verification ở mục F/G của plan. Mức độ P0 được ưu tiên nhưng chưa có runtime khai thác/concurrency reproduction. Mở rộng polling phải xử lý modal draft, query/page/week identity, map stability và tải query hiện hữu. N+1/query cost được ghi nhận, chưa benchmark quá tải. Không giả định mọi màn hình dashboard/phase UI đã tồn tại.

## 11. Reviewer Focus
1. Quyền đọc detail/state/roster trên từng Trip, school, linked child và sau khi đổi assignment; phân biệt masking với authorization.
2. Concurrent Complete/undo-alight, Start/reassignment/reset-ready, Arrival/reset attendance; transaction không tự chứng minh invariant.
3. Parent nhiều con: keyed child state, không scalar dùng chung hoặc lộ học sinh khác.
4. Coverage Home/schedules/Web, expiration bằng server clock, empty Home vẫn polling và không auto Complete.
5. Single-flight/generation guards, immediate lifecycle refresh, terminal controls, silent refresh không remount map hoặc reset modal/form.
6. Không đánh đồng typecheck/backend unit PASS với UI synchronization PASS.

## 12. Suggested Next Step
Product Owner review và phê duyệt kế hoạch K theo thứ tự A (Backend P0/contract) → B (Mobile) → C (Web) → D (QA), kèm phạm vi môi trường/dữ liệu cho kiểm chứng runtime cần mutation. Không tự triển khai.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

STOP AFTER AUDIT AND FIX PLAN. No business implementation performed.
