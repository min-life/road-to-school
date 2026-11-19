# Kế hoạch redesign trang Phương tiện

Phạm vi gồm danh sách `/admin/vehicles` và các hộp thoại Thêm phương tiện, Quản lý thiết bị IoT và Ngừng hoạt động/Kích hoạt. Bản thiết kế dùng màu, shell và thành phần UI hiện hành của RoadToSchool.

[Wireframe desktop và màn hình hẹp](designs/vehicles/vehicle-wireframe.svg) · [Preview danh sách](designs/vehicles/vehicle-list-preview.png) · [Preview hộp thoại](designs/vehicles/vehicle-dialogs-preview.png)

## Trình tự triển khai

| Bước | Công việc | File chính |
| --- | --- | --- |
| 1 | Dùng một khối danh sách có bộ lọc Tìm kiếm và Trạng thái. Đặt số lượng cạnh tiêu đề bằng `total` của truy vấn đã áp dụng. Hiện Xóa bộ lọc khi có tiêu chí lọc. | `web/src/app/admin/vehicles/page.tsx` |
| 2 | Gộp biển số in đậm và hãng xe dòng phụ trong cột Phương tiện. Các cột tiếp theo là Ghế học sinh, Màu xe, Thiết bị IoT, Trạng thái, Ngày thêm, Thao tác. Biển số là nhãn nhận diện. Số ghế dùng số thường và trợ giúp đọc được bằng bàn phím. Ngày thêm lấy `createdAt`, trình bày `dd/mm/yyyy` theo múi giờ đã dùng cho ngày Việt Nam trong dự án. | `page.tsx` và CSS scoped nếu cần |
| 3 | Giảm chiều rộng tối thiểu của bảng cho laptop. Viewport hẹp chuyển sang thẻ có đủ dữ liệu và hai hành động tương ứng, bộ lọc xếp dọc. Giữ một bộ state dữ liệu, một footer phân trang. Footer hiện khoảng bản ghi, cỡ trang và điều hướng khi có hơn một trang. | `page.tsx`, CSS scoped, `PaginationControl` hoặc `PageNavigation` |
| 4 | Xử lý tải ban đầu, danh sách trống, không có kết quả lọc và lỗi tải riêng. Có Thử lại, Xóa bộ lọc theo ngữ cảnh. Debounce tìm kiếm giữ 300ms, dọn timer khi reset/rời trang. Bảo vệ kết quả trước phản hồi cũ, đưa về trang hợp lệ khi tổng thay đổi. | `page.tsx` |
| 5 | Hộp thoại thêm xe đặt Biển số đầu tiên, Hãng xe tiếp theo, Ghế học sinh và Màu xe cùng hàng nếu đủ chỗ. Một dòng giải thích ghế học sinh. Liên kết label và input, dùng lỗi theo field, 409 hiển thị ngay dưới biển số. Dùng dialog theo chuẩn hiện hành, khóa gửi lặp và trả focus về nút mở. | `_components/add-vehicle-modal.tsx` |
| 6 | Cột IoT hiển thị Đã gán/Chưa gán theo `iotDevice`, có mã nếu đã gán. Một điểm mở hộp thoại từ cột IoT. Trong hộp thoại có biển số xe đích, trạng thái nhận cấu hình đọc từ API hiện có, lý do và lịch sử. Bộ chọn chỉ liệt kê thiết bị chưa gán xe. Xác nhận gán/tháo thực hiện trong cùng dialog. | `page.tsx`, `_components/vehicle-iot-modal.tsx`, CSS liên quan |
| 7 | Dùng nút outline Ngừng hoạt động hoặc Kích hoạt trên từng xe. Hộp thoại ưu tiên biển số, số tuyến/chuyến bị ảnh hưởng, chi tiết thu gọn và chọn xe thay thế khi API yêu cầu. Dùng nút xác nhận có tên nghiệp vụ. | `page.tsx`, `web/src/components/admin/common/resource-status-dialog.tsx` nếu cần |
| 8 | Kiểm tra thay đổi ở desktop 1440px, laptop 1024px, màn hình hẹp 390px và viewport thấp. Kiểm tra bàn phím, focus, loading/empty/error, và giữ context sau thao tác. Cập nhật tài liệu route khi hành vi bấm biển số đổi. | `web/docs/web-architecture.md`, `web/docs/iot-device-console.md` nếu cần |

