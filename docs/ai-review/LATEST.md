# AI Review — Off-route incident absent during demo

## 1. Task Information
03/11/2026 Asia/Saigon. Scope: API/Mobile read-only diagnosis + Documentation. Type: Analysis. Status: COMPLETED. Last DB check 16:40:59.

## 2. Original Request
Xe nhìn thấy lệch tuyến khi chạy nhưng bus attendant không nhận popup và không thấy sự cố lệch tuyến trong tab Sự cố. Tìm nguyên nhân.

## 3. Approved Scope
Chỉ đọc source và dữ liệu chuyến 629290b4-dab7-438e-b10b-f02c50029bc2. Không sửa code/dữ liệu, không phát vị trí giả, không gọi endpoint có side effects. Quyền reset/demo của task trước không được dùng để tự thay dữ liệu trong task chẩn đoán này.

## 4. Analysis & Decisions
Nguyên nhân trực tiếp: không có record OFF_ROUTE trong database. Chỉ có DRIVER_MISSING / RESOLVED, đúng với ảnh tab hiện Vắng tài xế / Đã giải quyết. Badge 1 sự cố đếm tripIncidents.length, bao gồm sự cố đã xử lý, không chứng minh đang có lệch tuyến.
Trip đang IN_PROGRESS, actualStartTime 16:29:46, attendantReadyAt 16:26:02 ngày 03/11/2026. Nguồn điều hướng TEST_JOYSTICK.
Backend detector so khoảng cách tới toàn bộ polyline gốc trong routeSnapshot. Điều kiện: ít nhất 7 mẫu cùng runId, liên tục cách tuyến >=100m, kéo dài >=30 giây, gap giữa các mẫu <=15 giây; chỉ xét tối đa 12 mẫu mới nhất của run. Chỉ kích hoạt evaluateTelemetry sau khi publish vị trí thành công, không có detector cron tự đánh giá xe đứng yên khi không có sample mới.
Đọc toàn bộ 22 mẫu và dùng chính decodePolyline / pointToSegmentDistance / pointToPolylineDistance từ source TS để tính lại: 0/22 mẫu đạt >=100m. Maximum 98.6m, các mẫu cuối 71.8, 71.8, 71.8, 78.8, 98.6m. Không có chuỗi hợp lệ để tạo OFF_ROUTE.
Theo run: 6 mẫu/25.199s/max45.1m; 2 mẫu/5.020s/max4.6m; 14 mẫu/75.669s/max98.6m. Các run tách biệt, không ghép thời gian trước/sau switch để đủ chuỗi.
Mẫu cuối sequence22 lúc 2026-11-03T09:31:55.453Z = 16:31:55 Việt Nam. Tới 16:40:59 vẫn chỉ 22 mẫu. Ảnh 16:35/16:37 ghi Mất cập nhật phù hợp dữ liệu. Đợi lâu trên màn giáo viên không làm backend tự thu thêm mẫu tài xế.
Frontend cảnh báo Đang lệch tuyến khi projection.gap >40m so với đoạn chỉ dẫn hiện hành, tự tìm lại lộ trình sau 3 giây. Đây là ngưỡng/hình học khác detector sự cố >=100m/30s so với routeSnapshot gốc. Vì vậy thấy xe ra ngoài đường chỉ dẫn chưa đồng nghĩa đã đủ điều kiện tạo OFF_ROUTE.
Source useTripNavigation là foreground engine: blur màn hình, đổi identity hoặc AppState không active gọi suspend, gỡ watcher/timer. Nếu demo bằng cách chuyển Driver -> Attendant trên cùng một máy thì nguồn vị trí của driver dừng theo code. Chưa có log lifecycle thực tế để khẳng định thao tác nào làm dừng đúng lúc 16:31:55.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md/LATEST.diff và archive báo cáo cũ trong history/2026-11-03-before-off-route-popup-diagnosis.md/.diff.
Source đã rà: api/src/incidents/incidents-detector.service.ts, incidents.service.ts, incidents.module.ts; api/src/trips/trip-navigation.service.ts/trips.module.ts; mobile/hooks/use-trip-navigation.ts; mobile/app/trip/[id].tsx; mobile/services/api-client.ts; mobile/components/trip-navigation-controls.tsx.

