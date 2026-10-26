# AI Review — Phân tích nhãn “Lập lịch” khi chuyến đã hoàn thành

## 1. Task Information
- Date: 25/10/2026 (Asia/Saigon).
- Scope: Mobile / Documentation; Type: Analysis; Status: COMPLETED analysis, fix WAITING_APPROVAL.

## 2. Original Request
PO hỏi nguyên nhân và cách khắc phục việc chuyến đã hoàn thành vẫn hiển thị “Lập lịch” trên Mobile ở mọi role.

## 3. Approved Scope
Phân tích source và đề xuất sửa. Không có chỉ thị triển khai fix trong câu hỏi này. Không sửa application code hoặc business data.

## 4. Analysis & Decisions
Nguyên nhân xác định từ code: hai màn hình lịch chỉ phân biệt isVirtual. Virtual hiển thị “Dự kiến”; mọi persisted Trip đều hiển thị literal “Lập lịch”, không đọc trip.status.
- Driver/Attendant: mobile/app/(tabs)/schedule.tsx:244.
- Parent: mobile/app/parent/schedule.tsx:238.
- Backend schedule dùng status DB tại api/src/trips/trips.service.ts:945, :1019, :1117; Mobile API client giữ payload, không ánh xạ sang label.
- Vì thế ngay cả response COMPLETED mới cũng vẫn render “Lập lịch”. Đây là lỗi mapping hiển thị có bằng chứng trực tiếp từ source, không phải bằng chứng DB của Trip cụ thể đang sai hoặc polling không chạy.
- Home và Detail có logic đọc status; literal “Lập lịch” tìm thấy ở hai màn hình lịch, không kết luận mọi màn hình Mobile đều mắc cùng lỗi.
- Thiếu sót của lần triển khai trước: đã sửa refresh nhưng bỏ sót status badge; tests scheduler/map và tsc không kiểm tra mapping nhãn. Đã đính chính AUD-04 trong audit plan.

Đề xuất tối thiểu: helper Mobile dùng chung cho hai màn hình, giữ badge/layout hiện tại; virtual → Dự kiến; SCHEDULED → Lập lịch; IN_PROGRESS → Đang chạy; COMPLETED → Đã hoàn thành; CANCELLED → Đã hủy. Status không nhận diện không được mặc định thành SCHEDULED. Thêm unit test cho đủ trạng thái/virtual và dùng helper thật trong cả hai màn hình. Không cần sửa Backend/Database/polling/dependency.

## 5. Implementation Details
No application code changes.
Cập nhật docs/ai-review/trip-state-synchronization-audit-plan.md để ghi nguyên nhân và đính chính trạng thái AUD-04; cập nhật LATEST.md/LATEST.diff cho task analysis.
Báo cáo và code diff implementation trước được lưu nguyên tại history/2026-10-25-trip-sync-implementation-before-schedule-label-analysis.md và .diff.

## 6. Database Changes
None. Không đọc/sửa business records, không migration/seed.

## 7. API & Swagger Changes
None. Đọc service/API client; không gọi authenticated GET hoặc mutation của Trip cụ thể.

## 8. UI/UX Changes
None trong phiên phân tích. Fix đề xuất chỉ sửa data binding/nhãn tại vị trí badge hiện có, không redesign.

## 9. Verification & Testing
- Đã kiểm tra git status, source schedule render, Backend serializers, API client và nội dung tests hiện có.
- PASS: npx --no-install tsc --noEmit --incremental false tại mobile, exit 0. Không dùng PASS này để chứng minh status label đúng.
- NOT_VERIFIED: response authenticated và DB status của Trip cụ thể PO đang xem; chưa tái hiện màn hình runtime.
- Không chạy lại unit suites vì không sửa code; không tạo dữ liệu hoặc mutate Trip để test.
- Một lượt đọc file dùng sai relative path khi cwd=mobile; đã đọc lại đúng path tại root. Typecheck không bị ảnh hưởng.

## 10. Issues & Risks
P1: nhãn persisted Trip ở lịch không phản ánh trạng thái thật dù auto-refresh nhận payload mới. Chưa sửa trong task này. Nếu PO đang nói một màn hình ngoài lịch, cần xác định đúng màn hình/Trip trước khi gán cùng nguyên nhân.

## 11. Reviewer Focus
Không đánh đồng persisted với SCHEDULED; cả hai màn hình phải dùng cùng mapping; virtual giữ Dự kiến; completed/cancelled history vẫn hiển thị nhưng nhãn đúng. Test phải dùng helper được UI sử dụng, không chỉ test một bản sao mapping.

## 12. Suggested Next Step
Triển khai fix mapping status cho hai màn hình lịch Mobile cùng regression tests, giữ nguyên layout và API/DB.

## 13. Approval Status
WAITING FOR USER REVIEW / FIX INSTRUCTION. Chỉ phân tích và đề xuất; dừng sau task.
