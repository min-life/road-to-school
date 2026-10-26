# RoadToSchool v2.0 — Codex & AI Agent Instructions

> **Mục tiêu**: Hướng dẫn hành động cốt lõi cho mọi AI Agent (Codex, Antigravity) làm việc trong repository RoadToSchool v2.0. Đọc file này trước khi thực hiện bất kỳ nhiệm vụ nào.

---

## 1. Project Identity & Architecture
- **Dự án**: RoadToSchool v2.0 — Hệ thống quản lý đưa đón học sinh bằng xe buýt trường học (1 nhà xe tập trung, 1 bãi xe trung tâm, phục vụ nhiều trường học đối tác).
- **Cấu trúc độc lập**: 3 project riêng biệt tại root:
  - `/api`: Backend NestJS 12, Prisma ORM 6, PostgreSQL, JWT Auth, Swagger.
  - `/web`: Web Admin Next.js 16 (App Router, Tailwind CSS, MapLibre GL).
  - `/mobile`: Mobile App Expo 58 (React Native, Expo Router, Reanimated, Map WebView).
- **Tuyệt đối không tự ý**: Hợp nhất thành monorepo phức tạp, chuyển sang shared-package architecture, hoặc thay đổi package manager.

---

## 2. Mandatory Reading Order (Thứ tự đọc tài liệu bắt buộc)
Trước khi phân tích hoặc triển khai bất kỳ task nào, Agent **BẮT BUỘC** đọc tài liệu theo đúng thứ tự:
1. [docs/WORKING_RULES.md](docs/WORKING_RULES.md) — Quy tắc làm việc, chế độ phê duyệt, tiêu chuẩn kỹ thuật & Test Data Policy.
2. [docs/BUSINESS_CONTEXT.md](docs/BUSINESS_CONTEXT.md) — Ngữ cảnh nghiệp vụ nền tảng, 5 vai trò (Roles) và mô hình vận hành.
3. [docs/ai-handoff/CODEX_HANDOFF.md](docs/ai-handoff/CODEX_HANDOFF.md) — Bản tổng hợp kiến trúc toàn diện, domain model, các quyết định nghiệp vụ đã chốt.
4. [docs/ai-handoff/CURRENT_STATE.md](docs/ai-handoff/CURRENT_STATE.md) — Snapshot hiện trạng source code, các tính năng đã/đang/chưa triển khai, migrations, uncommitted work.
5. [docs/ai-review/LATEST.md](docs/ai-review/LATEST.md) — Báo cáo AI Review của phiên làm việc gần nhất.
6. *Tài liệu chuyên biệt của module liên quan* (trong `docs/ai-review/` hoặc `docs/architecture/` nếu task yêu cầu).

---

## 3. Source of Truth Priority (Thứ tự ưu tiên nguồn sự thật)
Khi phát hiện mâu thuẫn giữa các nguồn thông tin:
1. **Quyết định mới nhất được Product Owner phê duyệt** trong cuộc hội thoại hiện tại.
2. [docs/WORKING_RULES.md](docs/WORKING_RULES.md) (Quy tắc kỹ thuật & chuẩn mực vận hành).
3. [docs/BUSINESS_CONTEXT.md](docs/BUSINESS_CONTEXT.md) (Ngữ cảnh nghiệp vụ nền tảng).
4. **Source code & Prisma schema thực tế** (Bằng chứng duy nhất của trạng thái implementation).
5. [docs/ai-handoff/](docs/ai-handoff/) (Tài liệu tổng hợp tại mốc bàn giao).
6. [docs/ai-review/](docs/ai-review/) (Nhật ký lịch sử — không coi đề xuất cũ chưa duyệt là quyết định chính thức).

---

## 4. Operational Protocol (Quy trình làm việc 3 giai đoạn)

### A. Bắt đầu Task (Task Start)
- Xác định rõ chế độ: **DISCUSSION** (chỉ trao đổi), **PLANNING** (phân tích & lập kế hoạch), hay **IMPLEMENTATION** (chỉ khi PO đã phê duyệt).
- Không tự ý implement khi PO chỉ yêu cầu phân tích hay hỏi nguyên nhân.
- Không tự ý dừng ở Planning nếu PO đã duyệt kế hoạch và yêu cầu triển khai ngay.
- Kiểm tra `git status` để bảo vệ uncommitted work của PO.

### B. Trong khi Triển khai (During Implementation)
1. **Kiểm soát phạm vi (Scope Discipline)**: Chỉ sửa đúng files liên quan trực tiếp đến task. Task Backend không sửa Frontend, task Web không sửa Mobile/DB trừ khi được giao.
2. **Tối thiểu hóa tác động Database (Minimal DB Impact)**:
   - Tối đa hóa tái sử dụng bảng và trường hiện có.
   - Thêm field mới phải là phương án tối thiểu nullable.
   - Chỉ tạo bảng mới khi được PO phê duyệt bằng văn bản.
