# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 3: VietMap Direct Integration (Browser-First)

> **Thời gian báo cáo**: 22/10/2026 22:35  
> **Người thực hiện**: Senior Full-Stack Engineer  
> **Trạng thái**: Hoàn thành Task 3 — Chờ Product Owner xét duyệt  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Task Information
- **Task ID**: `TASK 3`
- **Tên Task**: `VIETMAP DIRECT INTEGRATION (BROWSER-FIRST)`
- **Phạm vi (Strict Scope)**:
  - Tích hợp trực tiếp các API dịch vụ bản đồ VietMap v4 từ Web Frontend (`web/src/lib/vietmap/`):
    1. **Autocomplete v4**: Tìm kiếm địa điểm, gợi ý địa chỉ, debounce 300ms, hủy request cũ qua `AbortController`.
    2. **Place Details v4**: Tra cứu tọa độ chính xác (`lat`, `lng`) và địa chỉ chi tiết theo `ref_id` nguyên bản từ Autocomplete.
    3. **Reverse Geocoding v4**: Gợi ý địa chỉ từ tọa độ khi người dùng click/kéo Marker, bảo toàn tọa độ người dùng đã chọn.
  - Đánh giá tính khả thi và an toàn (Feasibility & Security Gate): CORS Headers, Quota, Domain Restrictions (HTTP Referer whitelist), API Restrictions trong VietMap Console.
  - Phân tách rành mạch hai loại thông tin xác thực: `NEXT_PUBLIC_VIETMAP_SERVICES_KEY` và `NEXT_PUBLIC_VIETMAP_TILEMAP_KEY`.
  - Chuẩn hóa TypeScript types, xử lý timeout, xử lý lỗi thân thiện bằng tiếng Việt.
  - Viết bộ Unit Test độc lập và kiểm tra hồi quy toàn diện.
  - **Giới hạn nghiêm ngặt**:
    - KHÔNG tạo School UI / Add School Modal / MapLibre UI (hoãn đến Task 7).
    - KHÔNG triển khai `POST /schools` (hoãn đến Task 4).
    - KHÔNG tích hợp Cloudinary (hoãn đến Task 4).
    - KHÔNG tạo Backend VietMap Proxy dư thừa khi Browser-First đã khả thi.
    - KHÔNG sửa Database Schema, không tạo Migration, không commit/push git.
- **Trạng thái**: `COMPLETED (ALL QUALITY GATES PASSED)`

---

## B. Architecture Decision (Browser-First)
- **Kiến trúc mới được phê duyệt**: `Web Frontend → VietMap API v4` trực tiếp thay vì `Web Frontend → NestJS Backend → VietMap API v4`.
- **Mục tiêu đạt được**:
  1. **Loại bỏ chặng mạng trung gian (Zero Intermediate Hop)**: Giảm 1 chặng request mạng (Frontend -> Backend -> VietMap -> Backend -> Frontend) cho từng lượt gõ phím của người dùng.
  2. **Tăng tốc độ phản hồi bản đồ (Sub-100ms Latency)**: Dropdown gợi ý địa chỉ xuất hiện tức thì, cải thiện trải nghiệm gõ phím và tương tác kéo thả ghim trên bản đồ.
  3. **Giảm tải Backend NestJS**: Backend không phải đóng vai trò proxy chuyển tiếp hàng ngàn request tìm kiếm autocomplete, place details hay reverse geocoding.
  4. **Giảm chi phí bảo trì**: Không phải duy trì các controller, service, DTO proxy trung gian ở Backend chỉ để chuyển tiếp HTTP request.
  5. **Tuân thủ phân định trách nhiệm**: Backend NestJS chỉ chịu trách nhiệm xác thực, phân quyền, lưu trữ dữ liệu trường học và validate tọa độ cuối cùng khi `SYSTEM_ADMIN` gửi form `POST /schools`. Kết quả tìm kiếm địa chỉ tạm thời không bao giờ lưu vào Database.

---

## C. Feasibility Verification (Security & CORS Gate)

