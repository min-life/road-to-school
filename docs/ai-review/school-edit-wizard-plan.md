# Kế hoạch đồng bộ modal chỉnh sửa và tạo trường

Phần wizard ở mục 1–4 đã được triển khai trước. Yêu cầu bổ sung tên và ảnh dùng mục 5 cùng prompt cuối file. Phạm vi mới thay quyết định chỉ xem tên/ảnh ở phần wizard gốc.

## 1. Bố cục

Modal tạo trường hiện có wizard ba bước với khung cố định theo viewport. Modal sửa trường đang xếp hợp đồng, bản đồ và lịch học thành một form dài. Dùng lại khung wizard tạo trường cho modal sửa, với dữ liệu trường được điền sẵn.

| Bước | Nội dung chỉnh sửa |
|---|---|
| 1. Thông tin trường | Tên và ảnh đại diện theo bố cục modal tạo trường, hiển thị chỉ xem vì luồng lưu hiện tại chưa ghi hai trường này. Áp dụng cho cả lối vào từ danh sách và hồ sơ để tránh cho nhập rồi không lưu. |
| 2. Địa chỉ & vị trí | Dùng lại bố cục địa chỉ và bản đồ. Giữ tìm kiếm, chọn gợi ý, ghim và xác nhận vị trí. |
| 3. Hợp đồng & lịch học | Dùng bố cục hai nhóm như modal tạo. Giữ lịch tuần theo từng ngày. Đặt «Ngày áp dụng vị trí/lịch học mới» trong nhóm riêng ở bước này và chỉ cho chỉnh khi địa chỉ/vị trí hoặc lịch học có thay đổi. |

Cả hai modal cùng quy tắc chiều rộng và chiều cao đang dùng ở modal tạo. Header, thanh bước và footer đứng yên, thân cuộn. Dùng lại màu và component hiện có. Nháp giữ nguyên khi đổi bước. Bố cục đề xuất cho modal sửa gồm Hủy, Quay lại/Tiếp tục theo bước và «Lưu thay đổi» ở footer trên cả ba bước để người dùng sửa một mục có thể lưu ngay. Giữ focus và khả năng dùng thanh bước bằng bàn phím.

## 2. Điều kiện bật Lưu thay đổi

- Tạo bản gốc khi mở đúng trường. So toàn bộ nháp với bản gốc, độc lập với bước đang xem. Khởi tạo lại khi mở phiên chỉnh sửa mới hoặc đổi trường. Refresh dữ liệu nền trong cùng phiên không ghi đè nháp.
- Chỉ xét nội dung có thể lưu qua API hiện tại gồm địa chỉ/tọa độ, lịch học tuần và thời hạn hợp đồng. Dùng quy tắc chuẩn hóa chung cho cả phát hiện thay đổi lẫn quyết định gọi API. So địa chỉ đã trim, tọa độ theo ngưỡng đang dùng, ngày theo YYYY-MM-DD và lịch theo từng thứ với giờ bắt đầu/kết thúc. Payload lịch cũ dạng JSON chuỗi cần chuẩn hóa như hiện hành. Đổi thứ tự khóa, rê bản đồ hoặc đổi bước không được tính là sửa dữ liệu.
- Khi mở form, nút Lưu bị khóa. Bật khi có ít nhất một thay đổi có thể lưu, form hợp lệ, đúng quyền và không trong lúc kiểm tác động hoặc gửi. Hoàn tác tất cả về bản gốc thì khóa lại. Lỗi phải hiện cạnh trường tương ứng và đánh dấu bước có lỗi nếu lỗi nằm ở bước khác.
- Chỉ đổi ngày áp dụng không tạo thay đổi độc lập. Ngày áp dụng đi cùng cập nhật vị trí/lịch học và dùng ngày mặc định hiện hành khi chưa nhập. Khi hoàn tác hai nhóm này, khóa lại ô ngày và bỏ nó khỏi quyết định submit. Sửa hợp đồng riêng dùng API hợp đồng hiện có.
- Kiểm lại thay đổi, quyền và validation trong handler trước khi gọi preview/API, kể cả submit bằng Enter. Gắn nút footer với form chuẩn và dùng một luồng submit. Preview hoặc xác nhận đã mở thì xử lý theo snapshot thay đổi nhất quán. Nếu được sửa dữ liệu liên quan sau preview, kiểm lại tác động trước khi lưu. Giữ cơ chế chống gửi trùng.

