# AI Review — Splash dành riêng cho phụ huynh

## 1. Task Information

13/11/2026, Asia/Saigon. Scope Mobile và Documentation. Type Implementation. Status COMPLETED. Nhánh dongnnp/mobile/refactor-ui, baseline 0235765. Working tree sạch trước task.

PO yêu cầu commit phần đã hoàn thành trong lượt tiếp theo ngày 13/11/2026. Đã rà phạm vi 12 file source/assets/docs của splash, dùng thông điệp `feat(mobile): add dedicated parent splash on login and session restore`.

## 2. Original Request

PO cung cấp SVG phụ huynh và yêu cầu implement splash này khi người dùng là phụ huynh vào app.

## 3. Approved Scope

Dùng mẫu SVG để cập nhật presentation splash PARENT và nối với luồng mở app sau xác thực phiên. Đọc RootNavigation/AuthProvider/RoleSplash và components/theme hiện có trước triển khai. Kiểm tra tĩnh, build và isolated preview, cập nhật docs theo implementation thực tế. Task thực hiện local.

## 4. Analysis & Decisions

Trước task, ParentLoginSplash dùng BrandLogo chung, RoleSplash xuất hiện sau manual login với duration mặc định 1200 ms. restoreSession xác thực user nhưng chưa đặt splashRole. User chỉ xác định được sau GET /auth/me, nên giai đoạn chờ user dùng splash chung, sau xác thực PARENT thành công dùng splash theo vai trò.

Chọn hình phụ huynh căn giữa trên nền kem, frame vuông tối đa 240 dp, tiếp nối message/thanh chuyển màn có sẵn. Mẫu và yêu cầu implement trực tiếp của PO là cơ sở trình bày, giữ bố cục loading hiện có. Các ký tự escape trong SVG chat được chuẩn hóa thành XML, giữ viewBox/hai path/fill-rule/hai màu. PNG xuất bằng sharp đã cài trong web/node_modules để render bằng React Native Image local.

Skill ui-ux-pro-max được dùng cho kiểm tra kích thước ảnh và responsive. Query safe area responsive image với stack react-native trả hướng dẫn xác định kích thước và responsive phù hợp. Tái sử dụng Image/dependencies hiện có.

## 5. Implementation Details

- [ParentLoginSplash](../../mobile/components/parent/login-splash.tsx) render ảnh phụ huynh trong frame vuông width 100%, maxWidth 240, Image contain với accessibility label.
- [AppLoadingSplash](../../mobile/components/app-loading-splash.tsx) thêm prop illustration tùy chọn, null/undefined dùng BrandLogo mặc định, chia sẻ safe area/cuộn/message/loading.
- [AuthProvider](../../mobile/context/auth-context.tsx) thêm điều kiện currentUser.role PARENT sau getMe thành công trong restoreSession để đặt splashRole PARENT. Luồng kết thúc dùng onSplashFinish hiện có.
- Thêm [SVG](../../mobile/assets/images/brand/parent-splash.svg) và [PNG](../../mobile/assets/images/brand/parent-splash.png), 720 × 720, alpha, 35.573 bytes.
- Thêm [spec splash](../architecture/mobile-parent-splash.md), cập nhật [UI status](../architecture/mobile-ui-implementation-status.md) và [bản đồ flow](../architecture/mobile-screen-business-flows.md).
- Review/diff trước được lưu nguyên bản trong history/2026-11-13-before-parent-role-splash.md và .diff. Review trước có các phần được gộp từ lịch sử merge, bản archive giữ toàn bộ nội dung đó. LATEST.diff chỉ gồm các file source/assets/docs của task này.

## 6. Database Changes

None.

## 7. API & Swagger Changes

None. Luồng khôi phục phiên tiếp tục dùng GET /auth/me hiện có. Verification không gọi API hoặc thực thi auth mutation.

## 8. UI/UX Changes

