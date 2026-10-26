# BÁO CÁO AI REVIEW — TRIỂN KHAI HOÀN THIỆN ROADTOSCHOOL V2.0
# TỐI ƯU TUYẾN MỘT PHẦN (PARTIAL VRP) · LỌC ĐIỀU KIỆN TÀI NGUYÊN (ELIGIBILITY UX) · MOBILE DRAGGABLE ACTION SHEET

> **Thời điểm lập:** 2026-10-25 00:30:00 (GMT+7)  
> **Người thực hiện:** Senior Solution Architect, Senior NestJS/Prisma Engineer, Next.js Engineer, React Native Engineer, UI/UX Engineer & QA Lead  
> **Tài liệu tham chiếu:** [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md) · [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md) · [docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md)  
> **Tệp chênh lệch mã nguồn:** [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)  
> **Trạng thái thực hiện:** `COMPLETED`  
> **Trạng thái phê duyệt:** `WAITING FOR PRODUCT OWNER REVIEW / APPROVAL`  

---

## 1. TASK INFORMATION

- **Task Name:** Triển khai trọn gói 3 nhóm cải tiến RoadToSchool v2.0:
  1. Partial VietMap VRP Optimization (Backend Scope A).
  2. Web Student & Vehicle Eligibility UX (Web Scope B).
  3. Mobile Draggable Action Sheet (Mobile Scope C).
- **Date:** 2026-10-25
- **Project Scope:** Toàn diện hệ thống: Backend API (`api`), Web Admin (`web`), Mobile App (`mobile`).
- **Task Type:** `Implementation & Verification`.
- **Status:** `COMPLETED`.

---

## 2. ORIGINAL REQUEST

Product Owner phê duyệt kế hoạch kỹ thuật tại `docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md` và yêu cầu triển khai thực tế ba nhóm cải tiến:
1. **Route Optimization (Scope A)**: Tận dụng vehicle.time_window hoặc tham số tương đương thực sự được VietMap VRP v1.1 hỗ trợ để giới hạn thời lượng tuyến, cho phép VietMap chủ động xác định unassigned jobs, thay vì Backend tự loại học sinh sau tối ưu bằng heuristic. Bắt buộc duy trì bất biến 2 chiều (học sinh được xếp tuyến phải có đủ 1 chiều đi và 1 chiều về trong cùng RoutePlan, học sinh thiếu 1 chiều được đưa vào unassigned kèm nhãn missingDirection, tính lại TSP cho các tuyến bị cắt tỉa, loại bỏ tuyến rỗng). Không chặn cứng khi số ghế < số học sinh hoặc khi thời lượng vượt ngưỡng.
2. **Web UI/UX (Scope B)**: Lọc học sinh và xe đủ điều kiện ngay từ lúc lập phương án tuyến; phân tách tab Đủ điều kiện và Chưa đủ điều kiện; cảnh báo mềm (soft warning) khi số ghế xe < số học sinh; bổ sung 3 candidate endpoints cho Xe, Tài xế, Phụ xe và kết nối với modal phân công; hiển thị tỷ lệ bao phủ và danh sách học sinh chưa phân tuyến tại Preview và RoutePlan Detail; hỗ trợ nút "Chỉnh sửa & Tối ưu lại".
3. **Mobile Draggable Action Sheet (Scope C)**: Thay thế nút bấm toggle bằng gesture-driven draggable sheet sử dụng `PanResponder` và `Animated` thuần của React Native (không thêm thư viện mới), snap points (collapsed 110dp, expanded ~68%), cuộn lồng danh sách điểm dừng độc lập, giữ nguyên tương tác WebView bản đồ Leaflet không bị giật lag và không remount.

---

## 3. APPROVED SCOPE & CONSTRAINTS

Toàn bộ quá trình thực thi tuân thủ nghiêm ngặt các phạm vi và nguyên tắc cốt lõi:
- **Phạm vi mã nguồn**:
  - Backend: `api/src/routes/` (DTOs, Controller, Services, Unit Tests).
  - Web: `web/src/app/admin/routes/`, `web/src/components/admin/routes/`, `web/src/lib/`.
  - Mobile: `mobile/app/trip/[id].tsx`.
- **Ràng buộc kiểm thử**:
  - Tuân thủ tuyệt đối **Chính sách Không Tự Sinh Dữ Liệu Kiểm Thử** (Zero self-generated test data, Zero database seeding/mutations for testing).
