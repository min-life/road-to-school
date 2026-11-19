# Kế hoạch nhập và xuất nhiều học sinh bằng Excel

## 1. Phạm vi

Áp dụng trang /admin/students của SCHOOL_ADMIN trong đúng trường. Thêm «Xuất Excel» và «Nhập Excel» ở đầu trang bên cạnh «Thêm học sinh». Dùng r2s-student-bulk-import-export-wireframe.svg và r2s-student-bulk-import-export-preview.png. Giữ bảng dùng chung trong hồ sơ trường của SYSTEM_ADMIN, thao tác thêm lẻ, API danh sách, phân trang và in thẻ hiện có.

Một lô nhập là toàn bộ dòng dữ liệu trong một tệp. Có một dòng lỗi thì không lưu dòng nào. Nếu lỗi phát sinh sau khi bắt đầu ghi, rollback cả lô. Nhập phục vụ tạo mới, xuất phục vụ tra cứu và đối soát.

## 2. Dữ liệu tệp đề xuất

| Cột | Nhập | Xuất mặc định |
|---|---|---|
| Họ và tên học sinh | Bắt buộc | Có |
| Số điện thoại phụ huynh | Bắt buộc, ô văn bản | Có, ô văn bản |
| Địa chỉ đón/trả | Tùy chọn, nhập cùng vĩ độ và kinh độ | Có |
| Vĩ độ, Kinh độ | Hai cột tùy chọn, nhập đủ khi có địa chỉ | Để ngoài bộ cột mặc định |
| Mã học sinh | Hệ thống sinh khi tạo | Có |
| Tỉnh/thành, Phường/xã | Hệ thống lấy theo tọa độ khi xác định được | Hai cột tên, để trống khi thiếu |
| Tình trạng địa chỉ | Hệ thống tính | Có |
| Trạng thái học sinh | Hồ sơ mới mặc định Khả dụng | Có, nhãn tiếng Việt |
| Ngày tạo hồ sơ | Hệ thống ghi | Tùy chọn, chờ duyệt |

- Đề xuất một sheet nhập theo tệp mẫu .xlsx, hàng đầu là tên cột. Bỏ qua dòng hoàn toàn trống, kiểm từng dòng còn lại theo số dòng Excel. Từ chối tiêu đề thiếu/trùng, sheet sai cấu trúc, tệp rỗng/hỏng và ô công thức trong trường nhận dữ liệu. Giữ số 0 đầu của số điện thoại, báo lỗi định dạng nếu tệp đã làm mất dữ liệu. Kiểm tọa độ hữu hạn và trong giới hạn địa lý.
- Giữ quyền tạo hồ sơ theo trường, kiểm địa chỉ và tọa độ đủ bộ hoặc trống. Khi có tọa độ, dùng quy tắc kiểm phạm vi hiện có. Ngoài phạm vi là lỗi dòng theo hành vi modal tạo học sinh hiện tại. Địa giới thiếu chỉ xét bán kính nếu quy tắc hiện hành cho phép. Trường hợp toàn bộ kiểm tra phạm vi chưa khả dụng chờ chốt.
- Số điện thoại phụ huynh có thể dùng chung. Dòng nghi trùng không tự gộp, tự bỏ qua hoặc ghi đè. Ảnh, RFID, liên kết phụ huynh và phân tuyến nằm ngoài tệp nhập. Bản xuất bỏ mã nội bộ và dữ liệu xác thực, định dạng các giá trị văn bản như tên, địa chỉ, số điện thoại và mã học sinh dưới dạng text. Tệp xuất không phải tệp mẫu để nhập lại.

## 3. Nhập Excel

1. Mở modal, tải mẫu, chọn một tệp. Backend đọc và kiểm toàn lô, kiểm quyền, cấu trúc, dữ liệu bắt buộc, chuẩn hóa điện thoại, địa chỉ và quy tắc nghiệp vụ. Preview chỉ đọc, trả tổng dòng, số dòng hợp lệ/lỗi và từng lỗi theo số dòng Excel, cột và mô tả. Một dòng có thể có nhiều lỗi. Khi tệp đổi hoặc kiểm tra lỗi, kết quả cũ hết hiệu lực.
2. Hiện báo cáo lỗi và trạng thái «Chưa lưu học sinh nào». Chỉ bật «Nhập n học sinh» khi preview hợp lệ và có dữ liệu. Cho đổi tệp, tải mẫu và xem riêng dòng lỗi. Khi đang ghi, tránh submit lặp trong giao diện.
3. Khi xác nhận, server kiểm phiên preview, đúng tệp, actor, trường và thực hiện kiểm lại các điều kiện có thể đổi. Geocode/đọc Excel ngoài transaction. Khi vào transaction, xác nhận lại quyền, tình trạng trường và phiên bản dữ liệu ảnh hưởng đến quyết định nhập để tránh dùng kết quả cũ. Dùng transaction cùng cơ chế khóa phù hợp đã có khi cần giữ tính nhất quán với cập nhật trường và bãi.
4. Sinh mã theo quy tắc hiện có. Ghi tất cả học sinh trong một transaction, dùng chung transaction client. Có thể dùng createMany khi phù hợp với lỗi DB; luôn bỏ skipDuplicates. Không lặp gọi API tạo từng học sinh, không commit theo nhóm nhỏ. Nếu cần thử lại do xung đột sinh mã hoặc lỗi nhất thời, làm sau khi lần trước rollback và thử lại cả lô. Hoàn tất đồng thời với bản ghi kết quả chống lặp nếu phương án đó được duyệt.
5. Chỉ báo «Đã nhập n học sinh» sau commit rồi tải lại danh sách. Nếu giao dịch rollback, báo rõ 0 hồ sơ được lưu. Khi mất phản hồi, hiển thị «Chưa xác nhận được kết quả nhập». Không tự suy ra rollback, không tự sinh khóa mới hoặc gửi lại dưới dạng lô mới. Nếu có biên nhận bền vững, dùng cùng khóa để tra hoặc thử lại an toàn.

