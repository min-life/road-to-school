# RoadToSchool — Working Rules & Engineering Standards

Tài liệu này chứa các nguyên tắc làm việc, quy trình phê duyệt và tiêu chuẩn kỹ thuật bắt buộc áp dụng cho toàn bộ quá trình phát triển dự án RoadToSchool.

---

## 1. Task Execution Modes & Approval Gates (Quy Trình Thực Hiện & Phê Duyệt)

Tuyệt đối không tự ý implement, sửa đổi code, migrate database hoặc chỉnh sửa UI khi chưa có yêu cầu và phê duyệt rõ ràng từ người dùng. Mọi hoạt động phải tuân theo 3 chế độ:

### 1.1. DISCUSSION MODE (Chế độ Thảo luận)
Kích hoạt khi người dùng mô tả nghiệp vụ, trao đổi ý tưởng hoặc đặt câu hỏi:
- **Chỉ** phân tích nghiệp vụ, làm rõ yêu cầu, so sánh phương án và giải thích kỹ thuật.
- **TUYỆT ĐỐI KHÔNG**: Sửa application code, sửa Database/Prisma schema, chạy migration, hoặc tự ý sinh UI.

### 1.2. PLANNING MODE (Chế độ Lập Kế hoạch)
Kích hoạt khi người dùng yêu cầu lập kế hoạch cho một tính năng/task cụ thể:
- Phân tích yêu cầu và kiểm tra ngữ cảnh liên quan trong `docs/BUSINESS_CONTEXT.md`.
- Đề xuất kiến trúc, API contract, Database schema changes (nếu có).
- Thiết kế wireframe và đánh giá mật độ chữ/thông tin (nếu liên quan UI).
- Liệt kê danh sách các file dự kiến tạo mới hoặc chỉnh sửa.
- **Dừng và chờ người dùng phê duyệt kế hoạch.** Không tự động chuyển sang Implementation Mode.

### 1.3. IMPLEMENTATION MODE (Chế độ Triển khai)
Chỉ bắt đầu khi người dùng đưa ra chỉ thị thực thi rõ ràng sau khi kế hoạch đã được duyệt:
- Thực hiện chính xác trong phạm vi (scope) được duyệt.
- Được chạy commands, build, test, migration cần thiết cho task đó.
- Không tự ý mở rộng sang các tính năng khác ngoài phạm vi.

### 1.4. Stop-After-Task Rule (Dừng Sau Mỗi Task)
Sau khi hoàn thành một task được phê duyệt, Agent **BẮT BUỘC** thực hiện các bước sau:
1. Tóm tắt các công việc đã thực hiện.
2. Liệt kê các files đã thay đổi.
3. Báo cáo kết quả kiểm thử (unit tests, build, lint).
4. Báo cáo Swagger status (nếu có thay đổi API).
5. Báo cáo Database migration status (nếu có thay đổi DB).
6. Báo cáo Wireframe/UI review status (nếu có thay đổi UI).
7. Nêu rõ các vấn đề hoặc giới hạn còn tồn tại (nếu có).
8. Cập nhật báo cáo AI Review vào `docs/ai-review/LATEST.md` (kèm `LATEST.diff` nếu có code changes).
9. Chỉ đề xuất duy nhất **MỘT** bước tiếp theo phù hợp.
10. **DỪNG LẠI VÀ CHỜ PHẢN HỒI CỦA NGƯỜI DÙNG.** (Sự im lặng không được coi là sự đồng ý).

---

## 2. Backend & API Working Rules

### 2.1. API Logic Approval First
**Không triển khai bất kỳ API nghiệp vụ nào khi logic chưa được phê duyệt.**  
Quy trình 12 bước trước khi viết code API:
1. Tiếp nhận và hiểu yêu cầu nghiệp vụ.
2. Đối chiếu với Business Context.
3. Xác định actor thụ hưởng và quyền truy cập.
4. Xác định mục tiêu nghiệp vụ cụ thể của endpoint.
5. Xác định đầu vào (Path params, Query params, Request Body).
6. Xác định đầu ra (Response Data Transfer Object - DTO).
7. Xác định quy tắc validation và ràng buộc nghiệp vụ.
8. Xác định danh sách các trường hợp lỗi (Error cases & HTTP status codes).
9. Xác định dữ liệu cần đọc / ghi trong cơ sở dữ liệu.
10. Đề xuất API contract cụ thể.
11. Trình bày luồng xử lý (Processing Flow).
12. **Chờ người dùng phê duyệt contract & logic trước khi viết code.**

