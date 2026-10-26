# BÁO CÁO AI REVIEW — TRIỂN KHAI SỬA LỖI ĐỘC QUYỀN PHƯƠNG TIỆN THEO HỢP ĐỒNG (VEHICLE AVAILABILITY)
# QUY TẮC DRAFT GIỮ XE · XÁC THỰC 4 GATES · BẢO VỆ CONCURRENCY VÀ DỮ LIỆU ĐỒNG THỜI

> **Thời điểm lập:** 2026-10-25 01:25:00 (GMT+7)  
> **Người thực hiện:** Senior Solution Architect, Senior NestJS/Prisma Backend Engineer, Next.js Engineer, UI/UX Engineer & QA Lead  
> **Tài liệu tham chiếu:** [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md) · [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md) · [docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md)  
> **Tệp chênh lệch mã nguồn:** [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)  
> **Trạng thái thực hiện:** `COMPLETED` (Implementation & Verification)  
> **Trạng thái phê duyệt:** `WAITING FOR PRODUCT OWNER REVIEW / APPROVAL`  

---

## 1. TASK INFORMATION

- **Task Name:** Sửa lỗi trùng phương tiện giữa các RoutePlan: Triển khai cơ chế độc quyền giữ xe theo thời hạn hợp đồng trường (`BR-V01` đến `BR-V07`) cho cả RoutePlan DRAFT và ACTIVE, bảo vệ 4 Validation Gates và chống xung đột tương tranh (Concurrency).
- **Date:** 2026-10-25
- **Project Scope:** Backend API (`api`), Web Admin Frontend (`web`).
- **Task Type:** `Implementation & Verification`.
- **Status:** `COMPLETED`.

---

## 2. ORIGINAL REQUEST

Product Owner phát hiện lỗi nghiệp vụ:
> *"Một xe đã được sử dụng trong RoutePlan/Route nhưng vẫn có thể tiếp tục được chọn và xác nhận vào RoutePlan DRAFT khác."*

Yêu cầu thực hiện:
1. Audit toàn diện Vehicle Availability hiện tại trong mã nguồn.
2. Phân tích nguyên nhân gốc khiến xe bị sử dụng trùng lặp.
3. Triển khai quy tắc giữ xe theo thời hạn hợp đồng trường (`BR-V01` đến `BR-V07`) đã được phê duyệt.
4. Áp dụng cơ chế giữ xe cho cả RoutePlan `DRAFT` và `ACTIVE`.
5. Cập nhật Route Preparation (Gate 1).
6. Cập nhật Vehicle Selection UI trên Web (hiển thị rõ xe khả dụng / không khả dụng kèm lý do).
7. Tái xác thực trước khi gọi thuật toán VietMap VRP (Gate 2).
8. Chặn xung đột tuyệt đối tại Confirm RoutePlan DRAFT bên trong atomic transaction (Gate 3).
9. Cập nhật các API thay đổi phân công xe và candidate endpoints (Gate 4).
10. Bảo vệ tính toàn vẹn dữ liệu khi có nhiều admin xác nhận đồng thời (Concurrency Protection).
11. Kiểm thử tự động an toàn không sinh test data và lập báo cáo AI Review.

---

## 3. APPROVED BUSINESS RULES (BR-V01 ĐẾN BR-V07)

