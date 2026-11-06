# Chạy local, kiểm tra và chẩn đoán

## Cài đặt

Dùng Node24 như môi trường session; kiểm tra node --version, npm --version. Ba project độc lập, mỗi thư mục có package-lock; chạy `npm ci --include=dev` lần lượt trong api, web, mobile. Không chạy npm ở root và không update lockfile. Lệnh dưới là hướng dẫn, task docs không thực thi cài đặt hoặc DB.

PostgreSQL local cần role/database đã được cấp. Windows có thể có nhiều instance/port; xác nhận instance mục tiêu bằng Services/Get-Service và kết nối tới đúng localhost:port, không suy rằng service cài mới chính là DB project. Không reset hay ghi đè DB có dữ liệu.

## Cấu hình

API đọc api/.env qua ConfigModule, Prisma đọc DATABASE_URL. Web dùng web/.env.local; Expo dùng mobile/.env. Không commit các file này. [Danh mục biến](environment.md) dẫn source kiểm tra từng tên.

| Nhóm | Điều kiện | Mẫu an toàn/mục đích |
| --- | --- | --- |
| DATABASE_URL | Bắt buộc để dùng DB | postgresql://LOCAL_USER:LOCAL_PASSWORD@127.0.0.1:5432/LOCAL_DATABASE?schema=public; thay placeholder riêng tại máy |
| AUTH_JWT_ACCESS_SECRET | Phải đặt secret riêng khi chạy | Không dựa fallback development trong source; không đưa giá trị thật vào docs |
| PORT | Tùy chọn | 3000 mặc định |
| NEXT_PUBLIC_API_URL | Web | http://localhost:3000/api/v1 |
| EXPO_PUBLIC_API_URL | Tùy chọn override host Expo | http://LAN_HOST:3000/api/v1 trên điện thoại; localhost của điện thoại không phải PC |
| AUTH_OTP_LENGTH, AUTH_OTP_TTL_SECONDS | Tùy chọn | Xem otp.service.ts để xác định default/validation |
| AUTH_ACCESS_TOKEN_TTL_SECONDS, AUTH_REFRESH_TOKEN_TTL_SECONDS | Tùy chọn | Xem auth.service.ts/auth.module.ts |
| AUTH_EMAIL_MODE, SMTP_* | Khi cần email thật | console hoặc smtp theo otp.service.ts; SMTP cần host/port/user/password/from phù hợp |
| VIETMAP_SERVICES_KEY và public map keys | Khi dùng map/VRP/navigation | Tên và nơi dùng ở environment.md; backend secret khác public client config |
| CLOUDINARY_* | Khi upload ảnh | cloud name/API key/secret ở backend; không đưa secret vào client |
| PUSH_NOTIFICATIONS_ENABLED, EXPO_PUSH_ACCESS_TOKEN | Khi triển khai push | Push phải cấu hình delivery/EAS/APNs/FCM theo docs hiện có; inbox không đồng nghĩa push đã chạy |
| TRIP_OPERATION_MODE, TRIP_GENERATION_LOOKAHEAD_DAYS | Vận hành | Đọc trips.service.ts; TEST không thay quyền hoặc cho phép tạo dữ liệu test |

Các biến BOOTSTRAP_ADMIN_* thuộc script bootstrap, không tự chạy seed-admin hoặc seed-round3-test-users. Scripts one-off/backfill/e2e có khả năng ghi DB: chỉ dùng khi được cấp phạm vi cụ thể.

## Prisma và khởi động

Trong api: `npx prisma generate`; `npx prisma migrate status`. Generate ghi generated client, không phải migrate. Chỉ khi có quyền trên DB local và đã đọc migration, dùng `npx prisma migrate deploy` để apply lịch sử hiện có; không migrate reset/db push/migrate dev chỉ để đồng bộ thử nghiệm. Xem [schema và migration files](data-model.md). pgAdmin đăng ký đúng host/port/database/user riêng của máy; mở Schemas/public/Tables để đọc cấu trúc, không cần seed.

Mỗi lệnh một terminal, đúng thư mục:

