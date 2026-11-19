# Thiết kế lại trang Thiết bị IoT

Ngày 18/11/2026. Đề xuất để PO duyệt thiết kế. Chưa triển khai vào ứng dụng.

## 1. Phạm vi và cơ sở rà soát

Đã đọc toàn bộ route `/admin/iot`, các panel USB, Wi-Fi, lịch sử quét, danh sách thiết bị, nhật ký USB, các hook, giao thức serial và client API. Đối chiếu DTO/backend về phân trang, dữ liệu lịch sử và trạng thái liên lạc. Phân tích bao gồm những phần nằm dưới ảnh PO gửi và nội dung đang thu gọn. Chưa mở phiên USB hoặc gọi API ghi dữ liệu.

Nguồn chính gồm `web/src/app/admin/iot/_components/`, `web/src/lib/iot-api.ts`, `api/src/iot/devices/`, `api/src/iot/scans/`, `api/src/iot/dto/`, `web/docs/iot-device-console.md`, `web/docs/design.md` và `web/src/app/globals.css`.

Áp dụng checklist skill `ui-ux-pro-max` về phản hồi tác vụ, focus và tương phản. Đọc dataset trực tiếp do lệnh Python trên máy hiện trỏ tới Windows Store alias. Dùng thư viện Sharp đã có trong Web để render thiết kế SVG sang PNG. Không cài dependency.

## 2. Các điểm cần cải thiện