3. **Đồng bộ Swagger bắt buộc**: Mọi thay đổi ở API (DTOs, params, status code, error cases) bắt buộc cập nhật decorators và kiểm chứng tại `http://localhost:3000/api/docs`. Không hoàn thành task nếu Swagger chưa đồng bộ.
4. **Duyệt Wireframe trước khi code UI**: Mọi màn hình mới hoặc refactor trên Web/Mobile đều phải trình bày cấu trúc wireframe và xin duyệt trước khi viết code.
5. **Tối giản câu chữ trên UI (Minimal UI Copy)**:
   - *"Show what users need to know and do, not paragraphs explaining what the interface does."*
   - Không thêm đoạn văn mô tả dài, câu chào thừa thãi, hoặc hướng dẫn thường trực.
   - Ưu tiên cards, tables, badges trực quan và màu thương hiệu: Primary `#FFCB56`, Background `#FFFDF6`, Text `#1E293B`, Card `#FFFFFF`.
6. **Bảo vệ dữ liệu tuyệt đối (TEST DATA POLICY — NO SELF-GENERATED TEST DATA)**:
   - **TUYỆT ĐỐI KHÔNG**: Tự thêm records vào DB để test, tự tạo User/Student/Trip giả, tự chạy seed scripts, sửa đổi bản ghi thật, tạo dữ liệu tạm rồi rollback, hoặc gọi API có side effects để test khi chưa được PO cho phép rõ ràng.
   - Chỉ kiểm chứng bằng phương pháp read-only: `npx tsc --noEmit`, linters, build check, unit tests độc lập không chạm DB, gọi GET query an toàn.
   - Nếu thiếu dữ liệu test: Đánh dấu `NOT_VERIFIED` kèm nhãn `BLOCKED_BY_TEST_DATA_POLICY`, báo cáo rõ cấu trúc dữ liệu cần thiết và chờ PO cấp.
7. **Quản lý Dependencies**: Tuyệt đối không tự cài npm package, Expo package, UI library hay CLI tool mới khi chưa được PO phê duyệt.
8. **An toàn Git**: Tuyệt đối không tự ý `git commit`, `git push`, `git rebase`, `git reset`, hay discard uncommitted changes.

### C. Kết thúc Task (Task End & Stop-After-Task)
1. Kiểm tra diff (`git diff`), chạy typecheck an toàn (`npx tsc --noEmit`).
2. **Lưu báo cáo AI Review bắt buộc**: Cập nhật báo cáo đầy đủ 13 mục vào [docs/ai-review/LATEST.md](docs/ai-review/LATEST.md) (kèm [docs/ai-review/LATEST.diff](docs/ai-review/LATEST.diff) nếu có code changes) trước khi trả lời trong chat.
3. Chat response chỉ tóm tắt ngắn gọn: Kết quả thực hiện, files thay đổi, kết quả verification, link báo cáo.
4. Đề xuất duy nhất **MỘT** bước tiếp theo phù hợp.
5. **DỪNG LẠI VÀ CHỜ PHẢN HỒI CỦA PRODUCT OWNER (STOP-AFTER-TASK).** Không tự ý làm tiếp.

---

## 5. System Roles & Access Matrix
- **5 Roles cố định**:
  - `SYSTEM_ADMIN`: Quản trị viên nhà xe (Dùng **Web Admin**). Quản lý trường học, xe, tài xế, tạo tuyến VRP, gán xe/tài xế mặc định, sinh chuyến thủ công. **KHÔNG có quyền duyệt RoutePlan DRAFT -> ACTIVE.**
  - `SCHOOL_ADMIN`: Quản trị viên trường học (Dùng **Web Admin**). Quản lý học sinh trường mình, gán Bus Attendant, **duy nhất có quyền Duyệt RoutePlan DRAFT -> ACTIVE**, quản lý chuyến xe trường mình. **KHÔNG tạo RoutePlan, KHÔNG sinh chuyến thủ công.**
  - `DRIVER`: Tài xế (Dùng **Mobile App**). Xem lịch tuần, xem chi tiết chuyến trên bản đồ, Bắt đầu chuyến, Xác nhận đến trường (chiều TO_SCHOOL), Hoàn thành chuyến.
  - `BUS_ATTENDANT`: Giáo viên phụ trách xe (Dùng **Mobile App**). Xác nhận sẵn sàng, Điểm danh lên xe (Boarding), Xác nhận học sinh xuống xe (Alighting), Quét QR. **Chính là giáo viên phụ xe; không có role TEACHER riêng.**
  - `PARENT`: Phụ huynh học sinh (Dùng **Mobile App**). Theo dõi lịch con, theo dõi chuyến xe thực tế của con. **Chỉ thấy thông tin con mình; thông tin học sinh khác bị ẩn danh (Privacy Masking).**
