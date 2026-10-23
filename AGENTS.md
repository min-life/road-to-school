# RoadToSchool — Agent Guidelines & Instructions

Mọi AI Agent khi làm việc trong repository này **BẮT BUỘC** tuân thủ các chỉ dẫn cốt lõi sau:

1. **Đọc tài liệu nghiệp vụ**: Đọc [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md) trước khi phân tích hoặc đề xuất bất kỳ tính năng nghiệp vụ nào.
2. **Đọc quy tắc kỹ thuật**: Đọc [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md) trước khi thực hiện bất kỳ task nào.
3. **Tuyệt đối không tự ý triển khai**: Phải xin phê duyệt kế hoạch (Planning Mode) trước khi viết code (Implementation Mode). Không tự ý sửa Database Schema, API contract hay logic khi chưa được duyệt.
4. **Đồng bộ Swagger bắt buộc**: Khi có bất kỳ thay đổi nào ở Backend API, phải cập nhật đầy đủ decorators/DTO và kiểm chứng tại `http://localhost:3000/api/docs`. Không hoàn thành task nếu Swagger chưa đồng bộ.
5. **Duyệt Wireframe trước khi code UI**: Mọi màn hình mới trên Web hay Mobile đều phải thiết kế và xin duyệt wireframe trước.
6. **Tối giản câu chữ trên UI (Minimal UI Copy)**: Áp dụng nguyên tắc *"Show what users need to know and do, not paragraphs explaining what the interface does"*. Không thêm đoạn văn mô tả thừa thãi, ưu tiên giao diện trực quan và phân cấp thông tin rõ ràng.
7. **Lưu báo cáo AI Review bắt buộc**: Sau mỗi lần phản hồi có nội dung thực chất (phân tích, đề xuất thiết kế, hoặc code), BẮT BUỘC lưu báo cáo đầy đủ 13 mục vào [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md) (kèm `LATEST.diff` nếu có code changes) trước khi trả lời trong chat. Chat response chỉ tóm tắt ngắn gọn và dẫn link báo cáo.
8. **Dừng lại sau mỗi task (Stop-After-Task)**: Báo cáo ngắn gọn kết quả theo quy định, dẫn link báo cáo AI Review, đề xuất duy nhất một bước tiếp theo và **DỪNG LẠI** chờ phản hồi của người dùng. Không tự ý thực hiện tiếp.
