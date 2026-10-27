# Đánh giá UI/UX RoadToSchool — Web & Mobile từ mã nguồn

Ngày: **27/10/2026**. Phương pháp: **SOURCE REVIEW ONLY**. Trạng thái: hoàn tất phạm vi rà soát source được mô tả dưới đây; **không phải nghiệm thu toàn hệ thống trên giao diện thực tế**.

## 1. Tổng quan

Theo chỉ thị mới nhất của Product Owner, thay việc điều khiển Chrome/Android bằng đọc source và phân tích. Chỉ cập nhật báo cáo; không sửa source/component/style/config, không chạy script test, typecheck, lint hoặc build; không đăng nhập, gọi API, truy vấn DB, tạo tài khoản, gửi OTP/push hoặc tạo dữ liệu thử.

Báo cáo ưu tiên các vấn đề có thể truy vết từ UI qua service/DTO, đặc biệt ở trạng thái lỗi, lịch sử và sự cố vận hành. Tài khoản System Admin đã được PO cung cấp nhưng không được sử dụng trong lượt này; không ghi mật khẩu vào báo cáo.

**Cách đọc kết luận:**

- **SOURCE:** cấu trúc/nhánh xử lý đã xác định trong code. Đủ căn cứ nêu sự không nhất quán hoặc rủi ro cụ thể, chưa chứng minh đã xảy ra trên thiết bị.
- **CẦN RUNTIME:** độ dễ dùng, bố cục sau render, cảm nhận tốc độ, tương phản, TalkBack, bàn phím và hành vi native cần kiểm tra thực tế.
- Mức P1/P2 là mức ưu tiên đề xuất theo tác động, không phải bằng chứng lỗi production. Không có phát hiện P0 đủ căn cứ trong phạm vi này.

Bản báo cáo quan sát UI hạn chế trước đây được giữ tại `docs/ai-review/history/2026-10-27-ux-audit-before-expanded-source-review.md`. Lượt này không tiếp tục sử dụng công cụ điều khiển giao diện.

## 2. Độ bao phủ và các luồng xác định từ source

### Vai trò và điều hướng

| Vai trò | Điểm vào và chức năng thể hiện trong code | Giới hạn kết luận |
|---|---|---|
| SYSTEM_ADMIN | Web: Tổng quan, Trường học, Tài xế, Phương tiện, Phương án tuyến, Chuyến xe, Báo nghỉ, Sự cố, Yêu cầu, Cài đặt; tạo tài khoản nhân sự từ form quản trị | Menu không chứng minh quyền API hoặc mọi mutation hoạt động |
| SCHOOL_ADMIN | Web: Tổng quan, Phương án tuyến, Chuyến xe, Báo nghỉ, Sự cố, Học sinh, Giáo viên, Yêu cầu, Cài đặt | Chưa kiểm chứng scope trường trên tài khoản thật |
| DRIVER | Mobile: Trang chủ → chuyến; Lịch; Cá nhân; báo nghỉ/sự cố, điều hướng và mô phỏng trong Trip Detail theo điều kiện | Chưa thử Start/Complete/GPS/navigation/native lifecycle |
| BUS_ATTENDANT | Mobile: Trang chủ/Lịch → Trip Detail → Ready, điểm danh, xuống xe, QR; sự cố và giải trình | Chưa thử camera, điểm danh, giải trình hoặc đồng bộ |
| PARENT | Mobile: Trang chủ; Theo dõi → học sinh → lịch/yêu cầu/báo nghỉ; Cá nhân; thông báo | Chưa kiểm chứng liên kết con, privacy, OTP, dữ liệu thật |

Nguồn navigation: `web/src/components/admin/admin-nav.config.ts:12`, `mobile/app/(tabs)/_layout.tsx:10`. Không có role TEACHER riêng; giáo viên phụ xe là BUS_ATTENDANT.

### Phạm vi đọc