| Khu vực | Hiện trạng được quan sát hoặc xác nhận từ source | Hướng thiết kế |
| --- | --- | --- |
| Thứ bậc trang | USB và Wi-Fi chiếm phần lớn màn hình đầu, lịch sử nằm sâu bên dưới | Trang chính có hai tab Thiết bị và Lịch sử quét thẻ. Thiết lập USB mở panel riêng |
| Danh sách thiết bị | Nằm trong details dưới lịch sử, chỉ nạp 100 bản ghi đầu | Đưa thành tab mặc định, phân trang theo `total` của API |
| Định danh | Chip, MAC, deviceId trống vẫn chiếm một khối lớn | Trước kết nối chỉ có CTA và yêu cầu kết nối. Metadata xuất hiện khi đã đọc được |
| USB và firmware | Chip đã nhận diện khiến badge USB tích cực dù ứng dụng firmware có thể chưa phản hồi | Thể hiện bước nhận cổng, đọc firmware và nhận ACK cấu hình riêng |
| Các nút kết nối | Kết nối thiết bị và Kết nối để nạp nằm cùng khối, dễ chọn sai luồng | CTA chính Kết nối USB trong panel thiết lập. Luồng firmware có điểm vào riêng |
| Trạng thái sẵn sàng | USB báo sẵn sàng khi provisioned nhưng Wi-Fi và liên lạc máy chủ chưa được chứng minh | Mỗi điều kiện có trạng thái độc lập, gắn đúng nguồn dữ liệu |
| Wi-Fi sau mở phiên | Chưa kiểm tra Wi-Fi hoặc Chưa cấu hình dễ bị hiểu là thiết bị đã mất cấu hình | Khi thiếu xác nhận hiện tại dùng Chưa xác minh trong phiên này |
| Wi-Fi trước kết nối | Cả form bị disable và giảm opacity, vẫn chiếm nhiều diện tích | Chỉ hiện yêu cầu hoàn tất bước USB trước, mở form khi có điều kiện |
| Form và select | Một số select giống văn bản trên nền trắng, vùng nhập thiếu điểm nhận biết | Input/select có nền trắng, viền input token, chiều cao 44px, label ngoài ô |
| Mạng Wi-Fi | Nhập thủ công nằm ở cuối dropdown, người dùng khó phát hiện | Link Nhập tên mạng cạnh dropdown, phân biệt đang quét, rỗng, lỗi và firmware chưa hỗ trợ |
| Mật khẩu | Nút kết nối chưa phản ánh đủ tính hợp lệ của form trước thao tác | Lỗi ở field, giữ validation hiện có. Chỉ cho gửi khi điều kiện đã đủ, giữ show/hide và xóa ô mật khẩu sau thành công |
| Lỗi thao tác | Một banner chung phía đầu trang cho nhiều giai đoạn | Lỗi nằm tại bước tương ứng và có hành động thử lại phù hợp |
| Lỗi cấu hình máy chủ | UI có thể hiện nguyên tên biến môi trường | Thông báo ngắn cho người dùng. Chi tiết cấu hình chỉ mở theo yêu cầu trong vùng kỹ thuật |
| Ghi đè API nâng cao | Luồng hiện tại gọi provision trước khi dùng URL override, backend vẫn kiểm tra URL mặc định | Thông báo cấu hình máy chủ sai phải nêu đúng việc cần xử lý. Không hứa rằng nhập URL trên Web sẽ vượt qua lỗi này |
| Firmware | Ba nút cùng lúc, confirm của trình duyệt, phải tự hiểu trình tự, phần trăm 100 chưa khẳng định firmware chạy | Dialog riêng, nêu thiết bị đích, xác nhận trước ghi, tiến độ, sau đó Chạy và kiểm tra |
| Trạng thái luồng Web | Trực tiếp có thể bị hiểu là ESP32 đang online | Nhãn Đang nhận sự kiện, Đang nối lại, Tự cập nhật định kỳ, Tạm dừng cập nhật |
| Bộ lọc lịch sử | Nhập deviceId tự do dễ sai. Xe và nút Lọc không đồng bộ bố cục | Dropdown tìm thiết bị có thể nhập mã đầy đủ. Filter Xe riêng, nút Lọc và Xóa bộ lọc |
| Dữ liệu thiết bị của filter | Hook chỉ lấy 100 thiết bị đầu | Phân trang hoặc tải thêm kết quả bằng API hiện có, cho nhập deviceId đầy đủ và khôi phục lựa chọn ngoài trang đang nạp |
| Phụ thuộc tải dữ liệu | Lịch sử, thiết bị và xe dùng chung Promise.all, một nhánh lỗi xóa cả bảng | Tách phản hồi lỗi theo khu vực và khả năng dùng dữ liệu còn hợp lệ, xử lý mất quyền theo auth hiện có |
| Lịch sử xe | Nhãn Xe (snapshot) và fallback POC hoặc UUID mang tính triển khai | Nhãn Xe lúc quét, dùng biển số lịch sử, thiếu thì Chưa xác định xe |
| Ý nghĩa lượt quét | Endpoint hiện loại purpose ATTENDANCE. Response không có học sinh hoặc kết quả điểm danh | Có đường dẫn sang Chuyến xe để xem điểm danh. Bảng chỉ dùng dữ liệu lịch sử quét thực có |
| Thời gian | Một chuỗi locale dài khó quét mắt | Giờ HH:mm:ss ở dòng chính, ngày ở dòng phụ, ghi rõ giờ Việt Nam |
| Thứ tự lịch sử | Backend sort theo createdAt và _id, bảng hiển thị scannedAt | Ghi rõ Mới nhận trước. Giữ thứ tự backend, không tự sort riêng một trang theo giờ quét |
| Tự cập nhật | Refresh có thể thay nội dung người dùng đang đọc, badge chưa nêu phạm vi | Toggle áp dụng cho lịch sử, giữ filter/page/scroll. Phân biệt nhận sự kiện và tải định kỳ. Nếu cần, hiện Có lượt quét mới để người dùng chủ động cập nhật |
| Nhật ký USB | Có thể bị hiểu là audit được lưu lâu dài | Nhãn Nhật ký phiên USB, collapsed mặc định, tối đa dữ liệu phiên hiện có. Xóa hiển thị có phạm vi rõ |
| Vùng cuộn | Bảng, danh sách thiết bị và log đều có max-height riêng trong trang dài | Trang dùng cuộn dọc tự nhiên. Bảng có vùng cuộn ngang riêng, panel thiết lập có body cuộn |
| Gán xe | Người dùng có thể tìm thao tác gán ngay trong IoT | Đường dẫn sang Phương tiện, giữ thao tác gán/tháo ở hồ sơ xe |

## 3. Cấu trúc trang được đề xuất

### Tab Thiết bị

Mặc định khi mở trang. Đưa danh sách hiện có lên thành nội dung chính với các cột sau.

- Thiết bị, dùng name và deviceId, chipModel ở thông tin phụ phù hợp.
- Liên lạc máy chủ, dùng status do backend trả và lastSeenAt.
- Xe được gán, dùng assignment hiện tại và link hồ sơ xe nếu có quyền.
- Cấu hình xe, dùng configurationStatus, có các nhãn Chưa phân công, Chờ xác nhận và Đã nhận phân công.
- Firmware, là phiên bản được máy chủ ghi nhận.
- Xem lượt quét, chuyển sang tab lịch sử và áp dụng deviceId tương ứng.

Có bộ lọc mã thiết bị đầy đủ theo contract hiện tại, Làm mới danh sách và phân trang. Thiết kế hiển thị 20 dòng mỗi trang có thể dùng `GET /iot/devices?page=&limit=20`. Client hiện đang cố định limit 100 cần chỉnh tham số khi triển khai. Không thêm biểu đồ hoặc tổng online lấy từ một trang dữ liệu.

