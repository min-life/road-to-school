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
9. **Verification & Testing**: Commands đã chạy thực tế, kết quả kiểm thử. Sử dụng minh bạch các nhãn `PASS`, `FAIL`, `NOT VERIFIED`. Tuyệt đối không giả lập test results.
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