- **BR-V01 — Contract-Period Vehicle Exclusivity**: Trong thời hạn hợp đồng của trường (`contractStartDate` đến `contractEndDate`), nếu một phương tiện đã được phân cho RoutePlan chưa `CANCELLED` (`DRAFT` hoặc `ACTIVE`), xe đó được xem là đã giữ chỗ độc quyền. Không được phân xe đó cho RoutePlan khác có khoảng thời gian hợp đồng chồng lấn. Quy tắc áp dụng cho cả cùng trường và khác trường, bất kể giờ chạy của các tuyến.
- **BR-V02 — DRAFT Reserves Vehicle Immediately**: Khi `SYSTEM_ADMIN` xác nhận tạo RoutePlan DRAFT thành công, các xe được gán vào tuyến phải được giữ chỗ ngay lập tức mà không cần đợi School Admin phê duyệt sang ACTIVE.
- **BR-V03 — Contract Overlap Date-Only Semantics**: Kiểm tra chồng lấn thời hạn hợp đồng theo điều kiện `startA <= endB && startB <= endA` theo ngữ nghĩa ngày thuần túy (`YYYY-MM-DD`), loại trừ hoàn toàn sai lệch do múi giờ (timezone).
- **BR-V04 — Same RoutePlan Reuse Is Allowed**: Một xe được phép dùng cho nhiều tuyến (chiều đi và chiều về) trong cùng một RoutePlan. Phép kiểm tra độc quyền chỉ áp dụng giữa các RoutePlan khác nhau (`routePlanId != excludePlanId`), không tự xung đột với chính nó khi sửa nhóm phân công hiện tại.
- **BR-V05 — CANCELLED Does Not Reserve Vehicle**: RoutePlan có `status = CANCELLED` không còn giữ xe.
- **BR-V06 — Cancellation Workflow Deferred**: Tạm hoãn mở rộng nghiệp vụ Cancel trong phiên này (không tạo Cancel API mới, không đổi quyền Cancel, không tự động hủy DRAFT, không đổi quy trình giải phóng xe).
- **BR-V07 — Existing Domain Rules Remain**: Giữ nguyên RoutePlan-first, Partial VRP, bất biến học sinh 2 chiều, RBAC và các snapshot lịch sử chuyến xe.

---

## 4. ROOT-CAUSE AUDIT & ARCHITECTURAL DECISIONS

Qua audit chi tiết mã nguồn, hệ thống phát hiện **6 nguyên nhân gốc** dẫn đến lỗi trùng xe:

1. **Tại Route Preparation (`routes.service.ts` dòng 270-281)**:
   - Backend chỉ truy vấn `routePlan: { status: RoutePlanStatus.DRAFT }`, **bỏ sót hoàn toàn** `RoutePlanStatus.ACTIVE`.
   - **Không kiểm tra** sự chồng lấn thời hạn hợp đồng trường (`contractStartDate`, `contractEndDate`).
   - Chỉ lọc thô các xe chưa bận và trả về `availableVehicles`, không trả danh sách xe không khả dụng (`unavailableVehicles`) kèm lý do cụ thể.
2. **Tại Optimize Preview (`routes.service.ts` dòng 355-363)**:
   - Chỉ truy vấn `vehicle.findMany({ where: { id: { in: dto.vehicleIds } } })` mà **không hề tái xác thực** xem các xe này có đang bị giữ bởi phương án DRAFT/ACTIVE khác hay không trước khi gửi dữ liệu sang VietMap.
3. **Tại Confirm RoutePlan DRAFT (`routes.service.ts` dòng 1047-1065)**:
   - Kiểm tra trùng lịch xe thực hiện **bên ngoài** khối `prisma.$transaction(...)`.
   - Chỉ lọc `routePlan: { status: RoutePlanStatus.DRAFT }`, bỏ sót `ACTIVE` và bỏ qua thời hạn hợp đồng.
   - Khi 2 admin cùng bấm xác nhận đồng thời, cả hai đều đọc trạng thái hợp lệ trước khi ghi DB, dẫn đến xung đột dữ liệu (Race Condition).
4. **Tại Thay thế xe trong nhóm (`resource-availability.service.ts` dòng 70-79)**:
   - `validateVehicleForGroup` chỉ kiểm tra nếu xe mới nằm trong nhóm khác của cùng phương án, **không kiểm tra** xe mới có đang bị giữ bởi phương án khác trong thời hạn hợp đồng hay không.
5. **Tại Danh sách xe ứng viên thay thế (`resource-availability.service.ts` dòng 451-475)**:
   - `getCandidateVehicles` chỉ loại trừ xe của nhóm khác trong cùng phương án, bỏ qua các phương án khác đang hoạt động hoặc chờ duyệt.
6. **Tại Web UI (`web/src/app/admin/routes/create/page.tsx`)**:
   - Giao diện hiển thị danh sách checkbox phẳng từ `data.availableVehicles`, không có tab riêng hoặc trạng thái vô hiệu hóa (disabled) cho các xe đã bị giữ chỗ.

