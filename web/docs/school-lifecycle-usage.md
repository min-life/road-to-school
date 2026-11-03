# Vòng đời trường học — thay đổi Web và cách sử dụng

Đối chiếu source API commit `de2e301` (`feat: improve school lifecycle`), ngày 03/11/2026.
Web chỉ gọi contract đã có; không thay backend, schema, dữ liệu hoặc quyền nghiệp vụ.

## 1. Màn hình và công dụng

| Màn hình | Vai trò | Thay đổi / công dụng |
| --- | --- | --- |
| Trường học → Ngừng hoạt động | Nhà xe | Chọn ngày hiệu lực từ ngày mai đến cuối hợp đồng. Lưu lịch hẹn; không báo trường đã ngừng ngay. Kích hoạt lại không tự hủy lịch hẹn tương lai. |
| Chi tiết trường → Chỉnh sửa trường & vị trí | Nhà xe | Ngày áp dụng cho thay đổi vị trí/lịch tuần. Thông báo theo response thực tế. Hợp đồng được gia hạn theo kiểm tra nguồn lực của API. |
| Chi tiết trường → Lịch vận hành | Nhà xe | Xem lịch hẹn, trạng thái áp dụng, ngày nghỉ và học bù. Hủy lịch hẹn còn hợp lệ, duyệt/từ chối đề nghị học bù. |
| Cài đặt → Lịch dịch vụ | Nhà xe / Trường | Nhà xe quản lý ngày nghỉ chung, xem và duyệt học bù các trường. Trường tạo ngày nghỉ riêng, gửi đề nghị học bù và xem lịch hẹn trường mình. |
| Chi tiết trường → Lịch học, Xem lịch tháng | Nhà xe | Lịch dự kiến kết hợp lịch tuần, hợp đồng, thay đổi đã hẹn, ngày nghỉ và học bù đã duyệt. Âm lịch Việt Nam UTC+7, phân biệt tháng nhuận. |
| Danh sách/chi tiết phương án và tuyến | Cả hai | Hiển thị `effectiveStatus`; không cho phân công/duyệt phương án không còn hiệu lực. Giữ thiết kế phân công System Admin đã khôi phục. |
| Chuyến xe → Cần xử lý hành chính | Nhà xe | Danh sách chuyến API yêu cầu xử lý, phân trang cục bộ. Xem chi tiết hoặc chọn trạng thái cuối và ghi lý do. |
| Chi tiết chuyến | Cả hai, theo quyền | Hiển thị dấu vết xử lý hành chính; chặn đổi phân công khi chưa xác minh được điều kiện hoặc chuyến bị chặn. Nhà xe có lối sang danh sách xử lý. |

Trong **Lịch vận hành**, mặc định mở **Ngày nghỉ & học bù**. Chuyển sang **Thay đổi đã hẹn** để xem lịch thay đổi cấu hình; huy hiệu chỉ đếm thay đổi đang chờ áp dụng. Chỉ một khối hiển thị mỗi lần; đổi tab không gửi lại request hoặc mất trạng thái đã tải.

## 2. Hẹn thay đổi trường và gia hạn

1. Vào **Trường học → Chi tiết → Chỉnh sửa trường & vị trí**.
2. Sửa vị trí hoặc lịch học, chọn **Ngày áp dụng thay đổi vị trí / lịch học** trong giới hạn hợp đồng hiện tại, rồi lưu.
3. Vào **Lịch vận hành → Thay đổi đã hẹn** để kiểm tra ngày, nội dung và trạng thái.
4. Nếu cần hủy trước ngày hiệu lực, chọn **Hủy lịch hẹn** và xác nhận. Hủy hẹn không phục hồi chuyến đã hủy.

Với gia hạn khi đã có phương án chưa duyệt/đang hoạt động: giữ ngày bắt đầu,
kéo dài ngày kết thúc; API kiểm tra xe/tài xế/giáo viên. Gia hạn không khôi phục
phương án hết hiệu lực hoặc đã hủy. Nếu muốn hẹn ngày sau cuối hợp đồng hiện tại,
lưu gia hạn thành công trước rồi mở lại form để hẹn thay đổi.

Các phần vị trí, lịch tuần, hợp đồng dùng request riêng. Nếu chỉ lưu được một phần,
Web đóng form, tải lại thông tin và hiện cảnh báo phần đã lưu/phần chưa lưu;
kiểm tra lịch hẹn trước khi gửi lại, không tự động lặp request.

