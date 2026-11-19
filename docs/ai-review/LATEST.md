# Xuất HTTP handler NestJS cho Vercel

## 1. Thông tin

20/11/2026 · API.

## 2. Yêu cầu

Khắc phục lỗi Vercel không tìm thấy export trong `src/main.js`.

## 3. Phạm vi

Entrypoint NestJS của API chính.

## 4. Quyết định

Dùng chung cấu hình NestJS cho tiến trình local và HTTP handler do Vercel gọi.

## 5. Triển khai

Xuất default HTTP handler, khởi tạo NestJS khi có request đầu tiên và tái sử dụng giữa các request. Khi khởi động thất bại, trả 503 và cho lần gọi sau thử lại. Chế độ chạy trực tiếp vẫn mở cổng HTTP và đăng ký shutdown hooks.

## 6. Cơ sở dữ liệu

Giữ nguyên kết nối Prisma. Không cần migration.

## 7. API và Swagger

Giữ đường dẫn, DTO và xác thực. Khi lỗi khởi động, handler ghi chi tiết vào log và trả 503 tổng quát.

## 8. Giao diện

Thay đổi ở lớp khởi động API.

## 9. Kiểm chứng

Typecheck, Nest build và 5 unit test đạt. JavaScript sau build xuất được default handler. GET health và Swagger trên API cục bộ đều trả HTTP 200.

## 10. Giới hạn

Chưa kiểm tra deployment mới trên Vercel. Thay đổi tập trung vào HTTP handler.

## 11. Điểm cần review

Đảm bảo Vercel dùng đúng project `api` và chạy commit chứa handler mới.

## 12. Bước tiếp theo

Triển khai bản sửa và gọi `/api/v1/health` trên Vercel.

## 13. Trạng thái

Đã sửa trong workspace.

---

# Nạp thư viện lịch âm trên Vercel

## 1. Thông tin

20/11/2026 · API.

## 2. Yêu cầu

Sửa lỗi `Cannot find module 'amlich.js'` khi Vercel khởi động API.

## 3. Phạm vi

Chỗ nạp thư viện trong module lịch vận hành và khai báo kiểu TypeScript.

## 4. Quyết định

Dùng import tĩnh để công cụ đóng gói nhận ra thư viện đã có trong dependencies.

## 5. Triển khai

Chuyển sang default import cho package CommonJS `amlich.js` và khai báo hai hàm lịch được sử dụng.

## 6. Cơ sở dữ liệu

Thay đổi chỉ liên quan đến nạp module. Không cần migration.

## 7. API và Swagger

Giữ nguyên API. Swagger local trả HTTP 200.

## 8. Giao diện

Thay đổi thuộc bước khởi động API.

## 9. Kiểm chứng

Typecheck và Nest build đạt. JavaScript sau build giữ import tĩnh. Node nạp được module và cho kết quả đối chiếu bằng bản gốc trên các mẫu lịch.

## 10. Giới hạn

Chưa kiểm chứng trên Vercel. Kiểm tra đối chiếu cho thấy quy đổi mùng 1 tháng Giêng âm lịch 2026 trả `null` trên cả bản gốc và bản sửa.

## 11. Điểm cần review

Xác nhận Vercel đóng gói package trong deployment mới.

## 12. Bước tiếp theo

Triển khai bản sửa lên Vercel và gọi `/api/v1/health`.

## 13. Trạng thái

Đã sửa trong workspace và kiểm tra bản build cục bộ.

---

# Cấu hình CORS bằng biến môi trường

## 1. Thông tin

20/11/2026 · API và IoT.

## 2. Yêu cầu

Đọc danh sách origin CORS từ biến môi trường.

## 3. Phạm vi

HTTP API chính, HTTP của runtime IoT và Socket.IO `/iot`.

## 4. Quyết định

`CORS_ALLOWED_ORIGINS` nhận các origin phân cách bằng dấu phẩy. Mỗi origin phải khớp chính xác. Biến trống hoặc chưa được đặt không cấp quyền CORS.

## 5. Triển khai

Dùng chung bộ kiểm tra origin cho HTTP và handshake WebSocket. Thêm cấu hình mẫu và tài liệu chạy cục bộ. Khai báo hai origin localhost trong file môi trường cục bộ nếu biến chưa tồn tại.

## 6. Cơ sở dữ liệu

Thay đổi cấu hình ứng dụng. Không có migration.

## 7. API và Swagger

Thay đổi chính sách origin ở tầng kết nối. DTO, route và cơ chế xác thực giữ nguyên. Swagger local trả HTTP 200.

## 8. Giao diện

Web Admin tiếp tục gọi API bằng URL đã cấu hình. Origin của Web Admin được khai báo ở phía API.

## 9. Kiểm chứng

Typecheck API và 18 kiểm thử đạt. Preflight trên API local trả 204 và header CORS cho localhost. Origin ngoài danh sách trả 404 và không có header CORS.

## 10. Giới hạn

Handshake Socket.IO được kiểm tra bằng unit test. Chưa kiểm thử kết nối Socket.IO trên môi trường triển khai.

## 11. Điểm cần review

Origin bao gồm giao thức, host và port. Client Socket.IO không gửi Origin vẫn phải xác thực theo luồng hiện hành.

## 12. Bước tiếp theo

Đặt `CORS_ALLOWED_ORIGINS` trên Vercel cho API bằng origin Web Admin và triển khai lại.

## 13. Trạng thái

Đã triển khai trong workspace.

---

# Giữ cảnh báo không có người đón sau khi kết thúc chuyến

## 1. Thông tin

20/11/2026 · API và Mobile.

## 2. Yêu cầu

Cho giáo viên ghi nhận học sinh đã xuống xe để tài xế có thể hoàn thành chuyến. Giữ cảnh báo cho phụ huynh trong thời gian sự cố còn mở.

## 3. Phạm vi

Hoàn thành chuyến chiều về và thẻ chuyến trên Trang chủ phụ huynh.

## 4. Quyết định

Trạng thái xuống xe, trạng thái chuyến và trạng thái sự cố được cập nhật độc lập. Thẻ có báo cáo còn mở tiếp tục xuất hiện khi Trang chủ chuyển sang ngày phục vụ khác.

## 5. Triển khai

Dùng báo cáo còn mở của đúng học sinh để bật nhãn trên thẻ. Bảo vệ báo cáo khỏi thao tác tự đóng sự cố khi hoàn thành chuyến. Luồng điểm danh hiện có vẫn yêu cầu giáo viên xác nhận đã xuống xe.

## 6. Cơ sở dữ liệu

Dùng trường trạng thái và ngữ cảnh học sinh của sự cố hiện có. Không cần migration.

## 7. API và Swagger

Cập nhật mô tả endpoint Trang chủ phụ huynh và ý nghĩa của cờ `noGuardianAtStop`. Swagger local tải được và JSON chứa cả hai mô tả mới.

## 8. Giao diện

Dùng lại nhãn “Không có người đón” trên mặt thẻ và nhãn điểm danh “Đã xuống xe”. Thẻ có thể hiện cả hai trạng thái.

## 9. Kiểm chứng

Typecheck API và Mobile đạt. 61 bài kiểm thử luồng chuyến và sự cố đạt, gồm các trường hợp xuống xe và hoàn thành, cảnh báo qua ngày, phạm vi từng học sinh và lọc sự cố đã đóng. Bảy bài kiểm thử khóa chuyến trong bộ kiểm thử mở rộng thất bại cả trên bản gốc.

## 10. Giới hạn

Chưa kiểm chứng luồng ghi dữ liệu trên thiết bị thật.

## 11. Điểm cần review

Trạng thái cảnh báo cập nhật khi Trang chủ nhận dữ liệu mới sau khi quản trị viên đóng báo cáo.

## 12. Bước tiếp theo

Kiểm tra trên tài khoản phụ huynh khi quản trị viên đóng một báo cáo đang mở.

## 13. Trạng thái

Đã triển khai.

---

# Mật khẩu và OTP mặc định trong chế độ console

## 1. Thông tin

20/11/2026 · API.

## 2. Yêu cầu

Dùng `Pass@123` cho tài khoản nhân viên và `000000` cho OTP khi gửi qua console.

## 3. Phạm vi

Tạo hoặc cấp lại mật khẩu tài xế, quản trị trường và giáo viên phụ trách. Áp dụng cho bốn luồng phát OTP dùng chung trong API.

## 4. Quyết định

Dùng cấu hình kênh gửi hiện hành. Chỉ dùng OTP cố định khi mọi kênh nhận của cùng yêu cầu đều là console. SMTP và eSMS tiếp tục dùng giá trị ngẫu nhiên. Cấu hình console trên production vẫn bị từ chối.

## 5. Triển khai

Gom phát sinh mật khẩu nhân viên vào `PersonnelCredentialsService`. Truyền các kênh gửi thực tế cho bộ sinh OTP để chọn mã trước khi băm và lưu thử thách.

## 6. Cơ sở dữ liệu

Tiếp tục lưu mật khẩu và OTP dưới dạng đã băm. Thay đổi có hiệu lực ở lần tạo, cấp lại mật khẩu hoặc yêu cầu OTP mới. Không cần migration.

## 7. API và Swagger

