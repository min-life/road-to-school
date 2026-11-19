# Kế hoạch chỉnh sửa Tổng quan Web Admin

## Mục tiêu

Giúp quản trị viên đọc nhanh tình hình chuyến trong ngày, phân biệt việc đang chờ trên mọi ngày với hiện trạng nguồn lực, và đặt thao tác Đăng xuất ở một vị trí dễ tìm. Bản tham chiếu desktop là r2s-overview-wireframe.svg và r2s-overview-preview.png. Với SYSTEM_ADMIN, nút Làm mới nằm cùng vùng điều khiển trường ở đầu trang. Với SCHOOL_ADMIN, xem bố cục cập nhật ở mục 7.

## 1. Header chung

- Bỏ nút Đăng xuất trong AdminHeader cho cả hai vai trò Web Admin. Giữ thông báo, danh tính và nút mở menu trên màn hẹp.
- Giữ Đăng xuất ở cuối sidebar, rail hoặc trong drawer tùy kích thước, cùng hộp thoại xác nhận và hành vi đăng xuất hiện có.
- Kiểm các caller của AdminHeader trước khi bỏ prop onRequestLogout. Chỉ dọn CSS dành riêng cho nút header, bảo toàn các rule đang dùng chung với nút menu.

## 2. Phạm vi bộ lọc và làm mới

- SYSTEM_ADMIN có bộ lọc Trường học và nút «Làm mới tổng quan» trong thanh lọc. SCHOOL_ADMIN dùng trường của phiên đăng nhập và đặt nút ở tiêu đề trang theo mục 7.
- Đặt Ngày phục vụ trong nhóm «Chuyến theo ngày». Giữ mặc định ngày Việt Nam. Ngày chi phối số chuyến, danh sách trong ngày và điều kiện hiện chuyến ngày trước. Cột «Công việc» ghi «Tất cả ngày» để diễn đạt hàng đợi hiện tại. Nhóm «Hiện trạng» ghi phạm vi của từng số.
- Nút Làm mới dùng callback refresh hiện tại. Một lần tải GET /admin/overview cập nhật chuyến, công việc, hiện trạng và generatedAt với trường/ngày đang chọn. Giữ chu kỳ tự làm mới 20 giây lúc trang hiển thị và cơ chế loại phản hồi cũ khi đổi bộ lọc.
- Giữ thống kê chuyến theo một ngày. Thống kê lịch sử theo khoảng ngày nằm ngoài đợt này.

## 3. Thống kê và bố cục

| Nhóm | Yêu cầu |
|---|---|
| Chuyến theo ngày | Dùng bốn thẻ Chờ khởi hành, Đang chạy, Hoàn thành và Đã hủy với số và màu hiện có. Tổng lấy trips.total, ghi «N chuyến đã được tạo». Đưa trips.waitingAssignment vào nội dung thẻ Chờ khởi hành khi lớn hơn 0. Giữ liên kết lọc trạng thái, trường và đúng ngày. |
| Thanh phân bổ | Tỷ trọng của bốn trạng thái theo trips.total, cùng thứ tự và màu thẻ. Chỉ hiện khi total > 0. Nhãn và số trên thẻ truyền tải đầy đủ thông tin, thanh chỉ hỗ trợ đọc nhanh. |
| Theo dõi chuyến | Đổi tên từ «Chuyến cần chú ý». Tách attentionTrips thành «Chờ bố trí nhân sự» và «Đang chạy và sắp khởi hành» dựa trên waitingAssignment. Giữ thứ tự API trong mỗi nhóm, tối đa 8 chuyến theo response, giữ chi tiết chuyến và thông tin trường, xe, nhân sự đang có. CTA ghi «Tất cả chuyến trong ngày». |
| Chuyến ngày trước | Khi overdueRunningTrips có dữ liệu, đặt cảnh báo trước danh sách chuyến và cho xem các bản ghi API trả. Nhãn «Chuyến từ ngày trước vẫn đang chạy». Danh sách API giới hạn 5 mục, vì vậy dùng số mục đang hiển thị nếu cần ghi số. Giữ từng liên kết tới chi tiết, dùng đúng ngày gốc của chuyến. |
| Công việc | Hiện cấu hình theo role và từng count/href của API. Có thể đưa việc chặn vận hành lên trước. SYSTEM_ADMIN dùng «Thiếu tài xế chờ bố trí», «Tài xế báo nghỉ chờ bố trí», «Chuyến cần chốt hành chính», «Yêu cầu đổi địa chỉ đang chờ», «Phương án cần tối ưu lại», «Phương án nháp». SCHOOL_ADMIN dùng «Thiếu giáo viên phụ xe chờ bố trí», «Giáo viên phụ xe báo nghỉ chờ bố trí», «Yêu cầu đang chờ trường xử lý», «Phương án nháp». Giữ bộ lọc của từng link, gồm mapping overviewTaskHref cho chốt hành chính. Các nhóm có thể trùng đối tượng, hiển thị riêng từng số. |
| Hiện trạng | Dùng «Phương án đang hoạt động» cho cả hai vai trò. Với SYSTEM_ADMIN, thẻ trường hiển thị tổng «Trường đang hoạt động» ở chế độ tất cả trường và trạng thái của trường khi đã chọn một trường. Ghi «Toàn nhà xe» cho tổng phương tiện và tài xế đang hoạt động. Tổng phương tiện bao gồm xe ngừng hoạt động. Chi tiết hiển thị ở mục 6. |
| Trạng thái giao diện | Trong lúc tải dùng loading hiện có. Khi lỗi giữ thông báo lỗi và chỉ giữ snapshot đúng bộ lọc nếu logic hiện tại cho phép. Số 0 dành cho dữ liệu tải thành công. Khi danh sách rỗng, dùng «Không có chuyến để theo dõi trong ngày». Giữ mốc cập nhật theo giờ Việt Nam. |

