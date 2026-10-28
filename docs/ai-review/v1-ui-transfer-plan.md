# Kế hoạch tham khảo giao diện version 1 cho RoadToSchool version 2

Ngày: 28/10/2026 (Asia/Saigon). Tài liệu gồm kế hoạch gốc và cập nhật tiến độ; các phần chưa được PO giao vẫn ở **PLANNING / WAITING FOR USER REVIEW / APPROVAL**.

## Cập nhật tiến độ — 28/10/2026

| Phần PO đã giao riêng sau kế hoạch | Hiện trạng |
| --- | --- |
| Bốn trang onboarding | Đã triển khai, sao chép 4 JPG; có hoàn thành/bỏ qua, đã bỏ bộ đếm 1/4 |
| Mobile Login | Đã restyle và sao chép ảnh; giữ hành động V2, không autofocus |
| Mobile Quên mật khẩu | Đã restyle và sao chép ảnh; giữ OTP/context V2, không autofocus |
| Mobile Đăng ký phụ huynh | Đã restyle và sao chép ảnh; giữ 4 input, chọn kênh, visibility và OTP V2 |
| Mobile keyboard UX | Đã tích hợp shared scroll handling cho 29 TextInput/15 file, gồm modal/drawer |
| Phần còn lại của Web/Mobile | Chưa triển khai chuyển phong cách V1; không coi toàn bộ kế hoạch là đã duyệt |

Source đã push tới `db02de6` trên `dongnnp/mobile/refactor-ui`; chưa có bằng chứng merge main hoặc nghiệm thu thiết bị. Xem [tài liệu implementation](../architecture/mobile-ui-implementation-status.md) để biết trạng thái thực tế và các giới hạn kiểm chứng.

**Các mục 1–10 dưới đây giữ ngữ cảnh kế hoạch tại thời điểm lập**. Những câu như “chưa có ảnh sao chép”, “chưa implement” và “chưa commit/push” mô tả mốc kế hoạch đó, không phủ nhận bảng tiến độ mới này. Các wireframe/phạm vi chưa triển khai vẫn là đề xuất.

## 1. Phạm vi và kết quả kiểm tra

- Đã đọc được thư mục `C:\dongnnp\study-work\code\he-thong-giam-sat-xe-dua-don-hoc-sinh`, gồm `be`, `web`, `mobile`.
- Đã đọc manifest, theme, bố cục, các màn hình/component đại diện của Web và Mobile version 1. Không chạy ứng dụng, build, cài dependency, gọi API hoặc sửa file của version 1. `git status --short` của version 1 sạch tại lần kiểm tra.
- Version 2 tại `C:\dongnnp\study-work\code\road-to-school\road-to-school` là project triển khai duy nhất. Giữ ba project độc lập `api`, `web`, `mobile` và npm hiện có.
- Lượt này chỉ phân tích và viết tài liệu. Các nhận xét hình thức dưới đây dựa trên source/CSS; **chưa phải đối chiếu ảnh render hoặc nghiệm thu runtime**. Chưa rà chi tiết từng màn hình của toàn bộ version 1.

## 2. Nguồn quyết định và phạm vi bảo toàn

Đã đọc lại theo thứ tự: `WORKING_RULES.md`, `BUSINESS_CONTEXT.md`, `ai-handoff/CODEX_HANDOFF.md`, `ai-handoff/CURRENT_STATE.md`, `ai-review/LATEST.md`. Tài liệu chuyên biệt đã tham khảo gồm `architecture/overview.md`, wireframes tài khoản/phương tiện/yêu cầu và VRP, kế hoạch vận hành chuyến V2, lifecycle trường/tuyến, thông báo/tổng quan và báo cáo UX từ source trước đó.

Quyết định PO trong session và quy tắc version 2 có ưu tiên. Handoff chứa cả snapshot cũ và addendum mới: không dùng số 9 migration/15 model hoặc nhãn “chưa triển khai” cũ để phủ nhận source hiện tại. Version 2 hiện có 19 model, 14 migration; tổng quan, báo nghỉ, sự cố, thông báo đã có source. Các đề xuất lịch sử chưa duyệt không tự trở thành phạm vi chuyển giao diện.

Những phần giữ nguyên trong kế hoạch này:

