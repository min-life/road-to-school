# Kế hoạch đồng bộ Web UI RoadToSchool theo dự án tham chiếu

- Ngày: 27/10/2026 (Asia/Saigon).
- Trạng thái cập nhật 27/10/2026: PO đã yêu cầu triển khai kế hoạch và wireframe trong hội thoại; phần source đã triển khai. Nghiệm thu runtime sau đăng nhập còn giới hạn, xem [LATEST.md](../ai-review/LATEST.md).
- Đích: `D:/road-to-school/road-to-school/web`.
- Tham chiếu chỉ đọc: `D:/project/he-thong-giam-sat-xe-dua-don-hoc-sinh/web`.
- Mục tiêu: đồng bộ nhận diện, font, màu, login, sidebar, header và bộ component trình bày; giữ nguyên hành vi của RoadToSchool.

## 1. Kết quả đối chiếu source

| Hạng mục | RoadToSchool hiện tại | Bản tham chiếu | Đề xuất |
| --- | --- | --- | --- |
| Font | Layout tải Geist; body khai báo Arial/Helvetica | Be Vietnam Pro 400/500/600/700, Vietnamese + Latin | Dùng Be Vietnam Pro thống nhất body, form, bảng, nút |
| Màu nền tảng | Vàng `#FFCB56`, kem `#FFFDF6`, chữ `#1E293B`, card trắng | Cùng bộ màu nền; thêm sidebar navy `#193652` | Giữ màu thương hiệu, thêm token navy và màu phụ theo ngữ cảnh |
| Logo | `BusLogo` SVG inline kèm chữ | `BrandLogo`, asset `road-to-school-variant-navy.svg` | Dùng asset có sẵn của bản tham chiếu qua component chung |
| Login | Card trắng ở giữa trang | Hero navy bên trái, form nền kem bên phải | Chuyển phần trình bày sang hai cột, giữ form/submit hiện tại |
| Admin shell | Header chạy toàn chiều ngang; sidebar bên dưới, rộng 256px | Sidebar cao toàn viewport, rộng 250px; header nằm trong workspace | Đổi bố cục shell, giữ AuthGuard và callbacks |
| Header | Logo, avatar, tên/role, đăng xuất | Search, ngày, thông báo, profile menu | Lấy style và tỷ lệ; chỉ hiển thị chức năng RoadToSchool đã có |
| UI dùng chung | Nhiều class inline; có PaginationControl/SchoolSelectFilter | Button, Form, DataTable, Badge, Dialog dùng chung | Tạo lớp trình bày nhỏ phù hợp code hiện tại |
| Dependencies | React, Next, Tailwind; SVG icons nội bộ | Có Radix, shadcn, lucide, cva, cn, Zustand | Không copy dependency stack hoặc provider/store |

Nguồn tham chiếu đã đọc:

- `app/layout.tsx`, `app/globals.css`, `app/styles/{base,layout,typography}.css`.
- `components/shared/{brand-logo,app-header}.tsx`, CSS modules tương ứng và `AuthPageShell.tsx`.
- `app/login/page.tsx`, `app/login/login.module.css`.
- `components/admin/admin-dashboard.tsx` (đã xác định vị trí shell qua imports), `components/admin/data-table.tsx`, `components/ui/button.tsx`.
- `docs/design.md` và `web/AGENTS.md` của bản tham chiếu.

Đây là đối chiếu source, chưa phải nghiệm thu ảnh render. CSS tham chiếu có nhiều lớp override: `base.css` đưa chữ body về `#1E293B`; `#17243B` chỉ dùng cho một số phần nhấn mạnh. Khi triển khai phải so ảnh cùng viewport và xét cascade thực tế.

## 2. Ranh giới bắt buộc

- Chỉ sửa presentation trong `web/` và tài liệu liên quan. Không sửa `api/`, `mobile/`, Prisma, migration, `.env`, package manifests hay lockfiles.
- Giữ nguyên endpoint, HTTP method, params/query/body, cách xử lý response/error và mọi lời gọi API.
- Giữ nguyên auth/session, login, quên mật khẩu/OTP, role splash, logout confirmation, guards, route và redirect.
- Giữ nguyên `admin-nav.config.ts`: menu, thứ tự, href, nhãn nghiệp vụ và allowedRoles. School Admin vẫn dùng `/admin` theo thiết kế hiện tại của RoadToSchool.
- Giữ nguyên handlers, state nghiệp vụ, validation, disabled/loading conditions, filters, phân trang, polling, stale-response protection và mapping trạng thái.
- Không thêm chức năng search toàn cục, thông báo, profile dropdown, remember-me, dark mode hoặc màn hình mà RoadToSchool chưa có chỉ để giống ảnh tham chiếu.
- Không thay icon/svg logic dùng cho bản đồ, map instance, sources/layers, vị trí GPS, popup, camera hoặc các thuật toán tuyến. Chỉ style phần khung xung quanh bản đồ.
- Không chuyển store/provider/API client từ dự án nguồn; không thêm package, shared-package architecture hoặc đổi package manager.
- Không thêm mock dashboard, số liệu, avatar người dùng giả hay badge đếm giả.

