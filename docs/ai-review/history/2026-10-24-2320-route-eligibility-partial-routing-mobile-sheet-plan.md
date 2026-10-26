# BÁO CÁO AI REVIEW — KẾ HOẠCH KỸ THUẬT & TÁI THẨM ĐỊNH NGHIỆP VỤ ROADTOSCHOOL V2.0
# TỐI ƯU TUYẾN MỘT PHẦN · LỌC ĐIỀU KIỆN TÀI NGUYÊN · MOBILE DRAGGABLE BOTTOM SHEET

> **Thời điểm lập:** 2026-10-24 23:20:00 (GMT+7)  
> **Người thực hiện:** Senior Business Analyst, Solution Architect, Database Architect, Senior NestJS/Prisma Backend Engineer, Next.js & React Native Engineer, UI/UX Designer & QA Architect  
> **Tài liệu tham chiếu:** [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md) · [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md) · [docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md)  
> **Tệp chênh lệch mã nguồn:** [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)  
> **Trạng thái thực hiện:** `COMPLETED` (Phase 1 Audit & Planning Only · Zero Source Code Edits · Zero Schema Changes · Zero Self-Generated Test Data)  
> **Trạng thái phê duyệt:** `WAITING FOR PRODUCT OWNER REVIEW / APPROVAL`  
> **Đánh giá mức độ sẵn sàng:** `READY_FOR_IMPLEMENTATION` (Sau khi PO phê duyệt)

---

## 1. TASK INFORMATION

- **Task Name:** Tái thẩm định nghiệp vụ & thiết kế giải pháp kỹ thuật cho Tối ưu tuyến một phần (Partial VRP), Lọc điều kiện tài nguyên (Resource Eligibility/Availability) và Mobile Draggable Bottom Sheet (Phase 1 — Audit, Business Analysis & Implementation Planning Only).
- **Date:** 2026-10-24
- **Project Scope:** Toàn diện hệ thống: Kiến trúc Nghiệp vụ, Database Schema, Backend API (`api`), Web Admin (`web`), Mobile App (`mobile`).
- **Task Type:** `Business Analysis & Technical Architecture Planning`.
- **Status:** `COMPLETED`.

---

## 2. ORIGINAL REQUEST

Product Owner yêu cầu đánh giá và cải thiện 3 nhóm nghiệp vụ trong dự án RoadToSchool v2.0:
1. **Tối ưu tuyến khi một số học sinh không thể được phân tuyến (Partial VRP Optimization)**: Đảm bảo khi một số học sinh bị loại (vượt sức chứa, vượt thời gian, lệch lộ trình), hệ thống không đánh rớt toàn bộ phương án mà tiếp tục tối ưu các tuyến hợp lệ từ học sinh còn lại, ghi nhận danh sách học sinh chưa phân tuyến kèm lý do, hiển thị trong Preview và cho phép System Admin điều chỉnh tối ưu lại hoặc xác nhận lưu DRAFT.
2. **Lọc học sinh, xe và nhân sự đủ điều kiện trước khi cho người dùng lựa chọn (Resource Eligibility & Availability)**: Phân tách rõ Eligibility (tĩnh) và Availability (động theo thời gian), ngăn chặn tình trạng người dùng chọn đối tượng không hợp lệ rồi mới bị Backend từ chối lúc bấm lưu.
3. **Chuyển Mobile Trip Bottom Sheet từ nút bấm sang kéo thả bằng cử chỉ (Draggable Bottom Sheet)**: Hỗ trợ cử chỉ vuốt kéo mượt mà theo ngón tay, snap điểm neo, cuộn lồng danh sách điểm dừng và tương tác bản đồ Leaflet WebView không giật lag.
Yêu cầu bắt buộc: **Giai đoạn 1 — Chỉ khảo sát và lập kế hoạch kỹ thuật chi tiết, tuyệt đối không sửa source code hoặc Database trong phiên này.**

---

## 3. APPROVED SCOPE & RULES (BR-01 ĐẾN BR-10)