- Toàn bộ `api/**`, Prisma schema, migrations, dữ liệu, xác thực/JWT/session, DTO/API contract và quy tắc nghiệp vụ.
- Năm role; `BUS_ATTENDANT` là giáo viên phụ xe, không thêm `TEACHER` hoặc `NANNY`.
- System Admin tạo phương án/sinh chuyến thủ công; chỉ School Admin duyệt RoutePlan. Không suy quyền từ menu version 1.
- RoutePlan là đơn vị quản lý, giữ chỗ tài nguyên, snapshot chuyến và roster theo chuyến; giữ các guard/trạng thái lifecycle version 2.
- Luồng Ready / Start / Boarding / School Arrival / Alighting / Complete theo từng chiều; nút hiển thị theo khả năng và lý do disabled từ version 2.
- Parent chỉ thấy dữ liệu được phép của con mình; thông tin học sinh khác vẫn bị ẩn danh.
- Polling, chống response cũ, xử lý mất quyền, cleanup foreground/background và cập nhật map instance hiện có. Không remount WebView/map chỉ vì đổi bố cục hoặc polling.
- API client, auth context, navigation controller và cơ chế notification/deep link hiện tại của version 2 là nơi cấp dữ liệu/hành động.

## 3. Đối chiếu kỹ thuật và hình thức

| Nội dung | Version 1 quan sát từ source | Version 2 hiện tại | Cách chuyển đề xuất |
|---|---|---|---|
| Web stack | Next 16.3.5; Radix/shadcn, Zustand, Lucide, CSS modules/styles toàn cục | Next 16.4.2; Tailwind 4, component/icon/provider tự có | Viết lại phần trình bày bằng stack V2; không copy package/config/store |
| Mobile stack | Expo 57, RN 0.86.3; Gluestack, NativeWind, SVG, nhiều feature provider | Expo 58, RN 0.88.0; StyleSheet, Ionicons, context/hooks hiện tại | Giữ router/hook V2, không mang nguyên component có dependency chưa cài |
| Màu và chữ | Vàng `#FFCB56`, kem `#FFFDF6`, navy `#17243B`/`#193652`; Web Be Vietnam Pro | Brand V2: vàng/kem, chữ `#1E293B`, card trắng; token nền tảng đã có | Giữ bốn brand token V2; navy sidebar là semantic token phụ đề xuất cần duyệt; font mới chưa tự thêm |
| Web shell | Sidebar trái 250px, rail tablet 72px, drawer nhỏ; header trắng; trạng thái active vàng | Layout chung cho hai admin, sidebar sáng, header/guard/notification riêng | Tham khảo tỷ lệ, nhóm menu, active state; giữ menu và URL V2, dùng responsive shell chung |
| Tổng quan | KPI, khối sự cố/yêu cầu, biểu đồ tình trạng xe, chuyến hôm nay | Cần xử lý mọi ngày; bốn trạng thái Trip theo ngày; attention/inventory theo quyền | Dùng kiểu card/grid của V1 với số liệu và cách đếm V2; không thêm donut hoặc metric thiếu dữ liệu |
| Mobile Parent | Header mở rộng/thu gọn, quick actions, thẻ con có chuyến; ba tab | Ba tab Trang chủ/Theo dõi/Cá nhân, dữ liệu con và chuyến qua API V2 | Tham khảo thẻ con, nhịp nội dung, nhóm thao tác; giữ route, bộ lọc, thông báo và privacy V2 |
| Mobile Driver | Thẻ chuyến, header thu gọn, điều hướng map; màn hình home còn dùng driver-mock/DAILY_DRIVER_TRIPS | Home/schedule/trip thực tế cho Driver và Bus Attendant | Lấy mẫu trình bày thẻ; không lấy mock, state giả hoặc quy tắc READY của V1 |
| Bản đồ | Web có RouteGoogleMap/TripGoogleMap; Mobile khai báo react-native-maps | Web MapLibre; Mobile Leaflet/WebView và controller V2 | Giữ engine/provider V2; chỉ bố trí panel, legend và nút phủ bản đồ |
| Đăng nhập | Web hai vùng hero/form, ghi nhớ; Mobile có GoogleAuthButton | Auth/JWT/OTP theo API V2 | Chỉ đổi hình thức; Google login/remember-me mới không thuộc phạm vi nếu V2 chưa có contract tương ứng |

Không chuyển mock/demo sources, API proxy/store/auth của V1, số liệu giả, URL cũ, Google Maps integration hoặc module như báo cáo/calendar/người dùng tổng hợp chỉ vì V1 có menu. Chức năng chưa có ở V2 phải được ghi riêng để PO quyết định.

## 4. Ánh xạ nhóm màn hình

