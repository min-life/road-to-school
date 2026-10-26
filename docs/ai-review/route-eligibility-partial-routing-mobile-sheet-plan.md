# KẾ HOẠCH KỸ THUẬT & TÁI THẨM ĐỊNH NGHIỆP VỤ — ROADTOSCHOOL V2.0
# TỐI ƯU TUYẾN MỘT PHẦN · LỌC ĐIỀU KIỆN TÀI NGUYÊN · MOBILE DRAGGABLE BOTTOM SHEET
# GIAI ĐOẠN 1: KHẢO SÁT HỆ THỐNG, PHÂN TÍCH NGHIỆP VỤ & THIẾT KẾ KỸ THUẬT

> **Thời điểm lập:** 2026-10-24 23:15:00 (GMT+7)  
> **Phiên bản:** v1.0.0 (Giai đoạn 1 — Audit & Planning Only)  
> **Vai trò:** Senior Business Analyst · Solution Architect · Database Architect · Senior NestJS/Prisma Backend Engineer · Next.js & React Native Engineer · UI/UX Designer · QA Architect  
> **Tài liệu căn cứ:** [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md) · [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md) · [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md)  
> **Nguyên tắc cốt lõi:** Tuyệt đối không sửa source code, không can thiệp Database schema/migration, không tự sinh test data, không commit/push trong phiên này.

---

## MỤC LỤC CHI TIẾT