DTO và mã phản hồi giữ nguyên. Trang Swagger và tài liệu JSON cục bộ đều trả HTTP 200.

## 8. Giao diện

Các màn hình hiện tại tiếp tục dùng cùng luồng nhập mật khẩu và OTP.

## 9. Kiểm chứng

Typecheck API đạt. Nhóm test Auth, Driver và School có 118 bài đạt và 35 bài lỗi. Cả 35 lỗi xuất hiện trên bản gốc `d953551`, vốn có 36 bài lỗi. Các bài kiểm tra mới và bài kiểm tra tạo quản trị trường đã cập nhật đều đạt.

## 10. Giới hạn

Chưa thử cấp tài khoản hoặc OTP qua API thật để tránh ghi dữ liệu kiểm thử vào cơ sở dữ liệu.

## 11. Điểm cần review

Đối chiếu cấu hình kênh khi một yêu cầu OTP có cả email và SMS.

## 12. Bước tiếp theo

Yêu cầu OTP mới trong môi trường console để sử dụng mã mặc định.

## 13. Trạng thái

Đã triển khai và kiểm chứng bằng test dùng mô phỏng cơ sở dữ liệu.

---

# Dọn dữ liệu môi trường cục bộ

## 1. Thông tin

PostgreSQL và MongoDB cục bộ · Đã hoàn thành.

## 2. Yêu cầu

Xóa dữ liệu ngoài tài khoản System Admin, Driver, Parent, phương tiện, thiết bị IoT và liên kết IoT–xe.

## 3. Phạm vi

PostgreSQL `roadtoschool` và MongoDB `road_to_school_iot` trên loopback.

## 4. Quyết định

Kiểm tra bản sao lưu trước khi xóa. Giữ khóa tài khoản, mật khẩu, ID thiết bị và liên kết đang hiệu lực.

## 5. Thực hiện

Xóa dữ liệu nghiệp vụ trong một transaction PostgreSQL. Dọn lịch sử quẹt và phiên đăng ký trong MongoDB. Xóa tham chiếu chuyến đã cũ khỏi trạng thái thiết bị.

## 6. Cơ sở dữ liệu

Giữ 1 System Admin, 2 Driver, 1 Parent, 2 phương tiện, 2 thiết bị IoT và 2 liên kết. Xóa phiên đăng nhập, trường, học sinh, chuyến, nhật ký và cấu hình bãi xe.

## 7. API và Swagger

Không có thay đổi hợp đồng API.

## 8. Giao diện

Phiên cũ đã bị xóa. Các tài khoản được giữ lại có thể đăng nhập lại.

## 9. Kiểm chứng

Đọc lại hai cơ sở dữ liệu sau khi xóa. Cả hai liên kết đều trỏ đúng xe và thiết bị. Số trường, học sinh, chuyến, phiên đăng nhập, lượt quẹt và phiên đăng ký đều bằng 0.

## 10. Giới hạn

Thao tác giới hạn ở hai cơ sở dữ liệu cục bộ. Bản sao lưu được lưu ngoài workspace và có dữ liệu nhạy cảm.

## 11. Điểm cần review

Quyền đăng nhập và cấu hình lại bãi xe nếu vận hành tiếp trên môi trường đã dọn.

## 12. Bước tiếp theo

Đăng nhập lại vào ứng dụng bằng tài khoản được giữ.

## 13. Trạng thái

Hoàn thành và đã kiểm tra dữ liệu sau thao tác.

---

# Hiện tên học sinh trong báo cáo không có người đón

## 1. Thông tin

19/11/2026 · API và Mobile · Đã triển khai.

## 2. Yêu cầu

Phân biệt học sinh trên các báo cáo “Không có người đón” trong tab Sự cố của chuyến.

## 3. Phạm vi

Dòng báo cáo trong tab Sự cố và trường tên học sinh trên phản hồi API.

## 4. Quyết định

Đưa tên học sinh lên đầu dòng, giữ loại và trạng thái ở các nhãn bên dưới.

## 5. Triển khai

Tra tên theo studentId trong context của báo cáo và danh sách học sinh của chuyến. Dữ liệu cũ được tra theo cùng quy tắc. Báo cáo không khớp hiển thị “Học sinh chưa xác định”.

## 6. Cơ sở dữ liệu

Tái sử dụng danh sách học sinh trong chuyến. Không cần migration.

## 7. API và Swagger

Thêm `studentName` cho báo cáo không có người đón trong tab Sự cố và chi tiết sự cố. Swagger local trả 200.

## 8. Giao diện

Tab Sự cố hiển thị tên ở đầu dòng. Phụ huynh chỉ nhận tên con đã liên kết.

## 9. Kiểm chứng

17 kiểm thử sự cố, typecheck API/Mobile, Swagger và diff check đạt. Truy vấn chỉ đọc khớp tên học sinh cho cả 2 báo cáo hiện có.

## 10. Giới hạn

NOT_VERIFIED trực quan trên điện thoại. Không tạo hay sửa bản ghi kiểm thử.

## 11. Điểm cần review

Tên đúng với từng báo cáo cùng chuyến và phạm vi truy cập của phụ huynh.

## 12. Bước tiếp theo

Tải lại app và mở tab Sự cố của chuyến trong ảnh.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu.

---

# Báo không có người đón theo từng học sinh

## 1. Thông tin

19/11/2026 · API và Mobile · Đã triển khai.

## 2. Yêu cầu

Cho phép phụ xe báo các học sinh khác nhau trên cùng chuyến. Hiện cảnh báo ngay trên thẻ của học sinh mà phụ huynh đang theo dõi.

## 3. Phạm vi

Tạo báo cáo, quyền xem của phụ huynh và cảnh báo trên thẻ Trang chủ.

## 4. Quyết định

Mỗi học sinh có một báo cáo trong một chuyến. Gửi lại cho cùng học sinh trả báo cáo đã có. Thẻ hiện cảnh báo trong lúc sự cố mở và học sinh còn trên xe.

## 5. Triển khai

Dùng khóa theo chuyến, loại sự cố và học sinh. Tra cứu báo cáo cũ theo studentId trong context. API lọc danh sách và chi tiết sự cố theo con đã liên kết. Thẻ dùng cờ riêng từ Home Cards và cập nhật khi nhận thông báo hoặc ở lượt đồng bộ tiếp theo.

## 6. Cơ sở dữ liệu

Tái sử dụng context và dedupeKey. Không cần migration.

## 7. API và Swagger

Swagger local trả 200. Bổ sung cờ `noGuardianAtStop` vào ParentHomeCardItemDto. Mô tả API sự cố phản ánh báo cáo và phạm vi xem theo học sinh.

## 8. Giao diện

Nhãn “Không có người đón” nằm trên mặt thẻ thu gọn. Đồng bộ Trang chủ khi nhận thông báo đẩy nếu thiết bị hỗ trợ.

## 9. Kiểm chứng

59 kiểm thử API, typecheck API/Mobile, Swagger và diff check đạt. Truy vấn đọc PostgreSQL xác nhận tìm đúng báo cáo cũ theo studentId.

## 10. Giới hạn

NOT_VERIFIED trên điện thoại hoặc với thông báo đẩy thực tế. Kiểm thử chỉ dùng mock hoặc dữ liệu đọc.

## 11. Điểm cần review

Hai báo cáo trên một chuyến, gửi lại cho cùng học sinh và hai thẻ anh chị em cùng xe.

## 12. Bước tiếp theo

Nghiệm thu bằng một chuyến chiều về đang chạy có hai học sinh.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu.

---

# Tệp Excel nhập học sinh có địa chỉ và tọa độ

## 1. Task Information
19/11/2026 · API và Excel · Trích xuất dữ liệu · COMPLETED.

## 2. Original Request
Tạo Excel từ thông tin học sinh để nhập nhanh, gồm địa chỉ và tọa độ.

## 3. Approved Scope
Đọc dữ liệu học sinh hiện có và tạo một tệp Excel cục bộ theo định dạng import.

## 4. Analysis & Decisions
Cơ sở dữ liệu đang kết nối có 4 học sinh thuộc cùng một trường. Tệp dùng đúng 5 cột import và giữ dữ liệu từ cơ sở dữ liệu. Bản xuất của công cụ spreadsheet không được parser hiện tại nhận diện, nên tệp bàn giao dùng bộ sinh XLSX sẵn có của dự án.

## 5. Implementation Details
No application code changes. Tạo hoc-sinh-nhap-lai.xlsx bên ngoài repository.

## 6. Database Changes
None. Chỉ truy vấn đọc.

## 7. API & Swagger Changes
None.

## 8. UI/UX Changes
None.

## 9. Verification & Testing
Parser import đọc đúng hàng tiêu đề và 4 dòng dữ liệu. Đối chiếu từng ô với nguồn. Cả 4 dòng có địa chỉ và cặp tọa độ. Chưa chạy import ghi dữ liệu.

## 10. Issues & Risks
Tệp chứa dữ liệu học sinh. Kiểm tra trùng theo quy tắc import của trường đích khi dùng chức năng xem trước.

## 11. Reviewer Focus
Kiểm tra thứ tự 5 cột, định dạng số điện thoại và cặp vĩ độ, kinh độ.

## 12. Suggested Next Step
Dùng bước xem trước trong màn Nhập Excel của trường đích.