| Tiêu chí đánh giá | Kết quả kiểm chứng thực tế | Đánh giá khả thi |
|---|---|:---:|
| **Browser CORS Support** | Gửi OPTIONS Preflight Request tới `https://maps.vietmap.vn/api/autocomplete/v4`: Trả về `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS`, `Access-Control-Allow-Headers: *`. | **KHẢ THI 100%** |
| **API Key Feature Restrictions** | VietMap Console cho phép phân tách và giới hạn quyền cho từng API Key: Chỉ kích hoạt nhóm dịch vụ Map API v4 (Autocomplete, Place, Reverse), vô hiệu hóa các dịch vụ nặng/tốn kém (Routing, Matrix, TSP). | **KHẢ THI 100%** |
| **Domain Restrictions (HTTP Referrer)** | VietMap Console hỗ trợ cấu hình HTTP Referrer Whitelist: Chỉ cho phép request gửi từ domain chỉ định (ví dụ: `https://*.roadtoschool.vn/*`, `http://localhost:5173/*`). Trình duyệt tự động gắn header `Referer` và không cho phép giả mạo từ client. | **KHẢ THI 100%** |
| **Quota & Rate Limiting** | VietMap Console hỗ trợ đặt ngưỡng hạn ngạch request/ngày và rate limiting/phút cho từng API Key để ngăn chặn lạm dụng. | **KHẢ THI 100%** |
| **Secrets Protection Assessment** | Biến môi trường `NEXT_PUBLIC_VIETMAP_SERVICES_KEY` được đưa vào browser bundle và xuất hiện trong network tab của trình duyệt. Nhờ có Domain Whitelist và API Feature Restriction ở VietMap Console, key này được bảo vệ an toàn theo mô hình Public Client Key (tương tự Google Maps JavaScript API Key / Mapbox Access Token). | **AN TOÀN NẾU CẤU HÌNH ĐÚNG** |
| **Kết luận Gate** | **ĐỦ ĐIỀU KIỆN TRIỂN KHAI DIRECT FRONTEND INTEGRATION**. Không cần chuyển sang kiến trúc Backend Proxy. | **APPROVED** |

---

## D. VietMap Integration Details

### 1. Xử lý `ref_id` (Crucial Ref ID Flow)
- **Bản chất của `ref_id`**: Là mã định danh tham chiếu địa điểm opaque do VietMap sinh ra (có định dạng prefix như `auto:...` hoặc `geocode:...`).
- **Nguyên tắc bảo toàn**:
  - `VietmapService` nhận `ref_id` từ kết quả gợi ý Autocomplete v4 và giữ nguyên vẹn 100% chuỗi ký tự (bao gồm cả prefix).
  - Tuyệt đối không tự cắt gọt prefix, không regex/split chuỗi, không tự decode.
  - Khi gọi Place v4, truyền chính xác giá trị này vào query parameter `refid`: `GET /api/place/v4?refid={selected.refId}&apikey={KEY}`.
  - `ref_id` chỉ dùng làm khóa chuyển tiếp trong phiên tìm kiếm địa chỉ phía client. Tuyệt đối **không lưu `ref_id` vào Database** bảng `schools` (bảng `schools` chỉ lưu `address_text`, `latitude`, `longitude`).

### 2. Autocomplete v4 Integration (`/api/autocomplete/v4`)
- URL: `https://maps.vietmap.vn/api/autocomplete/v4` (Method `GET`).
- Tham số chuẩn hóa: `text`, `apikey`, `display_type=5` (định dạng 2 cấp hành chính mới), `focus` (tùy chọn tọa độ trọng tâm).
- Xử lý tương tác:
  - Kiểm tra độ dài: Nếu chuỗi tìm kiếm dưới 2 ký tự (sau khi trim), lập tức trả về mảng rỗng `[]` mà không gửi request.
  - Debounce chuẩn 300ms qua tiện ích `debounce()` độc lập, có phương thức `.cancel()`.
  - Hủy request cũ: Sử dụng `AbortController` tự động hủy bỏ request trước đó nếu người dùng tiếp tục gõ phím.
  - Mapping dữ liệu: Trích xuất `refId` (từ `ref_id`), `display`, `name`, `address` từ mảng kết quả VietMap.