## Điều kiện triển khai và nghiệm thu

- Giữ quyền `SYSTEM_ADMIN`, API hiện hành và payload tạo xe, gán/tháo IoT và đổi trạng thái. Bộ chọn thiết bị dùng registry hiện có và ẩn các thiết bị mà API trả `assignment` đang hiệu lực, kể cả khi thiết bị chưa gửi ACK. Thiết bị đã tháo xuất hiện lại sau khi tải dữ liệu mới. Khi hết lựa chọn, hiện **Không có thiết bị chưa gán cho xe**. Thiết bị hiện tại được đọc ở khối thông tin riêng.
- Với thiết bị chưa gán xe nhưng đang được dùng để đăng ký thẻ RFID, giữ trạng thái khóa lựa chọn và luồng đối soát. Chỉ lọc danh sách dùng cho bộ chọn, giữ dữ liệu nguồn cho trạng thái, lịch sử và đối soát. Khi lựa chọn vừa bị gán ở nơi khác, bỏ lựa chọn, khóa gửi và tải lại danh sách. Gán mới gửi `expectedAssignmentId: null` để backend từ chối nếu có gán đồng thời. Tháo thiết bị dùng `expectedAssignmentId` của lượt gán hiện tại.
- Sau khi gán, tách kết quả gán thành công với ACK từ ESP32. Danh sách lấy tham chiếu gán, dialog lấy `configurationStatus`. Giữ đường vào lịch sử gán và đối soát đăng ký thẻ. Cắt ngắn mã IoT ở bảng nếu cần, cho đọc đầy đủ ở dialog.
- Dùng kết quả kiểm tra tác động của API làm căn cứ cho Ngừng hoạt động. Hiện điều kiện chặn khi backend báo không thể tiếp tục. Chọn xe thay thế chỉ khi cần theo `canDeactivateDirectly` và các guard hiện có. Nếu chỉnh dialog dùng chung, áp dụng nội dung dành riêng cho xe và kiểm tra các caller tài xế, nhân viên.
- Sau khi thêm, gán/tháo hoặc đổi trạng thái thành công, cập nhật dữ liệu danh sách. Giữ bộ lọc/cỡ trang. Nếu trang hiện tại vượt số trang còn lại thì tải trang hợp lệ cuối. Tác vụ lỗi giữ nội dung nhập có thể sửa và hiển thị hướng khắc phục.
- Dùng các thành phần UI sẵn có. Lưu mã trạng thái trong logic, hiển thị tiếng Việt. Bản thiết kế chọn nút đổi trạng thái trực tiếp với kiểu viền nhẹ. Các mục chỉnh sửa hồ sơ xe, bộ lọc IoT và thao tác gán hàng loạt nằm ngoài phạm vi redesign này.
- Kiểm tra typecheck, lint đúng file và `git diff --check`. Dùng dữ liệu hiện có và GET an toàn cho kiểm tra giao diện. Yêu cầu PO cấm chạy script test. Ghi `NOT_VERIFIED` cho thao tác ghi, thiết bị thật hoặc viewport chưa nghiệm thu. Hồ sơ bàn giao cần ghi rõ kết quả thực tế.

## Prompt cho Antigravity