| Nhóm | Nguồn tham khảo version 1 | Đích version 2 dự kiến |
|---|---|---|
| Web đăng nhập/quên mật khẩu | `web/app/login/page.tsx`, `login.module.css`, bộ form auth | `web/src/app/login/page.tsx`, `forgot-password/page.tsx`; giữ auth-provider/auth-guard |
| Web shell | `web/components/admin/admin-dashboard.tsx`, `shared/app-header.tsx`, `app/styles/layout.css` | `web/src/app/admin/layout.tsx`, `components/admin/admin-sidebar.tsx`, `admin-header.tsx`, `admin-nav.config.ts` (trình bày thôi) |
| Tổng quan | `web/app/admin/_components/dashboard-screen.tsx`, School Admin DashboardScreen | `web/src/app/admin/page.tsx`, `components/admin/overview/overview-trips.tsx` |
| Trường/học sinh/nhân sự/xe | SchoolsScreen/SchoolsTable, SchoolAdmin StudentsScreen/StaffScreen, kiểu data-table | Các page tương ứng trong `web/src/app/admin/` và `components/admin/{schools,students,teachers,drivers,vehicles}/` |
| Tuyến/RoutePlan | `web/app/admin/routes/_components/RoutesScreen.tsx`, RouteDetail, RouteSchedules | `web/src/app/admin/routes/`, đặc biệt `plans/[id]/page.tsx`, `create/page.tsx`, `components/admin/routes/` |
| Chuyến và theo dõi | V1 TripsScreen, TripDetail, các tab route/monitoring/students | `web/src/app/admin/trips/`, `components/admin/trips/`; giữ roster/assignment/lifecycle V2 |
| Yêu cầu/báo nghỉ/sự cố/thông báo | Kiểu bảng, card, detail và bộ lọc tương ứng của V1 | `web/src/app/admin/{requests,leave-notices,incidents,notifications}/` và component V2 tương ứng |
| Mobile auth/tài khoản | `mobile/src/app/login/`, register/forgot-password, ParentAccount components | `mobile/app/(auth)/`, `(tabs)/settings.tsx`; giữ auth-context và services |
| Mobile Parent | `mobile/src/components/parent/home/`, journey/account, `src/app/(parent-tabs)/` | `mobile/app/(tabs)/{index,tracking,settings}.tsx`, `components/StudentCard.tsx`, `mobile/app/parent/` |
| Mobile Driver/Bus Attendant | Kiểu driver home/screen/primitives của V1; chưa có đối ứng Bus Attendant riêng được xác nhận trong nhóm route đã rà | `mobile/app/(tabs)/{index,schedule}.tsx`, `mobile/app/trip/[id].tsx`; giữ phân nhánh role V2 |
| Mobile nghiệp vụ chung | Kiểu card/OTP/detail/notification của V1 | `mobile/app/{leave-notices,incidents,notifications.tsx}`, các màn hình yêu cầu trong `parent/` |

Đây là danh sách dự kiến để chia đợt, không phải lệnh sửa tất cả file ngay. Trước mỗi đợt sẽ chốt danh sách file chính xác và wireframe cho màn hình liên quan.

## 5. Wireframe cấu trúc đề xuất — chưa phê duyệt

### Web shell và tổng quan

```text
+--------------------+------------------------------------------------+
| RoadToSchool       | Tiêu đề / breadcrumb      Chuông   Avatar      |
|                    +------------------------------------------------+
| Menu theo role     | Tiêu đề trang       [Trường*] [Ngày] [Làm mới] |
| Mục đang chọn vàng |                                                |
|                    | CẦN XỬ LÝ — mọi ngày, theo quyền               |
|                    | [Sự cố] [Báo nghỉ] [Yêu cầu] [Phương án]        |
|                    |                                                |
|                    | CHUYẾN TRONG NGÀY                              |
|                    | [Chờ] [Đang chạy] [Hoàn thành] [Đã hủy]        |
|                    | [Bảng chuyến cần chú ý] [Nguồn lực hiện tại]   |
+--------------------+------------------------------------------------+
* Bộ lọc trường chỉ có khi phù hợp role System Admin.
```

Card nhiệm vụ hiển thị từ dữ liệu V2; không tạo ô giả cho vai trò không có nhiệm vụ đó. Header không thêm ô tìm kiếm tổng hợp nếu chưa có hành vi/API phù hợp. Drawer trên màn nhỏ có nút đóng, focus và vùng nội dung không bị che.