## 4. Xuất Excel

- Modal chọn riêng một phạm vi: «Học sinh đã chọn» theo snapshot tập ID được tick trong trường hoặc «Theo bộ lọc hiện tại» trên mọi trang. Khi có lựa chọn, mặc định phương án đã chọn. Không có lựa chọn thì dùng bộ lọc đang áp dụng. Không có kết quả thì giải thích trước khi tải.
- Chế độ bộ lọc dùng cùng search, status, hasAddress, routingStatus, provinceId và wardId với danh sách. Bỏ page/limit riêng của màn hình; áp dụng giới hạn xuất đã duyệt. Chế độ theo ID kiểm mọi ID còn thuộc trường, không âm thầm bỏ dòng stale hoặc ngoài phạm vi. Yêu cầu người dùng làm mới nếu bộ chọn thay đổi.
- Số lượng hiển thị dùng dữ liệu sẵn có đúng scope. Nếu dữ liệu đổi trước lúc xuất, tệp phản ánh kết quả server tại lúc truy vấn. Nếu vượt giới hạn, báo và yêu cầu thu hẹp bộ lọc; không cắt bớt dữ liệu âm thầm. Chỉ trả các cột đã duyệt trong workbook, giữ thứ tự danh sách hoặc thứ tự ổn định đã thống nhất.

## 5. API mới đề xuất

Tất cả endpoint dưới /schools/:schoolId/students và kiểm quyền SCHOOL_ADMIN đúng trường. Thêm endpoint riêng để giữ payload cũ. Tên path, field và mã phản hồi dưới đây là bản đề xuất để PO duyệt.

| Method/path tương đối | Request | Response đề xuất |
|---|---|---|
| GET /import-template | Không có body | 200 tệp mẫu .xlsx |
| POST /imports/preview | multipart file | 200 với totalRows, validRows, invalidRows, errors gồm rowNumber/field/message, và previewToken khi cả lô hợp lệ |
| POST /imports/commit | multipart file, previewToken và importKey nếu duyệt biên nhận | 201 với importedCount sau commit. Trả lỗi 422 kèm lỗi dòng nếu tệp không còn hợp lệ, 409 khi preview hết hạn/thay đổi hoặc khóa dùng cho tệp khác |
| GET /imports/:importKey | Chỉ nếu duyệt phương án biên nhận | 200 với importedCount khi có biên nhận thành công. 404 nếu chưa thấy biên nhận; kết quả này có thể là request trước vẫn đang xử lý |
| POST /exports | JSON scope SELECTED kèm studentIds, hoặc FILTERED kèm filters | 200 tệp .xlsx sau xác minh toàn bộ nguồn dữ liệu |

- Thêm 400 cho request/form lỗi, 401/403 cho lỗi xác thực/quyền, 413 cho tệp vượt giới hạn và 422 cho workbook không đọc được hoặc kết quả xuất vượt giới hạn đã duyệt. Preview hợp lệ về cấu trúc nhưng có lỗi dòng trả 200 với danh sách lỗi. Thông báo lỗi kỹ thuật cấp lô không lộ stack, dữ liệu ngoài trường hoặc cấu hình nội bộ.
- Gắn previewToken ngắn hạn với actor/trường/hash nội dung tệp; commit gửi lại tệp để kiểm cùng nội dung, chỉ tin dữ liệu do server parse. So sánh tệp trước khi ghi. Không lưu binary/PII của tệp vào DB cho mục đích preview.
- Chống nhập lặp đề xuất biên nhận theo actor + schoolId + importKey, lưu fingerprint tệp và số dòng đã commit cùng transaction Student. Lặp cùng khóa và cùng tệp trả lại kết quả đã commit; cùng khóa khác tệp trả 409. Thiết kế DDL và retention chỉ làm sau khi PO duyệt. Nếu PO chọn không thêm biên nhận, bỏ GET trạng thái và không cam kết retry tự động sau mất phản hồi.
- Cập nhật Swagger của API mới và docs/FE_INTEGRATION_GUIDE.md sau khi duyệt. Bản tệp xuất dùng Content-Disposition và MIME .xlsx chuẩn.