### 2.2. Database Change Approval
Bất kỳ thay đổi nào liên quan đến Database (thêm/xóa/sửa model, field, relation, constraint, index, migration) đều phải trình bày rõ:
1. Nội dung thay đổi đề xuất.
2. Mục đích nghiệp vụ của thay đổi.
3. Các màn hình/API sử dụng trường dữ liệu này.
4. Mối quan hệ với các bảng hiện có.
5. Tác động tới các API hiện hành.
6. Rủi ro về dữ liệu hoặc migration (nếu có).
> *Không tạo bảng hoặc trường dữ liệu chỉ để "dự phòng". Không sửa database trước khi được chấp thuận.*

### 2.3. Backend Simplicity & Clean Architecture
- Tuân thủ kiến trúc chuẩn NestJS: `Module` -> `Controller` -> `Service` -> `DTO` -> `Prisma`.
- **Controller**: Tiếp nhận HTTP request, validate dữ liệu đầu vào qua ValidationPipe, chuyển giao cho Service, trả response chuẩn.
- **Service**: Xử lý toàn bộ business logic và gọi Prisma Client trực tiếp.
- **Không áp dụng**: Generic Repository Pattern, CQRS, Event Sourcing, Microservices, Redis/Message Queues khi chưa có yêu cầu thực tế.

### 2.4. Mandatory Swagger Documentation Synchronization
**BẮT BUỘC cập nhật Swagger mỗi khi API thay đổi contract hoặc hành vi.**
- Mọi API endpoint phải có đầy đủ:
  - `@ApiTags()` phân loại module.
  - `@ApiOperation()` tóm tắt mục tiêu nghiệp vụ.
  - `@ApiParam()`, `@ApiQuery()`, `@ApiBody()` mô tả tham số.
  - `@ApiResponse()` mô tả mã thành công và các mã lỗi (400, 401, 403, 404, 409, 500).
- Sau khi sửa API, phải chạy và kiểm chứng tại `http://localhost:3000/api/docs`.
- **Task Backend chỉ được đánh dấu hoàn thành khi Swagger đã đồng bộ 100% với code thực tế.**

---

## 3. Web & Mobile UI Working Rules

### 3.1. Wireframe First
Mọi màn hình UI mới hoặc refactor giao diện đáng kể đều phải được thiết kế và duyệt wireframe trước khi code:
1. Phân tích ngữ cảnh người dùng và vai trò (Actor).
2. Xác định luồng thao tác chính (User Flow).
3. Thiết kế cấu trúc wireframe (Bố cục, phân cấp thông tin).
4. Đánh giá mật độ thông tin và độ ngắn gọn của câu chữ.
5. Trình bày wireframe để người dùng xem xét và phê duyệt.
6. Chỉ bắt đầu code UI sau khi wireframe được duyệt.

### 3.2. MINIMAL UI COPY & INFORMATION DENSITY (Quy Tắc Tối Giản Câu Chữ)
> **TRIẾT LÝ THIẾT KẾ:**  
> *"Show what users need to know and do, not paragraphs explaining what the interface does."*  
> *(Hiển thị những gì người dùng cần biết và thao tác, không viết các đoạn văn giải thích giao diện đang làm gì).*

#### A. Tối giản văn bản, tối đa trực quan
- **Nên dùng**: Tiêu đề ngắn, nhãn (label) súc tích, dữ liệu hiển thị rõ ràng, trạng thái trực quan (badge, icon, color), nút bấm hành động cụ thể.
- **Tránh xa**:
  - Các đoạn văn mô tả dài bên dưới tiêu đề trang.
  - Các câu chào thừa thãi ("Chào mừng bạn đến với trang quản lý...", "Tại đây bạn có thể...").
  - Hướng dẫn sử dụng hiển thị thường trực trên màn hình nghiệp vụ.
  - Các khối giải thích lặp lại ý nghĩa của nút bấm.
  - Câu chữ mang tính trang trí hoặc thuật ngữ kỹ thuật khó hiểu với người dùng.