| Nhóm | Trạng thái source review | Đã xem | Chưa kiểm thử thực tế |
|---|---|---|---|
| Web authentication và shell | Đã rà | Login, layout, sidebar, menu theo role, header/bell | Sign-in, focus, responsive, session expiry |
| Tổng quan/thông báo | Đã rà | Counts/UI states/deep links, filters, cursor và error/retry | Độ đúng số liệu trên DB, event→inbox→tap |
| Trường/tài xế/giáo viên/phương tiện | Đã rà danh sách và form đại diện | Search/filter, pagination, loading/error, tạo nhân sự, cấu hình bãi xe | Toàn bộ chi tiết/edit/create; không chạy mutation |
| Phương án/lập tuyến/chèn học sinh | Đã rà luồng chính | Preparation, constraints, preview, confirm, lỗi, modal chèn | VietMap, preview token, race và kết quả tối ưu |
| Chuyến/vận hành | Đã rà phần UI và service liên quan | Role actions, sheet/tabs, map controls, modal, stale position, incident UI | Điều hướng thực tế, OS Back/camera, sensor, map sau render |
| Báo nghỉ/sự cố | Đã rà list/detail và contract liên quan | Error states, pagination, mapping, status, modal | Các hồ sơ thật, thời gian nghiệp vụ, xử lý thay thế |
| Parent học sinh/lịch/yêu cầu | Đã rà màn hình/handler đại diện | Lịch tuần, student detail/card, request list/detail/outcomes | Privacy end-to-end, liên kết/huỷ/OTP và request approval |

**Không chạy bất kỳ bộ kiểm thử nào.** Không đánh dấu một chức năng là “đã test thành công” chỉ vì đã đọc code. Không đọc toàn bộ repository; kết luận giới hạn ở file/luồng nêu trong báo cáo.

## 3. Vấn đề UI/UX và hướng giải quyết

### UX-01 · P1 · Lỗi dịch vụ bị biểu diễn thành dữ liệu rỗng hoặc chưa phân tuyến

**SOURCE, Web & Mobile.**

- Mobile sự cố: `mobile/app/incidents/index.tsx:54-64` đặt `incidents=[]` khi lỗi; nhánh `:186-191` hiển thị “Chưa có sự cố”.
- Mobile báo nghỉ: `mobile/app/leave-notices/index.tsx:53-65` đặt `notices=[]` khi lỗi; `:235` hiển thị “Chưa có báo nghỉ nào”.
- Web tuyến học sinh: `web/src/components/admin/students/student-routing-section.tsx:23-31` chỉ log lỗi; `:46-53` dùng `detail=null` làm “Học sinh chưa được phân tuyến”.
- Web phương án trường: `web/src/components/admin/schools/school-routes-tab.tsx:21-26,33-42,106` chỉ log lỗi rồi hiển thị nhánh danh sách rỗng hoặc dữ liệu cũ.

**Tác động:** người dùng có thể hiểu nhầm lỗi mạng/API thành không có sự cố, không có báo nghỉ hoặc chưa phân tuyến; có thể đưa ra quyết định dựa trên trạng thái không đúng.

**Đề xuất:** tách loading/error/empty; hiện lỗi ngắn và Thử lại. Nếu giữ kết quả cũ, báo dữ liệu chưa cập nhật; khi mất quyền thì xóa thông tin không còn quyền. Nghiệm thu sau sửa: lỗi tải không được hiện thông điệp khẳng định không có hồ sơ.

### UX-02 · P1 · Mobile hiển thị sự cố không khớp contract API

**SOURCE, Driver/Bus Attendant.**

API mapper `api/src/incidents/incidents.service.ts:1230-1257` trả `routeName`, `direction`, `serviceDate`, `schoolName` ở cấp ngoài, cùng `context` và `resolution`. `mobile/services/api-client.ts:826-854` trả kết quả trực tiếp, chỉ bóc `items` khi cần; không chuyển thành các alias UI.

Nhưng:

- `mobile/app/incidents/index.tsx:223-245` và `mobile/app/incidents/[id].tsx:258-305` chỉ mở khối thông tin chuyến khi có `incident.trip`, là object mapper không trả.
- `mobile/app/trip/[id].tsx:1962-1994` đọc `contextData`, `resolutionType`, `resolutionNote` thay vì `context`/`resolution`.
- `mobile/app/incidents/[id].tsx:224-236` có fallback `context`, nhưng tìm `recordedDistanceMeters`, `recordedDelayMinutes`, `stopAddressText`. Detector thực tế ghi `distanceMeters`, `delaySeconds`, `stopAddress` tại `api/src/incidents/incidents-detector.service.ts:270-277,389-400`.

**Tác động suy ra:** có thể mất tên tuyến/ngày/chiều và bằng chứng lệch tuyến, trễ; kết quả đã xử lý có thể không xuất hiện trong tab Sự cố của Trip. Đây là vấn đề dữ liệu đưa tới UI, không chỉ style.

