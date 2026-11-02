# Phần cải thiện nghiệp vụ còn lại sau 3.2

03/11/2026. Discussion/tracking, không triển khai mới. Các số 3.3–3.18 quy chiếu theo thứ tự WF-03..WF-18 trong BUSINESS_IMPROVEMENT_TRACKER.md, không phải đánh số heading hiện có của file đó.

3.1 và nghiệp vụ chính 3.2 đã IMPLEMENTED; migration 3.2 đã apply local, code đã commit/push de2e301. Chưa coi là VERIFIED nghiệp vụ/runtime. Những nhóm dưới đã có chức năng nền tảng; phần còn thiếu là đợt cải thiện nghiệp vụ, không phải toàn bộ module chưa được xây dựng. Chỉ đối chiếu tracker và phạm vi source đã đổi, không thực hiện fresh full-code audit hoặc xác nhận mọi bug baseline còn tái hiện.

| Mục / tracker | Nhóm | Nội dung còn cần chốt/rà soát/triển khai |
|---|---|---|
| 3.3 / WF-03 | Nguồn lực và bãi | Xe bảo dưỡng/ngừng phục vụ; số chỗ học sinh; điều kiện tài xế/giáo viên, nghỉ việc/bàn giao; đổi bãi theo ngày. |
| 3.4 / WF-04 | Học sinh và phụ huynh | Nhiều phụ huynh cùng quản lý; chuyển trường/năm học; thay số giám hộ và giữ lịch sử. |
| 3.5 / WF-05 | Tạo phương án | Học sinh chưa được xếp tuyến; tính phù hợp điểm dừng/thời gian ngồi xe; giới hạn và kết quả tối ưu cần công bố. |
| 3.6 / WF-06 | Phân công và duyệt | Thay phương án ACTIVE có cần duyệt lại; nhận nhiệm vụ; thay mặc định tác động Trip đã sinh từ ngày nào. |
| 3.7 / WF-07 | Sinh chuyến và lịch | Phân biệt lịch dự kiến/Trip thật; ngày bắt đầu phục vụ; tái phục vụ sau hủy và roster khi tuyến thay đổi. |
| 3.8 / WF-08 | Đổi phân công chuyến | Chuyến trước trễ; khoảng chuyển tiếp; hạn thay người/xe; bàn giao/reset Ready. Giữ bận do lifecycle đã nối ở 3.2. |
| 3.9 / WF-09 | Chiều đến trường | No-show/thời gian chờ; sửa điểm danh khác đón mới; bàn giao cho trường và ý nghĩa xác nhận đến trường. |
| 3.10 / WF-10 | Chiều về | Tất cả học sinh ABSENT; phụ huynh tự đón; người nhận thay; không có người nhận; kết thúc nhiệm vụ thực tế. |
| 3.11 / WF-11 | Theo dõi và lịch sử | Chuyến trễ mất home card; GPS cũ/mất mạng; phạm vi xem và giới hạn ETA. |
| 3.12 / WF-12 | Học sinh báo nghỉ | Báo muộn/nghỉ nhiều ngày; người được rút đơn khi có nhiều phụ huynh; phân biệt nghỉ xe và nghỉ học. |
| 3.13 / WF-13 | Nhân sự báo nghỉ | Nghỉ theo kỳ; người thay nhận việc; người cũ quay lại; đồng thời thiếu tài xế và giáo viên. |
| 3.14 / WF-14 | Sửa thông tin/địa chỉ học sinh | Bắt buộc đúng preview còn hiệu lực; kiểm tra dữ liệu thay đổi; đồng bộ tuyến/giờ/snapshot và ngày áp dụng. Đổi địa điểm trường đã làm ở 3.2 không thay thế mục này. |
| 3.15 / WF-15 | Chèn học sinh/ngừng phục vụ | Ngày bắt đầu có mặt trong roster; xử lý Trip đã sinh; disable/enable/chuyển trường không tự coi là đã xếp tuyến. |
| 3.16 / WF-16 | Hủy/chuyển tiếp phương án | Đã làm hết hợp đồng/inactive/relocation trong 3.2; còn rà hủy thủ công, preview tác động, chuyến vừa Start và chuyển tiếp cũ/mới. |
| 3.17 / WF-17 | Sự cố và điều phối | Kiểm tra lại khả dụng người thay ngay khi lưu; cảnh báo tái diễn/mất GPS; đóng khác xác nhận; ranh giới cứu hộ/y tế/xe hỏng cần chốt. |
| 3.18 / WF-18 | Tổng quan và thông báo | Đã đọc khác đã giải quyết; người chịu trách nhiệm/hạn xử lý; phân biệt inbox và push; nghiệm thu push thật. |

## Tồn đọng riêng của 3.1–3.2

- Nghiệm thu tích hợp FE, gửi SMS/email thật, lịch âm, cron qua ngày/restart, account inactive/reactivate, admin chốt Trip và tranh chấp dữ liệu. Không chạy script test hoặc gọi mutation để chứng minh.
- API preview tổng quát/preview gia hạn chưa có contract cuối; hủy học bù chưa triển khai; sửa tên/ảnh trường không thuộc scope 3.2 đã chốt. Không coi các tính năng này tự được duyệt chỉ vì liệt kê.
- B-07 có cron/catch-up trong source mới; không còn xem là “chưa có caller”. P-01 lịch nghỉ/học bù và phần trường của P-05 đã IMPLEMENTED; không liệt kê lại là hoàn toàn chưa làm. Không tự đề xuất mở thay đổi hôm nay trái quy tắc đã chốt.
- B-05 lịch trường đã được xử lý trong 3.2 nhưng runtime/snapshot timing cần nghiệm thu; B-06 hủy thủ công và B-03 thay người qua incident vẫn cần rà chi tiết, không suy ra được sửa toàn bộ từ guard lifecycle mới.

## Phạm vi chưa được duyệt mở rộng

Thu phí/hoàn phí, nhiều nhà xe/bãi, chuyến qua đêm, cứu hộ/chuyển học sinh giữa xe đầy đủ và offline đầy đủ cần quyết định scope riêng; không tự đưa vào implementation tiếp theo.

## Một bước tiếp theo

Phân tích chi tiết 3.3 — Nguồn lực và bãi; tiếp nhận trường hợp nhân sự nghỉ việc đã chuyển từ 3.1. Chưa triển khai source mới.
