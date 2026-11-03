# Tài liệu Web — đọc theo nhiệm vụ

Đối chiếu source ngày **02/11/2026**. Đường dẫn code trong bộ này tính từ `web/`.
Đây là chỉ mục làm việc, không phải báo cáo nghiệm thu. Quy tắc root vẫn áp dụng.

## Đọc gì khi sửa UI?

| Việc cần làm | Mục nên đọc | Điểm bắt đầu trong code |
| --- | --- | --- |
| Màu, font, khoảng cách | [Design §1–2](design.md#1-nguồn-chuẩn-và-token) | `src/app/globals.css`, `src/components/ui/ui.css` |
| Header, sidebar, responsive | [Design §3](design.md#3-bố-cục-và-vùng-cuộn), [Kiến trúc §1](web-architecture.md#1-khung-chung-và-dữ-liệu) | `src/app/admin/layout.tsx`, `admin-shell.css` |
| Bảng, filter, pagination, thao tác | [Design §4](design.md#4-bảng-bộ-lọc-và-thao-tác) | `components/ui`, `components/admin/common` dưới `src/` |
| Form, modal, wizard, toast | [Design §5](design.md#5-form-modal-và-phản-hồi) | Tìm module ở [Kiến trúc §2](web-architecture.md#2-tìm-module-theo-tính-năng) |
| Lập tuyến, bản đồ, phân công | [Design §6](design.md#6-bản-đồ-và-phân-công), [Kiến trúc §3](web-architecture.md#3-tuyến-và-hai-vai-trò) | `src/components/admin/routes/` |
| Tạo, đổi tên, tách hoặc chọn vị trí component | [Quy tắc component §3](component-conventions.md#3-đặt-đúng-chỗ) | Route-private trong `_components`; shared trong `src/components`; kiểm tra caller trước |
| Auth, role, API, dữ liệu | [Kiến trúc §1](web-architecture.md#1-khung-chung-và-dữ-liệu) + tài liệu nghiệp vụ root | `auth-provider.tsx`, `api-client.ts`, `types.ts` |

## Vai trò của từng tài liệu

- [school-lifecycle-usage.md](school-lifecycle-usage.md): màn hình, quyền, cách hẹn thay đổi trường,
  ngày nghỉ/học bù, hiệu lực phương án và xử lý hành chính chuyến; kèm giới hạn tích hợp.

- [../AGENTS.md](../AGENTS.md): quy tắc ngắn agent tự đọc khi làm trong `web/`.
- [design.md](design.md): màu, component chuẩn và cách trình bày; không chứa danh sách API.
- [web-architecture.md](web-architecture.md): bản đồ route → component → CSS/state; không chép lại design.
- [component-conventions.md](component-conventions.md): đặt tên, vị trí file, giới hạn trách nhiệm.
- [WORKING_RULES](../../docs/WORKING_RULES.md): phê duyệt, dữ liệu, kiểm chứng và báo cáo.
- [Báo cáo gần nhất](../../docs/ai-review/LATEST.md): nhật ký cục bộ, có thể không tồn tại ở clone mới;
  không dùng làm nguồn chuẩn thiết kế hoặc bằng chứng toàn bộ tính năng đã chạy.

## Quy trình ngắn để tiết kiệm token

1. Đọc quy tắc root/Web theo yêu cầu; chọn hàng phía trên, không nạp mọi tài liệu.
2. Tìm section bằng `rg -n '^##' docs/design.md docs/web-architecture.md` từ `web/`.
3. Mở entry/caller, component và CSS liên quan. Chỉ lần sang API/types khi có binding hoặc contract cần kiểm tra.
4. Sửa đúng phạm vi; khi đụng shared component, kiểm tra thêm các caller bị ảnh hưởng.
5. Cập nhật đúng section nếu sự thật thay đổi. Không thêm file `final/v2/new` hoặc bản sao design.

Trong cùng phiên dùng lại tài liệu đã đọc nếu chưa thay đổi. Không có số token tiết kiệm
cố định; mục tiêu là giảm đọc lặp và tránh tìm nhầm file, không bỏ kiểm chứng cần thiết.

## Quan hệ với dự án tham chiếu

`he-thong-giam-sat-xe-dua-don-hoc-sinh/web/docs` là nguồn tham khảo về cách tổ chức tài liệu
và style đã được duyệt, **không phải contract của RoadToSchool**. Không sao chép danh sách
API, báo cáo PASS, proxy/cookie auth, Google Maps, entity hợp đồng riêng hoặc đường dẫn
của dự án đó vào đây. Chỉ mở lại tham chiếu khi người dùng yêu cầu so sánh cụ thể.

Dùng Markdown `.md` làm nguồn chuẩn vì dễ tìm kiếm, diff và đọc từng section. Không duy trì
thêm bản `.docx` cùng nội dung cho agent; nếu cần xuất tài liệu để gửi thì xuất riêng theo yêu cầu.