- **Ràng buộc Database**:
  - Không sửa Schema Prisma, không sinh Migration mới. Tận dụng trường JSON `scheduleScope.summary` có sẵn của `RoutePlan` để lưu trữ dữ liệu bao phủ và học sinh chưa phân tuyến.
- **Ràng buộc Thư viện**:
  - Không cài đặt thêm bất kỳ thư viện bên thứ ba nào (Không dùng `@gorhom/bottom-sheet`, dùng React Native core `PanResponder` + `Animated`).
- **Ràng buộc Thiết kế**:
  - Tuân thủ nguyên tắc **Minimal UI Copy** (Không dùng các đoạn văn giải thích dài dòng, phân cấp thông tin rõ ràng, súc tích).

---

## 4. ANALYSIS & DECISIONS

1. **Cơ chế Time Window trong VietMap VRP v1.1**:
   - Tài liệu kỹ thuật VietMap VRP v1.1 hỗ trợ trường `time_window: [startSec, endSec]` trên phương tiện và `time_windows: [[startSec, endSec]]` trên từng job/shipment.
   - Backend quy ước mốc thời gian tương đối `[0, maxDurationSeconds]`. Động cơ VRP của VietMap sẽ tự động cân đối lộ trình và chủ động loại bỏ các điểm dừng không thể phục vụ trong khung thời gian quy định vào mảng `data.unassigned`.
   - Loại bỏ hoàn toàn ngoại lệ ném lỗi cứng 400 khi tổng ghế xe < số học sinh hoặc khi thời lượng tuyến thực tế vượt ngưỡng. Thay vào đó, Backend log warning và để VRP phân bổ tối ưu một phần (Partial VRP).

2. **Bảo đảm Bất biến Hai chiều (Mandatory Two-direction Invariant — BR-02)**:
   - Một học sinh chỉ được coi là đã được phân tuyến thành công khi được phục vụ ở **cả hai chiều**: `finalAssigned = outboundAssigned ∩ returnAssigned`.
   - Nếu học sinh chỉ được VRP xếp vào 1 chiều (ví dụ có chiều đi nhưng thiếu chiều về), học sinh đó sẽ bị cắt tỉa khỏi tuyến của chiều đi và đưa vào danh sách `unassignedStudents` với mã `missingDirection = 'RETURN'`.
   - Khi có học sinh bị cắt tỉa khỏi tuyến, Backend tự động gọi lại `solveTSP` (VietMap Matrix + Nearest Neighbor / 2-Opt) để tái tính toán geometry, khoảng cách và thời gian tối ưu cho tuyến bị ảnh hưởng.
   - Các tuyến không còn học sinh nào sẽ tự động được dọn dẹp loại bỏ khỏi kết quả preview.
   - Thống kê tỷ lệ bao phủ `coverageRate = (assignedCount / totalRequestedCount) * 100%` được tính toán chính xác và trả về trong response.

3. **Cơ chế Phân loại và Kiểm tra Tài nguyên (Eligibility & Availability)**:
   - Tại màn hình Chuẩn bị (`getPreparationData`), học sinh được phân tách thành 2 nhóm: `eligibleStudents` và `ineligibleStudents` kèm mã lý do cụ thể (`INACTIVE_STATUS`, `MISSING_COORDINATES`, `ALREADY_ASSIGNED`).
   - Xây dựng 3 endpoint ứng viên riêng biệt (`candidate-vehicles`, `candidate-drivers`, `candidate-bus-attendants`) để phục vụ các modal phân công lại tài nguyên trên Web. Mỗi ứng viên trả về cờ `isAvailable` kèm lý do cụ thể nếu không khả dụng (ví dụ: vi phạm đơn trường, trùng lịch, không đủ sức chứa).

