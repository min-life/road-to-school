# AI Review — Refine school expiry and calendar decisions
## 1. Task Information
2026-11-02 Asia/Saigon. Discussion/documentation. COMPLETED recording; operational exceptions pending.
## 2. Original Request
Expiry only releases resources without changing stored information/routes; relocation cancels plans; preserve completed-trip history; running and return-boarded cases undecided; no makeup on fixed system holidays, allowed on school holidays.
## 3. Approved Scope
Record and explain choices only. No implementation, field/schema/environment decisions or test scripts.
## 4. Analysis & Decisions
School detail section 15 supersedes prior draft-reset/assignment-clearing and system-fixed-holiday override suggestions. Resource release must be logical/date-aware without editing stored assignments/routes. Renewal must recheck availability. COMPLETED preserved; IN_PROGRESS and return SCHEDULED with attendance remain undecided. Proposed differentiated handling for ready/all absent/children boarded and highlighted conflict with immediate account blocking upon school inactivity. Fixed system holiday is hard block; school holiday can be overridden by school makeup request approved by SYSTEM_ADMIN as already required. Nonfixed system holiday precedence and relocation prerequisite still need clarification.
## 5. Implementation Details
Updated school-business-flow-detail.md and tracker; archived previous review artifacts. No application code changes.
## 6. Database Changes
None.
## 7. API & Swagger Changes
None.
## 8. UI/UX Changes
None.
## 9. Verification & Testing
Read git status/current documents; documentation diff check. No script tests, typecheck/build, API/provider/DB calls or data generation. No new runtime claims.
## 10. Issues & Risks
Stored assignments versus effective reservations; source active-plan consumers need eventual date checks. Child responsibility begins with boarding even if Trip still SCHEDULED. Inactive account lock conflicts with completing attendance on retained Trip. Relocation cannot both universally require no DRAFT/ACTIVE and treat cancellation of those plans as always necessary without refining policy.
## 11. Reviewer Focus
Latest PO decisions override previous proposals; unresolved exceptions remain open; preserve history; do not infer blanket override for nonfixed system holidays.
## 12. Suggested Next Step
PO choose running/boarded-trip handling together with account access during school inactivation.
## 13. Approval Status
Business refinements recorded. Operational exceptions and implementation WAITING FOR USER REVIEW / APPROVAL.
