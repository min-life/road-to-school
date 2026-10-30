# Danh mục API từ backend

28/10/2026; source db02de6 và tài liệu local chưa commit. Prefix `/api/v1`; danh mục tĩnh, không phải kết quả gọi API. Guard cấp method/class quyết định quyền; đọc service cho scope object/school và DTO cho validation. Swagger runtime tại `/api/docs` và `/api/docs-json`.

## auth

[api/src/auth/auth.controller.ts](../../api/src/auth/auth.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| POST | /auth/web/login |
| POST | /auth/mobile/login |
| POST | /auth/register/request-otp |
| POST | /auth/register/verify |
| POST | /auth/forgot-password/request-otp |
| POST | /auth/reset-password |
| POST | /auth/refresh |
| GET | /auth/me |
| POST | /auth/logout |
| POST | /auth/me/change-password |
| POST | /auth/me/avatar |
| PATCH | /auth/me/name |
## drivers

[api/src/drivers/drivers.controller.ts](../../api/src/drivers/drivers.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /drivers |
| POST | /drivers |
| GET | /drivers/:id |
## health

[api/src/health/health.controller.ts](../../api/src/health/health.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /health |
| GET | /health/db |
## root

[api/src/incidents/incidents.controller.ts](../../api/src/incidents/incidents.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /trips/:id/incident-options |
| POST | /trips/:id/incidents |
| GET | /trips/:id/incidents |
| GET | /incidents/mine |
| GET | /incidents |
| GET | /incidents/:id/replacement-candidates |
| GET | /incidents/:id |
| POST | /incidents/:id/resolve |
| POST | /incidents/:id/cancel-trip |
| POST | /incidents/:id/confirm |
## leave-notices

[api/src/leave-notices/leave-notices.controller.ts](../../api/src/leave-notices/leave-notices.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /leave-notices/options |
| POST | /leave-notices/otp |
| POST | /leave-notices/confirm |
| GET | /leave-notices |
| GET | /leave-notices/:id |
| POST | /leave-notices/:id/cancel |
| GET | /leave-notices/:id/replacement-candidates |
| POST | /leave-notices/:id/assign-replacement |
| POST | /leave-notices/:id/cancel-trip |
## notifications

[api/src/notifications/notifications.controller.ts](../../api/src/notifications/notifications.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /notifications |
| GET | /notifications/summary |
| PUT | /notifications/read-all |
| PUT | /notifications/device |
| DELETE | /notifications/device |
| GET | /notifications/:id/target |
| PUT | /notifications/:id/read |
## admin/overview

[api/src/overview/overview.controller.ts](../../api/src/overview/overview.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /admin/overview |
## parents

[api/src/parents/parents.controller.ts](../../api/src/parents/parents.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /parents/students |
| GET | /parents/students/:id |
| POST | /parents/link-requests |
| POST | /parents/verify-link |
| DELETE | /parents/students/:id |
## routes

[api/src/routes/routes.controller.ts](../../api/src/routes/routes.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /routes/preparation/:schoolId |
| POST | /routes/optimize-preview |
| POST | /routes/preview/cancel-return |
| POST | /routes/confirm-plan |
| GET | /routes/route-plans |
| GET | /routes/route-plans/:id |
| GET | /routes/route-plans/:id/cancellation-impact |
| POST | /routes/route-plans/:id/cancel |
| GET | /routes/route-plans/:id/approval-readiness |
| POST | /routes/route-plans/:id/approve |
| GET | /routes/route-plans/:id/candidate-vehicles |
| GET | /routes/route-plans/:id/candidate-drivers |
| GET | /routes/route-plans/:id/candidate-bus-attendants |
| PATCH | /routes/route-plans/:id/assignments/vehicle |
| PATCH | /routes/route-plans/:id/assignments/driver |
| PATCH | /routes/route-plans/:id/assignments/bus-attendant |
| GET | /routes |
| GET | /routes/:id |
| GET | /routes/students/:studentId/routing |
| GET | /routes/students/:studentId/insertion-options |
| POST | /routes/student-insertions/preview |
| POST | /routes/student-insertions/confirm |
## schools

[api/src/schools/schools.controller.ts](../../api/src/schools/schools.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| POST | /schools |
| GET | /schools |
| GET | /schools/:id |
| PATCH | /schools/:id/status |
| GET | /schools/:id/employees |
| GET | /schools/:id/employees/:employeeId |
| POST | /schools/:id/employees |
| GET | /schools/:id/settings |
| GET | /schools/:id/location-impact |
| PATCH | /schools/:id/location |
| PATCH | /schools/:id/contract |
| PATCH | /schools/:id/schedule |
## parents

[api/src/student-requests/parent-requests.controller.ts](../../api/src/student-requests/parent-requests.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| POST | /parents/students/:id/update-requests/otp |
| POST | /parents/students/:id/update-requests/verify |
| GET | /parents/students/:id/update-requests |
| GET | /parents/update-requests/:requestId |
| POST | /parents/update-requests/:requestId/cancel |
## schools/:schoolId

[api/src/student-requests/school-requests.controller.ts](../../api/src/student-requests/school-requests.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /schools/:schoolId/update-requests |
| GET | /schools/:schoolId/students/:id/update-requests |
| GET | /schools/:schoolId/update-requests/:requestId |
| POST | /schools/:schoolId/update-requests/:requestId/approve |
| POST | /schools/:schoolId/update-requests/:requestId/reject |
| PATCH | /schools/:schoolId/students/:id/address |
## system-admin/update-requests

[api/src/student-requests/system-requests.controller.ts](../../api/src/student-requests/system-requests.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /system-admin/update-requests |
| GET | /system-admin/update-requests/:requestId |
| POST | /system-admin/update-requests/:requestId/routing-preview |
| POST | /system-admin/update-requests/:requestId/approve |
| POST | /system-admin/update-requests/:requestId/reject |
## schools/:schoolId/students

[api/src/students/students.controller.ts](../../api/src/students/students.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /schools/:schoolId/students |
| POST | /schools/:schoolId/students |
| GET | /schools/:schoolId/students/:id |
| GET | /schools/:schoolId/students/:id/disable-impact |
| PATCH | /schools/:schoolId/students/:id/status |
## system-settings

[api/src/system-settings/system-settings.controller.ts](../../api/src/system-settings/system-settings.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /system-settings/parking-lot |
| GET | /system-settings/parking-lot/impact |
| PUT | /system-settings/parking-lot |
## trips/:id

[api/src/trips/trip-navigation.controller.ts](../../api/src/trips/trip-navigation.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /trips/:id/navigation |
| PUT | /trips/:id/navigation/session |
| PUT | /trips/:id/navigation/position |
| POST | /trips/:id/navigation/segment |
| GET | /trips/:id/location-history |
## trips

[api/src/trips/trips.controller.ts](../../api/src/trips/trips.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| POST | /trips/generate |
| GET | /trips |
| GET | /trips/mobile/home-trip |
| GET | /trips/mobile/parent/home-cards |
| GET | /trips/:id |
| POST | /trips/:id/attendant-ready |
| POST | /trips/:id/start |
| POST | /trips/:id/arrive-at-school |
| GET | /trips/:id/operational-state |
| GET | /trips/:id/attendance |
| PUT | /trips/:id/attendance/:studentId |
| PUT | /trips/:id/attendance/:studentId/alighting |
| POST | /trips/:id/attendance/verify-qr |
| POST | /trips/:id/complete |
## vehicles

[api/src/vehicles/vehicles.controller.ts](../../api/src/vehicles/vehicles.controller.ts)

| Method | Route (sau prefix) |
| --- | --- |
| GET | /vehicles |
| POST | /vehicles |
