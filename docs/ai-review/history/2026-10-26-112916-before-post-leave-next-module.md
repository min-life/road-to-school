# AI Review — Đánh giá độc lập bản sửa UI/UX Báo nghỉ của Antigravity

## 1. Task Information
- Date: 26/10/2026 (Asia/Saigon).
- Scope: Review source API/Web/Mobile, verification an toàn, Documentation.
- Type: Independent Review; không sửa application code.
- Status: COMPLETED review / CHANGES_REQUESTED cho bản implementation. Phần UI chính đã implement, chưa đủ cơ sở nghiệm thu toàn bộ.

## 2. Original Request
PO yêu cầu đọc LATEST và đánh giá Antigravity đã làm tốt chưa. Đối chiếu với prompt sửa UI/UX Báo nghỉ, không triển khai fix hoặc tự chạy UAT ghi dữ liệu.

## 3. Approved Scope
Đọc báo cáo/diff/source liên quan; typecheck không incremental, unit tests đã rà soát không side effects và tái hiện hook thực tế bằng in-memory adapters. Chỉ ghi tài liệu review. Không schema/migration/dependency, OTP thật, business mutation hoặc Git write operations.

## 4. Analysis & Decisions

### F1 — P2: Chưa chống được duplicate alert/OTP request
File: mobile/hooks/use-quick-leave-notice.ts:36–51.

requestingTripId chỉ set sau khi xác nhận alert; trong lúc alert mở nó vẫn null. Hai lần trigger tạo hai alert; callback onPress của cả hai giữ snapshot requestingTripId=null, nên guard dòng 49 không khóa được callback cũ, kể cả state đã cập nhật. Tái hiện từ chính source hook (transpile rồi inject React/Alert/router/API adapters trong bộ nhớ) cho kết quả 2 alerts và 2 OTP calls tới stub. Không gọi mạng/DB, stub chỉ trả Promise pending, không bịa response thành công.

Tác động: có thể yêu cầu nhiều challenge, phát sinh rate limit hoặc chuyển màn OTP nhiều lần. Cần synchronous ref lock bao trùm alert + request, release đúng cancel/dismiss/error, cùng guard lifecycle/identity để response cũ không mở màn khi user đã rời. Hook hiện không có cleanup/generation guard. Kết luận trong báo cáo trước “xử lý triệt để” chưa đúng bằng chứng.

### F2 — P2: Chặn nhầm báo nghỉ nhân sự còn lại trên cùng Trip
File: api/src/trips/trips.service.ts:975–995 và 1065–1085.

Query lấy pending notices của cả DRIVER và BUS_ATTENDANT; canReportLeave mới thêm !hasPendingStaff. Khi tài xế có pending, giáo viên chưa Ready cũng mất nút báo nghỉ trên lịch; trường hợp đảo lại tương tự khi guard còn cho phép. Hai người cùng nghỉ trên một Trip là tình huống đã được plan cho phép. hasPendingStaff đúng để tính WAITING_ASSIGNMENT/chặn Start, nhưng không đúng để chống trùng báo nghỉ của người đang xem. Phải kiểm notice đúng kind/subject/actor, giữ riêng blocker toàn chuyến. Đây là regression trên action flag lịch; không kết luận mọi đường API báo nghỉ đều bị chặn.

### F3 — P2: Tests mới không kiểm tra production logic
Files: mobile/scripts/leave-notices-ui.test.ts:4,28,85 và web/src/components/admin/leave-notices/leave-notices.test.ts:6,40,53,82.

Cả hai suites tự định nghĩa helper/status arrays/handlers thay vì import implementation. Test in-flight guard dùng biến local được set đồng bộ, khác hook React đang dùng state và closure. Đã chạy lại 5 Mobile + 4 Web tests, đều PASS; cùng lúc actual hook reproduction ở F1 vẫn cho duplicate requests. Vì vậy các tests này không chứng minh UI, handler hoặc hook hoạt động đúng. Cần tests gọi code thực/shared helper, adapter injection hoặc hook harness phù hợp bằng dependencies hiện có; không thêm package chỉ để tăng test count.

### F4 — P2: LATEST.diff trước review không phải patch hợp lệ
File đã lưu nguyên vẹn tại history/2026-10-26-061031-before-leave-ui-independent-review.diff.

Chạy git apply --numstat trên LATEST.diff trước archive trả lỗi “corrupt patch ...:100”. File có các dòng “...” bỏ đoạn và cuối chỉ ghi mô tả thay đổi create.tsx, không chứa full task diff và thiếu các tests mới. Không thể dùng làm bằng chứng review đầy đủ so baseline. Cần xuất lại diff thực tế có cả files mới so snapshot trước task, không dùng HEAD diff tổng của mọi uncommitted work. Không reset/checkout lại baseline để làm việc này.

### F5 — P3: Parent status filter vẫn là chips
File: mobile/app/leave-notices/index.tsx:199–214.

Student chips đã bỏ và status options đúng ba mục ALL/RECORDED/WITHDRAWN. Tuy nhiên status filter Mobile vẫn ScrollView horizontal + TouchableOpacity, chưa theo đề nghị ưu tiên dropdown trong prompt sửa UI. Đây là thiếu đồng nhất UI mức thấp, không phải lỗi state nghiệp vụ. Web dropdown đã có.