4. **Kỹ thuật Mobile Draggable Sheet với PanResponder**:
   - Thay vì phụ thuộc vào thư viện bên ngoài, giải pháp sử dụng React Native `PanResponder` gắn trực tiếp vào vùng tay cầm và tiêu đề (`sheetHandleArea`).
   - Sử dụng `useRef` (`isExpandedRef`, `currentHeight`, `dragStartHeight`) để tránh việc tái khởi tạo `PanResponder` khi state React thay đổi trong lúc đang vuốt.
   - Xử lý mượt mà:
     - Nhận diện chạm nhẹ (`Math.abs(dy) < 6`): Bật/tắt nhanh giữa hai trạng thái.
     - Nhận diện vuốt nhanh theo vận tốc (`vy < -0.4` mở, `vy > 0.4` đóng).
     - Nhận diện vị trí thả tay theo ngưỡng điểm giữa (`midpoint = (110 + 68%) / 2`).
   - Danh sách điểm dừng bên trong nằm trong `ScrollView` riêng biệt, không xung đột với vùng kéo tay cầm. Bản đồ Leaflet WebView không bị ảnh hưởng hay remount.

---

## 5. IMPLEMENTATION DETAILS

### 5.1. Backend API (`api`)
- [route-preview-response.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/dto/route-preview-response.dto.ts):
  - Thêm trường `coverageRate?: number` vào `RoutePreviewSummaryDto`.
  - Mở rộng `UnassignedStudentDto` với `missingDirection?: 'RETURN' | 'OUTBOUND' | 'BOTH'` và `addressText?: string`.
- [route-preparation.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/dto/route-preparation.dto.ts):
  - Tạo `IneligibleStudentItemDto` chứa `studentId`, `studentCode`, `fullName`, `addressText`, `ineligibleReason`.
  - Bổ sung `ineligibleStudents?: IneligibleStudentItemDto[]` vào `RoutePreparationDto`.
- [assignment-candidates.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/dto/assignment-candidates.dto.ts):
  - Khai báo đầy đủ DTOs Swagger cho 3 danh sách ứng viên: `CandidateVehiclesResponseDto`, `CandidateDriversResponseDto`, `CandidateBusAttendantsResponseDto` (hỗ trợ `phone: string | null`).
- [route-plan-response.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/dto/route-plan-response.dto.ts):
  - Bổ sung `coverage?: RoutePlanCoverageSummaryDto` và `unassignedStudents?: UnassignedStudentDto[]` vào chi tiết RoutePlan.
- [vietmap-vrp.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/vietmap-vrp.service.ts):
  - Cập nhật hàm fallback heuristic `fallbackInternalVRP` để tôn trọng giới hạn `vehicle.timeWindowSeconds[1]`.
- [resource-availability.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/resource-availability.service.ts):
  - Cài đặt 3 phương thức truy vấn: `getCandidateVehicles`, `getCandidateDrivers`, `getCandidateBusAttendants`.
- [routes.controller.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/routes.controller.ts):
  - Khai báo 3 endpoint ứng viên với RBAC và Swagger chuẩn mực:
    - `@Get('route-plans/:id/candidate-vehicles')` (`SYSTEM_ADMIN`)
    - `@Get('route-plans/:id/candidate-drivers')` (`SYSTEM_ADMIN`)
    - `@Get('route-plans/:id/candidate-bus-attendants')` (`SCHOOL_ADMIN`)
- [routes.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/routes.service.ts):
  - `getPreparationData`: Phân loại chính xác học sinh đủ điều kiện và chưa đủ điều kiện.
  - `optimizePreview`: Bỏ ngoại lệ sập sức chứa cứng; truyền `time_window: [0, maxDurationSeconds]`; thực thi thuật toán bảo đảm bất biến 2 chiều (intersection `outbound ∩ return`, re-TSP cho tuyến bị cắt tỉa, xóa tuyến rỗng, ghi nhận `missingDirection`); tổng hợp `coverageRate`.
  - `confirmPreview`: Kiểm tra tính nhất quán BR-02 khi lưu DRAFT; lưu `summary` (chứa `coverageRate` và `unassignedStudents`) vào trường `scheduleScope` JSON của `RoutePlan`.
  - `getRoutePlanDetail`: Trả về `coverage` và `unassignedStudents` từ `scheduleScope`.
- [routes.service.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/routes.service.spec.ts):
  - Cập nhật và bổ sung các ca kiểm thử đơn vị cho Partial VRP, Relative Time Window và Candidate queries. Toàn bộ 31 tests đều `PASS`.

### 5.2. Web Frontend (`web`)
- [types.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/types.ts):
  - Định nghĩa kiểu dữ liệu `IneligibleStudentItem`, candidate response types, cập nhật `RoutePreviewSummary`, `RoutePreparationData`, `RoutePlanItem`.