```text
Triển khai redesign trang /admin/vehicles của RoadToSchool v2.0 sau khi PO duyệt triển khai. Đọc AGENTS.md, quy tắc Web và tài liệu cục bộ liên quan trước khi sửa. Kiểm tra git status và giữ các thay đổi đang có. Dùng docs/ai-review/vehicle-page-redesign-plan.md cùng wireframe và hai preview trong docs/ai-review/designs/vehicles/.

1. Danh sách. Giữ shell, màu, font và shared UI hiện hành. Dùng một khối chứa tiêu đề danh sách, số xe khớp bộ lọc, tìm kiếm, trạng thái và bảng. Có Xóa bộ lọc khi cần. Thứ tự cột là Phương tiện, Ghế học sinh, Màu xe, Thiết bị IoT, Trạng thái, Ngày thêm, Thao tác. Phương tiện hiện biển số đậm, hãng xe ở dòng phụ. Biển số là nhãn nhận diện. Ghế học sinh hiển thị số trung tính, có trợ giúp truy cập được bằng bàn phím. Ngày thêm lấy createdAt.

2. Hành vi danh sách. Giữ tìm kiếm biển số/hãng xe với debounce hiện tại. Dọn timer, bỏ phản hồi cũ, reset trang khi áp bộ lọc và điều chỉnh trang nếu tổng giảm. Phân biệt đang tải, danh sách trống, lọc không có kết quả và lỗi tải có nút Thử lại. Sau thao tác thành công, refresh theo bộ lọc hiện tại. Bảng co lại trên laptop; màn hình hẹp dùng thẻ, giữ dữ liệu, thao tác và phân trang. Ẩn điều hướng khi chỉ có một trang.

3. Thêm phương tiện. Sắp Biển số, Hãng xe, Ghế học sinh và Màu xe. Dùng một dòng giải thích số ghế. Gắn label với input, hiện lỗi tại field, ánh xạ 409 vào biển số. Giữ payload, validation backend, toast và tải lại sau thành công. Dùng dialog theo chuẩn dự án, khóa gửi lặp, hỗ trợ focus, Escape và trả focus về nút mở.

4. IoT. Hiện Đã gán hoặc Chưa gán theo iotDevice, kèm mã và thao tác phù hợp ngay cột IoT. Trong bộ chọn, ẩn mọi thiết bị có assignment đang hiệu lực, kể cả thiết bị chờ ACK. Thiết bị hiện tại hiển thị ở khối thông tin riêng. Hiện Không có thiết bị chưa gán cho xe khi hết lựa chọn. Sau khi tháo thành công, tải lại dữ liệu để thiết bị xuất hiện lại trong bộ chọn. Giữ điều kiện khóa với thiết bị đang dùng để đăng ký thẻ RFID, dữ liệu cho đối soát pending và quy tắc xe ngừng hoạt động. Nếu thiết bị đã chọn vừa bị gán ở nơi khác, bỏ lựa chọn, khóa xác nhận và tải lại. Gán mới gửi expectedAssignmentId: null. Khi tháo dùng assignment ID hiện tại. Thay window.confirm bằng xác nhận trong cùng dialog cho gán và tháo. Hộp thoại hiển thị biển số, lý do tùy chọn, lịch sử gán và trạng thái ACK tách khỏi kết quả gán.

5. Đổi trạng thái. Dùng nút outline trực tiếp Ngừng hoạt động hoặc Kích hoạt. Tái sử dụng ResourceStatusDialog và API kiểm tra tác động. Hiện biển số, số tuyến và chuyến ảnh hưởng, chi tiết thu gọn, lý do chặn và trường chọn xe thay thế khi API yêu cầu. Giữ phân trang lựa chọn và kiểm tra sức chứa/lịch ở backend. Đặt nhãn xác nhận đúng thao tác và kiểm tra caller tài xế, nhân viên nếu chỉnh component chung.

6. Phạm vi. Sửa frontend Web và tài liệu liên quan. Giữ hợp đồng API, quyền SYSTEM_ADMIN và nghiệp vụ đang có. Không thêm endpoint, sửa DB/schema/env, cài package, commit hoặc push. Không chạy script test, seed hoặc gọi API ghi để kiểm thử. Nghiệm thu có ghi hoặc thiết bị thật cần PO cấp quyền riêng.

7. Bàn giao. Chạy npx.cmd --no-install tsc --noEmit --pretty false từ web, lint file sửa và git diff --check. Xem 1440, 1024, 390px và viewport thấp với dữ liệu hiện có khi khả dụng. Kiểm tra keyboard focus và các trạng thái hiển thị. Cập nhật tài liệu Web, báo cáo 13 mục và LATEST.diff theo phạm vi. Liệt kê phần NOT_VERIFIED rồi dừng.
```
