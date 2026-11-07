# AI Review — Reset trip to before attendant readiness for demo

## 1. Task Information
03/11/2026 Asia/Saigon. Scope: Database data / Documentation. Type: Demo-state reset. Status: COMPLETED.

## 2. Original Request
Reset chuyến đang trao đổi về trước khi bus attendant xác nhận sẵn sàng, để người dùng demo lại toàn bộ luồng.

## 3. Approved Scope
Người dùng yêu cầu rõ reset trạng thái dữ liệu cho demo. Chỉ chuyến chiều về 629290b4-dab7-438e-b10b-f02c50029bc2 ngày 03/11/2026. Không tạo records demo hoặc sửa code.

## 4. Analysis & Decisions
Đọc lại database: trip đã SCHEDULED, chưa có actualStartTime/actualEndTime/arrivedAtSchoolAt/navigationState; 2 attendances đều UNMARKED, chưa markedAt/alightedAt. Vì vậy chỉ cần đặt attendantReadyAt từ 2026-11-03T06:49:24.460Z về null để quay về trước xác nhận, không cần reset dữ liệu khác. Sự cố DRIVER_MISSING đã RESOLVED từ task trước được giữ nguyên để không tái chặn luồng.

## 5. Implementation Details
No application code changes. Dùng Prisma sẵn có qua script trong bộ nhớ. Báo cáo/diff cập nhật; archive báo cáo trước trong history/2026-11-03-before-trip-readiness-demo-reset.md / .diff.
Backup dữ liệu trước sửa: history/2026-11-03T09-20-40-085Z-trip-before-readiness-demo-reset.json.

## 6. Database Changes
Database: 127.0.0.1:5433/roadtoschool.
Table trips, id 629290b4-dab7-438e-b10b-f02c50029bc2.
Exactly 1 row updated and committed: attendantReadyAt -> null; Prisma tự cập nhật updatedAt. Status vẫn SCHEDULED. Không đổi phân công, lịch, route snapshot, attendance, incidents hoặc leave notices.
Transaction khóa trip, kiểm tra đúng ngày/chiều/status và chưa có dữ liệu vận hành/điểm danh; update có CAS theo updatedAt và attendantReadyAt. Assert toàn bộ dữ liệu ngoài attendantReadyAt/updatedAt giữ nguyên.
Không migrations hoặc seed.

## 7. API & Swagger Changes
None. Không gọi endpoints mutation hoặc giả mạo tài khoản. Không gửi notification/push; lịch sử thông báo cũ giữ nguyên.

## 8. UI/UX Changes
Không đổi UI source. Sau refresh, giáo viên có thể xác nhận sẵn sàng lại; tài xế chờ giáo viên sẵn sàng.

## 9. Verification & Testing
PASS: đọc lại dữ liệu trước sửa, có backup trước ghi.
PASS: cập nhật đúng 1 row và commit, assert chỉ readiness/updatedAt đổi.
PASS: transaction READ ONLY mới sau commit, chạy 3 phương thức getOperationalState/assertTripAccess/isTestMode từ source TS hiện tại với tài khoản tài xế và giáo viên thật, env local.
Kết quả: status SCHEDULED, assignmentStatus ASSIGNED, isAttendantReady false, attendantReadyAt null, canMarkReady true, canStartTrip false, startDisabledReason WAITING_FOR_ATTENDANT, unmarkedCount 2.
NOT_VERIFIED: refresh và demo đầu-cuối trên thiết bị, HTTP trong phiên đăng nhập, env thực tế tiến trình API. Không chạy build/typecheck vì không sửa code; không thực hiện hộ người dùng bước ready/điểm danh/start.

## 10. Issues & Risks
Database local dùng cho demo có TRIP_OPERATION_MODE=TEST trong file env. Khả năng ready kiểm chứng bằng cấu hình local đó; chưa kiểm tra env tiến trình API. Lịch sử incident/notifications giữ nguyên. Quy tắc chiều về vẫn yêu cầu xác nhận sẵn sàng và điểm danh đầy đủ trước khi start.

## 11. Reviewer Focus
Phạm vi chính xác một trip; chỉ attendantReadyAt/updatedAt đổi. Không xóa lịch sử hoặc mở lại DRIVER_MISSING đã xử lý; không reset/sinh attendance giả.

## 12. Suggested Next Step
Reload app trên tài khoản giáo viên và tài xế rồi demo: xác nhận sẵn sàng -> điểm danh -> bắt đầu chuyến.

## 13. Approval Status
Người dùng chỉ thị reset dữ liệu rõ ràng trong chat. Hoàn tất phạm vi đó; chờ người dùng demo, không tự chạy tiếp luồng vận hành.