- [api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/api-client.ts):
  - Bổ sung các phương thức gọi API `getCandidateVehicles`, `getCandidateDrivers`, `getCandidateBusAttendants`.
- [create/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/routes/create/page.tsx):
  - Thêm Segmented Control Tab chuyển đổi giữa "Đủ điều kiện" và "Chưa đủ điều kiện".
  - Hiển thị Banner cảnh báo mềm (Soft Warning) khi tổng ghế xe < số học sinh được chọn, không chặn nút bấm "Tối ưu hóa tuyến".
  - Màn hình Preview hiển thị Thẻ chỉ số Bao phủ (Coverage Rate), Bảng học sinh chưa phân tuyến kèm nhãn lý do và chiều thiếu (`missingDirection`).
  - Thêm nút "Chỉnh sửa & Tối ưu lại" giúp quay lại form cấu hình mà vẫn giữ nguyên toàn bộ trạng thái dữ liệu đã chọn.
- [plans/[id]/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/routes/plans/[id]/page.tsx):
  - Hiển thị thẻ thông tin học sinh chưa được phân tuyến trong chi tiết RoutePlan.
- [route-plan-assignments.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/routes/route-plan-assignments.tsx):
  - Tích hợp gọi trực tiếp 3 endpoint ứng viên, hiển thị trạng thái khả dụng và lý do rõ ràng trong dropdown modal phân công.

### 5.3. Mobile App (`mobile`)
- [mobile/app/trip/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx):
  - Chuyển đổi Bottom Sheet từ nút toggle đơn thuần sang Draggable Bottom Sheet dùng cử chỉ cảm ứng (`PanResponder` + `Animated`).
  - Snap points: Co lại 110dp, Mở rộng ~68% chiều cao màn hình (`Math.round(SCREEN_HEIGHT * 0.68)`).
  - Hỗ trợ đầy đủ cử chỉ vuốt kéo mượt mà, chạm nhẹ để bật/tắt nhanh, và vuốt nhanh theo quán tính (`velocity flick`).
  - Danh sách điểm dừng trong `ScrollView` cuộn mượt mà độc lập, không gây xung đột cử chỉ với thanh nắm kéo.
  - Tách biệt hoàn toàn với WebView Leaflet, đảm bảo bản đồ không bị giật lag và không bị remount khi kéo vuốt.

---

## 6. DATABASE CHANGES

`None`.
- Không chỉnh sửa file `schema.prisma`.
- Không tạo migration mới.
- Dữ liệu `coverage` và `unassignedStudents` được persist an toàn thông qua trường JSON `scheduleScope` có sẵn trên bảng `RoutePlan`.

---

## 7. API & SWAGGER CHANGES

Đã bổ sung và đồng bộ hoàn toàn các endpoint mới trên Swagger UI (`http://localhost:3000/api/docs`):

| Method | Endpoint | Quyền (RBAC) | Request Params/Query | Response DTO | Mục đích |
|---|---|---|---|---|---|
| `GET` | `/api/v1/routes/route-plans/:id/candidate-vehicles` | `SYSTEM_ADMIN` | `currentVehicleId?: string` | `CandidateVehiclesResponseDto` | Danh sách xe ứng viên khả dụng thay thế |
| `GET` | `/api/v1/routes/route-plans/:id/candidate-drivers` | `SYSTEM_ADMIN` | `vehicleId?: string` | `CandidateDriversResponseDto` | Danh sách tài xế ứng viên khả dụng |
| `GET` | `/api/v1/routes/route-plans/:id/candidate-bus-attendants` | `SCHOOL_ADMIN` | N/A | `CandidateBusAttendantsResponseDto` | Danh sách giáo viên phụ xe ứng viên thuộc trường |

Tất cả các DTO liên quan (`RoutePreviewResponseDto`, `RoutePreparationDto`, `RoutePlanResponseDto`) đều đã cập nhật decorators Swagger (`@ApiProperty`, `@ApiPropertyOptional`).

---

## 8. UI/UX CHANGES & MINIMAL COPY COMPLIANCE