**Đề xuất:** thống nhất contract hoặc một adapter rõ ràng; đổi `delaySeconds` sang phút khi hiển thị, dùng cùng mapping ở list/detail/Trip tab. Giữ nguyên masking cho Parent. Nghiệm thu: cùng hồ sơ phải có thông tin nhất quán ở Web, lịch sử Mobile và Trip Detail; không tự thêm dữ liệu để bù trường thiếu.

### UX-03 · P1 · Lịch sử Mobile dừng ở trang đầu mà không cho biết còn hồ sơ

**SOURCE, báo nghỉ và sự cố.**

`mobile/app/incidents/index.tsx:55-59` và `mobile/app/leave-notices/index.tsx:56-60` gọi API không truyền page/limit, chỉ giữ `res.items`; không có load-more hoặc navigation theo `totalPages` trong hai màn hình. API mặc định page1/limit20: `api/src/incidents/incidents.service.ts:413-462`, `api/src/leave-notices/leave-notices.service.ts:611-637`.

**Tác động:** nếu có hơn20hồ sơ trong bộ lọc, phần cũ không thể mở từ danh sách và không có thông báo dữ liệu bị giới hạn. Chưa biết dữ liệu hiện tại có vượt20 hay chưa.

**Đề xuất:** pagination hoặc tải thêm có loading/error/retry riêng; reset trang khi đổi filter, phân biệt hết dữ liệu và lỗi tải tiếp. Không dùng cách tải tất cả không giới hạn.

### UX-04 · P2 · Response cũ có thể ghi đè kết quả filter mới

**SOURCE, rủi ro cạnh tranh request.**

`web/src/app/admin/schools/page.tsx:53-82`, `web/src/app/admin/vehicles/page.tsx:43-65`, `mobile/components/parent/RequestListView.tsx:65-96`, cùng hai lịch sử Mobile trên, đặt kết quả trực tiếp sau await mà không có request-generation/current-scope guard tại các đoạn đã đọc. Đổi search/filter liên tục có thể tạo request chồng nhau; response trước có thể về sau.

**Đề xuất:** bỏ qua response không còn thuộc filter/identity hiện tại, hoặc hủy request cũ; khóa/đánh dấu rõ trạng thái chuyển trang. Có thể dùng mẫu `latestRequestRef` hiện có ở `web/src/app/admin/drivers/page.tsx:35-76`. Cần runtime với mạng chậm để đo biểu hiện, không khẳng định đã xảy ra.

### UX-05 · P2 · Trang chủ/lịch giữ dữ liệu cũ khi refresh lỗi nhưng không báo stale

**SOURCE, Mobile.** `mobile/app/(tabs)/index.tsx:54-60`, `mobile/app/(tabs)/schedule.tsx:86-89`, `mobile/app/parent/schedule.tsx:67-70` chỉ đặt lỗi mạng thông thường nếu chưa có dữ liệu. Khi đã có dữ liệu, lỗi có thể bị bỏ qua và UI không cho biết lần cập nhật thất bại.

**Tác động:** lịch hoặc trạng thái chuyến cũ có thể trông như vẫn hiện thời; khác với cảnh báo stale position ở map. 403/404 đã có nhánh xóa dữ liệu riêng, không quy kết tất cả lỗi đều giữ lại.

**Đề xuất:** giữ nội dung hữu ích nhưng có dấu “Chưa cập nhật”/thời điểm cập nhật và retry; tránh popup mỗi lần poll. Không giả định phải xóa toàn bộ dữ liệu khi mất mạng tạm thời.

### UX-06 · P2 · Quy tắc mật khẩu không đồng nhất

**SOURCE.** Đăng ký/đặt lại Mobile yêu cầu6ký tự (`mobile/app/(auth)/register.tsx:53,210`, `reset-password.tsx:66,207`); đổi mật khẩu Cá nhân yêu cầu8 (`mobile/app/(tabs)/settings.tsx:211,470`); DTO đổi mật khẩu API yêu cầu6 (`api/src/auth/dto/auth.dto.ts:187-190`).

**Đề xuất:** PO thống nhất một chính sách, đồng bộ validation và copy. Không tự quyết định hạ hoặc nâng ngưỡng. Chưa thử đổi mật khẩu và không yêu cầu cung cấp thêm mật khẩu.

### UX-07 · P2 · Một số nút biểu tượng thiếu tên hoặc khả năng truy cập bằng bàn phím