Đã xác minh và tuân thủ tuyệt đối 10 quyết định nghiệp vụ đã được Product Owner phê duyệt:
- `BR-01`: Cho phép tối ưu hóa tuyến một phần (Partial Route Optimization).
- `BR-02`: Bắt buộc ghi nhận và báo cáo danh sách học sinh chưa được phân tuyến.
- `BR-03`: Màn hình Preview bắt buộc hiển thị học sinh chưa phân tuyến kèm lý do (cụ thể hoặc chung hợp lý).
- `BR-04`: SYSTEM_ADMIN toàn quyền kiểm soát quá trình VRP, Preview, chỉnh tham số, tối ưu lại và xác nhận DRAFT.
- `BR-05`: Hỗ trợ tối ưu lại (Reoptimization) mà không làm mất cấu hình form đã nhập.
- `BR-06`: Phân định rạch ròi giữa Xác nhận Preview sang DRAFT (System Admin) và Duyệt DRAFT sang ACTIVE (School Admin).
- `BR-07`: Giữ nguyên vòng đời RoutePlan (`DRAFT` -> `ACTIVE` -> `CANCELLED`) và cấm sửa RoutePlan đã ACTIVE.
- `BR-08`: Giữ nguyên ma trận RBAC: System Admin gán Xe/Tài xế; School Admin gán Giáo viên phụ xe.
- `BR-09`: Chuyến xe (Trip) chỉ sinh từ RoutePlan ACTIVE; không sinh Trip cho học sinh chưa phân tuyến.
- `BR-10`: Tuyệt đối không tự tạo dữ liệu kiểm thử (No self-generated test data).

---

## 4. ANALYSIS & ROOT CAUSE DECISIONS

### Vấn đề A — Partial VRP Routing:
- **Nguyên nhân gốc đã xác minh:**
  1. `api/src/routes/routes.service.ts` (dòng 310-315): Ném `BadRequestException` cứng nếu tổng ghế xe nhỏ hơn số học sinh chọn trước khi gọi VRP.
  2. `routes.service.ts` (dòng 501-524): Ném `BadRequestException` sập toàn bộ nếu bất kỳ tuyến nào có thời gian chạy vượt `maxRouteDurationMinutes`.
  3. `routes.service.ts` (dòng 1026-1105): Khi `confirmPreview` thành DRAFT, thông tin `unassignedStudents` chỉ nằm trong RAM `previewSessions` và bị xóa bỏ, không được persist vào Database.
- **Giải pháp đề xuất:** Bỏ chặn cứng sức chứa, bóc tách `data.unassigned` từ VietMap VRP, tự động cắt tỉa học sinh gây vượt thời gian bằng TSP v4, giải quyết tính nhất quán 2 chiều (`Outbound ∩ Return`), và lưu metadata bao phủ vào trường `scheduleScope` JSON của `RoutePlan`.

### Vấn đề B — Resource Eligibility & Availability:
- **Nguyên nhân gốc đã xác minh:**
  1. `web/src/components/admin/routes/route-plan-assignments.tsx` (dòng 82-91): Gọi API danh mục chung (`listVehicles`, `getDrivers`, `getSchoolEmployees`) lấy toàn bộ dữ liệu hệ thống, không lọc theo ngữ cảnh phương án.
  2. Backend thiếu các endpoint cung cấp danh sách ứng viên (Candidate APIs) có kèm lý do không khả dụng.
  3. Mọi thẩm định dồn vào thời điểm submit mutation (`PATCH`), gây lỗi đỏ bất ngờ.
- **Giải pháp đề xuất:** Xây dựng 3 Candidate APIs chuyên dụng (`/candidate-vehicles`, `/candidate-drivers`, `/candidate-bus-attendants`), tái sử dụng `ResourceAvailabilityService` làm Single Source of Truth cho cả candidate loading và mutation validation; áp dụng transaction concurrency check.

