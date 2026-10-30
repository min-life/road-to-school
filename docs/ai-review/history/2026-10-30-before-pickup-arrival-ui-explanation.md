# AI Review — Sau đổi giờ, chuyến chiều đi vẫn chưa được chọn trên Home

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: API/Mobile analysis / local DB readonly / Documentation. Type: Analysis. Status: COMPLETED.

## 2. Original Request
PO đã chạy script đổi khung giờ chiều đi nhưng chưa hiện trên Home, hỏi admin có phải duyệt gì không.

## 3. Approved Scope
Kiểm tra source và trạng thái DB sau PO chạy script. Không thực thi ghi DB, không duyệt/gọi mutation hoặc sửa code, không commit/push.

## 4. Analysis & Decisions
Không cần admin duyệt lại cho thay đổi local này: đã có persisted Trip/roster; getParentHomeCards không kiểm duyệt lại RoutePlan khi hiển thị. SCHOOL_ADMIN duyệt RoutePlan DRAFT->ACTIVE trước giai đoạn sinh chuyến, không phải duyệt từng lần sửa giờ Trip qua SQL.
Read-only kiểm tra lúc13:44:08 VN30/10: outbound a3e8934d-aceb-40b8-b968-f25d02334491 SCHEDULED, lịch13:47-14:32, snapshot13:47-14:32, plan ACTIVE. Cả2 con roster hợp lệ, eligible=true, priority2. Chuyến về599eb163-94fc-4c4c-9d17-d1f274ae177e IN_PROGRESS, plan ACTIVE, lịch16:30-17:15, eligible=true, priority1 cả2 con. Script đã có hiệu lực trên local DB; nguyên nhân không chọn chiều đi là Home chỉ chọn1chuyến/con và ưu tiên IN_PROGRESS hơn SCHEDULED. Chuyến SCHEDULED không tự start khi đến giờ, driver start qua luồng nghiệp vụ.
Màn parent/schedule.tsx lấy lịch tuần qua getParentStudentSchedule và lọc ngày, không giới hạn thành một Home card nên là điểm xem chiều đi phù hợp trước mắt. Không tự đổi ưu tiên Home hoặc trạng thái chiều về để che nguyên nhân.

## 5. Implementation Details
No application code changes. Chỉ LATEST.md/LATEST.diff; lưu review trước tại history/2026-10-30-before-post-reschedule-visibility.md và .diff.

## 6. Database Changes
None by agent. Chỉ SELECT current clock, trips/route plans/snapshot và roster các con của tài khoản PO. Xác minh kết quả thay giờ do PO đã chạy; không tự INSERT/UPDATE/DELETE/seed hoặc tạo dữ liệu test.

## 7. API & Swagger Changes
None. Đọc getParentHomeCards, generation ACTIVE condition, docs role approval và ParentStudentSchedule. Không gọi authenticated API hoặc mutation. Swagger N/A.

## 8. UI/UX Changes
None. Giải thích Home một thẻ/con khác màn lịch tuần, không sửa layout hoặc wireframe.

## 9. Verification & Testing
PASS: psql readonly local theo cấu hình backend, PGOPTIONS default_transaction_read_only=on, credential không in ra, exit0. Cả2 con có2chuyến ngày30/10: đi13:47-14:32 SCHEDULED/eligible/priority2, về16:30-17:15 IN_PROGRESS/eligible/priority1, các plan ACTIVE.
PASS: đối chiếu source Home filter/sort, generation ACTIVE và docs SCHOOL_ADMIN approval; parent/schedule.tsx lấy trips lịch tuần, lọc theo selectedDate.
PASS: git diff --check báo cáo.
NOT_VERIFIED: authenticated API payload/Expo runtime và process backend có dùng cùng DB config hay không. Không chạy typecheck/build vì không đổi application code.

## 10. Issues & Risks
Đổi giờ không thay Home priority hoặc status. Chuyến chiều đi sẽ lại bị lọc sau14:32 theo scheduled_end_at nếu không thay luồng/filter; không hứa luôn hiện sau đổi giờ. App hoàn toàn trống thì cần điều tra API/account/environment khác, dữ liệu local hiện đủ cho chuyến về. Không đề xuất duyệt lại hoặc sinh thêm chuyến trùng.

## 11. Reviewer Focus
Phân biệt RoutePlan approval, persisted Trip, reschedule và priority. Ghi nhận script do PO chạy thành công trên DB, không quy thành agent đã mutate. Không tự xử lý chuyến về bằng dữ liệu điểm danh giả.

## 12. Suggested Next Step
Mở Lịch học & Xe đưa đón của con, chọn30/10 để xem chuyến chiều đi13:47-14:32.

## 13. Approval Status
Phân tích theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Không thay đổi app/backend/database.
