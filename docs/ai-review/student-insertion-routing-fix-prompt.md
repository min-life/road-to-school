# ROADTOSCHOOL V2.0 — FIX THÊM HỌC SINH VÀ ĐỒNG BỘ TIÊU CHÍ TỐI ƯU

## 1. Chỉ thị từ Product Owner

Chế độ: IMPLEMENTATION cho Antigravity. Ghi nhận lỗi, kiểm tra source và sửa hoàn chỉnh trong phạm vi dưới đây; không dừng ở báo cáo nguyên nhân hoặc kế hoạch. Không mở rộng sang các nghiệp vụ lifecycle khác.

PO xác nhận:
- Mở chức năng thêm học sinh vào tuyến hiện bị lỗi runtime.
- Hai tiêu chí tối ưu phải giống lúc lập phương án: **Thời gian tối đa tuyến** và **Thời gian chờ/dừng tại điểm**.
- Áp dụng thống nhất cho thêm học sinh vào cặp tuyến và kiểm tra tuyến khi duyệt đổi địa điểm học sinh (màn hình thứ hai PO cung cấp).

Đọc AGENTS.md và tài liệu bắt buộc theo thứ tự. Kiểm tra git status, bảo vệ toàn bộ staged/modified/untracked work. Đọc thêm school-route-lifecycle-student-change-design.md, school-route-lifecycle-implementation-prompt.md và school-route-lifecycle-business-review.md để giữ các quyết định đã chốt; không coi mọi thiếu sót trong review là phạm vi phải sửa ở task này. Đối chiếu lại source vì đã có chỉnh sửa sau báo cáo review.

## 2. Lỗi đã quan sát và bằng chứng source

Ảnh PO: Runtime TypeError `Cannot read properties of undefined (reading 'length')` tại `web/src/components/admin/students/insert-student-modal.tsx`, biểu thức `options.candidatePairs.length`. Call stack qua StudentTable và trang chi tiết trường.