## 13. Approval Status
Hoàn tất tạo và xác minh tệp.

---

# Bỏ chức năng báo sự cố tắc đường

## 1. Thông tin

19/11/2026 · API, Mobile và Web · Đã triển khai.

## 2. Yêu cầu

Bỏ sự cố tắc đường.

## 3. Phạm vi

Tạo báo cáo mới và lựa chọn bộ lọc trên giao diện.

## 4. Quyết định

Giữ các bản ghi cũ trong lịch sử và cho phép quản trị viên xử lý báo cáo đã có.

## 5. Triển khai

Loại `TRAFFIC_DELAY` khỏi các lựa chọn tạo sự cố và chặn yêu cầu từ ứng dụng cũ. Bỏ nút báo tắc đường và lựa chọn lọc riêng.

## 6. Cơ sở dữ liệu

Giữ enum và các bản ghi hiện có. Không có migration.

## 7. API và Swagger

Swagger local trả 200. Danh sách loại sự cố có thể báo chỉ gồm thiếu phụ xe, thiếu tài xế và không có người đón.

## 8. Giao diện

Mobile bỏ nút báo tắc đường. Web và Mobile vẫn hiển thị bản ghi cũ khi xem tất cả sự cố.

## 9. Kiểm chứng

15 kiểm thử sự cố, typecheck API/Mobile/Web, lint trang sự cố Web, Swagger và diff check đều đạt.

## 10. Giới hạn

NOT_VERIFIED trực quan trên ứng dụng thật. Kiểm thử API dùng mock, không ghi dữ liệu.

## 11. Điểm cần review

Ứng dụng cũ gửi loại tắc đường bị từ chối trước khi ghi. Lịch sử và luồng đóng báo cáo cũ tiếp tục sử dụng được.

## 12. Bước tiếp theo

Tải lại ứng dụng để thấy tùy chọn báo cáo đã được cập nhật.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu.

---

# Điều hướng qua toàn bộ điểm còn lại

## 1. Thông tin

19/11/2026 · API và Mobile · Triển khai điều hướng, phân tích quy trình sự cố.

## 2. Yêu cầu

Định tuyến qua tất cả điểm và tiếp tục điều khiển tự động khi qua điểm học sinh. Giải thích báo cáo “Không có người đón”.

## 3. Phạm vi

Tuyến điều hướng, cập nhật điểm thực tế và ước tính. Báo cáo sự cố được đối chiếu trong mã nguồn.

## 4. Quyết định

Gửi điểm hiện tại và tất cả điểm còn lại theo thứ tự. Dùng các mốc VietMap và phép chiếu tuần tự khi thiếu chỉ dẫn qua điểm.

## 5. Triển khai

TEST_AUTO tiến đến cuối tuyến đã tải. Khi đi qua điểm học sinh, mobile cập nhật con trỏ và tiếp tục đi trên polyline hiện tại. Ước tính chuyển sang đúng điểm kế tiếp.

## 6. Cơ sở dữ liệu

Tái sử dụng trạng thái điều hướng và vị trí đã lưu. Không có migration hoặc ghi dữ liệu thử nghiệm.

## 7. API và Swagger

`POST /trips/:id/navigation/segment` hỗ trợ `keepGeometry` và `cursorOnly`. Swagger local trả 200 và hiển thị hai trường.

## 8. Giao diện

Giữ bộ điều khiển hiện tại. Bỏ chuyển tự động sang thủ công khi gần điểm đón hoặc trả.

## 9. Kiểm chứng

40 kiểm thử API và 47 kiểm thử Mobile đạt. Typecheck API/Mobile, Swagger và diff check đạt. Kiểm thử mô phỏng xác nhận xe qua điểm trả mà không đổi chế độ hoặc yêu cầu VietMap tính lại tuyến.

## 10. Giới hạn

NOT_VERIFIED trên thiết bị và với một tuyến VietMap thực tế. Luồng báo cáo hiện chỉ ghi nhận một sự cố không người đón cho mỗi chuyến do khóa theo chuyến và loại sự cố.

## 11. Điểm cần review

Thứ tự điểm qua VietMap, độ chính xác mốc trên polyline khi thiếu chỉ dẫn, và tính độc lập giữa cập nhật con trỏ với điểm danh.

## 12. Bước tiếp theo

Tải lại app và chạy một chuyến TEST qua ít nhất hai điểm học sinh.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu trên thiết bị.

---

# Khôi phục tự động di chuyển và đường hành trình

## 1. Thông tin

19/11/2026 · API và Mobile · Triển khai sửa lỗi điều hướng.

## 2. Yêu cầu

Sửa xe đứng yên khi chuyển từ lái thủ công sang tự động, thiếu ước tính và đường hành trình bị đứt ở chỗ đổi chế độ.

## 3. Phạm vi

Điều hướng giả lập khi chuyển chế độ, ước tính đến điểm tiếp theo và dựng đường từ lịch sử vị trí.

## 4. Quyết định

Dùng vị trí cục bộ mới nhất khi chuyển sang tự động. Nếu xe vừa tới đúng điểm học sinh trong phạm vi 10 m và con trỏ còn ở đó, chuyển sang điểm tiếp theo. Trong TEST, mỗi lần định tuyến lấy đúng một chặng.

## 5. Triển khai

Loại bỏ đoạn điều hướng cũ khi quay lại tự động, giữ đường đã đi và gửi vị trí bàn giao. Dùng điểm cuối chặng để tính ước tính. Lịch sử kiểm tra sequence, thời gian và mức dịch chuyển thay vì tách ở mọi lần đổi run.

## 6. Cơ sở dữ liệu

Tái sử dụng vị trí đã ghi. Không tạo migration hoặc ghi dữ liệu để kiểm chứng.

## 7. API và Swagger

`POST /trips/:id/navigation/segment` trả `targetAtRouteEnd` khi biết điểm đích là cuối polyline. Swagger local trả 200 và khai báo trường mới. Giữ token phiên để loại yêu cầu của chế độ cũ.

## 8. Giao diện

Màn điều hướng hiện “Đang tính lại đường” khi chờ. Đường đã đi vẫn hiển thị khi lấy đoạn chỉ đường mới.

## 9. Kiểm chứng

40 kiểm thử API, 48 kiểm thử Mobile, typecheck API/Mobile, Swagger và diff check đạt. Chạy kiểm tra đọc với vị trí hiện có, 131 mẫu chuyến đang chạy giảm từ 5 đoạn xuống 1, 180 mẫu chuyến đã hoàn thành giảm từ 17 xuống 4.

## 10. Giới hạn

NOT_VERIFIED với chuyển chế độ trên điện thoại và phản hồi VietMap của chuyến thực tế. Kiểm thử tự động dùng API giả lập hoặc dữ liệu chỉ đọc.

## 11. Điểm cần review

Vị trí dùng để tính đoạn mới, con trỏ tại điểm học sinh, ước tính khi thiếu chỉ dẫn đến điểm dừng và khoảng hở thực sự trong lịch sử.

## 12. Bước tiếp theo

Tải lại ứng dụng và thử đổi thủ công sang tự động trên chuyến TEST hiện có.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu trên thiết bị.

---

# Điểm danh ngay khi quét RFID hoặc QR

## 1. Thông tin

19/11/2026 · API và Mobile · Đã triển khai.

## 2. Yêu cầu

Quét thẻ RFID hoặc mã QR hợp lệ là ghi điểm danh ngay, bỏ thao tác xác nhận lần hai.

## 3. Phạm vi

RFID ghi lên hoặc xuống xe theo pha thiết bị. QR ghi lên xe trong luồng quét mã hiện có.

## 4. Quyết định

Tái sử dụng quy tắc điểm danh và thông báo. Lượt trùng trả kết quả đã ghi. Lượt bị từ chối hiển thị nguyên nhân. Giữ điểm danh đã ghi vắng để phụ xe xử lý thủ công nếu cần.

## 5. Triển khai

RFID ghi dữ liệu điểm danh và receipt trong một transaction PostgreSQL, sau đó cập nhật lịch sử MongoDB. Gửi lại cùng scanId đọc receipt để đối soát. QR xác thực phạm vi và ghi lên xe trong cùng khóa chuyến.

## 6. Cơ sở dữ liệu

Tái sử dụng receipt và trạng thái hiện có. Không tạo migration hoặc ghi dữ liệu để kiểm thử.

## 7. API và Swagger

Thêm `POST /trips/:id/attendance/scan-qr` trả `alreadyRecorded`. Cập nhật mô tả endpoint RFID. Giữ endpoint xác thực QR cũ và cách đối soát RFID. Swagger local trả 200 và hiển thị cả hai luồng.

## 8. Giao diện

QR hiển thị kết quả và nút Quét tiếp. RFID hiển thị kết quả mới nhất, lịch sử và nút kiểm tra kết quả khi đang đối soát. Lượt cũ chưa được ghi cần quẹt lại.

## 9. Kiểm chứng

59 kiểm thử API, 3 kiểm thử Mobile, typecheck API/Mobile, Swagger và diff check đạt. Kiểm thử giả lập xác nhận gửi lại RFID sau mất phản hồi và quét QR trùng không ghi lần nữa.

## 10. Giới hạn

