# Kế hoạch thiết kế lại danh sách Trường học

## 1. Phạm vi và nguồn thiết kế

Áp dụng cho trang Web Admin /admin/schools. Bám wireframe v2 và preview v2 trong thư mục visualizations của phiên. Các bản ghi trong ảnh chỉ minh họa bố cục. Giữ màu, shell, component cơ bản, dữ liệu, quyền và thao tác hiện tại. Màn chi tiết, modal tạo trường và nghiệp vụ đổi trạng thái giữ theo luồng đã có.

## 2. Bố cục và bộ lọc

- Giữ tiêu đề «Trường học» và nút vàng «Thêm trường» ở góc phải. Gom tiêu đề danh sách, bộ lọc, bảng và phân trang trong một khung. Dùng chiều cao theo số dòng thực tế.
- Đặt tìm theo tên và Trạng thái ở hàng chính. Gom Tỉnh/thành và Phường/xã vào nút «Địa bàn», tái sử dụng GeographyFilter chế độ popover. Hiện số tiêu chí địa bàn đang áp dụng và tóm tắt lựa chọn. Khi đổi tỉnh, tiếp tục xóa phường cũ như hiện tại.
- Cho phép xóa riêng địa bàn và xóa toàn bộ bộ lọc. Giữ query, phân trang server-side, kích thước trang và hành vi về trang 1 khi đổi bộ lọc. Dùng meta.totalItems để hiển thị tổng theo bộ lọc, gồm kết quả ở các trang khác.
- Phân biệt đang tải, lỗi, danh sách chưa có trường và tìm/lọc không có kết quả. Trường hợp chỉ chọn tỉnh/phường cũng thuộc nhánh lọc rỗng. Hiện lỗi tải địa bàn và hành động thử lại từ component hiện có.

## 3. Bảng và cách mở hồ sơ

- Bảng rộng có sáu cột theo thứ tự «Trường học», «Địa chỉ», «Bắt đầu hợp đồng», «Kết thúc hợp đồng», «Trạng thái», «Thao tác». Dùng contractStartDate và contractEndDate hiện có, giữ định dạng dd/mm/yyyy và nhấn ngày kết thúc bằng độ đậm. Badge tiếp tục lấy isActive hiện tại.
- Giữ ảnh hoặc icon trường, tên và số nhân viên. Địa chỉ tối đa hai dòng. Chỉ đưa ward xuống dòng phụ khi có giá trị và chưa xuất hiện trong địa chỉ. Địa chỉ đầy đủ vẫn đọc được tại hồ sơ.
- Khi vùng bảng hẹp, ưu tiên dùng một cột «Hợp đồng» với hai dòng có nhãn «Bắt đầu» và «Kết thúc». Kiểm theo chiều rộng thực tế của vùng bảng, kể cả khi thu/mở sidebar. Nếu vẫn thiếu chỗ thì cuộn ngang trong vùng bảng. Giữ đúng căn cột giữa header và body ở mọi trạng thái.
- Bỏ nút «Chi tiết» trong cột Thao tác. Bấm vùng dữ liệu của dòng để mở đúng hồ sơ trường. Tên trường vẫn là ContextLink có focus rõ và mở được bằng Enter hoặc thao tác mở tab chuẩn của trình duyệt. Điều hướng từ dòng dùng cùng đường dẫn với tên trường, bảo toàn returnTo theo ContextLink. Giữ HTML bảng và chỉ có một điểm focus mở hồ sơ mỗi dòng.
- Thể hiện khả năng bấm bằng hover hoặc focus-within và tên trường có kiểu liên kết. Khi người dùng đang chọn chữ, thao tác với link hoặc bấm trong vùng nút/menu, bỏ qua điều hướng của dòng. Các thao tác này cần được kiểm để tránh điều hướng kép.

## 4. Menu thao tác

- Cột cuối chỉ hiện nút ba chấm có tên truy cập theo từng trường. Menu có «Hẹn ngừng hoạt động» nếu trường đang hoạt động và «Kích hoạt lại» nếu trường đã ngừng. Dùng SchoolStatusDialog hiện tại và giữ xác nhận, ngày hiệu lực, refresh danh sách và thông báo đã có.
- TableActions hiện dàn các thao tác ra ngoài khi tổng số không quá hai. Vì vậy chỉ truyền một mục vào more sẽ không cho giao diện trong bản vẽ. Kiểm component menu hiện có. Nếu cần, thêm tùy chọn hiển thị menu một cách tường minh, mặc định vẫn theo hành vi cũ và chỉ bật trên trang Trường học.
- Khi mở, chọn hoặc đóng menu, dòng không tự mở hồ sơ. Giữ thao tác bàn phím, Escape và trả focus về nút menu. Kiểm trường hợp menu được render qua portal và sự kiện nổi lên cây React.

