# Kế hoạch giới hạn ngày nghỉ một lần của trường theo hợp đồng

## 1. Quy tắc nghiệp vụ

Áp dụng khi tạo ngày nghỉ có kind=HOLIDAY, recurrence=ONCE và schoolId. Áp dụng cho SCHOOL_ADMIN của đúng trường và SYSTEM_ADMIN khi tạo lịch riêng của một trường. Giữ phân quyền hiện hành.

Ngày nghỉ phải thuộc khoảng từ ngày muộn hơn giữa ngày mai theo giờ Việt Nam và ngày bắt đầu hợp đồng, đến hết ngày kết thúc hợp đồng. Tính cả hai đầu mốc. Với âm lịch, dùng ngày dương thực tế sau khi quy đổi UTC+7.

Ví dụ hôm nay là 15/11/2026 và hợp đồng 14–21/11/2026. Ngày nghỉ một lần hợp lệ trong khoảng 16–21/11/2026. Nếu hợp đồng kết thúc hôm nay hoặc sớm hơn, trường không còn ngày hợp lệ để thêm trong kỳ.

Ngày nghỉ hằng năm của trường, ngày nghỉ nhà xe và học bù theo quy tắc riêng hiện hành. Cảnh báo lịch trùng vẫn là thông tin. Quy tắc mới áp dụng cho thao tác tạo mới. Các bản ghi đã lưu giữ nguyên theo hành vi hiện tại, kể cả ngày đã nằm ngoài hợp đồng cũ. Không xử lý lại bản ghi hoặc chuyến cũ trong lượt này.

## 2. Web Admin

- Dùng contractStartDate và contractEndDate đã truyền vào ServiceCalendarForm từ trang Lịch vận hành và hồ sơ trường. Chỉ dùng khoảng hợp đồng ở chế độ Ngày nghỉ một lần của trường. Dùng cùng điều kiện cho Calendar, nhập tay dương lịch và ngày dương quy đổi từ âm lịch. So theo ngày YYYY-MM-DD, chuyển sang ngày Calendar theo cùng quy ước với component để tránh lệch biên do giờ máy.
- Giữ modal hiện có. Ngay dưới ô «Ngày áp dụng», hiển thị «Chọn ngày từ DD/MM/YYYY đến DD/MM/YYYY». Khóa ngày ngoài khoảng và mở lịch ở tháng của ngày hợp lệ đầu tiên nếu chưa có lựa chọn hợp lệ. Ngày nhập tay hoặc quy đổi nằm ngoài khoảng có lỗi ngay cạnh ô ngày. Giữ các bước chỉnh sửa bản nháp, focus và điều hướng bàn phím hiện có.
- Nếu khoảng rỗng, hiển thị «Hợp đồng không còn ngày hợp lệ để thêm ngày nghỉ một lần» và vô hiệu nút lưu trong chế độ đó. Người dùng vẫn có thể chuyển chế độ hoặc đóng modal. Nếu thiếu cận hợp đồng, dùng API đọc hiện có hoặc cho tải lại để lấy dữ liệu trước khi cho gửi. Nếu hợp đồng đã đổi lúc modal đang mở và API từ chối, giữ bản nháp và cho người dùng cập nhật dữ liệu hợp đồng.
- Giữ CalendarEntryInput, định dạng nhập hiện có và các giới hạn định dạng/ngày đang áp dụng. File chính là web/src/components/admin/schools/service-calendar-form.tsx. Chỉ chỉnh caller khi cần để lấy lại dữ liệu hợp đồng. Bố cục dựa trên wireframe modal đã trình, thêm dòng phạm vi hoặc thông báo khoảng rỗng vào ngay dưới ô ngày.

## 3. API và tài liệu FE

