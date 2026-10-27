# AI Review — Mobile Header Notification Bell Alignment

## 1. Task Information
- **Ngày thực hiện**: 27/10/2026, Asia/Saigon.
- **Phạm vi (Scope)**: Mobile UI (`mobile/components/notification-bell.tsx`, `mobile/app/(tabs)/schedule.tsx`, `mobile/app/(tabs)/tracking.tsx`, `mobile/app/(tabs)/_layout.tsx`).
- **Phân loại**: UI / Layout Alignment.
- **Trạng thái**: **COMPLETED**.
- **Mức độ sẵn sàng**: **READY_FOR_VERIFICATION** (Typecheck 0 lỗi ở cả 3 module `api`, `web`, `mobile`).

## 2. Original Request
Người dùng phản ánh kèm 2 ảnh chụp màn hình:
> "tiến hành điều chỉnh để căn đúng icon thông báo, đảm bảo icon thông báo luôn nằm ngoài cùng bên phải"
1. Màn hình Lịch vận hành (`schedule.tsx`): Icon chuông thông báo nằm xen kẽ giữa tiêu đề và nút "Hôm nay", chưa nằm ngoài cùng bên phải.
2. Màn hình Theo dõi học sinh (`tracking.tsx`): Header bị xếp theo cột dọc (thiếu flex row), icon chuông bị rớt xuống dưới tiêu đề và điểm đỏ thông báo bị kéo dãn dạt sang tận mép phải.

## 3. Approved Scope
- Chuẩn hóa layout của component [NotificationBell](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/components/notification-bell.tsx): bọc icon và badge đỏ trong `iconContainer` cố định 26x26, neo cứng chấm đỏ ở góc trên bên phải icon (`top: -1, right: -1`), tránh mọi hiện tượng tách rời khi container cha dãn rộng.
- Màn hình Lịch (`schedule.tsx`): Đặt tiêu đề vào `headerTitleWrap` (`flex: 1`), gom nút "Hôm nay" và `NotificationBell` vào cụm `headerActions` (`flexDirection: 'row', alignItems: 'center', gap: 8`), đảm bảo chuông thông báo luôn nằm ngoài cùng bên phải.
- Màn hình Theo dõi (`tracking.tsx`): Thêm `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'` cho `styles.header`, bọc tiêu đề vào `headerTitleWrap` (`flex: 1`) để đưa `NotificationBell` sang góc trên ngoài cùng bên phải cùng hàng với tiêu đề.
- Tab bar layout (`_layout.tsx`): Bổ sung `marginRight: 8` cho `headerRight` trong `screenOptions`.

## 4. Analysis & Decisions
- Điểm mấu chốt: Trong React Native, khi một `TouchableOpacity` nằm trong container có `alignItems: 'stretch'` mặc định, nút bấm sẽ nhận full width của container. Trước đây `dot` có style `position: 'absolute', right: 8`, nên khi nút bấm dãn rộng hết hàng thì icon chuông ở bên trái còn chấm đỏ bay sang tận mép phải màn hình.
- Giải pháp bền vững: Tạo một wrapper `iconContainer` kích thước cố định cho icon chuông và neo `dot` tương đối với chính wrapper này. Dù nút bấm nằm ở đâu, chấm đỏ cũng luôn gắn chặt vào góc trên bên phải của chuông.

## 5. Implementation Details
- `mobile/components/notification-bell.tsx`:
  - Thêm `iconContainer: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', position: 'relative' }`.
  - Đặt `dot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error, borderWidth: 1.5, borderColor: '#FFFFFF' }`.
  - Hỗ trợ prop `style?: StyleProp<ViewStyle>` để tùy biến margin khi cần.
- `mobile/app/(tabs)/schedule.tsx`:
  - Đổi thứ tự: Tiêu đề -> `headerActions` chứa `todayButton` rồi đến `NotificationBell`.
  - Thêm `headerTitleWrap` (`flex: 1`) và `headerActions` (`flexDirection: 'row', gap: 8'`).
- `mobile/app/(tabs)/tracking.tsx`:
  - Thêm `flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'` cho `styles.header`.
  - Bọc tiêu đề trong `headerTitleWrap` (`flex: 1, paddingRight: 12`).
- `mobile/app/(tabs)/_layout.tsx`:
  - Thêm `style={{ marginRight: 8 }}` vào `NotificationBell` cho các màn hình dùng header mặc định.

## 6. Database Changes
- Không có thay đổi cơ sở dữ liệu.

## 7. Migration Compatibility
- Không áp dụng.

## 8. Role & Security Assessment
- Áp dụng trên giao diện của cả 3 role người dùng di động (`DRIVER`, `BUS_ATTENDANT`, `PARENT`).

## 9. Test Data Policy Compliance
- Tuân thủ tuyệt đối: Không sinh dữ liệu, không gọi API làm thay đổi trạng thái database.

## 10. Verification Results
- `mobile`: `npx tsc --noEmit` -> PASS (0 lỗi).
- `api`: `npx tsc --noEmit` -> PASS (0 lỗi).
- `web`: `npx tsc --noEmit` -> PASS (0 lỗi).

## 11. Known Limitations & Follow-ups
- Không có. Giao diện hiển thị đồng nhất trên các độ phân giải màn hình.

## 12. Artifacts Produced
- `mobile/components/notification-bell.tsx`
- `mobile/app/(tabs)/schedule.tsx`
- `mobile/app/(tabs)/tracking.tsx`
- `mobile/app/(tabs)/_layout.tsx`
- `docs/ai-review/LATEST.diff`
- `docs/ai-review/LATEST.md`

## 13. Proposed Next Step
- Kiểm tra trên ứng dụng Expo Go để xác nhận giao diện icon chuông trên cả tab "Lịch" và "Theo dõi" đã hiển thị chuẩn xác ở góc trên ngoài cùng bên phải.