## 3. Tái sử dụng và phạm vi

- Tách phần trình bày chung gồm dialog shell, stepper, vùng cuộn và footer từ AddSchoolModal sang component dùng chung trong web/src/components/admin/schools. Chỉ chia sẻ các khối trường nhập khi markup và semantics thực sự giống. Giữ state, validation nghiệp vụ và handler submit ở create/edit tương ứng. Dùng lại WeeklyScheduleBuilder và bản đồ hiện có.
- Áp dụng EditSchoolModal dùng chung cho cả trang danh sách và trang hồ sơ. Giữ cách lấy SchoolDetail, quyền SYSTEM_ADMIN và hành vi đóng/làm mới theo caller. Giữ bộ lọc, trang đang xem và lối vào qua menu danh sách.
- Giữ updateSchoolLocation, updateSchoolSchedule, updateSchoolContract, preview tác động đổi vị trí, fingerprint, lý do, lịch hẹn và cách báo lưu một phần. Chỉ gửi các nhóm thực sự đổi. Sau lưu một phần, tải lại dữ liệu hiện hành trước khi cho chỉnh tiếp theo hành vi của caller, tránh gọi lại mục đã ghi một cách mù quáng.
- Giữ quy tắc hợp đồng hiện có của luồng sửa/gia hạn. Khi gia hạn giữ ngày bắt đầu cũ nếu hợp đồng cho phép. Ràng buộc ngày bắt đầu từ hôm nay của luồng tạo không dùng chung cho việc chỉnh hợp đồng đã tồn tại. Giữ rào cản ngày hiệu lực và giờ học của luồng sửa. API/schema, quyền và chức năng đổi tên/ảnh là ngoài phạm vi.

## 4. Nghiệm thu

1. Kiểm luồng tạo và sửa trên desktop 1440/1024 px và màn hẹp 390 px. Khung, header, stepper và footer ổn định qua ba bước, vùng cuộn đến dòng cuối, Map và popup chọn địa chỉ hoạt động khi vào lại bước 2.
2. Mở modal từ danh sách và hồ sơ, kiểm dữ liệu đúng trường và nút Lưu ban đầu bị khóa. Thử sửa từng nhóm, đổi bước, sửa về ban đầu, sửa mất hợp lệ, chỉ đổi ngày hiệu lực, lịch tuần đổi thứ tự khóa, và mở lại trường khác. Kiểm không mất nháp khi refresh nền.
3. Xác nhận chỉ gọi API của nhóm đổi, không có request khi chưa đổi kể cả bấm Enter, không gửi trùng. Giữ preview/fingerprint, trường hợp chặn theo ngày hiệu lực hoặc hợp đồng, lỗi, lưu toàn bộ và lưu một phần. Quay về đúng bộ lọc và trang khi đóng modal từ danh sách.
4. Chạy npx --no-install tsc --noEmit trong Web và git diff --check. Kiểm giao diện và quy tắc trên dữ liệu được PO cấp khi có điều kiện. Không chạy script test theo chỉ thị PO. Báo NOT_VERIFIED cho ca runtime chưa kiểm.

## Prompt cho Antigravity

> Triển khai theo docs/ai-review/school-edit-wizard-plan.md. Đọc AGENTS.md, web/AGENTS.md và tài liệu được chỉ định. Kiểm tra git status, bảo toàn thay đổi đang làm. Dùng AddSchoolModal làm chuẩn. Tách khung wizard chung cho tạo và sửa với kích thước theo viewport, tiêu đề/thanh bước/footer đứng yên và thân cuộn. Giữ ba bước và màu hiện hành. Dữ liệu modal sửa điền sẵn. Tên và ảnh chỉ xem ở cả hai lối vào. Cho lưu từ bất kỳ bước nào bằng nút «Lưu thay đổi» tại footer.
>
> Tạo baseline ổn định cho phiên sửa. So sánh nháp đã chuẩn hóa theo nhóm địa chỉ/tọa độ, lịch tuần và hợp đồng. Dùng cùng phép so sánh để bật nút và quyết định API cần gọi. Nút bị khóa khi chưa đổi, hoàn tác, form sai hoặc đang xử lý. Chỉ đổi ngày áp dụng, đổi bước, thứ tự khóa lịch hoặc thao tác zoom/pan không bật Lưu. Kiểm lại trong submit để bao phủ Enter và chống gửi trùng. Báo lỗi tại ô hoặc bước tương ứng.
>
> Dùng EditSchoolModal chung cho cả danh sách và chi tiết. Giữ quyền, preview, fingerprint, ngày hẹn, luồng hợp đồng, cách báo lưu một phần và refresh của caller. Giữ quy tắc gia hạn với ngày bắt đầu cũ. Tách handler create/edit, dùng nguyên contract API. Phạm vi thay đổi chỉ là Web.
>
> Nghiệm thu theo mục 4. Chạy typecheck và diff check, không chạy script test, không tự tạo dữ liệu, cài dependency, sửa env, commit hoặc push. Cập nhật báo cáo review 13 mục và LATEST.diff theo quy định repo. Nêu phần runtime chưa xác nhận rồi dừng.

