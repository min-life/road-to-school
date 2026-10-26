# AI Review — Triển khai sửa thêm học sinh và chuẩn hóa tiêu chí định tuyến

## 1. Task Information
- **Ngày**: 26/10/2026 (Asia/Saigon).
- **Scope**: Backend (`/api`) & Web Admin (`/web`).
- **Type**: Implementation / Bugfix & Contract Refactoring.
- **Status**: COMPLETED.

## 2. Original Request
PO yêu cầu đọc toàn bộ `docs/ai-review/student-insertion-routing-fix-prompt.md` và thực thi sửa xuyên suốt Backend–Web theo phạm vi tài liệu; không chỉ thêm optional chaining để che lỗi mà giải quyết tận gốc contract mismatch, áp dụng hai tiêu chí tối ưu chuẩn hóa (`maxRouteDurationMinutes`, `defaultStopServiceSeconds`) vào solver VietMap thực tế, tuân thủ Test Data Policy, bảo vệ uncommitted work, cập nhật báo cáo và dừng sau task.

## 3. Approved Scope
1. Sửa lỗi runtime TypeError `Cannot read properties of undefined (reading 'length')` tại `web/src/components/admin/students/insert-student-modal.tsx`.
2. Đồng bộ toàn diện Data Contract giữa Backend và Frontend trên 2 luồng:
   - Thêm học sinh: `options` -> `preview` -> `confirm`.
   - Phê duyệt đổi địa chỉ: `routing-preview` -> `approve`.
3. Thay thế giải thuật khoảng cách chim bay / Euclidean heuristic (8.33 m/s) bằng solver VietMap Route v4 / TSP thực tế qua `VietMapVRPService.calculateRoute`.
4. Chuẩn hóa hai tiêu chí tối ưu trên cả 2 modal (`insert-student-modal.tsx` và `request-detail-modal.tsx`):
   - `maxRouteDurationMinutes` (Thời gian tối đa tuyến - phút, min 10m).
   - `defaultStopServiceSeconds` (Thời gian dừng tại điểm - giây, 10–300s, default 60s).
   - Loại bỏ hoàn toàn các trường obsolete "Khoảng cách đi bộ tối đa" và "Thời gian đi vòng tối đa".
5. Phân định rõ ràng các trạng thái: `FEASIBLE`, `INFEASIBLE`, và `UNAVAILABLE` (khi mạng hoặc nhà cung cấp timeout/lỗi).
6. Xác nhận thêm học sinh (`confirmStudentInsertion`) cập nhật nguyên tử Route/RouteStop/metrics mà không làm xáo trộn Trips hiện hữu; pre-capture `routeSnapshot` cho các chuyến lịch sử có snapshot null.
7. Tuân thủ tuyệt đối Test Data Policy (không tự sinh dữ liệu test vào DB, không mutation API có side-effect), bảo vệ uncommitted work, cập nhật báo cáo và dừng sau task.

## 4. Analysis & Decisions
1. **Lỗi gốc TypeError**:
   - `insert-student-modal.tsx` đọc `options.candidatePairs.length` và `options.student.fullName`, trong khi API `getInsertionOptions` trả về mảng `pairs` và đối tượng `student` phẳng.
   - *Quyết định*: Chuẩn hóa `StudentInsertionOptionsResponseDto` xuất cả `candidatePairs` (alias cho `pairs`), lồng `student` (`StudentSummaryDto`) đồng thời giữ tương thích ngược. Đồng thời thêm defensive guards trong UI.
2. **Contract Mismatch Preview & Confirm**:
   - Web đọc `preview.isFeasible`, `preview.returnRoute`, `preview.outboundRoute.metrics.totalDistanceMeters`, trong khi Backend trả về `feasible`, `return`, `metrics.distanceMeters`.
   - Web gửi `{ outboundRouteId, returnRouteId, version }` khi confirm, trong khi Backend yêu cầu `{ previewToken, expectedFingerprint }`.
   - *Quyết định*: Bổ sung alias getters và dual-exposing trên DTOs Backend; Web gửi đúng `{ previewToken, expectedFingerprint }`.
3. **Approval Đổi địa chỉ**:
   - Web gửi `resolutionOutcome`, Backend yêu cầu `decision`.
   - *Quyết định*: `ApproveAddressRequestDto` chấp nhận cả `decision` và `resolutionOutcome` (fallback `decision || resolutionOutcome`).
4. **Chuẩn hóa Hai Tiêu chí Tối ưu**:
   - Loại bỏ `maxWalkingDistanceMeters` và `maxDetourRatioPercent` khỏi modal chi tiết yêu cầu.
   - Thay bằng `maxRouteDurationMinutes` và `defaultStopServiceSeconds` với phân cấp fallback: input người dùng -> Route -> RoutePlan -> mặc định hệ thống (90 phút, 60 giây).
