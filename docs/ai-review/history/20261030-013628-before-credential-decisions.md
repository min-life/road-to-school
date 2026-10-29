# AI Review — Plan API improvements for 3.1
## 1. Task Information
2026-10-30 Asia/Saigon. API planning/documentation. Plan drafted; WAITING_APPROVAL and remaining contract decisions.
## 2. Original Request
Plan account API improvements using PO decisions and backward compatibility constraints.
## 3. Approved Scope
Read source/provider docs, author plan, ask uncertain contract fields. No implementation or provider/data mutation.
## 4. Analysis & Decisions
PO clarified email required on existing personnel creation endpoints even if phone-only legacy requests fail; live SMS using eSMS trial Brandname/template rather than Sandbox; retain account on email failure with separate resend-new-password action. Plan covers existing OTP dispatcher, console, email-only personnel delivery, proposed resend endpoints, contract/error matrix, candidate files and verification. Explicitly asks credentialDeliveryStatus, eligible resend accounts and personnel email console mode. Failure/timeout/fan-out/SMTP versus DB consistency require final contract review. No new schema/table/package in base plan.
## 5. Implementation Details
Created auth-api-improvement-plan.md. Updated auth-business-flow-detail.md with new PO choices and tracker decision log. Archived previous review. No application code changes.
## 6. Database Changes
None. Existing User/Session/OtpChallenge reuse proposed; no schema or migration approval inferred.
## 7. API & Swagger Changes
None implemented. Existing two create APIs proposed email-required validation change explicitly accepted by PO. Proposed additive status and resend endpoints pending contract approval. Swagger synchronization/live read-only verification included in future implementation plan.
## 8. UI/UX Changes
None. Existing Web forms allow phone-only, now explicitly documented as an accepted frontend validation impact. New API cannot supply missing UI resend automatically.
## 9. Verification & Testing
Read git status, auth/OTP modules/service and personnel DTO/modules/tests, leave channel metadata, FE call/field references and api package/example configuration. Official eSMS SMS and Sandbox docs searched/opened. Documentation diff check only; no tests/typecheck, DB/provider calls, API mutations or real sends. Runtime NOT_VERIFIED.
## 10. Issues & Risks
eSMS acceptance is not delivery; trial template exactness/account activation required. OTP dispatcher shared across multiple business flows. Email required breaks phone-only calls by PO choice. Plaintext password not recoverable; resend must generate new password. SMTP/DB cannot be one atomic transaction without additional design; do not claim guaranteed retry consistency. Pending response enum/console/resend eligibility not chosen autonomously.
## 11. Reviewer Focus
PO exception boundaries, exact trial template and Sandbox distinction, additive contract, delivery errors/cooldowns/partial sends, isConsole metadata, sender reuse and safe verification.
## 12. Suggested Next Step
PO answer pending contract questions and review the written plan before authorizing implementation.
## 13. Approval Status
Business choices recorded. Plan/contract/implementation WAITING FOR USER REVIEW / APPROVAL. No code implementation performed.
