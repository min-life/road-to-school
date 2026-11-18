# Cập nhật địa giới DB local — 07/11/2026

PO yêu cầu bổ sung mã và cấu hình bãi; sau câu hỏi quyền VietMap đã yêu cầu chạy thay dữ liệu. Dùng tọa độ hiện có và API key tích hợp VietMap, chỉ gửi latitude/longitude tới reverse/v4 (display_type=5), không gửi tên/SĐT hoặc ghi key vào báo cáo.

## Kết quả

- Bãi Suối Tiên đã lưu qua API hiện hành:10.866123,106.802345; radius50km, bao phủ27/27 trường. Trường xa nhất14.65km; cả học sinh/vị trí trường đã hẹn xa nhất16.27km.
- Backfill27 trường +75 học sinh trong một transaction. Chỉ province/provinceId/ward/wardId và updatedAt tự động của Prisma. Mã lấy thật từ provider;102 vị trí,1 tỉnh/thành và6 phường/xã toàn bộ tập dữ liệu.
- Giữ nguyên addressText và latitude/longitude; kiểm lại snapshot trước/sau cho109 records. Không sửa route stops/trip snapshots, liên kết phụ huynh, trạng thái/hợp đồng/lịch hoặc tự sinh chuyến.
-7 học sinh thiếu tọa độ giữ nguyên, không gán mã theo trường hoặc đoán địa chỉ.

## Kiểm chứng sau ghi

GET parking200 radius50; school location-options200:1 tỉnh/4 phường. Trường WEBTEST đầy đủ: student options200 có Thành phố Hồ Chí Minh, Phường Bến Thành và Phường Sài Gòn. GET lọc provinceId/wardId trả30/30 học sinh khớp cặp mã. GET preparation200 với13 eligible/35 ineligible (32 đã có tuyến,1 thiếu tọa độ,2 ngừng). Một case trước mang province giả khác tỉnh nhưng tọa độ ở TP.HCM đã được chuẩn hóa theo tọa độ.

Playwright đã tải lại tab Học sinh, snapshot thấy các lựa chọn tỉnh/phường thật. Không gọi generate/confirm-plan/approve hoặc tạo test records để kiểm.

## Bản sao và khả năng phục hồi

`output/playwright/geography-backfill-before.json`: snapshot metadata trước ghi, gồm ID/tọa độ/địa giới/updatedAt/hash addressText, không full DB backup. `geography-backfill-plan.json` có before/after từng record; `geography-backfill-applied.json` có thống kê sau ghi. Các file này đã kiểm git-ignore, chỉ lưu local. Bước ghi dùng CAS updatedAt+tọa độ+metadata cũ, có mismatch thì rollback transaction; không rollback tự động sau khi đã thành công.

## Cần bổ sung tọa độ

- Học sinh `99ecff0a-5e39-4f2d-87dc-ce11a7d6883d`: thiếu tọa độ, chưa cập nhật mã.
- Học sinh `fec90756-8fe0-4cb2-bb9c-b7c96e57e897`: thiếu tọa độ, chưa cập nhật mã.
- Học sinh `8725402e-d4fa-4a6f-a543-59d56c561a20`: thiếu tọa độ, chưa cập nhật mã.
- Học sinh `2d7a0d44-adb2-4773-a11f-ece8e8fe476c`: thiếu tọa độ, chưa cập nhật mã.
- Học sinh `931ae71f-caea-45c4-88f3-10a4ea4b32e2`: thiếu tọa độ, chưa cập nhật mã.
- Học sinh `6e981b84-7343-4943-be27-17d2b4521158`: thiếu tọa độ, chưa cập nhật mã.
- Học sinh `fe80c782-15df-4d60-a4ab-48e041438e75`: thiếu tọa độ, chưa cập nhật mã.

## Giới hạn sinh chuyến

Bãi đủ phạm vi không đồng nghĩa mọi trường có thể sinh chuyến. DB có21 trường chưa học sinh,22 trường chưa phương án,1 trường ngừng; có hợp đồng hết hạn/tương lai. Cần học sinh có tọa độ, phương án ACTIVE đủ phân công, ngày nằm trong hợp đồng và lịch phục vụ hợp lệ theo API. Không tự kích hoạt/gia hạn/duyệt để ép sinh chuyến cho các case này.