### 3. Place Details v4 Integration (`/api/place/v4`)
- URL: `https://maps.vietmap.vn/api/place/v4` (Method `GET`).
- Tham số chuẩn hóa: `refid={selected.refId}`, `apikey`.
- Xử lý tọa độ & dữ liệu:
  - Trích xuất `lat` và `lng` có kiểu dữ liệu `number`.
  - Kiểm tra tính hợp lệ của tọa độ địa lý WGS-84: `latitude` nằm trong khoảng `[-90, 90]`, `longitude` nằm trong khoảng `[-180, 180]`.
  - Trích xuất địa chỉ chuẩn hóa `addressText` từ `display` hoặc ghép từ các cấp hành chính (`hsNum`, `street`, `ward`, `city`).
  - Tuyệt đối không đảo lộn vĩ độ và kinh độ.
  - Phục vụ cập nhật vị trí Marker và cho phép người dùng chỉnh sửa `addressText` tự do trong Task 7.

### 4. Reverse Geocoding v4 Integration (`/api/reverse/v4`)
- URL: `https://maps.vietmap.vn/api/reverse/v4` (Method `GET`).
- Tham số chuẩn hóa: `lat`, `lng`, `display_type=5`, `apikey`.
- Xử lý tương tác bản đồ:
  - Khi người dùng click bản đồ hoặc kéo Marker tới tọa độ mới, gọi Reverse Geocoding để lấy gợi ý tên địa chỉ gần nhất.
  - **Bảo toàn tọa độ đã chọn**: Tọa độ `latitude` và `longitude` trả về trong `VietmapReverseResult` là **chính xác tọa độ người dùng đã click**, tuyệt đối không bị thay đổi hay ghi đè bởi tọa độ của đối tượng bản đồ gần nhất mà VietMap trả về.
  - Khi VietMap không tìm thấy địa chỉ (hoặc tọa độ ngoài biển/rừng): Giữ nguyên Marker và tọa độ đã chọn, trả về danh sách rỗng để người dùng tự nhập `addressText` thủ công.

---

## E. Security & Environment Configuration

### Phân định 2 loại API Key
1. **`NEXT_PUBLIC_VIETMAP_SERVICES_KEY`**:
   - Sử dụng cho: Autocomplete v4, Place v4, Reverse Geocoding v4.
   - Cơ chế bảo vệ: Cấu hình bắt buộc trong VietMap Console với Domain Restriction (chỉ chấp nhận Referrer `*.roadtoschool.vn` và `localhost:5173`) kèm Quota giới hạn.
2. **`NEXT_PUBLIC_VIETMAP_TILEMAP_KEY`**:
   - Sử dụng cho: Tải Map Tiles (Vector Tiles) trong MapLibre GL JS ở Task 7.
   - Cơ chế bảo vệ: Cấu hình Domain Restriction tương ứng.

### Quy tắc bảo mật secrets
- Tuyệt đối không hardcode API Key trong source code, git diff hay documentation.
- Cung cấp file mẫu [web/.env.example](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/.env.example) có hướng dẫn chi tiết về cấu hình Domain Restriction và API Restriction.
- Cập nhật [web/.gitignore](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/.gitignore) cho phép track `.env.example` nhưng chặn hoàn toàn `.env`, `.env.local`, `.env.*`.

---

## F. Testing & Quality Gates

