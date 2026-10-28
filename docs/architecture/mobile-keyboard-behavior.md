# Mobile keyboard and focused fields

Scope: Expo Mobile V2, including its React Native Web output. This does not change the independent Web Admin project.

Current UI and onboarding/auth implementation: [mobile-ui-implementation-status.md](mobile-ui-implementation-status.md). Login and Forgot Password explicitly disable autoFocus; Parent Registration does not request automatic focus. Keyboard visibility handling applies after manual focus as well as existing OTP autofocus flows, rather than forcing focus on page entry.

## Implementation

Use `KeyboardScrollView` from `@/components/keyboard-scroll-view` for a vertical area containing inputs, including multiline TextInput (textarea on Web). Preserve existing controlled values, validation, actions and routes. Put layout/padding in `contentContainerStyle` and keep the viewport bounded by its parent. A modal or drawer must own its scroll region; do not rely on the page behind a portal.

- Native: React Native ScrollView adjusts keyboard insets on iOS; Android's existing resize behavior provides the smaller viewport (the installed RN Modal implementation also uses adjustResize). Keyboard frame events, focus, layout and content-size events remeasure the current input and scroll region. Scroll only by the measured overflow. Do not wrap it in another KeyboardAvoidingView.
- Web: the `.web.tsx` implementation measures DOM input/textarea bounds against the intersection of its scroll region and `window.visualViewport` (offsetTop + height), falling back to innerHeight when unavailable. Listen for viewport resize/scroll, focus and content-size changes. Add scrollable space equal to actual bottom occlusion, then remove it when the viewport expands or focus leaves.
- A 12px clearance is a small reading margin, not an assumed keyboard height; it is reduced for very small viewports. Tall multiline editors keep their top visible and use the editor's own caret scrolling.
- Coalesce measurements with requestAnimationFrame, skip movements of at most one pixel, do not continuously force focus during manual scroll, and remove listeners/pending work on unmount. Native measurements use a generation guard against stale focus/layout callbacks.
- The existing six-box registration OTP uses an invisible TextInput. It now fills its visible OTP row, so geometry refers to the actual editing location rather than a one-pixel field at the top of the form.
- The attendance search is inside the roster scroll region, within the existing trip drawer; the QR manual input is inside the modal's own scroll region. Camera/API callbacks are unchanged.

No new package, native configuration, backend, API or data changes.

## Coverage

All 29 TextInputs across 15 current Mobile screen files have a KeyboardScrollView ancestor: five authentication screens; parent linking/OTP and address/information/update OTP forms; leave creation/OTP; settings password/name modals; trip attendance search, absence, QR manual entry, report and explanation modals; incident explanation modal. Read-only selection lists do not need keyboard handling. Future forms/drawers must use the same bounded scroll owner.

## Manual acceptance checklist

Run separately on iPhone Expo, Android Expo/native, Mobile Web Safari iOS and Mobile Web Chrome Android. Bundle/type checks alone are not these checks.

1. Login: focus a visible field; it should stay still unless covered. Open password near the bottom; typed text and visibility toggle remain usable.
2. Long registration/reset forms: open keyboard, move forwards/backwards among fields, manually scroll to the last field and submit area. Verify values survive scrolling and keyboard dismissal.
3. Settings password modal: focus current/new/confirmation in both directions; scroll to action buttons with keyboard open. Dismiss without submitting; no credentials need to be changed for this check.
4. Trip absence/report/explanation and incident explanation: check multiline input and bottom actions; close without sending. Check attendance search in drawer and manual QR field without scanning/submitting.
5. OTP: verify visible boxes and active input stay together. Do not request/send/verify an OTP merely for UI testing without appropriate authorization.
6. Change keyboard language/suggestion-bar height, rotate where the app permits it, test larger system text and repeatedly open/close the keyboard. No leftover compensation or unintended value resets.
7. Mobile Web: repeat near the bottom and inside modal, including browser toolbar expansion/collapse. Record device, OS/browser version and actual result.

Current session: Windows development machine, Node v24.19.0; typecheck, geometry unit tests and iOS/Android/Web exports can run. No connected iPhone/Android emulator or Safari/Chrome browser surface is exposed to CUA; physical keyboard behavior remains NOT_VERIFIED. Existing data/authorized accounts are needed to reach protected forms; do not create business records or submit mutations to manufacture a passing result.

## References

- [React Native ScrollView](https://reactnative.dev/docs/scrollview): automaticallyAdjustKeyboardInsets and keyboardShouldPersistTaps.
- [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport): distinction between visual and layout viewport, offset and resize/scroll events.