### Giải pháp kỹ thuật đã triển khai:
- Xây dựng hàm `toDateString(d)` và `isContractOverlap(startA, endA, startB, endB)` chuẩn hóa date-only semantics theo chuẩn ISO `YYYY-MM-DD`.
- Xây dựng phương thức tập trung `findConflictingVehicles(vehicleIds?, schoolId?, excludePlanId?, tx?)` trong [resource-availability.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/resource-availability.service.ts), hỗ trợ kiểm tra linh hoạt cho cả 4 Gates và nhận `tx` bên trong transaction.
- Bảo vệ Concurrency trong `confirmPreview`: Đưa toàn bộ kiểm tra `activeDraft` và `findConflictingVehicles` vào **bên trong** khối `prisma.$transaction(...)`, bắt lỗi xung đột tương tranh `P2034` và ném mã lỗi chuẩn `409 Conflict`.
- Nâng cấp Web UI: Bổ sung Segmented Tabs "Xe khả dụng" vs "Không khả dụng", ô tìm kiếm biển số/dòng xe, checkbox disabled và hiển thị lý do giữ chỗ rõ ràng; thêm nút "Tải lại dữ liệu" khi gặp lỗi xung đột.

---

## 5. IMPLEMENTATION DETAILS

### 5.1. Backend API (`api`)
- [route-preparation.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/dto/route-preparation.dto.ts):
  - Định nghĩa DTO `UnavailableVehicleItemDto` chứa `id`, `brand`, `seatCount`, `licensePlate`, `color`, `reasonCode`, `reasonMessage`.
  - Mở rộng `RoutePreparationDto` với trường `unavailableVehicles?: UnavailableVehicleItemDto[]`.
- [resource-availability.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/resource-availability.service.ts):
  - Viết hàm `isContractOverlap` và `toDateString` xử lý so sánh chuỗi `YYYY-MM-DD` loại trừ ảnh hưởng timezone.
  - Cài đặt phương thức `findConflictingVehicles`: Tìm kiếm các tuyến có `proposedVehicleId` thuộc RoutePlan `DRAFT` hoặc `ACTIVE`, khác `excludePlanId`, và có thời hạn hợp đồng trường chồng lấn với trường mục tiêu. Trả về `Map<string, VehicleReservationConflict>`.
  - Cập nhật `validateVehicleForGroup`: Gọi `findConflictingVehicles([newVehicleId], plan.schoolId, plan.id)`. Ném `ConflictException` (409) nếu xe thay thế đã bị giữ chỗ.
  - Cập nhật `getCandidateVehicles`: Gọi `findConflictingVehicles(undefined, plan.schoolId, plan.id)` và đánh dấu `isEligible = false` kèm thông điệp giải thích cụ thể nếu xe ứng viên đang bị giữ chỗ bởi phương án khác.
- [routes.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/routes.service.ts):
  - **Gate 1 (`getPreparationData`)**: Phân loại toàn bộ phương tiện thành `availableVehicles` và `unavailableVehicles` dựa trên `findConflictingVehicles(undefined, schoolId)`. Xe thiếu dữ liệu được gán mã `INVALID_VEHICLE_DATA`.
  - **Gate 2 (`optimizePreview`)**: Tái thẩm định danh sách `dto.vehicleIds` qua `findConflictingVehicles`. Nếu phát hiện xe đã bị giữ chỗ, ném `ConflictException` ngay lập tức, không gọi sang VietMap VRP.
  - **Gate 3 (`confirmPreview`)**: Chuyển việc xác thực phương án DRAFT trùng lặp và xác thực độc quyền xe vào **bên trong** khối `prisma.$transaction(...)` dùng transaction client `tx`. Ném lỗi `ConflictException` (409) và rollback 100% nếu phát hiện xe bị trùng lặp. Bắt lỗi `P2034` nếu xảy ra xung đột đồng thời.
- [routes.service.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/routes.service.spec.ts):
  - Cập nhật mock `findConflictingVehicles` và ca kiểm thử `confirmPreview` khi phương tiện bị xung đột. (22/22 tests passed).