- Giữ POST /service-calendar, DTO và response thành công. Trong ServiceCalendarService.create, sau kiểm quyền, tái sử dụng truy vấn trường trong transaction hiện có để lấy hai mốc hợp đồng. Tính ngày áp dụng với calendarOccurrence và dùng vietnamToday, contractDate để kiểm cùng quy tắc trước khi ghi. Tái sử dụng khóa hiện có của thao tác tạo lịch và cập nhật hợp đồng.
- Ngày một lần không tồn tại hoặc không sau hôm nay giữ lỗi hiện hành. Với ngày nghỉ một lần của trường nằm ngoài hợp đồng, đề xuất HTTP 400 theo kiểu lỗi hiện có của NestJS, message «Ngày nghỉ một lần của trường phải nằm trong thời hạn hợp đồng». Giữ lỗi trường không tồn tại và phân quyền hiện hành. Khi hợp lệ trả 201 với bản ghi APPROVED như trước. Không thêm field hoặc migration.
- Cập nhật Swagger cho POST /service-calendar và mục 3 trong web/docs/school-lifecycle-usage.md. Ghi rõ client cũ vẫn gửi payload như trước và sẽ nhận 400 nếu gửi ngày nghỉ một lần ngoài hợp đồng. Kiểm contract OpenAPI trên API local theo quy tắc repo.

## 4. Nghiệm thu

1. Với ngày hiện tại 15/11 và hợp đồng 14–21/11, date picker chỉ cho chọn 16–21/11. Kiểm cận 16/11 và 21/11, ngày hôm nay, ngày 22/11 và trường hợp nhập tay ngoài khoảng.
2. Hợp đồng bắt đầu trong tương lai thì ngày bắt đầu là cận dưới nếu muộn hơn ngày mai. Kiểm hợp đồng hết hôm nay, chỉ còn đúng một ngày, ngày âm quy đổi đúng hai biên, tháng nhuận theo quy tắc hiện có và máy ở múi giờ khác Việt Nam.
3. Đối chiếu SCHOOL_ADMIN đúng trường và SYSTEM_ADMIN tạo nghỉ cho trường. Kiểm ngày nghỉ hằng năm, nghỉ nhà xe, học bù và cảnh báo trùng giữ hành vi hiện hành.
4. Đối chiếu contract FE/API và Swagger. Kiểm thay đổi hợp đồng giữa lúc mở modal và lúc gửi. Chạy typecheck Web và API bằng npx --no-install tsc --noEmit cùng git diff --check. Tuân thủ yêu cầu PO về script test và Test Data Policy. Chỉ xác minh request ghi khi được PO cho phép riêng, ghi rõ phần runtime chưa xác minh.

## Prompt cho Antigravity

> Sau khi PO xác nhận plan, triển khai docs/ai-review/school-one-off-holiday-contract-plan.md. Đọc AGENTS.md, các tài liệu nền và web/AGENTS.md. Kiểm tra git status và bảo toàn các thay đổi đang có.
>
> Chỉ giới hạn khi tạo HOLIDAY + ONCE có schoolId. Khoảng hợp lệ là từ max(ngày mai theo giờ Việt Nam, ngày bắt đầu hợp đồng) đến hết ngày kết thúc hợp đồng, gồm hai cận. Áp dụng cùng quy tắc cho date picker, nhập tay, ngày âm sau quy đổi UTC+7 và validation tại POST /service-calendar. Hiện khoảng hợp lệ ngay dưới ô ngày, báo khi khoảng rỗng và giữ bản nháp nếu API từ chối do dữ liệu hợp đồng đã đổi.
>
> Tái sử dụng dữ liệu hợp đồng đã có trên Web và kiểm lại hợp đồng trong transaction trên API. Giữ endpoint, DTO và response thành công. Ngày ngoài hợp đồng trả HTTP 400 với message đã nêu trong plan. Giữ hành vi ngày nghỉ hằng năm, nghỉ nhà xe, học bù, cảnh báo trùng và bản ghi cũ.
>
> Cập nhật Swagger và web/docs/school-lifecycle-usage.md. Nghiệm thu theo mục 4, kiểm Swagger local, chạy typecheck Web/API và git diff --check. Tuân thủ chỉ thị PO về script test, dữ liệu, env, dependency và Git. Cập nhật báo cáo 13 mục và diff của lượt thực thi rồi dừng.