#### B. Phân cấp thông tin rõ ràng (Visual Hierarchy)
- Ưu tiên hiển thị: Thông tin cốt lõi -> Hành động chính -> Dữ liệu bổ trợ.
- Sử dụng Cards, Tables, Badges, Status Indicators thay cho văn bản giải thích.
- Áp dụng kỹ thuật Progressive Disclosure: Thông tin phụ hoặc lịch sử chi tiết đưa vào Expandable Section, Detail View hoặc Modal khi cần.

#### C. Quy tắc riêng cho Mobile
- Diện tích màn hình điện thoại rất nhỏ: tập trung tuyệt đối vào thao tác nhanh.
- **Tài xế (Driver)**: Chỉ hiển thị tên chuyến, giờ chạy, điểm đón tiếp theo, nút [Bắt đầu], nút [Bản đồ]. Không để đoạn văn giải thích nhiệm vụ lái xe.
- **Giám sát (Bus Attendant)**: Chỉ hiển thị danh sách học sinh, trạng thái [Đã đón / Chưa đón], nút chuyển trạng thái một chạm.
- **Phụ huynh (Parent)**: Chỉ hiển thị tên con, trạng thái xe, vị trí hiện tại và thời gian dự kiến (ETA).

#### D. Quy tắc riêng cho Web Admin
- Ưu tiên Bảng dữ liệu (Data Tables) có bộ lọc (Filter) và tìm kiếm (Search) tinh gọn.
- Form nhập liệu ngắn gọn, nhóm theo ngữ cảnh. Nếu label đã rõ nghĩa (ví dụ: "Số điện thoại phụ huynh"), không cần thêm đoạn chú thích rườm rà phía dưới.

#### E. Bộ câu hỏi tự đánh giá trước khi thêm text vào UI:
1. Người dùng có bắt buộc phải đọc dòng chữ này mới hoàn thành được công việc không?
2. Dòng này có đang lặp lại những gì mà bố cục và icon đã thể hiện không?
3. Có thể thay bằng một từ hoặc badge ngắn gọn hơn không?
4. Có thể biểu diễn bằng biểu tượng trạng thái trực quan không?
5. Nếu bỏ câu này đi thì giao diện có bị hiểu sai không?  
*Nếu câu trả lời là "Không", hãy lập tức loại bỏ dòng chữ đó khỏi thiết kế.*

### 3.3. Brand Palette & Styling Consistency
Toàn bộ Web và Mobile sử dụng thống nhất bộ token màu thương hiệu:

| Token | Hex | Công dụng |
|---|---|---|
| **Primary / Brand** | `#FFCB56` | Nút bấm chính, tab đang chọn, điểm nhấn |
| **Background** | `#FFFDF6` | Màu nền chính toàn ứng dụng |
| **Foreground / Text** | `#1E293B` | Chữ chính, tiêu đề, nội dung quan trọng |
| **Surface / Card** | `#FFFFFF` | Nền thẻ (card), thanh điều hướng, bảng biểu |

- Sử dụng biến CSS/Token trong code (`--color-primary`, `colors.primary`). Tuyệt đối không hardcode mã HEX lặp lại.
- Giữ nguyên trang mặc định của Next.js trong Phase 0; chỉ áp dụng theme cho các màn hình nghiệp vụ sau khi được duyệt.

### 3.4. Placeholder Assets
- Khi chưa có asset đồ họa chính thức (Logo, avatar, ảnh xe buýt), bắt buộc sử dụng placeholder trung tính, dễ nhận biết và dễ thay thế. Không tự ý tải hoặc tạo logo giả làm sai lệch nhận diện thương hiệu.

---

## 4. General Code & Maintainability Rules

### 4.1. Đơn giản, Dễ bảo trì (Student Project First)
- Viết code tường minh, đặt tên biến/hàm phản ánh đúng nghiệp vụ bằng tiếng Anh chuẩn.
- Định hướng số dòng tham khảo:
  - Function: dưới 40–60 dòng.
  - Component: dưới 150–200 dòng.
  - File: dưới 250–300 dòng.
- Không chia nhỏ file máy móc nếu chia nhỏ làm phân mảnh logic; cũng không nhồi nhét nhiều trách nhiệm không liên quan vào một file.

