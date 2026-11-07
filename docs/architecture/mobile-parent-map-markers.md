# Marker ảnh học sinh trên bản đồ chuyến xe

30/10/2026, local; chưa commit/push. Áp dụng luồng Trang chủ phụ huynh → mở card → Theo dõi lộ trình → `/trip/[id]`.

## Phạm vi và thiết kế

Điểm PICKUP/DROPOFF có `isMyChild=true` và `studentId` thay ngôi sao tròn bằng ghim giọt nước theo ảnh PO cung cấp:

- Silhouette xanh teal, viền sáng và các vòng mảnh quanh ảnh.
- Khung24×30 CSS px, ảnh tròn18px với `object-fit: cover`, tương đương chiều cao icon Parking/trường thay cho ghim52×66 cũ. Vùng nhận nhấn trong suốt44×44px, không làm ảnh ghim lớn hơn.
- Mũi ghim neo tại `[12, 30×65/66]`, đúng tọa độ điểm đón/trả. Popup neo phía trên ghim.
- Mỗi con lấy ảnh riêng theo ID; không dùng ảnh đại diện phụ huynh hoặc ảnh của con đầu tiên cho tất cả điểm.
- Chưa có ảnh, đang tải, ảnh lỗi hoặc nguồn ảnh không khả dụng: giữ ghim, hiện chữ đầu tên giống StudentCard/chi tiết học sinh/Home. Không sinh ảnh học sinh giả. Ảnh có sẵn sẽ tự thay chữ khi tải thành công.

Ảnh PO là tham chiếu hình dạng đã chỉ định, không thay bố cục màn hình. Không đổi tọa độ/thứ tự điểm dừng, tuyến, GPS, trạng thái, điểm danh, báo nghỉ hoặc navigation. Bãi xe, trường, xe buýt và marker học sinh khác giữ kiểu cũ. Các điểm trùng tọa độ vẫn có thể chồng nhau theo Leaflet; chưa thêm clustering hoặc dời vị trí giả.

## Nguồn dữ liệu và quyền riêng tư

API chi tiết chuyến chưa có avatar trong từng stop. Tái dùng GET `/parents/students` qua `getLinkedStudents`, backend đã giới hạn danh sách theo tài khoản PARENT và có `id/fullName/avatarUrl`. Không thay API contract/backend/schema.

[useParentMapAvatars](../../mobile/hooks/use-parent-map-avatars.ts) chỉ đọc cho PARENT, ngay khi focus và mỗi20s lúc active qua useActiveRefresh hiện có. Không gộp lỗi ảnh vào controller vận hành/polling5s chuyến. Khi đổi identity/role, dữ liệu cũ không được trả về; isCurrent chặn kết quả sau blur/background/unmount/đổi scope. Lỗi tạm giữ ảnh đã biết và thử lại ở nhịp sau;401/403/404 xóa dữ liệu ảnh, dừng đến khi focus lại. Khi chưa có dữ liệu vẫn hiện chữ dự phòng. Mỗi lần đọc thành công tăng revision để thử lại ảnh lỗi ở cùng URL; ảnh đã tải được không tạo lại node.

Nguồn ảnh đồng bộ với các trang hiện có, không tự tạo bản sao ảnh hoặc lấy ảnh phụ huynh:

| Nơi hiển thị | Nguồn |
| --- | --- |
| Theo dõi / StudentCard | GET /parents/students → student.avatarUrl |
| Chi tiết học sinh | GET /parents/students/:id → student.avatarUrl |
| Card Trang chủ | API Home → studentAvatar từ cùng Student.avatarUrl |
| Ghim bản đồ | GET /parents/students → avatarUrl, join studentId của own stop |

Các view khác giữ nguyên source/logic; fallback trên ghim dùng chữ đầu tên như các view này. Ảnh đổi ở hồ sơ sẽ được ghim đọc lại ở nhịp20s tiếp theo khi active hoặc ngay khi focus lại; còn phụ thuộc thời gian request/tải ảnh, không hứa đồng bộ tức thời khi offline/background hoặc backend khác cấu hình.

Trước khi gửi vào WebView, màn hình chỉ giữ các con có ID khớp một stop hiện tại với `isMyChild=true`. [getTripMapSnapshot](../../mobile/utils/trip-map-data.ts) chỉ giữ studentId của điểm được phép nhận diện, những điểm khác dùng null. Không gửi danh sách con ngoài chuyến hoặc ảnh của học sinh khác. Masking từ backend giữ nguyên.

## Source và cách tích hợp

- [Màn chuyến xe](<../../mobile/app/trip/[id].tsx>): dùng hook ảnh, ghép ID, tạo marker riêng cho điểm của con và inject ảnh vào WebView sau khi tải.
- [child-map-marker.ts](../../mobile/utils/child-map-marker.ts): CSS, SVG cố định, DOM script, kích thước/anchor và serializer an toàn.
- [use-parent-map-avatars.ts](../../mobile/hooks/use-parent-map-avatars.ts): đọc nguồn ảnh phụ huynh có quyền xem, hủy nhận kết quả cũ.
- [trip-map-data.ts](../../mobile/utils/trip-map-data.ts): snapshot hình học/điểm dừng ổn định, thêm ID riêng con để ghép ảnh.
- [Kiểm tra script](../../mobile/scripts/child-map-marker.test.ts): chuỗi đóng script, Unicode, quote/backslash và cú pháp script.

