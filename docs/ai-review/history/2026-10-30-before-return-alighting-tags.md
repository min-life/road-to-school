# AI Review — API trả dữ liệu xuống xe chiều về

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: API/Mobile source analysis / Documentation. Type: Analysis. Status: COMPLETED.

## 2. Original Request
Tương tự chiều đi, API có trả dữ liệu đã xuống xe/chưa xuống xe chiều về không?

## 3. Approved Scope
Chỉ xác minh và giải thích. TH4 chiều về vẫn deferred theo PO. Không sửa app/backend/DB/API hoặc commit/push.

## 4. Analysis & Decisions
Có dữ liệu xác nhận xuống xe cho cả hai chiều. Operational-state projection PARENT tạo children từ roster được phép xem, không chặn TO_PARKING, trả isAlighted=Boolean(alightedAt), alightedAt và attendanceStatus từng con. Home cards cũng có childIsAlighted/childAlightedAt. Với học sinh PRESENT, true nghĩa đã ghi nhận xuống xe, false nghĩa chưa có xác nhận; attendance vẫn PRESENT.
updateAlighting của BUS_ATTENDANT cho phép cả2chiều khi IN_PROGRESS và học sinh PRESENT; chỉ TO_SCHOOL bắt buộc arrivedAtSchoolAt trước xác nhận xuống xe. Không gọi mutation để kiểm tra.
Phần thiếu của TH4 chiều về là mốc độc lập xe đã đến điểm trả trước khi con xuống; không phải thiếu boolean xuống xe. isAlighted=false không phân biệt xe còn trên đường với đã dừng tại điểm trả. Không dùng isSchoolArrived cho chiều về hoặc plannedArrivalTime làm arrival thật. Hiện UI chiều về PRESENT/chưa xuống vẫn Đã điểm danh và2/3; giữ nguyên theo PO defer TH4.

## 5. Implementation Details
No application code changes. Chỉ LATEST.md/LATEST.diff. Lưu báo cáo trước tại history/2026-10-30-before-return-alighting-api-check.md và .diff.

## 6. Database Changes
None. Không đọc/ghi DB, seed hoặc tạo dữ liệu kiểm thử.

## 7. API & Swagger Changes
None. Chỉ đọc updateAlighting, operational-state PARENT projection và mobile helper. Không gọi API mutation hoặc authenticated runtime. Swagger N/A.

## 8. UI/UX Changes
None. Làm rõ API có alighting nhưng UI TH4 chiều về chưa có independent arrival, không tự mở lại phần PO đã hoãn.

## 9. Verification & Testing
PASS: kiểm tra source updateAlighting áp dụng cả2chiều, constraint PRESENT/IN_PROGRESS, field isAlighted/alightedAt của PARENT không lọc direction.
PASS: đối chiếu studentJourneyBadge/journeyStagePosition chiều về hiện hành.
PASS: git diff --check báo cáo.
NOT_VERIFIED: payload runtime authenticated hoặc native UI. Không chạy build/typecheck vì không thay application code.

## 10. Issues & Risks
false chỉ chưa có xác nhận xuống, không khẳng định vị trí hoặc thực tế con đang trên xe. Không suy ra arrived-to-dropoff từ global school-arrived hoặc hoàn thành tuyến. Không nhầm thiếu arrival event với thiếu dữ liệu alighting.

## 11. Reviewer Focus
Per-child fields và privacy, hỗ trợ directionTO_PARKING, giữ TH4 deferred. Không tạo enum/task triển khai mới từ câu hỏi xác nhận.

## 12. Suggested Next Step
Khi PO yêu cầu xử lý lại TH4, tách riêng nhãn chưa xác nhận xuống xe khỏi mốc xe đã đến điểm trả; chưa tự triển khai.

## 13. Approval Status
Phân tích theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL; TH4 chiều về giữ nguyên theo PO, không sửa code/DB.
