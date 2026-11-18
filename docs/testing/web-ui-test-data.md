# Bộ dữ liệu kiểm thử giao diện Web

Đã thêm vào PostgreSQL local `localhost:5432/roadtoschool`, ngày gốc **2026-11-06**. Tìm theo **WEBTEST 9191564a**. Đây là dữ liệu mô phỏng, không phải thông tin học sinh thật.

## Đăng nhập và tìm dữ liệu

Tất cả tài khoản trong bộ này dùng chung mật khẩu ngẫu nhiên tại [file thông tin đăng nhập local](../../api/.seed-web-credentials.json), trường `password`. File đã được Git ignore; không đưa mật khẩu vào tài liệu hoặc commit. `accounts` trong file chứa toàn bộ 57 tài khoản.

| Tài khoản | Vai trò / mục đích |
| --- | --- |
| `system@wtest-9191564a.roadtoschool.test` | Nhà xe: xem toàn bộ dữ liệu |
| `school@wtest-9191564a.roadtoschool.test` | Trường chính: đầy đủ tình huống |
| `school2@wtest-9191564a.roadtoschool.test` | Trường thứ hai: phân quyền và bàn giao giáo viên |
| `school-empty@wtest-9191564a.roadtoschool.test` | Trường trống |
| `school-stopped@wtest-9191564a.roadtoschool.test` | Trường ngừng hoạt động: kiểm tra giới hạn truy cập |
| `school-expired@wtest-9191564a.roadtoschool.test` | Trường hết hợp đồng |
| `school-future@wtest-9191564a.roadtoschool.test` | Trường hợp đồng tương lai |

1. Đăng nhập bằng tài khoản mới bên trên. Tài khoản trường cũ sẽ không nhìn thấy trường kiểm thử mới.
2. Chọn trường có tiền tố `WEBTEST 9191564a`, đặt bộ lọc trạng thái là tất cả.
3. Chuyến/báo nghỉ có nhiều ngày quá khứ và tương lai: dùng **ngày của từng case trong bảng cuối tài liệu**, không chỉ lọc hôm nay.
4. Sau khi xử lý một case, trạng thái sẽ thay đổi thật. Script chạy lại **không reset thao tác đã thử**.

## Số lượng đã tạo

| Dữ liệu | Số lượng |
| --- | ---: |
| Trường | 25 |
| Tài khoản | 57 |
| Học sinh / liên kết phụ huynh | 72 / 72 |
| Xe | 18 |
| Phương án / tuyến / điểm dừng | 11 / 24 / 156 |
| Chuyến / điểm danh | 35 / 208 |
| Báo nghỉ / yêu cầu cập nhật / sự cố | 10 / 9 / 9 |
| Thông báo | 52 |
| Thay đổi trường đã hẹn / lịch nghỉ, học bù | 6 / 9 |
| GPS mô phỏng ban đầu | 19 (+1 điểm làm mới đã thử) |
| OTP đã tiêu thụ cho quan hệ báo nghỉ | 10 |

Đối soát sau seed: **690 bản ghi có sẵn giữ nguyên nội dung**. Không migrate, không sửa schema, không thay API/Web/Mobile; không gọi email, SMS hoặc push.

## Checklist theo màn hình

