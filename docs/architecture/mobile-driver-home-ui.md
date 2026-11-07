# Driver Home — shared Parent header

## Cập nhật Bus Attendant — 01/11/2026

PO yêu cầu áp dụng tương tự cho Home Bus Attendant. Cả Driver và Bus Attendant nay dùng `ParentHomeScrollView` với cùng Báo nghỉ/Sự cố, nền và cơ chế compact. Attendant hiển thị tên tài khoản, dòng phụ `Giáo viên phụ xe · <trường của chuyến>`; chưa có chuyến dùng `Trường học đối tác`. Cả hai có tiêu đề Chuyến xe của bạn/ngày chạy. `StaffHomeScrollView` không còn được import tại Home; file cũ được giữ nguyên ngoài phạm vi task. Các mô tả Attendant dùng shell cũ bên dưới chỉ phản ánh bước triển khai Driver trước đó.

Task này chỉ sửa `mobile/app/(tabs)/index.tsx`. PASS TypeScript, Expo web/server export và self-check AST chạy cấu hình header thực cho 3 roles: shared shell, nhãn/fallback, callback routes. Fetch/refresh và toàn bộ StaffTripCard props/callbacks giống baseline trước task. Không API/DB/mock business data. Preview trình duyệt của shared shell thuộc task Driver trước; task Attendant chưa kiểm chứng visual riêng hoặc native.

Ngày: 01/11/2026. PO duyệt wireframe rồi yêu cầu triển khai. Tiện ích đã được PO đính chính thành **Báo nghỉ / Sự cố**; tab **Lịch** không thay đổi.

## Source và phạm vi

- `mobile/components/parent/home-scroll-view.tsx`: shell trình bày dùng chung Parent/Driver, giữ tên/path để không tạo thêm wrapper. Thêm optional `title`, `subtitle`, `actions` (label, Ionicons name, callback). Defaults vẫn là lời chào Parent và Báo nghỉ/Đổi điểm.
- `mobile/app/(tabs)/index.tsx`: Driver chọn shell trên, tên tài xế và `Tài xế · <trường của chuyến>`; chưa có chuyến dùng Bãi xe trung tâm. Hai shortcut giữ route `/leave-notices` và `/incidents`. Có tiêu đề Chuyến xe của bạn/ngày chạy từ `homeTrip.serviceDate` khi có chuyến.
- Bus Attendant tiếp tục dùng `StaffHomeScrollView`; `StaffTripCard` và toàn bộ props/callbacks không đổi. Không thay API, polling, data, quyền, tab hoặc nghiệp vụ.

## Hành vi

Driver nhận đúng nền, avatar, NotificationBell, bố cục tiện ích, safe area, giới hạn rộng 560 và cơ chế cuộn Parent. Ở đầu trang có tên/dòng phụ và thẻ trắng chứa hai tiện ích; qua ngưỡng cuộn 8px chuyển sang avatar nhỏ + hai icon + chuông, không hiện nhãn; chỉ mở lại khi về đầu trang. Không thêm engine animation mới. Nhãn accessibility và callback còn hoạt động khi compact. Pull-to-refresh dùng cơ chế offset sẵn có.

## Kiểm chứng

PASS TypeScript và Expo export all (Android/iOS/web/server); đây là JS bundle, không phải native build.

PASS Chromium IAB với component thật trong harness trình bày độc lập: 390×844 expanded, cuộn compact, 320×640 compact/expanded, callback leave/incident hoạt động ở compact, cuộn về đầu mở lại. Parent defaults chào/Đồng hành cùng con/Báo nghỉ/Đổi điểm và callback Đổi điểm được kiểm tra. Harness không mount auth/business hooks; chỉ có nhãn vai trò và vùng trống để cuộn, không giả API/Trip/User records. Notification được thay bằng presentation slot để không mount context; chuông production không đổi.

PASS self-check AST/source sau normalize CRLF: fetchHomeData, onRefresh và StaffTripCard JSX props/callbacks giống HEAD; chỉ 2 mobile source files thay đổi. `git diff --check -- mobile` sạch.

Harness ban đầu chạy từ server khác origin khiến font icon không nạp; chuyển sang HTML tạm cùng Metro origin và xác minh icon thực. Không sửa code ứng dụng để xử lý vấn đề riêng harness. Đã xóa entry/HTML tạm, đóng tab/reset viewport và dừng server 51615; Metro 8081 có sẵn giữ nguyên.

NOT_VERIFIED: thiết bị Android/iPhone, native safe area/scroll/pull-to-refresh, font scale lớn, phiên đăng nhập thật và điều hướng nghiệp vụ. Không thao tác DB/API mutation, cài dependencies, commit hoặc push.