Một thiết bị có thể vừa Có liên lạc vừa Chờ xác nhận phân công. Hai trạng thái dùng hai cột để người dùng nhận ra việc cần xử lý. `ONLINE` hiện có nghĩa nhận scan/heartbeat hợp lệ trong 60 giây. Chưa có liên lạc không khẳng định nguyên nhân Wi-Fi, USB hay nguồn điện.

### Tab Lịch sử quét thẻ

Toolbar gồm Thiết bị, Xe, Lọc, Xóa bộ lọc khi có điều kiện, Tự cập nhật và Làm mới lịch sử. Các thao tác cập nhật chỉ nhắm tới tab này.

Các cột gồm Thời gian quét, Xe lúc quét, Mã thẻ (UID), Loại thẻ, Thiết bị. Mã thẻ dùng font mono và có nút sao chép với phản hồi ngắn. Biển số dùng `vehicleLicensePlateSnapshot` đã lưu tại lượt quét. Thiếu biển số hiện Chưa xác định xe, có thể mở thông tin kỹ thuật nếu chỉ có vehicleId.

Giữ phân trang 20 dòng. Bộ lọc theo thiết bị chọn được phải có khả năng đọc qua các trang registry, không giới hạn âm thầm ở 100 mục. Search ở dropdown chỉ tìm trong các trang đã nạp phải được ghi rõ, có Tải thêm và ô nhập mã đầy đủ. Muốn search theo tên toàn bộ thiết bị cần contract backend riêng để PO duyệt.

Chưa đề xuất thêm lọc ngày, export, trạng thái điểm danh hoặc tìm học sinh vào thiết kế này vì client/response hiện tại chưa có contract tương ứng. `cardUid` đã có ở DTO backend, có thể chốt thêm ô lọc mã thẻ sau nếu cần.

### Thiết lập qua USB

Nút trên header mở panel bên phải, đề xuất rộng khoảng 680px, tối đa chiều rộng viewport. Các bước hiển thị theo trạng thái thực, không thêm nút Tiếp tục chỉ để đi qua bước tự động.

1. USB. Một CTA Kết nối USB. Nhận diện chip/MAC, đọc firmware và định danh thực tế. Chưa có kết nối thì hiển thị yêu cầu ngắn. Có liên kết Hướng dẫn kết nối cho Chrome/Edge, driver CP210x và cáp dữ liệu.
2. Cấp cấu hình. Tự thực hiện theo luồng hiện có. Hoàn tất khi nhận ACK đúng thiết bị. Lỗi giữ ở bước này, có Thiết lập lại. Thông tin chip đã đọc có thể giữ dạng dữ liệu lần đọc trước, nhãn kết nối phải phản ánh phiên thật.
3. Wi-Fi. Mạng quét được với tín hiệu, nhập SSID thủ công, mật khẩu, hiện/ẩn và Kết nối Wi-Fi. Thành công sau ACK đúng SSID và IP theo contract hiện tại. Hiện thời điểm xác nhận để tránh ngầm khẳng định liên tục online.

Thông tin chip, MAC đầy đủ, baud rate và endpoint nằm trong Thông tin kỹ thuật hoặc Cài đặt nâng cao. Tùy chọn lưu Wi-Fi trên máy chủ vẫn tắt mặc định, nhãn gọn, giải thích nơi lưu qua tooltip. Không hiện deviceKey hoặc mật khẩu trong log.

Ngắt USB là hành động riêng. Đóng panel trong lúc rảnh giữ phiên USB tại cấp dashboard và cho mở lại để tiếp tục. Hook USB phải sống bên ngoài các panel/tab conditional. Rời route thực hiện cleanup như hiện tại. Khi đã có phiên, điểm vào có thể dùng nhãn Tiếp tục thiết lập USB. Khi đang ghi firmware, khóa thao tác đóng trong ứng dụng và giữ cảnh báo rời trang.

## 4. Luồng firmware

Điểm vào Cập nhật firmware trong panel thiết lập. Có đường vào cả lúc chưa đọc được INFO, để xử lý firmware trống hoặc chưa tương thích.

1. Chuyển sang chế độ nạp bằng hành động người dùng. Nếu đang mở console, giải phóng cổng rồi yêu cầu người dùng chọn lại để bảo toàn yêu cầu click gesture của Web Serial.
2. Hiện thiết bị đích và cảnh báo cấu hình có thể bị thay thế. Xác nhận trước khi ghi.
3. Tải binary từ endpoint hiện có, hiển thị tiến độ nạp và giai đoạn kiểm tra.
4. 100% mang nghĩa đã ghi và kiểm tra dữ liệu. CTA Chạy và kiểm tra gọi luồng openConsole hiện có.
5. Thành công khi firmware trả INFO hợp lệ. Tiếp tục cấp cấu hình và Wi-Fi theo capability thực tế.

