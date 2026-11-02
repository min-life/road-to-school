# AI Review — Plan school API improvements 3.2
## 1. Task Information
2026-11-02 Asia/Saigon. API/DB planning and documentation. Plan drafted, WAITING_APPROVAL; no implementation.
## 2. Original Request
Prepare an implementation plan for section 3.2 using the latest PO decisions.
## 3. Approved Scope
Read source/context and write a concrete phased plan. No authorization for new tables/fields, code, migration, env, dependencies or tests inferred.
## 4. Analysis & Decisions
Created school-api-improvement-plan.md: P1 persistence/shared date policy, P2 scheduled inactivation/account scopes, P3 renewal/expiry cancellation, P4 effective schedules/holiday/makeup, P5 scheduled relocation, P6 admin Trip finalization. Latest expiry cancellation supersedes preserved-status/draft ideas. Proposed two focused models SchoolScheduledChange and ServiceCalendarEntry plus nullable Trip admin audit, all awaiting explicit approval before field schema/DDL. Existing payloads preserved; legacy status/schedule/location lack effective-date fields and require PO transition decision. Read-only Parent policy per child/school, stale cron checks, projected schedules versus persisted generation, exact-once lifecycle retry, resource reservations versus actual ongoing Trip busy, calendar precedence/lunar edge cases, and admin closure all included. D1-D8 clearly pending; no field/default chosen as approved.
## 5. Implementation Details
Created school API plan, linked tracker, archived LATEST artifacts and updated review/diff. No application code changes.
## 6. Database Changes
None performed. Proposed models/relations/audit and nullable/default/index constraints require PO review; no table/field/migration authorization inferred. No backfill/seed or DB connection.
## 7. API & Swagger Changes
None implemented. Proposed endpoint inventory lists actors, intended inputs/outputs, errors and compatibility limits. Final DTO/field/status approval remains required. Swagger read-only verification and docs-only startup alternative planned for implementation, not claimed run.
## 8. UI/UX Changes
None. No UI/wireframe changes; new APIs require subsequent FE integration, not automatic UI support.
## 9. Verification & Testing
Read git status, mandatory document context excerpts/current review and latest school decision sections, system settings/schema, cron generation, auth guard and resource availability source. Documentation diff check only. No test scripts/typecheck/build, API/provider/DB calls or environment changes. Prior source findings are not runtime acceptance. Future checks explicitly exclude all test scripts by PO instruction.
## 10. Issues & Risks
Pending admin roles/final states/attendance restrictions; lunar calendar rules/library; nonfixed system holiday versus makeup; relocation no-draft prerequisite versus cascade; old payload missing date; reactivation/session and school-expired auth semantics; holiday cancellation/recovery; resource busy for unresolved Trips. Approved business direction does not approve ambiguous fields/schema or break old clients silently.
## 11. Reviewer Focus
Latest policy precedence, minimal approved persistence, plan dependency completeness, no new feature commitments, actual versus projected calendar consistency, restart/date correctness, preserved completed history, legacy FE behavior transparency and no tests.
## 12. Suggested Next Step
PO review D1-D8 and approve persistence/contract directions before detailed schema/DTO implementation approval.
## 13. Approval Status
Planning deliverable completed. Specific policy/contract/schema and implementation WAITING FOR USER REVIEW / APPROVAL.