## 3. Ngày nghỉ và học bù

**Nhà xe:** Cài đặt → Lịch dịch vụ → **Thêm ngày nghỉ nhà xe** để áp dụng chung.
Muốn ngày nghỉ riêng một trường: Trường học → Chi tiết → Lịch vận hành → **Thêm lịch**.

**Trường:** Cài đặt → Lịch dịch vụ → **Thêm lịch**. Chọn ngày nghỉ hoặc đề nghị học bù,
nhập ngày dương/âm lịch; học bù cần khung giờ và chỉ áp dụng một lần. Ngày nghỉ
được áp dụng theo quyền; học bù ở trạng thái chờ nhà xe duyệt.

Cách nhập ngày: **Dương lịch · Một lần** dùng ô lịch Ngày áp dụng; **Hằng năm** chỉ chọn ngày/tháng (cho phép 29/02). **Âm lịch** chọn ngày, tháng, tháng nhuận và năm khi áp dụng một lần; xem ngày dương tương ứng bên dưới. Với âm lịch hằng năm, phần quy đổi minh họa cho năm âm lịch hiện tại, không cố định ngày dương cho mọi năm. Payload gửi API vẫn là day/month/year như trước.

**Duyệt học bù:** Nhà xe mở Cài đặt → Lịch dịch vụ → **Chỉ chờ duyệt** → Duyệt/Từ chối.
Từ chối cần lý do. Học bù trùng ngày nghỉ nhà xe bị chặn; học bù đã duyệt có thể
chuyển sang “Bị chặn” nếu nhà xe bổ sung ngày nghỉ sau đó. Ngày nghỉ nhà xe ưu tiên
cao nhất; học bù đã duyệt ưu tiên hơn ngày nghỉ riêng của trường.

Hủy ngày nghỉ còn hợp lệ không tự phục hồi chuyến đã hủy. Cần dùng thao tác sinh
chuyến hiện có sau khi kiểm tra điều kiện vận hành. Lịch tháng là **dự kiến theo
cấu hình hiện tại**, không phải lịch sử điểm danh hoặc lịch sử chuyến.

## 4. Phương án và phân công

- `DRAFT`: **Chưa duyệt**; `ACTIVE`: **Đang hoạt động**.
- Nhãn và quyền thao tác ưu tiên `effectiveStatus`; trạng thái lưu `status` được giữ nguyên.
- Bộ lọc danh sách API vẫn lọc trạng thái lưu. Khi có bộ lọc, Web nhắc rõ sự khác biệt này.
- Nhà xe phân xe/tài xế; trường phân giáo viên và duyệt. Không cấp quyền duyệt cho nhà xe.
- Phương án hết hạn hoặc mất hiệu lực chỉ còn tra cứu; xem nguyên nhân trên chi tiết.

## 5. Kết thúc hành chính chuyến

1. Nhà xe vào **Chuyến xe → Cần xử lý hành chính**.
2. Mở **Chi tiết** để kiểm tra chuyến/điểm danh trước khi quyết định.
3. Chọn **Xử lý**, chọn Đã hủy hoặc Đã hoàn thành, nhập lý do, xác nhận.
4. Nếu API báo trạng thái đã thay đổi, danh sách được tải lại; đóng dialog và kiểm tra
   chuyến mới nhất. Web không tự gửi lại thao tác.

Hoàn thành hành chính **không tạo điểm danh, không xác nhận học sinh xuống xe,
không tự ghi giờ kết thúc thực tế**. Đây là quyết định trạng thái cuối có lưu audit.

## 6. File để bảo trì

| Phần | File chính dưới `web/` |
| --- | --- |
| Contract và request | `src/lib/school-lifecycle.ts`, `api-client.ts`, `types.ts` |
| Tính lịch âm/dương | `src/lib/service-calendar.ts`, `amlich.d.ts`, `service-calendar.test.ts` |
| Lịch hẹn, ngày nghỉ/học bù | `src/components/admin/schools/school-scheduled-changes.tsx`, `service-calendar-panel.tsx`, `service-calendar-form.tsx` |
| Dialog và style | `src/components/admin/common/lifecycle-dialog.tsx`, `lifecycle.css` |
| Chỉnh sửa/lịch trường | `src/app/admin/schools/[id]/_components/edit-school-modal.tsx`, `school-schedule.tsx` |
| Hiệu lực phương án | `src/app/admin/routes/`, `src/components/admin/routes/school-route-plan-approval.tsx` |
| Kết thúc chuyến | `src/app/admin/trips/_components/admin-finalizations-panel.tsx`, `trips/[id]/page.tsx` |