Ảnh phụ huynh trên nền colors.background, tối đa 240 dp, message Đang mở trang chủ... và thanh vàng 180 × 4. SafeAreaView/ScrollView/padding 24/frame max 320 từ component hiện có. Hình tĩnh, thanh dùng timer RoleSplash 1200 ms. Accessible image label và progressbar/busy.

Đăng nhập thủ công PARENT và khôi phục phiên PARENT thành công đi qua cùng presentation. Trước khi xác định role dùng splash chung. registerVerify tiếp tục quy tắc bỏ qua role splash sau tự đăng nhập đăng ký. Resume foreground của cùng instance không gắn thêm splash.

## 9. Verification & Testing

- PASS mobile `npx --no-install tsc --noEmit`, exit 0.
- PASS `npx --no-install expo export --platform all --output-dir <TEMP>/rts-parent-splash-export-20261113`, exit 0, tạo iOS/Android/Web/server bundles và bundle PNG mới.
- PASS XML parse, viewBox gốc, hai path, hai màu. PNG byte-identical với lần rasterize lại trực tiếp từ SVG.
- PASS 562 protected source hashes so baseline, gồm RoleSplash, RootNavigation, API/web, package/lockfiles. AuthProvider chỉ thêm ba dòng điều kiện PARENT trong restoreSession.
- PASS Chromium IAB isolated SSR của các component thực, React Native Web và SafeAreaView.web. Portrait 320 × 568, 375 × 812, 390 × 844 không tràn ngang, ảnh natural 720 × 720/frame 240 × 240. Ở 320 px, progress nằm trong vùng top 405/bottom 445. Preview cấp insets 44/34.
- PASS landscape 568 × 320, insets 0, ScrollView clientHeight 320/scrollHeight 360, có khoảng cuộn cho nội dung; scrollWidth 568.
- PASS splash chung ở 1440 × 900 render BrandLogo hai ảnh và spinner, DRIVER/BUS_ATTENDANT ở 320 × 568 đúng label theo role, không render ảnh phụ huynh và không tràn ngang.
- PASS `git diff --check` source/docs, kiểm tra whitespace file mới và 7 links của spec mới. LATEST.diff có text patch và binary PNG patch phục vụ review.
- NOT_VERIFIED native iPhone Expo Go/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type, timer/route transitions và khôi phục/đăng nhập thật trên thiết bị. SSR giữ progress ở giá trị đầu, xác minh presentation và branch role. Source kiểm tra wiring, chưa chứng nhận auth runtime.
- Mobile package.json chưa có lint script. Các ca cần tạo bản ghi/phiên hoặc mutation để UAT phải theo dữ liệu/quyền được PO cấp, BLOCKED_BY_TEST_DATA_POLICY khi thiếu quyền đó.

Ảnh preview tại TEMP/rts-parent-splash-375.png. Preview server đã dừng, tab đã đóng và viewport override đã reset. Output build/preview nằm ngoài repo.

## 10. Issues & Risks

Vai trò chỉ biết sau xác thực phiên, splash phụ huynh xuất hiện từ thời điểm đó. Native launch screen trước JavaScript vẫn theo Expo app config. Thời gian 1.200 ms biểu diễn chuyển màn, chưa phản ánh phần trăm tải dữ liệu Home. Native safe area và auth restore thực cần kiểm tra trên tài khoản/thiết bị của PO.

## 11. Reviewer Focus

Kiểm tra exact SVG path/viewBox và asset PNG, prop illustration fallback, giới hạn kích thước theo width, label/a11y và cuộn màn thấp. Rà điều kiện PARENT nằm sau getMe thành công, không suy đoán role từ token cũ. Xác nhận RoleSplash giữ timer/callback, root giữ navigation guard và registerVerify giữ quy tắc hiện có. Đối chiếu các kết quả preview với giới hạn SSR/native đã ghi.

## 12. Suggested Next Step

Kiểm tra trên Expo Go iPhone bằng phiên phụ huynh được cấp, gồm mở lại app và đăng nhập thủ công để nghiệm thu splash và chuyển vào Home.

## 13. Approval Status

Implement và commit local theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu trên thiết bị.
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
