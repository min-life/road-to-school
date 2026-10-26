# AI Review — Đánh giá nghiệp vụ lifecycle sau implementation Antigravity

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Independent review API/DB/Web/Mobile integration; Documentation. Type: Business Implementation Review. Status: COMPLETED review / PARTIAL implementation / CHANGES_REQUESTED. Không sửa application code.

## 2. Original Request
PO không có nhu cầu tự test mọi tình huống; yêu cầu dựa vào báo cáo MD trong history để đánh giá phần nghiệp vụ gần nhất: vòng đời phương án/hợp đồng/vị trí, thay đổi địa điểm, disable và thêm học sinh. Không tạo thêm checklist hoặc yêu cầu PO chạy 67 ca.

## 3. Approved Scope
Đọc báo cáo gốc và đối chiếu source với các quyết định đã chốt, chạy typecheck an toàn và hai probe phương thức production bằng in-memory adapters. Chỉ ghi báo cáo. Không implementation/prompt fix, migration, dependencies, records test thật, DB/API mutation hoặc provider/OTP/network call.

Nguồn báo cáo gốc: history/2026-10-26-152206-before-lifecycle-ui-uat-checklist.md. Nguồn yêu cầu: school-route-lifecycle-student-change-design.md và school-route-lifecycle-implementation-prompt.md. Báo cáo checklist trước đã archive tại history/2026-10-26-165146-before-lifecycle-business-review.md/.diff.

## 4. Analysis & Decisions

### 4.1 Kết luận theo nghiệp vụ

| Nghiệp vụ | Đánh giá source | Phần có / phần thiếu |
|---|---|---|
| Schema và snapshot Trip | Một phần | Có enums/fields/helper, generation ghi snapshot, một số reader/navigation dùng snapshot. Không có capture legacy trước thay đổi, đồng bộ snapshot SCHEDULED khi reopt hoặc sử dụng guard vận hành đầy đủ. |
| Hủy ACTIVE bởi hai admin | Có luồng cơ bản, chưa an toàn đồng thời | Đúng role/scope, giữ dữ liệu, transaction hủy SCHEDULED và đóng pending staff leave. Chưa bảo vệ race Start/cancel và fingerprint không được dùng. |
| Đổi vị trí bãi | Có cascade Backend toàn hệ thống | Update setting + hủy mọi DRAFT/ACTIVE/SCHEDULED liên quan trong transaction; đổi nhãn không cascade. Còn race/legacy snapshots/impact revalidation. |
| Đổi vị trí trường | Có Backend, UI chưa nối đúng | Cascade đúng schoolId, kiểm scope School Admin. EditSchool UI gửi PUT không có handler tương ứng; School Admin chưa có lối Settings Trường theo thiết kế. |
| Sửa/gia hạn hợp đồng | Có Backend guards, chưa trọn UI | Kiểm System Admin, không DRAFT/ACTIVE, ngày mới hợp lệ. UI EditSchool vẫn gọi PUT /schools/:id thay PATCH contract; chưa có contract context snapshot plan cũ trong mutation. |
| Tự động hết hạn | Chưa hoàn thành | Có hàm reconcile và EXPIRED/cascade nhưng không thấy cron/startup/caller của hàm trong api/src; không thể gọi là tự động hoạt động. |
| Parent hủy / quyền duyệt / outcome | Có luồng bình thường, thiếu bảo vệ đồng thời | Có owner/PENDING checks, cancellation/outcome UI và guard SA khi đã có tuyến; direct address cũng chặn khi có membership. Cancel read-then-update không CAS, có thể ghi đè APPROVED. |
| Đổi địa điểm và tối ưu lại | Chưa đạt nghiệp vụ cốt lõi | Preview chưa dùng VietMap, FEASIBLE chỉ ghế/tọa độ; approve REOPTIMIZED chỉ đổi tọa độ RouteStop, không line/order/Trip snapshot mới. Frontend response contract không khớp. |
| Disable / loại / tuyến rỗng | Một phần | Có scoped remove/exclusion/cancel Trip rỗng. Chỉ check Ready, chưa check attendance; legacy không freeze; navigation stops chưa loại excluded và counters/holds Route rỗng chưa đồng bộ đầy đủ. |
| Thêm học sinh vào hai tuyến | Một phần, chưa dùng được trọn từ UI | Có same-plan/two-direction/capacity checks, insert hai Route trong transaction, không ghi Trips cũ. Không solver thật/time validation/geometry mới; UI/API sai contracts, không capture legacy, thiếu revalidation token/source khi confirm. |

Không đánh tỷ lệ phần trăm vì một phần nền tảng làm xong không bù được thiếu sót ở các luồng quyết định chính. Readiness khuyến nghị: NOT_READY_FOR_ACCEPTANCE toàn scope; không đồng nghĩa mọi code đều không dùng được.

### F1 — P1: Hai luồng tối ưu chưa thực hiện VietMap như yêu cầu
Source: api/src/student-requests/student-requests.service.ts:1107–1245; api/src/routes/routes.service.ts:2003–2109,2193–2233.

### F2 — P1: Các flow UI/API không khớp, chặn sử dụng bình thường
- web/src/lib/api-client.ts:332–336 gửi PUT /schools/:id bằng FormData; api/src/schools/schools.controller.ts có PATCH :id/location và PATCH :id/contract, không handler PUT :id.
- web/src/components/admin/students/insert-student-modal.tsx:61 đọc candidatePairs; Backend getInsertionOptions trả studentId/studentName/pairs.
- Web insertion preview đọc isFeasible/returnRoute/version; Backend trả feasible/return/expectedFingerprint. Web confirm gửi studentId/routeIds/expected versions, DTO Backend đòi previewToken.
- Web request modal đọc overallFeasibility và count khác Backend allFeasible/scheduledTripsToRefreshCount/frozenTripsCount.
- Settings chưa có School tab, nav Schools chỉ System Admin; School Admin thiếu đường thao tác vị trí trường mình đã duyệt.

### F3 — P1: Snapshot chỉ bảo vệ Trip mới, chưa bảo vệ đầy đủ Trip cũ
Source: api/src/trips/trips.service.ts:325–363; utils/trip-snapshot-resolver.ts:167 trở đi; mutation services Route/Student/School/Parking.

### F4 — P1: Giữ Trip đã điểm danh và loại khỏi navigation chưa đầy đủ
Source: api/src/students/students.service.ts:634–668; student-requests.service.ts:946–982; trip-navigation.service.ts:113,177; trip-snapshot-resolver.ts:250.

### F5 — P1: Race hủy có thể ghi đè trạng thái đã bắt đầu/đã duyệt
Source: routes.service.ts:1650–1717 và student-requests.service.ts:435–478.

### F6 — P1: Expiry chưa được nối thành tác vụ tự động
Source: api/src/routes/routes.service.ts:1733.

### F7 — P2: Source revalidation/nhất quán sau thay đổi còn thiếu
Source: insertion session, counters RoutePlan, disable requests.