NOT_VERIFIED với ESP32 vật lý hoặc camera trên chuyến hoạt động. BLOCKED_BY_TEST_DATA_POLICY đối với việc tự tạo chuyến để quét thử.

## 11. Điểm cần review

Đúng pha RFID, bảo toàn lượt đã ghi vắng, trạng thái đối soát khi kết quả mạng không chắc chắn, và không thay giờ điểm danh khi quét trùng.

## 12. Bước tiếp theo

Nghiệm thu RFID và QR trên chuyến thử hiện có sau khi tải lại ứng dụng Mobile.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu trên thiết bị.

---

# Tổng quan công nghệ RoadToSchool v2.0

## 1. Task Information
19/11/2026 · API, Web, Mobile, IoT · Analysis · COMPLETED.

## 2. Original Request
Liệt kê các công nghệ đang dùng trong dự án.

## 3. Approved Scope
Tra cứu tài liệu, manifest và mã nguồn để tổng hợp stack hiện tại.

## 4. Analysis & Decisions
- API dùng Node.js, TypeScript, NestJS 12, Express, Prisma 6, PostgreSQL, JWT và Swagger.
- Web dùng Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zustand và MapLibre GL.
- Mobile dùng Expo SDK 58, React Native 0.88, Expo Router, Reanimated và WebView.
- VietMap hỗ trợ tìm địa chỉ, chỉ đường và tối ưu tuyến. IoT RFID dùng ESP32, Arduino, PlatformIO, MFRC522, MongoDB/Mongoose và Socket.IO.
- eSMS là dịch vụ gửi OTP qua SMS khi `AUTH_SMS_MODE=esms`. Backend gọi REST API của eSMS trực tiếp bằng `fetch` trong `EsmsSmsService`. Các luồng dùng OTP qua số điện thoại gồm đăng ký, quên mật khẩu, liên kết phụ huynh với học sinh và xác minh yêu cầu cập nhật thông tin học sinh. Nodemailer phục vụ kênh email, Cloudinary lưu ảnh.

## 5. Implementation Details
No application code changes. Thêm mục mới đầu báo cáo và giữ nội dung hiện có. Diff mã ứng dụng của mục này: None.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None.

## 8. UI/UX Changes
None.

## 9. Verification & Testing
Đối chiếu ba package.json, Prisma schema, mã tích hợp IoT, cấu hình PlatformIO và đường gọi eSMS trong OtpService. Kiểm chứng tĩnh phục vụ việc liệt kê công nghệ. Gửi SMS thực tế chưa được kiểm tra.

## 10. Issues & Risks
Phiên bản lấy từ khai báo của repository. Trạng thái triển khai thực tế chưa được kiểm tra.

## 11. Reviewer Focus
Vai trò của PostgreSQL trong nghiệp vụ chính và MongoDB trong dịch vụ IoT.

## 12. Suggested Next Step
Ưu tiên sơ đồ luồng dữ liệu nếu cần trình bày kiến trúc.

## 13. Approval Status
Hoàn tất phần tra cứu.

---

# Hiển thị giờ thực tế của chuyến xe

## 1. Thông tin

19/11/2026 · API, Web và Mobile · Triển khai.

## 2. Yêu cầu

Dùng giờ thực tế khi hiển thị chuyến đang vận hành hoặc đã hoàn thành.

## 3. Phạm vi

Khung giờ chuyến trên danh sách, tổng quan, lịch, trang chủ và chi tiết. Các mốc đã ghi nhận trên hành trình phụ huynh.

## 4. Quyết định

Dùng giờ Việt Nam. Chuyến đang chạy hiển thị giờ khởi hành và ký hiệu đang tiếp diễn. Chuyến hoàn thành hiển thị giờ khởi hành và kết thúc. Dữ liệu cũ thiếu mốc thực tế hiển thị dấu gạch.

## 5. Triển khai

API tính `displayTime` từ trạng thái và mốc lưu trên chuyến. Web và Mobile dùng cùng giá trị. Lịch phụ huynh dùng giờ đến trường hoặc giờ xuống xe đã ghi nhận của con.

## 6. Cơ sở dữ liệu

Tái sử dụng các mốc hiện có. Không có migration hoặc ghi dữ liệu thử nghiệm.

## 7. API và Swagger

Bổ sung `displayTime` vào các DTO chuyến và `actualDestinationTime` vào lịch phụ huynh. Kiểm tra Swagger local trả 200 và khai báo đủ các trường mới.

## 8. Giao diện

Chi tiết Web hiển thị nhãn giờ thực tế. Hành trình phụ huynh hiển thị mốc đã ghi nhận và đánh dấu mốc thiếu.

## 9. Kiểm chứng

Typecheck API, Web, Mobile đều đạt. 55 kiểm thử API, 169 kiểm thử Web và 32 kiểm thử Mobile đạt. ESLint Web còn 8 lỗi `no-explicit-any` có sẵn trong `types.ts`. Diff đã được rà soát.

## 10. Giới hạn

NOT_VERIFIED trên giao diện với một chuyến vận hành thực tế. BLOCKED_BY_TEST_DATA_POLICY đối với việc tự tạo hoặc đổi trạng thái chuyến để nghiệm thu.

## 11. Điểm cần review

Giờ qua nửa đêm theo múi giờ Việt Nam, mốc kết thúc còn trống, dữ liệu chuyến cũ và sự khác nhau giữa giờ kết thúc chuyến với giờ xuống xe của con.

## 12. Bước tiếp theo

Đối chiếu giờ hiển thị trên Web và Mobile với mốc ghi nhận của một chuyến hiện có.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu.

---

# Điểm danh RFID cho chuyến khác ngày trong chế độ TEST

## 1. Thông tin

19/11/2026 · API IoT · Triển khai.

## 2. Yêu cầu

Cho phép ESP32 điểm danh chuyến có ngày phục vụ bất kỳ khi chạy mô phỏng.

## 3. Phạm vi đã duyệt

Quy tắc ngày của RFID trong `TRIP_OPERATION_MODE=TEST`.

## 4. Quyết định

Xét các chuyến trên đúng xe đã có phụ xe xác nhận sẵn sàng và có thể ở pha điểm danh. Nếu nhiều chuyến đủ điều kiện, API trả `AMBIGUOUS_TRIP`.

## 5. Triển khai

Áp dụng quy tắc ngày vào cả truy vấn chọn chuyến và kiểm tra điều kiện. Dùng chung kết quả chọn chuyến để phát cấu hình, xử lý lượt quẹt và xác nhận.

## 6. Cơ sở dữ liệu

Không có migration hoặc ghi dữ liệu kiểm thử.

## 7. API và Swagger

Bổ sung quy tắc ngày trong mô tả `GET /api/v1/iot/devices/{deviceId}/runtime-config`. Swagger local trả 200 và tài liệu đã tải mô tả mới.

## 8. UI và firmware

Thay đổi áp dụng ở API. ESP32 tiếp tục nhận cùng định dạng cấu hình.

## 9. Kiểm chứng

PASS TypeScript và 16 kiểm thử điểm danh RFID. Bộ kiểm thử IoT có 59/60 pass. Kiểm thử đăng ký thẻ còn kỳ vọng chỉ `SYSTEM_ADMIN`, trong khi controller hiện cho phép cả `SCHOOL_ADMIN`.

## 10. Giới hạn

NOT_VERIFIED với ESP32 và chuyến thật, BLOCKED_BY_TEST_DATA_POLICY. Cần chuyến có ngày phục vụ khác hôm nay, xe đã gắn ESP32 và phụ xe được phân công.

## 11. Điểm cần review

Chuyến quá khứ và tương lai trong TEST, giới hạn ngày ở LIVE, từ chối token khi có thêm chuyến cùng xe đủ điều kiện.

## 12. Bước tiếp theo

Thử một lượt quẹt với chuyến khác ngày đang đủ điều kiện trong TEST.

## 13. Trạng thái duyệt

Đã triển khai, chờ nghiệm thu thiết bị.

---

# Triển khai điểm danh lên xuống xe

## 1. Task Information
19/11/2026 · API và Mobile · Triển khai · COMPLETED.

## 2. Original Request
Triển khai wireframe điểm danh, ưu tiên học sinh sắp tới và làm rõ trạng thái RFID.

## 3. Approved Scope
Màn điểm danh của chuyến, luồng hiển thị của giáo viên phụ xe, dữ liệu điểm dừng và trạng thái RFID.

## 4. Analysis & Decisions
Chọn học sinh chưa xử lý theo điểm tài xế đang hướng tới hoặc thứ tự tuyến khi thiếu điều hướng. Phân biệt gắn thiết bị, điều kiện pha, kết nối gần đây và xác nhận chuyến. Giữ quy trình xác nhận RFID hiện hành.

## 5. Implementation Details
Thêm attendanceTargetStopId cho phụ xe được phân công. Khu vực RFID theo dõi reader và pendingEvent ngay khi thu gọn. Nhóm học sinh ưu tiên, còn lại và đã xử lý trong từng pha. Dùng chung cổng vào RFID khi đổi pha.

## 6. Database Changes
Không thay schema hoặc tạo migration.

## 7. API & Swagger Changes
Thêm attendanceTargetStopId vào trạng thái điều hướng. Endpoint RFID thêm reader.reason và pendingEvent. Swagger local đã kiểm tra.

