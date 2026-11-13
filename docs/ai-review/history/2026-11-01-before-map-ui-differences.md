# AI Review — Kiểm tra mức dùng chung bản đồ Mobile

## 1. Task Information
Date: 01/11/2026 Asia/Saigon. Type: Read-only Analysis. Scope: Mobile maps. Status: COMPLETED source inspection, runtime NOT_VERIFIED.

## 2. Original Request
PO yêu cầu kiểm tra map Parent và Driver/Bus Attendant có đang không dùng chung hay không. Không yêu cầu sửa code.

## 3. Approved Scope
Đọc entry routes, renderer/template và logic role. Không refactor, chỉnh UI, cài package hoặc thay dữ liệu. Giữ StaffTripCard pending trước task.

## 4. Analysis & Decisions
Kết luận: map theo dõi một chuyến thực tế đã dùng chung cho cả ba role; không có ba map độc lập theo role. Có các màn map khác theo mục đích chưa chia sẻ renderer/component.

Bằng chứng:
- mobile/app/(tabs)/index.tsx:188,299: staff Xem chi tiết/Vận hành và Parent Theo dõi lộ trình đều router.push /trip/<tripId>. Parent schedule cũng mở trip route.
- mobile/app/trip/[id].tsx:105-107 xác định ba role trong cùng screen; line381 mapHtml duy nhất; line406 Leaflet map + VietMap raster tile; line511 memo mapSource; line888 WebView dùng chung.
- trip/[id].tsx:238-260: operational state, detail và navigation state đọc trong cùng refresh pipeline, attendance/options chỉ đọc cho staff. getTripMapSnapshot tách map geometry/stops khỏi thay đổi operation để source không tái tạo chỉ vì state.
- trip/[id].tsx:514-554: Driver dùng engine segment/traveled/remaining khi điều hướng; các observer dùng latestPosition và full route geometry. line907 chỉ hiện publish/control theo isDriver; useTripNavigation.observe line405 còn kiểm state.canPublish/status. Đây là role differences trong shared screen, không phải renderer tách riêng. Backend enforcement chưa audit trong task này.
- trip/[id].tsx:220,570: riêng Parent có linked-child avatars/pins từ useParentMapAvatars, chỉ lọc các stop isMyChild; không tự suy ra rằng backend privacy đã được kiểm chứng.
- mobile/app/parent/route-detail.tsx:41: đọc getStudentRoutingDetail(studentId), line76 generateMapHtml và line120 L.map riêng; line189 hiện nội dung tuyến khi routingStatus ASSIGNED_DRAFT. Đây là lộ trình kế hoạch của con, không phải live Trip screen; marker bãi/trường/điểm con, không navigationApi/live publisher. Cùng Leaflet/VietMap và decodePolyline với Trip nhưng HTML/template/WebView triển khai riêng.
- mobile/components/maps/VietMapPicker.tsx:30,261: component chọn tọa độ/địa chỉ, dùng MapLibre vector trong WebView và bridge LOCATION_SELECTED. Được create-address-request-view.tsx:310 sử dụng; không phải live tracking renderer.
- Inventory toàn bộ mobile .tsx chỉ có ba nơi import react-native-webview/khởi tạo map: Trip detail, Parent route detail, VietMapPicker.
- Thanh hành trình trên Home Parent là sơ đồ mốc nghiệp vụ; use-parent-journey-telemetry.ts ghi rõ không location publisher/GPS watcher. Không coi rail đó là một map engine riêng.

Nhu cầu chuẩn hóa nếu PO giao tiếp: có thể tách shared display renderer cho Trip/Parent planned route để sửa marker/style chung, nhưng giữ navigation/GPS/attendance controllers và privacy scope riêng. Không nên gộp quyền điều khiển driver vào Parent/Attendant. Chưa thực hiện refactor.

## 5. Implementation Details
No application code changes. Chỉ report; lưu LATEST cũ vào history/2026-11-01-before-map-sharing-audit.md/.diff để bảo toàn báo cáo/diff StaffTripCard task trước.

## 6. Database Changes
None. Không DB query/seed/mutation.

## 7. API & Swagger Changes
None. Chỉ đọc mobile call sites, không request API hoặc sửa backend.

## 8. UI/UX Changes
None. Không wireframe/preview/refactor.

## 9. Verification & Testing
Đọc source trực tiếp, rg inventory WebView/map constructors, route navigation callsites, role controls và shared helpers. Không build/test vì không sửa application source. Một lệnh Get-Content wildcard [id] không đọc được; nội dung Trip đã đọc qua -LiteralPath ở các lệnh trước, không suy ra từ lỗi path.
NOT_VERIFIED runtime trên thiết bị, vị trí xe thật, stale state, backend canPublish/privacy enforcement, kết quả live map. Không dùng kết quả build các task trước làm kiểm thử task này.

## 10. Issues & Risks
Không thể kết luận map hỏng hoặc nguyên nhân khác biệt hình ảnh chỉ từ chuyện dùng chung source. Cùng Trip screen vẫn render khác theo role và dữ liệu API. Renderer Trip chưa thành component riêng; map planned Parent có template riêng nên chỉnh marker/tile/style ở Trip không tự áp dụng cho planned route. Picker dùng engine khác có mục đích riêng.

## 11. Reviewer Focus
Phân biệt live Trip và planned route; chứng minh route dùng chung trước khi refactor. Giữ role controls và server authorization; không đồng nhất Home schematic rail với GPS map.

## 12. Suggested Next Step
Nếu PO muốn chuẩn hóa map, chốt phạm vi Trip live hay cả màn lộ trình kế hoạch trước khi lập phương án dùng chung renderer.

## 13. Approval Status
Hoàn thành kiểm tra source. Không có phê duyệt sửa map, chưa thay application code.
