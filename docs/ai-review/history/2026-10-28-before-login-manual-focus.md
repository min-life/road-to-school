# AI Review — Mobile keyboard and focused-input visibility

## 1. Task Information
2026-10-28. Mobile / Documentation. IMPLEMENTATION. Status: COMPLETED for source integration and safe checks; native/browser keyboard acceptance NOT_VERIFIED. Branch dongnnp/mobile/refactor-ui. No commit/push.

## 2. Original Request
Keep focused Mobile fields above the keyboard with a small gap. Cover inputs/textarea in pages, modals and drawers; avoid unnecessary movement or fixed keyboard offsets, support long forms and focus changes, remove compensation on dismissal and preserve text. Check Safari iOS/Chrome Android where possible and explicitly report unverified environments.

## 3. Approved Scope
Shared keyboard behavior across existing Expo Mobile V2 input surfaces, including its React Native Web output, and documentation of the new UX rule. No independent Web Admin, backend, API, auth/business logic, DB or new packages. Prior uncommitted Login styling/image and review/history preserved; task delta uses a task-start snapshot so earlier styling is not included again.

## 4. Analysis & Decisions
Mandatory docs read in order; actual Mobile inputs, existing KAVs, modal/drawer layout, app config and installed RN ScrollView/Keyboard/Modal implementation inspected. Existing handling was inconsistent: some forms used KAV without focus scrolling, some OTP forms were not scrollable, and several input modals lacked keyboard handling.
Chosen shared KeyboardScrollView with native and Web variants, preserving current architecture/dependencies. Native iOS uses automatic keyboard insets; Android uses existing resize behavior (installed RN Modal explicitly uses adjustResize). Measured input/scroll bounds and keyboard events drive minimal scrolling. Web measures VisualViewport intersection and actual occlusion instead of assuming keyboard height. The 12px margin is reading clearance, reduced for tiny viewports, not a keyboard-sized fixed push.
Implementation structure announced before changes. This is an explicitly requested interaction fix; no new screen or substantial visual wireframe introduced. ui-ux-pro-max existing guidance consulted for keyboard visibility and controlled inputs, with installed code/types used for version-specific checks.
References: https://reactnative.dev/docs/scrollview and https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport.

## 5. Implementation Details
New files:
- mobile/components/keyboard-scroll-view.tsx: keyboard/frame/focus/layout/content-size handling, measured minimal scroll, automatic iOS insets, small temporary clearance, stale-callback guard and listener cleanup.
- mobile/components/keyboard-scroll-view.web.tsx: DOM input/textarea ownership, VisualViewport resize/scroll, measured bottom compensation, focus/content-size updates and cleanup; no browser globals accessed during server render.
- mobile/utils/keyboard-visibility.ts: pure rectangle visibility calculation.
- mobile/scripts/keyboard-visibility.test.ts: eight isolated geometry tests without DB or fake business records.
- docs/architecture/mobile-keyboard-behavior.md: implementation, coverage and manual acceptance checklist.
Modified 15 existing screen files:
- mobile/app/(auth)/login.tsx, register.tsx, verify-otp.tsx, forgot-password.tsx, reset-password.tsx.
- mobile/app/(tabs)/settings.tsx (password/name modals).
- mobile/app/parent/link-student.tsx, verify-otp.tsx; parent/create-request/verify-otp.tsx, address/[studentId].tsx and information/[studentId].tsx.
- mobile/app/leave-notices/create.tsx and otp.tsx.
- mobile/app/trip/[id].tsx (attendance search in drawer, absence, QR manual entry, report and explanation modals).
- mobile/app/incidents/[id].tsx (explanation modal).
Replaced conflicting KAV padding around managed areas to avoid duplicate compensation. Each input modal owns its bounded scroll region. Added scrolling to previously static OTP content; moved invisible registration OTP input over its visible row so measurements refer to the displayed boxes. Attendance search now scrolls with the roster rather than remaining outside its scrolling area. Existing camera/API callbacks and input bindings are preserved.
Updated docs/WORKING_RULES.md section 3.5. Archived prior review in history/2026-10-28-before-mobile-keyboard.* and updated LATEST.md/diff. No assets or package/config changes in this task.