## 8. UI/UX Changes
Đưa học sinh sắp tới lên đầu, nêu rõ thao tác lên/xuống, thu gọn lịch sử và hiện lượt quẹt cần xử lý. QR dùng theo pha lên xe hiện hành.

## 9. Verification & Testing
PASS 108 kiểm thử API liên quan, 8 kiểm thử Mobile, typecheck API/Mobile, Swagger và diff check. Suite API rộng hơn có 7 lỗi kiểm thử khóa chuyến trong trip-synchronization.spec.ts. NOT_VERIFIED với ESP32 hoặc chuyến thật.

## 10. Issues & Risks
Trạng thái mới hỗ trợ xác định nguyên nhân kết nối. Chưa xác định lỗi phần cứng của thiết bị trong ảnh. Bộ dữ liệu điều hướng cần cập nhật để đánh dấu chính xác học sinh sắp tới.

## 11. Reviewer Focus
Quyền truy cập điểm tiếp theo, thứ tự học sinh theo chuyến, trạng thái reader và lượt chờ khi xem lịch sử.

## 12. Suggested Next Step
Nghiệm thu với phụ xe được phân công, ESP32 đã gắn và chuyến thử do Product Owner cấp.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

---

# Thiết kế điểm danh lên xuống xe

## 1. Task Information
19/11/2026 · Mobile và API · Phân tích và thiết kế · WAITING_APPROVAL.

## 2. Original Request
Rà soát và thiết kế lại điểm danh lên xuống. Ưu tiên học sinh sắp tới và giải thích RFID chưa sẵn sàng.

## 3. Approved Scope
Phân tích, wireframe và chẩn đoán từ mã nguồn. Triển khai chờ duyệt.

## 4. Analysis & Decisions
RFID chiếm diện tích phía trên danh sách và dùng nhãn chung cho nhiều nguyên nhân. Danh sách dùng thứ tự tuyến tĩnh. Đề xuất ghim điểm dừng thực tế sắp tới, thu gọn trạng thái RFID và tách lịch sử.

## 5. Implementation Details
No application code changes. Đã tạo SVG và bản xem PNG trong thư mục bản xem trước.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Triển khai sau có thể trả điểm dừng tiếp theo cho phụ xe được phân công và nguyên nhân trạng thái RFID cụ thể.

## 8. UI/UX Changes
Hai trạng thái Lên xe và Xuống xe. Đưa học sinh sắp tới lên đầu, đặt thao tác tương ứng trong thẻ, giữ QR và điểm danh trực tiếp.

## 9. Verification & Testing
PASS kiểm tra mã nguồn, XML và bản render. Chưa xác nhận lỗi thực tế của đầu đọc.

## 10. Issues & Risks
Ảnh không có log runtime-config và heartbeat. Phải phân biệt thiết bị gắn với xe, chuyến đủ điều kiện và ACK cho đúng pha còn hạn.

## 11. Reviewer Focus
Quy tắc ưu tiên học sinh khi đổi điểm điều hướng, phân biệt pha và độ chính xác của thông báo thiết bị.

## 12. Suggested Next Step
Duyệt wireframe và quy tắc ưu tiên trước khi triển khai.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.


---

# Dùng chung tuyến dự kiến và tự điều hướng khi khởi hành

## 1. Task Information
19/11/2026 · API, Mobile và Web · Triển khai · COMPLETED.

## 2. Original Request
Ba vai trò dùng cùng tuyến mặc định từ DB. Giữ đường điều hướng riêng cho tài xế, bỏ sự cố Mất GPS và tự bắt đầu điều hướng khi tài xế khởi hành.

## 3. Approved Scope
Chi tiết chuyến mobile, điều hướng khi khởi hành, API và bộ lọc sự cố vận hành.

## 4. Analysis & Decisions
Dùng polyline lưu của chuyến làm tuyến dự kiến chung. API Parent tiếp tục lọc điểm dừng và dữ liệu học sinh khác. Giáo viên và phụ huynh theo dõi marker vị trí xe. TEST tự bật TEST_AUTO, LIVE dùng vị trí thiết bị.

## 5. Implementation Details
Bỏ luồng tính tuyến tham chiếu. Tự mở phiên điều hướng sau xác nhận khởi hành, sửa thứ tự token hoạt động để phản hồi phiên đầu được xử lý. Gửi mẫu TEST đầu tiên khi mở phiên. Bỏ phát sinh và lọc sự cố Mất GPS khỏi các danh sách vận hành.

## 6. Database Changes
Không đổi schema. Bản ghi sự cố GPS lịch sử được giữ lại.

## 7. API & Swagger Changes
Chi tiết chuyến Parent trả polyline mặc định đã lưu, bên cạnh các điểm dừng được phép xem. Bỏ endpoint tuyến tham chiếu cũ. Swagger loại Mất GPS khỏi loại được báo thủ công và bộ lọc.

## 8. UI/UX Changes
Ba vai trò dùng chung nguồn tuyến dự kiến. Tài xế có thể xem lớp tuyến dự kiến trong lúc điều hướng. Phụ huynh và giáo viên xem marker xe trên tuyến dự kiến. Loại Mất GPS được bỏ khỏi bộ lọc và badge chuyến.

## 9. Verification & Testing
PASS 54 kiểm thử API, 47 kiểm thử mobile liên quan, typecheck API/Web/Mobile, Swagger cục bộ và git diff --check. NOT_VERIFIED luồng ba tài khoản với chuyến thật hoặc GPS thiết bị.

## 10. Issues & Risks
LIVE phụ thuộc quyền GPS và mẫu vị trí hợp lệ. Việc hiển thị polyline chung cho Parent cho biết hình dạng tuyến theo yêu cầu, trong khi dữ liệu điểm dừng riêng vẫn lọc.

## 11. Reviewer Focus
Polyline lấy từ dữ liệu lưu, phạm vi hiển thị Parent, khởi hành tự mở phiên ở hai chế độ, và lịch sử loại sự cố GPS.

## 12. Suggested Next Step
Nghiệm thu đồng thời trên ba tài khoản của một chuyến thử được cấp.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

---

# Tuyến tham chiếu khi phụ huynh theo dõi chuyến

## 1. Task Information
19/11/2026 · API và Mobile · Triển khai · COMPLETED.

## 2. Original Request
Hiển thị tuyến trên màn theo dõi chuyến của phụ huynh, kể cả khi xe chưa có GPS. Triển khai phương án tuyến tham chiếu đã duyệt.

## 3. Approved Scope
Tuyến theo đường từ điểm đón trả của con đến trường theo chiều chuyến, tải riêng với GPS, hiển thị trên bản đồ theo dõi hiện có.

## 4. Analysis & Decisions
Chi tiết chuyến cho Parent chủ động loại polyline vận hành và lọc điểm dừng. Dùng các điểm hợp lệ từ chi tiết đã lọc để tính tuyến bằng VietMap. Nhãn phân biệt tuyến tham chiếu với hành trình ghi nhận.

## 5. Implementation Details
ParentTripReferenceService gọi dịch vụ VietMap sau kiểm tra quyền xem chuyến, dùng cache giới hạn và gom yêu cầu trùng. Mobile tải theo chuyến và bộ điểm hiện tại, bỏ kết quả cũ khi đổi phạm vi, hiển thị trạng thái thiếu điểm hoặc thử lại khi lỗi.

## 6. Database Changes
Không thay đổi schema hoặc migration.

## 7. API & Swagger Changes
GET /api/v1/trips/mobile/{id}/reference-route chỉ dành cho PARENT. Phản hồi AVAILABLE, MISSING_POINTS hoặc UNAVAILABLE. Endpoint và schema đã xác minh trên Swagger local.

## 8. UI/UX Changes
Tuyến tham chiếu mặc định trên bản đồ Parent kể cả khi chưa có GPS. Khi xem lịch sử, nhãn nút phân biệt tuyến tham chiếu với hành trình ghi nhận.

## 9. Verification & Testing
PASS 44 kiểm thử API, 60 kiểm thử Mobile với trình phân giải module TypeScript, typecheck API và Mobile, Swagger local và git diff --check. NOT_VERIFIED VietMap và bản đồ trên thiết bị bằng chuyến thực tế.

## 10. Issues & Risks
Tuyến phụ thuộc VietMap và tọa độ hợp lệ. Khi thiếu dữ liệu hoặc dịch vụ lỗi, mobile hiển thị trạng thái phù hợp.

## 11. Reviewer Focus
Quyền trên mỗi lần truy cập, thứ tự điểm theo hai chiều, chỉ dùng điểm của con và trường, và ổn định khi GPS chưa có.

## 12. Suggested Next Step
Nghiệm thu trên chuyến thử của tài khoản phụ huynh có liên kết.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

---

# Triển khai modal duyệt yêu cầu đổi địa chỉ đón trả

## 1. Task Information
19/11/2026 · Web và API · Triển khai · COMPLETED.

## 2. Original Request
Triển khai redesign modal duyệt yêu cầu đổi địa chỉ đón trả.

## 3. Approved Scope
Modal theo wireframe đã duyệt, một hành động chính theo trạng thái, so sánh vị trí và khóa duyệt khi ngoài phạm vi.

