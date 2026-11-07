# AI Review — Đồng bộ hướng dẫn FE và bàn giao mã nguồn, 07/11/2026

## 1. Task Information

- Task Name — Đồng bộ tài liệu FE với source API sau lượt audit 3.1–3.18 và đóng gói mã nguồn theo yêu cầu push của PO.
- Date — 07/11/2026, Asia/Ho_Chi_Minh.
- Project Scope — Documentation.
- Task Type — Implementation tài liệu.
- Status — COMPLETED đối với phạm vi cập nhật tài liệu. Các bug API còn lại và nghiệm thu runtime tiếp tục được theo dõi riêng.

## 2. Original Request

PO yêu cầu bảo đảm tài liệu dành cho FE khớp với API hiện tại. Các bug còn lại triển khai sau.

PO tiếp tục yêu cầu push code với commit ngắn gọn. Phạm vi đóng gói gồm các thay đổi API, Prisma migrations và docs đang chờ trên nhánh hiện tại chuongtv/update-be.

## 3. Approved Scope

Cập nhật hướng dẫn FE, liên kết ghi chú FE mục 3.2, ghi quyết định mới vào master plan/tracker/CURRENT_STATE và lưu báo cáo. Nội dung mô tả dựa trên controller, DTO, service và hành vi hiện hành của source.

Quyết định mới nhất của PO tách việc đồng bộ tài liệu khỏi việc sửa R01/R02/R07/R08/R09. Nghiệp vụ đích đã duyệt tiếp tục được giữ trong plan cho đợt triển khai sau.

Đích đưa mã nguồn lên là origin/chuongtv/update-be. Dùng commit message `fix(api): align business rules and FE docs`. Báo cáo được lưu trước commit để đi cùng bộ thay đổi. Kết quả commit/push được xác nhận bằng Git và phản hồi trong chat sau thao tác.

## 4. Analysis & Decisions

Tài liệu FE phải cho biết API thực sự nhận/trả gì và các giới hạn còn tồn tại. Hai sai lệch tài liệu R04/R05 đã được sửa. Năm bug API được đưa vào mục 13 của hướng dẫn để tránh mô tả hành vi dự kiến thành khả năng đã hoàn thành.

| Nội dung | Kết quả cập nhật |
|---|---|
| R04 — URL Home | Nhân sự dùng GET /trips/mobile/home-trip. Parent dùng GET /trips/mobile/parent/home-cards. |
| R05 — OTP | Số lượt còn lại nằm trong message lỗi HTTP 400. Chưa có field JSON attemptsRemaining. Tên purpose đúng enum. TTL mặc định 300 giây và có cấu hình. |
| Response OTP | Auth request OTP trả message. Các endpoint OTP nghiệp vụ trả expiresInSeconds, kèm challengeId và thông tin kênh theo endpoint. |
| Response lịch Parent | Ghi đúng studentId, studentName, selectedDate, trips và items. trips/items chứa cùng danh sách. |
| Đọc Mobile | Bổ sung bảng method/path, quyền và response cho Home, lịch, detail, operational-state và attendance. |
| Báo nghỉ | Bổ sung options/otp/confirm, query/body/response, canReport/disabledReason và khác biệt role sau Ready. |
| Vận hành | Làm rõ role của action flags, thứ tự chọn startDisabledReason, status/response correction, cancel-all-absent, reopen và close incident. |
| Trường | Inactive/schedule/location có effectiveDate mặc định ngày mai. Active lại qua isActive=true là thao tác ngay khi đủ điều kiện. |
| Bãi | Làm rõ bán kính mặc định lần đầu, giữ giá trị khi bỏ field lúc cập nhật và expectedFingerprint tùy chọn. |
| Local | Làm rõ dependency theo lockfile, env được cấp, lệnh chạy, port mặc định/cấu hình, base/Swagger/OpenAPI và Bearer token. |
| Kiểm chứng | Phân biệt các kết quả lịch sử với Swagger/runtime chưa xác nhận. |

Mục 13 của hướng dẫn mô tả các bug API được PO hoãn xử lý như sau.

| Mã | Hiện trạng vẫn tồn tại trong source |
|---|---|
| R01 | Flag báo nghỉ khác nhau giữa Home/detail/schedule và khác policy ghi theo role. Màn báo nghỉ dùng options với canReport/disabledReason. |
| R02 | Flag Start chưa kiểm nguồn lực đang chạy chuyến khác, mutation Start đã kiểm và có thể trả 409. |
| R07 | Counters/action flags operational-state còn đếm attendance đã excluded. Roster GET attendance đã lọc excluded. |
| R08 | API điểm danh/xuống xe cũ còn thiếu guard excludedAt. Correction mới đã chặn. |
| R09 | Lịch phụ xe còn trả giờ đã lưu khi giờ hiệu lực đã đổi và cron chưa đồng bộ. |

Mô tả các giới hạn cho FE không đồng nghĩa đóng bug hoặc hoàn thành nghiệp vụ đích. Báo cáo audit chi tiết trước đó đã được lưu tại `docs/ai-review/history/2026-11-07-before-fe-guide-alignment.md` để tiếp tục triển khai sau.

## 5. Implementation Details

No application code changes.