Desktop bố trí bốn thẻ ngang, phần Theo dõi chuyến bên trái và Công việc bên phải. Khi nằm cạnh nhau, hai panel bằng chiều cao theo nội dung của panel cao hơn. Màn hẹp xếp dọc, dùng chiều cao tự nhiên, co thẻ theo các breakpoint hiện hành, cuộn ngang trong vùng bảng nếu cần. Giữ banner, logo, token màu, typography và component Web hiện có.

## 4. File dự kiến

- web/src/app/admin/page.tsx cho bố cục, scope bộ lọc, nhãn và chỉ số. Có thể tách phần trình bày riêng trong _components nếu làm mã dễ đọc.
- web/src/app/admin/_components/overview-trips.tsx cho nhóm chuyến, cảnh báo, tiêu đề và empty state.
- web/src/components/admin/admin-header.tsx và web/src/app/admin/layout.tsx cho nút đăng xuất dư.
- web/src/components/admin/admin-shell.css nếu cần dọn rule riêng của nút đã bỏ. Sửa style riêng của Tổng quan trong phạm vi trang nếu cần.

## 5. Tiêu chí nghiệm thu

1. Header hiển thị thông báo và người dùng, Đăng xuất truy cập được qua thanh điều hướng ở 1440, 1024 và 390 px.
2. Đổi ngày thay nhóm Chuyến. Công việc và Hiện trạng vẫn dùng phạm vi trường/nhà xe tương ứng. Đổi trường áp dụng đúng scope và không làm lọt số liệu của trường vừa rời.
3. Bấm Làm mới tổng quan tải lại đủ ba nhóm, giữ ngày/trường, mốc cập nhật lấy generatedAt và hiện giờ Việt Nam. Kiểm trường hợp đổi bộ lọc trong lúc request chưa xong.
4. Chuyến chờ bố trí là tập con, thanh phân bổ đúng tỷ lệ, ẩn khi tổng bằng 0. Tên công việc đúng role và mỗi link mở đúng tập dữ liệu theo contract hiện tại.
5. Khi có chuyến ngày trước, mở được từng chi tiết. Trường hợp số 0, tải và lỗi có trạng thái riêng. Trang không tràn ngang, có focus bàn phím rõ, trạng thái đọc được bằng chữ.
6. Chạy typecheck và diff check. Kiểm tra trực quan nếu có thể dùng dữ liệu được cấp. Báo NOT_VERIFIED cho các ca runtime thiếu điều kiện, dùng BLOCKED_BY_TEST_DATA_POLICY nếu cần dữ liệu chưa được phép tạo.
7. Đối chiếu yêu cầu bổ sung ở mục 6 cho hai panel ngang và thẻ trường theo bộ lọc.