API hiện chỉ trả binary, chưa trả manifest/version đích. Dialog dùng Firmware do máy chủ cung cấp, không hiển thị phiên bản đích suy đoán hoặc thông báo Có bản cập nhật mới. Xử lý tách lỗi tải binary, nhận chip, ghi firmware và chạy ứng dụng.

Dialog firmware thay phần nội dung panel hoặc mở sau khi đóng panel, tránh hai modal đang hoạt động cùng lúc. Trong preview, màn ghi firmware chỉ minh họa trạng thái đang nạp.

## 5. Trạng thái và thông báo

| Tình huống | Nội dung hiển thị | Hành động |
| --- | --- | --- |
| Chưa cắm hoặc chưa chọn USB | Kết nối ESP32 qua USB để thiết lập | Kết nối USB |
| Trình duyệt chưa hỗ trợ | Mở bằng Chrome hoặc Edge trên máy tính | Xem hướng dẫn |
| Người dùng hủy trình chọn cổng | Giữ trạng thái trước thao tác | Cho chọn lại |
| Bootloader nhận chip, INFO timeout | Đã nhận ESP32, firmware chưa phản hồi | Kết nối lại hoặc Cập nhật firmware |
| Provision thất bại | Thiết lập chưa hoàn tất, kèm nguyên nhân được ánh xạ | Thiết lập lại |
| URL máy chủ sai | Máy chủ chưa cấu hình địa chỉ cho thiết bị | Mở chi tiết cấu hình, thử lại sau khi vận hành xử lý |
| Đang quét Wi-Fi | Đang tìm mạng Wi-Fi | Chờ kết quả, khóa lệnh xung đột |
| Không tìm thấy mạng | Không tìm thấy mạng phù hợp | Quét lại hoặc Nhập tên mạng |
| Mạng mở/bảo mật chưa hỗ trợ | Nhãn Không hỗ trợ trong danh sách | Giữ điều kiện chặn hiện tại |
| Firmware chưa hỗ trợ quét | Nhập tên mạng để kết nối | Nhập SSID hoặc Cập nhật firmware |
| Wi-Fi nhận ACK thành công | Đã xác nhận kết nối, SSID, IP và thời điểm | Đổi mạng khi cần |
| Chưa có heartbeat hợp lệ | Chưa ghi nhận liên lạc với máy chủ | Kiểm tra cấu hình khi cần, không khẳng định nguyên nhân |
| Mất USB | USB đã ngắt | Kết nối lại, trạng thái máy chủ theo lastSeenAt |
| Bảng chưa có dữ liệu | Chưa có lượt quét thẻ | Làm mới khi cần |
| Filter không có kết quả | Không có lượt quét phù hợp | Xóa bộ lọc |
| API lỗi | Không tải được lịch sử | Thử lại tại bảng |
| Socket mất kết nối, polling còn hoạt động | Tự cập nhật định kỳ | Làm mới thủ công vẫn hoạt động |
| Tắt tự cập nhật | Tạm dừng cập nhật lịch sử | Bật lại hoặc Làm mới |
| Ghi firmware hoàn tất | Đã nạp, chờ chạy kiểm tra | Chạy và kiểm tra |

Màu đi kèm nhãn và icon. Vàng dùng CTA và tác vụ chờ, xanh lá cho xác nhận thành công, xanh navy cho cấu trúc, đỏ cho lỗi. Cấu hình nâng cao chưa có dữ liệu chỉ hiện Chưa xác định. Lỗi xác thực tiếp tục dùng xử lý auth hiện có, không giữ dữ liệu của phiên đã mất quyền.

## 6. Responsive và accessibility

- Desktop giữ shell hiện có, khoảng cách 16–24px, card 12px, controls 40–44px. Font Be Vietnam Pro, màu từ token hiện hành.
- Dưới khoảng 1024px toolbar xuống hàng theo nhóm, panel thiết lập co theo viewport.
- Mobile hẹp dùng panel toàn chiều rộng, body cuộn, header/footer rõ ràng. Bảng chỉ cuộn ngang trong wrapper riêng.
- Modal focus trap, focus quay lại điểm mở, Escape đóng vùng trên cùng khi không ghi firmware. Tablist có roles, selected state, keyboard navigation và focus ring.
- Tác vụ không có tiến độ đo được dùng spinner và tên giai đoạn. Chỉ nạp firmware dùng phần trăm thực.
- Announce kết quả tác vụ và lỗi, hạn chế đọc lại toàn bộ bảng khi có sự kiện mới. Nội dung không phụ thuộc hover.