**SOURCE.** Nút mắt đăng ký Mobile (`register.tsx:224-230,253-259`), mũi tên tuần (`mobile/app/(tabs)/schedule.tsx:146-155`), nút quay lại/thêm báo nghỉ (`mobile/app/leave-notices/index.tsx:180-195`) không khai báo label rõ ở điều khiển. Nút hiện mật khẩu Web có label nhưng `tabIndex={-1}` tại `web/src/app/login/page.tsx:149` nên bị loại khỏi thứ tự Tab thông thường.

**Đề xuất:** đặt tên hành động, role/state hợp lý và hỗ trợ bàn phím; kiểm TalkBack/screen reader thực tế. Không kết luận vùng chạm quá nhỏ hoặc không đọc được chỉ từ kích thước icon/padding.

### UX-08 · P2 · Modal Web xử lý sự cố thiếu mẫu dialog thống nhất

**SOURCE.** `web/src/components/admin/incidents/resolve-incident-modal.tsx:114-132` tạo overlay và nút đóng, không có dialog role/aria-modal/nhãn dialog, xử lý Escape hoặc focus trong file. Modal báo nghỉ đã có phần ngữ nghĩa tương ứng (`web/src/components/admin/leave-notices/replacement-modal.tsx:87-89`).

**Đề xuất:** thống nhất dialog có nhãn, chuyển/trả focus, giới hạn focus khi mở, Escape khi an toàn; xác minh lớp bao và hành vi thực tế trước khi kết luận mức cản trở screen reader. Không chỉ thêm aria rồi coi accessibility đã hoàn tất.

### UX-09 · P2 · Một số Modal vận hành Android chưa xử lý nút Back

**SOURCE.** `mobile/app/trip/[id].tsx:2118,2144,2183` gồm modal xác nhận thao tác, nhập lý do vắng và QR chưa có `onRequestClose`. Các modal báo/giải trình sự cố mới hơn có handler tại `:2268,2382`.

**Đề xuất:** thống nhất hành vi Back và nút đóng; xử lý rõ khi đang gửi, quét QR hoặc có nội dung chưa gửi. Cần nghiệm thu Android; không khẳng định crash vì mới chỉ thấy thiếu handler.

### UX-10 · P2 · Menu Web mất mục active trên trang chi tiết

**SOURCE.** `web/src/components/admin/admin-sidebar.tsx:82` so `pathname === item.href`. `/admin/drivers/<id>` không bằng `/admin/drivers`, tương tự trường/chuyến/phương án nên mục cha không được đánh active bởi logic này.

**Đề xuất:** active theo nhánh route, xử lý `/admin` riêng để không active trên mọi trang; bổ sung `aria-current` phù hợp và breadcrumb. Đây là lỗi định hướng có thể suy ra trực tiếp, chưa đánh giá render/màu.

### UX-11 · P2 · Luồng nhận tài khoản nhân sự còn phụ thuộc môi trường development

**SOURCE / giới hạn bàn giao.** Form thêm tài xế chỉ gửi tên/email/phone, thành công rồi đóng (`web/src/components/admin/drivers/add-driver-modal.tsx:65-81`). `api/src/drivers/drivers.service.ts:188-212` bàn giao mật khẩu tạm qua logger chỉ khi NODE_ENV=development, HTTP không trả mật khẩu. Tạo nhân sự trường có cơ chế tương tự tại `api/src/schools/schools.service.ts:687-698`.

**Tác động:** UI tạo thành công chưa chứng minh nhân sự biết cách nhận quyền đăng nhập; với runtime khác development, đoạn code này không thực hiện gửi thông tin. Có thể đây là giới hạn chủ ý của dự án, không suy ra tài khoản hiện tại không dùng được.

**Đề xuất:** PO chốt luồng mời/kích hoạt an toàn và phản hồi trạng thái bàn giao. Không đưa mật khẩu vào bảng/UI/log production để giải quyết UX. Không tạo tài khoản thử hoặc đọc credential thực tế.

### UX-12 · P2 · Copy còn lộ thuật ngữ triển khai

**SOURCE.** `web/src/app/admin/routes/create/page.tsx:305,456,990-995` hiển thị DRAFT/Preview/VietMap VRP; `web/src/app/admin/settings/page.tsx:340,765` hiển thị “cascade”, DRAFT/ACTIVE. Trang sự cố có JSON raw cho loại không phải OFF_ROUTE/LATE_STOP tại `web/src/app/admin/incidents/page.tsx:487`.

