<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RoadToSchool — quy tắc Web

Áp dụng cho `web/`. Đọc cùng [AGENTS gốc](../AGENTS.md) và
[WORKING_RULES](../docs/WORKING_RULES.md); không thay thế quy tắc an toàn hoặc phê duyệt.

## Đọc đúng phần, tránh tốn context

- Bắt đầu bằng [chỉ mục](docs/README.md), chọn **một hàng đúng nhiệm vụ**.
- [design.md](docs/design.md): chuẩn UI; chỉ đọc mục liên quan.
- [web-architecture.md](docs/web-architecture.md): tìm route, component, CSS và owner dữ liệu.
- [component-conventions.md](docs/component-conventions.md): đọc khi tạo/đổi tên/tách component.
- Sau ngữ cảnh nền bắt buộc ở root, không đọc lại cả handoff, nhật ký, toàn bộ docs hoặc
  repository tham chiếu cho từng chỉnh sửa CSS. Trong cùng phiên, tái dùng phần đã đọc
  nếu chưa thay đổi; khi thiếu ngữ cảnh hoặc file đổi thì đọc lại phần liên quan.
- Tìm file bằng `rg --files`; tìm export/import bằng `rg -n`. Xác minh caller thật trước khi sửa.
  Không in toàn bộ `.env`, token, dữ liệu cá nhân hoặc lockfile để lấy ngữ cảnh.

## Phạm vi và dữ liệu

- Task style giữ nguyên handler, payload, API, validation, role/capability và dữ liệu.
- Không seed, tạo records hoặc gọi mutation để kiểm thử khi chưa được cho phép rõ ràng.
- Không tự cài package, commit/push, đổi auth hoặc kiến trúc dự án.
- Wireframe mới/refactor lớn cần duyệt theo root; mẫu đã được duyệt trong hội thoại có thể triển khai.
- SYSTEM_ADMIN quản lý xe/tài xế, không duyệt phương án; SCHOOL_ADMIN phân giáo viên và duyệt.
  Phân công nhà xe hoàn tất không đồng nghĩa phương án đã đủ điều kiện phê duyệt.
- Cả hai role hiện dùng `/admin`; không sao chép router `/school-admin` của dự án tham chiếu.

## Chuẩn triển khai ngắn

- File `kebab-case.tsx`, export React `PascalCase`; giữ `page.tsx`, `layout.tsx` của Next.
- Component mới chỉ phục vụ một nhánh route đặt tại `app/<route>/_components`; dùng ở nhiều
  nhánh đặt trong `components/admin/<domain>`, primitive ở `components/ui`. Shared không import
  từ route-private; không tự di chuyển code cũ ngoài phạm vi refactor đã giao.
- Tái sử dụng `components/ui`, `TableActions`, `PaginationControl`, `ContextLink`/`BackLink`
  trước khi tạo component mới. Không sao chép bảng, toast hoặc shell vào từng trang.
- Dùng token trong `src/app/globals.css`; CSS riêng phải có prefix theo component/domain.
  Không thêm global selector để chữa lỗi của một màn hình.
- Dữ liệu server qua `apiClient`; state cục bộ dùng React, state UI thực sự dùng chung mới dùng Zustand.
  Không đưa JWT hoặc bản sao response vào store chỉ để sửa style.
- Vùng cuộn phải có giới hạn kích thước và cuộn tới phần tử cuối; không để overflow cắt nội dung.
- Đổi đường dẫn/caller thì cập nhật chỉ mục kiến trúc; đổi pattern dùng chung thì cập nhật design.
  Chỉ cập nhật sự thật thay đổi, không chép lịch sử làm việc vào các tài liệu chuẩn.

## Kiểm chứng và bàn giao

Chạy từ `web/`: `npx.cmd --no-install tsc --noEmit --pretty false`, lint file liên quan,
`git diff --check`; chỉ chạy test không ghi DB và đúng phạm vi. UI cần xem ở desktop,
tablet, mobile và viewport thấp khi có điều kiện. Typecheck không phải bằng chứng browser.
Ghi rõ `NOT_VERIFIED` nếu chưa kiểm tra live; cập nhật báo cáo 13 mục ở root theo quy định.
Tài liệu UI không xác nhận toàn bộ hệ thống đã hoàn tất hoặc sạch lint.