## 3. Wireframe đề xuất để PO duyệt

### A. Login desktop

```text
┌───────────────────────────┬─────────────────────────────────────┐
│ HERO NAVY ~40.6%           │ FORM NỀN KEM ~59.4%                 │
│ Logo Road To School       │                                     │
│                           │ Vạch vàng + Đăng nhập               │
│ Tiêu đề ngắn 2 dòng       │ Email hoặc Số điện thoại            │
│                           │ [ identifier hiện tại             ] │
│                           │ Mật khẩu                            │
│                           │ [ password hiện tại          mắt  ] │
│                           │                  Quên mật khẩu?     │
│ Minh họa login-hero.png    │ Vùng lỗi khi có                     │
│ neo đáy                   │ [          Đăng nhập              ] │
└───────────────────────────┴─────────────────────────────────────┘
```

- Form tối đa khoảng 438–460px, input 52px, nút khoảng 56px, radius 8px theo mẫu.
- Giữ nhãn email/số điện thoại đúng khả năng đăng nhập hiện tại; không đổi sang username theo bản nguồn.
- Không thêm remember-me. Giữ giá trị field, autocomplete, validation, hiện/ẩn password, submit và redirect hiện có.
- Hero chỉ dùng tiêu đề ngắn, bỏ đoạn giới thiệu dài theo Minimal UI Copy. Họa tiết trang trí không tương tác.
- Web hẹp khoảng <=760px: ẩn hero, logo phía trên form một cột, không tràn ngang; màn hình thấp cho phép cuộn.
- Quên mật khẩu dùng cùng khung auth, giữ đầy đủ bước/field/validation/OTP hiện tại của RoadToSchool.

### B. Admin desktop

```text
┌───────────────────┬─────────────────────────────────────────────┐
│ SIDEBAR NAVY      │ HEADER TRẮNG ~70px                         │
│ Logo              │ Tiêu đề khu vực   Avatar / Tên / Role / Thoát│
│                   ├─────────────────────────────────────────────┤
│ Menu hiện có      │ NỀN KEM                                     │
│ theo role         │ Tiêu đề trang                 Hành động cũ  │
│                   │ Bộ lọc / tìm kiếm hiện có của trang         │
│ Mục active vàng   │ ┌─────────────────────────────────────────┐ │
│                   │ │ Panel / bảng / form / map hiện tại      │ │
│                   │ │ Dữ liệu và quyền thao tác giữ nguyên    │ │
│                   │ └─────────────────────────────────────────┘ │
│ Đăng xuất hiện có │ Phân trang hiện tại                         │
└───────────────────┴─────────────────────────────────────────────┘
```

- Sidebar 250px, full-height, logo rộng khoảng 202px; active vàng đặc, icon/chữ tương phản, menu cuộn riêng khi dài.
- Header thuộc workspace bên phải. Không có thanh tìm kiếm hoặc chuông không hoạt động để lấp chỗ trống.
- Giữ avatar thật/fallback initial, tên/role và callback mở logout dialog; chỉ điều chỉnh layout/style.
- Nội dung vẫn theo cấu trúc nghiệp vụ hiện tại; chỉnh spacing, font, viền, radius, chiều rộng hợp lý.
- Giữ điều kiện xác định active item hiện tại; sửa quy tắc active route con là task hành vi riêng nếu cần sau này.

### C. Responsive

- >=1200px: sidebar đầy đủ 250px, header/nội dung không bị chồng lấn.
- 768–1199px: đề xuất rail 72px chỉ icon theo mẫu; dùng icon logo sẵn có, nhãn truy cập/title cho từng liên kết, giữ nguyên href.
- <768px: sidebar ẩn và mở bằng hamburger/drawer qua state/callback hiện có; đóng qua backdrop/nút đóng/link như hiện tại.
- Bảng hẹp có một wrapper cuộn ngang; modal có chiều cao giới hạn và vùng cuộn; header không che nút hành động hay trường form.
- Xác minh thêm vùng 761–767px vì auth/admin có breakpoint khác nhau.

### D. Bảng và modal

