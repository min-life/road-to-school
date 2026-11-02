# AI Review — Detailed business flow 3.2
## 1. Task Information
2026-10-30 Asia/Saigon. Discussion/source analysis/documentation. COMPLETED analysis; no implementation.
## 2. Original Request
Explain next business section 3.2 in detail.
## 3. Approved Scope
Read school-related source, explain current flows/gaps/decisions. Prior API implementation authorization does not extend to this module. No test scripts or environment edits.
## 4. Analysis & Decisions
Saved school-business-flow-detail.md and linked WF-02. Covered actors, fields/tables, school creation, schedule math/cascade, contract update, location impact/cascade, inactive/reactivate and User distinction, UI sequential save, defense questions. SCH-01..11 pending PO decisions mapped to existing tracker IDs. Confirmed inactive setter only edits School; generator lacks school.isActive filter; schedule touches all SCHEDULED including Ready/past; snapshot stop times not fully synchronized; contract requires no DRAFT/ACTIVE and new start >= today, reason/expectedUpdatedAt unused; location cascade does not distinguish text-only; update-by-ID can conflict with Start; expiry method no caller found; Web sequential calls can partially succeed; name not transmitted in executeSave.
## 5. Implementation Details
Created docs/ai-review/school-business-flow-detail.md, linked tracker, archived previous review/diff and updated review artifacts. No application code changes.
## 6. Database Changes
None. Schema relationships considered, no connection or mutation.
## 7. API & Swagger Changes
None. Existing paths/contracts reviewed from source only; no live API calls or Swagger acceptance claim.
## 8. UI/UX Changes
None. Existing add/edit/status source read to map actions and sequential calls.
## 9. Verification & Testing
Read git status (clean initial working tree), business context/current review and relevant services/DTO/controller/UI references. Documentation diff check. No test scripts, typecheck/build, DB/provider/API calls. Findings are static evidence; runtime NOT_VERIFIED.
## 10. Issues & Risks
SCH-01..11 await policy decisions; no fields/defaults/endpoints/schema chosen as approved. Baseline source findings do not prove all runtime branches. Existing account implementation report preserved in history.
## 11. Reviewer Focus
Inactive versus contract/plan/Trip, effective dates and frozen states, contract renewal continuity, text versus physical relocation, actual stop timing/resource conflicts, partial save visibility and retained historical IDs.
## 12. Suggested Next Step
PO decide SCH-01..11 business policies before API improvement planning for 3.2.
## 13. Approval Status
Analysis completed; proposed policies WAITING FOR USER REVIEW / APPROVAL. No implementation approved for 3.2.
