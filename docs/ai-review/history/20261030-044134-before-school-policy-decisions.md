# AI Review — Expand SCH-01..11 decision explanations
## 1. Task Information
2026-10-30 Asia/Saigon. Discussion/documentation. COMPLETED explanation; policy decisions pending.
## 2. Original Request
Apply detailed issue format to all eleven school business decisions: current behavior, concrete scenario, impact, options/tradeoffs, recommendation and explicit PO decision.
## 3. Approved Scope
Expand existing analysis in chat and document only. No code, tests, API calls, DB, environment changes or approval inferred.
## 4. Analysis & Decisions
Added full SCH-01..11 sections to school-business-flow-detail.md with consistent six-part structure and A/B choices. Recommendations are proposals, not PO decisions. Distinguishes inactive service stopping, extension versus new term, date exceptions, effective dates/frozen Trips, school-time buffers, textual address versus relocation, resource conflicts, expiry/reactivation, partial save, running-trip preservation and request workflow scope. Links to original B/P IDs remain unchanged.
## 5. Implementation Details
Expanded school-business-flow-detail.md; archived previous LATEST artifacts and refreshed report/diff. No application code changes.
## 6. Database Changes
None. No new field/table design selected.
## 7. API & Swagger Changes
None. Future separate/combined APIs discussed as options only.
## 8. UI/UX Changes
None. Explained current sequential-save behavior and API-only limits.
## 9. Verification & Testing
Read current git status and school analysis/report, preserving pre-existing documentation edits. Documentation diff check. No scripts/tests/typecheck/build/API/provider/DB calls. Source observations inherited from immediately preceding source review, not a new runtime audit.
## 10. Issues & Risks
All SCH choices remain NEEDS_DECISION. Examples are explanatory only. Recommendations do not authorize deployment, schema/contract changes or FE work. Emergency handling and frozen Trips require consistent PO choices across SCH-01/04/10.
## 11. Reviewer Focus
Clear distinction between observed behavior and proposed policy; no silent field defaults; options consistent across related decisions; no claim API-only updates fix existing UI.
## 12. Suggested Next Step
PO respond by SCH ID with preferred option and exceptions.
## 13. Approval Status
Detailed explanations complete; policies and implementation WAITING FOR USER REVIEW / APPROVAL.
