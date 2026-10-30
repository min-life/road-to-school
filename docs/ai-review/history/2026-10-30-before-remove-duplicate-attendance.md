# AI Review — Trạng thái xuống xe chiều về

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Analysis. Status: COMPLETED. DISCUSSION MODE.

## 2. Original Request
Kiểm tra chiều về khi đến điểm trả của con đã hiển thị đã xuống xe hay chưa chưa.

## 3. Approved Scope
Chỉ kiểm tra và trả lời; chưa có chỉ thị sửa code. Không commit/push.

## 4. Analysis & Decisions
Đã có nhánh xác nhận xuống xe theo riêng studentId: parentJourneyCard lấy children.find(studentId), isAlighted/alightedAt. Với PRESENT + alighted, summary tag Đã xuống xe (success), rail đến đích và giờ thực tế từ alightedAt. Expanded hiển thị Đã xuống xe an toàn và giờ xuống xe nếu có.
Chưa đầy đủ nhánh đến điểm trả nhưng chưa xuống: schoolArrived chỉ được truyền true cho TO_SCHOOL. Chiều về PRESENT + chưa xuống vẫn là Đã điểm danh ở summary và Đã lên xe ở expanded, rail ở 2/3 khi IN_PROGRESS. OperationalStateResponse chưa có event riêng xác nhận xe đã đến điểm trả từng con. Không dùng giờ dự kiến để khẳng định đã đến.

## 5. Implementation Details
No application code changes. Cập nhật LATEST.md, đánh dấu LATEST.diff không có code changes. Lưu review/diff trước vào history/2026-10-30-before-return-alighting-analysis.md và .diff.

## 6. Database Changes
None. Không truy cập DB, không tạo dữ liệu kiểm thử.

## 7. API & Swagger Changes
None. Chỉ đọc client types và source; không gọi API. Swagger N/A.

## 8. UI/UX Changes
None. Phân tích xác nhận phần Đã xuống xe đã có, phần Chưa xuống xe khi đến điểm trả chưa đủ. Không thay UI hoặc wireframe.

## 9. Verification & Testing
PASS: đọc index.tsx, trip-card.tsx, parent-journey-stage.ts, parent-journey.ts và OperationalStateResponse trong api-client.ts. Đối chiếu source tests chiều về hiện có, không chạy lại suite.
PASS: git diff --check cho báo cáo.
NOT_VERIFIED: hành vi thực tế trên thiết bị/phiên API thật. Typecheck/build/lint không chạy lại vì không thay application code.

## 10. Issues & Risks
Không thể khẳng định xe đã đến điểm trả chỉ từ alighted=false hoặc giờ dự kiến. Nhãn Chưa xuống xe ở điểm trả chưa có điều kiện arrival riêng chiều về. Việc nhận cập nhật thực tế còn độ trễ polling; chưa kiểm chứng runtime.

## 11. Reviewer Focus
Không nhầm arrive-at-school với arrive-at-child-dropoff. Phân biệt chưa có xác nhận xuống xe với đã đến điểm trả nhưng chưa xuống. Trạng thái mỗi con theo ID riêng.

## 12. Suggested Next Step
Bổ sung nhãn chiều về Đang trên xe · Chưa xác nhận xuống xe khi PRESENT và chưa alighted, không khẳng định xe đã đến điểm trả; chỉ triển khai sau yêu cầu PO.

## 13. Approval Status
Phân tích theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Chưa sửa application code.