## 6. Database Changes
None. No DB access, seed, test business data, mutations, OTP requests or login submissions.

## 7. API & Swagger Changes
None; Swagger verification not applicable. Existing handlers, API services and permissions unchanged.

## 8. UI/UX Changes
All 29 current TextInputs across 15 screen files have a KeyboardScrollView ancestor. Multiline fields are covered; Web renders these as textarea. Modals do not rely on scrolling the page behind them. Current trip drawer search and manual QR input are covered. No new actions, UI copy or form fields added. Existing controlled state is retained when keyboard geometry changes; no remount keys introduced. Wireframe: interaction correction only, no new structure requiring separate approval. Rendered result WAITING FOR USER REVIEW / APPROVAL.

## 9. Verification & Testing
PASS: Mobile TypeScript, node node_modules/typescript/bin/tsc --noEmit --incremental false, including native and Web components.
PASS: node --experimental-strip-types --test scripts/keyboard-visibility.test.ts: 8/8. Cases cover no movement for visible fields, exact bottom obstruction, backward focus, modal bounds, Safari-style panned coordinates, expanded viewport after dismissal, tall/small areas and collapsed bounds. Geometry tests are not real device tests.
PASS: AST audit against task-start snapshot: 29 TextInputs in 15 files have a managed scroll owner; value/onChangeText/secureTextEntry/editable/maxLength/autoFocus/ref bindings unchanged. Read-only inspection; no API calls.
PASS: Final Expo export --platform all: iOS 1,763 modules, Android 1,767 modules, Web 1,402 modules and server bundle 1,430 modules. Output outside repository in OS temp directory. This proves bundling only.
PASS: git diff --check and scope review; earlier Login styling preserved. No backend/Web Admin/dependency/native configuration edits.
NOT_VERIFIED: Expo iPhone physical keyboard, Android native keyboard, Safari iOS and Chrome Android, real modal/drawer focus switching, keyboard suggestion-bar changes, larger text, caret behavior and close/reopen whitespace. CUA inventory only exposes MCP Apps with no tabs or native apps; no phone/emulator/Safari/Chrome control is available. No unsupported automation used to bypass this limitation.
Protected-form UAT requiring records/session: not performed; no mutation permitted merely to create verification evidence. Checklist supports dismissal without sending requests or changing credentials.
Tool issues resolved: first shared-component refs used an obsolete ScrollView instance type; changed to React.ComponentRef<typeof ScrollView> and typecheck passed. One audit retry ran from mobile instead of repository root; rerun from root passed. Nonblocking Node MODULE_TYPELESS_PACKAGE_JSON and Expo NO_COLOR/FORCE_COLOR warnings remain; no config altered merely to silence them.

## 10. Issues & Risks
Real keyboard behavior remains outstanding despite type/bundle/geometry checks. Android Expo Go/standalone and iOS/browser layout/animation behavior can differ. Floating keyboards, hardware keyboards, selection/caret movement in very tall multiline editors and browser zoom need device acceptance. Existing modal safe-area/layout styling retained; this is not a full redesign of those screens. Future input surfaces must use the same bounded owner per Working Rules 3.5.

## 11. Reviewer Focus
Check small-screen final fields, long-form forward/backward focus, modal actions with keyboard open, absence/incident textareas, OTP visible row, QR manual field/camera layout and attendance drawer. Check manual scrolling is not forcibly reversed; closing keyboard removes insets/compensation without losing text. Confirm no double KAV handling or auth/API/business changes.

## 12. Suggested Next Step
Run the documented manual checklist on the user's iPhone in Expo, starting with Login, long registration and the settings password modal without submitting changes.

## 13. Approval Status
Interaction implementation explicitly requested by PO. WAITING FOR USER REVIEW / APPROVAL of device behavior. Work remains local; no commit/push in this task.