## 5. File dự kiến và nghiệm thu

- File chính web/src/app/admin/schools/page.tsx. Đặt CSS hoặc phần trình bày riêng trong thư mục của route nếu cần. Chỉ chạm TableActions dùng chung nếu cần tùy chọn menu; tìm caller và bảo toàn mặc định.
- Kiểm desktop 1440 px với sidebar mở và thu gọn, thêm 1024 và 390 px. Kiểm tiêu đề cột, ngày, nội dung dài và cuộn ngang. Không để bảng kéo tràn toàn trang.
- Kiểm bấm các ô trong dòng, Tab/Enter trên tên, link mở tab, menu chuột/bàn phím và vùng chọn văn bản. Kiểm cả hai hành động trạng thái cùng dialog hiện có.
- Kiểm đổi/xóa tìm kiếm, trạng thái, tỉnh/phường, số trang, số dòng và số kết quả. Kiểm rỗng khi không có trường và khi chỉ lọc địa bàn. Kiểm bảng đủ trạng thái tải và lỗi.
- Chạy npx --no-install tsc --noEmit trong web và git diff --check. Chỉ dùng dữ liệu đã được cấp khi kiểm giao diện. Ghi NOT_VERIFIED cho tương tác chưa kiểm trên runtime.

## Prompt cho Antigravity

Prompt dưới đây ghi phạm vi v2 ban đầu đã triển khai. Lượt chỉnh sau ảnh của PO dùng mục 6 và prompt bổ sung cuối file.

> Triển khai thiết kế v2 của trang /admin/schools theo docs/ai-review/schools-list-redesign-plan.md. Đọc AGENTS.md, tài liệu nền và web/AGENTS.md. Kiểm tra git status và giữ các thay đổi đang có. Tham chiếu r2s-schools-list-v2-wireframe.svg và r2s-schools-list-v2-preview.png nếu truy cập được.
>
> Gom toolbar và bảng trong một khung. Giữ Thêm trường, tìm theo tên và Trạng thái. Dùng GeographyFilter dạng popover cho Địa bàn, giữ tóm tắt/xóa bộ lọc và phân trang server-side. Tổng kết quả lấy meta.totalItems. Phân biệt tải, lỗi, chưa có trường và lọc rỗng, kể cả khi chỉ lọc tỉnh/phường.
>
> Trên bảng rộng, tách Bắt đầu hợp đồng và Kết thúc hợp đồng thành hai cột. Vùng bảng hẹp dùng cột Hợp đồng có hai dòng ghi nhãn. Nhấn ngày kết thúc và giữ badge trạng thái riêng. Bỏ nút Chi tiết, bấm vùng dữ liệu của dòng để mở hồ sơ như ContextLink hiện có. Tên trường vẫn là link có thể Tab/Enter và dùng các thao tác mở tab gốc. Giữ returnTo. Menu ba chấm độc lập, giữ Hẹn ngừng hoạt động/Kích hoạt lại và dialog hiện tại. TableActions dàn thao tác ra ngoài khi ít mục, vì vậy cần chọn cơ chế menu dùng lại được hoặc tùy chọn tường minh riêng cho màn này mà giữ mặc định ở các nơi khác. Chặn điều hướng của dòng từ vùng menu/link và khi chọn chữ.
>
> Giữ màu, quyền, API, dữ liệu, modal và luồng nghiệp vụ. Kiểm desktop mở/thu sidebar, 1024/390 px, chuột và bàn phím, lọc/phân trang, lỗi/rỗng và menu. Chạy npx --no-install tsc --noEmit trong Web và git diff --check. Tuân thủ chỉ thị PO về script test, dữ liệu, dependencies và Git. Cập nhật báo cáo review 13 mục và diff theo quy định repo, nêu các kiểm chứng runtime còn thiếu rồi dừng.

## 6. Chỉnh bộ lọc và thêm thao tác chỉnh sửa thông tin

