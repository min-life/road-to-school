# AI Review — API trả dữ liệu xuống xe chiều đi

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: API/Mobile source analysis / Documentation. Type: Analysis. Status: COMPLETED.

## 2. Original Request
API có trả trạng thái đã xuống xe/chưa xuống xe cho chiều đi không?

## 3. Approved Scope
Chỉ xác minh contract và backend projection thực tế. Không sửa code/DB/API, không tạo dữ liệu hoặc commit/push.

## 4. Analysis & Decisions
Có dữ liệu đủ để phân biệt, dưới dạng boolean/timestamp, không phải AttendanceStatus mới. GET /trips/:id/operational-state nhánh PARENT trả children[] theo allowedChildren: studentId, attendanceStatus, markedAt, alightedAt, isAlighted=Boolean(alightedAt). Đồng thời trả isSchoolArrived/arrivedAtSchoolAt ở cấp chuyến.
PRESENT + isAlighted=true -> Đã xuống xe; PRESENT + isSchoolArrived=true + isAlighted=false -> Chưa xuống xe (chính xác là chưa có xác nhận xuống). PRESENT chưa school-arrival, isAlighted=false vẫn Đã điểm danh, không có nghĩa xe đã đến trường. UNMARKED/ABSENT có nhãn riêng, không ép Chưa xuống xe. AttendanceStatus vẫn PRESENT sau alighting.
GET /trips/mobile/parent/home-cards cũng trả childIsAlighted/childAlightedAt cho từng con. Home normalize bằng children.find(studentId), không lấy tổng alightedCount/isAllAlighted của chuyến làm trạng thái cá nhân. Đây là bằng chứng source, chưa gọi authenticated API để chứng nhận response runtime.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md/LATEST.diff; lưu review trước vào history/2026-10-30-before-outbound-alighting-api-check.md và .diff.

## 6. Database Changes
None. Không đọc hoặc ghi DB, không thêm business records/fixtures.

## 7. API & Swagger Changes
None. Đọc thực tế TripsService operational-state PARENT projection, Home DTO mapping và OperationalStateResponse. Không đổi Swagger/contracts, không gọi mutations.

## 8. UI/UX Changes
None. Làm rõ UI derive nhãn từ trường API có sẵn, không nhận enum/text Đã xuống xe trực tiếp.

## 9. Verification & Testing
PASS: đối chiếu backend children projection isAlighted/alightedAt, school arrival, Home childIsAlighted/childAlightedAt, mobile types và parentJourneyCard/studentJourneyBadge.
PASS: git diff --check báo cáo.
NOT_VERIFIED: response authenticated API thực tế và iPhone UI. Không chạy typecheck/build vì không thay application code.

## 10. Issues & Risks
isAlighted=false nghĩa chưa ghi nhận xác nhận xuống xe trong hệ thống, không phải bằng chứng vật lý con vẫn ở trên xe. Phải kết hợp school arrival để hiển thị Chưa xuống xe đúng ngữ cảnh đến trường. Không dùng shared completion hoặc school arrival để tự gán alighted=true.

## 11. Reviewer Focus
Per-child privacy và studentId match, boolean khác enum attendance; không nhầm isAllAlighted chung với isAlighted riêng. Báo đúng nguồn source thay vì runtime đã kiểm chứng.

## 12. Suggested Next Step
Kiểm tra thực tế TH3/TH4 chiều đi trên iPhone khi phụ xe cập nhật xác nhận xuống xe cho từng con.

## 13. Approval Status
Xác minh theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Không sửa code/DB.