## 5. Bổ sung chỉnh sửa tên và ảnh trường

### Phạm vi và contract đề xuất

- Cả danh sách và hồ sơ mở cùng `EditSchoolModal`. Bước 1 cho sửa tên và chọn ảnh mới, dùng bố cục chọn/xem trước ảnh của modal tạo trường. Giữ kích thước wizard, ba bước và nút Lưu dùng chung.
- Cho `SYSTEM_ADMIN` cập nhật tên, thêm ảnh khi chưa có hoặc thay ảnh hiện tại. Cho hủy ảnh vừa chọn để quay về ảnh đang lưu. Xóa hẳn ảnh đã lưu là quyết định riêng, chờ PO chốt. Thay đổi tên và ảnh có hiệu lực sau khi lưu thành công. Ngày áp dụng chỉ dùng cho vị trí/lịch học như hiện tại.
- Đề xuất API riêng `PATCH /schools/:id/profile`, `multipart/form-data`, hỗ trợ `name` tùy chọn và một file `image` tùy chọn. Ít nhất một trường phải được gửi. Bỏ trường nào giữ giá trị của trường đó. Mã thành công `200` trả `SchoolDetailResponseDto` hiện có. Tên trim, tối thiểu hai ký tự như quy tắc tạo. Giữ chính sách tên hiện hành. Dùng lại `School.name`, `imageUrl`, `imagePublicId`. Không cần migration. Web hiện có helper `updateSchool` trỏ `PUT /schools/:id`, nhưng controller hiện không có route tương ứng. Thêm helper theo contract profile sau khi PO duyệt.
- Swagger ghi rõ multipart, quyền và mã lỗi. Dữ liệu thiếu/sai hoặc ảnh rỗng/sai định dạng trả lỗi validation, trường không tồn tại `404`, không có quyền `403`, cập nhật xung đột `409`. Giữ cách phân loại lỗi upload Cloudinary hiện có. Nếu giới hạn multipart ở interceptor trả `413`, Swagger và FE cần mô tả đúng mã thực tế.

### Lưu tên và ảnh an toàn

1. Kiểm quyền, tìm trường và validate toàn bộ request trước upload. Dùng lại kiểm JPEG/PNG/WebP, giới hạn 5 MB, nội dung ảnh theo chữ ký nhị phân và `CloudinaryService.uploadSchoolImage`. Chỉ cập nhật tên thì dùng PostgreSQL trực tiếp.
2. Khi gửi ảnh, upload ảnh mới với ID riêng. Sau khi upload, ghi tên và cặp `imageUrl`/`imagePublicId` trong cùng thao tác DB. Kiểm xung đột ảnh bằng điều kiện theo cặp ảnh đã đọc trước upload để hai lượt thay ảnh song song không ghi đè ảnh mới của nhau. Request chỉ sửa tên chỉ cập nhật tên.
3. Dọn ảnh cũ của trường sau khi xác nhận DB đã chuyển sang ảnh mới. Nếu ghi DB chắc chắn thất bại hoặc bị từ chối do xung đột, dọn ảnh mới chưa dùng. Khi kết quả ghi chưa rõ, đọc lại tham chiếu DB trước khi xóa ảnh mới. Dọn ảnh best-effort qua helper sẵn có, ghi log khi thất bại và giữ kết quả lưu đã xác nhận. Dùng public ID lưu trong DB hoặc nhận từ upload, không lấy từ client.

### Bật Lưu và đồng bộ màn hình

