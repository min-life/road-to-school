# RoadToSchool — Viết hoa chỉ dẫn ngay khi hiển thị

## 1. Task Information

- Task Name: Sửa chỉ dẫn đang hiển thị vẫn còn chữ đầu viết thường.
- Date: 12/11/2026, giờ Việt Nam.
- Project Scope: Mobile và báo cáo.
- Task Type: Fix.
- Status: COMPLETED cho code và kiểm tra component; giới hạn native ở mục 9.

## 2. Original Request

Sau khi đã yêu cầu viết hoa đầu câu, người dùng gửi ảnh vẫn hiển thị chặng dừng chân 1 · 128 m. Người dùng xác nhận cần sửa để hiển thị Chặng dừng chân 1 · 128 m.

## 3. Approved Scope

Sửa đúng cách trình bày đầu câu chỉ dẫn trên Mobile. Giữ nguyên nội dung còn lại, tên đường, khoảng cách, thuật toán điều hướng, dữ liệu chuyến và API. Không sửa đồng hồ hoặc phần xử lý timestamp. Giữ các thay đổi có sẵn của những task trước.

## 4. Analysis & Decisions

Lần trước viết hoa trong nextGuidance, chỉ tác động khi tạo lại guidance. Component hiển thị trực tiếp p.guidance.text, nên một giá trị chữ thường được giữ trong state/closure của phiên chạy vẫn có thể hiện nguyên dạng. Chưa bắt được lifecycle Fast Refresh của chính lần trong ảnh, nên không khẳng định Fast Refresh là nguyên nhân duy nhất.

Đã tái hiện bằng chính TripNavigationControls với guidance đang giữ giá trị chặng dừng chân 1: trước sửa component không viết hoa. Chuyển định dạng về component hiển thị, áp dụng cho mọi giá trị guidance hiện có mà không cần thay đổi hay tải lại dữ liệu chỉ dẫn. Bỏ định dạng ở nextGuidance để chỉ thực hiện tại một nơi.

## 5. Implementation Details

- `mobile/components/trip-navigation-controls.tsx`: viết hoa ký tự đầu của p.guidance.text khi render bằng charAt(0).toUpperCase() + slice(1).
- `mobile/utils/trip-navigation.ts`: bỏ viết hoa ở bước tính chỉ dẫn; giữ nguyên chọn câu, trim, fallback, tên đường và khoảng cách.
- `mobile/scripts/trip-navigation-controls.test.ts`: render component thực bằng React DOM server và React Native Web đã cài; kiểm tra chỉ dẫn đang giữ chữ thường, dấu tiếng Việt, chữ hoa sẵn có, khoảng cách 128m và input không bị đổi. Không thêm dependency hoặc giả response API.
- `mobile/scripts/trip-navigation.test.ts`: chuyển kiểm tra phần dữ liệu về giữ nguyên câu provider sau trim; kiểm tra viết hoa nằm ở test component.
- `docs/ai-review/LATEST.md` và `LATEST.diff`: báo cáo và diff riêng task.
- Báo cáo/diff trước giữ nguyên trong `docs/ai-review/history/2026-11-12-guidance-uppercase-and-windows-time.md` và `.diff`.

Đã tìm toàn bộ caller: use-trip-navigation tạo guidance tại các nhánh route, prepare và cập nhật vị trí; TripNavigationControls là nơi hiển thị câu này. Không cần sửa hook, config, fixture, API, dependency hay export.

## 6. Database Changes

None. Không truy cập hoặc ghi database, không tạo/chỉnh sửa chuyến để kiểm thử.

## 7. API & Swagger Changes

None.

## 8. UI/UX Changes

Chỉ dẫn chặng dừng chân 1 · 128 m hiển thị thành Chặng dừng chân 1 · 128 m ngay khi render, kể cả khi guidance đã có sẵn trong state. Các câu rẽ/đi/đến cũng được viết hoa đầu câu; không viết hoa các từ còn lại. Không đổi bố cục hoặc thêm màn hình, không cần wireframe mới.

## 9. Verification & Testing

- PASS cho tái hiện lỗi: `node --test scripts/trip-navigation-controls.test.ts` trước sửa component thất bại ở ca chữ đầu cần viết hoa.
- PASS sau sửa: `node --test scripts/trip-navigation-controls.test.ts scripts/trip-navigation.test.ts`, 35/35 tests.
- PASS: `npx --no-install tsc --noEmit --incremental false` trong mobile, exit code 0.
- PASS: `git diff --check` và kiểm tra LATEST.diff phân tích được bằng git apply --numstat --unidiff-zero; không áp dụng patch vào source.
- Đã đọc screenshot hiện tại của Samsung bằng ADB screencap, không bấm thao tác. Chuyến đã ở trạng thái Đã hoàn thành và không còn câu chỉ dẫn để đối chiếu.
- NOT_VERIFIED: chữ đầu trên native khi một chuyến đang chạy sau sửa. Không mở lại hoặc tạo chuyến để ép điều kiện kiểm thử.

Ảnh quan sát sau sửa: `C:/Users/toila/AppData/Local/Temp/rts-guidance-render-a6a9ed7e3dc240938ac67a4ec93a38be/samsung-guidance-after.png`. Các test chỉ dùng props trình bày, chuỗi và hình học thuần; không DB hoặc API có side effects.

## 10. Issues & Risks

Không phát hiện rủi ro mới qua kiểm tra. Chưa xác nhận lifecycle Fast Refresh của lỗi cũ; việc định dạng ngay khi render loại bỏ phụ thuộc vào giá trị guidance đã lưu. Native cần quan sát khi có chuyến đang chạy hợp lệ. Các vấn đề thời gian/GPS đã ghi ở báo cáo trước không thuộc task này.

## 11. Reviewer Focus

Kiểm tra định dạng chỉ tồn tại ở component hiển thị và xử lý được guidance chữ thường có sẵn. Giữ nguyên dấu tiếng Việt, phần còn lại của câu, tên đường, mét, props và thuật toán nextGuidance. Kiểm tra riêng ca chặng dừng chân 1 từ ảnh người dùng.

## 12. Suggested Next Step

Quan sát dòng chỉ dẫn trên chuyến đang chạy tiếp theo của người dùng để xác nhận native.

## 13. Approval Status

WAITING FOR USER REVIEW / APPROVAL. Đã triển khai theo chỉ thị sửa trực tiếp; chưa có nghiệm thu native sau sửa.