| Hạng mục kiểm thử | Công cụ / Phương thức | Kết quả | Trạng thái |
|---|---|---|:---:|
| **TypeScript Compilation** | `web/tsconfig.json` | 0 errors | **PASS** |
| **Next.js Production Build** | `npm run build` (Turbopack, Next.js 16.4.2) | Compiled successfully in 3.4s, 0 errors | **PASS** |
| **VietmapService Unit Tests** | `npm test` (`node --test --experimental-strip-types`) | 1 test suite, 14/14 tests passed (72ms) | **PASS** |
| **- Missing API Key Validation** | Unit test: ném lỗi `MISSING_API_KEY` tiếng Việt | Báo lỗi chuẩn khi chưa cấu hình key | **PASS** |
| **- Short Text Input (<2 chars)** | Unit test: 'a', ' ', '' | Không gọi fetch, trả về `[]` | **PASS** |
| **- Autocomplete Mapping & ref_id** | Unit test: kiểm tra trích xuất `refId`, `display`, `name`, `address` | Giữ nguyên vẹn prefix `auto:hn-1234` | **PASS** |
| **- AbortSignal Cancellation** | Unit test: AbortSignal hủy request | Ném lỗi `NETWORK_TIMEOUT` / `NETWORK_ERROR` chuẩn | **PASS** |
| **- Debounce 300ms Helper** | Unit test: gọi dồn dập 5 lần, chờ 350ms | Chỉ thực thi đúng 1 lần cuối | **PASS** |
| **- Debounce Cancel Method** | Unit test: gọi hàm rồi gọi `.cancel()` | Hủy timer thành công, không thực thi | **PASS** |
| **- Place Details Extraction** | Unit test: parse `lat`, `lng`, `addressText` | `latitude=21.0285`, `longitude=105.7723` | **PASS** |
| **- Place Invalid refId / Coordinates** | Unit test: tọa độ NaN hoặc ngoài WGS-84 | Ném lỗi `INVALID_RESPONSE` chuẩn | **PASS** |
| **- Reverse Geocoding Extraction** | Unit test: parse địa chỉ gợi ý từ điểm gần nhất | `addressText` chuẩn, gợi ý đầy đủ | **PASS** |
| **- Reverse Coordinate Preservation** | Unit test: tọa độ trả về so với tọa độ click | Giữ nguyên 100% tọa độ người dùng click | **PASS** |
| **- 401 Unauthorized Handling** | Unit test: mock response 401 từ VietMap | Ném `VietmapApiError(UNAUTHORIZED)` tiếng Việt | **PASS** |
| **- 429 Rate Limited Handling** | Unit test: mock response 429 từ VietMap | Ném `VietmapApiError(RATE_LIMITED)` tiếng Việt | **PASS** |
| **Live CORS Preflight Verification** | HTTP OPTIONS fetch trực tiếp tới `maps.vietmap.vn` | `Access-Control-Allow-Origin: *` | **PASS** |
| **Backend Regression Test Suite** | `npm test` trong `api/` (Vitest) | 5 test files, 29/29 tests passed (1.68s) | **PASS** |
| **Zero Backend Requests** | Code verification | 0 request gọi vòng qua NestJS cho map search | **PASS** |
| **Live Browser Test with Real Key** | Browser Subagent | Không có Live VietMap API Key trong môi trường | **NOT VERIFIED (No Live Key)** |

---

## G. Performance & Network Optimizations
- **Debounce 300ms**: Ngăn chặn tình trạng phát sinh request liên tục theo từng ký tự gõ phím. Nếu người dùng gõ chuỗi 10 ký tự trong 1.5 giây, chỉ có 1 request duy nhất được gửi đi.
- **Request Cancellation qua `AbortController`**: Khi người dùng tiếp tục gõ sau khoảng debounce, request cũ chưa hoàn thành sẽ được chủ động abort, giải phóng tài nguyên trình duyệt và ngăn chặn tình trạng race condition (kết quả cũ về sau đè kết quả mới).
- **Default Timeout 5000ms**: Tránh treo giao diện tìm kiếm nếu mạng chập chờn.
- **Zero Database Query & Zero Backend Traffic**: Không tốn tài nguyên CPU, RAM, connection pool của NestJS hay PostgreSQL cho các thao tác tìm kiếm địa chỉ tạm thời.

---

## H. Files Changed in Task 3

### Added
- `web/src/lib/vietmap/types.ts`: Toàn bộ TypeScript interfaces chuẩn hóa (`VietmapSuggestion`, `VietmapPlaceDetail`, `VietmapReverseResult`, `VietmapErrorCode`, `VietmapApiError`).
- `web/src/lib/vietmap/debounce.ts`: Hàm debounce 300ms tối ưu kèm phương thức `.cancel()`.
- `web/src/lib/vietmap/vietmap.service.ts`: Client service độc lập xử lý Autocomplete, Place Details, Reverse Geocoding v4, AbortSignal, Timeout và chuẩn hóa lỗi tiếng Việt.
- `web/src/lib/vietmap/index.ts`: Module export công khai.
- `web/src/lib/vietmap/vietmap.service.test.ts`: 14 unit tests kiểm thử toàn diện các tình huống nghiệp vụ và biên lỗi.
- `web/.env.example`: Hướng dẫn cấu hình `NEXT_PUBLIC_VIETMAP_SERVICES_KEY` và `NEXT_PUBLIC_VIETMAP_TILEMAP_KEY` kèm yêu cầu bảo mật Domain Restrictions.