### 4.2. Kiểm soát phạm vi (Strict Scope Control)
- Task nào chỉ làm đúng trong phạm vi đó:
  - Task Backend không tự ý refactor Web/Mobile.
  - Task Web không tự ý sửa Prisma Schema.
  - Task UI không tự tiện thay đổi quy tắc tính toán nghiệp vụ.
- Nếu phát hiện vấn đề bất cập ngoài phạm vi task, ghi nhận vào phần "Known Issues / Ghi chú" để người dùng xem xét, không tự ý can thiệp.

---

## 5. Mandatory AI Review Report Rule (Quy Tắc Báo Cáo AI Review Bắt Buộc)

> **Mục tiêu**: Sau mỗi lần phản hồi phân tích, đề xuất thiết kế, hoặc thực thi code có nội dung thực chất, Agent **BẮT BUỘC** lưu kết quả vào file để người dùng gửi cho một **AI Reviewer độc lập** kiểm tra. Tuyệt đối không chỉ trả lời trong chat mà không lưu kết quả.

### 5.1. Thư mục và File lưu trữ
Toàn bộ báo cáo được lưu trữ tập trung tại:
```text
docs/ai-review/
├── LATEST.md       # Báo cáo đầy đủ của lần làm việc gần nhất (Bắt buộc cập nhật sau mỗi task/phản hồi thực chất)
├── LATEST.diff     # Git diff của task hiện tại (chỉ khi có thay đổi code; xóa hoặc đánh dấu None nếu không có code)
└── history/        # Lưu bản sao theo mốc: YYYY-MM-DD-HHMM-task-name.md
```

### 5.2. Cấu trúc 13 Mục Bắt Buộc của `LATEST.md`
Mỗi file `LATEST.md` bắt buộc phải có đủ 13 mục sau:

1. **Task Information**: Task Name, Date, Project Scope (API / Web / Mobile / Documentation), Task Type (Analysis / Design / Implementation / Fix / Review), Status (`COMPLETED` / `PARTIAL` / `BLOCKED` / `WAITING_APPROVAL`).
2. **Original Request**: Tóm tắt chính xác yêu cầu ban đầu của người dùng (không tự ý bịa thêm nghiệp vụ).
3. **Approved Scope**: Ghi rõ những yêu cầu đã duyệt, yêu cầu mới đang chờ duyệt, các giới hạn phạm vi. Nếu chưa có phê duyệt thì ghi `NOT APPROVED`.
4. **Analysis & Decisions**: Cách hiểu yêu cầu, phân tích logic, các phương án xem xét, giải pháp đề xuất/chọn, lý do, và các giả định chưa được xác nhận.
5. **Implementation Details**: Liệt kê chi tiết files tạo mới, chỉnh sửa, xóa bỏ; mô tả thay đổi chính và logic quan trọng. Nếu không có code changes, ghi `No application code changes.`
6. **Database Changes**: Bảng, trường, quan hệ, constraints, migration status. Nếu không có thay đổi, ghi `None`.
7. **API & Swagger Changes**: HTTP Method, Path, Request/Response DTOs, Swagger update & OpenAPI verification status. Nếu không có, ghi `None`.
8. **UI/UX Changes**: Screens, Wireframe approval status, components, user flow, responsive, minimal copy compliance. Nếu không có, ghi `None`.
9. **Verification & Testing**: Commands đã chạy thực tế, kết quả kiểm thử. Sử dụng minh bạch các nhãn `PASS`, `FAIL`, `NOT_VERIFIED`, `BLOCKED_BY_TEST_DATA_POLICY`. Tuyệt đối không giả lập test results.
10. **Issues & Risks**: Bugs chưa giải quyết, rủi ro kỹ thuật, logic chưa rõ, các quyết định cần người dùng phê duyệt. Nếu không có, ghi `None identified`.
11. **Reviewer Focus**: Chủ động nêu ra các trọng điểm AI Reviewer cần rà soát kỹ (tính đúng đắn nghiệp vụ, bảo mật JWT/session, thiết kế DB, hiệu năng, edge cases...).
12. **Suggested Next Step**: Chỉ đề xuất duy nhất **MỘT** bước tiếp theo phù hợp. Không tự ý thực hiện.
13. **Approval Status**: Ghi rõ `WAITING FOR USER REVIEW / APPROVAL` nếu đang chờ review. Tuyệt đối không tự đánh dấu `APPROVED`.