### Những phần source đã làm đúng
- Web có dropdown trạng thái theo kind, ngày date input, chiều select, reset page/status khi đổi tab; student tab chỉ bốn cột, không có cột thay thế.
- Parent history không còn student selector; còn studentId cố định cho entry từ Student Detail. Student RECORDED/WITHDRAWN hiển thị Đã nhận/Đã hủy ở history/detail/Web.
- Form có dropdown modal cho học sinh và calendar modal có chuyển tháng/năm, không còn giới hạn ba ngày; dùng date-only YYYY-MM-DD, hiển thị dd/MM/yyyy. Effect options có cleanup current=false để bỏ response cũ, reset Trip và chỉ auto-select khi đúng một lựa chọn.
- Đã thêm nút vào đúng mobile/app/parent/schedule.tsx, dùng studentId của lịch và trip.id thật; nested button có stopPropagation.
- Home/lịch chung/lịch con dùng chung hook alert → request OTP → OTP screen, truyền serviceDate/direction từ card thay mặc định form. Không thấy bỏ OTP hoặc tự tạo notice ở confirm alert.
- Chưa đánh giá trực quan trên thiết bị/browser trong review này. Source có control không đồng nghĩa responsive/touch đã đạt nghiệm thu.

## 5. Implementation Details
No application code changes in this review. Chỉ cập nhật LATEST.md/LATEST.diff; archive nguyên báo cáo/diff Antigravity tại history/2026-10-26-061031-before-leave-ui-independent-review.md/.diff. Không sửa các lỗi tìm thấy.

Source đã đọc: hook quick leave, UI tests mới, Web page, Mobile create/history/OTP, các entry card Home/lịch chung/lịch Parent, TripsService schedule và LeaveNoticesService options. Kết luận chỉ trong phạm vi này, không phải audit toàn bộ module OTP/DB.

## 6. Database Changes
None. Không migration, SELECT hoặc ghi DB; reproduction không tạo challenge/notice/Trip. Không suy ra dữ liệu thực đã từng thay đổi hay không từ báo cáo Antigravity.

## 7. API & Swagger Changes
None in this review. F2 là vấn đề action flag Backend mới sửa; cần alignment đúng từng nhân sự. Không gọi mutation hoặc kiểm chứng runtime endpoint. Swagger status của Antigravity là claimed, chưa xác minh lại live UI/JSON trong review này; việc đọc OpenAPI cũng không chứng minh chín endpoints nghiệp vụ chạy đúng.

## 8. UI/UX Changes
None in this review. Cấu trúc UI chính đáp ứng phần lớn yêu cầu, còn F1/F2 ảnh hưởng thao tác thực và F5 thiếu dropdown ưu tiên. Chưa native/browser screenshot QA, chưa nghiệm thu OTP, danh sách refresh sau confirm/cancel trên thiết bị hoặc responsive calendar.

## 9. Verification & Testing
| Check chạy thực tế bởi Codex | Kết quả |
|---|---|
| api: npx --no-install tsc --noEmit --incremental false | PASS, exit 0 |
| web: npx --no-install tsc --noEmit --incremental false | PASS, exit 0 |
| mobile: npx --no-install tsc --noEmit --incremental false | PASS, exit 0 |
| Mobile: node --test scripts/leave-notices-ui.test.ts | PASS 5/5; test mirror, giới hạn như F3 |
| Web: node --test src/components/admin/leave-notices/leave-notices.test.ts | PASS 4/4; test mirror, giới hạn như F3 |
| Actual source hook, 2 trigger rồi 2 confirm trong in-memory harness | FAIL acceptance chống trùng: 2 alert, 2 calls tới OTP stub; 0 real network/DB writes |
| git apply --numstat docs/ai-review/LATEST.diff trước archive | FAIL parse, corrupt patch line 100; không apply thay đổi |
| Source review staff action flag | CONFIRMED_BY_SOURCE, F2; chưa chạy real API writes |
| git status --short thống kê trước review | 210 entries, nhiều uncommitted work cần bảo vệ |
| UI/device/OTP/email/notice mutation runtime | NOT_VERIFIED; phần có side effects BLOCKED_BY_TEST_DATA_POLICY |

Không chạy lại full 353 API/77 Web tests; các con số đó thuộc báo cáo Antigravity. Không coi unit test mock PASS là bằng chứng giao vận SMS/email thật. Hai suites mới có Node MODULE_TYPELESS_PACKAGE_JSON warning; không sửa package ngoài scope review.

## 10. Issues & Risks
Khuyến nghị chưa nghiệm thu toàn bộ. Ưu tiên F1/F2 trước, sửa tests và task diff để bằng chứng review đáng tin cậy hơn. UAT vẫn cần môi trường/tài khoản/Trip và scope ghi/gửi OTP do PO cấp. Không có bằng chứng rằng tất cả yêu cầu UI đã chạy trên thiết bị chỉ từ typecheck và báo cáo. Không kết luận tác giả cố ý báo sai; mức khẳng định trong LATEST cũ vượt kiểm chứng.

## 11. Reviewer Focus
Review ref lock và alert callbacks cũ, cancel/dismiss/unmount/session change; pending notice của actor hiện tại so với toàn Trip; test import production code; baseline task diff đầy đủ files mới; datepicker responsive và OTP metadata đúng con/ngày/chiều. Giữ các guards Ready/Start, creator-only cancel và Test Data Policy.

## 12. Suggested Next Step
Yêu cầu Antigravity sửa F1/F2, thay tests mirror bằng kiểm chứng production logic và xuất lại task diff đầy đủ trong một lượt remediation có kiểm soát trước UAT.

## 13. Approval Status
Review hoàn tất; CHANGES_REQUESTED là khuyến nghị kỹ thuật của reviewer, không thay PO cấp approval. Chưa sửa code hoặc tự triển khai remediation. STOP-AFTER-TASK, chờ PO chỉ thị.
