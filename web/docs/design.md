# Chuẩn thiết kế RoadToSchool Web

Đối chiếu source **02/11/2026**. Dùng cho các thay đổi tiếp theo, không xác nhận mọi màn hình
đã đồng bộ. Đọc đúng section theo [chỉ mục](README.md); đường dẫn code tính từ `web/`.

## 1. Nguồn chuẩn và token

Ưu tiên quyết định mới của PO → WORKING_RULES/nghiệp vụ → source đang chạy → tài liệu này.
Style từ repo tham chiếu chỉ được áp dụng trong phạm vi đã duyệt; không kéo theo API/luồng khác.

| Nguồn | Nơi chỉnh |
| --- | --- |
| Token màu, font toàn app | [globals.css](../src/app/globals.css), [layout.tsx](../src/app/layout.tsx) |
| Button/input/card/badge | [ui.css](../src/components/ui/ui.css) và primitive cùng thư mục |
| Shell/header/sidebar | [admin-shell.css](../src/components/admin/admin-shell.css) |
| Bảng | [table.tsx](../src/components/ui/table.tsx), [table.css](../src/components/ui/table.css) |
| Bộ lọc, tiêu đề trang | [filter-toolbar.tsx](../src/components/ui/filter-toolbar.tsx), [page-header.tsx](../src/components/ui/page-header.tsx) |
| Toast | [toast-provider.tsx](../src/components/shared/toast-provider.tsx), [toast.css](../src/components/shared/toast.css) |

Token hiện có; code mới dùng biến, không rải lại mã HEX:

| Vai trò | Token | Giá trị hiện tại |
| --- | --- | --- |
| CTA chính, tab workspace | `--brand-primary` | `#FFCB56` |
| Nền trang / nền card | `--brand-background` / `--brand-surface` | `#FFFDF6` / `#FFFFFF` |
| Chữ chính / heading / phụ | `--brand-foreground` / `--brand-heading` / `--brand-muted` | `#1E293B` / `#17243B` / `#64748B` |
| Sidebar | `--brand-navy` | `#193652` |
| Viền / viền input | `--brand-border` / `--brand-input-border` | `#E2E8F0` / `#CFDBEA` |
| Thông tin / focus | `--brand-info` / `--brand-ring` | `#2466A8` / `#B88619` |
| Nguy hiểm | `--brand-danger` và biến surface/border đi kèm | `#B42335` |

Màu đường tuyến và một số wizard đang có mã riêng đã được duyệt. Đây là ngoại lệ cục bộ,
không phải lý do đổi primary của ứng dụng. Không sửa hàng loạt CSS cũ trong task nhỏ.

## 2. Chữ, khoảng cách và mật độ

- Be Vietnam Pro, tải local trong root layout, weight 400/500/600/700; không thêm font cho từng page.
- List header chuẩn: 28px desktop / 24px mobile qua `PageHeader`; body 14px, dòng phụ 12px.
  Heading custom có scale riêng trong `ui.css`; không ép tất cả title về một kích thước.
- Tham chiếu spacing: 4/8/12/16/24/32px. Đây là quy ước, không phải token đều đã tồn tại.
- Shared button: thường 40px, size sm 32px; filter field 44px. Không tự làm mỗi màn một chiều cao.
- Control bo góc khoảng 8px, card 12px; modal/section theo mẫu canonical của module.
- Câu chữ ngắn: tên đối tượng, trạng thái, việc cần làm. Không thêm đoạn hướng dẫn dài để lấp chỗ trống.
- Ưu tiên `min-width: 0`, wrap tên/địa chỉ ở trang chi tiết; bảng được truncate có `title` hoặc đường xem đầy đủ.

## 3. Bố cục và vùng cuộn

- Giữ shell hiện tại: sidebar 250px desktop, rail 72px ở 768–1199px, drawer dưới 768px.
  Header 70px desktop / 66px mobile. Không dựng sidebar/topbar riêng trong module.