## 6. Tinh chỉnh sau khi xem giao diện đã triển khai

### Theo dõi chuyến và Công việc

- Khi hai panel nằm cùng hàng, dùng chiều cao tự nhiên của panel cao hơn cho cả hai. Grid hiện đã kéo giãn các cột, nhưng khung `OverviewTrips` chỉ ôm nội dung, trong khi khung Công việc có `h-full`. Kéo giãn đến chính khung `section` của `OverviewTrips`, qua bố cục cột hoặc class dành riêng tại điểm dùng. Kiểm caller trước khi thay `OverviewTrips` để tránh ảnh hưởng nơi khác.
- Khi danh sách chuyến rỗng, căn giữa thông báo trong phần thân dưới tiêu đề. Khi có dữ liệu, các hàng chuyến bắt đầu ngay dưới tiêu đề và giữ chiều cao tự nhiên. Chiều cao lấy theo nội dung, kể cả khi có cảnh báo chuyến ngày trước hoặc nhiều chuyến hơn số đầu việc.
- Chiều cao bằng nhau chỉ căn thẳng hai mép dưới. Để hàng rỗng thực sự gọn hơn, đề xuất trình bày Công việc thành danh sách dòng dùng divider nhẹ, gom padding hiện tại của từng thẻ. Giữ đủ nhãn, số, đích liên kết, trạng thái ưu tiên và vùng bấm. Giữ chiều cao riêng của từng panel khi xếp dọc.

### Hiện trạng

| Thẻ | Tất cả trường | Đã chọn một trường |
|---|---|---|
| Phương án đang hoạt động | Tổng phương án có trạng thái đã lưu `ACTIVE` | Số `ACTIVE` của trường đã chọn. Nhãn phạm vi dùng tên trường nếu có sẵn. |
| Trường | «Trường đang hoạt động» kèm số đếm toàn nhà xe. Giữ liên kết danh sách trường. | «Trạng thái trường» kèm nhãn «Đang hoạt động» hoặc «Ngừng hoạt động» từ `inventory.schools.count` bằng 1 hoặc 0. Hiện tên trường từ `data.schoolName` và giữ liên kết chi tiết từ `item.href`. |
| Tổng phương tiện | Tổng xe, phạm vi «Toàn nhà xe» | Tổng xe, phạm vi «Toàn nhà xe» |
| Tài xế đang hoạt động | Số tài xế hoạt động, phạm vi «Toàn nhà xe» | Số tài xế hoạt động, phạm vi «Toàn nhà xe» |

Lý do chuyển thẻ trường sang trạng thái khi lọc một trường. API hỏi `isActive: true` cùng `id` duy nhất nên kết quả chỉ có 0 hoặc 1. Giá trị đó mô tả trạng thái lưu, độc lập với ngày phục vụ. Thẻ trạng thái dùng chữ và badge cho dễ nhận biết. Số `ACTIVE` của phương án cũng đọc từ trạng thái lưu. Khi chưa có response hợp lệ, giữ trạng thái tải hoặc lỗi hiện tại. `SCHOOL_ADMIN` đổi cùng nhãn phương án và tiếp tục xem các thẻ Học sinh, Học sinh chưa có tuyến và Giáo viên của trường mình.

Kiểm tra ở chế độ hai cột với danh sách rỗng, 1 chuyến và nhiều chuyến. Hai mép trên/dưới phải thẳng nhau, bảng còn cuộn ngang trong khung khi hẹp. Ở chế độ xếp dọc, hai khối có chiều cao tự nhiên. Đối chiếu Hiện trạng ở tất cả trường, một trường hoạt động, một trường ngừng hoạt động và tài khoản SCHOOL_ADMIN.

## Prompt bổ sung cho bản hiện tại