| Màn hình | Tình huống cần xem / thao tác |
| --- | --- |
| Tổng quan | Đổi trường, ngày; số báo nghỉ/yêu cầu/sự cố chưa xử lý. Dùng tài khoản System và School chính để so sánh phạm vi. |
| Trường học | Đang hoạt động, ngừng hoạt động, hết hợp đồng, hợp đồng tương lai, trường trống và nhiều trang danh sách. |
| Chi tiết trường — lịch | Tuần có nhiều khung giờ: T2/T3/T5 07:00–16:00, T4 07:00–11:30, T6 07:30–15:30; xem tháng, ngày nghỉ/học bù, âm lịch. |
| Thay đổi đã hẹn | PENDING/CANCELLED/APPLIED/FAILED; lịch học +14 ngày, vị trí +21 ngày, ngừng hoạt động +35 ngày. Các trạng thái lịch sử chỉ là fixture; không chứng minh cron đã chạy. |
| Học sinh | Có/chưa có tọa độ, khác tỉnh, khả dụng/tạm ngừng, đã/chưa phân tuyến, tên dài, số điện thoại và liên kết phụ huynh. |
| Nhân viên trường / giáo viên | Tài khoản hoạt động/tạm ngừng; trường thứ hai để kiểm tra không xem chéo dữ liệu; giáo viên rảnh và đang chạy. |
| Tài xế | Có/chưa có lịch trong khoảng ngày, lịch nhiều trang, hoạt động/tạm ngừng; tài xế đang chạy không được bàn giao. |
| Phương tiện | 16 chỗ, 2 chỗ, hoạt động/tạm ngừng, rảnh/bận; xe nhỏ dùng kiểm tra thiếu sức chứa. |
| Ngừng hoạt động / bàn giao | Nhóm ACTIVE của trường chính có chuyến IN_PROGRESS để kiểm tra bị chặn. Nhóm ACTIVE của **trường thứ hai** có SCHEDULED, không có IN_PROGRESS để thử bàn giao hợp lệ; School2 thử giáo viên. Backend vẫn kiểm tra xung đột ứng viên tại thời điểm thao tác. |
| Danh sách phương án | ACTIVE, DRAFT, CANCELLED, EXPIRED; nhãn DRAFT là “Chưa duyệt”; phương án trống và nhiều nhóm xe. |
| Chi tiết phương án | Chưa đủ nhân sự/xe, thiếu giáo viên, đầy đủ điều kiện, cần tối ưu lại; đổi tab Tuyến/Phân công, nhiều tuyến đi/về, chọn lớp hiển thị bản đồ. |
| Lập tuyến — preview | Chọn học sinh chưa phân tuyến và xe, bấm tối ưu thật. Kiểm tra không chọn xe/học sinh, xe 2 chỗ, thiếu tọa độ. Preview/token không phải dữ liệu lưu DB; phụ thuộc dịch vụ routing và cấu hình bản đồ đang có. |
| Chuyến xe | SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED, hai chiều, quá khứ/tương lai và danh sách nhiều trang. |
| Chi tiết chuyến — khóa sửa | SCHEDULED bình thường được xem thao tác; SCHEDULED đã sẵn sàng hoặc có điểm danh bị khóa; IN_PROGRESS/COMPLETED/CANCELLED không sửa phân công như chuyến chưa xuất phát. |
| Điểm danh | Chưa điểm danh, đã lên xe, đã xuống xe, vắng, không thuộc chuyến/excluded; tìm kiếm, bộ lọc, phân trang và số tổng. Chuyến hoàn tất có dữ liệu xuống xe. |
| GPS | Chuyến đang chạy có GPS, không GPS, dữ liệu cũ, nhiều đoạn runId. Đường nối fixture là mô phỏng, không dùng đánh giá độ chính xác đường bộ/detector. |
| Cần xử lý hành chính | Chuyến IN_PROGRESS đóng băng do trường ngừng hoạt động/hết hợp đồng, trạng thái PENDING. Chỉ thực hiện quyết định bằng tài khoản nhà xe đúng quyền. |
| Báo nghỉ | Học sinh ghi nhận/đã rút; tài xế và giáo viên chờ thay thế/đã thay thế/đã rút; báo nghỉ gắn chuyến hủy. Case chờ thay thế gắn **SCHEDULED**, không gắn IN_PROGRESS. |
| Yêu cầu | ADDRESS_UPDATE/INFORMATION_UPDATE, PENDING/APPROVED/REJECTED/CANCELLED. Có yêu cầu địa chỉ học sinh đã phân tuyến cho nhà xe và chưa phân tuyến cho trường; xem quyền duyệt/preview theo API. |
| Sự cố | 7 loại hiện có, 5 trạng thái WAITING_ASSIGNMENT/WAITING_CONFIRMATION/CONFIRMED/RESOLVED/CLOSED; thiếu người trên SCHEDULED có thể xử lý; lệch tuyến/chậm có thông số đúng contract; mất GPS có case không tọa độ. |
| Lịch vận hành | Nghỉ một lần/hằng năm, dương/âm lịch; học bù chờ duyệt/đã duyệt/từ chối/hủy. Có ngày nghỉ nhà xe **31/12/2098** để xem mà không ảnh hưởng lịch hiện tại. |
| Thông báo | Đọc/chưa đọc, phân trang, chuyển tới phương án/chuyến/yêu cầu/báo nghỉ/sự cố; một đích không còn tồn tại; chỉ tài khoản System và School chính mới nhận thông báo fixture tương ứng. |
| Cài đặt | Tài khoản fixture có thông tin liên hệ; đổi mật khẩu/avatar là thao tác thật. Bãi xe trung tâm và lịch dời bãi hiện có **không bị seed thay đổi**. |

## Những case cần tương tác thực tế

Dữ liệu DB bao phủ các trạng thái bền vững ở trên; không thể tạo sẵn mọi trạng thái giao diện bằng seed.

- Loading, mất mạng, timeout: dùng DevTools Network throttling/offline rồi tải lại; trả mạng về bình thường sau khi thử.
- Hết phiên/quyền: đăng xuất, đăng nhập tài khoản khác; mở tài nguyên trường khác để kiểm tra bị từ chối. Không sửa role bằng DB.
- Xung đột 409/preview cũ: mở cùng **fixture mới** ở hai tab, thay đổi ở tab A rồi xác nhận preview cũ ở B; không áp dụng lên bản ghi có sẵn trước seed.
- Tối ưu lại/hủy phương án/sửa địa chỉ/bàn giao: bấm preview thật để lấy fingerprint/token hợp lệ. Seed không tạo token giả.
- Bãi xe là cấu hình dùng chung: không seed các trạng thái bãi khác nhau vì sẽ tác động dữ liệu cũ. Cần môi trường riêng nếu kiểm thử thay đổi bãi và ngày nghỉ toàn hệ thống có hiệu lực gần.
- Domain tài khoản `.test` không nhận email thật. Đăng nhập bằng mật khẩu local; gửi/reset mật khẩu, OTP và thông báo đẩy cần hạ tầng thực tế, chưa xác minh.
- Dữ liệu ngày gốc 06/11/2026 sẽ cũ theo thời gian. Kiểm tra ngày áp dụng trước khi thử báo nghỉ hoặc thay thế; không đổi đồng hồ hoặc sửa ngày DB để vượt kiểm tra backend.

## Chạy script

Trong thư mục `api`, Node 24 và dependencies sẵn có:

```powershell
# Self-check độc lập, không kết nối DB
node scripts/seed-web-cases.ts --self-check

# Chỉ đọc, xác nhận dữ liệu hiện có
node scripts/seed-web-cases.ts

# Đã chạy thành công; chạy lại không ghi đè/reset và không tạo trùng
node scripts/seed-web-cases.ts --apply --expect-db roadtoschool

# Tùy chọn: thêm 1 GPS mô phỏng mới cho đúng chuyến fixture IN_PROGRESS
node scripts/seed-web-cases.ts --refresh-gps --apply --expect-db roadtoschool
```

GPS mới chỉ tươi trong cửa sổ thời gian của hệ thống (khoảng 15 giây), sau đó trở thành dữ liệu cũ; script không chạy publisher nền. Không xóa file credentials để cố reset seed. Nếu fixture bị xóa một phần, script dừng để tránh nhân đôi dữ liệu.

## Tra cứu từng case

Link bên dưới dùng Web local `localhost:5173`. Chúng không tự đăng nhập; chọn đúng tài khoản trước. Với lịch và thay đổi trường, chọn trường chính. UUID và ngày giúp đối chiếu khi lọc danh sách.