- Bổ sung nhóm profile `name.trim()` khác baseline hoặc có file ảnh mới hợp lệ. Hoàn tác tên và bỏ file mới thì tắt Lưu nếu không còn nhóm nào khác đổi. Lỗi tên/ảnh nằm ở bước 1. Xem trước ảnh local và giải phóng URL khi thay file, bỏ chọn hoặc đóng modal.
- Khóa Lưu khi form không hợp lệ, đang preview hoặc đang gửi. Submit chỉ gọi API của nhóm thay đổi. Tên và ảnh gửi chung một request nếu cùng đổi. Lưu chỉ profile không gọi preview vị trí hoặc đòi ngày hẹn. Giữ các điều kiện riêng của nhóm hợp đồng/vị trí/lịch học.
- Giữ thứ tự và cơ chế xác nhận của các nhóm hiện có. Với lần lưu nhiều nhóm, mọi bước xác nhận tác động hoàn tất trước lần ghi đầu tiên. Nếu một nhóm đã lưu và nhóm sau lỗi, báo rõ phần đã lưu và phần lỗi, refresh dữ liệu đã xác nhận, tránh tự gửi lại nhóm đã lưu. Khi đổi tên làm bản ghi không còn khớp tìm kiếm, danh sách cập nhật theo bộ lọc hiện hành. Hồ sơ và danh sách hiển thị tên/ảnh từ response hoặc dữ liệu tải lại.

### Nghiệm thu

- Kiểm đổi tên riêng, thêm ảnh, thay ảnh, đổi cả hai, tên chỉ khác khoảng trắng, tên không hợp lệ, bỏ ảnh vừa chọn và hoàn tác toàn bộ. Kiểm ảnh lớn, sai định dạng, lỗi upload và ảnh cũ vẫn hiển thị.
- Kiểm cả hai lối vào modal, quyền `SYSTEM_ADMIN`, lưu cùng một nhóm khác, lưu một phần, hai lượt thay ảnh đồng thời, lỗi tải lại và toast theo kết quả thật. Đối chiếu Swagger, typecheck Web/API và diff. Các ca mutation/Cloudinary dùng dữ liệu và quyền được PO cấp. Script test theo chỉ thị PO vẫn chưa chạy.

## Prompt bổ sung tên và ảnh cho Antigravity

> Sau khi PO duyệt contract tại mục 5 của `docs/ai-review/school-edit-wizard-plan.md`, triển khai trên wizard hiện tại. Đọc AGENTS.md, các tài liệu nền và web/AGENTS.md theo quy định. Kiểm tra git status và bảo toàn thay đổi đang làm. Tạo PATCH /schools/:id/profile cho SYSTEM_ADMIN với multipart có name và image tùy chọn, yêu cầu ít nhất một mục, trả SchoolDetailResponseDto. Dùng field Prisma và CloudinaryService hiện có. Tái sử dụng validation tên/ảnh của luồng tạo và cập nhật Swagger/dashboard integration nếu có tài liệu contract liên quan. Không thêm migration.
>
> Lưu tên và ảnh như một nhóm. Upload trước, ghi tên và cặp trường ảnh cùng thao tác DB, phát hiện xung đột thay ảnh, dọn ảnh cũ sau khi xác nhận DB đã trỏ tới ảnh mới, dọn ảnh upload không được dùng khi chắc chắn không lưu. Khi DB cho kết quả chưa rõ, xác minh trước khi dọn. Giữ phân loại lỗi provider và không báo thất bại toàn giao dịch chỉ vì dọn ảnh cũ gặp lỗi.
>
> Bật sửa tên và chọn/thay ảnh ở bước 1 cho cả hai lối vào EditSchoolModal. Dùng preview local, bỏ file mới để quay về ảnh hiện tại, giữ khung wizard và bộ màu. Bổ sung dirty check, validation và API client theo contract đã duyệt. Bật Lưu khi form hợp lệ và ít nhất một nhóm thực sự thay đổi. Giữ preview/fingerprint, ngày hẹn, quy tắc hợp đồng và báo lưu một phần cho các nhóm khác. Xóa hẳn ảnh đã lưu nằm ngoài phạm vi chờ PO chốt. Nghiệm thu theo mục 5, chạy typecheck và diff check. Giữ chỉ thị PO về script test, dữ liệu, env, dependencies và Git. Ghi báo cáo review và dừng.