- Trang danh sách dùng `PageHeader`, class `ui-list-page`, bộ lọc và bảng nhất quán.
  Không tự thêm mô tả dưới mọi title nếu chưa được yêu cầu.
- Tabs điều hướng trang và tabs chuyển panel có thể khác hình thức: giữ mẫu canonical đúng loại,
  không đổi underline thành pill hoặc ngược lại chỉ trong một màn hình.
- Vùng flex/grid dài phải có `min-height: 0`; phần cuộn dùng `overflow-y: auto`, vùng cha có giới hạn.
  Scrollbar phải nằm ở phần cần cuộn; kiểm tra cuộn tới record cuối, không chỉ chụp phần đầu.
- Không làm card rỗng giãn đầy panel nếu tạo khoảng trắng có viền. Một panel chung không cần
  bọc thêm nhiều lớp card chỉ để phân nhóm; dùng heading và divider.
- Kiểm tra 1440 / 1024 / 390px và viewport thấp; đo kích thước thực khi dùng headless/browser zoom.
  Không cho tràn ngang toàn trang; bảng được cuộn ngang trong wrapper riêng.

## 4. Bảng, bộ lọc và thao tác

- Tái sử dụng `Table`, `Badge`, `FilterToolbar`, `FilterField`, `SchoolSelectFilter`,
  `PaginationControl`, `TableActions`. **Không có DataTable bộ mới của repo tham chiếu trong repo này.**
- Bảng chuẩn có header 42px, hàng tối thiểu 52px, padding ngang 12px; dùng `colgroup` để giữ
  cột thao tác/ngày/trạng thái ổn định và một cột nội dung co giãn. Xác minh CSS caller hiện tại.
- `Table` là table native, không tự tạo overflow wrapper. Đặt **một** wrapper scroll ngang ở caller;
  truyền `minWidth` theo nhu cầu, không bọc thêm nhiều vùng scroll cạnh tranh.
- Filter luôn có accessible label. Search co giãn nhưng không chiếm hết hàng nếu không cần;
  date/select dùng chung chiều cao và xuống dòng theo không gian.
- 1–2 thao tác tổng cộng: hiện trực tiếp; từ 3 trở lên: giữ tối đa hai thao tác thường dùng,
  phần phụ trong menu `⋯`. Không giấu một thao tác duy nhất vào menu một mục.
- Trạng thái ở cột dữ liệu; nút chỉ hành động. Caller giữ nguyên quyền/capability, URL và xác nhận.
  Không thêm nút sửa/xóa/duyệt vì mẫu thiết kế của repo khác có nút đó.
- Nhãn trạng thái trên Web dùng tiếng Việt. Phương án `DRAFT` hiển thị **Chưa duyệt**, không dùng
  Nháp/Bản nháp; `ACTIVE` là **Đang hoạt động**, `CANCELLED` là **Đã hủy**, `EXPIRED` là **Hết hạn hợp đồng**.
  Dùng `src/lib/status-labels.ts` cho nhãn phương án/chuyến/báo nghỉ; giữ nguyên enum trong API,
  query, điều kiện và data attributes. Trạng thái mới chưa nhận diện hiện **Không xác định**, không lộ mã thô.
- Xem chi tiết dùng `ContextLink`; xem hướng dẫn đầy đủ tại
  [table-actions-ui-guide.md](../../docs/architecture/table-actions-ui-guide.md).

## 5. Form, modal và phản hồi

- Dùng `Input`, `Select`, `Textarea`, `Button` hiện có; giữ native type, label/id, autocomplete,
  disabled, value/onChange và error mapping. Style không thay validation hoặc defaults.
- Chỉ một CTA primary ở cùng cấp thao tác; hủy đóng form dùng outline, hủy nghiệp vụ dùng danger
  và confirmation theo luồng hiện có. Toast không thay thế modal xác nhận.