```text
Tiêu đề trang                              [Hành động hiện có]
[Tìm kiếm hiện có] [Bộ lọc hiện có]          [Nút hiện có]
┌───────────────────────────────────────────────────────────┐
│ Header bảng ~42px                                         │
│ Dữ liệu ~52–60px/hàng | Badge trạng thái | Thao tác hiện có│
├───────────────────────────────────────────────────────────┤
│ Tổng bản ghi     PaginationControl hiện tại               │
└───────────────────────────────────────────────────────────┘

Modal: [Tiêu đề                                      Đóng]
       [Các field/nội dung hiện có, nhóm theo ngữ cảnh]
       [Thông báo lỗi hiện có]          [Hủy] [Xác nhận cũ]
```

Không đổi cột dữ liệu, sắp xếp, selection, nội dung hành động, bước wizard hoặc biến modal thành drawer nếu điều đó thay đổi luồng thao tác. Giữ nút thao tác đang có thay vì ép menu ba chấm theo nguồn.

## 4. Bộ component trình bày dự kiến

Ưu tiên component thuần nhận props/children và chuyển tiếp HTML attributes/ref cần thiết. Không fetch API, không biết role hay trạng thái domain, không tự đặt validation. Tạo theo nhu cầu thực sự, không dựng một framework UI mới.

| Component | Vai trò | Quy tắc tích hợp |
| --- | --- | --- |
| `BrandLogo` | Asset logo dùng chung, bản wordmark/icon | Props kích thước/variant; không tự xử lý điều hướng |
| `AuthPageShell` | Hero + vùng form + logo responsive | Chỉ bọc form login/forgot hiện tại |
| `Button` | Primary, outline, ghost, danger; icon/text | Giữ nguyên type, disabled, onClick và loading từ caller |
| `Input`, `Textarea`, `Select` | Đồng bộ field, focus, error appearance | Dùng native HTML hiện có; không thay validation hay onChange contract |
| `Card`, `PageHeader`, `FilterToolbar` | Panel/tiêu đề/bộ lọc nhất quán | Nhận children, không tự thêm control mới |
| `Badge` | Tông màu success/warning/danger/info/neutral | Domain mapping vẫn ở caller hiện tại |
| `Table` primitives | Table/header/row/cell appearance | Không đổi columns, sorting, filtering hay pagination |

Tái sử dụng `PaginationControl`, `SchoolSelectFilter` và các modal hiện tại; chỉ sửa class/style. Không tạo modal engine mới hoặc thay vòng đời/focus/đóng modal trong task style. Các class modal dùng chung có thể nằm trong stylesheet có scope.

## 5. Thứ tự triển khai sau khi được duyệt

1. **Nền tảng nhận diện:** thêm token và font Be Vietnam Pro 400/500/600/700, Vietnamese + Latin; lấy logo/ảnh nguồn đúng file; tạo BrandLogo và primitive cần dùng ngay. Bỏ xung đột Arial/Geist ở phần font hiển thị; giữ providers và metadata nghiệp vụ.
2. **Auth:** dựng AuthPageShell theo wireframe; thay JSX/class login và forgot password, giữ toàn bộ xử lý hiện có. Đồng bộ logo/style role splash và logout dialog.
3. **Admin shell:** đổi JSX/CSS layout-sidebar-header theo wireframe. Giữ guards, menu config, state/callbacks và logout flow.
4. **Các màn nghiệp vụ đang có:** áp dụng component/style lần lượt: Tổng quan → Trường học → Tài xế/Phương tiện → Học sinh/Giáo viên → Phương án tuyến → Chuyến xe → Báo nghỉ/Yêu cầu → Cài đặt. Mỗi nhóm gồm list/detail/tab/form/modal liên quan; không xây thêm module.
5. **Nghiệm thu:** rà soát diff logic/API, chạy kiểm tra tĩnh/build thích hợp, so giao diện cùng viewport và hai role bằng dữ liệu sẵn có. Ghi nhận mọi phần chưa thể kiểm chứng.

Các bước là thứ tự công việc trong cùng phạm vi được duyệt, không phải yêu cầu xin duyệt lại từng file. Phát sinh chức năng mới hoặc layout vượt wireframe cần tách phạm vi và báo PO.

## 6. File dự kiến thay đổi khi implementation

### Thêm mới tối thiểu

- `web/src/components/common/brand-logo.tsx`.
- `web/src/components/auth/auth-page-shell.tsx` và stylesheet auth có scope.
- `web/src/components/ui/`: button/input/textarea/select/card/badge/table và page-header/filter-toolbar khi có caller cần dùng.
- `web/public/road-to-school-variant-navy.svg`, `web/public/road-to-school-icon.svg`, `web/public/login-hero.png`: sao chép từ nguồn hiện có; không tạo logo mới.
- Stylesheet UI/admin có scope nếu utility classes không đủ rõ ràng; chốt số file theo mức tái sử dụng thực tế.

