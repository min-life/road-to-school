# AI Review — Chuyển chiều chuyến qua database

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Documentation / Database guidance. Type: Analysis. Status: COMPLETED.

## 2. Original Request
Có đổi chuyến chiều về thành chiều đi trực tiếp trong database được không?

## 3. Approved Scope
Kiểm tra source và hướng dẫn. Chưa xác định id chuyến/dữ liệu liên quan để thực thi chuyển đổi. Không mutate DB, không sửa source/config, không commit/push.

## 4. Analysis & Decisions
Trip.direction và Route.direction dùng TO_SCHOOL/TO_PARKING. Chỉ đổi trips.direction có thể đổi nhánh UI nhưng không đổi tuyến gắn route_id, thứ tự/loại stops, geometry, lịch, roster và route_snapshot. generateTrips xây snapshot từ tuyến và direction đồng bộ; resolveTripRoute ưu tiên snapshot cho stops/geometry/lịch. Đổi thêm routes.direction ảnh hưởng các chuyến dùng cùng tuyến và vẫn không đảo stops đúng. Không cung cấp UPDATE một cột như một phép chuyển đổi hợp lệ.
Hướng phù hợp kiểm tra chiều đi: tìm chuyến TO_SCHOOL đã có, xác nhận đúng con/ngày rồi dùng chuyến đó; chưa biết DB có chuyến phù hợp hay không, không tự tạo. Câu trả lời cung cấp SELECT các chuyến chiều đi hiện có cho PO tự chạy.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md/LATEST.diff; lưu review trước ở history/2026-10-30-before-trip-direction-guidance.md và .diff.

## 6. Database Changes
None executed. Không kết nối hoặc ghi DB, không seed, không tạo records. SELECT hướng dẫn chưa thực thi.

## 7. API & Swagger Changes
None. Chỉ đọc source schema/service/snapshot resolver. Swagger N/A.

## 8. UI/UX Changes
None. Không đổi UI để che dữ liệu chuyến không đồng nhất.

## 9. Verification & Testing
PASS: đối chiếu Prisma Route/RouteStop/Trip/RouteDirection; generateTrips tạo routeSnapshot và resolveTripRoute ưu tiên snapshot.
PASS: git diff --check báo cáo.
NOT_VERIFIED: dữ liệu chuyến thực tế trên local DB và SELECT thực thi. Không chạy build/typecheck vì không thay application code.

## 10. Issues & Risks
Đổi mỗi direction có thể tạo chuyến chiều đi với stops DROPOFF/SCHOOL_DEPARTURE/PARKING_END của chiều về. route_id + service_date unique, phải xem xét nếu chuyển tuyến; không tùy tiện ghi đè snapshot/lịch/roster hoặc sự kiện đang chạy. Không khẳng định có sẵn chuyến chiều đi khi chưa kiểm tra DB.

## 11. Reviewer Focus
Phân biệt đổi nhãn UI và chuyển đổi đầy đủ dữ liệu hành trình; không cập nhật route dùng chung để sửa một chuyến, không bỏ qua snapshot.

## 12. Suggested Next Step
Chạy SELECT để tìm chuyến chiều đi đã có của đúng ngày và học sinh, ưu tiên dùng chuyến đó để kiểm tra giao diện.

## 13. Approval Status
Hướng dẫn theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Không thực thi chuyển đổi database.
