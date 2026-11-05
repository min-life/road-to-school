# AI Review — Implement API improvements for 3.1

## 1. Task Information
2026-10-30 Asia/Saigon. Scope API + documentation + explicitly authorized local environment configuration. Type Implementation. Status IMPLEMENTED / READY_WITH_LIMITATIONS. Real delivery and business mutations NOT_VERIFIED.

## 2. Original Request
Implement the approved 3.1 API plan. Ask before sensitive decisions and environment changes. Absolutely do not run test scripts. Preserve old fields and minimize frontend breakage, with explicitly accepted mandatory-email validation exception.

## 3. Approved Scope
PO authorized implementation and subsequently confirmed: resend allowed during IN_PROGRESS; response includes message and credentialDeliveryStatus; save new password before email, FAILED retains new hash; preserve existing Sessions/tokenVersion/pushToken. PO authorized editing real api/.env while reusing existing email/SMS mode variables. No frontend, schema, migrations, packages, test scripts or live SMS/email/data writes authorized/executed.

## 4. Analysis & Decisions
Reused AUTH_EMAIL_MODE for OTP and personnel email, AUTH_SMS_MODE for console/esms. Added only missing ESMS_API_KEY and ESMS_SECRET_KEY to real ignored .env, blank; preserved all existing values. Did not add PERSONNEL_EMAIL_MODE or alter .env.example. eSMS HTTPS POST uses exact Baotrixemay trial template, SmsType=2, IsUnicode=0, Sandbox=0, six-digit local OTP, stable per-challenge/destination RequestId. Console does not call providers and is rejected for NODE_ENV=production. SMTP uses existing Nodemailer with bounded timeouts; no dependency added.
Personnel email required on old endpoints; response additive SENT/FAILED/CONSOLE. User creation commits before delivery; failure preserves account, creation remains 201 with FAILED/message. New resend saves hash with conditional matching, then sends; never revokes Sessions or edits Trip state. Hash/email/active state rechecked after send; per-process same-user in-flight guard and CAS reject detected conflicts. Create delivery shares guard and verifies current hash before/after sending.
OTP dispatch reused for all existing purposes. At least one accepted channel keeps fan-out challenge usable; when every channel definitely fails, expiresAt is set to now so retry is possible; uncertain timeout/response preserves cooldown and returns 503, no automatic resend. Channel isConsole now derived from configured transport. No OTP contract fields removed.

## 5. Implementation Details
New files: api/src/auth/delivery-error.ts, email-delivery.service.ts, esms-sms.service.ts, credential-delivery.dto.ts, personnel-credentials.service.ts.
Modified: auth.module.ts, otp.service.ts, auth.controller.ts; drivers controller/service/create-driver.dto.ts/driver-response.dto.ts; schools controller/service/create-school-admin.dto.ts/school-employee-response.dto.ts; leave-notices controller/service; parents controller and student-requests parent controller (OTP 503 docs); docs/architecture/auth-technical-design.md; tracker/plan/auth detail and review artifacts.
Used property injection in existing services/controllers to preserve their constructor call signatures. Service entry points tolerate absent email at type boundary to validate and reject it explicitly; HTTP DTOs require email in both validation and Swagger. Existing tests unchanged and not executed.

## 6. Database Changes
None to schema, constraints or migrations. No DB connection, query, seed, backfill or business mutation executed by this task. Source only implements future User/OtpChallenge writes under authorized API use. .env is ignored and excluded from diff/report contents.