## 4. Analysis & Decisions
Kiểm tra tuyến xác minh phạm vi trước khi trả kết quả. Xét danh sách tuyến rỗng trước kết quả FEASIBLE. Kiểm tra lại phạm vi trong giao dịch duyệt vì bãi có thể đổi sau khi xem kết quả.

## 5. Implementation Details
RequestDetailModal sử dụng LifecycleDialog, mở bản đồ hiện có khi yêu cầu và đưa các tiêu chí vào phần thu gọn. AddressRoutingReview hiển thị trạng thái và thời gian thay đổi. StudentRequestsService kiểm tra phạm vi trước khi ghi thay đổi cho mọi nhánh duyệt địa chỉ.

## 6. Database Changes
Không có schema change hoặc migration.

## 7. API & Swagger Changes
Hai endpoint phê duyệt giữ hợp đồng hiện có và mô tả lại điều kiện phạm vi. PASS Swagger local ở /api/docs và /api/docs-json.

## 8. UI/UX Changes
Hiện một nút chính cho kiểm tra, thử lại hoặc duyệt theo kết quả. Khi sửa thông số, làm mất hiệu lực kết quả cũ. Trường hợp loại khỏi tuyến có bước xác nhận hậu quả.

## 9. Verification & Testing
PASS 169 test Web, 29 test API liên quan, typecheck Web/API, ESLint tệp Web thay đổi, Chrome với API giả lập, Swagger và git diff --check. NOT_VERIFIED bản đồ VietMap trực tiếp và thao tác duyệt dữ liệu thật.

## 10. Issues & Risks
Bản đồ chỉ hiển thị các điểm có tọa độ. Dữ liệu API và thao tác thật cần nghiệm thu bằng một yêu cầu được cấp.

## 11. Reviewer Focus
Duyệt trực tiếp khi không có tuyến, chặn ngoài phạm vi kể cả khi bãi đổi sau preview, khóa kết quả cũ sau chỉnh tham số và vai trò nhà trường.

## 12. Suggested Next Step
Nghiệm thu bằng một yêu cầu đổi địa chỉ được Product Owner cấp.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

---

# Thiết kế modal duyệt yêu cầu đổi địa chỉ đón trả

## 1. Task Information
19/11/2026 · Web · Thiết kế · WAITING_APPROVAL.

## 2. Original Request
Thiết kế lại modal chi tiết yêu cầu đổi địa chỉ theo phân tích UI/UX.

## 3. Approved Scope
Hai trạng thái thiết kế và quy tắc trình bày các kết quả. Triển khai chờ duyệt.

## 4. Analysis & Decisions
Một nút chính ở footer theo từng bước. Ưu tiên đối chiếu điểm cũ và mới, xác minh phạm vi riêng với tác động tuyến. Đưa tham số tối ưu vào phần tùy chỉnh.

## 5. Implementation Details
No application code changes. Wireframe SVG và bản xem PNG nằm trong thư mục xem trước của phiên.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None.

## 8. UI/UX Changes
Hiện thông tin ngắn gọn về yêu cầu, trạng thái, kết quả và hành động tương ứng. Đề xuất kiểm tra trường hợp chưa có tuyến trước khi xét kết quả tối ưu.

## 9. Verification & Testing
Đã kiểm tra XML và kết xuất bản xem trước. Tương tác chưa triển khai.

## 10. Issues & Risks
Kết quả phạm vi cần dựa trên dữ liệu đã xác minh. Số phút chênh lệch trong preview là minh họa.

## 11. Reviewer Focus
Tên và vị trí nút chính. Điều kiện duyệt trực tiếp, cập nhật tuyến và từ chối.

## 12. Suggested Next Step
Duyệt thiết kế và hành vi theo kết quả kiểm tra.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

---

# Triển khai kiểm tra phạm vi phục vụ bãi xe cho màn Đổi địa chỉ đón trả trên Mobile RoadToSchool

## 1. Task Information
19/11/2026 · Mobile & API · Triển khai theo kế hoạch đã duyệt · IMPLEMENTED & VERIFIED.

## 2. Original Request
Triển khai màn Đổi địa chỉ đón trả trên mobile RoadToSchool theo wireframe đã duyệt. Áp dụng cho cả luồng chọn sẵn học sinh và luồng chọn học sinh trong form. Giữ bảng màu và thành phần bản đồ hiện có.
Rà soát `create-address-request-view.tsx`, `parent-requests.controller.ts`, `student-requests.service.ts` và `parking-policy.ts`. Tái sử dụng logic hiện có để xác định bãi xe đang có hiệu lực và tính khoảng cách Haversine. Chấp nhận điểm đúng rìa bán kính. Không hardcode 50 km ở mobile. Giữ các quy tắc tỉnh/thành hiện hành ở bước tương ứng.
Thêm API kiểm tra phạm vi chỉ đọc, giới hạn cho phụ huynh liên kết với học sinh. Xác thực tọa độ và trả trạng thái trong vùng, ngoài vùng hoặc không thể kiểm tra. Trả khoảng cách, bán kính và dữ liệu ranh giới cần thiết cho bản đồ. Cập nhật Swagger. Kiểm tra lại ở backend trước khi gửi OTP, trong giao dịch tạo yêu cầu sau khi xác thực OTP và tại bước phê duyệt.
Trên mobile, kiểm tra khi lấy được tọa độ từ kết quả tìm kiếm hoặc khi người dùng chọn lại điểm trên bản đồ. Hiện trạng thái Đang kiểm tra, Trong bán kính phục vụ, Ngoài bán kính phục vụ hoặc Chưa kiểm tra được ngay dưới bản đồ. Chỉ bật nút tiếp tục khi kết quả Trong bán kính còn hiệu lực và khớp với học sinh, tọa độ đang chọn. Nếu người dùng đổi học sinh, sửa tìm kiếm hoặc đổi ghim, hủy ngay hiệu lực kết quả cũ và bỏ qua phản hồi trễ. Nếu API báo phạm vi đã đổi khi xác thực OTP, đưa người dùng về bước chọn điểm và báo lý do. Cập nhật bản đồ hiển thị ranh giới phục vụ.
Nghiệm thu theo mục 5 của `docs/ai-review/student-address-service-area-plan.md`. Viết mock unit tests, typecheck an toàn và `git diff --check`. Tuyệt đối không sinh dữ liệu test.

## 3. Approved Scope
- **Backend API**:
  - `parking-policy.ts`: Bổ sung `effectiveParking` tính toán bãi xe hiệu lực (kể cả `scheduledChange`), cập nhật `assertLocationWithinServiceArea` cho phép điểm đúng rìa (`distanceMeters <= maxRadiusMeters`) và kiểm tra tỉnh/thành đồng bộ.
  - DTO: `ParentServiceAreaCheckDto`, `ParentServiceAreaBoundaryDto`, `ParentServiceAreaCheckResponseDto`.
  - Controller & Service: Endpoint `POST /parents/students/:id/service-area-check`.
  - Kiểm tra 3 cổng: (1) `checkParentServiceArea`, (2) `requestOtp` trước khi sinh challenge, (3) `verifyOtpAndCreateRequest` trong transaction.
  - Swagger decorators đầy đủ.
- **Mobile**:
  - `api-client.ts`: type contracts và method `checkStudentAddressServiceArea`.
  - `VietMapPicker.tsx`: Hỗ trợ vẽ vòng tròn GeoJSON ranh giới phục vụ (`serviceAreaBoundary`) và cập nhật qua WebView bridge.
  - `create-address-request-view.tsx`: Quản lý state phạm vi (`IDLE`, `CHECKING`, `IN_SERVICE_AREA`, `OUT_OF_SERVICE_AREA`, `UNAVAILABLE`), chống race conditions bằng generation counters, render status card dưới bản đồ, validate nút tiếp tục, truyền ranh giới vào bản đồ.
  - `verify-otp.tsx`: Bắt lỗi thay đổi phạm vi/bán kính khi xác thực OTP, cảnh báo và điều hướng phụ huynh quay lại chọn lại điểm đón.
  - Unit tests: API unit test (`parent-service-area.spec.ts`) & Mobile unit test (`parent-service-area.test.ts`).

## 4. Analysis & Decisions
- Đảm bảo duy nhất một nguồn sự thật (`effectiveParking` trong `parking-policy.ts`) cho mọi khâu: kiểm tra sớm, gửi OTP, giao dịch tạo yêu cầu sau OTP, và phê duyệt.
- Không hardcode 50 km trên mobile: Bán kính tối đa được server trả về động qua `maxOperatingRadiusKm` và `boundary.radiusKm`.
- Chống race condition trên Mobile: Khi người dùng gõ tìm kiếm hoặc kéo ghim liên tiếp, `serviceAreaGeneration.current` và `draftGeneration.current` hủy ngay kết quả cũ và loại bỏ triệt để phản hồi trả muộn.
- Ranh giới GeoJSON trên VietMapPicker: Tự động tính toán đa giác vòng tròn 64 đỉnh từ tâm bãi xe và bán kính `radiusMeters` để hiển thị trực quan cho phụ huynh.

