# AI Review — Cách nhận biết xe đến điểm đón trên UI chiều đi

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile analysis / Documentation. Type: Analysis. Status: COMPLETED. DISCUSSION MODE.

## 2. Original Request
Chiều đi trên UI làm sao biết xe đã đến điểm đón?

## 3. Approved Scope
Chỉ giải thích trạng thái hiện tại. Không sửa app/backend/schema/DB, không commit/push.

## 4. Analysis & Decisions
Hiện không xác định được độc lập xe đã đến điểm đón nhưng con chưa lên. Rail không dựa GPS; IN_PROGRESS + UNMARKED đặt bus1/3 rail (=2/3 chặng xuất phát đến điểm đón). Quan sát UNMARKED->PRESENT khi card đang mở, chiều đi đang chạy, giữ bus0.5 trong1600ms rồi chuyển5/6. Ban đầu mở card đã PRESENT không phát lại nhịp này. Đây là ghi nhận điểm danh, không phải event xe đến/rời pickup hoặc tọa độ. PRESENT chứng minh đã có xác nhận lên xe trong hệ thống, không cho biết thời điểm xe đến điểm đón độc lập. OperationalStateResponse có markedAt/arrivedAtSchoolAt nhưng không mốc đến điểm đón riêng. Không dùng lịch dự kiến hoặc vị trí biểu diễn2/3 làm bằng chứng xe đã đến.

## 5. Implementation Details
No application code changes. Chỉ LATEST.md/LATEST.diff; lưu review trước tại history/2026-10-30-before-pickup-arrival-ui-explanation.md và .diff.

## 6. Database Changes
None. Không truy cập hoặc ghi DB, không tạo dữ liệu test.

## 7. API & Swagger Changes
None. Đọc viewer types hiện có, không gọi/sửa API; Swagger N/A.

## 8. UI/UX Changes
None. Phân biệt minh họa điểm danh với xác nhận xe đến pickup. Luồng xác nhận đến điểm đón riêng là đề xuất chưa triển khai/duyệt.

## 9. Verification & Testing
PASS: đối chiếu journeyStagePosition, boardingFrame useLayoutEffect1600ms và OperationalStateResponse trong source hiện tại.
PASS: git diff --check báo cáo.
NOT_VERIFIED: runtime mobile/API event thật; không chạy build/typecheck vì không sửa application code.

## 10. Issues & Risks
Vị trí bus tại pickup chỉ tồn tại ngắn khi quan sát thay đổi điểm danh và không chứng minh đến điểm trước khi con lên. Không có sự kiện departure riêng nên cũng không khẳng định xe vừa rời pickup sau1600ms. Không biến markedAt thành giờ đến xe.

## 11. Reviewer Focus
Phân biệt xe đến điểm đón, học sinh đã lên và xe rời điểm. Không khẳng định có GPS/location hoặc enum/event chưa có.

## 12. Suggested Next Step
Nếu cần biết xe đã đến khi con chưa lên, thống nhất bổ sung luồng nhân sự xác nhận đến điểm đón trước khi thiết kế API/UI; chưa tự triển khai.

## 13. Approval Status
Trả lời theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Chưa sửa code/DB.