Phần chỉnh sửa trường trong mục 6 tiếp tục áp dụng. Đối với bộ lọc, dùng mục 7 và prompt mới nhất theo yêu cầu PO sau khi xem bản triển khai.

### Bộ lọc

Ô tìm kiếm đang flex-grow gần hết hàng. Khối địa bàn dùng flex ngang và chứa cả tên tỉnh/phường lẫn nút «Xóa», nên phần tóm tắt bị ghép vào cuối hàng controls và làm hàng thay đổi kích thước khi chọn bộ lọc. Khung mới cũng nằm ngoài `FilterToolbar`, cần kiểm các style của input và nút đang phụ thuộc selector `.ui-filter-toolbar`.

```text
Danh sách trường học   1 trường                          Xóa tất cả bộ lọc

Tìm kiếm                          Trạng thái              Địa bàn
[ Tìm theo tên trường          ]  [ Đang hoạt động    ▾ ] [ Địa bàn · 2  ▾ ]
[ TP. Hồ Chí Minh · Phường Đông Hòa      × ]
────────────────────────────────────────────────────────────────────────────
Bảng trường học
```

- Canh trái ba control, cùng chiều cao theo chuẩn bộ lọc và cùng hàng nhãn. Trên desktop, ô tìm kiếm có chiều rộng tối đa khoảng 480 px, Trạng thái khoảng 180–220 px, nút Địa bàn theo nội dung. Khi thiếu chỗ, cho xuống hàng theo chiều rộng thực của khung, kể cả lúc bật/tắt sidebar. Màn hẹp ưu tiên ô tìm kiếm toàn hàng. Giữ màu, font và khoảng cách theo token hiện hành.
- Đưa tóm tắt tỉnh/phường sang hàng riêng ngay dưới controls, chỉ hiện khi chọn địa bàn. Dùng chip tối đa theo bề rộng khung, cho xuống dòng hoặc rút gọn có cách đọc đầy đủ. Nút × xóa riêng địa bàn, có tên truy cập «Xóa bộ lọc địa bàn». «Xóa tất cả bộ lọc» ở hàng tiêu đề và chỉ hiện khi có bộ lọc. Không để chip làm dịch vị trí của nút mở popover. Cân nhắc bố trí summary xuống dòng ngay trong wrapper riêng của trang để dùng nguyên component và nguồn nhãn.
- Giữ tìm kiếm, Trạng thái, Tỉnh/thành, Phường/xã, xóa phường khi đổi tỉnh, API, debounce, bảo vệ response cũ, `meta.totalItems` và phân trang server-side. Khi đổi hoặc xóa bộ lọc, trở về trang 1. Giữ lỗi tải địa bàn, Thử lại, Escape và focus của popover. Phân biệt tải, lỗi và kết quả lọc rỗng.

### Chỉnh sửa từ menu từng trường

- Thêm «Chỉnh sửa thông tin» ở đầu menu `⋯` cho `SYSTEM_ADMIN`. Giữ mục thứ hai là «Hẹn ngừng hoạt động» hoặc «Kích hoạt lại» theo trạng thái. Dùng cấu hình `forceMenu` hiện có, giữ hành vi bấm dòng để mở hồ sơ. Chọn mục trong menu chỉ mở dialog tương ứng.
- Đề xuất mở `EditSchoolModal` ngay trên danh sách để người dùng lưu hoặc hủy rồi tiếp tục công việc tại cùng trang. Khi bấm, lấy chi tiết trường với `apiClient.getSchool(id)` vì dòng danh sách thiếu `weeklySchedule` và modal nhận `SchoolDetail`. Chỉ mở khi dữ liệu khớp trường vừa chọn. Hiện đang tải, chặn bấm lặp và bỏ phản hồi cũ khi hủy, đổi trường hoặc rời trang. Nếu lỗi tải, báo lỗi và giữ nguyên danh sách để người dùng thử lại.
- Tái sử dụng cùng modal đang dùng ở hồ sơ. Nếu cần chia sẻ giữa hai trang, chuyển modal sang `web/src/components/admin/schools/` và cập nhật cả hai caller, giữ hành vi của dialog. Bảo toàn quy tắc hẹn ngày đổi địa chỉ/lịch học, preview tác động và fingerprint, cập nhật hợp đồng, quyền, thông báo lưu thành công hoặc lưu được một phần. Sau lưu, tải lại danh sách theo bộ lọc và số trang hiện tại. Nếu chỉ lưu được một phần, dùng cảnh báo hiện có. Với thay đổi hẹn, thông báo ngày hiệu lực và tiếp tục hiển thị giá trị đang có hiệu lực.
- Các endpoint mà modal hiện gọi chỉ lưu địa chỉ/vị trí, lịch học và hợp đồng. Dù modal có ô tên và ảnh, submit hiện không lưu chúng. Với lối vào mới, hiển thị tên/ảnh dưới dạng thông tin xem hoặc ẩn phần nhập của các mục đó để tránh báo lưu sai. Đổi tên/ảnh là phạm vi riêng cần PO chốt trước khi bổ sung API.