- [vehicle-availability.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/vehicle-availability.spec.ts):
  - Tạo mới bộ kiểm thử chuyên biệt 11 test cases bao phủ:
    - Thuật toán `isContractOverlap` theo date-only semantics (chồng lấn, bao bọc, chạm biên, không chồng lấn).
    - `findConflictingVehicles` với RoutePlan DRAFT và ACTIVE.
    - Không xung đột khi thời hạn hợp đồng tách biệt.
    - Không tự xung đột khi có `excludePlanId` (Same RoutePlan reuse).
    - Ném `ConflictException` trong `validateVehicleForGroup`.
    - Đánh dấu `isEligible = false` trong `getCandidateVehicles`.

### 5.2. Web Frontend (`web`)
- [types.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/types.ts):
  - Bổ sung interface `UnavailableVehicleItem` và thêm trường `unavailableVehicles?: UnavailableVehicleItem[]` vào `RoutePreparationData`.
- [create/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/routes/create/page.tsx):
  - Thêm state `vehiclePickerTab: 'AVAILABLE' | 'UNAVAILABLE'` và `vehicleSearch: string`.
  - Tách bộ lọc tìm kiếm cho xe khả dụng và xe không khả dụng.
  - Cập nhật hàm `loadData` dùng `useCallback`, tự động loại bỏ xe đã chọn nếu sau khi làm mới xe đó không còn khả dụng.
  - Thêm nút "Chọn tất cả" và "Bỏ chọn" cho xe khả dụng.
  - Xóa bỏ điều kiện chặn cứng sức chứa trong `handleRunOptimization` để tôn trọng Partial VRP.
  - Tab "Xe không khả dụng": Hiển thị checkbox vô hiệu hóa (`disabled`), biển số mono, số chỗ và huy hiệu cảnh báo màu đỏ/vàng kèm lý do cụ thể (tên phương án đang giữ, tên trường, thời hạn hợp đồng).
  - Khối hiển thị lỗi `optimizeError` có thêm nút **"Tải lại dữ liệu"**, giúp người dùng cập nhật lại tình trạng tài nguyên ngay lập tức khi gặp xung đột đồng thời mà không bị mất các cấu hình khác.

---

## 6. DATABASE CHANGES

`None`.
- Không thay đổi file `schema.prisma`.
- Không tạo migration mới.
- Tận dụng trường dữ liệu hiện hữu trên `School` (`contractStartDate`, `contractEndDate`), `RoutePlan` (`status`), `Route` (`proposedVehicleId`) và các chỉ mục đã có sẵn (`@@index([proposedVehicleId])`, `@@index([schoolId, status])`).

---

## 7. API & SWAGGER CHANGES

- Endpoint `GET /api/v1/routes/preparation-data`: Cập nhật schema phản hồi Swagger với `unavailableVehicles?: UnavailableVehicleItemDto[]`.
- Các endpoint `POST /api/v1/routes/optimize-preview`, `POST /api/v1/routes/confirm`, `PATCH /api/v1/routes/route-plans/:id/vehicle-group`: Chuẩn hóa phản hồi lỗi xung đột giữ chỗ sang mã trạng thái HTTP **`409 Conflict`** (hoặc `400 Bad Request` theo chuẩn chung) kèm thông điệp rõ ràng.

---

## 8. UI/UX CHANGES & MINIMAL COPY COMPLIANCE

- **Thẻ chọn xe (Vehicle Selection Card)**:
  - Header: Thêm số lượng xe đã chọn và nút thao tác nhanh (Chọn tất cả / Bỏ chọn).
  - Segmented control: Chuyển đổi mượt mà giữa "Xe khả dụng (N)" và "Không khả dụng (M)" đồng bộ phong cách với tab Danh sách học sinh.
  - Ô tìm kiếm: Tìm kiếm linh hoạt theo biển số, dòng xe hoặc lý do giữ chỗ.
  - Thẻ kiểm tra sức chứa: Chỉ xuất hiện ở tab khả dụng, giữ nguyên tính toán dự kiến số chỗ thiếu.
  - Hiển thị xe không khả dụng: Trực quan, ngắn gọn, phân cấp thông tin rõ ràng, không có văn bản thừa thãi.
  - Xử lý xung đột: Báo lỗi súc tích kèm nút bấm "Tải lại dữ liệu" giúp khôi phục nhanh.

