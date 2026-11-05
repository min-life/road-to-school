# AI Review — Record API compatibility principles
## 1. Task Information
2026-10-29 Asia/Saigon. Documentation. COMPLETED.
## 2. Original Request
Record API-only improvement rules: minimize old payload changes, prefer adding fields, ask PO about uncertain fields, prefer new APIs for new business flows, minimize frontend breakage. Do not implement code.
## 3. Approved Scope
Document principles only. No application implementation authorization.
## 4. Analysis & Decisions
Added section 1.1 to BUSINESS_IMPROVEMENT_TRACKER.md: preserve old contract where possible, additive optional inputs, ask before ambiguous field decisions or unavoidable behavior changes, prefer new endpoints when appropriate. Record validation/status/error/behavior impacts as part of compatibility review. No guarantee inferred from payload shape or typecheck alone. Issue statuses unchanged.
## 5. Implementation Details
Updated tracker section 1.1 and decision log. Archived previous review artifacts, updated LATEST.md and LATEST.diff. No application code changes.
## 6. Database Changes
None; no schema/field/table approval inferred.
## 7. API & Swagger Changes
None; principles for future work only.
## 8. UI/UX Changes
None.
## 9. Verification & Testing
Read current git status/tracker/report; checked documentation diff. No application tests/typecheck for documentation-only change. No DB/API mutation or test records.
## 10. Issues & Risks
Additive fields alone do not ensure behavior compatibility. Ambiguous contracts and unavoidable legacy behavior changes require PO decision before implementation.
## 11. Reviewer Focus
Match explicit PO constraints, preserve issue statuses, avoid inferring approval to code or inventing unresolved field decisions.
## 12. Suggested Next Step
When implementation is requested, prepare the first API improvement contract and frontend impact assessment for PO review.
## 13. Approval Status
Principles recorded by PO instruction. Implementation NOT APPROVED in this task.
