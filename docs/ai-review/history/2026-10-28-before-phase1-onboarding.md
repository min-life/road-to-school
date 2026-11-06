# AI Review — Version 1 UI reference and Version 2 transfer plan

## 1. Task Information
Date: 2026-10-28 (Asia/Saigon). Project scope: Web / Mobile / Documentation; API read-only reference. Task type: Analysis / Design planning. Mode: PLANNING. Status: WAITING_APPROVAL (requested audit and plan completed; UI implementation not started).

## 2. Original Request
Continue the existing version 2 session, read version 1 at C:\dongnnp\study-work\code\he-thong-giam-sat-xe-dua-don-hoc-sinh only as a UI reference, use version 2 docs for architecture/code rules, retain completed API/business behavior, verify folder access, compare versions and report a plan before code changes. No commit or push.
Follow-up: explain whether images from V1 can be brought into V2 and how. This is a feasibility/method discussion, not an instruction to copy assets yet.

## 3. Approved Scope
Approved: read-only source/reference inspection, comparison and documentation of a proposed UI transfer. NOT APPROVED: UI implementation, backend/schema/migration changes, new packages, business-data mutation, copying assets or modifying version 1. Prior database-task limits applied to that task; current request authorizes planning documentation under repository working rules.

## 4. Analysis & Decisions
Detailed evidence, comparison, screen mapping, proposed wireframes, implementation batches and acceptance criteria: [v1-ui-transfer-plan.md](v1-ui-transfer-plan.md).
- Version 1 exists and Web/Mobile files are readable. It contains be/web/mobile. Version 1 backend code was not used as an implementation reference.
- Version 2 remains the only implementation target, with independent api/web/mobile projects and current npm dependencies.
- V1 source uses a navy sidebar, yellow active navigation, multi-panel dashboard, expanded/compact Mobile headers and child/trip cards. V2 already implements role-aware screens and business integrations. Transfer presentation patterns into V2 components instead of importing V1 providers/stores/API logic.
- Technical differences: V1 Web Next 16.3.5 + shadcn/Radix/Zustand vs V2 Next 16.4.2 with existing components; V1 Mobile Expo 57/RN0.86.3 + Gluestack/NativeWind vs V2 Expo58/RN0.88.0 with StyleSheet/context/hooks. Do not copy package configs or downgrade.
- Some V1 Driver UI references mock/demo state; reports/calendar/Google login/map providers and V1 metric definitions are not automatically V2 scope.
- Retain V2 brand tokens, roles, RoutePlan workflow, polling/stale-response guards, trip operations, privacy masking, notifications, map/controller and server-provided capabilities. Navy sidebar is only a proposed secondary token pending review.
- Historical docs contain outdated implementation snapshots. Source and latest approved decisions take precedence; no attempt to reimplement completed API functionality.
- Asset follow-up: read-only inventory found 26 image files in V1 web/public and 63 in mobile/assets, including PNG/JPG/SVG. Transfer plan section 10 explains selective copying, target directories, reference paths, checksum checks and format support. V1 Mobile ParentAssets uses react-native-svg; V2 does not declare that dependency, so native SVG integration needs an explicit implementation choice. No assets copied.

## 5. Implementation Details
No application code changes.
Documentation only:
- Added docs/ai-review/v1-ui-transfer-plan.md: source-based comparison, representative screen mapping, three structural wireframes, six proposed batches and verification gates.
- Follow-up updated the plan with the asset inventory and transfer method; updated this report. Still no application code or asset changes.
- Updated docs/ai-review/LATEST.md and marked LATEST.diff as no code changes.
- Preserved previous uncommitted review artifacts in history/2026-10-28-before-v1-ui-transfer.md and .diff. Existing history/2026-10-28-dependency-installation.md retained unchanged.
No V1 file edits, app builds, package installs or copied assets. No V2 source/config edits.

## 6. Database Changes
None. No query, migration, seed or account/data changes in this planning task. Existing account/database decisions from the session are retained; credentials are not included in documents.

## 7. API & Swagger Changes
None. Completed V2 API/auth/business rules are protected. Live Swagger/runtime verification not repeated; static checks are not certification of runtime behavior.

## 8. UI/UX Changes
No implemented screen changes. Proposed wireframes cover Web shell/dashboard, Mobile Parent home and role-aware trip detail. Screen groups mapped for both admin roles and three mobile roles. All wireframes, asset/font decisions and implementation batches remain WAITING FOR USER REVIEW / APPROVAL. The plan uses concise labels, existing V2 data/permissions and safe map/notification integration.

## 9. Verification & Testing
PASS: V1 directory exists and representative manifests/CSS/theme/layout/screen files read successfully. git status --short in V1 returned no changes; checked again at task end.
PASS: Mandatory V2 working rules, business context, master handoff, current state and previous LATEST read in sequence; relevant architecture/wireframe/business documents and prior source UX review consulted. Web-local AGENTS read; no Next.js application code written.
PASS: node node_modules/typescript/bin/tsc --noEmit --incremental false in api (exit 0), web (exit 0), mobile (exit 0). Baseline only; proposed UI has not been implemented or tested.
PASS: V2 application-source/config diff remains empty; final diff/status reviewed for documentation-only scope and whitespace.
PASS: Asset inventory and V1 ParentAssets/hero reference inspection completed read-only; V2 already has web/public and mobile/assets/images for the proposed paths. No copy/conversion/rendering performed.
NOT_VERIFIED: Actual V1/V2 rendered comparison, pixel fidelity, full screen inventory, browser/device interactions, accessibility measurements and business UAT. No applications started or login/mutation requests made for this task.
Skill: ui-ux-pro-max loaded for review. Existing pgAdmin-bundled Python 3.13.14 used; no Python/package installation. Initial direct CLI invocation could not import core because of embedded Python search paths; process-local sys.path fixed execution. Searches returned off-topic/version-mismatched guidance, so no verified match was adopted for navigation/polling/native safe-area implementation. Plan relies on V2 rules, inspected source and the skill checklist; raw search output not persisted as design authority.

## 10. Issues & Risks
- Findings are source-based, not runtime screenshots or proof of production acceptance.
- Copying V1 whole pages would import different API/state/dependencies and, in some screens, demo data. Reimplement only approved presentation within V2.
- Old wireframes/handoff contain historical role/menu/feature assumptions; preserve current source and PO decisions rather than copying old permissions.
- Parent privacy, RoutePlan approval, snapshots, trip gating and polling/map lifecycle need explicit regression review during later UI batches.
- Asset rights/branding/font choice and proposed navy sidebar remain unapproved; no asset copied.
- Runtime UAT requiring new data or mutations remains NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY unless PO supplies the specific data/authorization. The plan does not infer permission to generate records.

## 11. Reviewer Focus
Review the V1-to-V2 mapping and presentation-only boundary. Confirm preservation of all five roles, API contracts, completed features, notification meaning, map providers/controllers and actual metrics. Confirm wireframes are proposals, no new dependencies are required and V1 remains untouched. Check that uncommitted prior reports are archived rather than discarded.

## 12. Suggested Next Step
PO reviews the transfer plan and first-batch wireframes before selecting a concrete UI implementation scope.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL of plan and wireframes. No automatic implementation, next batch, commit or push.