### 5.3. Quy định về Git Diff (`LATEST.diff`)
- Chỉ bao gồm các thay đổi liên quan đến task hiện tại.
- Tuyệt đối không đưa secrets, passwords, tokens, nội dung file `.env` vào diff.
- Không thêm `node_modules`, generated files, build outputs.
- Nếu task không có thay đổi code: ghi rõ `No code changes for this task.` trong `LATEST.diff`.

### 5.4. Quy định phản hồi trong Chat (Final Chat Response)
Sau khi lưu file báo cáo, phản hồi trong chat phải ngắn gọn, súc tích (không copy lại toàn bộ báo cáo dài):
- Task status.
- Những gì đã thực hiện.
- Những vấn đề quan trọng cần chú ý.
- Đường dẫn báo cáo: `docs/ai-review/LATEST.md`.
- Đường dẫn diff: `docs/ai-review/LATEST.diff` (hoặc `None`).
- Một bước tiếp theo được đề xuất.

---

## 6. TEST DATA POLICY — NO SELF-GENERATED TEST DATA (Chính Sách Tuyệt Đối Không Tự Sinh Dữ Liệu Kiểm Thử)

> **NGUYÊN TẮC CỐT LÕI:**  
> **TỪ THỜI ĐIỂM NÀY, AI CODING AGENT TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP TỰ TẠO DỮ LIỆU ĐỂ TEST.**  
> Quy tắc này có hiệu lực vĩnh viễn, áp dụng cho: Backend, Web, Mobile, Database, API testing, Browser testing, Integration/E2E testing, Cron Job testing và tất cả các tác vụ hiện tại cũng như tương lai.

### 6.1. Các hành vi bị nghiêm cấm tuyệt đối (Strictly Prohibited Actions)
Nếu chưa có sự đồng ý rõ ràng bằng văn bản của Product Owner cho đúng tác vụ và môi trường cụ thể, AI Coding Agent tuyệt đối không:
1. **Tự thêm dữ liệu vào Database để test**: Không thực hiện bất kỳ lệnh `INSERT` hay tương đương nào nhằm mục đích thử nghiệm.
2. **Tự tạo các bản ghi nghiệp vụ (Business Records)**: Tuyệt đối không tự tạo `User`, `School`, `Student`, `Parent`, `Driver`, `Bus Attendant`, `Vehicle`, `RoutePlan`, `Route`, `Trip` hoặc bất kỳ thực thể nghiệp vụ nào khác.
3. **Tự chạy seed scripts**: Không chạy bất kỳ script seed dữ liệu nào (kể cả script có sẵn trong dự án).
4. **Tự tạo mock data hoặc fake API responses**: Không giả lập dữ liệu trả về để làm cho kết quả kiểm thử trông như thành công.
5. **Tự tạo test fixtures chứa dữ liệu nghiệp vụ giả**: Không viết fixtures giả lập nhằm mục đích ép test suites `PASS`.
6. **Tự gọi API làm biến đổi dữ liệu (POST/PATCH/PUT/DELETE)**: Không gọi các API có side effects trên dữ liệu thật chỉ để kiểm thử hành vi hệ thống.
7. **Tự sử dụng browser automation để tạo dữ liệu test**: Không dùng công cụ browser (subagent, puppeteer, selenium...) để click nhập form tạo các bản ghi kiểm thử.
8. **Tự tạo dữ liệu tạm rồi rollback/xóa**: Không lách luật bằng cách tạo dữ liệu tạm thời rồi xóa hoặc rollback transaction sau khi test.
9. **Tự thay đổi dữ liệu hiện có**: Không sửa đổi trường dữ liệu của các bản ghi đang có trong database để tạo điều kiện thuận lợi cho test.
10. **Tự reset, truncate hoặc xóa database**: Không dọn dẹp hoặc khởi tạo lại môi trường database nhằm chuẩn bị chạy test.
11. **Tự dùng SQL/Prisma scripts**: Không viết hay chạy scripts trực tiếp can thiệp vào records phục vụ kiểm thử.
12. **Tự sinh hàng loạt bản ghi**: Không tự sinh hàng loạt Trip, RoutePlan hoặc bản ghi để thử nghiệm tải hay kiểm tra hiệu năng.
13. **Tự chạy test suites có hành vi ghi/sửa dữ liệu**: Trước khi chạy bất kỳ test suite nào, phải xác minh test đó không ghi hay làm biến đổi database; nếu có ghi dữ liệu thì không được tự ý chạy.
14. **Tự dùng dữ liệu giả tạo cảm giác thành công**: Tuyệt đối không tạo dữ liệu giả nhằm che mắt hoặc tạo cảm giác một chức năng đã hoạt động thành công.