5. **Định tuyến thực tế (Real VietMap Solver)**:
   - Thêm phương thức `calculateRoute` vào `VietMapVRPService` gọi VietMap Route v4. Khi gặp lỗi kết nối/timeout, trả về trạng thái `UNAVAILABLE` thay vì che giấu hoặc tính sai. Khi môi trường offline/không có API key, fallback sang internal TSP engine an toàn.
6. **Bảo toàn dữ liệu Trip lịch sử**:
   - Triển khai bước PRE_UPDATE_CAPTURE trong `confirmStudentInsertion`: tìm mọi chuyến xe có `routeSnapshot: null` thuộc 2 tuyến liên quan và đóng băng snapshot hiện tại bằng `buildTripRouteSnapshot` trước khi cập nhật RouteStops.

## 5. Implementation Details
Các file đã thay đổi:
- **Backend**:
  - `api/src/routes/vietmap-vrp.service.ts`: Bổ sung phương thức `calculateRoute` tích hợp VietMap Route v4, timeout handling và fallback TSP.
  - `api/src/routes/routes.module.ts`: Export `VietMapVRPService`.
  - `api/src/routes/dto/student-insertion.dto.ts`: Bổ sung `StudentSummaryDto`, `RoutingConstraintsDto`, chuẩn hóa `StudentInsertionOptionsResponseDto`, `PreviewStudentInsertionDto`, `RouteInsertionResultDto`, `PreviewStudentInsertionResponseDto`.
  - `api/src/routes/routes.service.ts`: Cập nhật `getInsertionOptions`, viết lại `previewStudentInsertion` dùng `vietmapVRPService.calculateRoute`, viết lại `confirmStudentInsertion` với pre-capture snapshot và cập nhật nguyên tử.
  - `api/src/routes/routes.controller.ts`: Cập nhật Swagger decorator và response type cho `confirmStudentInsertion`.
  - `api/src/routes/routes.service.spec.ts` & `approval-assignment.spec.ts`: Cập nhật mock `calculateRoute`.
  - `api/src/student-requests/student-requests.module.ts`: Import `RoutesModule`.
  - `api/src/student-requests/dto/routing-preview.dto.ts`: Cập nhật `StudentAddressRoutingPreviewDto` với `routingConstraints`, bổ sung `overallFeasibility`, hỗ trợ `decision` và `resolutionOutcome` trong `ApproveAddressRequestDto`.
  - `api/src/student-requests/student-requests.service.ts`: Tiêm `VietMapVRPService`, viết lại `previewAddressRouting` dùng 2 tiêu chí và solver thực tế, cập nhật `approveRequest` áp dụng geometry đã tối ưu.
  - `api/src/student-requests/student-requests.service.spec.ts`: Cập nhật mock `VietMapVRPService`.
- **Frontend (Web Admin)**:
  - `web/src/lib/types.ts`: Cập nhật interface `RouteInsertionOptionPair`, `StudentInsertionOptionsResponse`, `StudentInsertionPreviewResponse`, `RouteInsertionResultItem`, `SystemRequestRoutingPreviewResponse`.
  - `web/src/lib/api-client.ts`: Cập nhật các hàm `getStudentInsertionOptions`, `previewStudentInsertion`, `confirmStudentInsertion`, `getSystemRequestRoutingPreview`, `approveSystemAdminRequest`.
  - `web/src/components/admin/students/insert-student-modal.tsx`: Khắc phục lỗi đọc `candidatePairs`, bổ sung 2 ô nhập tiêu chí tối ưu, cập nhật preview/confirm logic và error handling.
  - `web/src/app/admin/requests/request-detail-modal.tsx`: Thay thế walking/detour inputs bằng 2 tiêu chí chuẩn hóa, cập nhật gọi API preview và truyền `decision`, `previewToken`.
- **Review Artifacts**:
  - `docs/ai-review/LATEST.diff`: Lưu git diff toàn bộ các file code thay đổi.
  - `docs/ai-review/LATEST.md`: Báo cáo chi tiết 13 mục hiện tại.

## 6. Database Changes
- **Không có**: Giữ nguyên Prisma schema, không migration, không tạo bảng hay cột mới.
- Tái sử dụng bảng `Route`, `RouteStop`, `Trip`, `StudentUpdateRequest` hiện có.

## 7. API & Swagger Changes
- Đồng bộ Swagger DTO decorators:
  - `GET /routes/student-insertions/options?studentId=...`: trả về `StudentInsertionOptionsResponseDto` với `student`, `hasActiveMembership`, `candidatePairs`, `pairs`.
  - `POST /routes/student-insertions/preview`: nhận `{ studentId, outboundRouteId, returnRouteId, routingConstraints: { maxRouteDurationMinutes, defaultStopServiceSeconds } }`.
  - `POST /routes/student-insertions/confirm`: nhận `{ previewToken, expectedFingerprint }`, trả về `{ success, outboundRouteId, returnRouteId, message }`.
  - `POST /system-admin/update-requests/:requestId/routing-preview`: nhận `{ routingConstraints: { maxRouteDurationMinutes, defaultStopServiceSeconds } }`.
  - `POST /system-admin/update-requests/:requestId/approve`: nhận `{ decision, resolutionOutcome, previewToken, expectedFingerprint }`.

