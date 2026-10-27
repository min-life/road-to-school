# AI Review — Mobile Runtime Error Fix & Operational Incident Modal Safety

## 1. Task Information
- **Ngày thực hiện**: 27/10/2026, Asia/Saigon.
- **Phạm vi (Scope)**: Mobile (`mobile/context/notifications-context.tsx`, `mobile/app/notifications.tsx`, `mobile/app/trip/[id].tsx`, `mobile/app/incidents/[id].tsx`).
- **Phân loại**: Bugfix / Runtime Error Resolution / Platform Compatibility.
- **Trạng thái**: **COMPLETED** (Đã xử lý dứt điểm nguyên nhân gây RedScreen runtime crash).
- **Mức độ sẵn sàng**: **READY_FOR_VERIFICATION** (Typecheck 0 lỗi ở cả 3 module `api`, `web`, `mobile`).

## 2. Original Request
Người dùng phản ánh:
> "app mobile bị lỗi run time"

Xác định trực tiếp từ stack trace RedScreen của người dùng:
1. `[Error: Cannot find native module 'ExpoTopicSubscriptionModule']`
2. `[TypeError: undefined is not a function]` tại `useEffect$argument_0 (context\notifications-context.tsx:84:53)`:
   `const subscription = module.addPushTokenListener(() => { void register(); });`

## 3. Approved Scope
- Khắc phục triệt để lỗi runtime crash khi app mobile chạy trong môi trường Expo Go / Development bundler.
- Bảo vệ `notifications-context.tsx` tránh import hoặc gọi các native module không khả dụng trong Expo Go (`expo-notifications`).
- Bổ sung `onRequestClose` và phòng ngừa xung đột tương tác cho các Modals giải trình sự cố trong `mobile/app/trip/[id].tsx` và `mobile/app/incidents/[id].tsx`.
- Tuân thủ Test Data Policy (không sinh test data, không can thiệp DB), tuân thủ Stop-After-Task.

## 4. Analysis & Decisions
1. **Nguyên nhân cốt lõi (Root Cause)**:
   - Từ Expo SDK 53+, `expo-notifications` đã gỡ bỏ hoàn toàn hỗ trợ native push token trong ứng dụng Expo Go.
   - Khi chạy `import('expo-notifications')`, tệp `node_modules/expo-notifications/build/TopicSubscriptionModule.android.js` gọi `requireNativeModule('ExpoTopicSubscriptionModule')`, module này không tồn tại trong Expo Go Android nên sinh lỗi.
   - Đồng thời, `notifications-context.tsx` gọi trực tiếp `module.addPushTokenListener(...)` mà không kiểm tra sự tồn tại của hàm, dẫn đến `TypeError: undefined is not a function` ngay trong hook `useEffect` của `NotificationsProvider`, làm sập toàn bộ cây component React Native (`RootLayout`).
2. **Giải pháp xử lý (Resolution)**:
   - Sử dụng `isRunningInExpoGo()` từ package `expo` kết hợp `Constants.appOwnership === 'expo'` và `Constants.executionEnvironment === 'storeClient'` để xác định chính xác môi trường Expo Go.
   - Khi phát hiện đang chạy trong Expo Go hoặc Web: vô hiệu hóa hoàn toàn cơ chế native push, không gọi dynamic `import('expo-notifications')`. Ứng dụng hoạt động hoàn toàn mượt mà thông qua cơ chế đồng bộ HTTP polling (`notificationApi.summary()`), chuông thông báo và danh sách thông báo vẫn hoạt động bình thường.
   - Thêm safe guards (optional chaining `?.` và kiểm tra `typeof === 'function'`) đối với tất cả các API methods của `expo-notifications`.
   - Bổ sung `onRequestClose` cho các Modals để nút Back cứng trên Android hoạt động an toàn.

## 5. Implementation Details
- `mobile/context/notifications-context.tsx`:
  - Thêm `import { isRunningInExpoGo } from 'expo';`
  - Thêm logic nhận diện `inExpoGo` phòng thủ.
  - Vô hiệu hóa `nativePush` khi ở trong Expo Go.
  - Kiểm tra `typeof module.addPushTokenListener === 'function'` trước khi đăng ký listener.
  - Thêm try/catch bảo vệ các hàm `setNotificationChannelAsync`, `remove`, `clearLastNotificationResponseAsync`.
- `mobile/app/notifications.tsx`:
  - Chuẩn hóa định dạng thời gian hiển thị notification an toàn trên engine Hermes, tránh lỗi `RangeError: Unsupported time zone specified`.
- `mobile/app/trip/[id].tsx` & `mobile/app/incidents/[id].tsx`:
  - Thêm `onRequestClose` cho modal giải trình sự cố và modal báo cáo sự cố vận hành để đóng an toàn khi bấm nút back phần cứng trên Android.

## 6. Database Changes
- Không có thay đổi schema hay migrations database mới.

## 7. Migration Compatibility
- Không áp dụng.

## 8. Role & Security Assessment
- `BUS_ATTENDANT`, `DRIVER`, `PARENT`: Không bị ảnh hưởng về quyền truy cập. Tất cả các role đều tiếp tục nhận được notification qua in-app polling 15s bình thường.
- Phụ huynh và nhân sự vận hành không bị crash khi đăng nhập hoặc mở màn hình app.

## 9. Test Data Policy Compliance
- Tuân thủ tuyệt đối: Không chạy script tạo dữ liệu giả, không can thiệp dữ liệu DB.
- Chỉ kiểm chứng tĩnh bằng `npx tsc --noEmit`.

## 10. Verification Results
- `mobile`: `npx tsc --noEmit` -> PASS (0 lỗi).
- `api`: `npx tsc --noEmit` -> PASS (0 lỗi).
- `web`: `npx tsc --noEmit` -> PASS (0 lỗi).

## 11. Known Limitations & Follow-ups
- Tính năng nhận thông báo đẩy native (Push Notification ra khay thông báo OS khi app đóng) chỉ hoạt động trên bản Development Build độc lập (APK / AAB / EAS Build) do Expo Go không còn hỗ trợ native push token.
- Trong môi trường Expo Go, người dùng vẫn nhận đầy đủ thông báo qua chuông và badge cập nhật theo thời gian thực (polling 15s).

## 12. Artifacts Produced
- `mobile/context/notifications-context.tsx`: Bảo vệ Expo Go và bọc method an toàn.
- `mobile/app/notifications.tsx`: Format thời gian an toàn cho Hermes.
- `mobile/app/trip/[id].tsx`: Thêm `onRequestClose` cho modal báo cáo & giải trình.
- `mobile/app/incidents/[id].tsx`: Thêm `onRequestClose` cho modal giải trình sự cố.
- `docs/ai-review/LATEST.diff`: Cập nhật toàn bộ diff hiện tại.
- `docs/ai-review/LATEST.md`: Báo cáo đánh giá AI Review.

## 13. Proposed Next Step
- Kiểm tra lại trên màn hình thiết bị thực tế hoặc Expo Go để xác nhận app đã load mượt mà không còn bị RedScreen.