### Nghiệm thu

1. Màn rộng và hẹp với sidebar mở/thu, có hoặc không chọn địa bàn, nhãn dài và chỉ lọc phường. Các control cân hàng, chip xuống hàng, popover và bảng dùng được bằng bàn phím, không tràn toàn trang.
2. Chọn Chỉnh sửa thông tin ở hai dòng liên tiếp và kiểm dữ liệu đúng trường. Kiểm lỗi tải, hủy, lưu, lưu một phần và giữ bộ lọc/trang. Kiểm thao tác menu không kích hoạt click dòng. Trang hồ sơ vẫn mở modal như hiện tại.
3. Kiểm quyền, nhãn thao tác theo trạng thái, hẹn ngày và thông báo. Chạy typecheck Web, `git diff --check`, ghi runtime chưa kiểm chứng. Giữ scope Web và các chỉ thị PO về dữ liệu, script test, dependency và Git.

## Prompt bổ sung cho Antigravity

> Tiếp tục trên bản danh sách Trường học v2 hiện có. Đọc AGENTS.md, web/AGENTS.md và mục 6 của docs/ai-review/schools-list-redesign-plan.md. Kiểm tra git status và giữ thay đổi đang làm. Chỉnh trang /admin/schools theo bố cục ở mục 6. Canh trái Tìm kiếm, Trạng thái và Địa bàn, đồng bộ nhãn và chiều cao. Giới hạn ô tìm kiếm khoảng 480 px trên desktop. Tách tóm tắt địa bàn có nút xóa riêng xuống dưới, giữ Xóa tất cả bộ lọc ở hàng tiêu đề. CSS giới hạn phạm vi trang, dùng token hiện có. Giữ popover, logic lọc, phân trang và các đường điều hướng v2.
>
> Thêm Chỉnh sửa thông tin trên đầu menu ⋯ cho SYSTEM_ADMIN, giữ Hẹn ngừng hoạt động/Kích hoạt lại. Tải SchoolDetail bằng getSchool(id) rồi mở lại chính EditSchoolModal trên danh sách. Nếu cần chia sẻ, chuyển component sang thư mục schools dùng chung và bảo toàn caller trang chi tiết. Xử lý tải/lỗi/phản hồi cũ, giữ menu độc lập với click dòng và tải lại theo bộ lọc/trang hiện tại sau khi lưu. Giữ ngày hiệu lực, preview, fingerprint và trạng thái lưu một phần. Chỉ cho chỉnh các mục API đang lưu được. Tên/ảnh chỉ xem tại lối vào mới. Phạm vi sửa là Web, dùng endpoint hiện có.
>
> Nghiệm thu theo mục 6, gồm màn hẹp, sidebar mở/thu, bàn phím và trường hợp có hoặc không có bộ lọc. Chạy npx --no-install tsc --noEmit trong web và git diff --check. Tuân thủ yêu cầu PO về script test, Test Data Policy, dependencies và Git. Cập nhật báo cáo 13 mục và LATEST.diff theo quy định repo rồi dừng.

## 7. Tách bộ lọc Tỉnh/thành và Phường/xã

```text
Danh sách trường học    1 trường                  Xóa tất cả bộ lọc

Tìm kiếm                  Trạng thái          Tỉnh/thành          Phường/xã
[ Tìm theo tên trường ]   [ Đang hoạt động ▾ ] [ TP. Hồ Chí Minh ▾ ] [ Phường Đông Hòa ▾ ]
```

