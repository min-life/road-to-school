# Kế hoạch thu gọn sidebar Web Admin

## Hiện trạng và mục tiêu

Sidebar hiện rộng 250 px từ 1200 px trở lên. Màn hình 768–1199 px dùng thanh icon 72 px. Dưới 768 px, người dùng mở menu dạng drawer từ header. Bổ sung quyền thu gọn và mở rộng trên desktop để lấy thêm chỗ cho bảng, bản đồ và nội dung làm việc. Cả SYSTEM_ADMIN và SCHOOL_ADMIN dùng chung cơ chế này.

## Bố cục đề xuất

```text
Mở rộng · 250 px                    Thu gọn · 72 px
┌──────────────────────┐            ┌─────────┐
│ Logo Road To School  │            │  Logo   │
│ ▣  Tổng quan         │            │    ▣    │
│ ◇  Các mục theo role │            │    ◇    │
│         …            │            │    …    │
├──────────────────────┤            ├─────────┤
│ «  Thu gọn sidebar   │            │    »    │
│ ⇥  Đăng xuất         │            │    ⇥    │
└──────────────────────┘            └─────────┘
```

Đặt nút thu gọn/mở rộng ở chân sidebar, ngay trên Đăng xuất. Vị trí cố định khi danh sách menu cuộn. Khi thu gọn, hiển thị logo biểu tượng, icon điều hướng và icon Đăng xuất. Nhãn truy cập của mọi thao tác vẫn có sẵn cho trình đọc màn hình. Người dùng xem tên mục, tên nút và ý nghĩa badge nếu có qua tooltip hoặc cách hiển thị nhãn sẵn có khi rê chuột và focus bàn phím. Giữ màu, dấu mục đang chọn và hộp thoại xác nhận Đăng xuất của Web Admin.

## Hành vi theo chiều rộng

| Viewport | Hành vi |
|---|---|
| Từ 1200 px | Mặc định mở rộng 250 px. Nút chuyển qua lại giữa 250 px và 72 px. Đề xuất lưu lựa chọn desktop trong localStorage của trình duyệt để giữ khi chuyển trang và tải lại. |
| 768–1199 px | Dùng thanh icon 72 px như hiện tại. Nút thu gọn/mở rộng desktop ẩn đi. |
| Dưới 768 px | Dùng menu drawer từ header theo hành vi hiện tại. Nhãn trong drawer hiển thị đầy đủ. |

Khi thu gọn hoặc mở rộng, lề trái của vùng làm việc cập nhật cùng chiều rộng sidebar. Khi thu cửa sổ xuống tablet hoặc mobile, lựa chọn desktop vẫn được lưu. Khi trở lại desktop, khôi phục lựa chọn đó. Nút là button dùng được bằng Tab, Enter và Space, có tên theo hành động «Thu gọn sidebar» hoặc «Mở rộng sidebar», kèm aria-expanded và aria-controls trỏ tới phần điều hướng desktop. Focus ở lại nút sau mỗi lần chuyển.

## Hướng triển khai

1. Kiểm tra các caller của AdminSidebar. Quản lý lựa chọn desktop tại admin layout. Đọc localStorage sau khi mount, giữ lần render đầu nhất quán khi hydrate và dùng trạng thái mặc định nếu bộ nhớ bị chặn hoặc giá trị không hợp lệ. Khi ghi thất bại, người dùng vẫn thu gọn và mở rộng được trong phiên hiện tại.
2. Trong CSS của shell, dùng một biến chiều rộng chung cho sidebar và lề workspace. Dùng lại quy tắc logo icon, căn giữa icon và nhãn thu gọn đã có của rail tablet. Áp selector thu gọn trong desktop aside để drawer luôn hiển thị nhãn riêng. CSS quyết định breakpoint. Nếu dùng chuyển động, tôn trọng prefers-reduced-motion.
3. Giữ menu theo getVisibleNavItems, các đường dẫn, trạng thái đang chọn, thao tác logout, nút mở menu mobile và bảng quyền hiện tại. Phạm vi triển khai chỉ gồm web/src/app/admin/layout.tsx, web/src/components/admin/admin-sidebar.tsx và web/src/components/admin/admin-shell.css, trừ trường hợp source thực tế đòi cập nhật caller liên quan.

## Nghiệm thu

- 1440 px và mốc 1200 px. Chuyển 250 ↔ 72 px, workspace sát sidebar, bảng và bản đồ có thêm không gian, không tràn ngang. Cuộn menu dài vẫn thao tác được nút thu gọn và Đăng xuất.
- Chuyển trang con, tải lại, mở lại sidebar, resize 1440 → 1024 → 390 → 1440. Xác nhận hành vi tại 1199, 768 và 767 px, phục hồi lựa chọn desktop và không làm drawer mất nhãn.
- Kiểm cả hai vai trò, mục đang chọn, badge nếu có, logout confirmation và thao tác bằng bàn phím. Kiểm một trang có bảng hoặc bản đồ khi sidebar đổi kích thước.
- Chạy npx --no-install tsc --noEmit trong Web và git diff --check. Kiểm giao diện nếu có phiên và dữ liệu được cấp. Ghi NOT_VERIFIED cho phần runtime chưa quan sát.

## Prompt cho Antigravity

> Sau khi PO duyệt bố cục, triển khai thu gọn sidebar Web Admin theo docs/ai-review/admin-sidebar-collapse-plan.md. Đọc AGENTS.md, web/AGENTS.md và mục shell trong web/docs/design.md. Kiểm tra git status và giữ các thay đổi đang có.
>
> Từ 1200 px, thêm nút Thu gọn/Mở rộng ngay trên Đăng xuất. Dùng sidebar 250 px khi mở và 72 px khi thu gọn. Dùng cùng biến chiều rộng cho sidebar và lề workspace. Mặc định mở rộng, lưu lựa chọn desktop trong localStorage, đọc an toàn sau mount và giữ trạng thái trong phiên nếu storage bị chặn. 768–1199 px giữ rail icon hiện tại. Dưới 768 px giữ drawer và nhãn đầy đủ. Resize về desktop phục hồi lựa chọn đã lưu.
>
> Giữ màu, menu theo role, trạng thái đang chọn và LogoutDialog. Ở dạng icon, giữ tên truy cập, hiển thị nhãn khi hover/focus, aria-expanded và aria-controls cho toggle, giữ focus sau khi bấm. Dùng component và icon hiện có. Phạm vi là admin layout, admin sidebar và shell CSS.
>
> Nghiệm thu 1440/1200/1199/768/767/390 px, resize, chuyển trang, tải lại, bàn phím, cả hai role và xác nhận đăng xuất. Kiểm tra bảng hoặc bản đồ khi đổi chiều rộng. Chạy npx --no-install tsc --noEmit và git diff --check. Tuân thủ yêu cầu PO về script test, Test Data Policy và Git. Ghi báo cáo 13 mục và diff theo quy định repo rồi dừng.
