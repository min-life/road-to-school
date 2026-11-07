# AI Review — Search theo chuỗi ký tự học sinh

## 1. Task Information
Task: Rà soát và sửa matching search trong popup chọn học sinh. Date:01/11/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Frontend search fix. Status: COMPLETED helper/tests/static checks; native acceptance NOT_VERIFIED.

## 2. Original Request
PO phản ánh nhập ký tự sai vẫn hiện kết quả, yêu cầu tìm theo ký tự không phân biệt hoa thường, ví dụ tên Nguyễn Văn A phải tìm thấy khi nhập ăn.

## 3. Approved Scope
Kiểm tra và chỉnh thuật toán frontend dùng chung của popup Báo nghỉ/Đổi điểm. Không restyle, không API/DB/dependency changes, không commit/push. Giữ toàn bộ pending changes, gồm các forms, dialog và .env.example.

## 4. Analysis & Decisions
Kiểm tra thực tế helper cũ: ăn/ĂN/an đã khớp text Nguyễn Văn A; zzzz/x/f/foo/random không khớp text này. Chưa có chuỗi sai cụ thể ban đầu của PO, nên không khẳng định đã tái hiện đúng triệu chứng gốc. Source cũ tách query thành từng từ rồi kiểm tra mọi từ trong chuỗi nối tên+mã+trường. Do vậy từ có thể nằm rải rác, đảo thứ tự hoặc qua ranh giới các trường vẫn match. Đây là điểm điều chỉnh: toàn bộ chuỗi nhập sau chuẩn hóa phải xuất hiện liên tiếp trong ít nhất một trường riêng, thay vì ghép từ rời. Tìm kiếm tiếp tục trên tên, mã hoặc trường; không chỉ tên. Nếu query có trong mã/trường thì hiển thị vẫn đúng dù không nằm trong tên. Không dùng fuzzy/typo fallback hoặc any-character OR làm mọi query có một chữ chung đều match.

## 5. Implementation Details
- mobile/utils/search-text.ts: giữ lower-case/NFD/bỏ dấu kết hợp/đ→d; chuẩn hóa whitespace, trim query. Query rỗng/whitespace hiện tất cả. Query có nội dung nhưng chỉ còn rỗng sau bỏ dấu không tự hiện tất cả. fields.some(normalizedField.includes(normalizedQuery)) thay token.every trên chuỗi nối các fields. Không sửa data hoặc sort.
- mobile/scripts/search-text.test.ts:9 tests text primitives; thêm ví dụ PO và negatives, chống ghép trường/đảo từ/ký tự rời, Unicode chỉ dấu, whitespace; giữ code/leading0/null/punctuation checks.
- docs/architecture/mobile-leave-student-card.md và mobile-ui-implementation-status.md: mô tả thuật toán/positive-negative examples theo hành vi mới.
- Archive review trước tại history/2026-11-01-before-search-substring-fix.md/.diff; LATEST.diff chỉ4file so với baseline đầu task, không gom implementation popup/form từ task trước.

## 6. Database Changes
None. Không đọc/ghi DB, tạo record, seed hoặc sửa dữ liệu. Tên ví dụ là text PO cung cấp cho pure function test, không fake Student record/DTO/API response.

## 7. API & Swagger Changes
None. Search cục bộ, không network query, endpoint, contract hoặc Swagger changes. API client/props/data hooks/OTP không sửa.

## 8. UI/UX Changes
Không thay bố cục, search field, cards, avatar, keyboard/scroll, fixed/selected/disabled hoặc callbacks. Popup vẫn dùng helper chung cho cả hai form; query chỉ thay tập kết quả. Ví dụ ăn/ĂN/an khớp Nguyễn Văn A, ăx/zzzz không khớp text đó. Giữ tìm tên/mã/trường theo phạm vi ô search hiện có. Không cần wireframe mới vì không có layout refactor.

## 9. Verification & Testing
PASS: kiểm tra trực tiếp helper trước sửa bằng Node/transpile, ví dụ PO và chuỗi sai ghi nhận tại mục4; đây là helper execution, không native UI reproduction.
PASS: Mobile npx --no-install tsc --noEmit exit0 sau sửa source.
PASS: node --experimental-strip-types --test scripts/search-text.test.ts exit0,9/9 tests. Text primitives, không DB/network/fixtures hoặc API mocks. Node MODULE_TYPELESS_PACKAGE_JSON warning không chặn test; không đổi package config vì warning.
PASS:8protected SHA256 giữ dialog/picker, hai forms, API client/package/lock/.env.example đúng baseline, bao gồm pending work trước task. Scoped diff whitespace và13review sections.
Không rerun Expo export vì chỉ pure helper matching đã typecheck/test, không thay UI/import/dependency/router. Export của task trước là lịch sử, không báo như đã chạy lại.
NOT_VERIFIED: gõ/IME thực tế trên iPhone/Android, integrated authenticated popup, chuỗi sai gốc PO đã dùng. Không browser preview mới hoặc fake data để chứng minh triệu chứng.

## 10. Issues & Risks
Người dùng tìm một ký tự thường gặp có thể thấy nhiều học sinh vì khớp ở trường học hoặc mã chung; đây là tìm trên các trường đã công bố, không tự giới hạn chỉ tên. Tìm nhiều từ đảo thứ tự hoặc rải qua nhiều trường nay không match, theo diễn giải chuỗi ký tự liên tiếp đã thông báo trước sửa. Native symptom gốc chưa tái hiện; không khẳng định nguyên nhân duy nhất. Pending work không bị discard hoặc commit.

## 11. Reviewer Focus
Kiểm tra substring trong từng field và normalization tiếng Việt/đ/whitespace; không any-character OR, regex query hoặc join field. Kiểm tra empty so với combining-mark-only, partial code/leading zero và null field. Xác nhận helper cùng được dùng bởi popup chung, không đổi selection/permission/API/keyboard. Diff chỉ task hiện tại.

## 12. Suggested Next Step
Trên Expo Go iPhone, thử ăn/ĂN và một chuỗi không xuất hiện trong tên, mã lẫn trường của các con trong popup.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO; WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push, không tự chứng nhận native acceptance.