## 8. UI/UX Changes
- `insert-student-modal.tsx`:
  - Loại bỏ hoàn toàn crash runtime `undefined.length`.
  - Hiển thị thông tin học sinh và trạng thái phân tuyến hiện tại.
  - Danh sách cặp tuyến ứng viên hiển thị rõ ràng, cho phép chọn cặp tuyến mong muốn.
  - 2 ô nhập tiêu chí: "Thời gian tối đa tuyến (phút)" (min 10) và "Thời gian dừng tại điểm (giây)" (10–300, default 60).
  - Khối kết quả Preview hiển thị trực quan: Badge Khả thi / Không khả thi / Không khả dụng, thời gian di chuyển mới, giờ đón/trả dự kiến mới, lý do chi tiết nếu không khả thi.
  - Nút Xác nhận chỉ kích hoạt khi kết quả preview là `isFeasible: true`.
- `request-detail-modal.tsx`:
  - Thay thế 2 input cũ (khoảng cách đi bộ, tỉ lệ đi vòng) bằng 2 input tiêu chí chuẩn hóa.
  - Tự động re-preview khi điều chỉnh tiêu chí.
  - Phê duyệt truyền kèm preview token bảo đảm dữ liệu đã preview được áp dụng nguyên tử.

## 9. Verification & Testing
- **TypeScript Typecheck**:
  - `api`: `npx --no-install tsc --noEmit --incremental false` -> **PASSED (0 errors)**.
  - `web`: `npx --no-install tsc --noEmit --incremental false` -> **PASSED (0 errors)**.
- **Unit Tests**:
  - `api/src/routes/routes.service.spec.ts`: **23/23 tests PASSED**.
  - `api/src/routes/approval-assignment.spec.ts`: **10/10 tests PASSED**.
  - `api/src/student-requests/student-requests.service.spec.ts`: **15/15 tests PASSED**.
  - Tổng cộng: **48/48 tests PASSED**.
- **Linting**:
  - `api`: `npm run lint` (oxlint) -> **PASSED (0 errors)**.
  - `web`: `eslint` trên các file sửa -> **PASSED (0 errors)**.
- **Test Data Policy Compliance**:
  - Tuyệt đối tuân thủ `TEST DATA POLICY — NO SELF-GENERATED TEST DATA`.
  - Không tự thêm bản ghi vào database, không sửa dữ liệu thật, không chạy seed scripts.
  - Kiểm thử trực tiếp ghi dữ liệu trên môi trường live: Đánh dấu `NOT_VERIFIED` với nhãn `BLOCKED_BY_TEST_DATA_POLICY`. Chờ Product Owner kiểm thử nghiệp vụ (UAT) bằng dữ liệu do PO quản lý.

## 10. Issues & Risks
- **VietMap API Quota / Connectivity**: Khi gọi VietMap Route v4 từ server, nếu mạng gián đoạn hoặc API key hết hạn, hệ thống trả về `status: 'UNAVAILABLE'` kèm thông báo cụ thể, ngăn chặn việc áp dụng lộ trình không hợp lệ.
- **Session Cache Expiration**: Token preview có TTL 10 phút. Nếu người dùng để modal mở quá lâu trước khi bấm xác nhận, hệ thống sẽ yêu cầu kiểm tra lại tính khả thi để bảo đảm tính toàn vẹn (fingerprint consistency).

## 11. Reviewer Focus
- Kiểm tra tính nhất quán giữa Backend DTOs (`student-insertion.dto.ts`, `routing-preview.dto.ts`) và Frontend API Client / Types (`types.ts`, `api-client.ts`).
- Kiểm tra giải thuật `calculateRoute` trong `VietMapVRPService` và cách 2 tiêu chí (`maxRouteDurationMinutes`, `defaultStopServiceSeconds`) được truyền và đánh giá.
- Kiểm tra cơ chế PRE_UPDATE_CAPTURE bảo toàn snapshot chuyến đi cũ trong `confirmStudentInsertion`.

## 12. Suggested Next Step
- Product Owner thực hiện kiểm thử thực tế (UAT) trên giao diện Web Admin:
  1. Mở danh sách học sinh, chọn một học sinh chưa có tuyến và nhấn "Thêm vào tuyến" để kiểm tra danh sách cặp tuyến và chạy thử tính khả thi.
  2. Mở danh sách yêu cầu cập nhật, chọn yêu cầu đổi địa chỉ của học sinh để kiểm tra tính năng tính toán lộ trình mới với 2 tiêu chí tối ưu.

## 13. Approval Status
- **COMPLETED**.
- **STOP AFTER TASK**: Dừng lại và chờ phản hồi, đánh giá từ Product Owner theo đúng quy trình.
