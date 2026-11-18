# Bộ dữ liệu DEMO local

Chỉ chạy trên DB dev/local được chủ dự án cho phép. Không dùng trong production.
Script đọc `api/.env`, không sửa `.env`, không tự migrate và không gọi API/VietMap/email/push.

Từ thư mục `api`, dùng Node 24:

```powershell
# Xem kế hoạch hoặc kiểm tra bộ DEMO đã có; chỉ đọc DB
node scripts/seed-demo.ts

# Chỉ khi đã được phép ghi đúng DB này
node scripts/seed-demo.ts --apply --expect-db roadtoschool

# Có thể chọn ngày học cụ thể (thứ Hai đến thứ Sáu)
node scripts/seed-demo.ts --apply --expect-db roadtoschool --date 2026-10-29
```

Bộ mẫu gồm 1 trường, 11 tài khoản (1 quản trị nhà xe, 1 quản trị trường,
2 tài xế, 2 giáo viên phụ xe, 5 phụ huynh), 10 học sinh, 10 liên kết phụ huynh,
2 xe 16 chỗ, 1 phương án tuyến ACTIVE, 2 tuyến, 24 điểm dừng,
2 chuyến SCHEDULED và 20 dòng điểm danh UNMARKED.

- Ngày mặc định là ngày học kế tiếp theo giờ Việt Nam. Lọc đúng ngày đó trên Web/Mobile.
- Phương án mẫu ghi nhận System Admin tạo và School Admin duyệt; seed không thay đổi quyền của ứng dụng.
- Mỗi chuyến có roster và snapshot riêng, dùng các utility snapshot/thời gian/polyline hiện có.
- Hình học là đường nối điểm DEMO, không được tối ưu hoặc xác minh trên đường thực tế.
  Không dùng bộ dữ liệu này để nghiệm thu dẫn đường hay thuật toán phát hiện lệch tuyến.
- Tái sử dụng vị trí PARKING_LOT hiện có, hoặc vị trí mặc định của API nếu chưa cấu hình;
  không tạo hay cập nhật SystemSetting toàn hệ thống.
- Không tạo session/OTP/sự cố/báo nghỉ/notification/GPS giả. Các luồng đó được thao tác thật sau khi đăng nhập.
- TEST/LIVE vẫn theo cấu hình API đang có; script không bỏ qua điều kiện vận hành.
- Plan ACTIVE có thể được scheduler/lazy generation của ứng dụng sinh thêm chuyến khi ứng dụng hoạt động.

Email đăng nhập: `system@demo.roadtoschool.test`, `school@demo.roadtoschool.test`,
`driver1`/`driver2`, `attendant1`/`attendant2`, `parent1` đến `parent5` cùng domain trên.
Mật khẩu ngẫu nhiên dùng chung được ghi vào `api/.seed-demo-credentials.json`, đã được Git ignore;
script không in mật khẩu và không đặt mật khẩu mặc định trong source.

Script chỉ INSERT trong một transaction; collision gây dừng, không update/delete/upsert dữ liệu hiện hữu.
Chạy lại với bộ DEMO đầy đủ chỉ đọc/xác minh, không đặt lại mật khẩu hoặc trạng thái.
Nếu bộ DEMO đã bị chỉnh/sửa thiếu dữ liệu, script dừng để bảo vệ dữ liệu đã thao tác.
Nếu lần tạo thất bại, file credentials PENDING được giữ để chẩn đoán; kiểm tra DB trước khi đổi tên file và chạy lại.

ID demo dùng UUID v4 ngẫu nhiên và được lưu trong trường `ids` của file credentials để chạy lại không tạo bộ mới.
Giữ file này cùng DB; không xóa file để chạy seed lại. Manifest cũ thiếu `ids` sẽ bị từ chối để tránh tạo trùng.

Sửa bộ demo cũ có UUID v5 (chỉ khi chủ dự án cho phép cập nhật DB local):

```powershell
# Chỉ kiểm tra, không ghi
node scripts/repair-demo-ids.ts

# Chuyển riêng 63 ID demo và các tham chiếu, không thêm/xóa bản ghi
node scripts/repair-demo-ids.ts --apply --expect-db roadtoschool
```