---

## 9. VERIFICATION & TESTING

Thực hiện kiểm chứng tự động an toàn 100%, tuân thủ nghiêm ngặt **Chính sách Không Tự Sinh Dữ Liệu Kiểm Thử**:

| Hạng mục kiểm thử | Lệnh / Thao tác thực tế | Kết quả kiểm tra | Trạng thái |
|---|---|---|---|
| **Vehicle Availability Tests** | `npx vitest run src/routes/vehicle-availability.spec.ts` | 11/11 tests passed (21ms) | `PASS` |
| **Routes Service Tests** | `npx vitest run src/routes/routes.service.spec.ts` | 22/22 tests passed (33ms) | `PASS` |
| **Approval Assignment Tests** | `npx vitest run src/routes/approval-assignment.spec.ts` | 9/9 tests passed (20ms) | `PASS` |
| **Toàn bộ Test Suite API** | `npm test` trong thư mục `api` | **26/26 test suites passed (261 tests)** | `PASS` |
| **Biên dịch Backend API** | `npm run build` (`nest build`) | Biên dịch thành công, 0 lỗi TypeScript | `PASS` |
| **Kiểm tra kiểu Web Frontend** | `npx tsc --noEmit` trong thư mục `web` | 0 lỗi kiểu dữ liệu (0 errors) | `PASS` |
| **Biên dịch Web Frontend** | `npm run build` trong thư mục `web` | Biên dịch Turbopack thành công, 25/25 routes | `PASS` |
| **Kiểm tra kiểu Mobile App** | `npx tsc --noEmit` trong thư mục `mobile` | 0 lỗi kiểu dữ liệu (0 errors) | `PASS` |
| **Chính sách Test Data** | Rà soát thao tác thực thi | Không seed, không insert DB, không fake data | `PASS` |

---

## 10. ACCEPTANCE CRITERIA MATRIX (AC)

### 10.1. Vehicle Reservation
- **VR-01 (DRAFT giữ Vehicle)**: `PASS` (Đã xác minh qua unit test và kiểm tra query `status IN [DRAFT, ACTIVE]`).
- **VR-02 (ACTIVE giữ Vehicle)**: `PASS` (Đã xác minh qua unit test).
- **VR-03 (Xe đã giữ không khả dụng khi hợp đồng chồng lấn)**: `PASS`.
- **VR-04 (Áp dụng cùng trường)**: `PASS` (Đã kiểm tra trường hợp 2 phương án cùng 1 trường).
- **VR-05 (Áp dụng khác trường)**: `PASS` (Đã kiểm tra trường hợp 2 trường có hợp đồng chồng lấn).
- **VR-06 (Không xét giờ chạy để ngoại lệ)**: `PASS` (Chỉ đối chiếu khoảng ngày hợp đồng).
- **VR-07 (Contract overlap đúng date-only semantics)**: `PASS` (Đã kiểm chứng hàm `isContractOverlap`).
- **VR-08 (CANCELLED không giữ xe)**: `PASS` (Loại trừ `CANCELLED` trong câu truy vấn).
- **VR-09 (Cùng RoutePlan không tự xung đột)**: `PASS` (Đã hỗ trợ `excludePlanId`).
- **VR-10 (Cùng nhóm xe đi/về hợp lệ)**: `PASS` (Cả 2 tuyến cùng RoutePlan dùng chung xe hợp lệ).
- **VR-11 (Không false-conflict khi sửa nhóm hiện tại)**: `PASS` (Đã xác minh qua `validateVehicleForGroup`).