Tham chiếu hành vi bàn phím cho tabs và dialog từ [WAI Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) và [WAI Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## 7. Artifacts

- [Wireframe SVG](designs/iot/iot-wireframe.svg) và [PNG](designs/iot/iot-wireframe.png).
- [Thiết bị SVG](designs/iot/iot-devices-preview.svg) và [PNG](designs/iot/iot-devices-preview.png).
- [Lịch sử SVG](designs/iot/iot-history-preview.svg) và [PNG](designs/iot/iot-history-preview.png).
- [Thiết lập USB SVG](designs/iot/iot-usb-setup-preview.svg) và [PNG](designs/iot/iot-usb-setup-preview.png).
- [Firmware SVG](designs/iot/iot-firmware-preview.svg) và [PNG](designs/iot/iot-firmware-preview.png).

Preview dùng dữ liệu minh họa được vẽ trực tiếp vào artifact. Không tạo bản ghi, fixture hoặc API response giả trong ứng dụng. Bản desktop là minh họa bố cục, các state khác và responsive được mô tả trong tài liệu, chưa được kiểm chứng trên UI triển khai. Nút phân trang và trạng thái trong ảnh là tĩnh.

## 8. Ranh giới triển khai và duyệt

Đề xuất chính cần PO duyệt gồm tab Thiết bị mặc định, panel thiết lập USB, dialog firmware riêng và cách đóng panel giữ phiên USB lúc rảnh. Các thay đổi này tác động bố cục và trạng thái tương tác frontend.

Danh sách, lịch sử, phân trang, lastSeenAt, assignment và configurationStatus đã có API. Khi triển khai cần giữ quyền SYSTEM_ADMIN, endpoint/body/validation hiện hành, contract cấp cấu hình, điều kiện firmware và quy tắc gán xe. Một số cải thiện UI cần điều chỉnh hook và client để phân trang registry, lưu trạng thái phiên, ánh xạ lỗi và tải độc lập. Không cần tự thêm model hoặc field backend để thể hiện bản thiết kế này.

Địa chỉ API động/mDNS là đề xuất kỹ thuật riêng đang trao đổi, chưa nằm trong thiết kế này. Kiểm chứng bản thiết kế gồm đọc source, render và quan sát các artifact. UI triển khai, USB, Wi-Fi và dữ liệu thật vẫn cần nghiệm thu sau khi PO duyệt triển khai.

## 9. Kế hoạch triển khai

PO yêu cầu lập plan và prompt sau bản thiết kế. Phần này mô tả công việc dành cho bước triển khai tiếp theo.

### Bước 1 — Chuẩn bị và xác minh caller

- Đọc tài liệu bắt buộc ở root, quy tắc Web và Next.js guide cục bộ liên quan trước khi viết code.
- Kiểm tra Git, giữ các thay đổi local hiện có.
- Dùng bộ SVG/PNG ở mục 7 làm tham chiếu bố cục. Dùng font, token và shared components hiện tại khi triển khai.
- Tìm caller của client dùng chung trước khi mở rộng tham số. Hiện `iotApi.devices(page)` được dùng cả trong `use-rfid-enrollment.ts` và `use-vehicle-iot.ts`.

### Bước 2 — Khung hai tab và danh sách thiết bị

- Mặc định tab Thiết bị. Giữ trạng thái filter/page của mỗi tab khi chuyển qua lại.
- Dùng endpoint thiết bị hiện tại để phân trang 20 dòng, `total` lấy từ response.
- Mở rộng hàm client bằng tham số tùy chọn, bảo toàn mặc định limit 100 cho các caller đang dùng `devices()` và `devices(page)`.
- Filter mã đầy đủ gửi `deviceId` theo contract hiện có. Không mô tả là search tên gần đúng.
- Hiển thị name/deviceId, liên lạc/lastSeenAt, xe, configurationStatus, firmwareVersion. Xử lý metadata nullable và enum lạ bằng nhãn Chưa xác định.
- Nút Xem lượt quét chuyển tab và áp dụng deviceId, đưa page lịch sử về 1. Link xe mở hồ sơ xe theo route/context-link đang dùng.

### Bước 3 — Panel thiết lập USB và vòng đời phiên

- Giữ `useEsp32` ở cấp dashboard, ngoài conditional mount của tab/panel/dialog.
- Đóng panel lúc rảnh và đổi tab giữ phiên. Ngắt USB chủ động hoặc rời route cleanup đúng tài nguyên.
- Kết nối vẫn phải xuất phát từ click của người dùng. Không tự xin quyền cổng lúc mở trang/panel.
- Tách stage, lỗi, loading và kết quả đã xác minh cho nhận chip, INFO, CONFIG_DEVICE và Wi-Fi.
- Dữ liệu chip giữ để chẩn đoán sau lỗi phải có nhãn lần đọc trước. Trạng thái kết nối thật lấy từ session hiện tại.
- Stepper chỉ phản ánh tiến trình, thao tác tự động tiếp diễn theo luồng hiện có.

### Bước 4 — Wi-Fi và cấu hình nâng cao

- Hiện form khi đủ điều kiện. Giữ SSID UTF-8 tối đa 32 byte và mật khẩu theo validator hiện tại, trình bày lỗi tại field.
- Tách lựa chọn mạng với link nhập SSID thủ công. Giữ chặn mạng chưa được firmware hỗ trợ.
- Giữ ACK, requestId và timeout hiện có. Đổi trạng thái thành công sau xác nhận đúng thiết bị, SSID và IP.
- Khi đổi mạng hoặc thành công, xử lý xóa mật khẩu theo luồng hiện tại. Đóng panel phải dọn các giá trị nhạy cảm trong form hoặc bảo đảm chúng không được persist.
- Nâng cao giữ URL override và tùy chọn lưu Wi-Fi hiện có, giá trị mặc định tắt. Lỗi URL của máy chủ phải có thông báo đúng nguyên nhân.
- Nhật ký phiên USB thu gọn, log an toàn và có nút xóa hiển thị.

### Bước 5 — Dialog firmware

- Thay `window.confirm` bằng xác nhận trong dialog, giữ một lần xác nhận rõ trước thao tác ghi.
- Cho mở luồng nạp cả khi firmware chưa trả INFO.
- Giữ kết nối bootloader và yêu cầu chọn lại cổng bằng click khi chuyển từ console.
- Giữ validate merged image, giới hạn chip/kích thước, địa chỉ nạp và kiểm tra MD5.
- Hiển thị trạng thái kết nối, tải binary, ghi, kiểm tra và chờ chạy. Không suy đoán phiên bản đích.
- Sau ghi xong hiện Chạy và kiểm tra. Chỉ hoàn tất bước chạy sau INFO hợp lệ.
- Khi đang ghi, khóa đóng trong ứng dụng và giữ beforeunload warning. Không hứa ngăn được rút nguồn hoặc đóng trình duyệt cưỡng bức.

### Bước 6 — Lịch sử và cập nhật dữ liệu

- Tách trạng thái tải/error của scans, thiết bị và xe. Tránh xóa bảng lịch sử chỉ do dropdown lỗi.
- Giữ auth và xử lý mất quyền qua client hiện hành. Dữ liệu cũ chỉ được giữ trong cùng quyền/phạm vi với nhãn tải lỗi rõ.
- Filter Thiết bị có load-more/phân trang và nhập mã đầy đủ, giữ selected value ngoài tập options đang nạp. Không giới hạn âm thầm ở 100.
- Lọc và Xóa bộ lọc đưa page về 1. Refresh giữ filter/page/scroll.
- Dùng biển số snapshot, định dạng giờ Việt Nam, UID copy và thứ tự Mới nhận trước theo API.
- Giữ realtime reload từ server, dedup/cancel stale response và polling visible 15 giây. Nhãn trạng thái phản ánh Web và polling thực tế.
- Chuyển filter hoặc refresh không tạo nhiều socket/subscription đồng thời. Tắt tự cập nhật dừng cập nhật nền, các thao tác Lọc/Làm mới chủ động vẫn hoạt động.
- Phân trang giữ 20 dòng, xử lý total bằng 0 và page vượt totalPages, tắt đúng nút đầu/cuối. Không áp sort riêng trên một trang.

### Bước 7 — Responsive, kiểm chứng và bàn giao

- Kiểm tra bố cục ở 1440, 1024, 390px và viewport thấp. Kiểm tra tabs, focus, dialog, Escape, vùng cuộn và controls không bị cắt.
- Chạy typecheck an toàn từ Web bằng `npx.cmd --no-install tsc --noEmit --pretty false`, lint đúng file và `git diff --check`.
- Tuân thủ yêu cầu của PO không chạy script test. Không tự mở serial, nạp firmware, cấp cấu hình, ghi Wi-Fi hoặc tạo scan để nghiệm thu.
- Dùng dữ liệu hiện hữu và GET an toàn khi có điều kiện. Tác vụ ghi thật cần PO cấp quyền cụ thể. Ghi NOT_VERIFIED rõ cho phần chưa được chạy.
- Cập nhật `web/docs/iot-device-console.md`, chỉ mục kiến trúc nếu đổi owner/component và báo cáo 13 mục theo root.

### File dự kiến

| Nhóm | File |
| --- | --- |
| Điều phối trang và style | `web/src/app/admin/iot/_components/iot-dashboard.tsx`, `iot.css` |
| USB và Wi-Fi | `usb-panel.tsx`, `wifi-panel.tsx`, `use-esp32.ts` |
| Lịch sử | `scan-panel.tsx`, `use-iot-feed.ts` |
| API client dùng chung | `web/src/lib/iot-api.ts` |
| Component mới theo nhu cầu | `device-panel.tsx`, `usb-setup-dialog.tsx`, `firmware-dialog.tsx`, hook registry nếu thực sự cần |
| Tài liệu | `web/docs/iot-device-console.md`, `web/docs/web-architecture.md` khi đổi owner và `docs/ai-review/LATEST.md`, `LATEST.diff` |

Giữ `esp32-session.ts` và `iot-protocol.ts` làm nơi thực hiện giao thức. Chỉ sửa tối thiểu nếu cần để biểu diễn đúng stage/cleanup, không thay contract serial hoặc nới validation.

### Điều kiện nghiệm thu

1. Hai tab, panel USB và dialog firmware khớp thiết kế và dùng được trên màn hình hẹp.
2. Đóng panel/đổi tab lúc rảnh giữ phiên USB, Ngắt USB hoặc rời route giải phóng cổng, reader và listener.
3. USB, INFO, ACK, Wi-Fi, lastSeenAt và socket có trạng thái đúng nguồn.
4. Registry vượt 100 thiết bị vẫn xem và chọn được qua phân trang. Caller cấp thẻ/gán xe dùng client cũ còn giữ hành vi.
5. History lọc đúng deviceId/vehicleId, giữ snapshot xe và thứ tự server, không thêm kết quả điểm danh suy đoán.
6. Lỗi cấp cấu hình, firmware chưa hỗ trợ, mất USB và lỗi API đều có vị trí/CTA phù hợp.
7. 100% ghi firmware còn bước chạy và xác minh INFO. Chỉ có một dialog hoạt động cùng thời điểm.
8. Quyền, payload và validation được bảo toàn. Trạng thái thiếu dữ liệu và phần chưa kiểm chứng được báo đúng.

## 10. Prompt giao Antigravity

```text
Triển khai redesign trang /admin/iot trong RoadToSchool v2.0 theo bản thiết kế đã cung cấp.

Đọc AGENTS.md và các tài liệu bắt buộc đúng thứ tự, sau đó web/AGENTS.md, web/docs/README.md và tài liệu Next.js cục bộ liên quan. Kiểm tra git status và giữ các thay đổi local.

Tài liệu công việc chính là docs/ai-review/iot-page-redesign.md, đặc biệt mục 9. Tham chiếu wireframe và bốn preview trong docs/ai-review/designs/iot/. Nội dung trong preview là minh họa, khi triển khai phải lấy dữ liệu thật từ API. Thực thi đầy đủ kế hoạch mục 9, dùng các yêu cầu dưới đây để kiểm tra kết quả.

1. Khung trang
- Hai tab Thiết bị và Lịch sử quét thẻ, mặc định Thiết bị.
- Nút Thiết lập qua USB mở panel phải rộng khoảng 680px và co theo viewport.
- Dùng palette/token hiện hành, font Be Vietnam Pro, shared components, shell và quy tắc focus hiện có. Card 12px, input/select có viền và label rõ.

2. Tab Thiết bị
- Bảng có định danh, liên lạc máy chủ/lastSeenAt, xe được gán, trạng thái nhận phân công, firmware và Xem lượt quét.
- Dùng GET /iot/devices, phân trang 20 dòng theo total, filter deviceId chính xác. Xem lượt quét áp deviceId sang tab lịch sử.
- Mở rộng iotApi.devices bằng tham số tùy chọn. Giữ limit 100 và hành vi cũ cho devices() và devices(page), vì đăng ký RFID và gán thiết bị cho xe cũng dùng hàm này.
- Gán/tháo thiết bị tiếp tục ở hồ sơ xe. Dùng link/context hiện có để mở xe.

3. USB và Wi-Fi
- Giữ useEsp32 ở dashboard. Đổi tab hoặc đóng panel lúc rảnh giữ phiên. Ngắt USB và rời route cleanup tài nguyên đúng.
- Quyền Serial chỉ được xin từ click. Giữ thứ tự nhận chip, INFO, CONFIG_DEVICE và Wi-Fi, với stage/loading/error riêng.
- Chỉ xác nhận cấp cấu hình sau ACK đúng thiết bị. Wi-Fi thành công sau ACK đúng SSID và IP. Phân biệt liên lạc máy chủ với trạng thái USB/Wi-Fi.
- Form Wi-Fi có danh sách tín hiệu, Nhập tên mạng, mật khẩu, hiện/ẩn và Kết nối Wi-Fi. Giữ capability và validation cũ.
- Cài đặt nâng cao, thông tin chip/MAC/baud và nhật ký phiên USB thu gọn. Lưu Wi-Fi trên máy chủ tắt mặc định. Chỉ hiện thông tin kỹ thuật khi người dùng mở, bảo vệ mật khẩu và deviceKey.
- Ánh xạ lỗi thành thông báo ngắn ngay tại bước lỗi. URL máy chủ sai cần chỉ rõ cấu hình máy chủ phải được xử lý, không hứa nhập override sẽ vượt qua validator backend.

4. Firmware
- Dialog riêng có thiết bị đích và xác nhận trước ghi, thay window.confirm bằng xác nhận tích hợp.
- Có đường vào khi INFO chưa hoạt động. Chuyển console sang bootloader phải giải phóng cổng và giữ yêu cầu click khi chọn lại.
- Giữ validate merged binary, chip, offset, kích thước và MD5. Hiển thị tiến độ thực. Phiên bản đích chưa có từ API thì dùng Firmware do máy chủ cung cấp.
- Sau ghi xong có Chạy và kiểm tra, hoàn tất khi INFO hợp lệ. Trong lúc ghi khóa đóng bằng UI và giữ cảnh báo rời trang. Chỉ một dialog hoạt động cùng lúc.

5. Lịch sử và dữ liệu
- Filter Thiết bị và Xe riêng, Lọc/Xóa bộ lọc, Tự cập nhật và Làm mới lịch sử.
- Lấy options thiết bị qua phân trang/tải thêm, có nhập deviceId đầy đủ và giữ lựa chọn ngoài trang đã nạp. Không bỏ các thiết bị sau mục 100.
- Tách lỗi scans/options/vehicles để lỗi dropdown không xóa lịch sử còn hợp lệ. Giữ xử lý auth hiện có.
- Bảng dùng scannedAt, biển số snapshot, cardUid, cardType, deviceId. Giờ HH:mm:ss và ngày DD/MM/YYYY theo Việt Nam. Thiếu xe hiện Chưa xác định xe.
- Giữ thứ tự server theo Mới nhận trước và phân trang 20 dòng. Filter reset page, refresh giữ page/filter/scroll.
- Realtime lấy lại lịch sử từ API, giữ polling visible 15 giây, chống response cũ và subscription trùng. Nhãn Đang nhận sự kiện, Tự cập nhật định kỳ và Tạm dừng phải phản ánh đúng trạng thái.
- Endpoint này loại lượt ATTENDANCE. Có link sang Chuyến xe, dùng đúng dữ liệu API hiện tại trong bảng.

6. Phạm vi và kiểm chứng
- Phạm vi thực thi là frontend Web và tài liệu liên quan. Giữ endpoint, payload, quyền, serial protocol và nghiệp vụ hiện hành. API động/mDNS là công việc riêng.
- Không sửa env, backend/schema/DB, cài package hoặc commit/push. Nếu cần thay đổi ngoài phạm vi này, nêu rõ phụ thuộc để PO quyết định.
- Tuyệt đối không chạy script test. Không tự kết nối USB, flash, provision, SET_WIFI, seed, tạo scan hoặc gọi mutation để nghiệm thu. Kiểm tra có ghi cần PO cấp quyền cụ thể.
- Typecheck bằng npx.cmd --no-install tsc --noEmit --pretty false từ web, lint file liên quan và git diff --check. Kiểm tra giao diện với dữ liệu hiện hữu/GET an toàn ở 1440, 1024, 390px và viewport thấp khi có điều kiện. Ghi NOT_VERIFIED cho phần chưa kiểm chứng thực tế.
- Cập nhật hướng dẫn IoT và kiến trúc Web khi cần, báo cáo đủ 13 mục trong docs/ai-review/LATEST.md và diff đúng phạm vi. Bàn giao ngắn gọn kết quả, giới hạn, files và một bước tiếp theo rồi dừng.
```