Các file cập nhật trực tiếp cho task này gồm

- `docs/FE_INTEGRATION_GUIDE.md` — Contract tích hợp và mục 13 về các giới hạn API hiện tại.
- `docs/ai-review/school-3.2-fe-pr-notes.md` — Dẫn tới hướng dẫn hiện hành và mục giới hạn.
- `docs/ai-review/business-improvement-master-plan-3.4-3.18.md` — AA19 ghi quyết định PO và kết quả đồng bộ tài liệu.
- `docs/BUSINESS_IMPROVEMENT_TRACKER.md` — Cập nhật R04/R05 đã sửa tài liệu và năm bug API còn mở.
- `docs/ai-handoff/CURRENT_STATE.md` — Cùng trạng thái hiện hành cho người tiếp quản.
- `docs/ai-review/LATEST.md` — Báo cáo này.
- `docs/ai-review/LATEST.diff` — Ghi No code changes for this task.

Đã lưu báo cáo và diff trước task vào `history/2026-11-07-before-fe-guide-alignment.md` và `.diff`. Diff cũ chứa thay đổi của mốc implementation trước, không dùng làm diff task tài liệu hiện tại.

## 6. Database Changes

None. Trạng thái 19 migrations đồng bộ là kết quả đọc ở lượt audit ngay trước task này, chưa chạy lại migrate status trong lượt cập nhật tài liệu. Không phát sinh thay đổi cấu trúc hoặc dữ liệu.

## 7. API & Swagger Changes

None. Chỉ cập nhật mô tả tài liệu theo controller/DTO/service đang có.

Đã dùng TypeScript AST đọc controllers và so khớp 47 cặp method/path duy nhất được ghi bằng method cụ thể trong FE guide với 165 route hiện có. Không còn cặp đường dẫn chưa khớp. Kiểm tra này chuẩn hóa tên biến path parameter, chưa chứng minh hành vi HTTP hoặc toàn bộ schema response.

Mốc GET OpenAPI local trong lượt audit trước bị timeout sau 4 giây. Task này không khởi động lại server/scheduler để kiểm Swagger. Runtime OpenAPI còn NOT_VERIFIED.

## 8. UI/UX Changes

None. Tài liệu có lưu ý dành cho FE về refresh trạng thái, chọn studentId từ roster hiện tại và phản hồi lỗi, chưa triển khai UI.

## 9. Verification & Testing

| Kiểm chứng thực hiện trong task | Kết quả |
|---|---|
| Đọc controller/DTO/service để đối chiếu field, role, status và response | Đã thực hiện static review. |
| Phân tích AST so khớp method/path trong FE guide | PASS sau cập nhật, 47 cặp được mô tả đều khớp controller, unmatched rỗng. Chỉ xác minh method/path. |
| `npx --no-install tsc --noEmit` tại api | PASS, exit 0. |
| Kiểm tra trước commit/push theo yêu cầu bổ sung | Đã chạy lại typecheck, PASS. git diff --check toàn bộ tracked changes đạt. Remote và HEAD cùng ở 41cf3b0 trước commit. Không phát hiện Git hook thực thi đang được cấu hình. |
| So hash diff tracked của api/web/mobile đầu và cuối task | PASS, cùng giá trị 48706b5f2e7ee53aff9eb741018703857f2c8281. |
| `git diff --check` cho tài liệu cập nhật | PASS sau chỉnh sửa. |
| Unit/integration/E2E script test | NOT_VERIFIED, user yêu cầu chưa chạy script test. |
| API mutation, provider, cron và FE UAT | NOT_VERIFIED. Các ca cần dữ liệu/mutation chưa được phép mang nhãn BLOCKED_BY_TEST_DATA_POLICY. |
| Swagger HTTP runtime | NOT_VERIFIED, giới hạn của lượt audit trước vẫn được ghi rõ trong hướng dẫn. |

Việc xác minh tài liệu theo source chưa thay thế nghiệm thu hành vi vận hành thực tế.

## 10. Issues & Risks

R01/R02/R07/R08/R09 vẫn còn trong source, đã được PO hoãn triển khai và được mô tả ở FE guide mục 13. FE vẫn có thể gặp khác biệt giữa flags/counters với kết quả API ghi, request điểm danh giữ studentId cũ và giờ trên lịch phụ xe. Việc sửa tài liệu không xử lý các nguyên nhân này.

Workflow thay phương án cùng nhóm vẫn chờ chốt riêng. Các giới hạn snapshot/override legacy và trạng thái UAT tiếp tục được lưu trong hướng dẫn.

## 11. Reviewer Focus

Kiểm URL và response theo source hiện hành. Xác nhận FE không đọc attemptsRemaining như field API đã có. Đối chiếu parent schedule response và body báo nghỉ với DTO. Khi đọc nghiệp vụ đích trong plan, đối chiếu AA19 và mục 13 FE guide để biết các bug đang hoãn.

## 12. Suggested Next Step

FE tích hợp theo FE_INTEGRATION_GUIDE hiện hành và ghi nhận các ca gặp giới hạn mục 13 để chuẩn bị đợt sửa API sau.

## 13. Approval Status

WAITING FOR USER REVIEW / APPROVAL.