### Vấn đề C — Mobile Trip Bottom Sheet:
- **Nguyên nhân gốc đã xác minh:**
  1. `mobile/app/trip/[id].tsx` (dòng 36-52): Sử dụng `Animated.Value` điều khiển bằng hàm `toggleSheet` thông qua nút bấm (`TouchableOpacity`), không có gesture tracker `PanResponder`.
  2. Cấu trúc render có điều kiện `{isExpanded && ...}` gây gián đoạn khung hình khi mở rộng.
- **Giải pháp đề xuất:** Sử dụng React Native `PanResponder` có sẵn trong core (không cài thêm thư viện ngoài), bắt tọa độ delta `dy` theo ngón tay, hỗ trợ snap points (110dp, 45%, 75%) kết hợp velocity flick, tách biệt gesture handler với cuộn lồng của danh sách điểm dừng, bảo toàn Map WebView cố định ở tầng nền.

---

## 5. DESIGN & PLANNING DETAILS (CHI TIẾT THIẾT KẾ & KẾ HOẠCH)

Đã tạo tài liệu kỹ thuật hoàn chỉnh tại:  
[docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md) gồm đầy đủ 19 phần:
- **Phần A**: Executive Summary (Tóm tắt mục tiêu và giải pháp).
- **Phần B**: Verified Repository Context (Khảo sát chi tiết models, services, UI components).
- **Phần C**: Approved Business Rules (10 quy tắc nghiệp vụ BR-01 -> BR-10).
- **Phần D**: Root Cause Analysis (Bóc tách nguyên nhân cụ thể kèm dòng mã nguồn).
- **Phần E**: Partial Optimization Architecture (Thuật toán cắt tỉa an toàn, phân loại lỗi).
- **Phần F**: Preview & Reoptimization Design (Vòng đời session, điều chỉnh tham số, Confirm DRAFT).
- **Phần G**: Eligibility & Availability Design (Ma trận điều kiện, Backend validation tập trung).
- **Phần H**: Database Impact Analysis (Nguyên tắc Minimal DB, kết luận không đổi schema).
- **Phần I**: API Contracts (Ma trận 8 endpoint, DTO mở rộng và DTO mới).
- **Phần J**: Web UI/UX Wireframes (Khung giao diện W1 đến W8 theo nguyên tắc Minimal UI Copy).
- **Phần K**: Mobile Bottom Sheet Design & Wireframes (Khung giao diện M1 đến M5).
- **Phần L**: Cross-Domain Impact (Đánh giá RoutePlan, Route, Trip, School Admin, Parent).
- **Phần M**: Alternatives & Tradeoffs (So sánh chi tiết các phương án kỹ thuật).
- **Phần N**: Recommended Architecture (Kiến trúc giải pháp khuyến nghị).
- **Phần O**: Implementation Plan (Phân kỳ Phase A -> F kèm dependencies và exit criteria).
- **Phần P**: Test Matrix (18 ca kiểm thử chi tiết tuân thủ Test Data Policy).
- **Phần Q**: Risk Register (5 rủi ro kỹ thuật chính và phương án giảm thiểu).
- **Phần R**: Product Owner Decisions Required (3 câu hỏi mở về ngưỡng bao phủ và UX).
- **Phần S**: Implementation Readiness Assessment (`READY_FOR_IMPLEMENTATION`).

---

## 6. DATABASE CHANGES

- **`NONE` (Không thay đổi Database)**.
- Áp dụng nguyên tắc Minimal Database Principle: Tận dụng trường `scheduleScope` kiểu `Json` có sẵn trên model `RoutePlan` để lưu trữ `unassignedStudents` và `coverage` metadata.
- **Không chạy migration, không sửa `schema.prisma` trong phiên này.**

---

## 7. API & SWAGGER CHANGES

- **Dự kiến mở rộng (Phase 2)**:
  - `GET /api/v1/routes/preparation/:schoolId`: Trả thêm `ineligibleStudents` kèm mã lý do.
  - `POST /api/v1/routes/optimize-preview`: Cập nhật logic VRP một phần.
  - `POST /api/v1/routes/confirm-plan`: Lưu metadata phân tuyến vào `scheduleScope`.
  - `GET /api/v1/routes/route-plans/:id`: Trả thêm metadata học sinh chưa phân tuyến.