- [A. Executive Summary (Tóm tắt điều hành)](#a-executive-summary-tóm-tắt-điều-hành)
- [B. Verified Repository Context (Ngữ cảnh mã nguồn đã xác minh)](#b-verified-repository-context-ngữ-cảnh-mã-nguồn-đã-xác-minh)
- [C. Approved Business Rules (Quy tắc nghiệp vụ đã phê duyệt: BR-01 đến BR-10)](#c-approved-business-rules-quy-tắc-nghiệp-vụ-đã-phê-duyệt-br-01-đến-br-10)
- [D. Root Cause Analysis (Phân tích nguyên nhân gốc cho bài toán A, B, C)](#d-root-cause-analysis-phân-tích-nguyên-nhân-gốc-cho-bài-toán-a-b-c)
- [E. Partial Optimization Architecture (Kiến trúc tối ưu hóa tuyến một phần)](#e-partial-optimization-architecture-kiến-trúc-tối-ưu-hóa-tuyến-một-phần)
- [F. Preview & Reoptimization Design (Thiết kế xem trước & tối ưu hóa lại)](#f-preview--reoptimization-design-thiết-kế-xem-trước--tối-ưu-hóa-lại)
- [G. Eligibility & Availability Design (Thiết kế điều kiện tham gia & khả dụng tài nguyên)](#g-eligibility--availability-design-thiết-kế-điều-kiện-tham-gia--khả-dụng-tài-nguyên)
- [H. Database Impact Analysis (Phân tích tác động cơ sở dữ liệu)](#h-database-impact-analysis-phân-tích-tác-động-cơ-sở-dữ-liệu)
- [I. API Contracts (Đặc tả hợp đồng giao diện lập trình ứng dụng)](#i-api-contracts-đặc-tả-hợp-đồng-giao-diện-lập-trình-ứng-dụng)
- [J. Web UI/UX Wireframes (Khung giao diện Web Admin: W1 đến W8)](#j-web-uiux-wireframes-khung-giao-diện-web-admin-w1-đến-w8)
- [K. Mobile Bottom Sheet Design & Wireframes (Khung giao diện Mobile: M1 đến M5)](#k-mobile-bottom-sheet-design--wireframes-khung-giao-diện-mobile-m1-đến-m5)
- [L. Cross-Domain Impact (Đánh giá ảnh hưởng chéo toàn hệ thống)](#l-cross-domain-impact-đánh-giá-ảnh-hưởng-chéo-toàn-hệ-thống)
- [M. Alternatives & Tradeoffs (So sánh phương án kỹ thuật & đánh đổi)](#m-alternatives--tradeoffs-so-sánh-phương-án-kỹ-thuật--đánh-đổi)
- [N. Recommended Architecture (Kiến trúc giải pháp đề xuất)](#n-recommended-architecture-kiến-trúc-giải-pháp-đề-xuất)
- [O. Implementation Plan (Kế hoạch triển khai phân kỳ: Phase A đến F)](#o-implementation-plan-kế-hoạch-triển-khai-phân-kỳ-phase-a-đến-f)
- [P. Test Matrix (Ma trận kiểm thử chấp nhận & hồi quy)](#p-test-matrix-ma-trận-kiểm-thử-chấp-nhận--hồi-quy)
- [Q. Risk Register (Sổ theo dõi & giảm thiểu rủi ro)](#q-risk-register-sổ-theo-dõi--giảm-thiểu-rủi-ro)
- [R. Product Owner Decisions Required (Các câu hỏi mở cần PO quyết định)](#r-product-owner-decisions-required-các-câu-hỏi-mở-cần-po-quyết-định)
- [S. Implementation Readiness Assessment (Đánh giá mức độ sẵn sàng triển khai)](#s-implementation-readiness-assessment-đánh-giá-mức-độ-sẵn-sàng-triển-khai)

---

## A. EXECUTIVE SUMMARY (TÓM TẮT ĐIỀU HÀNH)

### 1. Bối cảnh & Mục tiêu
Dự án **RoadToSchool v2.0** đang vận hành luồng lập tuyến và quản lý chuyến xe đưa đón học sinh tập trung cho một đơn vị vận tải với bãi đỗ xe duy nhất và các trường học đối tác. Qua khảo sát thực tế và phản hồi từ Product Owner, hệ thống tồn tại 3 rào cản vận hành lớn:
1. **Bài toán A (Partial VRP Optimization)**: Khi tối ưu hóa tuyến bằng VietMap VRP, nếu một số học sinh không thể phân tuyến (do lệch hướng, vượt sức chứa hoặc vượt giới hạn thời gian), hệ thống lập tức ném lỗi ngoại lệ và từ chối toàn bộ phương án, thay vì bảo toàn các tuyến đã tối ưu thành công cho những học sinh còn lại.
2. **Bài toán B (Resource Eligibility & Availability)**: Giao diện Web hiển thị toàn bộ xe, tài xế và nhân sự trong hệ thống mà không qua bộ lọc điều kiện (Eligibility) và tình trạng rảnh rỗi (Availability). Người dùng chọn xong mới bị Backend từ chối lúc bấm lưu (Save-time failure), gây ức chế và lãng phí thao tác.
3. **Bài toán C (Mobile Draggable Bottom Sheet)**: Màn hình chi tiết chuyến xe trên Mobile (`mobile/app/trip/[id].tsx`) hiện đang điều khiển Bottom Sheet thông qua nút bấm (click toggle), thiếu trải nghiệm kéo thả tự nhiên bằng ngón tay (Drag-to-snap gesture) giống Google Maps, đồng thời cần xử lý cuộn lồng danh sách điểm dừng mà không làm lag hoặc remount bản đồ Map WebView.

### 2. Kết luận chính
- **Về tính đúng đắn nghiệp vụ (Business Correctness)**: Tuân thủ tuyệt đối 10 quy tắc nghiệp vụ đã phê duyệt (`BR-01` đến `BR-10`). Phân định rạch ròi giữa quyền của **SYSTEM_ADMIN** (chạy VRP, xem Preview, tối ưu lại, xác nhận lưu DRAFT, phân công Xe/Tài xế) và quyền của **SCHOOL_ADMIN** (duyệt DRAFT thành ACTIVE, phân công Giáo viên phụ xe).
- **Về Database**: Áp dụng triệt để nguyên tắc **Minimal Database Principle**. Hệ thống **KHÔNG CẦN TẠO BẢNG MỚI** và **KHÔNG CẦN CHẠY MIGRATION PHỨC TẠP**. Mọi metadata về học sinh chưa phân tuyến (`unassignedStudents`), lý do phân tuyến và tỷ lệ bao phủ hoàn toàn có thể được lưu trữ trực tiếp trong trường `scheduleScope` (kiểu `Json`) vốn có của model `RoutePlan`.
- **Về Backend API**: Mở rộng các API chuẩn bị và phân công hiện có, bổ sung các query context-aware eligibility, phân loại mã lỗi rõ ràng (`INVALID_INPUT`, `UNASSIGNED_STUDENT`, `PARTIAL_SUCCESS`, `INVALID_ROUTE_RESULT`, `OPTIMIZATION_FAILURE`, `RESOURCE_CONFLICT`).
- **Về Mobile UX**: Sử dụng React Native `PanResponder` có sẵn trong core kết hợp với `Animated` / `react-native-reanimated` 4.7.1 để tạo Draggable Bottom Sheet mượt mà với 3 điểm neo (Collapsed 110dp, Half-expanded 45%, Fully-expanded 75%), **không cần cài thêm thư viện ngoài**, giải quyết triệt để vấn đề xung đột cử chỉ với Map WebView.
- **Về tuân thủ Working Rules**: Phiên làm việc này tuân thủ 100% chế độ **AUDIT & PLANNING ONLY**. Không sửa file nguồn, không can thiệp Database, không tự tạo dữ liệu test.

---

## B. VERIFIED REPOSITORY CONTEXT (NGỮ CẢNH MÃ NGUỒN ĐÃ XÁC MINH)

Mọi nhận định kỹ thuật dưới đây đều được thẩm định trực tiếp từ mã nguồn thực tế của repository, không suy đoán:

### 1. Backend Domain Models (`api/prisma/schema.prisma`)
- `School`: Lưu thông tin trường học, tọa độ (`latitude`, `longitude`), thời hạn hợp đồng (`contractStartDate`, `contractEndDate` kiểu `Date`), lịch học theo tuần (`weeklySchedule` kiểu `Json`), trạng thái `isActive`.
- `Student`: Hồ sơ học sinh, `schoolId`, tọa độ đón trả (`latitude`, `longitude`), trạng thái `StudentStatus` (`AVAILABLE`, `ASSIGNED`, `INACTIVE`), quan hệ với `School`, `ParentStudentLink`, `RouteStop`.
- `Vehicle`: Phương tiện nhà xe, `licensePlate`, `seatCount`, `color`, `brand`.
- `User`: Tài khoản người dùng với phân quyền `Role` (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`), liên kết trường học `schoolId` và trạng thái `isActive`.
- `SystemSetting`: Cấu hình tập trung `key: 'parking_lot'` lưu tọa độ và địa chỉ bãi đỗ xe trung tâm.
- `RoutePlan`: Phương án tuyến tổng thể, `status` (`DRAFT`, `ACTIVE`, `CANCELLED`), `scheduleScope` (`Json`), `routingConstraints` (`Json`), bộ đếm `totalStudents`, `totalOutboundRoutes`, `totalReturnRoutes`.
- `Route`: Tuyến một chiều (`TO_SCHOOL`, `TO_PARKING`), `routePlanId`, `proposedVehicleId`, `defaultDriverId`, `defaultBusAttendantId`, `polylineGeometry`, `departureTime`, `arrivalTime`.
- `RouteStop`: Điểm dừng trên tuyến, `routeId`, `stopOrder`, `stopType` (`PARKING_START`, `PICKUP`, `SCHOOL_ARRIVAL`, `SCHOOL_DEPARTURE`, `DROPOFF`, `PARKING_END`), `studentId`, `plannedArrivalTime`.
- `Trip`: Chuyến xe chạy theo ngày, được sinh từ RoutePlan ACTIVE, lưu snapshot tài nguyên gán thực tế.

### 2. Backend Services & Logic
- `api/src/routes/vietmap-vrp.service.ts`: Gọi VietMap VRP v1.1 endpoint với Integer ID Mapping (`UUID <-> 1..N`). Có hàm `normalizeVRPResponse` trích xuất `data.unassigned` và trả về `VRPSolutionResult` gồm `routes` và `unassignedJobIds`. Hàm `solveTSP` và `solveRouteV4` tính toán lại lộ trình hình học khi có thay đổi điểm dừng.
- `api/src/routes/routes.service.ts`:
  - `getPreparationData(schoolId)`: Lọc học sinh thuộc trường, `AVAILABLE`, có tọa độ, chưa nằm trong RoutePlan DRAFT; lấy danh sách xe sắp xếp theo `seatCount desc`.
  - `optimizePreview(dto, currentUser)`: Chạy VRP chiều đi (Bãi xe -> Trường), VRP chiều về (Trường -> Bãi xe), kiểm tra tính nhất quán 2 chiều (`Outbound ∩ Return`), loại học sinh thiếu chiều về và tính lại TSP cho tuyến đi.
  - `confirmPreview(dto, currentUser)`: Transaction atomic lưu `RoutePlan` DRAFT, các `Route` và `RouteStop`.
- `api/src/routes/resource-availability.service.ts`: Chứa logic nghiệp vụ thẩm định thay thế xe (`validateVehicleForGroup`), gán tài xế theo quy tắc Đơn trường (`validateDriverForGroup`), gán giáo viên theo trường (`validateBusAttendantForGroup`), và bảng kiểm 8 điều kiện sẵn sàng phê duyệt (`getApprovalReadiness`).

### 3. Frontend Web Architecture
- `web/src/app/admin/routes/create/page.tsx`: Màn hình Wizard tạo phương án gồm 2 chế độ:
  - Chế độ 1 (Setup): Lọc xe, học sinh, cài đặt ràng buộc thời gian (`maxRouteDurationMinutes`, `defaultStopServiceSeconds`), bản đồ Leaflet.
  - Chế độ 2 (Preview): Xem trước kết quả tối ưu, các tab Chiều đi, Chiều về, Chi tiết học sinh, nút "Hủy toàn bộ và lập lại" và "Xác nhận lưu toàn bộ phương án (DRAFT)".
- `web/src/components/admin/routes/route-plan-assignments.tsx`: Quản lý phân công Xe, Tài xế, Giáo viên phụ xe theo nhóm xe của phương án DRAFT.

### 4. Mobile App Architecture
- `mobile/package.json`: Chạy Expo SDK 58, React 19.3.0, React Native 0.88.0, `react-native-reanimated` 4.7.1, `react-native-webview` 14.0.1. **Chưa cài** `react-native-gesture-handler` hay `@gorhom/bottom-sheet`.
- `mobile/app/trip/[id].tsx`: Màn hình chi tiết chuyến xe với full-screen Map WebView và Bottom Sheet điều khiển bằng state `isExpanded` + nút bấm `onPress={toggleSheet}`.
- `mobile/app/parent/route-detail.tsx`: Chi tiết tuyến đường phụ huynh có cơ chế bảo mật thông tin riêng tư (Privacy-Safe Stops).

---

## C. APPROVED BUSINESS RULES (QUY TẮC NGHIỆP VỤ ĐÃ PHÊ DUYỆT: BR-01 ĐẾN BR-10)

Đây là các quyết định nghiệp vụ mang tính nguyên tắc tối cao đã được Product Owner xác nhận:

| Mã quy tắc | Tên quy tắc nghiệp vụ | Nội dung chuẩn hóa bắt buộc |
| :--- | :--- | :--- |
| **BR-01** | **Partial Route Optimization Is Allowed** | Việc một hoặc nhiều học sinh không thể phân tuyến **KHÔNG ĐƯỢC PHÉP LÀM THẤT BẠI** toàn bộ quá trình tối ưu. Hệ thống phải tiếp tục xây dựng các Route hợp lệ từ tập học sinh khả thi còn lại. Tuyệt đối không lưu tuyến rỗng hoặc tuyến hỏng. |
| **BR-02** | **Unassigned Students Must Be Reported** | Danh sách học sinh không thể phân tuyến phải được ghi nhận đầy đủ, không bị bỏ rơi âm thầm. Phải cung cấp thông tin chiều bị thiếu (nếu xác định được). Không mặc định học sinh được phân chiều đi là có chiều về. Không bắt buộc số tuyến 2 chiều bằng nhau. |
| **BR-03** | **Preview Must Display Unassigned Students** | Màn hình Preview bắt buộc hiển thị: Route tối ưu thành công, danh sách học sinh được phục vụ, danh sách học sinh chưa được phân tuyến, tỷ lệ bao phủ, lý do không thể phân tuyến (lý do cụ thể từ VietMap/Backend hoặc lý do chung hợp lý, không tự bịa lý do vô căn cứ). |
| **BR-04** | **System Admin Controls Route Optimization** | SYSTEM_ADMIN là actor duy nhất có quyền: chọn trường, chọn học sinh, chọn xe, cấu hình thông số, chạy VRP, xem Preview, điều chỉnh thông số, tối ưu lại và xác nhận Preview thành RoutePlan DRAFT. Không chuyển quyền này cho School Admin. |
| **BR-05** | **Reoptimization Must Be Supported** | Khi có học sinh chưa phân tuyến trong Preview, System Admin có 2 lựa chọn: (1) Điều chỉnh xe/học sinh/thông số rồi chạy tối ưu lại mà không mất dữ liệu cấu hình cũ; (2) Chấp nhận kết quả hợp lệ để xác nhận lưu RoutePlan DRAFT. |
| **BR-06** | **Confirm Preview Is Not School Approval** | Phân định rạch ròi 2 hành động độc lập: **SYSTEM_ADMIN Confirm Preview → RoutePlan DRAFT** và **SCHOOL_ADMIN Approve RoutePlan DRAFT → ACTIVE**. System Admin tuyệt đối không được tự ACTIVE. School Admin không được chạy VRP hoặc xác nhận Preview thay System Admin. |
| **BR-07** | **Existing RoutePlan Lifecycle Remains** | Vòng đời RoutePlan giữ nguyên: `DRAFT` → `ACTIVE` → `CANCELLED`. School Admin duyệt `DRAFT` → `ACTIVE`. Không cho phép chuyển `ACTIVE` → `CANCELLED`. Tuyệt đối không sửa geometry, điểm dừng hoặc học sinh của RoutePlan đã ACTIVE. |
| **BR-08** | **Resource Assignment RBAC** | Giữ nguyên ma trận phân quyền: SYSTEM_ADMIN phân công Vehicle và Driver; SCHOOL_ADMIN phân công Bus Attendant. Áp dụng cho cả mặc định trên RoutePlan và trên từng Trip. Không tạo đường bypass API/UI. |
| **BR-09** | **Trip Generation Must Remain Compatible** | Chuyến xe (Trip) chỉ được sinh từ RoutePlan ACTIVE và các Route thực tế đã lưu. Tuyệt đối không sinh Trip cho học sinh chưa phân tuyến. Không sinh Trip trong/trước ngày ACTIVE. Giữ nguyên Cron lookahead, tính lũy thừa snapshot và lịch theo vai trò. |
| **BR-10** | **No Self-Generated Test Data** | Tuân thủ Rule 6 trong `WORKING_RULES.md`: Tuyệt đối không tự tạo dữ liệu test, không seed DB, không tạo mock data trái quy định, không chạy mutation bừa bãi. |

---

## D. ROOT CAUSE ANALYSIS (PHÂN TÍCH NGUYÊN NHÂN GỐC CHO BÀI TOÁN A, B, C)

### 1. Bài toán A: Nguyên nhân hệ thống từ chối lưu toàn bộ khi tối ưu một phần
Qua kiểm tra `api/src/routes/routes.service.ts` và `api/src/routes/vietmap-vrp.service.ts`, xác định 4 điểm nghẽn kỹ thuật chính:
- **Điểm nghẽn A1 (Chặn cứng sức chứa trước VRP)**: Tại dòng 310-315 file `routes.service.ts`:
  ```ts
  const totalCapacity = vehicles.reduce((sum, v) => sum + v.seatCount, 0);
  if (totalCapacity < students.length) {
    throw new BadRequestException(`Tổng số ghế đã chọn (${totalCapacity} chỗ) không đủ cho ${students.length} học sinh.`);
  }
  ```
  Hệ thống ném lỗi ngay lập tức nếu tổng số ghế xe chọn nhỏ hơn số học sinh chọn, triệt tiêu hoàn toàn khả năng tối ưu một phần theo BR-01 (ví dụ: chọn 30 học sinh, có 1 xe 25 chỗ, hệ thống đáng lẽ phải xếp được 25 học sinh và báo 5 học sinh chưa được phân tuyến).
- **Điểm nghẽn A2 (Chặn cứng khi vượt thời gian tối đa)**: Tại dòng 501-524 file `routes.service.ts`, khi bất kỳ tuyến nào có `elapsed > maxSeconds`, hệ thống ném `BadRequestException` làm sập toàn bộ kết quả của các tuyến khác, thay vì cắt tỉa học sinh gây vượt thời gian để bảo toàn tuyến.
- **Điểm nghẽn A3 (Chặn cứng khi có học sinh không thỏa mãn cả 2 chiều)**: Khi có học sinh rơi vào chiều về (`droppedFromReturn`), mã nguồn hiện tại đã có cơ chế loại học sinh khỏi tuyến đi và recompute TSP, nhưng nếu tập `finalStudentIds.size === 0` thì ném lỗi sập toàn bộ mà không đưa ra gợi ý điều chỉnh tham số.
- **Điểm nghẽn A4 (Đánh mất danh sách học sinh chưa phân tuyến khi lưu DRAFT)**: Tại `confirmPreview` (dòng 1026-1031), `RoutePlan` chỉ lưu `totalStudents: summary.assignedBothWaysCount`. Danh sách `unassignedStudents` chỉ nằm trong bộ nhớ tạm `previewSessions` (RAM) và bị `delete` ngay sau khi lưu DRAFT (dòng 1105). Khi System Admin hoặc School Admin mở xem lại RoutePlan Detail, toàn bộ thông tin về các học sinh không phân tuyến bị biến mất hoàn toàn!

### 2. Bài toán B: Nguyên nhân người dùng chọn tài nguyên không phù hợp
Qua kiểm tra `web/src/components/admin/routes/route-plan-assignments.tsx` (dòng 82-91) và `api/src/routes/routes.controller.ts`:
- **Điểm nghẽn B1 (Gọi nhầm API danh mục toàn cục không có ngữ cảnh)**:
  - Khi thay xe: Frontend gọi `apiClient.listVehicles({ limit: 100 })` lấy toàn bộ xe trong hệ thống, không lọc theo sức chứa tối thiểu của nhóm tuyến (`minCapacity = max(students on routes in group)`), không kiểm tra xem xe đã được dùng ở nhóm khác của cùng phương án chưa.
  - Khi gán tài xế: Frontend gọi `apiClient.getDrivers({ limit: 100 })` lấy toàn bộ tài xế, không lọc theo quy tắc Đơn trường (Single-School Driver Rule) đối với các trường có thời hạn hợp đồng chồng lấn.
  - Khi gán giáo viên: Frontend gọi `apiClient.getSchoolEmployees` nhưng không lọc những giáo viên đã bị trùng lịch tuyến khác trong trường.
- **Điểm nghẽn B2 (Thiếu Endpoint cung cấp ứng viên đủ điều kiện - Candidate APIs)**: Backend hoàn toàn chưa có các endpoint chuyên dụng như `GET /route-plans/:id/candidate-vehicles`, `candidate-drivers`, `candidate-bus-attendants` có kèm lý do không khả dụng (`reasonCode`, `isAvailable`). Toàn bộ việc thẩm định bị dồn vào mutation time (`PATCH`), dẫn đến trải nghiệm "chọn xong bấm lưu mới báo lỗi đỏ".
- **Điểm nghẽn B3 (Tại bước Preparation)**: `getPreparationData` chỉ kiểm tra học sinh có nằm trong RoutePlan DRAFT hay không, nhưng không đánh dấu rõ ràng danh sách học sinh không đủ điều kiện đầu vào (thiếu tọa độ, tài khoản bị khóa) khiến người dùng không hiểu tại sao danh sách học sinh bị thiếu.

### 3. Bài toán C: Nguyên nhân Bottom Sheet trên Mobile bị giật và phụ thuộc nút bấm
Qua kiểm tra `mobile/app/trip/[id].tsx` (dòng 36-52 và 226-231):
- **Điểm nghẽn C1 (Không có Gesture Responder)**: Bottom Sheet hiện tại chỉ là một `Animated.View` có chiều cao gắn với `sheetHeightAnim`. Phần "Drag Handle" thực chất chỉ là một `TouchableOpacity` có `onPress={toggleSheet}`. Khi người dùng đặt ngón tay vuốt lên/xuống, không có gesture tracker nào bắt tọa độ delta `dy`, khiến sheet nằm bất động.
- **Điểm nghẽn C2 (Điều kiện render gây gián đoạn layout)**: Mã nguồn sử dụng `{isExpanded && <View style={styles.expandedContent}>...}`. Khi bấm mở, toàn bộ nội dung con mới bắt đầu mount vào React tree, gây hiện tượng khựng khung hình (jank).
- **Điểm nghẽn C3 (Xung đột cử chỉ với Map WebView và ScrollView)**: Khi Bottom Sheet mở rộng, bên trong chứa `ScrollView` điểm dừng. Nếu không cấu hình cơ chế lồng cử chỉ (nested scroll coordination), thao tác cuộn danh sách điểm dừng dễ bị nuốt mất hoặc kích hoạt sai cử chỉ cuộn của toàn màn hình.

---

## E. PARTIAL OPTIMIZATION ARCHITECTURE (KIẾN TRÚC TỐI ƯU HÓA TUYẾN MỘT PHẦN)

Kiến trúc xử lý bài toán tối ưu hóa một phần đảm bảo hệ thống không bị "tất cả hoặc không có gì" (all-or-nothing):

```
[System Admin chọn Học sinh & Xe]
               │
               ▼
   [Capacity Pre-check Mềm]
      ├─ Tổng ghế >= Học sinh: Gửi toàn bộ học sinh vào VRP
      └─ Tổng ghế < Học sinh: Cảnh báo thiếu ghế, VẪN CHO CHẠY VRP
               │
               ▼
    [Phase 1: VietMap VRP Chiều Đi] ──(Lỗi mạng/API 5xx)──► [Báo lỗi OPTIMIZATION_FAILURE]
               │ (HTTP 200 thành công)
               ├─ Trích xuất Outbound Routes hợp lệ
               └─ Trích xuất Outbound Unassigned Jobs (do thiếu xe/lệch route/vượt time)
               │
               ▼
    [Phase 2: VietMap VRP Chiều Về]
      ├─ Jobs = Học sinh đã có tuyến chiều đi (Outbound Assigned)
      └─ Vehicles = Xe đã được dùng ở chiều đi (Outbound Used)
               │
               ▼
    [Phase 3: Two-Direction Consistency Resolver]
      ├─ Học sinh có ĐỦ CẢ 2 CHIỀU: Đưa vào Final Assigned List
      └─ Học sinh THIẾU CHIỀU VỀ:
            ├─ Loại khỏi Route chiều đi tương ứng
            ├─ Tự động chạy VietMap TSP/Route v4 tái tính toán lại hình học & ETA tuyến đi
            └─ Chuyển vào Unassigned Students List (Kèm lý do: Thiếu xe chiều về)
               │
               ▼
    [Kiểm tra tính hợp lệ của phương án tối ưu một phần]
      ├─ ĐIỀU KIỆN 1: Tồn tại ít nhất 1 Route chiều đi và 1 Route chiều về hợp lệ
      ├─ ĐIỀU KIỆN 2: Mỗi Route có ít nhất 1 học sinh, hình học polyline hợp lệ
      ├─ ĐIỀU KIỆN 3: Không có Route nào vượt sức chứa của xe đề xuất
      └─ ĐIỀU KIỆN 4: Có ít nhất 1 học sinh được phục vụ trọn vẹn 2 chiều
               │
       ┌───────┴───────┐
    [THỎA MÃN]      [KHÔNG THỎA MÃN]
       │               │
       ▼               ▼
[PARTIAL_SUCCESS] [INVALID_ROUTE_RESULT]
Hiển thị Preview  Báo lỗi chặn rõ ràng
Cho phép DRAFT    Yêu cầu chỉnh tham số
```

### 1. Phân loại nguyên nhân không phân tuyến (Failure Reason Taxonomy)
Backend sẽ chuẩn hóa và gán lý do chính xác cho từng học sinh hoặc nhóm học sinh:
- `CAPACITY_EXCEEDED`: Số lượng học sinh vượt quá tổng số ghế của các phương tiện được chọn.
- `RETURN_DIRECTION_UNFEASIBLE`: Học sinh đã được phân tuyến chiều đi nhưng không tìm được xe hoặc lộ trình phù hợp cho chiều về.
- `TIME_WINDOW_VIOLATION`: Điểm đón/trả của học sinh quá xa bãi xe/trường, làm thời gian chạy vượt quá `maxRouteDurationMinutes` hoặc giờ vào lớp của trường.
- `ROUTING_DETOUR_OUTLIER`: Tọa độ học sinh nằm cô lập ở khu vực địa lý tách biệt, thuật toán VRP không thể ghép vào cụm xe nào khả thi.
- `GENERIC_UNASSIGNED`: "Không thể phân tuyến với số lượng xe và các ràng buộc hiện tại." (Sử dụng khi VietMap chỉ trả mã unassigned chung).

### 2. Thuật toán Cắt tỉa An toàn (Safe Pruning Algorithm)
Khi một tuyến vượt quá `maxRouteDurationMinutes`:
- Thay vì ném `BadRequestException` làm hỏng toàn bộ phiên xem trước, hệ thống xác định điểm dừng gây phát sinh thời gian lớn nhất (outlier stop) trên tuyến đó.
- Loại học sinh tại điểm dừng đó ra khỏi tuyến, chuyển vào danh sách `unassignedStudents` với lý do `TIME_WINDOW_VIOLATION`.
- Tái tính toán lại lộ trình hình học bằng `VietMap TSP v4` cho các học sinh còn lại trên tuyến.
- Nếu sau khi cắt tỉa mà tuyến đạt yêu cầu thời gian, tuyến đó trở thành hợp lệ. Nếu tuyến bị rỗng, xe đó được giải phóng.

---

## F. PREVIEW & REOPTIMIZATION DESIGN (THIẾT KẾ XEM TRƯỚC & TỐI ƯU HÓA LẠI)

### 1. Vòng đời Phiên Xem Trước (Preview Session Lifecycle)
- Mỗi lần chạy VRP thành công sinh ra một `previewToken` duy nhất dạng `prev_<timestamp>_<randomHex>` với TTL 30 phút.
- Phiên lưu trữ đầy đủ:
  - Thông số đầu vào (`schoolId`, `studentIds`, `vehicleIds`, `constraints`).
  - Danh sách `outboundRoutes` và `returnRoutes` (chi tiết từng stops, ETA, polyline).
  - Tóm tắt tổng kết: `totalSelectedStudents`, `assignedBothWaysCount`, `unassignedCount`, `unassignedStudents`.
- **Xử lý khi Reoptimization**:
  - Khi System Admin bấm "Chỉnh sửa thông số & Tối ưu lại", hệ thống **KHÔNG XÓA** ngay session cũ mà giữ nguyên dữ liệu trên Form Web Wizard.
  - Sau khi người dùng thay đổi tham số (thêm xe, đổi giới hạn thời gian, bỏ bớt học sinh) và bấm chạy lại, một `previewToken` mới được cấp phát, ghi đè tham chiếu phiên làm việc trên client. Token cũ sẽ tự hết hạn hoặc bị hủy an toàn.

### 2. Xác nhận lưu DRAFT an toàn (Safe Confirm to DRAFT)
Khi Preview có trạng thái `PARTIAL_SUCCESS`:
- Nút bấm trên UI ghi rõ: **"Xác nhận lưu phương án DRAFT (X/Y học sinh)"**.
- Một modal cảnh báo tóm tắt bật lên:
  - Liệt kê số lượng tuyến hợp lệ sẽ được lưu vào hệ thống.
  - Cảnh báo rõ số lượng và danh sách học sinh chưa được phân tuyến.
  - Xác nhận rõ hành động này chỉ tạo **RoutePlan DRAFT**, chưa kích hoạt đưa đón thực tế và chưa sinh bất kỳ Trip nào.
- Backend thực thi Transaction ACID:
  - Tạo record `RoutePlan` với `status: DRAFT`.
  - Lưu snapshot kết quả phân tuyến một phần vào trường `scheduleScope.summary`:
    ```json
    {
      "coverage": {
        "totalSelected": 30,
        "assignedCount": 25,
        "unassignedCount": 5,
        "coverageRate": 0.833
      },
      "unassignedStudents": [
        { "id": "uuid-1", "fullName": "Nguyễn Văn A", "reason": "Không tìm thấy xe phù hợp cho chiều về" },
        { "id": "uuid-2", "fullName": "Trần Thị B", "reason": "Vượt quá giới hạn thời gian tuyến 60 phút" }
      ]
    }
    ```
  - Lưu các bản ghi `Route` và `RouteStop` thực sự được phục vụ. Tuyệt đối không sinh Route ảo hay Stop rác cho học sinh chưa phân tuyến.

---

## G. ELIGIBILITY & AVAILABILITY DESIGN (THIẾT KẾ ĐIỀU KIỆN THAM GIA & KHẢ DỤNG TÀI NGUYÊN)

Hệ thống phân tách rành mạch hai khái niệm kỹ thuật cốt lõi:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TÀI NGUYÊN HỆ THỐNG                            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       [1. TÍNH HỢP LỆ (ELIGIBILITY)]    [2. TÍNH KHẢ DỤNG (AVAILABILITY)]
       Điều kiện tĩnh / Bán cố định       Điều kiện động / Phụ thuộc thời gian
       ────────────────────────────       ────────────────────────────────────
       • Thuộc trường / Biên chế          • Không bị trùng lịch DRAFT/ACTIVE
       • Tài khoản ACTIVE                 • Không bị gán ở nhóm khác cùng Plan
       • Đầy đủ tọa độ hợp lệ             • Thỏa mãn quy tắc Đơn trường
       • Đúng phân quyền Role             • Thời hạn hợp đồng không xung đột
```

### 1. Ma trận tiêu chuẩn điều kiện theo đối tượng

| Đối tượng | Điều kiện Hợp lệ Tĩnh (Eligibility) | Điều kiện Khả dụng Động (Availability) | Hành vi UX trên Web |
| :--- | :--- | :--- | :--- |
| **Học sinh (Student)** | - Thuộc trường đối tác đang chọn.<br>- `status === AVAILABLE`.<br>- Có tọa độ `latitude` & `longitude` hợp lệ. | - Chưa được gán vào bất kỳ RoutePlan nào đang ở trạng thái `DRAFT` hoặc `ACTIVE` của trường. | - Học sinh đủ điều kiện: Hiển thị checkbox chọn.<br>- Học sinh không đủ điều kiện: Hiển thị tab riêng hoặc disabled kèm badge lý do (vd: "Chưa có tọa độ", "Đang có tuyến chạy"). |
| **Xe (Vehicle) khi Lập tuyến** | - Xe tồn tại trong hệ thống.<br>- `seatCount > 0`. | - Không bị đề xuất trong RoutePlan DRAFT khác.<br>- Thời gian hợp đồng trường không xung đột với lịch xe đã ACTIVE. | - Sắp xếp theo số chỗ giảm dần.<br>- Hiển thị số chỗ, biển số, cảnh báo sức chứa tổng. |
| **Xe (Vehicle) khi Thay thế nhóm** | - Xe tồn tại trong hệ thống.<br>- `seatCount >= max(học sinh các tuyến trong nhóm)`. | - Không trùng với nhóm tuyến khác trong cùng phương án.<br>- Không bị xung đột lịch trong thời gian hợp đồng trường. | - Dropdown chỉ hiển thị xe thỏa mãn số chỗ tối thiểu của nhóm.<br>- Ghi chú rõ: "Cần tối thiểu N chỗ". |
| **Tài xế (Driver)** | - `role === DRIVER`.<br>- `isActive === true`. | - Thỏa mãn **Quy tắc Đơn trường**: Không phục vụ trường khác có thời hạn hợp đồng chồng lấn (`targetStart <= otherEnd && otherStart <= targetEnd`). | - Dropdown hiển thị tài xế khả dụng.<br>- Ẩn hoặc disabled tài xế đang kẹt ở trường khác kèm tên trường xung đột. |
| **Giáo viên (Bus Attendant)** | - `role === BUS_ATTENDANT`.<br>- `isActive === true`.<br>- `schoolId === plan.schoolId` (Thuộc biên chế trường). | - Chưa bị gán trùng lịch trên nhóm xe khác cùng ca chạy trong trường. | - Dropdown lọc cứng nhân sự của trường sở tại.<br>- Hiển thị trạng thái phân công. |

### 2. Shared Backend Validation & Concurrency Protection
- Tái sử dụng `ResourceAvailabilityService` làm Single Source of Truth cho cả:
  1. API nạp ứng viên (Candidate Query APIs).
  2. API thực thi thay đổi (Assignment Mutation APIs).
  3. API kiểm tra sẵn sàng phê duyệt (`getApprovalReadiness`).
- **Bảo vệ đồng thời (Concurrency Handling)**:
  - Khi người dùng gửi yêu cầu phân công (`PATCH /assignments/*`), Backend mở Prisma Transaction `$transaction(async (tx) => { ... })`.
  - Thực hiện câu truy vấn kiểm tra chéo (Re-validation) ngay trong transaction trước khi ghi dữ liệu.
  - Nếu phát hiện tài nguyên vừa bị người khác chọn hoặc thay đổi trạng thái, transaction lập tức rollback và trả về `409 Conflict` kèm thông điệp: "Tài nguyên vừa được cập nhật bởi quản trị viên khác. Vui lòng làm mới danh sách."

---

## H. DATABASE IMPACT ANALYSIS (PHÂN TÍCH TÁC ĐỘNG CƠ SỞ DỮ LIỆU)

### 1. Trả lời 7 câu hỏi của Nguyên tắc Minimal Database Principle

1. **Có thể giải quyết bằng Backend logic không?**
   - **CÓ**. Toàn bộ việc phân loại học sinh hợp lệ/không hợp lệ, lọc ứng viên xe/tài xế/giáo viên và kiểm tra xung đột thời gian hoàn toàn xử lý bằng logic nghiệp vụ của NestJS service dựa trên dữ liệu các bảng hiện có (`Student`, `Vehicle`, `User`, `School`, `RoutePlan`, `Route`).
2. **Có thể tận dụng dữ liệu hiện có không?**
   - **CÓ**. Model `RoutePlan` đã có sẵn trường `scheduleScope` (kiểu `Json`) và `routingConstraints` (kiểu `Json`).
3. **Có thể lưu partial optimization metadata trong JSON hiện có không?**
   - **CÓ**. Trường `scheduleScope` của `RoutePlan` hiện đang lưu `{ createdAt, constraints }`. Hoàn toàn có thể mở rộng lưu thêm đối tượng `summary` chứa `unassignedStudents` và `coverage` mà không làm thay đổi cấu trúc bảng.
4. **Có cần persist danh sách unassigned students sau khi xác nhận DRAFT không?**
   - **CÓ**. Cần lưu để khi System Admin hoặc School Admin mở xem lại RoutePlan Detail (`/admin/routes/plans/[id]`), hệ thống hiển thị được danh sách học sinh chưa có tuyến và lý do chưa phục vụ.
5. **Dữ liệu nào cần duy trì sau khi Preview session hết hạn?**
   - Sau khi Preview được confirm thành DRAFT, thông tin `unassignedStudents` được lưu vĩnh viễn vào `RoutePlan.scheduleScope`. Khi đó phiên tạm trong cache/RAM có thể xóa an toàn mà không làm mất dữ liệu.
6. **Có ảnh hưởng lịch sử RoutePlan không?**
   - **KHÔNG**. Các RoutePlan cũ vẫn giữ nguyên cấu trúc JSON hiện có, tính tương thích ngược đạt 100%.
7. **Có ảnh hưởng Trip đã tạo không?**
   - **KHÔNG**. Chuyến xe (Trip) chỉ sinh từ các tuyến `Route` và điểm dừng `RouteStop` thực tế đã lưu. Học sinh chưa phân tuyến không có trong `RouteStop` nên hoàn toàn không ảnh hưởng tới Trip.

### 2. Kết luận dứt khoát về Database
- **KẾT LUẬN: KHÔNG CẦN THAY ĐỔI SCHEMA VÀ KHÔNG CHẠY MIGRATION DATABASE.**
- Mọi thông tin phục vụ tối ưu hóa một phần và lọc điều kiện tài nguyên được đáp ứng trọn vẹn thông qua schema Prisma hiện tại bằng cách khai thác cấu trúc dữ liệu JSON bán cấu trúc có sẵn trên PostgreSQL.

---

## I. API CONTRACTS (ĐẶC TẢ HỢP ĐỒNG GIAO DIỆN LẬP TRÌNH ỨNG DỤNG)

### 1. Bảng tổng hợp API Impact Matrix

| STT | API Endpoint | Method | Vai trò (RBAC) | Thay đổi | Mục đích nghiệp vụ |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | `/routes/preparation/:schoolId` | `GET` | SYSTEM_ADMIN | Mở rộng DTO | Trả về cả `eligibleStudents` và `ineligibleStudents` kèm mã lý do. |
| 2 | `/routes/optimize-preview` | `POST` | SYSTEM_ADMIN | Cập nhật Logic | Cho phép VRP một phần khi thiếu ghế hoặc vượt thời gian, trả `summary.unassignedStudents`. |
| 3 | `/routes/confirm-plan` | `POST` | SYSTEM_ADMIN | Cập nhật Logic | Lưu an toàn DRAFT khi có kết quả tối ưu một phần hợp lệ, persist metadata vào `scheduleScope`. |
| 4 | `/routes/route-plans/:id` | `GET` | SYSTEM_ADMIN, SCHOOL_ADMIN | Mở rộng DTO | Trả về thông tin độ bao phủ học sinh và danh sách học sinh chưa phân tuyến. |
| 5 | `/routes/route-plans/:id/candidate-vehicles` | `GET` | SYSTEM_ADMIN | **MỚI** | Danh sách xe đủ điều kiện thay thế cho nhóm xe (lọc theo min capacity và lịch). |
| 6 | `/routes/route-plans/:id/candidate-drivers` | `GET` | SYSTEM_ADMIN | **MỚI** | Danh sách tài xế đủ điều kiện cho nhóm xe (lọc theo quy tắc Đơn trường). |
| 7 | `/routes/route-plans/:id/candidate-bus-attendants` | `GET` | SCHOOL_ADMIN | **MỚI** | Danh sách giáo viên phụ xe đủ điều kiện (lọc theo trường và trùng lịch ca). |
| 8 | `/trips/mobile/:id` | `GET` | ALL ROLES | Giữ nguyên Contract | Trả chi tiết chuyến xe cho Mobile với Privacy Masking cho Phụ huynh. |

### 2. Đặc tả chi tiết các DTO mở rộng và mới

#### API 1: `GET /api/v1/routes/preparation/:schoolId`
```json
// Response DTO mở rộng (RoutePreparationDto)
{
  "school": { "id": "school-uuid", "name": "Tiểu Học FPT", ... },
  "parkingLot": { "addressText": "Bãi xe trung tâm", "latitude": 10.82, "longitude": 106.62 },
  "eligibleStudents": [
    {
      "id": "st-1",
      "code": "HS001",
      "fullName": "Nguyễn Văn A",
      "addressText": "123 Lê Lợi, Q.1",
      "latitude": 10.77,
      "longitude": 106.70
    }
  ],
  "ineligibleStudents": [
    {
      "id": "st-2",
      "code": "HS002",
      "fullName": "Trần Thị B",
      "addressText": "Chưa cập nhật địa chỉ",
      "latitude": null,
      "longitude": null,
      "reasonCode": "MISSING_COORDINATES",
      "reasonMessage": "Học sinh chưa cập nhật tọa độ đón trả"
    },
    {
      "id": "st-3",
      "code": "HS003",
      "fullName": "Lê Văn C",
      "reasonCode": "ALREADY_ASSIGNED_ACTIVE",
      "reasonMessage": "Học sinh đang tham gia phương án tuyến ACTIVE khác"
    }
  ],
  "availableVehicles": [
    { "id": "v-1", "licensePlate": "51B-12345", "brand": "Thaco", "seatCount": 29 }
  ]
}
```

#### API 5: `GET /api/v1/routes/route-plans/:id/candidate-vehicles?currentVehicleId=xxx`
```json
// Response DTO (CandidateVehiclesResponseDto)
{
  "currentVehicleId": "v-old-uuid",
  "requiredCapacity": 22,
  "candidates": [
    {
      "id": "v-new-1",
      "licensePlate": "51B-99999",
      "seatCount": 29,
      "brand": "Hyundai",
      "isEligible": true,
      "reason": "Khả dụng (29 chỗ >= 22 chỗ yêu cầu)"
    },
    {
      "id": "v-new-2",
      "licensePlate": "51B-88888",
      "seatCount": 16,
      "brand": "Ford Transit",
      "isEligible": false,
      "reasonCode": "INSUFFICIENT_CAPACITY",
      "reason": "Sức chứa không đủ (16 chỗ < 22 chỗ yêu cầu)"
    }
  ]
}
```

#### API 6: `GET /api/v1/routes/route-plans/:id/candidate-drivers?vehicleId=xxx`
```json
// Response DTO (CandidateDriversResponseDto)
{
  "candidates": [
    {
      "id": "u-drv-1",
      "fullName": "Bác Tài 1",
      "phone": "0901234567",
      "isEligible": true,
      "reason": "Khả dụng"
    },
    {
      "id": "u-drv-2",
      "fullName": "Bác Tài 2",
      "phone": "0907654321",
      "isEligible": false,
      "reasonCode": "SINGLE_SCHOOL_CONFLICT",
      "reason": "Đang phục vụ tại THCS Vinschool có thời hạn hợp đồng chồng lấn"
    }
  ]
}
```

---

## J. WEB UI/UX WIREFRAMES (KHUNG GIAO DIỆN WEB ADMIN: W1 ĐẾN W8)

Áp dụng nghiêm ngặt nguyên tắc **Minimal UI Copy**: Không dùng đoạn văn mô tả thừa thãi; thông tin hiển thị dạng thẻ, bảng, badge rõ ràng.

### W1 — Route Preparation (Dữ liệu sẵn sàng lập tuyến)
```
+----------------------------------------------------------------------------------------------------+
| <- Quay lại danh sách phương án                                                                    |
| LẬP PHƯƠNG ÁN TUYẾN — TH TIỂU HỌC FPT                                                              |
| [28 học sinh đủ điều kiện] • [4 xe khả dụng] • [Bãi xe trung tâm]                                  |
+----------------------------------------------------------------------------------------------------+
| BẢN ĐỒ PHÂN BỐ TỌA ĐỘ                          | DANH SÁCH CHỌN XE TỐI ƯU                         |
| +--------------------------------------------+ | [x] 51B-12345 (Hyundai - 29 chỗ)                  |
| |              [S] TH FPT                    | | [x] 51B-67890 (Thaco - 29 chỗ)                    |
| |                                            | | Sức chứa đã chọn: 58 chỗ / 28 học sinh (ĐỦ CHỖ)  |
| |    (1)              (3)                    | |--------------------------------------------------|
| |            (2)                             | | DANH SÁCH HỌC SINH ĐỦ ĐIỀU KIỆN (28)             |
| |                                            | | [ Chọn tất cả ] [ Bỏ chọn ]                      |
| | [P] Bãi xe                                 | | [x] HS001 - Nguyễn Văn A - 123 Lê Lợi, Q.1       |
| +--------------------------------------------+ | [x] HS002 - Trần Thị B - 456 Hai Bà Trưng, Q.3   |
| [Tab Học sinh đủ điều kiện (28)]               | [ ] HS003 - Lê Văn C - 789 CMT8, Q.10            |
| [Tab Học sinh chưa đủ điều kiện (3)]          |                                                    |
|  * HS099 - Chưa có tọa độ đón trả [Bổ sung]  | [ TỐI ƯU HÓA TUYẾN ĐƯỜNG (VIETMAP VRP) ]           |
+----------------------------------------------------------------------------------------------------+
```

### W4 — VRP Preview: Partial Success (Tối ưu một phần thành công)
```
+----------------------------------------------------------------------------------------------------+
| XEM TRƯỚC PHƯƠNG ÁN TUYẾN (PREVIEW)                                                                |
| CẢNH BÁO: TỐI ƯU MỘT PHẦN — 25/28 học sinh được phân tuyến • 3 học sinh chưa thể phục vụ           |
|                                         [ Chỉnh sửa tham số & Chạy lại ] [ XÁC NHẬN LƯU DRAFT ]   |
+----------------------------------------------------------------------------------------------------+
| [ 25 Em đủ 2 chiều ]    [ 3 Em chưa phân tuyến ]    [ 2 Tuyến chiều đi ]    [ 2 Tuyến chiều về ]   |
|----------------------------------------------------------------------------------------------------|
| [ Chiều đi (2 tuyến) ]  [ Chiều về (2 tuyến) ]  [ Chi tiết học sinh (28 em) ]                      |
|----------------------------------------------------------------------------------------------------|
| DANH SÁCH TUYẾN CHIỀU ĐI                   | BẢN ĐỒ TUYẾN & ĐIỂM DỪNG                              |
| (*) Tuyến Đi 01 (Xe 51B-12345)             | +---------------------------------------------------+ |
|     14 học sinh • 18.2 km • ~42 phút       | | [P] Bãi xe -> (1) -> (2) -> (3) -> [S] Trường     | |
|     Lộ trình: 06:18 -> 07:00               | | Tuyến đường thực tế hiển thị theo đường giao thông| |
| ( ) Tuyến Đi 02 (Xe 51B-67890)             | +---------------------------------------------------+ |
|     11 học sinh • 15.6 km • ~38 phút       | THỨ TỰ ĐIỂM DỪNG (TUYẾN ĐI 01)                       |
|     Lộ trình: 06:22 -> 07:00               | 1. [P] Bãi xe xuất phát      - 06:18                   |
|--------------------------------------------| 2. Nguyễn Văn A (123 Lê Lợi) - 06:26 (+8p)            |
| HỌC SINH CHƯA ĐƯỢC PHÂN TUYẾN (3 em)       | 3. Trần Thị B (456 HBT)      - 06:35 (+17p)           |
| ! Hoàng Văn E: Thiếu xe phù hợp chiều về   | 4. [S] Trường học đến        - 07:00 (+42p)           |
| ! Đỗ Thị F: Vượt giới hạn thời gian tuyến  |                                                       |
+----------------------------------------------------------------------------------------------------+
```

### W6 — Confirm DRAFT Modal (Xác nhận lưu phương án DRAFT)
```
+--------------------------------------------------------------------+
| XÁC NHẬN LƯU PHƯƠNG ÁN TUYẾN DRAFT                                 |
+--------------------------------------------------------------------+
| Phương án có kết quả tối ưu một phần:                               |
| • Số học sinh được phục vụ: 25 học sinh (Đủ 2 chiều)               |
| • Số học sinh chưa được phân tuyến: 3 học sinh                     |
| • Số tuyến tạo mới: 4 tuyến (2 tuyến đi, 2 tuyến về)               |
|                                                                    |
| Lưu ý nghiệp vụ:                                                   |
| - Phương án sẽ được lưu ở trạng thái DRAFT.                        |
| - Chỉ SCHOOL_ADMIN mới có quyền phê duyệt kích hoạt (ACTIVE).      |
| - Tuyệt đối không có chuyến xe nào được sinh cho đến khi ACTIVE.   |
|                                                                    |
| Tên phương án: [ Phương án đưa đón TH FPT - HK1 (2026-2027)      ] |
|                                                                    |
|                  [ Hủy bỏ ]    [ XÁC NHẬN LƯU DRAFT ]              |
+--------------------------------------------------------------------+
```

### W7 — RoutePlan Detail (Chi tiết phương án DRAFT)
```
+----------------------------------------------------------------------------------------------------+
| <- Danh sách phương án                                                    Trạng thái: [ DRAFT ]     |
| PHƯƠNG ÁN TUYẾN: TH FPT - HK1 (2026-2027)                                                          |
| Người tạo: Nguyễn Quản Trị (Nhà xe) • Ngày tạo: 24/10/2026                                         |
+----------------------------------------------------------------------------------------------------+
| TỶ LỆ BAO PHỦ: 25/28 học sinh (89.3%) | ĐIỀU KIỆN KÍCH HOẠT: 6/8 đạt (Chưa gán Giáo viên phụ xe)   |
|----------------------------------------------------------------------------------------------------|
| [ Tab Các tuyến đường (4) ]  [ Tab Phân công tài nguyên (2 nhóm) ]  [ Tab Học sinh chưa tuyến (3) ] |
|----------------------------------------------------------------------------------------------------|
| BẢNG HỌC SINH CHƯA ĐƯỢC PHÂN TUYẾN TRONG PHƯƠNG ÁN NÀY:                                             |
| Mã HS   | Họ và tên      | Địa chỉ đón trả            | Lý do không thể phân tuyến                 |
| HS015   | Hoàng Văn E    | 12 Nguyễn Trãi, Q.5        | Không tìm thấy xe phù hợp cho chiều về     |
| HS022   | Đỗ Thị F       | 88 Bình Quới, Bình Thạnh   | Vượt giới hạn thời gian tối đa (60 phút)   |
| HS029   | Vũ Văn G       | 99 Nguyễn Thị Thập, Q.7    | Điểm đón lệch hướng cụm tuyến xe           |
+----------------------------------------------------------------------------------------------------+
```

### W8 — Resource Assignment Candidate Modal (Modal chọn xe / tài xế / giáo viên)
```
+--------------------------------------------------------------------+
| THAY ĐỔI XE CHO NHÓM TUYẾN (Yêu cầu tối thiểu: 22 chỗ)              |
+--------------------------------------------------------------------+
| [ Tìm theo biển số, dòng xe...                                  ]  |
|--------------------------------------------------------------------|
| Biển số    | Sức chứa | Dòng xe     | Trạng thái khả dụng          |
|--------------------------------------------------------------------|
| (o) 51B-99999 | 29 chỗ   | Hyundai     | [✓ Khả dụng]                 |
| ( ) 51B-88888 | 16 chỗ   | Ford        | [✕ Không đủ chỗ (16 < 22)]   |
| ( ) 51B-77777 | 35 chỗ   | Universe    | [✕ Đã dùng ở nhóm tuyến 2]   |
|--------------------------------------------------------------------|
|                [ Đóng ]      [ LƯU PHÂN CÔNG XE ]                  |
+--------------------------------------------------------------------+
```

---

## K. MOBILE BOTTOM SHEET DESIGN & WIREFRAMES (KHUNG GIAO DIỆN MOBILE: M1 ĐẾN M5)

### 1. Kiến trúc Cử chỉ Kéo thả (Draggable Sheet Gesture Architecture)
- Tận dụng `PanResponder` trong React Native Core kết hợp giá trị động `Animated.Value`:
  - `sheetHeight`: Chiều cao hiện tại của sheet.
  - Điểm neo 1: `COLLAPSED_HEIGHT = 110` (Hiển thị Header tóm tắt, tên tuyến, giờ, xe).
  - Điểm neo 2: `MID_HEIGHT = SCREEN_HEIGHT * 0.45` (Hiển thị thêm danh sách điểm dừng thu gọn).
  - Điểm neo 3: `EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75` (Mở rộng toàn bộ tabs và cuộn danh sách).
- **Cơ chế Snap & Flick**:
  - Khi ngón tay kéo: `sheetHeight = lastHeight - gestureState.dy`.
  - Khi thả ngón tay (`onPanResponderRelease`):
    - Nếu vận tốc vuốt lên `vy < -0.5` -> Tự động snap lên điểm neo cao hơn (`EXPANDED_HEIGHT`).
    - Nếu vận tốc vuốt xuống `vy > 0.5` -> Tự động snap xuống điểm neo thấp hơn (`COLLAPSED_HEIGHT`).
    - Nếu thả tay từ từ: So sánh khoảng cách delta so với các mốc neo để snap về mốc gần nhất bằng `Animated.spring({ bounciness: 4 })`.
- **Phối hợp Cuộn lồng (Nested Scroll Coordination)**:
  - Chỉ cho phép `ScrollView` của danh sách điểm dừng cuộn khi Bottom Sheet đã đạt trạng thái `EXPANDED_HEIGHT`.
  - Khi đang ở mốc lửng hoặc thu gọn, thanh kéo (Drag Handle Area) chiếm toàn quyền bắt cử chỉ `PanResponder`.
  - Không remount hoặc reload Map WebView khi kéo sheet. Map WebView nằm cố định ở tầng nền (`StyleSheet.absoluteFill`).

### 2. Mobile Wireframes

#### M1: Collapsed State (Thu gọn — Chiều cao 110dp)
```
+------------------------------------+
|  [<-]  CHI TIẾT CHUYẾN XE          |
|                                    |
|         [BẢN ĐỒ TOÀN MÀN HÌNH]     |
|           (P)=======(1)            |
|                      \\            |
|                       (2)=====[S]  |
|                                    |
|====================================|
|                ====  (Drag Handle) |
| Tuyến Đi 01 - Sáng       [Chiều đi]|
| 06:18 - 07:00 • TH Tiểu Học FPT    |
+------------------------------------+
```

#### M2: During Dragging (Đang kéo ngón tay theo thời gian thực)
```
+------------------------------------+
|  [<-]                              |
|         [BẢN ĐỒ VÙNG TRÊN]         |
|                                    |
|====================================|
|                ====  (Theo tay dy) |
| Tuyến Đi 01 - Sáng       [Chiều đi]|
| 06:18 - 07:00 • TH Tiểu Học FPT    |
|------------------------------------|
| [ Thông tin ]    [ Điểm đón (14) ] |
| Tài xế: Bác Tài 1 (0901234567)     |
| Xe: 51B-12345 (29 chỗ)             |
| ...                                |
+------------------------------------+
```

#### M4: Expanded Stops Tab (Mở rộng danh sách điểm dừng — 75% màn hình)
```
+------------------------------------+
|         [BẢN ĐỒ THU NHỎ PHÍA TRÊN] |
|====================================|
|                ====                |
| Tuyến Đi 01 - Sáng       [Chiều đi]|
| 06:18 - 07:00 • TH Tiểu Học FPT    |
|------------------------------------|
| [ Thông tin ]    [* Điểm đón (14)*]|
|                                    |
| (P) Bãi xe trung tâm      06:18    |
|     Xuất phát                      |
|  |                                 |
| (1) Nguyễn Văn A          06:26    |
|     123 Lê Lợi, Q.1                |
|  |                                 |
| (2) Trần Thị B            06:35    |
|     456 Hai Bà Trưng, Q.3          |
|  |                                 |
| [S] Trường Tiểu Học FPT   07:00    |
|     Điểm đến cuối                  |
+------------------------------------+
```

#### M5: Parent Privacy-Safe Stops (Giao diện bảo mật riêng tư cho Phụ huynh)
```
+------------------------------------+
|         [BẢN ĐỒ VỊ TRÍ CON]        |
|====================================|
|                ====                |
| Tuyến Đi 01 - Sáng       [Chiều đi]|
| Con: Nguyễn Văn A (Lớp 3A)         |
|------------------------------------|
| [* Điểm đón của con *]             |
|                                    |
| (P) Bãi xe trung tâm      06:18    |
|  |                                 |
| (*) Nguyễn Văn A (Con bạn) 06:26   |
|     123 Lê Lợi, Q.1  [Điểm đón con]|
|  |                                 |
| ( ) Học sinh khác         --:--    |
|     Điểm đón học sinh              |
|  |                                 |
| [S] Trường Tiểu Học FPT   07:00    |
|     Điểm đến trường học            |
+------------------------------------+
```

---

## L. CROSS-DOMAIN IMPACT (ĐÁNH GIÁ ẢNH HƯỞNG CHÉO TOÀN HỆ THỐNG)

- **Ảnh hưởng RoutePlan & Route**:
  - Không thay đổi cấu trúc bảng `route_plans` hay `routes`.
  - Bộ đếm `totalStudents` phản ánh chính xác số học sinh thực tế được phục vụ trọn vẹn cả 2 chiều trong phương án.
  - Trường `scheduleScope` lưu thêm danh sách học sinh chưa phân tuyến để hiển thị trên RoutePlan Detail.
- **Ảnh hưởng Trip Management**:
  - Tiến trình sinh Trip tự động (Cron job hoặc sinh thủ công) chỉ quét qua các Route thuộc RoutePlan có `status === ACTIVE`.
  - Các học sinh không được phân tuyến trong DRAFT tuyệt đối không phát sinh điểm dừng trong `RouteStop`, do đó không xuất hiện trong Trip hay bảng điểm danh của Giáo viên phụ xe.
- **Ảnh hưởng School Admin Approval Flow**:
  - Quy trình duyệt của School Admin (`POST /routes/route-plans/:id/approve`) giữ nguyên 8 điều kiện thẩm định.
  - School Admin thấy rõ tỷ lệ bao phủ học sinh trên màn hình trước khi bấm duyệt.
- **Ảnh hưởng Parent Mobile Experience**:
  - Phụ huynh có con nằm trong danh sách không phân tuyến sẽ không thấy chuyến xe xuất hiện trong màn hình Lịch trình (`mobileParentSchedule`). Con của họ vẫn giữ nguyên trạng thái `AVAILABLE` trong trường.
  - Phụ huynh có con được phân tuyến tiếp tục theo dõi chuyến xe bình thường với cơ chế ẩn thông tin cá nhân của học sinh khác.

---

## M. ALTERNATIVES & TRADEOFFS (SO SÁNH PHƯƠNG ÁN KỸ THUẬT & ĐÁNH ĐỔI)

### 1. Bài toán A: Hỗ trợ Partial VRP Optimization

| Tiêu chí | Phương án 1 (Khuyến nghị): Multi-pass Two-Direction Resolver | Phương án 2: Greedy Drop tại Client trước khi gọi VRP |
| :--- | :--- | :--- |
| **Mô tả** | Gửi toàn bộ học sinh được chọn lên Backend. Backend gọi VRP chiều đi, trích xuất unassigned, dùng kết quả giải chiều về, giải quyết xung đột 2 chiều và cắt tỉa bằng TSP v4. | Bắt người dùng tự đoán và bỏ bớt học sinh ở màn hình Setup cho đến khi tổng số ghế lớn hơn hoặc bằng số học sinh. |
| **Ưu điểm** | - Thuật toán tối ưu hóa vị trí địa lý chính xác nhất.<br>- Đúng tuyệt đối tinh thần BR-01.<br>- Trả về lý do khách quan từ VietMap. | - Backend đơn giản, không cần xử lý cắt tỉa. |
| **Nhược điểm** | - Backend cần xử lý logic đồng bộ 2 chiều cẩn trọng. | - Trải nghiệm người dùng rất tệ.<br>- Vi phạm quy tắc BR-01. |
| **Tác động DB** | Không thay đổi DB (lưu metadata trong JSON). | Không thay đổi DB. |

### 2. Bài toán B: Lọc điều kiện tài nguyên (Eligibility & Availability)

| Tiêu chí | Phương án 1 (Khuyến nghị): Dedicated Candidate Query APIs | Phương án 2: Frontend tự lọc từ API danh mục chung |
| :--- | :--- | :--- |
| **Mô tả** | Bổ sung các endpoint chuyên dụng: `/candidate-vehicles`, `/candidate-drivers`, `/candidate-bus-attendants` có truyền ngữ cảnh (`planId`, `vehicleId`, ngày hợp đồng). | Giữ nguyên các API danh mục chung (`listVehicles`, `getDrivers`, `getSchoolEmployees`), viết logic lọc lặp lại ở React frontend. |
| **Ưu điểm** | - Backend làm chủ 100% nghiệp vụ (Single Source of Truth).<br>- Tránh rò rỉ logic nghiệp vụ ra FE.<br>- Trả về lý do không đủ điều kiện trực quan. | - Không cần viết thêm endpoint ở Backend. |
| **Nhược điểm** | - Cần định nghĩa thêm 3 endpoint nhẹ ở Backend. | - Trùng lặp code, nguy cơ mâu thuẫn giữa FE và BE.<br>- Tải dữ liệu nặng, không hỗ trợ tốt khi dữ liệu lớn. |
| **Tác động DB** | Không thay đổi DB. | Không thay đổi DB. |

### 3. Bài toán C: Mobile Bottom Sheet Draggable

| Tiêu chí | Phương án 1 (Khuyến nghị): Built-in PanResponder + Animated | Phương án 2: Cài thêm `@gorhom/bottom-sheet` |
| :--- | :--- | :--- |
| **Mô tả** | Tận dụng `PanResponder` và `Animated` có sẵn trong React Native Core, tích hợp tính toán `dy`, `vy` và snap mượt mà. | Cài đặt thư viện bên ngoài `@gorhom/bottom-sheet` và `react-native-gesture-handler`. |
| **Ưu điểm** | - **Không cài thêm dependency** (Tuân thủ Rule 18).<br>- Tương thích tuyệt đối với React 19 / RN 0.88 / Expo 58.<br>- Nhẹ, kiểm soát hoàn toàn cử chỉ và map touch. | - Có sẵn nhiều tính năng nâng cao đóng gói sẵn. |
| **Nhược điểm** | - Cần tính toán cẩn thận logic snap và velocity. | - Nguy cơ xung đột phiên bản cao với React 19 và Expo SDK 58.<br>- Tăng kích thước ứng dụng. |

---

## N. RECOMMENDED ARCHITECTURE (KIẾN TRÚC GIẢI PHÁP ĐỀ XUẤT)

1. **Về Bài toán A**: Áp dụng **Phương án 1 (Multi-pass Two-Direction Resolver)**:
   - Cho phép chạy VRP kể cả khi số ghế nhỏ hơn số học sinh.
   - Bóc tách unassigned jobs từ VietMap.
   - Xử lý đồng bộ 2 chiều an toàn bằng cách loại học sinh thiếu chiều về và tính lại hình học tuyến đi qua VietMap TSP/Route v4.
   - Lưu metadata bao phủ và danh sách học sinh chưa phân tuyến vào `scheduleScope` của `RoutePlan` DRAFT.
2. **Về Bài toán B**: Áp dụng **Phương án 1 (Dedicated Candidate Query APIs)**:
   - Xây dựng 3 endpoint chuyên biệt cho ứng viên Xe, Tài xế, Giáo viên phụ xe.
   - Tái sử dụng `ResourceAvailabilityService` làm lõi thẩm định chung cho cả Candidate APIs, Mutation APIs và Approval Readiness.
   - Thêm bảo vệ đồng thời (Concurrency check) bằng transaction ngắn khi mutation.
3. **Về Bài toán C**: Áp dụng **Phương án 1 (Built-in PanResponder + Animated)**:
   - Xây dựng component `DraggableBottomSheet` tái sử dụng, điều khiển mượt mà 3 mốc neo (110dp, 45%, 75%).
   - Tách biệt vùng bắt cử chỉ Drag Handle và ScrollView điểm dừng.
   - Bảo toàn Map WebView nguyên vẹn ở tầng nền, không reload hay giật lag.

---

## O. IMPLEMENTATION PLAN (KẾ HOẠCH TRIỂN KHAI PHÂN KỲ: PHASE A ĐẾN F)

> **Cảnh báo tuân thủ:** Đây là kế hoạch lập ra để chờ phê duyệt. Không tự ý triển khai mã nguồn khi chưa có lệnh từ Product Owner.

### Phase A — Eligibility & Preparation APIs & UI
- **Mục tiêu**: Lọc và tách bạch học sinh đủ điều kiện / không đủ điều kiện; lọc xe khả dụng tại bước chuẩn bị lập tuyến.
- **Dependencies**: Không.
- **Tệp tác động dự kiến**:
  - `api/src/routes/dto/route-preparation.dto.ts`
  - `api/src/routes/routes.service.ts`
  - `web/src/app/admin/routes/create/page.tsx`
- **Tiêu chí hoàn thành (Exit Criteria)**: API trả về đúng danh sách học sinh kèm lý do không đủ điều kiện; Web hiển thị rõ ràng và không cho chọn học sinh thiếu tọa độ.

### Phase B — Partial VRP Optimization Engine
- **Mục tiêu**: Bỏ chặn cứng sức chứa trước VRP; bóc tách unassigned jobs; tự động cắt tỉa và tái tính toán tuyến đi khi học sinh thiếu chiều về.
- **Dependencies**: Hoàn thành Phase A.
- **Tệp tác động dự kiến**:
  - `api/src/routes/vietmap-vrp.service.ts`
  - `api/src/routes/routes.service.ts`
  - `api/src/routes/dto/route-preview-response.dto.ts`
- **Tiêu chí hoàn thành (Exit Criteria)**: Khi chọn 30 học sinh và xe 25 chỗ, VRP trả về 25 học sinh thành công và ghi nhận 5 học sinh chưa phân tuyến mà không ném ngoại lệ 400.

### Phase C — Preview, Reoptimization & Safe DRAFT Confirmation
- **Mục tiêu**: Nâng cấp giao diện Preview hiển thị học sinh chưa phân tuyến; hỗ trợ nút chỉnh sửa tham số chạy lại; lưu DRAFT an toàn kèm metadata vào `scheduleScope`.
- **Dependencies**: Hoàn thành Phase B.
- **Tệp tác động dự kiến**:
  - `api/src/routes/routes.service.ts`
  - `web/src/app/admin/routes/create/page.tsx`
  - `web/src/app/admin/routes/plans/[id]/page.tsx`
- **Tiêu chí hoàn thành (Exit Criteria)**: System Admin lưu được DRAFT một phần; mở chi tiết RoutePlan xem lại thấy đầy đủ danh sách học sinh chưa phân tuyến.

### Phase D — Resource Assignment Candidate APIs & Modals
- **Mục tiêu**: Tạo 3 endpoint candidate cho Xe, Tài xế, Giáo viên phụ xe; nâng cấp modal phân công trên Web.
- **Dependencies**: Không phụ thuộc Phase B/C (có thể làm song song).
- **Tệp tác động dự kiến**:
  - `api/src/routes/routes.controller.ts`
  - `api/src/routes/resource-availability.service.ts`
  - `web/src/components/admin/routes/route-plan-assignments.tsx`
  - `web/src/lib/api-client.ts`
- **Tiêu chí hoàn thành (Exit Criteria)**: Dropdown thay xe chỉ hiện xe đủ chỗ; dropdown tài xế loại trừ tài xế trùng lịch trường khác; loại bỏ hoàn toàn lỗi đỏ bất ngờ khi submit.

### Phase E — Mobile Draggable Bottom Sheet
- **Mục tiêu**: Chuyển đổi Bottom Sheet trên Mobile sang cơ chế vuốt kéo ngón tay thực sự bằng `PanResponder`, hỗ trợ snap points và cuộn điểm dừng lồng nhau.
- **Dependencies**: Không phụ thuộc Backend.
- **Tệp tác động dự kiến**:
  - `mobile/app/trip/[id].tsx`
  - Tạo mới component `mobile/components/draggable-bottom-sheet.tsx`
- **Tiêu chí hoàn thành (Exit Criteria)**: Vuốt sheet trượt theo ngón tay mượt mà; thả tay snap chuẩn xác về 3 mốc neo; chạm và tương tác bản đồ vùng trên bình thường; danh sách điểm dừng cuộn êm.

### Phase F — Regression Testing & Verification
- **Mục tiêu**: Kiểm tra hồi quy toàn diện các luồng: Duyệt ACTIVE của School Admin, sinh Trip tự động, lịch trình Mobile của Tài xế và Phụ huynh.
- **Dependencies**: Hoàn thành Phase A, B, C, D, E.
- **Tiêu chí hoàn thành (Exit Criteria)**: 100% Unit/E2E test pass; Swagger đồng bộ đầy đủ; không phát sinh bất kỳ lỗi hồi quy nào.

---

## P. TEST MATRIX (MA TRẬN KIỂM THỬ CHẤP NHẬN & HỒI QUY)

> **Tuân thủ chính sách Test Data:** Không tự tạo dữ liệu trong DB. Các ca kiểm thử yêu cầu dữ liệu đặc thù sẽ được đánh dấu trạng thái tương ứng.

| Mã Test | Phân hệ | Kịch bản kiểm thử | Kết quả mong đợi | Trạng thái thẩm định |
| :--- | :--- | :--- | :--- | :---: |
| **TC-A01** | VRP Engine | Chọn 30 học sinh, chọn xe 25 chỗ | VRP chạy thành công, trả 25 học sinh có tuyến, 5 học sinh unassigned, không ném 400 | `NOT_VERIFIED` (Chờ Phase B) |
| **TC-A02** | VRP Engine | Tuyến chiều đi có 1 học sinh không xếp được chiều về | Tuyến đi tự động cắt tỉa học sinh đó, tính lại TSP, học sinh đưa vào unassigned | `NOT_VERIFIED` (Chờ Phase B) |
| **TC-A03** | VRP Engine | Không tìm được bất kỳ tuyến hợp lệ nào (0 học sinh thỏa mãn) | Trả về `INVALID_ROUTE_RESULT` kèm thông báo hướng dẫn điều chỉnh thông số | `NOT_VERIFIED` (Chờ Phase B) |
| **TC-A04** | VRP Engine | VietMap API timeout hoặc lỗi mạng | Báo lỗi `OPTIMIZATION_FAILURE` rõ ràng, không coi là partial success | `NOT_VERIFIED` (Chờ Phase B) |
| **TC-B01** | Preview UI | Màn hình Preview hiển thị danh sách unassigned | Thẻ thống kê hiển thị số lượng, tab học sinh hiển thị lý do cụ thể | `NOT_VERIFIED` (Chờ Phase C) |
| **TC-B02** | Preview UI | System Admin bấm "Chỉnh sửa thông số & Tối ưu lại" | Giữ nguyên các xe và học sinh đã chọn, cho phép sửa thời gian và chạy lại | `NOT_VERIFIED` (Chờ Phase C) |
| **TC-B03** | Confirm DRAFT | System Admin bấm xác nhận DRAFT khi tối ưu một phần | Lưu thành công RoutePlan DRAFT; không chuyển ACTIVE; không sinh Trip | `NOT_VERIFIED` (Chờ Phase C) |
| **TC-B04** | Plan Detail | Xem chi tiết RoutePlan DRAFT vừa tạo | Hiển thị chính xác tỷ lệ bao phủ và 5 học sinh chưa được phân tuyến | `NOT_VERIFIED` (Chờ Phase C) |
| **TC-C01** | Eligibility | Học sinh thiếu tọa độ tại bước Preparation | Nằm ở tab riêng / disabled, không gửi vào VRP | `NOT_VERIFIED` (Chờ Phase A) |
| **TC-C02** | Eligibility | Modal thay xe hiển thị danh sách xe ứng viên | Chỉ cho phép chọn xe có `seatCount >= requiredCapacity` | `NOT_VERIFIED` (Chờ Phase D) |
| **TC-C03** | Eligibility | Modal gán tài xế hiển thị danh sách tài xế | Loại bỏ tài xế đang phục vụ tại trường khác có hợp đồng chồng lấn | `NOT_VERIFIED` (Chờ Phase D) |
| **TC-C04** | Eligibility | Modal gán giáo viên phụ xe | Chỉ hiển thị giáo viên thuộc biên chế của chính trường sở tại | `NOT_VERIFIED` (Chờ Phase D) |
| **TC-D01** | Mobile Sheet | Thao tác vuốt ngón tay lên từ Collapsed | Sheet di chuyển theo vị trí ngón tay `dy`, thả tay snap lên Half/Expanded | `NOT_VERIFIED` (Chờ Phase E) |
| **TC-D02** | Mobile Sheet | Thao tác vuốt ngón tay xuống từ Expanded | Sheet hạ xuống mượt mà, thả tay snap về Collapsed (110dp) | `NOT_VERIFIED` (Chờ Phase E) |
| **TC-D03** | Mobile Sheet | Tương tác vùng bản đồ phía trên khi sheet đang mở | Pan/zoom bản đồ bình thường, không bị sheet nuốt sự kiện cảm ứng | `NOT_VERIFIED` (Chờ Phase E) |
| **TC-D04** | Mobile Sheet | Cuộn danh sách điểm dừng trong tab Stops | Cuộn mượt mà nội dung bên trong, không kích hoạt kéo cả sheet | `NOT_VERIFIED` (Chờ Phase E) |
| **TC-E01** | Hồi quy RBAC | SYSTEM_ADMIN gọi endpoint duyệt ACTIVE | Bị chặn `403 Forbidden` (Quyền thuộc SCHOOL_ADMIN) | `PASS` (Đã xác minh code) |
| **TC-E02** | Hồi quy Trip | Kiểm tra việc sinh Trip từ RoutePlan DRAFT | Không sinh bất kỳ Trip nào từ DRAFT | `PASS` (Đã xác minh code) |

---

## Q. RISK REGISTER (SỔ THEO DÕI & GIẢM THIỂU RỦI RO)

| Mã Rủi ro | Mô tả Rủi ro | Mức độ | Biện pháp giảm thiểu kỹ thuật |
| :---: | :--- | :---: | :--- |
| **R-01** | VietMap VRP v1.1 không trả mã lỗi chi tiết cho từng unassigned job | Trung bình | Backend tự đối chiếu danh sách đầu vào với danh sách các bước (`steps`) trả về để tự suy luận danh sách học sinh bị loại và gán lý do chung phù hợp. |
| **R-02** | Việc recompute TSP cho tuyến đi khi loại học sinh thiếu chiều về làm tăng thời gian chờ | Thấp | Chỉ gọi TSP cho những tuyến đi thực sự bị loại học sinh; tận dụng cache tọa độ và giới hạn timeout 10 giây. |
| **R-03** | Xung đột đồng thời khi hai Admin cùng phân công một tài nguyên | Thấp | Bọc toàn bộ câu lệnh mutation trong transaction của Prisma, kiểm tra lại tính khả dụng ngay trước khi commit. |
| **R-04** | Hiệu năng cử chỉ của Mobile Bottom Sheet bị giật trên Android cũ | Trung bình | Tối ưu hóa render bằng `useNativeDriver: false` (cho layout height) hoặc dùng `transform: translateY` với `useNativeDriver: true`; tránh re-render Map WebView. |
| **R-05** | Hết hạn Preview session (TTL 30 phút) khi Admin đang phân vân | Thấp | Frontend hiển thị cảnh báo đếm ngược thời gian còn lại của phiên; hỗ trợ 1-click làm mới phiên với các tham số đang giữ nguyên. |

---

## R. PRODUCT OWNER DECISIONS REQUIRED (CÁC CÂU HỎI MỞ CẦN PO QUYẾT ĐỊNH)

> **Lưu ý tuân thủ:** Không hỏi lại các quy tắc đã phê duyệt (BR-01 đến BR-10). Chỉ xin ý kiến về các chi tiết thiết kế giao diện và ngưỡng nghiệp vụ vận hành:

1. **Ngưỡng bao phủ tối thiểu khi School Admin duyệt ACTIVE (Coverage Threshold Policy)**:
   - *Hiện tại:* Hệ thống cho phép School Admin duyệt ACTIVE phương án DRAFT kể cả khi chỉ phân tuyến được một phần học sinh (miễn là các Route thành phần hợp lệ và đủ xe/tài xế/giáo viên).
   - *Câu hỏi cho PO:* Có cần bổ sung cảnh báo xác nhận nâng cao hoặc quy định tỷ lệ bao phủ tối thiểu (ví dụ: phương án phải đạt tối thiểu 70% số học sinh đăng ký mới cho phép duyệt ACTIVE) hay giữ nguyên quyền tự quyết cho School Admin của trường?
2. **Cơ chế thông báo cho học sinh không được phân tuyến (Unassigned Notification Policy)**:
   - *Câu hỏi cho PO:* Khi một RoutePlan được chuyển sang ACTIVE, những học sinh chưa được phân tuyến có cần được hệ thống tự động đổi trạng thái sang `UNASSIGNED_PENDING` và gửi thông báo cho Phụ huynh hay giữ nguyên trạng thái `AVAILABLE` để chờ đợt lập tuyến tiếp theo?
3. **Mốc neo mặc định của Mobile Bottom Sheet khi mới mở màn hình**:
   - *Lựa chọn 1 (Khuyến nghị):* Mặc định ở mốc Thu gọn (Collapsed 110dp) để người dùng nhìn thấy bản đồ lộ trình tổng thể trước.
   - *Lựa chọn 2:* Mặc định mở ở mốc Lửng (Half-expanded 45%) để thấy ngay thông tin tài xế và điểm dừng đầu tiên.

---

## S. IMPLEMENTATION READINESS ASSESSMENT (ĐÁNH GIÁ MỨC ĐỘ SẴN SÀNG TRIỂN KHAI)

### Kết luận đánh giá: `READY_FOR_IMPLEMENTATION` (Sau khi PO duyệt Plan)

- **Mức độ hoàn thiện tài liệu**: 100% các khía cạnh nghiệp vụ, kiến trúc hệ thống, cơ sở dữ liệu, API contracts, Web wireframes, Mobile bottom sheet gestures, kế hoạch phân kỳ và ma trận kiểm thử đã được phân tích chi tiết và rõ ràng.
- **Rủi ro mã nguồn**: Không có rủi ro phá vỡ cấu trúc hiện tại (Zero breaking changes). Không cần migration Database. Hoàn toàn tương thích ngược với các module Chuyến xe (Trips), Duyệt phương án (Approvals) và Lịch trình phụ huynh (Parent Schedules).
- **Trạng thái thực tế**: Hệ thống đang ở trạng thái an toàn, sạch sẽ, sẵn sàng chuyển sang **Phase 2 (Implementation)** theo từng phân kỳ A -> F ngay khi nhận được sự phê duyệt chính thức từ Product Owner.

---
*Tài liệu được khởi tạo và lưu trữ tự động tại `docs/ai-review/route-eligibility-partial-routing-mobile-sheet-plan.md` theo quy định của AGENTS.md.*