`createChildMapPin(studentId, name)` tạo HTMLElement để truyền vào `L.divIcon`. `setChildMapAvatars(children)` cập nhật các face đã có qua ID, không tạo lại marker hay map. Mảng chỉ chứa `id/fullName/avatarUrl` sau bộ lọc quyền. Khi URL không đổi và ảnh đang tải/đã tải được thì giữ node, không tải lại liên tục. Nếu ảnh trước đã lỗi, lần bridge update sau sẽ tạo lại img ở cùng URL để thử lại; không có vòng lặp retry nhanh. URL đổi xóa ảnh cũ; callback cũ không được ghi đè ảnh mới. Thiếu dữ liệu cho một pin sẽ bỏ ảnh cũ và trở về chữ dự phòng.

`childMapPinSize` dùng chung cho CSS và Leaflet iconSize/iconAnchor/popupAnchor. Portrait tính theo chiều rộng, tâm và tip tính theo hệ tọa độ SVG52×66, không để thông số CSS và Leaflet lệch nhau khi đổi size. Leaflet1.9.4 hiện có hỗ trợ HTMLElement trong divIcon; [API reference](https://leafletjs.com/reference#divicon).

## Map lifecycle, an toàn và accessibility

Avatar không nằm trong `mapData`, `mapHtml` hoặc dependency của `mapSource`. Cập nhật ảnh không reload WebView, không reset zoom/pan/follow. `handleMapLoad` gửi lại cả dữ liệu navigation hiện có và ảnh sau mỗi lần WebView thực sự tải; cập nhật ảnh trong lúc map chưa sẵn sàng được gửi lại ở load end. Polling vận hành, bridge GPS/history, controls và callbacks cũ giữ nguyên.

Ảnh và chữ được gán bằng DOM properties/textContent, không ghép dữ liệu không tin cậy vào HTML. SVG là chuỗi cố định. Chỉ nhận URL ảnh HTTP(S), lỗi dùng fallback; `referrerPolicy=no-referrer`. `serializeMapScriptValue` giữ round-trip JSON nhưng escape `<`, U+2028/U+2029 để dữ liệu không đóng inline script; dùng cả cho stops và payload ảnh. Không tuyên bố xử lý toàn bộ HTML popup cũ ngoài phạm vi thay marker này.

Marker Leaflet có aria-label Điểm đón/Điểm trả kèm tên con; SVG/ảnh trang trí không tạo nhãn lặp. Focus ring trên wrapper keyboard. Ghim đã thu nhỏ nên fitBounds trở về padding50px cũ cho mọi role. Safe area/bottom sheet/map controls giữ nguyên. Không thêm animation hoặc auto-pan khi ảnh tải.

## Kiểm chứng và giới hạn

- PASS Mobile typecheck,29 tests thuần:3 tests serializer/script mới +26 tests hành trình có sẵn; không DB/business fixtures/API mock.
- PASS Expo export iOS/Android/Web/server vào TEMP, không thêm dependency.
- PASS đối chiếu14 arrow handlers/controllers cũ và toàn bộ navigation JavaScript trong map, không đổi nghiệp vụ. Snapshot không chứa avatar/attendance động; ID chỉ cho điểm own-child.
- PASS kiểm tra component Chromium320/390px: ghim24×30, ảnh18px, so sánh với Parking32×32/trường34×34 (tính cả border CSS cũ), không tràn ngang. Tải ảnh tốt giữ node; lỗi404 rồi asset có lại được thử lại thành công ở cùng URL; fallback chữ đầu H khi thiếu tên. Preview chỉ dùng logo có sẵn để kiểm tra khung ảnh, không phải ảnh con/DTO chuyến hoặc response API giả. Kết quả shape52×66 của đợt trước là lịch sử, không size hiện hành.
- NOT_VERIFIED luồng có xác thực end-to-end trên Expo Go iPhone/Android, ảnh thật từng con, VoiceOver và việc giữ camera trong WebView native khi nhận dữ liệu mạng thực. Không tự tạo dữ liệu/đổi ảnh học sinh để kiểm tra. Chưa chạy suite trip-state-synchronization chứa fixture Trip giả; kiểm chứng source invariants thay thế, không sửa fixture.

Đã SELECT read-only trên local cho tài khoản phụ huynh đang trao đổi:2 con liên kết,0 con có avatar_url. Vì vậy chưa thể nghiệm thu ảnh học sinh thật với dữ liệu hiện tại (`NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY`); ghim vẫn hiện chữ dự phòng. Không tự thêm ảnh hoặc ghi DB. Ảnh logo trong preview kiểm tra không được dùng làm avatar trong production.

Chi tiết kết quả và giới hạn hiện hành: [AI Review](../ai-review/LATEST.md). Bước tiếp theo: kiểm tra bản đồ trên Expo Go iPhone với ảnh học sinh đã có sẵn trong tài khoản.
