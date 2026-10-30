# AI Review — Số điện thoại nhân sự trong thông tin chuyến xe

## 1. Task Information
Tên task: Hiển thị rõ số điện thoại nhân sự trong thông tin chuyến. Ngày: 30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Implementation, UI adjustment. Status: COMPLETED phần code; native acceptance NOT_VERIFIED.

## 2. Original Request
Ở thẻ thông tin khi mở Theo dõi lộ trình, hiển thị thêm số điện thoại của tài xế phụ trách và giáo viên phụ xe.

## 3. Approved Scope
Yêu cầu trực tiếp của PO cho thay đổi nhỏ trên thẻ hiện có. Chỉ sửa hiển thị điện thoại ở tab Thông tin của /trip/[id] và tài liệu liên quan. Không màn hình mới/refactor đáng kể; không thêm API, sửa backend, dữ liệu, navigation, dependencies hoặc commit/push. Giữ toàn bộ uncommitted work trước task.

## 4. Analysis & Decisions
Đối chiếu Home: nút Theo dõi lộ trình mở /trip/${card.tripId}. MobileTripDetail đã có driverPhone/busAttendantPhone; backend map từ assignedDriver.phone/assignedBusAttendant.phone. Hai số trước task đã render bằng infoSubtext, không phải API thiếu field. Làm nổi bật vị trí số trong đúng hai thẻ nhân sự bằng icon, nhãn và chữ đậm hơn; không tự thêm số vào sheet thu gọn làm thay đổi chiều cao/diện tích bản đồ. Dùng số thực của nhân sự được phân công cho chuyến, không suy ra từ tuyến mặc định.

## 5. Implementation Details
Sửa mobile/app/trip/[id].tsx: thay đúng hai dòng số cũ bằng hàng icon/nhãn/Số điện thoại/selectable Text; trim khoảng trắng, fallback Chưa cập nhật; ba style dùng theme, cho phép wrap và shrink. Thêm docs/architecture/mobile-trip-contacts.md: đường dẫn thao tác, mapping nguồn, responsive, accessibility và giới hạn verification. LATEST.diff gồm đúng hai files theo baseline đầu task; LATEST.md cập nhật 13 mục. Lưu bản review/diff trước ở history/2026-10-30-before-trip-staff-contacts.md/.diff.

## 6. Database Changes
None. Không kết nối, sửa hoặc sinh records/seed trong task này; không schema/migration/ảnh hồ sơ mới.

## 7. API & Swagger Changes
None. Dùng GET /trips/mobile/:id hiện có qua getMobileTripDetail; API client/backend và Swagger không thay đổi. Không gọi API mutation hoặc thêm request.

## 8. UI/UX Changes
Theo dõi lộ trình → mở rộng sheet → Thông tin: Tài xế phụ trách và Giáo viên phụ xe có nhãn Số điện thoại cạnh icon, số bên cạnh hoặc xuống hàng khi thiếu chỗ. Text selectable hỗ trợ sao chép; nhãn accessibility phân biệt vai trò. Thiếu số hiện Chưa cập nhật thay dấu gạch khó hiểu. Dùng palette hiện có; không cắt số bằng numberOfLines, không auto-call, không đổi names/vehicle card, sheet gesture/height/safe area/map/avatar và các tab khác. Chỉ bổ sung trình bày theo yêu cầu, không cần wireframe mới cho màn hình/refactor.

## 9. Verification & Testing
PASS: mobile npx --no-install tsc --noEmit, exit0.
PASS: npx --no-install expo export --platform all --output-dir $env:TEMP/rts-trip-staff-contacts-export, exit0; bundles iOS/Android/Web/server tạo ngoài repository. Chỉ warning NO_COLOR/FORCE_COLOR, không lỗi build.
PASS: so sánh baseline tự động, khôi phục hai rows và bỏ ba styles thu được file TSX giống hệt trước task; navigation/map/controller/business handlers giữ nguyên. SHA256 bảy protected files (API client, backend trips service, marker helper/hook/map snapshot, package/lock) giữ nguyên.
PASS: git -c core.safecrlf=false diff --check -- mobile/app/trip/[id].tsx. Review task-only diff và docs links/13 sections.
NOT_VERIFIED: authenticated runtime, chọn/sao chép, font lớn, screen reader, layout trên Expo Go iPhone/Android thật và Safari/Chrome mobile. Không tạo dữ liệu, API mock hoặc sửa số để test. Không chạy unit tests mới cho thay đổi trình bày đơn giản. Mobile không cấu hình lint script; không cài tool mới.
Ghi chú tooling: lần in diff bằng Python stdout cp1252 lỗi UnicodeEncodeError sau khi lưu diff/check invariant thành công; đã đọc lại diff bằng PowerShell và hoàn tất whitespace check. Không ảnh hưởng source/build.

## 10. Issues & Risks
Chỉ hiện số backend cung cấp; hồ sơ nhân sự chưa có số thì fallback Chưa cập nhật. Các số không được hiển thị trực tiếp trong sheet thu gọn; mở rộng và chọn Thông tin như luồng sẵn có. Chưa nghiệm thu native text selection/large-font layout; không báo PASS thiết bị từ kết quả export. Không phát hiện lỗi type/build của thay đổi này.

## 11. Reviewer Focus
Đảm bảo đúng driverPhone và busAttendantPhone của chuyến thực tế; không hoán đổi/liên hệ người mặc định tuyến. Rà soát wrap số ở màn hẹp/chữ lớn, empty phone, selectable và nhãn đọc màn hình. Bảo toàn mapSource, gesture, polling/permissions và marker avatar từ task trước.

## 12. Suggested Next Step
Trên Expo Go iPhone, mở Theo dõi lộ trình → mở rộng thẻ → Thông tin để đối chiếu và thử sao chép số của hai người phụ trách chuyến hiện có.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push; không tự đánh dấu nghiệm thu thiết bị.