- Hiển thị bốn ô riêng theo thứ tự **Tìm kiếm → Trạng thái → Tỉnh/thành → Phường/xã**. Tái sử dụng `GeographyFilter` ở chế độ hiển thị trực tiếp trên `/admin/schools`. Giá trị đã chọn nằm trong từng ô. Bỏ nút `Địa bàn · n` và chip tổng hợp trên trang này. Giữ nút «Xóa tất cả bộ lọc» ở hàng tiêu đề.
- Dùng nền nhẹ `--brand-hover` cho vùng bộ lọc, mặt ô `--brand-surface`, viền thực `1px solid var(--brand-input-border)`, bo góc 8 px, chiều cao 44 px và focus theo `--brand-ring`. Khung bao danh sách vẫn theo màu hiện hành. Viền phải nhìn thấy ngay khi ô chưa focus. Giữ icon tìm kiếm và mũi tên chọn, căn các ô cùng hàng. Giá trị hoặc placeholder dài được xử lý trong ô để tránh đẩy cột.
- Nguyên nhân ở source hiện tại là toolbar nằm ngoài `.ui-filter-toolbar`, nên không nhận các khai báo nền, padding và viền đầy đủ của selector cũ. `Input` và `Select` dùng chung hiện chỉ đặt màu viền, còn CSS riêng của trang chủ yếu đặt chiều cao và cỡ chữ. Dùng lại `FilterToolbar` nếu phù hợp khung hoặc bổ sung style giới hạn tại toolbar trang trường. Kiểm computed style để xác nhận `border-width`, `border-style` và `background` của cả bốn ô.
- Desktop đủ chỗ dùng bốn ô trên một hàng. Khi khung hẹp do viewport hoặc sidebar, cho xuống hai cột rồi một cột theo chiều rộng thực của vùng lọc. Giữ thứ tự Tab như thứ tự đọc. Tái sử dụng trạng thái đang tải, lỗi và Thử lại của địa bàn.
- Giữ hành vi hiện hành của `provinceId`/`wardId`. Đổi tỉnh thì xóa lựa chọn phường cũ. Vẫn cho lọc riêng theo phường khi chưa chọn tỉnh. Mỗi lần đổi hoặc xóa bộ lọc đưa danh sách về trang 1. Giữ debounce tìm kiếm, bảo vệ phản hồi cũ, số kết quả và phân trang.
- Phạm vi là bộ lọc trang danh sách. Giữ menu «Chỉnh sửa thông tin», dialog, bấm dòng mở hồ sơ và bố cục bảng hiện hành. Nếu loại bỏ prop hoặc state phục vụ chip/popover, kiểm các caller trước. Giữ chế độ popover của component dùng chung cho các màn đang dùng.

## Prompt mới nhất cho Antigravity

> Tiếp tục trên source hiện tại của `/admin/schools`. Đọc quy tắc repo và mục 7 của `docs/ai-review/schools-list-redesign-plan.md`. Mục 7 thay các chỉ dẫn về toolbar trong prompt trước. Kiểm tra git status và bảo toàn phần triển khai Chỉnh sửa thông tin đã có.
>
> Hiện trực tiếp bốn ô Tìm kiếm, Trạng thái, Tỉnh/thành và Phường/xã. Tái sử dụng `GeographyFilter` inline. Gỡ nút Địa bàn và chip của riêng trang này. Giữ Xóa tất cả bộ lọc. Làm rõ ranh giới các control bằng nền vùng lọc `--brand-hover`, nền ô `--brand-surface`, viền `1px solid var(--brand-input-border)`, góc 8 px, chiều cao 44 px và focus `--brand-ring`. Kiểm CSS thực sự áp dụng khi toolbar nằm ngoài `.ui-filter-toolbar`. Dùng style theo phạm vi trang, giữ màu hiện hành, tránh tác động các màn khác.
>
> Kiểm màn rộng, sidebar mở/thu, khung hai cột và màn hẹp một cột. Dùng chuột và bàn phím đối chiếu cả bốn ô, nhãn dài, lọc riêng phường, đổi tỉnh xóa phường cũ, xóa tất cả, tải/lỗi/Thử lại và số kết quả. Giữ query, quyền, modal, bảng và nghiệp vụ hiện có. Chạy typecheck Web và `git diff --check`. Tuân thủ chỉ thị PO về script test, dữ liệu, dependencies và Git. Cập nhật báo cáo review, ghi những gì chưa kiểm chứng và dừng.
