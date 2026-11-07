# AI Review — Giải thích hai mốc chiều về

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Analysis. Status: COMPLETED. DISCUSSION MODE.

## 2. Original Request
Vì sao ở Chờ khởi hành chiều về, rail chỉ có Trường học và Điểm trả của con?

## 3. Approved Scope
Chỉ kiểm tra và giải thích code hiện tại, chưa có yêu cầu thay đổi UI hoặc nghiệp vụ. Không commit/push.

## 4. Analysis & Decisions
StudentJourneyDiagram dùng outbound = direction === TO_SCHOOL. Chỉ outbound render mốc giữa và time badge điểm đón. Chiều đi có xuất phát, điểm đón, trường; chiều về coi trường là xuất phát, điểm trả của con là đích nên có hai mốc. Đây là quyết định trình bày hiện tại, không phải điều kiện thiếu API làm ẩn mốc thứ ba.
journeyStagePosition trả 0 với SCHEDULED thông thường; bus thay icon xuất phát. Chiều về bus ở trường khi chờ; khi chạy sau PRESENT thì ở 2/3 đoạn trường đến điểm trả. Mốc bãi cuối tuyến không nằm trên rail cá nhân; giờ kết thúc tuyến theo lịch vẫn có dòng riêng.

## 5. Implementation Details
No application code changes. Chỉ cập nhật báo cáo; lưu review/diff trước đó vào history/2026-10-30-before-return-journey-explanation.md và .diff. LATEST.diff đánh dấu không có code changes.

## 6. Database Changes
None. Không truy cập DB, không tạo dữ liệu test.

## 7. API & Swagger Changes
None. Không gọi hoặc sửa API; Swagger N/A.

## 8. UI/UX Changes
None. Không tạo hoặc sửa wireframe. Giải thích hai mốc địa lý khác số icon xe nằm giữa đường; tại Chờ khởi hành bus thay icon trường.

## 9. Verification & Testing
PASS: đọc trực tiếp student-journey.tsx, parent-journey-stage.ts, các helper trong parent-journey.ts và spec mobile-parent-student-journey.md.
PASS: đối chiếu điều kiện outbound, SCHEDULED -> 0, onStart và routeScheduledEnd.
Typecheck/build/lint không chạy lại vì không thay application code.
NOT_VERIFIED: runtime trên thiết bị/phiên API thật; không cần tạo dữ liệu cho phân tích source.

## 10. Issues & Risks
Chưa thống nhất thêm mốc bãi lên rail chiều về. Không mặc định số mốc chiều đi và chiều về phải giống nhau; trường đồng thời là điểm xuất phát chiều về. Không coi giờ tuyến kết thúc ở bãi là giờ con xuống xe.

## 11. Reviewer Focus
Phân biệt hành trình của con với toàn tuyến xe và hai mốc địa lý với số icon đang hiển thị. Không quy nguyên nhân thành thiếu dữ liệu API.

## 12. Suggested Next Step
Nếu muốn xem toàn tuyến chiều về, chốt bổ sung mốc Về bãi sau Điểm trả của con trước khi sửa UI.

## 13. Approval Status
Phân tích theo câu hỏi PO; WAITING FOR USER REVIEW / APPROVAL. Không có thay đổi giao diện được tự triển khai.