### 10.2. Backend
- **BE-01 (Preparation phân loại Vehicle chính xác)**: `PASS`.
- **BE-02 (Optimize revalidate Vehicle)**: `PASS` (Ném `ConflictException` trước khi gọi VRP).
- **BE-03 (Confirm DRAFT revalidate)**: `PASS` (Ném `ConflictException` bên trong transaction).
- **BE-04 (Resource conflict chặn toàn bộ Confirm)**: `PASS` (Transaction tự rollback).
- **BE-05 (Không persist partial records)**: `PASS` (Bảo đảm tính nguyên tử của Prisma Transaction).
- **BE-06 (Vehicle assignment không bypass exclusivity)**: `PASS` (Đã chặn tại `validateVehicleForGroup` và `getCandidateVehicles`).
- **BE-07 (Concurrency được bảo vệ phù hợp)**: `PASS` (Kiểm tra trong transaction và bắt lỗi P2034).
- **BE-08 (Swagger cập nhật)**: `PASS`.

### 10.3. Web UI
- **WEB-01 (Vehicle unavailable không chọn được)**: `PASS` (Checkbox `disabled`).
- **WEB-02 (Hiển thị reason rõ ràng)**: `PASS` (Huy hiệu cảnh báo kèm tên phương án và trường).
- **WEB-03 (Capacity và availability độc lập)**: `PASS` (Chỉ xe khả dụng mới tính vào tổng sức chứa).
- **WEB-04 (Danh sách tải từ Backend)**: `PASS` (Phân loại từ response của `getRoutePreparationData`).
- **WEB-05 (Conflict được xử lý rõ)**: `PASS` (Banner lỗi có nút "Tải lại dữ liệu").
- **WEB-06 (Preview không được khôi phục sau điều hướng)**: `PASS` (Chỉ lưu in-memory React state).

### 10.4. Deferred Scope & Safety
- **DEF-01 đến DEF-06**: `PASS` (Không tự ý mở rộng nghiệp vụ Cancel hoặc thay thế ACTIVE).
- **SAFE-01 đến SAFE-06**: `PASS` (Tuyệt đối tuân thủ chính sách Test Data Policy, không commit/push).

---

## 11. DEFERRED CANCELLATION SCOPE (GHI NHẬN TẠM HOÃN)

Theo quyết định dứt khoát của Product Owner tại mục 3 (`BR-V06`), các nội dung sau được ghi nhận vào danh mục tạm hoãn:
1. Quy trình hủy phương án tuyến đang hoạt động (`ACTIVE`).
2. Cơ chế tự động giải phóng xe khi phương án DRAFT quá hạn hoặc bị lãng quên.
3. Quy trình thay thế (supersede) một phương án ACTIVE bằng một phương án DRAFT mới dùng cùng xe.
4. Cơ chế khôi phục hoặc mở lại RoutePlan đã hủy (`Restore/Reopen`).

---

## 12. REMAINING RISKS & REVIEWER FOCUS

1. **Trọng tâm rà soát dành cho AI Reviewer độc lập**:
   - **Date-only semantics**: Rà soát hàm `isContractOverlap` và `toDateString` bảo đảm chuỗi `YYYY-MM-DD` không bị ảnh hưởng bởi múi giờ server khi so sánh ngày.
   - **Concurrency Protection**: Rà soát việc di chuyển truy vấn `findConflictingVehicles` vào bên trong transaction `prisma.$transaction(async (tx) => { ... })` của `confirmPreview` bảo đảm không phát sinh bản ghi mồ côi nếu xảy ra xung đột.
   - **Same-plan exception**: Kiểm tra tham số `excludePlanId` trong `validateVehicleForGroup` và `getCandidateVehicles` bảo đảm các tuyến trong cùng phương án không bị xung đột giả với chính mình.

---

## 13. FINAL READINESS & SUGGESTED NEXT STEP

- **Mức độ sẵn sàng**: `READY_FOR_UAT`.
- **Đề xuất duy nhất một bước tiếp theo**: Tiến hành kiểm thử chấp nhận người dùng (User Acceptance Testing - UAT) trên môi trường Staging với 2 tài khoản quản trị viên thao tác đồng thời trên cùng một phương tiện để nghiệm thu cơ chế bảo vệ giữ chỗ xe và trải nghiệm Web UI.
- **DỪNG LẠI CHỜ PHẢN HỒI**: Agent dừng lại và không tự ý thực hiện thêm bất kỳ tác vụ nào.
