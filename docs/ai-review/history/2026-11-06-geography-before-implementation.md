# AI Review — Khả năng lọc địa giới học sinh/trường, 06/11/2026

## 1. Tổng quan

PLANNING/ghi nhận yêu cầu mới. Hiện chưa triển khai filter tỉnh/phường trên API. PO muốn có filter người dùng chọn cho trường/học sinh, gồm lúc lập phương án, nhưng không tự lọc địa chỉ ngoài kiểm eligibility.

## 2. Yêu cầu gốc

PO hỏi khả năng lọc học sinh/trường trong mọi trường hợp kể cả lập phương án, theo tỉnh và đơn vị địa phương mong muốn dùng chung sau sáp nhập. Đây là kiểm hiện trạng, chưa duyệt thêm field/schema/endpoint.

## 3. Nguồn đối chiếu

AGENTS, WORKING_RULES, BUSINESS_CONTEXT, handoff, CURRENT_STATE, LATEST; git status và source/schema thực tế. Không dùng mô tả lịch sử để suy ra filter đã có.

## 4. GET học sinh

GET /api/v1/schools/:schoolId/students dùng ListStudentsQueryDto: page,limit,search,status,hasAddress,routingStatus=UNASSIGNED. search chỉ fullName/code. Không có province/ward/district query. listStudents không xây điều kiện địa giới.

## 5. GET trường

GET /api/v1/schools dùng ListSchoolsQueryDto: page,limit,search,status. search chỉ name. Không có filter tỉnh/phường/xã.

## 6. Chuẩn bị lập phương án

GET /api/v1/routes/preparation/:schoolId nhận schoolId, không có DTO query địa giới. Có loại học sinh khác tỉnh với trường khi cả hai province có dữ liệu và kiểm bán kính. Đây là eligibility nghiệp vụ, không phải bộ lọc địa giới người dùng chọn. EligibleStudentItemDto hiện không trả province/ward thành field riêng.

## 7. Dữ liệu lưu trữ

School/Student có province String nullable; không có ward/district/commune hoặc mã hành chính riêng. Helper reverse-geocode chỉ trích province/addressText, chưa trích cấp phường/xã. addressText là chuỗi hiển thị, không có dữ liệu bảo đảm chuẩn hóa/sáp nhập để lọc chính xác. Chưa đọc DB để đánh giá độ phủ province của dữ liệu cũ.

## 8. API/Swagger và tương thích

Không đổi API/Swagger. Với list DTO hiện tại và global forbidNonWhitelisted, tự gửi province/ward query không được hỗ trợ và bị validation400; preparation không nhận query để lọc. Không cam kết FE tự lọc một trang sẽ cho kết quả/toàn bộ pagination đúng.

## 9. UI/UX

Không sửa UI. Nếu bổ sung, đề xuất filter hai cấp tỉnh/thành và phường/xã cùng logic ở danh sách và preparation. Không mặc định coi chuỗi quận cũ là phường/xã mới hoặc tự sửa địa giới của dữ liệu lịch sử.

## 10. Verification

Bổ sung theo câu hỏi PO về VietMap: tài liệu chính thức Reverse v4 xác nhận hỗ trợ địa giới mới2cấp qua display_type=1 hoặc5; boundaries type0=tỉnh/thành, type2=phường/xã, có id/name/prefix/full_name. display_type=5 trả mới ở top-level, cũ ở data_old. Source hiện đã gọi display_type=5 nhưng chỉ trích tỉnh, chưa lưu/trả phường/xã hoặc filter. Không gọi provider thật hoặc sửa code/schema. Nguồn: https://maps.vietmap.vn/docs/map-api/reverse-version/reverse-v4/ và https://maps.vietmap.vn/docs/vi/migrate-address/migrate-address-docs/ . ID trả bởi provider chưa được xác nhận tương đương mã hành chính chính thức.


Đối chiếu DTO/controller/service/schema bằng đọc source. Không chạy test scripts, provider, GET DB hoặc mutation. Không typecheck/build lại vì không thay application code. Diff docs kiểm sau ghi.

## 11. Files thay đổi

Chỉ LATEST.md và archive history/2026-11-06-void-lock-fix.md. LATEST.diff giữ patch tích lũy công việc trước, task này không phát sinh code changes.

## 12. Kết luận và một bước tiếp theo

Yêu cầu mới đã ghi vào master plan Z6. Đang hỏi PO duyệt 3field nullable provinceId/wardId/ward, query optional cùng tên ID, và nguồn dropdown theo dữ liệu đúng quyền. Không gửi query không lọc địa giới; eligibility độc lập, không tự thêm rule cùng phường. Không triển khai source/schema trước khi field được chốt.


Chưa đáp ứng yêu cầu filter địa giới trong mọi ngữ cảnh. Bước tiếp theo duy nhất: lập plan bổ sung contract filter tùy chọn và dữ liệu địa giới chuẩn hóa cho School/Student/preparation, trình PO field/schema trước code.

## 13. Trạng thái bàn giao

REQUIREMENTS_RECORDED / FIELD_CONTRACT_PENDING / FEATURE_NOT_IMPLEMENTED. Không sửa source/schema/env/DB hoặc commit/push. Dừng sau trả lời hiện trạng.