> [!CAUTION]
> **Kể cả trên Development hoặc Test Database, agent cũng không được tự ý tạo dữ liệu.**  
> Việc tồn tại môi trường dev/test riêng biệt tuyệt đối không được hiểu là quyền tự động sinh dữ liệu.

---

### 6.2. Các phương pháp kiểm chứng được phép (Allowed Verification Methods)
Agent bắt buộc ưu tiên các phương pháp xác minh tĩnh và phi tác dụng phụ (Zero Side Effects):
- **TypeScript Typecheck**: Chạy `npx tsc --noEmit` để đảm bảo an toàn kiểu dữ liệu 100%.
- **Static Analysis & Linting**: Chạy ESLint, Oxlint để quét lỗi cú pháp và code smells.
- **Build Verification**: Chạy build của dự án (`npm run build`, Next.js build, Nest build).
- **Prisma Schema Validation**: Chạy `npx prisma validate` để kiểm tra tính toàn vẹn cú pháp schema.
- **Kiểm tra Migration ở mức cấu trúc**: Đánh giá nội dung file `migration.sql` (chỉ DDL) mà không cần chèn data.
- **Code Review & Architectural Audit**: Rà soát logic nghiệp vụ, đối chiếu `docs/BUSINESS_CONTEXT.md` và mã nguồn.
- **Kiểm tra API Contracts**: Rà soát DTOs, Validation Pipes, Swagger Annotations và xử lý ngoại lệ HTTP.
- **Kiểm tra Authorization Guards & Roles**: Rà soát logic phân quyền RBAC trên Controller/Service.
- **Truy vấn Database dạng Read-Only**: Chỉ thực hiện các lệnh đọc thuần túy (SELECT / findMany / count) để tra cứu dữ liệu thực tế hiện hữu mà không ghi đè.
- **Gọi API GET không có side effects**: Chỉ kiểm thử các endpoint GET an toàn và idempotent.
- **Browser Verification trên dữ liệu thực tế sẵn có**: Chỉ quan sát và kiểm tra giao diện dựa trên dữ liệu đang tồn tại hợp lệ trong hệ thống.
- **Unit Tests độc lập với Database**: Chỉ chạy các unit tests sử dụng pure function hoặc in-memory mocks đã được xác minh không ghi vào Database và không gây tác dụng phụ.
- **Phân tích mã nguồn thay thế**: Khi không có sẵn dữ liệu thực tế phù hợp, kiểm tra tính đúng đắn của logic bằng suy luận và phân tích mã nguồn.

*Quy tắc thận trọng*: Không mặc định bất kỳ lệnh nào (`npm test`, `prisma migrate`, custom scripts) là read-only. Phải kiểm tra kỹ mã nguồn của test/script trước khi chạy. Nếu test hiện có hành vi chèn/sửa database hoặc dùng fake fixtures, không được tự ý chạy và phải báo cáo bị hạn chế bởi chính sách này.

---

### 6.3. Quy trình khi thiếu dữ liệu kiểm thử (When Test Data Is Required)
Nếu một chức năng không thể được kiểm chứng đầy đủ do thiếu dữ liệu:
1. **Dừng lại ngay lập tức**: Không tự tạo dữ liệu, không tự chạy seed, không chỉnh sửa Database.
2. **Không lách luật**: Không tạo dữ liệu tạm thời dưới bất kỳ hình thức nào.
3. **Liệt kê yêu cầu dữ liệu**: Ghi rõ chi tiết cấu trúc dữ liệu tối thiểu cần thiết để kiểm chứng (Ví dụ: cần 1 trường học ở trạng thái ACTIVE có hợp đồng, cần 2 học sinh có tọa độ GPS hợp lệ...).
4. **Đánh dấu trạng thái kiểm thử**: Ghi rõ trạng thái test là `NOT_VERIFIED` và phân loại nguyên nhân là `BLOCKED_BY_TEST_DATA_POLICY`.
5. **Báo cáo trung thực**: Nêu rõ nguyên nhân trong mục *Verification & Testing* của báo cáo AI Review.
6. **Chờ phê duyệt từ Product Owner**: Chỉ tiến hành tạo dữ liệu khi Product Owner đưa ra sự cho phép rõ ràng bằng văn bản, trong đó xác định rõ phạm vi dữ liệu được phép tạo và môi trường cụ thể.