## 7. API & Swagger Changes
POST /api/v1/drivers and /api/v1/schools/:id/employees: email required, phone optional; old response fields preserved, credentialDeliveryStatus additive, 201 even if email fails after creation.
POST /api/v1/drivers/:id/credentials/resend: SYSTEM_ADMIN for DRIVER.
POST /api/v1/schools/:id/employees/:employeeId/credentials/resend: SYSTEM_ADMIN for SCHOOL_ADMIN, SCHOOL_ADMIN for own-school BUS_ATTENDANT.
New routes take no required body, 200 message + credentialDeliveryStatus. 400 malformed IDs/inactive/missing valid email; 401/403 auth/role/scope; 404 target; 409 concurrency/state change; 500 DB failure. FAILED on 200 indicates password already changed but delivery not confirmed; retry issues another password.
OTP request endpoints document 503 delivery failure/uncertainty. Public login/register/reset/refresh field shapes unchanged. Existing self-service change/reset password Session revocation behavior unchanged.
Swagger decorators updated and live UI/JSON checked at localhost:3000/api/docs and api/docs-json using actual AppModule/controller DTO metadata with a documentation-only HTTP server. Did not call app.init/app.listen: no Prisma lifecycle hooks, cron or application routes activated. UI HTTP 200; JSON showed fullName/email required on both DTOs, SENT/FAILED/CONSOLE on both creation responses and both resend paths. Documentation server stopped after inspection. This is documentation verification, not live application business acceptance.

## 8. UI/UX Changes
None. Web currently permits phone-only input; these submissions now receive 400, explicitly accepted by PO. FE can ignore additive fields but will not gain a resend button automatically. No new UI/wireframe work.

## 9. Verification & Testing
PASS: final api npx --no-install tsc --noEmit --incremental false, exit 0.
PASS: final api npx --no-install tsc --project tsconfig.build.json --incremental false, exit 0 (compilation only).
PASS: targeted npx --no-install oxlint on delivery/personnel/auth/driver/school files, exit 0; one existing unused SchoolEmployeeRoleFilter import warning in schools.service.ts. Not a test run.
PASS: read-only Swagger UI HTTP 200 and schema/path inspection as described above; dependency wiring instantiated successfully without lifecycle hooks.
PASS: git diff --check after EOF correction; only repository LF/CRLF notices.
Initial typecheck found inherited message property declarations and old spec calls lacking email; fixed declaration overrides and explicit service-boundary validation typing, final check passed. No test fixtures changed.
NOT RUN: all unit/integration/E2E/test scripts, explicitly prohibited by PO. No fake data or mocks executed. No package installation.
NOT_VERIFIED: actual eSMS/SMTP delivery, actual personnel create/resend/OTP writes, active Session continuity, real concurrent PostgreSQL/API requests. Write UAT remains BLOCKED_BY_TEST_DATA_POLICY without approved existing records/environment/side-effect scope; two newly added eSMS secrets are empty. No provider send attempted.

## 10. Issues & Risks
SENT means SMTP/provider accepted, not actual inbox/device delivery. eSMS trial Brandname/template must be available for account; no RoadToSchool custom text added.
PO explicitly accepts loss of old-password login after resend even when email fails; existing Sessions remain. Operator must resend to recover credentials.
Per-process in-flight guard is not a distributed lock. CAS and post-send recheck detect many races but cannot make provider delivery atomic with password persistence or prevent late old emails across multiple processes/other password flows; use latest successfully issued password. Do not claim multi-instance exactly-once delivery.
OTP fan-out returns success when any eligible channel accepted, not proof all channels delivered. Timeout retains cooldown; operator/user may need to wait for expiry.
Local real .env changed only by adding missing blank secret keys; no existing secret or mode overwritten. No secrets printed, copied to diff or committed.
Existing automated tests still contain old phone-only assumptions/manual construction and have not been run or adapted; no suite-passing claim. Document-only Swagger check does not certify full app runtime.

## 11. Reviewer Focus
Required email validation and preservation of response fields; accepted phone-only break; sender template/modes/no outbound console; OTP definitive versus uncertain failure and partial fan-out; authorization on resend; no Session/push/Trip mutation; write-before-send semantics; per-process versus distributed concurrency limits; honest non-test/static verification.

## 12. Suggested Next Step
PO provide/configure eSMS credentials locally and authorize a narrowly scoped existing-recipient delivery acceptance check with explicit cost/data limits; keep test scripts prohibited unless PO changes that instruction.

## 13. Approval Status
Implementation and sensitive choices authorized in chat; code implemented, pending PO review and runtime acceptance. Not marked VERIFIED for real delivery/business workflows. No commit/push performed.