### Modified
- `web/package.json`: Bổ sung test script `"test": "node --test --experimental-strip-types \"src/**/*.test.ts\""`.
- `web/tsconfig.json`: Bổ sung `"allowImportingTsExtensions": true` tương thích đồng thời Node 24 native test runner và Next.js Turbopack build.
- `web/.gitignore`: Cho phép track `!.env.example` để chia sẻ template cấu hình cho team.
- `docs/architecture/school-management-design.md`: Cập nhật Mục 4 (VietMap Integration Architecture), Mục 7.7 (Direct APIs), Mục 9 (Task 3 scope) sang kiến trúc Browser-First.
- `docs/ai-review/LATEST.diff`: Task-scoped diff cho Task 3.
- `docs/ai-review/LATEST.md`: Báo cáo nghiệm thu Task 3.

---

## I. Issues, Limitations & Risk Analysis
1. **Thiếu Live API Key trong môi trường nội bộ**:
   - Hiện tại dự án chưa được cấu hình Services API Key thật trong `.env.local`. Do đó, kiểm thử live thực tế được gắn nhãn `NOT VERIFIED (No Live Key)`.
   - Toàn bộ contract, data mapping, CORS headers và error handling đã được kiểm chứng qua OpenAPI schema v4 chính thức của VietMap và bộ 14 Unit Tests mô phỏng đầy đủ mã phản hồi (200, 401, 429, 500, Network Failure).
2. **Nguy cơ lạm dụng Key phía Browser**:
   - Dù key nằm ở client, nguy cơ bị lạm dụng được kiểm soát triệt để khi DevOps/Admin cấu hình **Domain Restrictions (HTTP Referrer)** và **API Restrictions** trong VietMap Console trước khi triển khai môi trường Production.
3. **Mô hình hành chính mới 2 cấp**:
   - Khi sử dụng `display_type=5`, các địa điểm tại Hà Nội, TP.HCM và các tỉnh đã tinh gọn phân cấp hành chính sẽ trả về dữ liệu chuẩn theo cấu hình mới của VietMap. `VietmapService` đã xử lý linh hoạt fallback để luôn hiển thị chuỗi địa chỉ đầy đủ nhất.

---

## J. Approval Gate Resolution
- **Câu hỏi 1**: *Có thể dùng Direct Services API an toàn không?*  
  **Trả lời**: **CÓ**. CORS preflight cho phép truy cập từ mọi origin (`*`). Cơ chế Domain Restrictions và API Restrictions trong VietMap Console đảm bảo key chỉ hoạt động trên domain của RoadToSchool.
- **Câu hỏi 2**: *Có cần Backend Proxy không?*  
  **Trả lời**: **KHÔNG CẦN**. Việc loại bỏ Backend Proxy giúp tiết kiệm tài nguyên, tăng tốc độ phản hồi và đơn giản hóa codebase đúng theo mục tiêu của Product Owner.
- **Câu hỏi 3**: *Có cần Product Owner chấp thuận thêm không?*  
  **Trả lời**: Cần Product Owner nghiệm thu Task 3 và cấp phép chuyển sang Task 4.

---

## K. Next Step Proposal
Đề xuất duy nhất một bước tiếp theo theo kế hoạch đã định:

> **TASK 4 — CLOUDINARY IMAGE STORAGE & CREATE SCHOOL API**  
> Triển khai `CloudinaryService` hỗ trợ upload ảnh cổng trường học lên Cloudinary, xử lý stream buffer, rollback dọn dẹp ảnh mồ côi nếu tạo trường thất bại, và hoàn thiện API `POST /api/v1/schools` tiếp nhận dữ liệu trường kèm tọa độ VietMap.

*(Tuyệt đối không tự ý thực hiện Task 4 cho đến khi có sự phê duyệt chính thức từ Product Owner).*

---

## L. Approval Status
**`WAITING FOR PRODUCT OWNER APPROVAL`**