## 5. Implementation Details
- `api/src/student-requests/dto/parent-service-area-check.dto.ts` (mới): DTOs cho request/response kiểm tra phạm vi.
- `api/src/student-requests/dto/index.ts`: export DTO.
- `api/src/system-settings/parking-policy.ts`: `effectiveParking`, cập nhật `assertLocationWithinServiceArea` (`distanceMeters <= maxRadiusMeters`).
- `api/src/student-requests/student-requests.service.ts`: `checkParentServiceArea`, thêm guard kiểm tra phạm vi vào `requestOtp` và `verifyOtpAndCreateRequest`.
- `api/src/student-requests/parent-requests.controller.ts`: endpoint `POST /parents/students/:id/service-area-check`.
- `api/src/student-requests/parent-service-area.spec.ts` (mới): 11 unit tests độc lập không chạm database.
- `mobile/services/api-client.ts`: types và client method gọi check.
- `mobile/components/maps/VietMapPicker.tsx`: render GeoJSON circle ranh giới phục vụ.
- `mobile/components/parent/create-address-request-view.tsx`: tích hợp luồng kiểm tra phạm vi động, thẻ thông báo 4 trạng thái, quản lý race condition và validation nút submit.
- `mobile/app/parent/create-request/verify-otp.tsx`: điều hướng về bước chọn điểm khi server phát hiện thay đổi phạm vi.
- `mobile/scripts/parent-service-area.test.ts` (mới): 5 test cases kiểm thử logic mobile state machine.

## 6. Database Changes
None. Tái sử dụng schema Prisma hiện hành (`SystemSetting` key `PARKING_LOT`, `StudentUpdateRequest`, `Student`).

## 7. API & Swagger Changes
- Thêm `POST /api/v1/parents/students/:id/service-area-check`:
  - Params: `id` (studentId).
  - Body: `{ latitude: number, longitude: number }`.
  - Responses: 200 (kết quả kiểm tra), 400 (tọa độ không hợp lệ), 401 (chưa đăng nhập), 403 (không phải phụ huynh của học sinh), 404 (học sinh không tồn tại).
- Swagger decorators đầy đủ và đã được kiểm chứng tại `/api/docs-json`.

## 8. UI/UX Changes
- Màu sắc theo đúng quy chuẩn thương hiệu: Primary `#FFCB56`, Background `#FFFDF6`, Text `#1E293B`, Card `#FFFFFF`.
- Trạng thái kiểm tra phạm vi dưới bản đồ:
  - `CHECKING`: Spinner + text "Đang kiểm tra phạm vi phục vụ...".
  - `IN_SERVICE_AREA`: Icon check xanh + "Trong bán kính phục vụ" + khoảng cách và bán kính động.
  - `OUT_OF_SERVICE_AREA`: Icon x đỏ + "Ngoài bán kính phục vụ" + thông báo chi tiết.
  - `UNAVAILABLE`: Icon cảnh báo cam + "Chưa kiểm tra được" + nút [Thử lại].
- Nút "Tiếp tục xác thực OTP" bị vô hiệu hóa cho đến khi vị trí hợp lệ trong vùng phục vụ.
- Ranh giới bán kính hiển thị trực tiếp dạng vòng tròn bán trong suốt trên bản đồ VietMap.

## 9. Verification & Testing
- Backend Typecheck: `cd api; npx tsc --noEmit` -> PASS (0 errors).
- Mobile Typecheck: `cd mobile; npx tsc --noEmit` -> PASS (0 errors).
- Backend Unit Tests: `cd api; npx vitest run src/student-requests/parent-service-area.spec.ts` -> PASS (11/11 tests passed).
- Mobile Unit Tests: `cd mobile; node --test scripts/parent-service-area.test.ts` -> PASS (5/5 tests passed).
- Git Diff Check: `git diff --check` -> PASS (không có lỗi xung đột / whitespace).
- Tuân thủ Test Data Policy: Không tự ý insert/update dữ liệu trong database, hoàn toàn dùng mock và verification an toàn.

## 10. Issues & Risks
- Nếu hệ thống chưa cấu hình bãi xe trung tâm (`PARKING_LOT`), API trả về `UNAVAILABLE` và hướng dẫn liên hệ nhà trường.
- Trong trường hợp cấu hình bãi xe thay đổi lịch trình (`scheduledChange`), hàm `effectiveParking` đảm bảo tự động kích hoạt vào đúng ngày `effectiveDate` mà không cần migrate hay can thiệp thủ công.

## 11. Reviewer Focus
- Cơ chế đồng bộ bãi xe hiệu lực giữa API kiểm tra sớm và giao dịch tạo yêu cầu sau khi nhập OTP.
- Xử lý race conditions và out-of-order responses trên mobile khi phụ huynh tương tác nhanh.
- Không hardcode bất kỳ con số bán kính nào trên client (toàn bộ dùng động từ backend).

## 12. Suggested Next Step
Tiến hành kiểm thử E2E trên thiết bị mobile với tài khoản phụ huynh thật (do PO chỉ định) để nghiệm thu trải nghiệm kéo ghim thực tế trên bản đồ.

## 13. Approval Status
IMPLEMENTED & VERIFIED. WAITING FOR USER REVIEW.

---

# Thiết kế đổi địa chỉ đón trả theo bán kính bãi xe

## 1. Task Information
19/11/2026 · Mobile và API · Thiết kế · WAITING_APPROVAL.

## 2. Original Request
Rà soát, thiết kế lại màn đổi địa chỉ đón trả và yêu cầu chỉ cho chọn điểm trong bán kính phục vụ của bãi xe.

## 3. Approved Scope
Phân tích và bản thiết kế. Triển khai chờ duyệt.

## 4. Analysis & Decisions
Mobile đang bật OTP khi có địa chỉ và tọa độ. Hai API OTP chưa xác thực bán kính ở bước gửi và tạo yêu cầu. Đề xuất kiểm tra sớm và kiểm tra lại với cấu hình bãi đang hiệu lực.

## 5. Implementation Details
No application code changes. Wireframe SVG và PNG trong thư mục bản xem trước của phiên.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Đề xuất API đọc kiểm tra tọa độ theo học sinh liên kết và kiểm tra trong bước gửi OTP, tạo yêu cầu và phê duyệt.

## 8. UI/UX Changes
Thu gọn địa chỉ hiện tại, ưu tiên tìm kiếm và bản đồ. Hiện trạng thái trong hoặc ngoài bán kính cạnh nút OTP, giữ tọa độ khỏi nội dung hiển thị. Điểm ngoài vùng chỉ để xem và bị khóa gửi.

## 9. Verification & Testing
PASS kiểm tra XML và xem bản render Chrome. Chưa triển khai hoặc kiểm thử tương tác.

## 10. Issues & Risks
Không dùng giá trị bán kính cố định. Cần thống nhất nguồn cấu hình bãi theo ngày hiệu lực với bước phê duyệt.

## 11. Reviewer Focus
Rìa bán kính, cấu hình không hợp lệ, quyền phụ huynh, kết quả cũ khi đổi tọa độ và thay đổi bãi trong lúc chờ OTP.

## 12. Suggested Next Step
Duyệt wireframe và chốt hợp đồng kiểm tra trước khi triển khai.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.


---

# Thiết kế thẻ thông báo trên mobile

## 1. Task Information
19/11/2026 · Mobile và API · Thiết kế và lập kế hoạch · WAITING_APPROVAL.

## 2. Original Request
Thiết kế wireframe, kế hoạch và prompt cho thẻ thông báo hiện ngay trên mobile, vuốt trái để đánh dấu đọc và bỏ qua để giữ chưa đọc.

## 3. Approved Scope
Wireframe và kế hoạch. Triển khai chờ duyệt.

## 4. Analysis & Decisions
Provider hiện tại refresh bộ đếm mỗi 15 giây; một số thông báo chỉ xuất hiện trong inbox. Đề xuất realtime có xác thực và hàng đợi cho tài xế, giáo viên phụ xe và phụ huynh.

## 5. Implementation Details
No application code changes. Có wireframe SVG, bản render PNG và kế hoạch kèm prompt trong thư mục bản xem trước của phiên.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Kế hoạch đề xuất thẩm định realtime và tái sử dụng API đánh dấu đọc từng mục.

## 8. UI/UX Changes
Thẻ nổi theo thứ tự nhận, nền tối nhẹ, nút Bỏ qua, nút Đánh dấu đã đọc và vuốt trái. Mục chưa đọc vẫn ở inbox.

## 9. Verification & Testing
PASS kiểm tra XML và xem bản render Chrome. Tương tác mobile và realtime chưa triển khai.

## 10. Issues & Risks
Cần chốt transport realtime và phát sau commit. Native push và refresh dự phòng có độ trễ.

## 11. Reviewer Focus
Thứ tự hàng đợi, chống hiện trùng, bỏ qua theo tài khoản, quyền nhận thông báo và hành vi khi mất kết nối.

## 12. Suggested Next Step
Duyệt wireframe và kế hoạch realtime.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.


---

# Mở lại chuyến và xử lý báo nghỉ nhân sự

## 1. Task Information
19/11/2026 · API và Web · Triển khai · COMPLETED.

## 2. Original Request
Triển khai bản thiết kế modal mở lại chuyến đã duyệt, gồm cảnh báo khi nhân sự đã báo nghỉ.

## 3. Approved Scope
Thao tác mở lại thủ công của System Admin. Chọn người thay hoặc xác nhận người đã báo nghỉ có thể làm chuyến.

