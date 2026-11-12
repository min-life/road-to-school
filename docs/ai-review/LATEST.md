# RoadToSchool — Bán kính chuyển sang lái thủ công

## 1. Task Information

Ngày 12/11/2026, giờ Việt Nam. Đã triển khai ngưỡng 10 m trong Mobile.

## 2. Original Request

Người dùng yêu cầu hạ ngưỡng tự chuyển từ tự động di chuyển sang lái thủ công từ 100 m xuống 10 m.

## 3. Approved Scope

Áp dụng bán kính 10 m tính từ vị trí xe đến tọa độ của điểm đón hoặc trả đang được nhắm tới trong TEST_AUTO.

## 4. Analysis & Decisions

Nhánh chuyển điểm điều hướng hiện có thể chạy ở 30 m. Giữ điểm đón hoặc trả hiện tại trong TEST_AUTO để xe có thể vào bán kính 10 m trước khi bàn giao. Nếu tuyến không đi vào bán kính này, xe mô phỏng dừng tại mốc trên tuyến để tài xế có thể dùng chế độ lái thủ công. Dùng mốc điểm dừng đã có trong chỉ dẫn, hoặc phép chiếu tọa độ điểm lên tuyến khi thiếu mốc.

## 5. Implementation Details

- `mobile/utils/trip-navigation.ts` dùng ngưỡng 10 m và chia sẻ điều kiện áp dụng theo loại điểm cùng cách lấy mốc điểm dừng.
- `mobile/hooks/use-trip-navigation.ts` giữ điểm đón/trả cho đến khi chọn hoặc tự chuyển sang lái thủ công. Bước di chuyển tự động được giới hạn ở mốc trên tuyến và giữ vị trí nếu người dùng bật tự động sau khi đã đi qua mốc.
- `mobile/scripts/auto-manual-handoff.test.ts` kiểm tra 10 m, 10,1 m, các loại điểm và chế độ.
- Báo cáo và diff màu chữ trước đó được lưu tại `docs/ai-review/history/2026-11-12-next-stop-summary-color.md` và `.diff`.

## 6. Database Changes

None.

## 7. API & Swagger Changes

None.

## 8. UI/UX Changes

Khi xe mô phỏng tới mốc trên tuyến mà chưa vào bán kính 10 m, khung chỉ dẫn hiện “Chọn Lái thủ công để đến điểm dừng”.

## 9. Verification & Testing

- Ca kiểm tra 10,1 m thất bại trước khi sửa ngưỡng.
- PASS `node --test scripts/auto-manual-handoff.test.ts scripts/trip-navigation.test.ts`, 43/43.
- PASS `npx --no-install tsc --noEmit --incremental false` trong Mobile.
- PASS kiểm tra callback thật với dữ liệu hình học thuần. Chỉ đổi ngưỡng khiến luồng cũ gọi ADVANCE sớm. Sau sửa, mô phỏng đón và trả chuyển sang lái thủ công trong 10 m, dừng ở mốc nếu tọa độ lệch khỏi đường, giữ vị trí nếu xe đã qua mốc và vẫn chuyển điểm ở chế độ thủ công hoặc khi tới trường.
- PASS `git diff --check` và kiểm tra cấu trúc diff task bằng `git apply --numstat --unidiff-zero`.
- NOT_VERIFIED trên điện thoại với chuyến đang chạy.

## 10. Issues & Risks

Bán kính hẹp có thể nằm ngoài hình học đường do tọa độ bị đưa về đường đi được. Khi đó tài xế cần chọn Lái thủ công ở mốc xe dừng.

## 11. Reviewer Focus

Xác nhận điểm đón/trả hiện tại được giữ khi xe còn cách hơn 10 m và ca đổi chế độ tại 10 m.

## 12. Suggested Next Step

Quan sát xe tự động đi tới điểm đón hoặc trả kế tiếp trên thiết bị.

## 13. Approval Status

READY FOR USER REVIEW.