### Sửa presentation trong file hiện tại

- `web/src/app/globals.css`, `web/src/app/layout.tsx` (font/token; giữ AuthProvider).
- `web/src/app/login/page.tsx`, `web/src/app/forgot-password/page.tsx`.
- `web/src/components/auth/role-splash.tsx` (logo/style, giữ thời gian/luồng).
- `web/src/app/admin/layout.tsx`.
- `web/src/components/admin/admin-sidebar.tsx`, `admin-header.tsx`, `logout-dialog.tsx`.
- `web/src/components/admin/common/pagination-control.tsx`, `school-select-filter.tsx`.
- Presentation trong các trang hiện có dưới `web/src/app/admin/{schools,drivers,vehicles,students,teachers,routes,trips,leave-notices,requests,settings}/` và `web/src/app/admin/page.tsx`.
- Presentation của components tương ứng dưới `web/src/components/admin/`: bảng, bộ lọc, form, modal, tab. `route-map.tsx` và logic map nằm ngoài danh sách sửa mặc định.
- Tài liệu kế hoạch/review. Danh sách này là phạm vi dự kiến, không phải chỉ thị sửa tất cả file bằng thay thế hàng loạt.

### Bảo vệ khỏi thay đổi

- `web/src/lib/**`, `web/src/hooks/**`, `web/src/components/auth/{auth-provider,auth-guard}.tsx`.
- Guards theo trường/role và `web/src/components/admin/admin-nav.config.ts`.
- Tất cả `.env`, backend/mobile, schema, migrations, manifests, lockfiles và toàn bộ source dự án tham chiếu.
- Nếu một file UI chứa logic, chỉ chấp nhận diff trình bày; không đổi các handler/effect/điều kiện nghiệp vụ trong cùng file.

## 7. Verification và tiêu chí nghiệm thu

- Trước/sau implementation chụp trạng thái Git và đối chiếu baseline theo file; không gộp thay đổi PO có sẵn vào diff task.
- Chạy `npx.cmd --no-install tsc --noEmit --incremental false` trong web bằng dependencies hiện có; chạy ESLint phần bị sửa và build sau khi kiểm tra điều kiện môi trường/script. Không cài package hoặc sửa lockfile để vượt check.
- Chỉ chạy tests hiện có sau khi đọc và xác nhận không ghi DB/không dùng dữ liệu giả bị cấm; không thêm test chỉ để kiểm tra className.
- So cùng viewport dự kiến 1440, 1280, 1024, 768, 760 và 390px: logo, font Vietnamese, sidebar/rail/drawer, header, input/nút, table/badge/modal, overflow, focus và contrast.
- Rà soát diff xác nhận không đổi API arguments, auth/session, role visibility, fields/validation, actions/disabled rules, date/filter/page states, polling intervals và map lifecycle.
- Trình duyệt chỉ quan sát bằng session/dữ liệu sẵn có hợp lệ. Không tự submit login/forgot/logout hay CRUD để test khi chưa được PO cho phép thao tác tương ứng; trạng thái loading/error được rà code nếu không có tình huống thực tế.
- Không tự tạo user/student/trip, chạy seed, giả API response hoặc rollback dữ liệu test. Thiếu session/data để xem role/trạng thái: ghi `NOT_VERIFIED`; nếu cần tự tạo records thì thêm `BLOCKED_BY_TEST_DATA_POLICY` và nêu dữ liệu tối thiểu cần PO cấp.
- Tiêu chí đạt: nhận diện/bố cục bám nguồn ở phần chức năng tương đương, responsive không che thao tác, typecheck đạt, không đổi hợp đồng/hành vi. Không cam kết giống từng pixel cho những control cố ý không thêm vì ngoài phạm vi chức năng.

## 8. Trạng thái và bước tiếp theo

- Đã triển khai presentation trong Web theo wireframe A–D; không thêm package, không thay API/DB/mobile.
- Be Vietnam Pro được self-host qua next/font/local (400/500/600/700) vì Google Fonts fetch bị giới hạn trong môi trường build; có OFL và nguồn tải đi kèm.
- Typecheck/build PASS; các file nền tảng UI mới và auth/shell lint PASS. Lint toàn Web vẫn có 150 errors/50 warnings từ baseline, không tăng số diagnostic theo rule/file.
- Browser login/quên mật khẩu PASS ở 1440/1280/1024/768/760/390px, không tràn ngang hoặc request ghi. Admin sau đăng nhập và các trạng thái nghiệp vụ chưa nghiệm thu runtime do chưa có phiên hợp lệ trong browser kiểm chứng.
- **Một bước tiếp theo:** PO review giao diện bằng phiên đăng nhập/dữ liệu hiện có của hai role quản trị.