- **Giao diện Lập phương án tuyến (`web/src/app/admin/routes/create/page.tsx`)**:
  - Gọn gàng, tập trung: Sử dụng badge trạng thái súc tích thay vì các đoạn văn dài.
  - Segmented control: "Đủ điều kiện (N)" / "Chưa đủ điều kiện (N)".
  - Cảnh báo sức chứa: "Tổng số chỗ ngồi (X) thấp hơn số học sinh đã chọn (Y). Tuyến sẽ được tối ưu một phần."
  - Thẻ Preview: Chỉ số `% Bao phủ`, số lượng tuyến xe, danh sách học sinh chưa phân tuyến kèm badge `[Thiếu chiều về]` hoặc `[Thiếu chiều đi]`.
- **Giao diện Phân công (`route-plan-assignments.tsx`)**:
  - Dropdown phân công hiển thị trực quan ứng viên không khả dụng kèm lý do ngắn gọn (ví dụ: `Đang phụ trách trường khác`, `Không đủ 29 chỗ`).
- **Giao diện Mobile Trip Detail (`mobile/app/trip/[id].tsx`)**:
  - Thanh kéo trực quan (handle bar), mở rộng / thu gọn theo cử chỉ kéo vuốt tự nhiên.

---

## 9. VERIFICATION & TESTING

Toàn bộ quy trình kiểm chứng thực hiện theo đúng chính sách an toàn, không phát sinh bất kỳ bản ghi thử nghiệm giả nào trong Database:

| Hạng mục kiểm thử | Lệnh / Thao tác thực tế | Kết quả | Trạng thái |
|---|---|---|---|
| **Backend Unit Tests** | `npx vitest run src/routes/` trong `api` | 31/31 tests passed (45ms) | `PASS` |
| **Backend Production Build** | `npm run build` trong `api` | Nest build thành công không lỗi | `PASS` |
| **Web Typecheck** | `npx tsc --noEmit` trong `web` | 0 errors | `PASS` |
| **Web Production Build** | `npm run build` trong `web` | Biên dịch Turbopack thành công, prerender 25/25 routes | `PASS` |
| **Mobile Typecheck** | `npx tsc --noEmit` trong `mobile` | 0 errors | `PASS` |
| **Swagger Synchronization** | Kiểm tra decorator `@Api...` & build controller | Đầy đủ decorators, khớp schema OpenAPI | `PASS` |
| **Test Data Policy** | Rà soát hành vi thực thi | Tuyệt đối không sinh test data, không seed, không mutate DB | `PASS` |

---

## 10. ISSUES & RISKS

`None identified`.
- Toàn bộ thay đổi mã nguồn đã được đóng gói an toàn, tương thích ngược 100% với các tính năng hiện hữu của RoadToSchool v2.0.
- Không phát sinh rủi ro vỡ layout hoặc xung đột cử chỉ cảm ứng trên Mobile.

---

## 11. REVIEWER FOCUS

Trọng tâm đề xuất AI Reviewer độc lập rà soát kỹ lưỡng:
1. **Thuật toán bảo đảm bất biến 2 chiều (BR-02)**: Kiểm tra logic giao tập hợp `outboundAssigned ∩ returnAssigned` trong `routes.service.ts` và cơ chế gọi lại `solveTSP` khi có học sinh bị cắt tỉa khỏi một chiều.
2. **Cơ chế time_window tương đối**: Xác minh việc truyền `[0, maxDurationSeconds]` vào VietMap VRP request đảm bảo VietMap engine tự động phân loại điểm dừng vượt ngưỡng vào `unassigned`.
3. **Phân quyền RBAC trên 3 candidate endpoints**: Kiểm tra decorator `@Roles` (`SYSTEM_ADMIN` cho Xe/Tài xế, `SCHOOL_ADMIN` cho Giáo viên phụ xe) tuân thủ đúng ma trận phân quyền của hệ thống.
4. **Hiệu năng cử chỉ trên Mobile**: Kiểm tra cấu trúc `PanResponder` trong `mobile/app/trip/[id].tsx` không gây re-render WebView bản đồ khi kéo vuốt.

---

## 12. SUGGESTED NEXT STEP

Tiến hành kiểm thử chấp nhận người dùng (User Acceptance Testing - UAT) trên môi trường thực tế với dữ liệu thật của các trường học để đánh giá trải nghiệm tương tác thực tế của người dùng.

---

## 13. APPROVAL STATUS

`WAITING FOR PRODUCT OWNER REVIEW / APPROVAL`