> Tiếp tục trên phần Tổng quan Web Admin đã triển khai. Dùng mục 6 của docs/ai-review/admin-overview-ui-plan.md làm yêu cầu cho lượt này. Giữ các thay đổi đang có trong working tree. Chỉ chỉnh trình bày `web/src/app/admin/page.tsx` và `web/src/app/admin/_components/overview-trips.tsx` trong phạm vi cần thiết. Ở layout hai cột, kéo giãn chính hai panel bằng chiều cao của panel cao hơn, căn giữa empty state trong thân Theo dõi chuyến và dùng dòng Công việc gọn với divider nhẹ. Khi xếp dọc dùng chiều cao tự nhiên. Đổi nhãn thành «Phương án đang hoạt động». Với SYSTEM_ADMIN, chế độ tất cả trường hiện số «Trường đang hoạt động», chế độ một trường thay số 0/1 bằng «Trạng thái trường» và giữ link chi tiết. Giữ cách đếm, quyền, màu, bộ lọc, refresh và liên kết hiện hành. Kiểm tra desktop và màn hẹp, rỗng/ít/nhiều chuyến, trường hoạt động/ngừng hoạt động và cả hai vai trò. Chạy typecheck và git diff --check. Giữ Test Data Policy, không chạy script test theo chỉ thị PO. Lưu báo cáo review và dừng.

## Prompt gốc để gửi Antigravity

> Triển khai chỉnh sửa trang Tổng quan Web Admin theo mục 1–5 của file docs/ai-review/admin-overview-ui-plan.md. Đọc AGENTS.md, các tài liệu bắt buộc theo đúng thứ tự, web/AGENTS.md và phần phù hợp trong web/docs/README.md. Kiểm tra git status ngay đầu và bảo toàn thay đổi đang có của người dùng.
>
> Dùng trang /admin hiện tại làm điểm vào. Bỏ Đăng xuất khỏi AdminHeader, giữ ở sidebar/rail/drawer và giữ LogoutDialog. Bố trí toolbar chung có Trường học cho SYSTEM_ADMIN và một nút «Làm mới tổng quan» cho cả hai role. Có đúng một nút làm mới tổng quan, gọi callback hiện tại và cập nhật mọi nhóm dữ liệu theo bộ lọc. Đặt ngày trong nhóm Chuyến theo ngày. Bố cục desktop theo phương án từ trên xuống gồm banner, toolbar, bốn thẻ chuyến kèm thanh phân bổ, Theo dõi chuyến cạnh Công việc, cuối cùng là Hiện trạng. Màn hẹp xếp dọc. Hai ảnh tham chiếu trong thư mục visualizations của phiên nếu truy cập được. File plan mô tả đủ bố cục khi không có ảnh. Vị trí Làm mới trong plan là quyết định sau ảnh.
>
> Dùng chính response AdminOverview. Giữ GET /admin/overview, params, polling/identity guard, quyền, liên kết và toàn bộ cách API đếm. Chỉ chỉnh trình bày Web và dùng lại token/component hiện có. Đặt nhãn theo bảng và theo role, bảo toàn chi tiết nhân sự và điểm truy cập hiện tại. Ngày phục vụ chỉ áp dụng phần chuyến. Báo cáo lịch sử toàn thời gian, API, DB, Mobile và dependency nằm ngoài phạm vi.
>
> Tuyệt đối không chạy script test theo chỉ thị của PO. Không tạo/seed/sửa dữ liệu để kiểm tra, không cài package, không sửa env, không tự commit hoặc push. Chạy npx --no-install tsc --noEmit trong web và git diff --check. Khi có thể, đối chiếu 1440/1024/390 px, các trạng thái tải/lỗi/rỗng, cả SYSTEM_ADMIN và SCHOOL_ADMIN. Ghi rõ những gì thực sự kiểm chứng và những gì còn NOT_VERIFIED. Cập nhật báo cáo 13 mục tại docs/ai-review/LATEST.md cùng LATEST.diff theo quy định repo, báo ngắn kết quả rồi dừng.

## 7. Thu gọn đầu trang Tổng quan của School Admin

### Bố cục theo vai trò

- SCHOOL_ADMIN: Bỏ toàn bộ FilterToolbar. Trong tiêu đề trang /admin, đặt «Tổng quan» và tên trường ở cột trái, tên trường ngay dưới tiêu đề. Đặt nút outline «Làm mới tổng quan» ở bên phải. Khi dữ liệu tải thành công, «Chuyến theo ngày» bắt đầu ngay sau tiêu đề với khoảng cách section hiện có. Wireframe: r2s-school-admin-overview-header.svg trong thư mục visualizations của phiên.
- SYSTEM_ADMIN: Giữ tiêu đề hiện tại và thanh lọc có «Trường học» cùng nút «Làm mới tổng quan». Tên trường đã chọn tiếp tục hiển thị theo logic hiện tại.
- Khi vùng nội dung hẹp, để nhóm nút xuống hàng nếu cần. Tên trường dài tự xuống dòng. Giữ nhãn nút, focus bàn phím và màu đang dùng.