Script sao lưu dữ liệu và credentials trong thư mục TEMP của người dùng trước khi ghi;
không in mật khẩu/token. FK phải có ON UPDATE CASCADE. Khóa bảng trong transaction ngắn,
đồng bộ cả JSON/soft references và so sánh toàn bộ dữ liệu trước/sau, chỉ cho phép ID thay đổi.
Không thay schema, API, mật khẩu hay trạng thái nghiệp vụ. Journal trong TEMP cho phép hoàn tất
manifest nếu tiến trình bị ngắt sau DB commit; không xóa journal khi sửa chưa xong.
Sau khi đổi ID, đăng xuất/đăng nhập lại và mở trường/chuyến từ danh sách; URL cũ không còn dùng được.

## Dữ liệu workflow báo nghỉ, yêu cầu và sự cố

### Một báo nghỉ tài xế có thể xử lý thay thế

Đơn thứ hai cho tài xế 2, trên chuyến chiều đi ngày học kế tiếp sau chuyến mẫu đầu (tài xế 1 làm ứng viên thay thế):

```powershell
node scripts/seed-driver-replacement.ts --second-notice
node scripts/seed-driver-replacement.ts --second-notice --apply --expect-db roadtoschool
```

Chỉ thêm 1 chuyến, 10 roster rows, 1 OTP tiêu thụ và 1 báo nghỉ; tái sử dụng phương án và tuyến demo. Không sửa đơn đầu, không tạo trùng khi chạy lại.

Khi được PO cho phép tạo mới bộ demo tối thiểu (không phục hồi chuyến đã hủy):

```powershell
node scripts/seed-driver-replacement.ts
node scripts/seed-driver-replacement.ts --apply --expect-db roadtoschool
```

Script tạo một phương án DEMO ACTIVE với hai tuyến sao chép hình học demo gốc, một chuyến chiều đi vào ngày học kế tiếp, 10 dòng roster, một OTP đã tiêu thụ và một đơn báo nghỉ DRIVER/PENDING_REPLACEMENT. Dùng tài xế 1, chừa tài xế 2 để thử thay thế. Kiểm tra lịch bận và đơn nghỉ của tài xế 2 trước khi ghi. Chạy lại nhận diện ID cố định, không tạo trùng. Không gửi email/SMS/push; không tự phân công thay thế. Phương án ACTIVE có thể được cơ chế sinh chuyến hiện có của API sinh thêm chuyến sau này.

Sửa hai context sự cố DEMO cũ sai tên trường (chỉ JSON context, giữ nguyên trạng thái và thông tin xử lý):

```powershell
node scripts/seed-demo-workflows.ts --repair-incident-context
node scripts/seed-demo-workflows.ts --repair-incident-context --apply --expect-db roadtoschool
```

Context mới dùng đúng các trường của detector hiện hành. Điểm trả và lịch lấy từ snapshot chuyến; khoảng lệch 420m, độ trễ 720 giây, thời gian duy trì 35 giây và 8 mẫu là số liệu mô phỏng, có `source: DEMO`, không phải bằng chứng GPS thực tế. Chạy lại không thay đổi các bản ghi đã sửa.

Bộ này phụ thuộc bộ DEMO gốc và chỉ dùng trên DB local đã được chủ dự án cho phép. Mặc định chỉ đọc:

```powershell
node scripts/seed-demo-workflows.ts
node scripts/seed-demo-workflows.ts --apply --expect-db roadtoschool
```

Bộ workflow tạo idempotent:

- 4 báo nghỉ: học sinh đang ghi nhận, học sinh đã rút báo nghỉ, tài xế chờ thay thế và giáo viên phụ xe chờ thay thế.
- 3 yêu cầu đổi điểm đón/trả: chờ duyệt, từ chối và đã hủy.
- 4 sự cố: thiếu giáo viên, thiếu tài xế, lệch tuyến và trễ điểm dừng ở các trạng thái khác nhau.
- 4 OTP đã tiêu thụ chỉ để thỏa quan hệ bắt buộc của báo nghỉ; không có OTP thật và không gửi email/SMS.

Để nhất quán nghiệp vụ, báo nghỉ đang hiệu lực của học sinh 01 chuyển đúng một dòng điểm danh chuyến chiều đi từ `UNMARKED` sang `ABSENT`. Script không gọi API ngoài, không tạo GPS/notification và không sửa schema.


## Bộ case cho toàn bộ giao diện Web

`seed-web-cases.ts` là bộ độc lập, không cần chạy lại DEMO cũ. Đã seed vào DB local theo yêu cầu PO; không cập nhật bản ghi cũ. Xem [tài khoản, checklist và danh sách case](../../docs/testing/web-ui-test-data.md). Mật khẩu nằm trong `api/.seed-web-credentials.json` đã được Git ignore. Mặc định script chỉ đọc; `--self-check` kiểm tra không chạm DB.