### Mobile Parent home

```text
[Safe area]
[Avatar / tên tài khoản]                         [Chuông]
[Thao tác có sẵn của V2, ví dụ Báo nghỉ]

[Các con]                                      [+ Liên kết]
  [Thẻ con: avatar, tên, lớp/trường]
  [Chuyến hiện tại/hôm nay: trạng thái, giờ, Xem chuyến]
  [Thẻ con tiếp theo...]

[Trang chủ]             [Theo dõi]             [Cá nhân]
[Safe area]
```

Không có con/chuyến phải có trạng thái rỗng thật; lỗi tải có “Thử lại”, không giả thành danh sách rỗng. Header thu gọn là tùy chọn hình thức; ưu tiên phiên bản tĩnh ổn định trước, không thêm lời chào/mô tả dài chỉ để giống V1.

### Mobile chi tiết chuyến cho Driver/Bus Attendant/Parent

```text
[Quay lại] [Tuyến / chiều / trạng thái]           [Thao tác theo role]
| Bản đồ V2 hiện có; giữ nguyên instance và dữ liệu thật             |
| Chỉ dẫn / vị trí / nút theo xe theo khả năng V2                    |
+------------------------------------------------------------------+
| Bottom sheet: Thông tin | Điểm dừng | Điểm danh*                   |
| Nội dung theo quyền; boarding/alighting giữ riêng                  |
+------------------------------------------------------------------+
| CTA theo role và trạng thái; lý do disabled ngắn                    |
[Safe area]
* Không đưa quyền điểm danh cho Parent/Driver.
```

## 6. Thứ tự triển khai đề xuất sau khi được duyệt

1. **Chốt nền tảng và wireframe đợt đầu:** token, typography bằng font hiện có, spacing/radius, kiểu card/button/input/table/badge, Web shell/login và Mobile Parent home. Duyệt hình thức trước khi sửa UI.
2. **Web shell, auth và tổng quan:** dựng lại trình bày trong V2; giữ guard/provider, menu theo role, số liệu V2, filter/deep link và polling. Không đặt provider trong vùng dễ remount.
3. **Web các màn quản lý:** trường, học sinh, giáo viên, tài xế, xe, yêu cầu, báo nghỉ, sự cố, thông báo. Mỗi nhóm dùng component cùng loại, bảo toàn form draft, paging/filter và xử lý lỗi.
4. **Web RoutePlan/chuyến/map:** thực hiện sau các component nền; duyệt riêng wireframe list/detail/wizard/readiness/assignment. Không đổi thứ tự xử lý hoặc cách gửi dữ liệu.
5. **Mobile auth, ba tab và Parent:** chuyển thẻ con/chuyến, tài khoản, danh sách/chi tiết yêu cầu; bảo toàn Safe Area, keyboard, privacy và router/deep link.
6. **Mobile Driver/Bus Attendant và map:** thay thẻ/lịch/sheet/CTA từng phần; giữ hooks nghiệp vụ, QR, polling/controller/GPS/TEST Auto/Joystick. Nghiệm thu theo vai trò trước khi chuyển nhóm tiếp.

Mỗi đợt có báo cáo và điểm dừng để PO review. Không tự nối sang đợt kế tiếp. Không dự kiến sửa `api/**`, services/API client, auth/navigation business hooks, schema, migrations, `.env` hoặc package/lockfile cho chuyển giao diện. Nếu cần thay đổi ngoài trình bày, dừng phần đó và nêu cụ thể tác động để PO quyết định.

## 7. Asset và dependencies

- Chưa sao chép asset hoặc font V1. Chỉ chọn các minh họa/ảnh cụ thể sau khi PO duyệt và xác nhận phù hợp thương hiệu/quyền sử dụng; giữ placeholder V2 khi chưa chốt.
- Không đưa toàn bộ CSS global V1 vào V2 vì dễ ảnh hưởng `main`, form, table, map và layout các module khác.
- Không cài shadcn/Radix/Zustand/NativeWind/Gluestack/Lucide hoặc đổi Expo/Next/React để tái sử dụng nguyên code V1. Icon hiện có của V2 đủ làm phương án đầu tiên.
- Không mở rộng dark mode, Google login, báo cáo/biểu đồ hoặc onboarding chỉ để khớp hình thức V1.

## 8. Kiểm chứng và tiêu chí hoàn tất từng đợt