## 6. Database Changes
None. Mọi truy vấn Prisma đều chạy trong SET TRANSACTION READ ONLY trên local 127.0.0.1:5433/roadtoschool. Không viết position/incidents/notifications, không reset hoặc cập nhật trip.

## 7. API & Swagger Changes
None. Source publish gọi detector sau khi ghi vị trí; IncidentsModule cung cấp detector cho TripsModule, cả source và dist có call evaluateTelemetry. Không chứng nhận DI của tiến trình đang chạy chỉ từ source.
listByTrip lấy tất cả incident thuộc trip, không loại OFF_ROUTE khỏi attendant. getTripIncidents đọc res.items. Không có OFF_ROUTE trong DB nên không có dữ liệu để trả về trong case này.

## 8. UI/UX Changes
None. App poll trip/incidents mỗi 5s khi active; popup attendant đợi OFF_ROUTE hoặc LATE_STOP có WAITING_CONFIRMATION. Popup không có đầu vào khi DB chưa tạo loại sự cố đó. Badge 1 sự cố đang đếm cả resolved history; dòng Mất cập nhật biểu thị vị trí cũ hơn 15s.

## 9. Verification & Testing
PASS: SELECT read-only trip trạng thái chạy, navigation checkpoint, incidents và toàn bộ 22 location points.
PASS: trích hàm toán học và decoder nguyên bản từ source TS, transpile trong bộ nhớ và tính khoảng cách trên tọa độ/polyline thật, không mock business response hoặc tọa độ.
PASS: kiểm tra cửa sổ tối đa12 cùng run, số mẫu và chuỗi >=100m: không mẫu nào đạt, do đó không đủ điều kiện OFF_ROUTE tại bất kỳ sample hiện có.
PASS: đọc lại DB lúc16:40:59: IN_PROGRESS,22mẫu,last16:31:55,duy nhất DRIVER_MISSING RESOLVED.
NOT_VERIFIED: runtime logs của thiết bị, vòng publish bị dừng bởi thao tác nào, binding detector trong tiến trình API đang chạy, HTTP/authenticated popup đầu-cuối khi có một OFF_ROUTE thật. Không chạy mutation tạo sự cố để test. Không build/typecheck vì không sửa code.

## 10. Issues & Risks
Frontend và backend có ngưỡng/hình học lệch tuyến khác nhau nên dễ hiểu nhầm. Điều hướng foreground không tiếp tục publish khi driver blur/background. Badge đếm cả resolved incident làm người dùng tưởng có sự cố mới. Không kết luận popup hoặc mạng hỏng trong case này; bằng chứng chính là chưa có incident để hiển thị và không có sample đủ ngưỡng. Chưa xác định chính xác vì sao publisher dừng từ logs thiết bị.

## 11. Reviewer Focus
Phân biệt deviation UI >40m/đoạn hiện hành và auto-incident >=100m/route gốc >=30s. Không tạo incident bằng tọa độ cũ hoặc ghép runId. Giữ evidence absence of OFF_ROUTE, chronology và giới hạn chưa xác nhận runtime.

## 12. Suggested Next Step
Demo bằng hai phiên/thiết bị riêng: giữ màn Driver foreground, điều khiển xe lệch route gốc khoảng150m ít nhất40s trong khi xem Attendant ở phiên khác để nguồn vị trí không bị dừng trước khi đủ chuỗi.

## 13. Approval Status
Người dùng chỉ yêu cầu tìm nguyên nhân. Hoàn tất chẩn đoán, chưa triển khai sửa code hoặc thay dữ liệu. WAITING FOR USER REVIEW / APPROVAL nếu cần đổi hành vi.