## 6. Quyết định cần PO xác nhận

| Vấn đề | Đề xuất |
|---|---|
| Bộ cột | Tệp nhập 5 cột, hai cột bắt buộc. Tệp xuất theo bảng mục 2, chưa xuất tọa độ hoặc ngày tạo mặc định. |
| Dòng trùng | Báo lỗi các dòng lặp y hệt sau chuẩn hóa trong cùng tệp. Với trùng nghi ngờ trong dữ liệu đã có, hiện cảnh báo để đối soát trước khi xác nhận. Cho phép chung số điện thoại. |
| Chưa kiểm được phạm vi | Với dòng có địa chỉ/tọa độ, dừng preview ở trạng thái cần thử lại. Dòng để trống toàn bộ địa chỉ tiếp tục theo điều kiện thông thường. |
| Giới hạn và thư viện | Đề xuất tối đa 200 dòng/tệp nhập, 2 MiB cho tệp tải lên và 5.000 dòng/lần xuất. Chốt thư viện .xlsx sau khi đối chiếu dependency và được phép bổ sung. |
| Retry sau mất phản hồi | Duyệt biên nhận trong DB ghi chung transaction để tra trạng thái và chống nhập hai lần, hoặc chọn phiên đầu không retry tự động. Cần duyệt DDL/retention riêng khi chọn biên nhận. |
| Contract | Xác nhận các path, field, enum, status code mục 5 và mức hiển thị dữ liệu liên hệ trong tệp xuất. |

## 7. Nghiệm thu

- Kiểm tệp hoàn toàn hợp lệ, tệp rỗng/hỏng, thiếu cột, sai điện thoại, có hai học sinh chung số, tọa độ thiếu/ngoài phạm vi và tệp vượt giới hạn. Kiểm số dòng Excel khi có dòng trống xen giữa. Xác minh preview không tạo hồ sơ.
- Kiểm lô có một lỗi dòng, lỗi ghi sau khi đã bắt đầu lô, xung đột sinh mã, tệp đổi sau preview và hai lần xác nhận đồng thời. Nếu có biên nhận, kiểm mất phản hồi sau commit, thử lại cùng khóa và khóa trùng với tệp khác. Runtime ghi DB chỉ thực hiện khi được PO cho phép.
- Kiểm xuất lựa chọn qua nhiều trang, xuất toàn bộ kết quả theo filter, trường hợp không có dữ liệu, ID stale/sai scope. So cột Excel theo quy tắc đã duyệt, kiểu text giữ đúng số điện thoại và mã.
- Xác minh layout responsive, focus modal, bảng lỗi có thể cuộn và không lặp submit. Chạy typecheck API/Web, git diff --check, đối chiếu Swagger local. Tuyệt đối không chạy script test, không tạo dữ liệu kiểm thử, sửa env, cài package hay apply migration khi chưa được PO cho phép theo từng phạm vi.

## Prompt cho Antigravity

> Sau khi PO xác nhận wireframe, bộ cột, quy tắc và contract theo mục 6 của docs/ai-review/student-bulk-import-export-plan.md, triển khai phần đã duyệt. Đọc AGENTS.md và tài liệu nền, kiểm git status, bảo toàn thay đổi đang có. Dùng wireframe/preview r2s-student-bulk-import-export.
>
> Thêm Nhập Excel và Xuất Excel vào đầu trang /admin/students của SCHOOL_ADMIN. Nhập cho tải mẫu, kiểm toàn tệp, báo lỗi theo số dòng/cột/trạng thái rồi mới xác nhận. Server kiểm lại đúng tệp và trường, ghi cả lô trong một transaction, không skip dòng. Chỉ báo số học sinh đã nhập sau commit. Nếu một ghi lỗi, rollback tất cả. Xử lý phản hồi mất và retry theo phương án biên nhận đã duyệt.
>
> Xuất theo học sinh đã chọn hoặc kết quả bộ lọc trên mọi trang, xác minh scope và tập ID ở server. Giữ đúng bộ cột, định dạng text điện thoại/mã và giới hạn đã duyệt. Dùng API riêng và giữ contract thêm lẻ, danh sách, in thẻ, quyền và giao diện hồ sơ trường hiện có. Cập nhật Swagger và tài liệu FE.
>
> Nghiệm thu mục 7, chạy typecheck và git diff --check. Tuyệt đối không chạy script test. Tuân thủ chỉ thị PO về dữ liệu, env, dependency và DB. Ghi phần runtime chưa xác minh, cập nhật báo cáo và diff rồi dừng.