| Case | Màn hình / nội dung | Ngày | Mở |
| --- | --- | --- | --- |
| `school-0` | WEBTEST 9191564a · Trường đầy đủ dữ liệu | — | [Mở](http://localhost:5173/admin/schools/b2ddbe59-6e26-42e7-9b58-f167f743f024) · `b2ddbe59-6e26-42e7-9b58-f167f743f024` |
| `school-1` | WEBTEST 9191564a · Trường thứ hai — kiểm tra phân quyền | — | [Mở](http://localhost:5173/admin/schools/bb69a765-a1d3-4a93-a67d-b0f59980a715) · `bb69a765-a1d3-4a93-a67d-b0f59980a715` |
| `school-2` | WEBTEST 9191564a · Trường trống | — | [Mở](http://localhost:5173/admin/schools/edd47859-6cbd-42a2-a765-672b873b8edf) · `edd47859-6cbd-42a2-a765-672b873b8edf` |
| `school-3` | WEBTEST 9191564a · Trường ngừng hoạt động | — | [Mở](http://localhost:5173/admin/schools/5eed8b1f-bb58-4a3d-97f4-c410c17b7997) · `5eed8b1f-bb58-4a3d-97f4-c410c17b7997` |
| `school-4` | WEBTEST 9191564a · Trường hết hợp đồng | — | [Mở](http://localhost:5173/admin/schools/85fa5465-8e1f-4ce4-aadf-56eefb3025e6) · `85fa5465-8e1f-4ce4-aadf-56eefb3025e6` |
| `school-5` | WEBTEST 9191564a · Trường hợp đồng tương lai | — | [Mở](http://localhost:5173/admin/schools/d2d38d1e-598f-441b-a687-2b70ff26f136) · `d2d38d1e-598f-441b-a687-2b70ff26f136` |
| `school-6` | WEBTEST 9191564a · Trường thiếu tọa độ học sinh | — | [Mở](http://localhost:5173/admin/schools/feee9aac-74fc-4203-a35b-8cba4b38271b) · `feee9aac-74fc-4203-a35b-8cba4b38271b` |
| `school-7` | WEBTEST 9191564a · Trường phân trang 1 | — | [Mở](http://localhost:5173/admin/schools/e578b82c-9b00-403b-ac22-d29f78b40a4d) · `e578b82c-9b00-403b-ac22-d29f78b40a4d` |
| `school-8` | WEBTEST 9191564a · Trường phân trang 2 | — | [Mở](http://localhost:5173/admin/schools/2164072a-63de-4a0a-a3de-71624d4f1526) · `2164072a-63de-4a0a-a3de-71624d4f1526` |
| `school-9` | WEBTEST 9191564a · Trường phân trang 3 | — | [Mở](http://localhost:5173/admin/schools/ab8a6cda-075b-4a12-8da3-89f1879cbeda) · `ab8a6cda-075b-4a12-8da3-89f1879cbeda` |
| `school-10` | WEBTEST 9191564a · Trường phân trang 4 | — | [Mở](http://localhost:5173/admin/schools/d02c0617-6366-4b60-a627-feceb1fbb7de) · `d02c0617-6366-4b60-a627-feceb1fbb7de` |
| `school-11` | WEBTEST 9191564a · Trường phân trang 5 | — | [Mở](http://localhost:5173/admin/schools/319268c0-bda3-4d02-a3db-f85ac1acb817) · `319268c0-bda3-4d02-a3db-f85ac1acb817` |
| `school-12` | WEBTEST 9191564a · Trường phân trang 6 | — | [Mở](http://localhost:5173/admin/schools/922ea64d-8bef-47f1-a7f8-c00680d089ae) · `922ea64d-8bef-47f1-a7f8-c00680d089ae` |
| `school-13` | WEBTEST 9191564a · Trường phân trang 7 | — | [Mở](http://localhost:5173/admin/schools/6735b0e6-21b7-4bdc-9713-22729a107003) · `6735b0e6-21b7-4bdc-9713-22729a107003` |
| `school-14` | WEBTEST 9191564a · Trường phân trang 8 | — | [Mở](http://localhost:5173/admin/schools/41ec6257-2a48-4a6f-ab7a-174de6f8c57b) · `41ec6257-2a48-4a6f-ab7a-174de6f8c57b` |
| `school-15` | WEBTEST 9191564a · Trường phân trang 9 | — | [Mở](http://localhost:5173/admin/schools/f40e2fc7-4478-4028-aca6-09244e6bb035) · `f40e2fc7-4478-4028-aca6-09244e6bb035` |
| `school-16` | WEBTEST 9191564a · Trường phân trang 10 | — | [Mở](http://localhost:5173/admin/schools/7add98e3-6da0-42b1-893c-94ef3bac4091) · `7add98e3-6da0-42b1-893c-94ef3bac4091` |
| `school-17` | WEBTEST 9191564a · Trường phân trang 11 | — | [Mở](http://localhost:5173/admin/schools/97345709-2c4a-4371-8937-e32385dc02de) · `97345709-2c4a-4371-8937-e32385dc02de` |
| `school-18` | WEBTEST 9191564a · Trường phân trang 12 | — | [Mở](http://localhost:5173/admin/schools/e594e10d-3244-46b5-b9c9-2d768332e724) · `e594e10d-3244-46b5-b9c9-2d768332e724` |
| `school-19` | WEBTEST 9191564a · Trường phân trang 13 | — | [Mở](http://localhost:5173/admin/schools/6a55afeb-3d45-4730-9085-13e6206080b6) · `6a55afeb-3d45-4730-9085-13e6206080b6` |
| `school-20` | WEBTEST 9191564a · Trường phân trang 14 | — | [Mở](http://localhost:5173/admin/schools/458b1a1b-25e6-429c-a518-0b0eb7406519) · `458b1a1b-25e6-429c-a518-0b0eb7406519` |
| `school-21` | WEBTEST 9191564a · Trường phân trang 15 | — | [Mở](http://localhost:5173/admin/schools/fdeb9871-34cf-469c-9e46-dc04ff869bc2) · `fdeb9871-34cf-469c-9e46-dc04ff869bc2` |
| `school-22` | WEBTEST 9191564a · Trường phân trang 16 | — | [Mở](http://localhost:5173/admin/schools/50bc5e6c-13e8-479c-a131-932ee620bfee) · `50bc5e6c-13e8-479c-a131-932ee620bfee` |
| `school-23` | WEBTEST 9191564a · Trường phân trang 17 | — | [Mở](http://localhost:5173/admin/schools/1626346d-132a-47e3-938f-492126791d09) · `1626346d-132a-47e3-938f-492126791d09` |
| `school-24` | WEBTEST 9191564a · Trường phân trang 18 | — | [Mở](http://localhost:5173/admin/schools/d4d48596-acb7-4b46-a188-d43ebb5b9c0e) · `d4d48596-acb7-4b46-a188-d43ebb5b9c0e` |
| `plan-active` | WEBTEST 9191564a · Đang hoạt động — 2 xe | — | [Mở](http://localhost:5173/admin/routes/plans/fa50f010-5443-4384-9db2-cfe36282352d) · `fa50f010-5443-4384-9db2-cfe36282352d` |
| `plan-partial` | WEBTEST 9191564a · Chưa duyệt — chỉ xếp 4/12 học sinh | — | [Mở](http://localhost:5173/admin/routes/plans/bba49863-ed3c-4f56-b59c-44807fff67bf) · `bba49863-ed3c-4f56-b59c-44807fff67bf` |
| `plan-ready` | WEBTEST 9191564a · Đủ phân công — chờ trường duyệt | — | [Mở](http://localhost:5173/admin/routes/plans/19b25a48-8ea3-4098-9dcd-151738df0c9e) · `19b25a48-8ea3-4098-9dcd-151738df0c9e` |
| `plan-missing` | WEBTEST 9191564a · Chưa phân xe và nhân sự | — | [Mở](http://localhost:5173/admin/routes/plans/c1db7e38-0b4e-4b5d-8abc-1434240b2313) · `c1db7e38-0b4e-4b5d-8abc-1434240b2313` |
| `plan-reopt` | WEBTEST 9191564a · Cần tối ưu lại | — | [Mở](http://localhost:5173/admin/routes/plans/ddd16549-56e8-4926-9341-eb3c1c09237a) · `ddd16549-56e8-4926-9341-eb3c1c09237a` |
| `plan-attendant` | WEBTEST 9191564a · Chờ trường phân giáo viên | — | [Mở](http://localhost:5173/admin/routes/plans/6f06057e-c54d-4fd1-b99f-60ab56419d68) · `6f06057e-c54d-4fd1-b99f-60ab56419d68` |
| `plan-cancelled` | WEBTEST 9191564a · Phương án đã hủy | — | [Mở](http://localhost:5173/admin/routes/plans/b5c33111-0e9e-4593-b426-0a1e68b5cc06) · `b5c33111-0e9e-4593-b426-0a1e68b5cc06` |
| `plan-empty` | WEBTEST 9191564a · Phương án không còn tuyến | — | [Mở](http://localhost:5173/admin/routes/plans/2f8470ae-68ad-4312-8ffd-4a16ee9f0b5f) · `2f8470ae-68ad-4312-8ffd-4a16ee9f0b5f` |
| `plan-other` | WEBTEST 9191564a · Phương án trường thứ hai | — | [Mở](http://localhost:5173/admin/routes/plans/f0608f8b-3b01-4336-9a0a-77655b481074) · `f0608f8b-3b01-4336-9a0a-77655b481074` |
| `plan-stopped` | WEBTEST 9191564a · Trường ngừng — còn chuyến cần chốt | — | [Mở](http://localhost:5173/admin/routes/plans/a7e30732-ea35-4018-87d2-291c579d7c07) · `a7e30732-ea35-4018-87d2-291c579d7c07` |
| `plan-expired` | WEBTEST 9191564a · Phương án hết hạn hợp đồng | — | [Mở](http://localhost:5173/admin/routes/plans/38fbcea8-b80b-4414-b478-427aa59cacdf) · `38fbcea8-b80b-4414-b478-427aa59cacdf` |
| `trip-đang chạy — điểm danh hỗn hợp và GPS mô phỏng` | WEBTEST 9191564a · đang chạy — điểm danh hỗn hợp và GPS mô phỏng | 2026-11-05 | [Mở](http://localhost:5173/admin/trips/40d217a1-a7b8-4d83-b718-21fdd6157ff0) · `40d217a1-a7b8-4d83-b718-21fdd6157ff0` |
| `trip-chờ xuất phát — chưa điểm danh` | WEBTEST 9191564a · chờ xuất phát — chưa điểm danh | 2026-11-09 | [Mở](http://localhost:5173/admin/trips/329c63bd-2efe-466f-ad41-949cce82b4b0) · `329c63bd-2efe-466f-ad41-949cce82b4b0` |
| `trip-phụ xe đã sẵn sàng — khóa đổi phân công` | WEBTEST 9191564a · phụ xe đã sẵn sàng — khóa đổi phân công | 2026-11-09 | [Mở](http://localhost:5173/admin/trips/b8060143-89f4-48fd-9edf-882ffd1c5791) · `b8060143-89f4-48fd-9edf-882ffd1c5791` |
| `trip-đã ghi điểm danh — khóa đổi phân công` | WEBTEST 9191564a · đã ghi điểm danh — khóa đổi phân công | 2026-11-10 | [Mở](http://localhost:5173/admin/trips/0561ef5b-a10a-4b18-9f67-f77cfb709f49) · `0561ef5b-a10a-4b18-9f67-f77cfb709f49` |
| `trip-hoàn thành — đã xuống xe` | WEBTEST 9191564a · hoàn thành — đã xuống xe | 2026-11-04 | [Mở](http://localhost:5173/admin/trips/b8e40cfb-623b-4366-9570-10cbf1a31b91) · `b8e40cfb-623b-4366-9570-10cbf1a31b91` |
| `trip-đã hủy — báo nghỉ không còn bố trí` | WEBTEST 9191564a · đã hủy — báo nghỉ không còn bố trí | 2026-11-06 | [Mở](http://localhost:5173/admin/trips/2afd687d-00aa-4210-b62b-e0402c5d5f66) · `2afd687d-00aa-4210-b62b-e0402c5d5f66` |
| `trip-học sinh bị loại khỏi roster` | WEBTEST 9191564a · học sinh bị loại khỏi roster | 2026-11-03 | [Mở](http://localhost:5173/admin/trips/f8493f52-6481-4982-8c80-7b3a93e860c5) · `f8493f52-6481-4982-8c80-7b3a93e860c5` |
| `trip-đang chạy — không có GPS` | WEBTEST 9191564a · đang chạy — không có GPS | 2026-11-05 | [Mở](http://localhost:5173/admin/trips/fd56aaf7-3eb7-473d-8c4a-dafcf1a8e185) · `fd56aaf7-3eb7-473d-8c4a-dafcf1a8e185` |
| `trip-chốt hành chính — trường ngừng hoạt động` | WEBTEST 9191564a · chốt hành chính — trường ngừng hoạt động | 2026-11-05 | [Mở](http://localhost:5173/admin/trips/a5a783fb-bda1-47bb-9d28-0a134794cfbf) · `a5a783fb-bda1-47bb-9d28-0a134794cfbf` |
| `trip-chốt hành chính — hợp đồng hết hạn` | WEBTEST 9191564a · chốt hành chính — hợp đồng hết hạn | 2026-11-05 | [Mở](http://localhost:5173/admin/trips/ac057c29-ff71-4a14-9fa7-015b54f74a7f) · `ac057c29-ff71-4a14-9fa7-015b54f74a7f` |
| `trip-chuyến trường thứ hai` | WEBTEST 9191564a · chuyến trường thứ hai | 2026-11-09 | [Mở](http://localhost:5173/admin/trips/3c6817f9-ff7d-484c-9e6a-1b9e82a6cf40) · `3c6817f9-ff7d-484c-9e6a-1b9e82a6cf40` |
| `trip-phân trang lịch 1` | WEBTEST 9191564a · phân trang lịch 1 | 2026-11-02 | [Mở](http://localhost:5173/admin/trips/a06b595f-99ab-471a-b3b9-8437e16716cf) · `a06b595f-99ab-471a-b3b9-8437e16716cf` |
| `trip-phân trang lịch 2` | WEBTEST 9191564a · phân trang lịch 2 | 2026-10-30 | [Mở](http://localhost:5173/admin/trips/44e22cb2-8303-4ed3-83cb-ba47dcad0101) · `44e22cb2-8303-4ed3-83cb-ba47dcad0101` |
| `trip-phân trang lịch 3` | WEBTEST 9191564a · phân trang lịch 3 | 2026-10-29 | [Mở](http://localhost:5173/admin/trips/25d1aa6f-14b0-4a0e-a926-ce9a2a79b05a) · `25d1aa6f-14b0-4a0e-a926-ce9a2a79b05a` |
| `trip-phân trang lịch 4` | WEBTEST 9191564a · phân trang lịch 4 | 2026-10-28 | [Mở](http://localhost:5173/admin/trips/898f00e5-8b0d-4b9a-b053-2d9bb26fdadd) · `898f00e5-8b0d-4b9a-b053-2d9bb26fdadd` |
| `trip-phân trang lịch 5` | WEBTEST 9191564a · phân trang lịch 5 | 2026-10-27 | [Mở](http://localhost:5173/admin/trips/5e8320f4-91f3-475f-9a2f-f24bf0860875) · `5e8320f4-91f3-475f-9a2f-f24bf0860875` |
| `trip-phân trang lịch 6` | WEBTEST 9191564a · phân trang lịch 6 | 2026-10-26 | [Mở](http://localhost:5173/admin/trips/447d10fa-e686-42cf-a03e-c7bc06dbf51c) · `447d10fa-e686-42cf-a03e-c7bc06dbf51c` |
| `trip-phân trang lịch 7` | WEBTEST 9191564a · phân trang lịch 7 | 2026-10-23 | [Mở](http://localhost:5173/admin/trips/655a410c-fafb-40b4-a697-f81090fc23e1) · `655a410c-fafb-40b4-a697-f81090fc23e1` |
| `trip-phân trang lịch 8` | WEBTEST 9191564a · phân trang lịch 8 | 2026-10-22 | [Mở](http://localhost:5173/admin/trips/8654b97c-37b7-445d-85a4-567a7ce8092d) · `8654b97c-37b7-445d-85a4-567a7ce8092d` |
| `trip-phân trang lịch 9` | WEBTEST 9191564a · phân trang lịch 9 | 2026-10-21 | [Mở](http://localhost:5173/admin/trips/90b10709-2c71-42f6-bca7-66ecb589fcea) · `90b10709-2c71-42f6-bca7-66ecb589fcea` |
| `trip-phân trang lịch 10` | WEBTEST 9191564a · phân trang lịch 10 | 2026-10-20 | [Mở](http://localhost:5173/admin/trips/d9db6b00-9a1a-40b1-9bef-7ba5501d2398) · `d9db6b00-9a1a-40b1-9bef-7ba5501d2398` |
| `trip-phân trang lịch 11` | WEBTEST 9191564a · phân trang lịch 11 | 2026-10-19 | [Mở](http://localhost:5173/admin/trips/789f748b-c703-4ad5-8cd0-194b0df724cd) · `789f748b-c703-4ad5-8cd0-194b0df724cd` |
| `trip-phân trang lịch 12` | WEBTEST 9191564a · phân trang lịch 12 | 2026-10-16 | [Mở](http://localhost:5173/admin/trips/f4818e61-78e9-4dcf-9657-0542d1cd266b) · `f4818e61-78e9-4dcf-9657-0542d1cd266b` |
| `trip-báo nghỉ 1` | WEBTEST 9191564a · báo nghỉ 1 | 2026-11-11 | [Mở](http://localhost:5173/admin/trips/c767e37e-729a-4803-8c4a-350f5abd884c) · `c767e37e-729a-4803-8c4a-350f5abd884c` |
| `trip-báo nghỉ 2` | WEBTEST 9191564a · báo nghỉ 2 | 2026-11-12 | [Mở](http://localhost:5173/admin/trips/afe25ec1-828c-4394-9a3b-0400e8213b12) · `afe25ec1-828c-4394-9a3b-0400e8213b12` |
| `trip-báo nghỉ 3` | WEBTEST 9191564a · báo nghỉ 3 | 2026-11-13 | [Mở](http://localhost:5173/admin/trips/96a0e379-ac4e-4b44-a2cc-a88ddd06324a) · `96a0e379-ac4e-4b44-a2cc-a88ddd06324a` |
| `trip-báo nghỉ 4` | WEBTEST 9191564a · báo nghỉ 4 | 2026-11-16 | [Mở](http://localhost:5173/admin/trips/1089d035-97aa-4358-b4d1-007d7160ced4) · `1089d035-97aa-4358-b4d1-007d7160ced4` |
| `trip-báo nghỉ 5` | WEBTEST 9191564a · báo nghỉ 5 | 2026-11-17 | [Mở](http://localhost:5173/admin/trips/c4a4311e-cbe7-4f42-9b22-665de5a60e4e) · `c4a4311e-cbe7-4f42-9b22-665de5a60e4e` |
| `trip-báo nghỉ 6` | WEBTEST 9191564a · báo nghỉ 6 | 2026-11-18 | [Mở](http://localhost:5173/admin/trips/0175d13e-1704-423f-bd18-a3cb399256e6) · `0175d13e-1704-423f-bd18-a3cb399256e6` |
| `trip-báo nghỉ 7` | WEBTEST 9191564a · báo nghỉ 7 | 2026-11-19 | [Mở](http://localhost:5173/admin/trips/ec79bbc3-30fe-40b3-9110-933babd7709a) · `ec79bbc3-30fe-40b3-9110-933babd7709a` |
| `trip-báo nghỉ 8` | WEBTEST 9191564a · báo nghỉ 8 | 2026-11-20 | [Mở](http://localhost:5173/admin/trips/c097fb21-7858-4ff5-b256-6763fd3f8d83) · `c097fb21-7858-4ff5-b256-6763fd3f8d83` |
| `trip-báo nghỉ 9` | WEBTEST 9191564a · báo nghỉ 9 | 2026-11-23 | [Mở](http://localhost:5173/admin/trips/0faef31a-88cd-4b1d-ab1c-32ba975b16dd) · `0faef31a-88cd-4b1d-ab1c-32ba975b16dd` |
| `trip-báo nghỉ 10` | WEBTEST 9191564a · báo nghỉ 10 | 2026-11-24 | [Mở](http://localhost:5173/admin/trips/3135e4d0-4ab1-48bd-87ea-5929d780f85a) · `3135e4d0-4ab1-48bd-87ea-5929d780f85a` |
| `leave-0` | WEBTEST 9191564a · STUDENT — RECORDED | 2026-11-11 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=3a2eaf88-e516-4ee4-8d19-92b7ba532f16&kind=WEBTEST 9191564a · STUDENT) · `3a2eaf88-e516-4ee4-8d19-92b7ba532f16` |
| `leave-1` | WEBTEST 9191564a · STUDENT — WITHDRAWN | 2026-11-12 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=8cb27afe-8419-4b4a-9c58-d44e510b4d19&kind=WEBTEST 9191564a · STUDENT) · `8cb27afe-8419-4b4a-9c58-d44e510b4d19` |
| `leave-2` | WEBTEST 9191564a · DRIVER — PENDING_REPLACEMENT | 2026-11-13 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=6e39cd52-1e27-4510-9d3b-2cda7c71d046&kind=WEBTEST 9191564a · DRIVER) · `6e39cd52-1e27-4510-9d3b-2cda7c71d046` |
| `leave-3` | WEBTEST 9191564a · BUS_ATTENDANT — PENDING_REPLACEMENT | 2026-11-16 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=acf0139e-fbe2-4d76-9385-a74417ca3f8c&kind=WEBTEST 9191564a · BUS_ATTENDANT) · `acf0139e-fbe2-4d76-9385-a74417ca3f8c` |
| `leave-4` | WEBTEST 9191564a · DRIVER — REPLACED | 2026-11-17 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=0302551f-470c-44f5-af6e-c52c79d06451&kind=WEBTEST 9191564a · DRIVER) · `0302551f-470c-44f5-af6e-c52c79d06451` |
| `leave-5` | WEBTEST 9191564a · BUS_ATTENDANT — REPLACED | 2026-11-18 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=8e0d2ee8-a6b5-4dad-9cce-0c13c830ed19&kind=WEBTEST 9191564a · BUS_ATTENDANT) · `8e0d2ee8-a6b5-4dad-9cce-0c13c830ed19` |
| `leave-6` | WEBTEST 9191564a · DRIVER — WITHDRAWN | 2026-11-19 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=81aff135-4469-40b2-aa25-134419cc2fe2&kind=WEBTEST 9191564a · DRIVER) · `81aff135-4469-40b2-aa25-134419cc2fe2` |
| `leave-7` | WEBTEST 9191564a · DRIVER — TRIP_CANCELLED | 2026-11-20 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=eeb65169-935e-469b-8e43-d9dd9eb4f20c&kind=WEBTEST 9191564a · DRIVER) · `eeb65169-935e-469b-8e43-d9dd9eb4f20c` |
| `leave-8` | WEBTEST 9191564a · BUS_ATTENDANT — WITHDRAWN | 2026-11-23 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=2b338b2f-b33f-44ee-a483-3a1e7daa2b08&kind=WEBTEST 9191564a · BUS_ATTENDANT) · `2b338b2f-b33f-44ee-a483-3a1e7daa2b08` |
| `leave-9` | WEBTEST 9191564a · BUS_ATTENDANT — TRIP_CANCELLED | 2026-11-24 | [Mở](http://localhost:5173/admin/leave-notices?noticeId=bcd3800d-ede1-4bc4-b241-bfa06caf45b5&kind=WEBTEST 9191564a · BUS_ATTENDANT) · `bcd3800d-ede1-4bc4-b241-bfa06caf45b5` |
| `request-ADDRESS_UPDATE-PENDING` | WEBTEST 9191564a · ADDRESS_UPDATE — PENDING | — | [Mở](http://localhost:5173/admin/requests?requestId=bde8e927-0786-4a65-9850-d2c5e9c8949f) · `bde8e927-0786-4a65-9850-d2c5e9c8949f` |
| `request-ADDRESS_UPDATE-APPROVED` | WEBTEST 9191564a · ADDRESS_UPDATE — APPROVED | — | [Mở](http://localhost:5173/admin/requests?requestId=0dea5b36-ca62-456e-8cb8-700e4421413c) · `0dea5b36-ca62-456e-8cb8-700e4421413c` |
| `request-ADDRESS_UPDATE-REJECTED` | WEBTEST 9191564a · ADDRESS_UPDATE — REJECTED | — | [Mở](http://localhost:5173/admin/requests?requestId=bc1e1bd8-e49e-491e-b444-ee4ad954581f) · `bc1e1bd8-e49e-491e-b444-ee4ad954581f` |
| `request-ADDRESS_UPDATE-CANCELLED` | WEBTEST 9191564a · ADDRESS_UPDATE — CANCELLED | — | [Mở](http://localhost:5173/admin/requests?requestId=6a5f0e6d-3050-4d26-8db8-c33bf679554d) · `6a5f0e6d-3050-4d26-8db8-c33bf679554d` |
| `request-INFORMATION_UPDATE-PENDING` | WEBTEST 9191564a · INFORMATION_UPDATE — PENDING | — | [Mở](http://localhost:5173/admin/requests?requestId=f3b6f9ef-a2a0-44a0-8928-5f25144b418f) · `f3b6f9ef-a2a0-44a0-8928-5f25144b418f` |
| `request-INFORMATION_UPDATE-APPROVED` | WEBTEST 9191564a · INFORMATION_UPDATE — APPROVED | — | [Mở](http://localhost:5173/admin/requests?requestId=5e62e4e5-66d2-410d-86e2-f22dcf267dac) · `5e62e4e5-66d2-410d-86e2-f22dcf267dac` |
| `request-INFORMATION_UPDATE-REJECTED` | WEBTEST 9191564a · INFORMATION_UPDATE — REJECTED | — | [Mở](http://localhost:5173/admin/requests?requestId=57a17d4e-3e33-46a7-94be-29a383dc92ae) · `57a17d4e-3e33-46a7-94be-29a383dc92ae` |
| `request-INFORMATION_UPDATE-CANCELLED` | WEBTEST 9191564a · INFORMATION_UPDATE — CANCELLED | — | [Mở](http://localhost:5173/admin/requests?requestId=e0032313-7de8-4750-b123-66c6fd3f2a62) · `e0032313-7de8-4750-b123-66c6fd3f2a62` |
| `request-unassigned-address` | WEBTEST 9191564a · Đổi địa chỉ học sinh chưa phân tuyến | — | [Mở](http://localhost:5173/admin/requests?requestId=83a654c6-9d03-44d4-bc35-ee099e1f201b) · `83a654c6-9d03-44d4-bc35-ee099e1f201b` |
| `trip-sự cố thiếu nhân sự 1` | WEBTEST 9191564a · sự cố thiếu nhân sự 1 | 2026-11-25 | [Mở](http://localhost:5173/admin/trips/267dc774-dd39-4a76-ae37-0717d1575566) · `267dc774-dd39-4a76-ae37-0717d1575566` |
| `incident-ATTENDANT_MISSING` | WEBTEST 9191564a · ATTENDANT_MISSING | — | [Mở](http://localhost:5173/admin/incidents?incidentId=c7c86297-8709-485d-9418-de1a6177f990) · `c7c86297-8709-485d-9418-de1a6177f990` |
| `trip-sự cố thiếu nhân sự 2` | WEBTEST 9191564a · sự cố thiếu nhân sự 2 | 2026-11-26 | [Mở](http://localhost:5173/admin/trips/6c82aaec-1e50-40d6-9ffa-4f8b3c105b6f) · `6c82aaec-1e50-40d6-9ffa-4f8b3c105b6f` |
| `incident-DRIVER_MISSING` | WEBTEST 9191564a · DRIVER_MISSING | — | [Mở](http://localhost:5173/admin/incidents?incidentId=9f4a25d3-0d80-4c32-9e0c-dc5a441532a2) · `9f4a25d3-0d80-4c32-9e0c-dc5a441532a2` |
| `incident-OFF_ROUTE` | WEBTEST 9191564a · OFF_ROUTE | — | [Mở](http://localhost:5173/admin/incidents?incidentId=3a92be92-581c-4130-baa0-a3b620fe8213) · `3a92be92-581c-4130-baa0-a3b620fe8213` |
| `incident-LATE_STOP` | WEBTEST 9191564a · LATE_STOP | — | [Mở](http://localhost:5173/admin/incidents?incidentId=8495bd18-604e-4d2e-987a-5d9cf90a4421) · `8495bd18-604e-4d2e-987a-5d9cf90a4421` |
| `incident-NO_GUARDIAN_AT_STOP` | WEBTEST 9191564a · NO_GUARDIAN_AT_STOP | — | [Mở](http://localhost:5173/admin/incidents?incidentId=c6f592e2-7fb0-4425-a4ea-f1fcadee07b1) · `c6f592e2-7fb0-4425-a4ea-f1fcadee07b1` |
| `incident-TRAFFIC_DELAY` | WEBTEST 9191564a · TRAFFIC_DELAY | — | [Mở](http://localhost:5173/admin/incidents?incidentId=2367cd15-2816-4933-95b2-63389076b224) · `2367cd15-2816-4933-95b2-63389076b224` |
| `incident-GPS_SIGNAL_LOST` | WEBTEST 9191564a · GPS_SIGNAL_LOST | — | [Mở](http://localhost:5173/admin/incidents?incidentId=86c584c4-da50-4602-a8ce-48fd490dc41e) · `86c584c4-da50-4602-a8ce-48fd490dc41e` |
| `incident-history-0` | WEBTEST 9191564a · Sự cố nhân sự — RESOLVED | — | [Mở](http://localhost:5173/admin/incidents?incidentId=83773adb-1d42-4803-ad44-fcee0474f2bb) · `83773adb-1d42-4803-ad44-fcee0474f2bb` |
| `incident-history-1` | WEBTEST 9191564a · Sự cố nhân sự — CLOSED | — | [Mở](http://localhost:5173/admin/incidents?incidentId=3c5ee54c-2c1a-4c8e-ade7-56f68a5d981d) · `3c5ee54c-2c1a-4c8e-ade7-56f68a5d981d` |
| `change-0` | WEBTEST 9191564a · SCHEDULE — PENDING | 2026-11-20 | [Mở](http://localhost:5173/admin/schools/b2ddbe59-6e26-42e7-9b58-f167f743f024) · `936c4080-fc8d-4dee-a669-9c73542e65ed` |
| `change-1` | WEBTEST 9191564a · LOCATION — PENDING | 2026-11-27 | [Mở](http://localhost:5173/admin/schools/b2ddbe59-6e26-42e7-9b58-f167f743f024) · `e1f6fac6-e301-478d-95ca-0e964e25bade` |
| `change-2` | WEBTEST 9191564a · INACTIVE — PENDING | 2026-12-11 | [Mở](http://localhost:5173/admin/schools/b2ddbe59-6e26-42e7-9b58-f167f743f024) · `9a50580c-403b-4268-94a4-c283dfc9e386` |
| `change-3` | WEBTEST 9191564a · INACTIVE — CANCELLED | 2026-12-06 | [Mở](http://localhost:5173/admin/schools/b2ddbe59-6e26-42e7-9b58-f167f743f024) · `95d75a85-4506-4131-9a85-90d4b7ed4262` |
| `change-4` | WEBTEST 9191564a · SCHEDULE — APPLIED | 2026-10-27 | [Mở](http://localhost:5173/admin/schools/b2ddbe59-6e26-42e7-9b58-f167f743f024) · `160b6e3a-48d2-4be4-84ed-4ebd5edb1253` |
| `change-5` | WEBTEST 9191564a · LOCATION — FAILED | 2026-11-04 | [Mở](http://localhost:5173/admin/schools/b2ddbe59-6e26-42e7-9b58-f167f743f024) · `676222d6-fb86-4a5e-919c-014b0a7bc4f1` |
| `calendar-0` | WEBTEST 9191564a · HOLIDAY APPROVED SOLAR ONCE | — | [Mở](http://localhost:5173/admin/calendar) · `1d013f32-ce0d-43b3-8787-fc121062542a` |
| `calendar-1` | WEBTEST 9191564a · HOLIDAY APPROVED SOLAR ANNUAL | — | [Mở](http://localhost:5173/admin/calendar) · `24a60ec0-64f3-4753-8891-4b35ec1ce138` |
| `calendar-2` | WEBTEST 9191564a · HOLIDAY APPROVED LUNAR ANNUAL | — | [Mở](http://localhost:5173/admin/calendar) · `372b1534-faf3-47e2-ad3e-fd4773461127` |
| `calendar-3` | WEBTEST 9191564a · HOLIDAY CANCELLED SOLAR ONCE | — | [Mở](http://localhost:5173/admin/calendar) · `f980b568-2492-4d18-9904-9007b10e582e` |
| `calendar-4` | WEBTEST 9191564a · MAKEUP PENDING SOLAR ONCE | — | [Mở](http://localhost:5173/admin/calendar) · `66e9c94d-510d-4f3c-bc9b-2c54c9ef560f` |
| `calendar-5` | WEBTEST 9191564a · MAKEUP APPROVED SOLAR ONCE | — | [Mở](http://localhost:5173/admin/calendar) · `4bf0a82a-0526-4c10-ad3e-722e9f222d95` |
| `calendar-6` | WEBTEST 9191564a · MAKEUP REJECTED SOLAR ONCE | — | [Mở](http://localhost:5173/admin/calendar) · `96ea8b2c-37fa-4260-906b-38ab0816b3de` |
| `calendar-7` | WEBTEST 9191564a · MAKEUP CANCELLED SOLAR ONCE | — | [Mở](http://localhost:5173/admin/calendar) · `8fb171d8-8abc-4526-af6f-fca029b522f5` |
| `calendar-operator` | WEBTEST 9191564a · Ngày nghỉ nhà xe năm 2098 — không ảnh hưởng lịch hiện tại | — | [Mở](http://localhost:5173/admin/calendar) · `7c09972e-e947-45e2-b935-0d17ff8b889c` |