### Cách triển khai

1. Chỉnh điểm render PageHeader và FilterToolbar trong web/src/app/admin/page.tsx. Gom cấu hình nút và callback refresh tại một chỗ, render đúng một nút cho mỗi vai trò khi đã xác định role. Đặt bố cục riêng trong trang Tổng quan, giữ hành vi PageHeader và FilterToolbar tại các trang khác.
2. Với SCHOOL_ADMIN, lấy tên trường từ data.schoolName của snapshot hiện tại. Khi chưa có tên, vẫn hiện tiêu đề. Nút làm mới vẫn truy cập được khi tải lỗi và tái sử dụng refresh hiện có cho cả ba nhóm dữ liệu. Giữ scope trường từ phiên, ngày đang chọn, chu kỳ tự làm mới, cơ chế bỏ phản hồi cũ và thông báo lỗi hiện có.
3. Giữ «Ngày phục vụ» trong «Chuyến theo ngày», cùng layout hai khối «Theo dõi chuyến» và «Công việc», «Hiện trạng» và mốc cập nhật. Phạm vi triển khai là cách bố trí đầu trang Web.

### Nghiệm thu

- SCHOOL_ADMIN có tên trường dưới tiêu đề khi có dữ liệu và một nút Làm mới ở đầu trang. Khi tải thành công, «Chuyến theo ngày» xuất hiện ngay bên dưới, không còn card trống.
- Khi bấm Làm mới, trang giữ ngày đang chọn và tải lại dữ liệu Tổng quan trong scope trường hiện hành. Kiểm lúc tải chậm, lỗi và khi đổi ngày trong lúc request trước chưa hoàn tất. Mốc cập nhật đổi theo generatedAt của lần tải thành công.
- SYSTEM_ADMIN tiếp tục lọc tất cả trường hoặc một trường, có đúng một nút trong thanh lọc và giữ trường/ngày đang xem khi làm mới.
- Đối chiếu 1440, 1024 và 390 px, tên trường dài, sidebar mở và thu gọn. Không tràn ngang, nút thao tác được bằng bàn phím.
- Chạy typecheck Web bằng npx --no-install tsc --noEmit và git diff --check. Ghi rõ các ca runtime chưa xác minh. Tuân thủ Test Data Policy và chỉ thị của PO về script test.

### Prompt cho Antigravity — đầu trang School Admin

> Sau khi PO duyệt wireframe, triển khai riêng mục 7 trong docs/ai-review/admin-overview-ui-plan.md. Đọc AGENTS.md và web/AGENTS.md, kiểm tra git status và bảo toàn các thay đổi đang có. Dùng wireframe r2s-school-admin-overview-header.svg làm tham chiếu nếu truy cập được.
>
> Ở /admin, với SCHOOL_ADMIN bỏ FilterToolbar. Xếp tiêu đề «Tổng quan» và tên trường từ response hiện có thành một nhóm bên trái, đưa nút outline «Làm mới tổng quan» sang phải và đặt «Chuyến theo ngày» ngay dưới tiêu đề khi tải thành công. Trên màn hẹp cho tên trường và nút xuống dòng khi cần. Dùng component, token màu và focus hiện có. Với SYSTEM_ADMIN giữ thanh lọc «Trường học» và nút làm mới ở vị trí hiện tại. Mỗi vai trò có đúng một nút.
>
> Tái sử dụng callback refresh, giữ scope, ngày đang chọn, polling, identity guard, mốc cập nhật và các trạng thái tải/lỗi. Nút vẫn dùng được khi tải lỗi. Giữ ngày trong «Chuyến theo ngày». Giới hạn chỉnh sửa ở phần trình bày đầu trang Web.
>
> Nghiệm thu cả hai vai trò theo mục 7. Chạy typecheck Web và git diff --check. Thực hiện kiểm tra runtime bằng dữ liệu sẵn có nếu được. Tuân thủ Test Data Policy và chỉ thị PO về script test, dependency, env và Git. Cập nhật báo cáo 13 mục và LATEST.diff theo quy định repo, ghi rõ phần chưa xác minh rồi dừng.