**Đề xuất:** dùng “Bản nháp”, “Xem trước”, “Tối ưu tuyến”, “Đã hủy …”; chỉ hiển thị bằng chứng nghiệp vụ cần quyết định, kỹ thuật để khu vực hỗ trợ khi thực sự cần. Không xóa cảnh báo tác động quan trọng khi rút gọn chữ.

### UX-13 · P2 · Bộ lọc báo nghỉ nhân sự chưa có trạng thái chuyến bị hủy

**SOURCE.** `mobile/app/leave-notices/index.tsx:147-150` có badge TRIP_CANCELLED nhưng danh sách filter nhân sự `:168-175` không có lựa chọn này. Hồ sơ đó chỉ xem được trong Tất cả.

**Đề xuất:** cân nhắc thêm bộ lọc phù hợp. Không khẳng định học sinh có trạng thái thứ ba: các luồng hủy chuyến đã xem chỉ đổi báo nghỉ PENDING_REPLACEMENT, nên cần kiểm contract trước khi coi đây là lỗi với Parent. Nhãn Parent Đã nhận/Đã hủy vẫn là quyết định đã chốt.

### UX-14 · P2 · Điều khiển push luôn hiện dù môi trường không hỗ trợ

**SOURCE / cơ hội cải thiện.** `mobile/app/notifications.tsx:37` luôn hiện Bật/Tắt trên thiết bị. Provider loại native push trên Expo Go/Web (`mobile/context/notifications-context.tsx:17-29`), và `enablePush` chỉ thông báo không hỗ trợ (`:266-276`).

**Đề xuất:** UI phản ánh khả dụng của tính năng ngay tại khu vực push; giữ inbox hoạt động và không khiến người dùng lặp lại thao tác không thể thành công. Không đề xuất bật worker hoặc cài credential trong task audit.

## 4. So sánh Web/Mobile và điểm đang làm tốt

| Hạng mục | Bằng chứng source | Kết luận |
|---|---|---|
| Phân vai điều hướng | Nav config Web và Tabs Mobile tách role | Có nền tảng phù hợp5roles; chưa chứng minh server authorization |
| Sự cố | Web dùng `context.distanceMeters/delaySeconds` và fields ngoài; Mobile dùng alias không đồng nhất | Ưu tiên UX-02 để cùng hồ sơ có nội dung nhất quán |
| Lịch sử | Web có component PaginationControl; Mobile request history có trang, nhưng incident/leave không có | Chưa thống nhất khả năng truy cập hồ sơ cũ, UX-03 |
| Thông báo | Web3filters; Mobile2filters; cả hai có lỗi/Thử lại | Khác biệt filter có thể hợp lý theo role; không mặc định là bug |
| Xử lý lỗi | List tài xế/giáo viên và notifications có error/retry; incident/leave Mobile nuốt lỗi | Tái sử dụng nguyên tắc phân biệt error/empty |
| Parent kết quả yêu cầu | RequestListView:189-198 và request detail:193-205 phân biệt DIRECT_UPDATE/REOPTIMIZED/REMOVED_FROM_ROUTES | Có copy phân biệt tác động sau phê duyệt; không khẳng định toàn bộ outcome đã chạy đúng |
| Bảo vệ UI Parent | Trip Detail:1958-1977 dùng `!isParent` với lý do/context/kết quả nội bộ | Có chủ ý privacy ở UI; cần kiểm response API, không coi ẩn UI là đủ bảo mật |
| Map tracking | Controls có “Mất cập nhật”, “Hành trình ghi nhận/Tuyến dự kiến”, nhắc gaps; Web Trip Detail:327-333 tương tự | Có phân biệt nguồn và freshness; GPS/routing thực tế chưa được kiểm chứng |
| Thêm học sinh/đổi địa chỉ | InsertStudentModal:110-111 và RequestDetailModal:110-111 dùng maxRouteDurationMinutes/defaultStopServiceSeconds | Hai tiêu chí phù hợp hướng PO đã chốt; không chứng minh tối ưu/thứ tự tuyến đúng |
| Responsive | Các bảng có overflow-x-auto, shell có drawer và breakpoints | Có cấu trúc dự phòng; chưa đo bố cục, font scaling hoặc tương phản |