- Form ngắn dùng modal vừa nội dung; form dài có body cuộn riêng, header/footer không bị cắt.
  Popover/menu mở bằng bàn phím, đóng Escape/bấm ngoài, quản lý focus và không bị bảng cắt mất.
- Wizard không gửi dữ liệu ở nút Tiếp tục. Giá trị, ảnh và map state được giữ khi đổi bước;
  lỗi submit mở lại đúng bước. Không thêm một bước nghiệp vụ chỉ để giống hình tham chiếu.
- Mẫu tạo trường hiện tại: `AddSchoolModal`, ba bước **Thông tin trường → Địa chỉ & vị trí →
  Hợp đồng & lịch học**. Thanh số active xanh dương là style wizard đã duyệt; CTA tạo vẫn vàng.
  Modal rộng tối đa khoảng 850px, cao theo nội dung với giới hạn 735px/viewport.
- `WeeklyScheduleBuilder layout="table"` là opt-in của modal này: cột giờ chung trên vùng rộng,
  labels riêng trên vùng hẹp; giờ từng ngày giữ độc lập. Không đổi các caller mặc định.
- Dùng toast từ `stores/toast-store` sau kết quả API thực tế. Lỗi field giữ ở form;
  không báo thành công khi chỉ đổi state cục bộ hay khi API thất bại.
- Có trạng thái loading, lỗi, rỗng, disabled rõ nghĩa; giữ dữ liệu cũ khi có lỗi chỉ khi có nhãn phù hợp.
  Không dùng màu một mình để truyền đạt ý nghĩa, icon-only cần accessible label.
- Lịch chọn ngày dùng tiếng Việt, tuần bắt đầu Thứ 2, giữ ngày âm bên dưới ngày dương.
  Trong form lịch vận hành, popup dùng native popover để không đẩy cao dialog; tự chọn vị trí
  trên/dưới ô ngày. Escape chỉ đóng popup, chọn ngày trả focus về nút lịch.

## 6. Bản đồ và phân công

- Bản đồ hành trình dùng `RouteMap` trên MapLibre/VietMap; chọn địa điểm dùng `VietMapPicker`.
  Không cài/sao chép Google Maps hoặc API địa điểm từ repo tham chiếu để làm lại cùng tác vụ.
- Tách **route visibility** (0/nhiều đường) với **inspected route** (một tuyến đang xem) và
  **assignment target** (nhóm xe đang thao tác). Chọn một trạng thái không tự sửa trạng thái khác.
- Workspace phương án đã lưu: `RouteMapVisibilityControl` nằm trên bản đồ, checkbox theo tuyến,
  tìm kiếm/chọn tất cả/bỏ chọn tất cả. Tab Phân công không có select tuyến hiển thị.
- Mỗi tuyến có màu nhất quán giữa thẻ/control và đường; chỉ tuyến đang xem có marker đánh số nổi bật.
  Không vẽ mọi tên học sinh lên map tổng thể. `Xem toàn cảnh` căn theo các tuyến đang hiện.
- Trạng thái phân công nhà xe cạnh badge vòng đời phương án, ngoài vùng cuộn; còn việc có CTA
  Phân công đưa tới nhóm thiếu. Xe/tài xế đầy đủ khác với trường đã gán giáo viên và đã duyệt.
- API và danh sách persisted/virtual vẫn quyết định những thao tác được phép; không suy luận quyền
  từ màu badge. Không nối các đoạn GPS bị ngắt hoặc thay hành trình thực bằng đường kế hoạch.

## 7. Trước khi kết thúc task

Kiểm tra shared callers, giữ nguyên nội dung/handlers khi task chỉ là style; typecheck, lint phạm vi,
diff và test cần thiết theo WORKING_RULES. Kiểm tra browser khi có dữ liệu/quyền phù hợp, ghi rõ
`NOT_VERIFIED` nếu chưa làm. Khi đổi pattern chuẩn, cập nhật đúng mục này; không thêm nhật ký mỗi lượt.