- **Dự kiến thêm mới (Phase 2)**:
  - `GET /api/v1/routes/route-plans/:id/candidate-vehicles`
  - `GET /api/v1/routes/route-plans/:id/candidate-drivers`
  - `GET /api/v1/routes/route-plans/:id/candidate-bus-attendants`

---

## 8. UI/UX CHANGES

- **Web Admin**:
  - W1-W3: Hiển thị tab học sinh không đủ điều kiện kèm badge lý do; cảnh báo sức chứa mềm.
  - W4: Preview hiển thị rõ số lượng học sinh được phục vụ, học sinh chưa phục vụ kèm lý do; cảnh báo Tối ưu một phần.
  - W5-W6: Nút "Chỉnh sửa tham số & Chạy lại" giữ nguyên form; modal xác nhận lưu DRAFT ghi rõ tỷ lệ bao phủ.
  - W7-W8: RoutePlan Detail có tab học sinh chưa phân tuyến; modal phân công hiển thị dropdown chỉ gồm ứng viên đủ điều kiện.
- **Mobile App**:
  - M1-M5: Bottom Sheet kéo thả bằng ngón tay mượt mà, snap 3 mốc (110dp, 45%, 75%), cuộn lồng danh sách điểm dừng, bảo mật thông tin riêng tư cho phụ huynh.

---

## 9. VERIFICATION & TESTING

- Đã thực hiện khảo sát mã nguồn tĩnh (Static Inspection) an toàn trên toàn bộ repository.
- Toàn bộ dev server (`api`, `web`, `mobile`) đang chạy ổn định.
- Không phát sinh lỗi biên dịch, không có thay đổi mã nguồn ngoài kế hoạch.
- Kiểm tra tính tuân thủ quy định Test Data Policy: Không tạo bản ghi ảo, không seed dữ liệu test.

---

## 10. COMPLIANCE CHECK

- [x] Đọc `docs/BUSINESS_CONTEXT.md` và `docs/WORKING_RULES.md` trước khi phân tích: **ĐẠT**.
- [x] Không tự ý triển khai mã nguồn trước khi được duyệt kế hoạch: **ĐẠT (Zero code changes)**.
- [x] Không tự ý thay đổi Database schema: **ĐẠT (Zero schema changes)**.
- [x] Đồng bộ Swagger & DTO: **ĐÃ LẬP KẾ HOẠCH CHO PHASE 2**.
- [x] Thiết kế Wireframe trước khi code UI: **ĐẠT (Đã thiết kế W1-W8 và M1-M5)**.
- [x] Tối giản câu chữ trên UI (Minimal UI Copy): **ĐẠT**.
- [x] Lưu báo cáo AI Review vào `LATEST.md`: **ĐẠT**.
- [x] Dừng lại sau mỗi task (Stop-After-Task): **ĐẠT**.

---

## 11. SYSTEM INTEGRITY VERIFICATION

- Cấu trúc Git repository: Sạch sẽ, không có file rác phát sinh.
- Các quy trình nghiệp vụ hiện tại (Approvals, Trips, Parent Tracking): Bảo đảm tính tương thích ngược 100%.

---

## 12. RISK & REGRESSION ASSESSMENT

- Rủi ro khi chuyển sang Phase 2 được kiểm soát thông qua 6 Phase triển khai độc lập (Phase A -> F) có exit criteria rõ ràng.
- Toàn bộ logic mới hoạt động theo cơ chế bổ sung an toàn (Additive and Non-breaking).

---

## 13. RECOMMENDED NEXT STEP

- **Đề xuất duy nhất:** Trình Product Owner xem xét và phê duyệt tài liệu kế hoạch kỹ thuật tại [docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md).
- **Hành động tiếp theo:** DỪNG LẠI và chờ chỉ đạo từ Product Owner để tiến hành Phase 2 (Triển khai Phase A & Phase B).