> [!IMPORTANT]
> Sự im lặng hoặc các yêu cầu chung chung như *"hãy kiểm thử toàn bộ"*, *"hãy verify lại hệ thống"* **TUYỆT ĐỐI KHÔNG** được coi là sự cho phép tạo dữ liệu. Không suy diễn quyền hạn từ các prompt hoặc phiên làm việc trước đó.

---

### 6.4. Phân biệt với Database Migration (Important Distinction)
Việc tạo hoặc sửa cấu trúc Database bằng migration đã được Product Owner phê duyệt là công việc triển khai kỹ thuật hợp lệ, không bị cấm bởi chính sách này.
Tuy nhiên, phải tuân thủ nghiêm ngặt:
- Migration chỉ được chứa các câu lệnh định nghĩa cấu trúc (DDL: `CREATE TABLE`, `ALTER TABLE`, `ADD COLUMN`, `CREATE INDEX`).
- Migration **tuyệt đối không được chứa dữ liệu test, dữ liệu giả hay tự động seed dữ liệu**.
- Không được sử dụng migration như một công cụ ngầm để chèn dữ liệu lách luật Test Data Policy.
- Nếu một migration bắt buộc phải chuyển đổi hoặc cập nhật dữ liệu hiện có (Data Migration / Backfill DML), phải trình bày kế hoạch chi tiết và xin phê duyệt riêng từ Product Owner trước khi thực hiện.

---

### 6.5. Tiêu chuẩn báo cáo kiểm thử trong AI Review (Test Reporting Requirements)
Mọi báo cáo AI Review (tại `docs/ai-review/LATEST.md` và các tài liệu liên quan) bắt buộc phải sử dụng chính xác và minh bạch 4 nhãn trạng thái sau:

| Nhãn Trạng Thái | Ý Nghĩa Nghiệp Vụ & Kỹ Thuật |
| :--- | :--- |
| **`PASS`** | Đã chạy thực tế và xác minh thành công hoàn toàn mà không vi phạm chính sách dữ liệu. |
| **`FAIL`** | Đã chạy thực tế nhưng phát sinh lỗi, kiểm thử thất bại hoặc sai lệch logic. |
| **`NOT_VERIFIED`** | Chưa hoặc không thể kiểm chứng do thiếu điều kiện kỹ thuật, chưa được chạy thực tế. |
| **`BLOCKED_BY_TEST_DATA_POLICY`** | Không thể kiểm chứng vì bị chặn bởi chính sách: thiếu dữ liệu thực tế và chưa có sự cho phép tạo dữ liệu từ Product Owner. |

**Quy định cấm gian lận báo cáo:**
- Tuyệt đối không báo `PASS` nếu chỉ kiểm tra bằng suy luận lý thuyết mà chưa chạy thực tế.
- Tuyệt đối không báo `PASS` nếu test bị bỏ qua hoặc không thể chạy do thiếu dữ liệu.
- Tuyệt đối không tự ý tạo dữ liệu nhằm mục đích nâng cao số lượng test `PASS`.

---

### 6.6. Quy tắc ưu tiên tối thượng (Priority Rule)
- Chính sách này có hiệu lực tối cao, tức thì và lâu dài đối với mọi prompt, mọi kế hoạch và mọi phiên làm việc tiếp theo của dự án RoadToSchool v2.0.
- Nếu bất kỳ prompt nào (kể cả prompt cũ được tái sử dụng) có chứa yêu cầu: tạo test records, seed demo data, tạo RoutePlan/Trip mẫu, tạo tài khoản thử nghiệm, hoặc thực hiện E2E test có ghi vào Database, AI Coding Agent **BẮT BUỘC tuân thủ chính sách này và TỪ CHỐI tự tạo dữ liệu**.
- Ngoại lệ duy nhất được chấp nhận khi và chỉ khi Product Owner phê duyệt rõ ràng cho đúng tác vụ và môi trường cụ thể đó.
