# AI Review — Mất icon bus khi chuyển sang đang di chuyển

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Analysis. Status: COMPLETED. DISCUSSION MODE.

## 2. Original Request
Vì sao đổi trạng thái sang Đang di chuyển làm mất icon bus?

## 3. Approved Scope
Chỉ điều tra, giải thích theo câu hỏi PO. Không sửa application code hoặc dữ liệu, không commit/push.

## 4. Analysis & Decisions
journeyStagePosition trả 0 cho SCHEDULED trước khi xét TO_PARKING. Với IN_PROGRESS + TO_PARKING + UNMARKED, helper trả null. StudentJourneyDiagram chỉ render bus khi stagePosition !== null. Vì vậy nhánh chiều về chưa điểm danh mất bus khi chuyển trạng thái chuyến. Chiều về PRESENT trả 2/3, chiều đi UNMARKED trả 1/3. ABSENT/CANCELLED cũng chủ đích không có bus hành trình của con.
SQL được hướng dẫn trước chỉ đổi trips.status và actual_start_time, không cập nhật trip_attendances.status. Nếu dữ liệu của PO còn UNMARKED thì tái hiện đúng triệu chứng. Chưa đọc DB/phiên API thực, không khẳng định attendance của PO thực sự là UNMARKED. API start bình thường chặn chiều về còn UNMARKED; đổi SQL bỏ qua ràng buộc này. UI hiện chưa xử lý tốt tổ hợp chuyến đã chạy nhưng attendance chưa xác nhận; không được tự sửa attendance thành PRESENT để che vấn đề.

## 5. Implementation Details
No application code changes. Chỉ báo cáo LATEST.md và LATEST.diff. Lưu review trước tại history/2026-10-30-before-missing-bus-analysis.md và .diff.

## 6. Database Changes
None. Không kết nối/ghi DB, seed hoặc tạo dữ liệu test.

## 7. API & Swagger Changes
None. Không gọi API, không đổi contracts; Swagger N/A.

## 8. UI/UX Changes
None. Phân tích điều kiện render bus và khoảng trống xử lý trạng thái dữ liệu bất nhất. Chưa refactor UI hoặc yêu cầu duyệt wireframe.

## 9. Verification & Testing
PASS: đọc trực tiếp parent-journey-stage.ts và student-journey.tsx.
PASS: chạy chính function journeyStagePosition trích bằng TypeScript AST, transpile trong bộ nhớ bằng dependency sẵn có: SCHEDULED/TO_PARKING/UNMARKED -> 0; IN_PROGRESS/TO_PARKING/UNMARKED -> null; IN_PROGRESS/TO_PARKING/PRESENT -> 2/3; IN_PROGRESS/TO_SCHOOL/UNMARKED -> 1/3. Chỉ input enum/boolean thuần, không DTO/mock/business records hoặc API response giả.
PASS: git diff --check báo cáo.
NOT_VERIFIED: tổ hợp thực tế của chuyến PO trên DB/API và hiển thị thiết bị; không chạy build/typecheck do không sửa application code.

## 10. Issues & Risks
Không khẳng định dữ liệu thật khi chưa đọc được. Nếu chiều về đã PRESENT mà vẫn mất bus thì cần kiểm tra payload và nhánh render khác; chẩn đoán UNMARKED không đủ cho trường hợp đó. Chỉ sửa trip.status qua SQL có thể tạo tổ hợp không đi qua startTrip validation.

## 11. Reviewer Focus
Tách status chuyến khỏi attendance từng con; null thật sự không render bus. Không tự xác nhận học sinh đã lên xe, không giả định GPS lỗi.

## 12. Suggested Next Step
Kiểm tra trip_attendances.status của đúng con trong chuyến chiều về đang xem để xác nhận có còn UNMARKED không.

## 13. Approval Status
Phân tích theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Chưa sửa application code hoặc DB.