Không so sánh cảm nhận tốc độ, typography, spacing hoặc camera bằng suy đoán từ screenshot cũ/code. CSS token và layout class chỉ cho thấy ý định; không thay thế kiểm thử màn hình thực.

## 5. Chất lượng dữ liệu và giới hạn

- Không đọc dữ liệu DB, không tạo mẫu. Không đánh giá được tên, địa chỉ, lịch chạy hoặc tính nhất quán dữ liệu đang dùng.
- Placeholder trong form là ví dụ, không phải chất lượng records thực tế. Không dùng “đọc thấy type” làm bằng chứng có record hợp lệ.
- Các field sự cố sai tên và thiếu pagination là vấn đề contract/trình bày có thể xác định từ source, độc lập việc DB hiện có dữ liệu lớn hay chưa.
- Tất cả flows đăng nhập, OTP, tạo/edit, báo nghỉ, Ready/Start/Complete, attendance, thay nhân sự, route preview, push vẫn **NOT_VERIFIED_RUNTIME** trong lượt này. Việc không chạy test là theo chỉ thị PO, không phải do test đã fail.
- Mọi kiểm thử cần ghi dữ liệu về sau phải được cấp phạm vi theo Test Data Policy; không tự tạo records để tái hiện.

## 6. Thứ tự ưu tiên

| Mức | IDs | Mục tiêu |
|---|---|---|
| P0 | Chưa xác định | Không đủ bằng chứng kết luận sự cố nghiêm trọng đang xảy ra |
| P1 | UX-01, UX-02, UX-03 | Thông tin đúng khi lỗi, sự cố có đủ ngữ cảnh, xem được toàn bộ lịch sử qua phân trang |
| P2 — độ tin cậy | UX-04, UX-05 | Kết quả thuộc filter hiện tại, dữ liệu cũ có dấu chưa cập nhật |
| P2 — khả năng tiếp cận/định hướng | UX-07, UX-08, UX-09, UX-10 | Điều khiển có tên, dialog/back rõ, nhận biết mục đang xem |
| P2 — nhất quán/khả dụng | UX-06, UX-11, UX-12, UX-13, UX-14 | Chính sách rõ, bàn giao tài khoản, copy, filter và push phù hợp môi trường |

Mức này phục vụ chọn phạm vi sửa tiếp theo; audit không phê duyệt thay đổi nghiệp vụ, DB, API hoặc UI.

## 7. Agent Skills đề xuất

| Skill | Mục đích | Lý do / phạm vi |
|---|---|---|
| computer-use:computer-use | Tái hiện và nghiệm thu UI khi browser/tài khoản được cấp | Kiểm lỗi mạng/empty, pagination, keyboard, Android Back, bố cục; không tự mutate dữ liệu |
| visualize:visualize | Wireframe ngắn cho error/stale/history/modal trước code | So sánh phương án và duyệt UI theo AGENTS.md |
| skill-creator | Chỉ khi PO muốn chuẩn hóa checklist audit dùng lại | Đóng gói role matrix, contract checks và nhãn evidence cho các lần audit sau; chưa cần cài để sửa lỗi hiện tại |

Đây là đề xuất, không có skill/dependency nào được cài hoặc tạo trong task. Rà code thông thường không cần kích hoạt skill điều khiển UI hay dựng hình.

## 8. Lộ trình cải thiện và phạm vi bàn giao

1. **Đợt đề xuất ưu tiên:** chốt scope sửa UX-01/02/03. Dùng contract thật làm chuẩn, thiết kế ngắn cho error/retry/load-more, duyệt trước khi triển khai nếu thay cấu trúc UI. Tiêu chí: lỗi không hiện rỗng giả; cùng sự cố có đủ tuyến/ngày/bằng chứng; hồ sơ sau trang1 có đường truy cập.
2. **Đợt nhất quán:** xử lý request cũ/stale, labels/dialog/back/sidebar; chốt chính sách mật khẩu, onboarding và filter với PO. Không tự thay đổi ngưỡng hoặc business permission.
3. **Nghiệm thu có phạm vi:** khi có quyền browser và tài khoản, kiểm các case tại IDs trên với dữ liệu có sẵn; chỉ chạy flows ghi khi PO cấp quyền. Không cần khám phá lại từ đầu vì file/line và điều kiện đã ghi rõ.

Chỉ báo cáo được chỉnh sửa. Không tự triển khai fix sau audit. **STOP AFTER REPORT — chờ PO chọn phạm vi tiếp theo.**