| Thư mục | Dev | Build/kiểm tra |
| --- | --- | --- |
| api | npm run dev | npm run build; node node_modules/typescript/bin/tsc --noEmit --incremental false |
| web | npm run dev (5173) | npm run build; npm run lint; typecheck tương tự |
| mobile | npm start (Expo) | typecheck; node node_modules/expo/bin/cli export --platform all --output-dir PATH_NGOAI_REPO |

API: http://localhost:3000/api/v1/health và /health/db; Swagger http://localhost:3000/api/docs. main.ts CORS hiện chỉ cho localhost/127.0.0.1:5173; Expo Web origin khác có thể bị CORS, đừng chẩn đoán nhầm lỗi auth. Native fetch không cùng mô hình browser CORS. Trên iPhone dùng cùng LAN với Metro/API; kiểm tra firewall và địa chỉ API trước khi đổi auth logic. Không khởi động server trùng port đang dùng.

## API mẫu và lỗi

Ví dụ không chứa dữ liệu tài khoản: GET /api/v1/health không body; endpoint bảo vệ dùng header Authorization: Bearer ACCESS_TOKEN_PLACEHOLDER. POST /api/v1/auth/forgot-password/request-otp nhận {"identifier":"parent@example.invalid"}; đây là cấu trúc từ backend auth DTO, **không phải lệnh yêu cầu gửi OTP để test**. Login trả token pair/user theo AuthResponseDto; message endpoints trả MessageResponseDto. Xem từng DTO cho trường/nullable và Swagger backend để xác nhận response, không dùng client cast làm chứng cứ server.

ValidationPipe từ chối trường ngoài whitelist, transform dữ liệu theo DTO và lỗi validation có statusCode/code/message/errors. Guard/service phân biệt 401/403/404; xung đột state/assignment phải đọc message/code thực tế. Client giữ xử lý hết phiên/refresh và lỗi mạng riêng; kiểm tra web/src/lib/api-client.ts, mobile/services/api-client.ts và auth context trước khi thay retry. List query/response khác nhau theo module: xem List*Dto cho filters/page/sort và response DTO cho items/count; không giả định mọi endpoint phân trang giống nhau hoặc có cache chung.

## Tests và manual checks

API có Vitest spec, web có node:test, mobile có scripts/*.test.ts; [source-map](source-map.md) liệt kê file. api/npm test và test:e2e chỉ chạy sau khi đọc fixture/setup để chắc không ghi DB. Web npm test; Mobile ví dụ an toàn đã đối chiếu trong session: `node --experimental-strip-types --test scripts/onboarding-route.test.ts scripts/keyboard-visibility.test.ts`. Không chạy api/scripts/test_live_round3.js, e2e-all-flows.ts hoặc seed scripts chỉ vì tên có test.

Checklist read-only với dữ liệu/tài khoản được cấp: vào màn đúng role, kiểm tra loading/error/empty, list filter/page, details và quyền trường/con; GET thiếu auth phải bị chặn. Các bước tạo/sửa/duyệt/start/attendance/OTP đều có side effects, cần phạm vi UAT riêng. Khi thiếu dữ liệu đánh dấu NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY, không tự tạo record.

| Triệu chứng | Chẩn đoán |
| --- | --- |
| ECONNREFUSED/health lỗi | Kiểm tra process/port, DATABASE_URL host, instance Postgres; health và health/db phân biệt server với DB |
| Password authentication failed | Xác nhận role/port/password của chính instance, không tự reset mật khẩu hoặc xóa DB |
| Expo không gọi API | Xem getApiBaseUrl trong mobile/services/api.ts, LAN host và firewall; tunnel Metro không tự tunnel API |
| Swagger UI không có endpoint mới | Kiểm tra server đang chạy đúng checkout, module import và document hiện tại |
| OTP không đến | Xác định console/smtp, log gửi và cấu hình dịch vụ; không phát hành OTP lặp để đoán lỗi |
| Không xem lại onboarding | Marker thiết bị đã hoàn thành; chưa có nút replay, Reload không reset marker |
| Build/typecheck fail | Lưu command, cwd, version và lỗi; không cài/nâng dependency tự động để che sai lockfile |

Các kết quả test lịch sử và giới hạn thiết bị được dẫn ở tài liệu UI. Task tài liệu không chứng minh DB local hiện đang kết nối, migration đã apply hoặc dịch vụ phụ trợ đã gửi thành công.