Source tại thời điểm soạn prompt:
- Backend `StudentInsertionOptionsResponseDto` và `getInsertionOptions` trả studentId/studentName/addressText/latitude/longitude/**pairs**.
- Web types/modal lại đọc **student**, **candidatePairs**, và một số trường con khác tên backend (currentStudentsCount/vehicleCapacity/version so với currentStudents/seatCount/availableSeats).
- Preview backend trả **feasible**, **outbound**, **return**, **status**, **previewToken**, **expectedFingerprint**. Web đọc **isFeasible**, **returnRoute**, **feasibility**, version.
- Confirm backend yêu cầu **previewToken**, expectedFingerprint tùy chọn; Web gửi studentId, route IDs và expected*Version/reason.
- Màn hình request-detail-modal có maxWalkingMeters/maxWalkingDistanceMeters và thời gian đi vòng, khác tiêu chí lúc lập phương án.
- DTO preview hiện dùng routingConstraints?: any; insertion vẫn dùng khoảng cách thẳng và tốc độ 8.33m/s, cộng 60 giây; address preview ước lượng delta tọa độ và giữ polyline cũ. Những công thức này không chứng minh tuyến đáp ứng thời lượng tối đa theo đường thực tế.

Phải xác minh lại từng bằng chứng và ghi file:line cuối cùng. Không chỉ thêm `?.length` hoặc `|| []` để che lỗi contract và hiển thị sai rằng không có tuyến.

## 3. Sửa thống nhất contract xuyên suốt

Rà toàn bộ options → preview → confirm của insertion và preview → approve của đổi địa chỉ: service, controller, DTO validation, Swagger, API client, Web types và JSX.

Chọn một contract tường minh thống nhất. Nếu giữ view model khác wire format, chuyển đổi tại một adapter duy nhất có kiểm tra; không ép kiểu để coi payload khác cấu trúc là hợp lệ. Không duy trì hai bộ field aliases rải rác.

- Danh sách đúng dạng mảng, phần tử đầy đủ; dữ liệu sai cấu trúc hiển thị lỗi tải, không văng trang và không giả empty state.
- Phân biệt loading, không có cặp tuyến hợp lệ, lỗi tải, lỗi kiểm tra và hết hạn preview.
- Chỉ hiện/bật xác nhận khi cả hai tuyến FEASIBLE và có previewToken hợp lệ.
- Confirm gửi đúng DTO, không bị whitelist từ chối; preview/approve đổi địa chỉ cũng phải dùng đúng fields/token.
- Đóng modal/chuyển học sinh/chuyển tuyến không nhận kết quả async của lựa chọn cũ. Không submit trùng.

## 4. Hai tiêu chí đúng nghiệp vụ

Tái sử dụng semantic, defaults và validation của luồng lập phương án, đặc biệt `RoutingConstraintsDto` trong `api/src/routes/dto/optimize-route.dto.ts` và Web create/page.tsx:

| Nhãn | Field | Đơn vị / ý nghĩa |
|---|---|---|
| Thời gian tối đa tuyến | maxRouteDurationMinutes | Phút; giới hạn tổng driving + stop service + waiting của một tuyến một chiều |
| Thời gian dừng tại điểm | defaultStopServiceSeconds | Giây; thời gian phục vụ đón/trả như luồng lập phương án |

Source hiện tại: maxRouteDurationMinutes tối thiểu 10 phút; defaultStopServiceSeconds số nguyên 10–300 giây, mặc định 60 giây. Kiểm tra lại normalization lúc tạo phương án và dùng chung; không thêm giới hạn khác hoặc hardcode giá trị mặc định mâu thuẫn. Phân biệt thời gian phục vụ tại stop với waiting do time window, tránh cộng đôi.

- Xóa hai ô “Khoảng cách đi bộ tối đa” / “Thời gian đi vòng tối đa” khỏi phần tối ưu này; không chỉ đổi label mà giữ payload/logic cũ.
- Khi chọn tuyến, ưu tiên ràng buộc đã lưu tại Route, sau đó RoutePlan, cuối cùng default hiện có của luồng lập phương án. Nếu các tuyến có cấu hình khác nhau, giữ và thể hiện giá trị theo từng tuyến để không âm thầm ghi đè; hai loại tiêu chí vẫn thống nhất.
- Giá trị nhập phải được truyền qua nested DTO có validation/Swagger và thực sự áp dụng vào solver. Tránh any hoặc input UI không được backend sử dụng.
- Giữ các ràng buộc hợp lệ khác như sức chứa, giờ học, chiều đi/về và stopServiceOverrides đang có; không xóa cấu hình riêng của học sinh khác hoặc tạo tiêu chí mới ngoài yêu cầu.
- Thay học sinh/cặp tuyến/hai tiêu chí thì vô hiệu preview/token cũ ngay; phải kiểm tra lại trước khi xác nhận.

## 5. Tối ưu đúng và lưu đúng kết quả

Tái sử dụng adapter/solver VietMap hiện có của lập phương án, với mỗi tuyến xử lý độc lập. Không thêm package, SDK hoặc dịch vụ mới. Không lấy khoảng cách thẳng/tốc độ giả định làm kết quả khả thi cuối cùng; không trả polyline cũ như đường mới.

### Thêm học sinh
- SYSTEM_ADMIN; học sinh AVAILABLE chưa thuộc phương án DRAFT/ACTIVE; chọn một tuyến TO_SCHOOL và một TO_PARKING cùng trường/cùng phương án DRAFT hoặc ACTIVE.
- Mỗi lần tối ưu giữ toàn bộ học sinh hiện tại của tuyến và thêm đúng học sinh được chọn; không bỏ học sinh khác hoặc chuyển sang tuyến khác để đạt giới hạn.
- Cả hai tuyến phải được kiểm tra theo thời lượng thực tế gồm thời gian dừng và các ràng buộc hiện có. Trả geometry, thứ tự stops, distance/duration và giờ dự kiến từ cùng kết quả hợp lệ.
- Confirm atomically cập nhật cả hai Routes/RouteStops và ràng buộc thực sự đã dùng, counters liên quan; lỗi một tuyến không lưu một nửa.
- Giữ quyết định Route-only: KHÔNG thêm học sinh vào hoặc thay đổi dữ liệu nghiệp vụ của bất kỳ Trip đã sinh nào. Trip sinh sau mới dùng Route mới. Nếu Trip cũ còn routeSnapshot null, phải bảo toàn dữ liệu tuyến cũ bằng cơ chế snapshot đã được duyệt trước khi sửa Route để fallback không làm đổi hành trình chuyến cũ; không backfill hàng loạt.

### Duyệt đổi địa điểm
- Chưa có tuyến hiệu lực: giữ quyền duyệt trực tiếp đã chốt; có tuyến DRAFT/ACTIVE: chỉ SYSTEM_ADMIN kiểm tra/duyệt tuyến.
- Mỗi tuyến dùng tọa độ mới của học sinh yêu cầu, giữ tọa độ đang lưu trong RouteStop của các học sinh khác. Chỉ xác nhận phương án tuyến mới khi tất cả tuyến liên quan FEASIBLE.
- Khi xác nhận REOPTIMIZED, lưu đúng geometry/thứ tự/metrics đã preview; cập nhật các Trip SCHEDULED đủ điều kiện theo quyết định cũ. Giữ nguyên Trip đã Ready, có điểm danh, đang chạy và lịch sử, gồm legacy null snapshot.
- Giữ nhánh từ chối và phê duyệt nhưng loại khỏi tuyến đã được duyệt. UNAVAILABLE không được biến thành INFEASIBLE để cho phép loại học sinh. Không mở rộng sang viết lại nghiệp vụ vô hiệu hóa/hủy phương án.

Phân biệt FEASIBLE, INFEASIBLE, UNAVAILABLE. Timeout/quota/key/network/provider error không được báo tuyến khả thi hoặc bất khả thi nghiệp vụ. Không tự retry vô hạn/đồng loạt gọi provider khi render hoặc sửa từng ký tự.

Preview token gắn actor, purpose, inputs/constraints, phiên bản Student/Route/Plan và TTL; kết quả do server giữ, không tin geometry từ client. Confirm revalidate quyền, trạng thái, membership, capacity và fingerprint trong transaction; chống stale preview, xác nhận trùng và cập nhật đồng thời. Provider call ở ngoài transaction. Chỉ consume token sau commit thành công hoặc xử lý idempotency tường minh.

## 6. UI trong phạm vi PO yêu cầu

Giữ cấu trúc modal hiện có, không tạo màn hình mới hoặc refactor layout ngoài phạm vi. Thay đúng hai ô tiêu chí và sửa lỗi hiển thị/contract. Cấu trúc mục tiêu:

```text
Thêm học sinh vào tuyến
Học sinh: …
[Chọn cặp tuyến đi / về cùng phương án]
Thời gian tối đa tuyến (phút) [ … ]
Thời gian dừng tại điểm (giây) [ … ]
[Kiểm tra tuyến]
Kết quả chiều đi / chiều về, thời lượng và bản đồ theo preview hiện có
[Đóng]                         [Xác nhận thêm]

Kiểm tra yêu cầu đổi địa điểm
Thông tin học sinh / địa chỉ cũ → mới
Thời gian tối đa tuyến (phút) [ … ]
Thời gian dừng tại điểm (giây) [ … ]
[Kiểm tra tuyến]
Kết quả từng tuyến / tác động Trip theo UI đã duyệt
Các hành động tương ứng với kết quả hợp lệ
```

Đây là điều chỉnh trực tiếp theo yêu cầu PO, không cần xin duyệt lại cùng hai tiêu chí hoặc luồng đã được phê duyệt. Nếu các tuyến có constraints khác nhau, đặt hai ô trong nhóm từng tuyến với layout hiện có. Minimal UI Copy, brand tokens, không đưa token/fingerprint hoặc văn giải thích dài lên giao diện.

## 7. Giới hạn dữ liệu và phạm vi

- Không sửa schema, tạo bảng/migration hoặc dependency trong task này; tận dụng các trường đã có. Nếu phát sinh nhu cầu schema thực sự ngoài thiết kế đã duyệt thì báo riêng trước khi làm.
- Không seed, tạo/sửa bản ghi để test, gọi API/UI confirm có side effects, gọi OTP hoặc VietMap tính phí nếu chưa được PO cấp đúng phạm vi. Việc ứng dụng dùng provider trong code production không đồng nghĩa agent được gọi provider thật để kiểm thử.
- Không commit/push/reset/discard; không nâng framework để xử lý nhãn Next.js stale trong ảnh, vì đó không phải nguyên nhân của lỗi property length.
- Không lấy các thay đổi ngoài task vào diff. Không tự sửa Mobile, navigation hoặc lifecycle khác.

## 8. Kiểm chứng tập trung và điều kiện hoàn thành

Không giao PO checklist hàng chục tình huống. Agent tự kiểm tra source và chạy các kiểm chứng an toàn phù hợp:
1. Contract options thực tế khớp UI, bao gồm response rỗng/sai cấu trúc và nested fields; luồng preview/confirm không còn field mismatch/whitelist errors.
2. Hai tiêu chí được validate và đi tới tham số solver, tổng thời gian gồm dừng, thay input loại preview cũ; kiểm chứng dựa logic production, không tests chỉ tìm string trong source.
3. Một chiều không khả thi/UNAVAILABLE thì không được confirm; token hết hạn/sai owner/stale/duplicate không làm ghi sai; lưu đúng geometry/stops/metrics và cả hai Routes atomic.
4. Bảo toàn Trip cũ khi thêm học sinh, giữ frozen/history khi đổi địa chỉ.
5. Typecheck API và Web với compiler đã cài (`npx --no-install tsc --noEmit --incremental false`); lint files thay đổi. Chỉ chạy unit tests pure/in-memory đã kiểm tra không có DB/network side effects. Không tạo fake fixture/provider response để giả chứng minh VietMap thật hoạt động.
6. Đồng bộ và kiểm tra Swagger UI/JSON tại server hiện có; không mở server trùng port. Nếu không truy cập được, ghi NOT_VERIFIED cùng lý do.

Kết quả provider/UI mutation thực tế chưa được phép phải ghi NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY tương ứng, không đánh PASS bằng typecheck. Có thể quan sát UI và GET an toàn trên dữ liệu sẵn có. Sau sửa chỉ đề nghị PO thử ba luồng chính: mở/chọn tuyến; kiểm tra thêm học sinh; kiểm tra đổi địa chỉ với hai tiêu chí mới. Không yêu cầu PO tự tìm lại các lỗi contract mà source có thể xác nhận.

Trước khi ghi đè LATEST, archive báo cáo và diff hiện có. Cập nhật LATEST.md đủ 13 mục, LATEST.diff chỉ task; nêu nguyên nhân, files sửa, contract cuối cùng, cách dùng hai tiêu chí, kết quả đã chạy và phần chưa kiểm chứng. Không tuyên bố hoàn tất nghiệp vụ chỉ vì typecheck PASS. STOP AFTER TASK.
