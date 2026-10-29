# AI Review — Preserve personnel sessions on credential reissue
## 1. Task Information
2026-10-30 Asia/Saigon. Planning/documentation. COMPLETED recording.
## 2. Original Request
PO states personnel password change does not require Session revocation, in context of admin credential reissue.
## 3. Approved Scope
Update plan only; no implementation authorization.
## 4. Analysis & Decisions
Admin credential reissue preserves existing Sessions, tokenVersion and pushToken. New password applies to new logins after successful hash update; old sessions continue under current lifecycle. Does not change Trip or attendance. Scope is contextual admin reissue; do not change self-service change/reset contracts without instruction. Running-trip resend guard remains undecided; reconsider necessity now sessions persist.
## 5. Implementation Details
Appended superseding decision in plan section 12.2, updated auth analysis and tracker. Archived prior review. No application code changes.
## 6. Database Changes
None.
## 7. API & Swagger Changes
None implemented.
## 8. UI/UX Changes
None.
## 9. Verification & Testing
Read git status/docs and checked documentation diff. No application tests, typecheck, DB/provider/API calls.
## 10. Issues & Risks
Pending Trip guard, resend response and failure/concurrency contract require completion before implementation approval.
## 11. Reviewer Focus
Supersede prior revoke-session proposal without affecting self-service password flows or inferring guard approval.
## 12. Suggested Next Step
Finalize whether admin credential reissue is allowed during IN_PROGRESS Trips.
## 13. Approval Status
Session-preservation policy approved by PO; remaining plan/implementation WAITING FOR USER REVIEW / APPROVAL.