## 7. Giới hạn kiểm chứng tại thời điểm triển khai

- API đang chạy ở `localhost:3000/api/docs-json` công bố 131 path nhưng chưa có
  scheduled-changes/service-calendar/admin-finalization. Chưa xác nhận được luồng tích hợp live.
- Source `api/src/schools/service-calendar.ts` so sánh `Number(entry.leapMonth)`
  với `value.lunarLeap`, trong khi `amlich.js@1.0.6` trả boolean. Chạy helper thuần
  cho 01/01 âm lịch 2026 → 17/02/2026 cho kết quả API `false`/`null`.
  Web chuẩn hóa boolean đúng; backend được giữ nguyên theo phạm vi. Cần sửa lỗi này
  trước khi coi lịch âm lịch và quy tắc vận hành API đã đồng nhất.
- Chưa gửi mutation thử nghiệm, không tạo dữ liệu/seed/migrate. Thành công build/unit
  không phải bằng chứng các thao tác ghi dữ liệu đã chạy trên môi trường hiện tại.

## 8. Rà soát School Admin — 03/11/2026

Phạm vi: lịch vận hành, không phải toàn bộ API các module School Admin.

| Chức năng | API (sau /api/v1) | Binding hiện tại |
| --- | --- | --- |
| Lịch nghỉ trường + lịch nhà xe, trạng thái học bù | GET /service-calendar?schoolId=... | Đã gắn trong ServiceCalendarPanel |
| Tạo ngày nghỉ hoặc đề nghị học bù | POST /service-calendar | Đã gắn trong ServiceCalendarForm; schoolId từ tài khoản |
| Hủy ngày nghỉ trường còn hợp lệ | POST /service-calendar/:id/cancel | Đã gắn; không hủy ngày nghỉ nhà xe, không hủy học bù |
| Xem thay đổi trường đã hẹn | GET /schools/:schoolId/scheduled-changes | Đã gắn, School Admin chỉ xem |
| Lấy lịch tuần, hợp đồng, thông tin trường mình | GET /schools/:id/settings | Backend đã có, Web chưa gắn |
| Duyệt/từ chối học bù | POST /service-calendar/:id/decision | System Admin thực hiện; không thiếu bên School Admin |
| Hủy lịch thay đổi trường | POST /schools/:schoolId/scheduled-changes/:id/cancel | System Admin thực hiện; không cấp cho School Admin |

Hiện School Admin mở Cài đặt → Lịch dịch vụ, thấy hai khối xếp dọc. Wrapper hai tab
SchoolOperatingCalendar mới chỉ nằm trong schools/[id] của nhà xe. School Admin chưa
có lịch tuần/tháng tổng hợp và chưa có điểm vào Lịch vận hành rõ ràng trên menu.

Để làm giao diện School Admin: gắn GET settings để lấy lịch tuần/hợp đồng (không gọi
GET /schools/:id vì controller route đó chỉ cấp System Admin); chuyển wrapper lịch
vận hành sang shared rồi tái sử dụng hai tab và các panel sẵn có. Giữ lịch nhà xe
chỉ xem, đề nghị học bù chờ nhà xe duyệt, lịch hẹn chỉ xem.

System Admin nên dùng nhãn Thêm ngày nghỉ khi không có quyền tạo học bù; hiện nhãn
Thêm lịch/tiêu đề học bù chung dễ gây hiểu nhầm dù quyền gửi request đã đúng.

Các notification target SCHEDULE hiện được backend dẫn sang /admin/trips, chưa tới
đúng lịch/ngày nghỉ hoặc đề nghị học bù; cần đối chiếu luồng thông báo khi triển khai.

Live Swagger đã có các endpoint lifecycle trong lần kiểm tra này. Chưa đăng nhập
School Admin hoặc gửi mutation để xác nhận end-to-end. Source API vẫn có lỗi so sánh
lunarLeap số/boolean đã nêu ở mục 7; không xác nhận lịch âm đã vận hành đúng.