- Baseline lượt này: TypeScript `--noEmit --incremental false` **PASS cả API, Web, Mobile**. Không chạy ứng dụng V1 hoặc test ghi DB.
- Sau thay đổi UI: kiểm tra diff đúng file duyệt; typecheck project liên quan, build/lint phù hợp phạm vi; không chạy autofix làm lan sang file khác. Không viết test chỉ để chụp lại class/style.
- Web: bố cục tại 1440/1024/768/375px; keyboard/focus/label; menu theo role; modal không mất draft; bảng cuộn ngang đúng vùng; loading/error/empty tách biệt.
- Mobile: màn nhỏ/lớn, Safe Area, bàn phím, font scale, nút đủ vùng chạm; tab/deep link và back giữ nguyên; không chồng gesture giữa sheet và map.
- Kiểm tra các guard quan trọng: School Admin duyệt, Driver Start/Arrival/Complete, Bus Attendant Ready/boarding/alighting, Parent chỉ thấy con mình. Không tuyên bố đã xác minh chỉ vì giữ handler trong source.
- Polling không tăng vòng lặp, mất filter/draft hoặc remount map. Số liệu/tên trạng thái/ngữ nghĩa notification không đổi.
- UAT chỉ xem dữ liệu thật có sẵn và hành động được PO cấp quyền. Phần cần mutation hoặc dữ liệu chưa có ghi `NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY`; không seed hay tạo fixtures nghiệp vụ.
- Chưa kiểm chứng runtime, pixel fidelity, thiết bị/camera/GPS/TalkBack trong lượt lập kế hoạch này.

## 9. Điểm cần PO duyệt

Đề xuất duyệt phạm vi chuyển **lớp trình bày Web + Mobile**, giữ API/nghiệp vụ V2; xem xét sidebar navy như màu phụ; chốt wireframe đợt đầu ở mục 5. Chưa coi kế hoạch, màu phụ, asset/font hoặc bất kỳ UI implementation nào là đã được duyệt.

**Một bước tiếp theo:** PO review kế hoạch và wireframe đợt đầu; sau phản hồi mới chốt scope implementation cụ thể. Chưa commit/push.

## 10. Bổ sung: cách chuyển ảnh V1 sang V2

Theo câu hỏi tiếp theo của PO, đã kiểm kê read-only hai thư mục asset chính:

| Nguồn V1 | Số file | Định dạng | Dung lượng xấp xỉ |
|---|---:|---|---:|
| `web/public` | 26 | 7 JPG, 4 PNG, 15 SVG | 8,86 MiB |
| `mobile/assets` | 63 | 10 JPG, 15 PNG, 38 SVG | 6,10 MiB |

Các con số là số file trong hai thư mục, chưa deduplicate hoặc bao gồm ảnh trong tài liệu V1. Chưa có file ảnh nào được chuyển sang V2.

Cách làm đề xuất:

1. Lập danh sách ảnh đang được các màn hình đã duyệt sử dụng, ghi nguồn, đích và màn hình dùng ảnh. Giữ V1 chỉ đọc, dùng copy thay vì move.
2. Ví dụ Web: V1 `web/public/login-hero.png` sang V2 `web/public/images/auth/login-hero.png`. URL trong V2 là `/images/auth/login-hero.png`; dùng component ảnh phù hợp của Web V2 và khai báo kích thước/tỷ lệ.
3. Ví dụ Mobile: V1 `mobile/assets/auth/login.jpg` sang V2 `mobile/assets/images/auth/login.jpg`; dùng asset import/require tĩnh và Image hiện có. Không mang theo provider/API logic V1 để hiển thị ảnh.
4. PNG/JPG có thể sử dụng bằng thành phần ảnh hiện có. SVG Web có thể dùng như asset tĩnh. SVG Mobile phải đánh giá riêng: V1 ParentAssets dùng SvgUri từ react-native-svg, còn manifest V2 chưa khai báo dependency này. Không tự cài thư viện hoặc copy nguyên wrapper V1; cần chọn cách render được duyệt trước khi tích hợp SVG.
5. Đối chiếu checksum sau copy, tránh ghi đè file trùng tên; chỉ sửa đường dẫn tham chiếu trong UI V2 khi đợt giao diện đó được duyệt. Kiểm tra tỷ lệ/crop, độ nét và dung lượng trên màn hình thực tế.

Việc chuyển ảnh không cần thay API, database, schema hoặc migration. Lượt hỏi đáp này chỉ giải thích phương pháp và bổ sung kế hoạch, chưa phải phê duyệt sao chép hay thay UI.