## 4. Analysis & Decisions
Đối chiếu đơn mới nhất của người sẽ phụ trách trên chính chuyến. Bỏ qua đơn đã rút. Xác nhận gắn với từng đơn. Luồng khôi phục theo lịch trường giữ quy tắc riêng.

## 5. Implementation Details
TripsService kiểm tra báo nghỉ trong giao dịch và lưu xác nhận vào operationAudit. Tiếp tục kiểm tra xe và nhân sự. Web hiển thị tên phân công, bộ chọn theo từng dòng và lỗi tại nguồn lực liên quan.

## 6. Database Changes
Không có thay đổi schema hoặc migration.

## 7. API & Swagger Changes
GET /api/v1/trips/{id}/reopen/staff-leave-notices chỉ dành cho System Admin. POST /api/v1/trips/{id}/reopen nhận confirmedStaffLeaveNoticeIds và trả 409 REOPEN_STAFF_LEAVE khi cảnh báo chưa được xử lý. Swagger local đã xác minh GET và schema POST.

## 8. UI/UX Changes
Hiện ngày giờ, trạng thái, lý do và phân công. Mở bộ tìm theo dòng, ẩn phân trang một trang. Giữ lý do và lựa chọn khi gửi gặp lỗi.

## 9. Verification & Testing
PASS 40 kiểm thử API, 7 kiểm thử Web, typecheck API và Web, ESLint thành phần sửa, Chrome với API giả lập và Swagger local. NOT_VERIFIED thao tác trên chuyến thật, BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Khi tải thông tin báo nghỉ thất bại, modal khóa xác nhận và cho thử lại.

## 11. Reviewer Focus
Quyền System Admin, xác nhận gắn đúng đơn mới nhất, thông báo lỗi theo dòng và bảo toàn nội dung form khi thử lại.

## 12. Suggested Next Step
Nghiệm thu trên chuyến thử do Product Owner cấp.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

---

# Thiết kế modal mở lại chuyến

## 1. Task Information
19/11/2026 · Web · Phân tích và thiết kế · WAITING_APPROVAL.

## 2. Original Request
Phân tích các điểm bất hợp lý trong modal mở lại chuyến và thiết kế lại.

## 3. Approved Scope
Phân tích và bản thiết kế gồm hai trạng thái. Phần triển khai chờ duyệt.

## 4. Analysis & Decisions
Mã tuyến và ngày chưa giúp nhận diện chuyến nhanh. Ba bộ chọn mở cùng lúc, lặp ô tìm và phân trang cả khi chỉ có một trang. Phương án mới hiển thị phân công hiện tại, mở bộ chọn theo từng hàng và ưu tiên cảnh báo báo nghỉ.

## 5. Implementation Details
No application code changes. Đã tạo mo-lai-chuyen.svg và mo-lai-chuyen.png trong thư mục bản xem trước của phiên.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Việc trả dữ liệu báo nghỉ trước khi mở lại, xác nhận khả dụng và kiểm tra cuối là đề xuất.

## 8. UI/UX Changes
Giữ palette RoadToSchool. Tách ngữ cảnh chuyến, lý do và phân công. Dùng nhãn Mở lại chuyến. Khi người hiện được phân công từng báo nghỉ cho chuyến, đề xuất yêu cầu chọn người thay hoặc xác nhận lại khả dụng.

## 9. Verification & Testing
PASS kiểm tra XML, xuất PNG bằng Chrome và xem bản render. Tương tác chưa được triển khai.

## 10. Issues & Risks
Cần thống nhất tiêu chí ghi nhận xác nhận nhân sự đã sẵn sàng và cách xử lý báo nghỉ lịch sử.

## 11. Reviewer Focus
Nội dung cảnh báo, vị trí chọn người thay và điều kiện bật nút mở lại.

## 12. Suggested Next Step
Duyệt wireframe và hành vi cảnh báo trước khi triển khai.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.


---

# Hủy chuyến trước khi vận hành

## 1. Task Information
19/11/2026 · API và Web · Triển khai · COMPLETED.

## 2. Original Request
Cho phép System Admin hủy chuyến trước khi chuyến được coi là đã vận hành.

## 3. Approved Scope
Thao tác hủy chung cho System Admin trong chi tiết chuyến. Luồng hủy do toàn bộ học sinh vắng tiếp tục dùng API hiện có.

## 4. Analysis & Decisions
Dùng cùng tiêu chí vận hành với luồng mở lại. Chuyến chờ khởi hành đủ điều kiện khi chưa có giờ chạy thực tế và chưa ghi nhận học sinh lên hoặc xuống xe. Xác nhận sẵn sàng, ghi vắng và giờ dự kiến không tính là đã vận hành.

## 5. Implementation Details
TripsController và TripsService xử lý hủy trong giao dịch có khóa chuyến, lưu lý do và lịch sử, đóng tác vụ chờ, ghi nhận thông báo. Web nối API trong api-client.ts và tái sử dụng hộp thoại xác nhận trong trip-actions.tsx. web-api-integration.ts kiểm tra điều kiện hiển thị. trip-operation-history.tsx hiển thị lịch sử. Thêm kiểm thử API và Web.

## 6. Database Changes
Không có migration.

## 7. API & Swagger Changes
POST /trips/{id}/cancel nhận TripReasonDto và trả TripActionMessageDto. Swagger local tại /api/docs và /api/docs-json đã xác nhận endpoint, DTO và phản hồi.

## 8. UI/UX Changes
Nút **Hủy chuyến** trên chi tiết chuyến và trường lý do trong hộp thoại xác nhận hiện có.

## 9. Verification & Testing
PASS 36 kiểm thử TripsService, 7 kiểm thử điều kiện Web, typecheck API và Web, Swagger local và git diff --check. NOT_VERIFIED thao tác trên chuyến thật, BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Web ẩn nút khi chưa tải được dữ liệu điểm danh. API kiểm tra lại trạng thái sau khi khóa chuyến.

## 11. Reviewer Focus
Kiểm tra phạm vi System Admin, mốc xuất phát và lên xuống xe, lịch sử và thông báo trong cùng giao dịch.

## 12. Suggested Next Step
Nghiệm thu với chuyến kiểm thử do Product Owner cấp.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL.

---

# Giữ chuyến đã hoàn thành và đã hủy trên trang chủ mobile

## 1. Task Information
19/11/2026 · API / Mobile · Implementation · COMPLETED.

## 2. Original Request
Giữ quy tắc chọn chuyến chính và hiện các chuyến đã hoàn thành hoặc đã hủy cùng ngày phục vụ. Khi thiếu chuyến chính, dùng ngày hôm nay theo giờ Việt Nam.

## 3. Approved Scope
Áp dụng cho tài xế, giáo viên phụ xe và phụ huynh. Giữ lựa chọn chuyến chính theo phân công hoặc theo từng học sinh.

## 4. Analysis & Decisions
Lấy lịch sử bằng cùng điều kiện phân quyền với chuyến chính. Xếp đang vận hành, chờ khởi hành, đã hoàn thành, đã hủy. Phụ huynh chọn chuyến chính riêng cho từng con rồi xếp các thẻ chung theo trạng thái và giờ.

## 5. Implementation Details
Cập nhật TripsService, TripsController, DTO và helper home-trip-selection, kèm kiểm thử mock. Mobile tái sử dụng thẻ chuyến và đọc danh sách API. Diff trong LATEST.diff.

## 6. Database Changes
None.

## 7. API & Swagger Changes
GET /api/v1/trips/mobile/home-trip bổ sung items, giữ trip và hasTrip cho chuyến chính. GET /api/v1/trips/mobile/parent/home-cards mở rộng tập items. Swagger UI trả 200, OpenAPI phản ánh schema và mô tả mới.

## 8. UI/UX Changes
Trang chủ nhân sự hiện danh sách cùng ngày bằng thẻ hiện có. Thẻ đã kết thúc dùng Xem chi tiết và bỏ thao tác vận hành. Phụ huynh chỉ cập nhật trạng thái hành trình thời gian thực cho các chuyến còn hoạt động.

## 9. Verification & Testing
PASS — Typecheck API và mobile, 26 test TripsService, 38 test mobile qua Node resolver cục bộ có hỗ trợ import TS thiếu phần mở rộng, Swagger và git diff --check. FAIL — 7 ca khóa chuyến trong trip-synchronization.spec.ts, đã đối chiếu bản HEAD trước sửa và tái hiện đúng 7 lỗi. NOT_VERIFIED — chưa kiểm tra trực tiếp trang chủ trên thiết bị với đủ dữ liệu cho ba vai trò.

## 10. Issues & Risks
Màn hình hiện hành phụ thuộc API mới để lấy thêm lịch sử. Nếu app mới gặp API cũ, nhánh nhân sự dùng lại trường trip.

## 11. Reviewer Focus
Kiểm tra qua nửa đêm Việt Nam, ngày tương lai, nhiều con và quyền truy cập danh sách điểm danh.

## 12. Suggested Next Step
Kiểm tra với các tài khoản mobile có sẵn và dữ liệu lịch sử cùng ngày.

## 13. Approval Status
Đã triển khai theo yêu cầu đã được PO duyệt. WAITING FOR USER REVIEW.
