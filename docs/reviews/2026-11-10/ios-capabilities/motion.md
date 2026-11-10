# Native shelf motion and final capability validation

Review ID: **REV-2026-11-10-IOS-MOTION** · Related: [#56](https://github.com/calcuttin/Project-Kaizen/issues/56). Depends on imports/undo [#62](https://github.com/calcuttin/Project-Kaizen/pull/62).

Codex added the remaining shelf interaction at the maintainer’s request. The solar system uses the existing web orbit disk and base artwork, with a slow rotation and an accessible play/pause control. Cabinet lighting has a subtle ambient pulse. Preferences has an Ambient shelf motion switch, stored on this device like the website’s local atmosphere preference.

Motion is permitted only while the preference is enabled, Reduce Motion is off, the app is active and the shelf view is present. The timeline pauses when any of those conditions changes. The solar system keeps its accumulated angle while paused/backgrounded and resumes without jumping ahead. Decorative layers stay hidden from accessibility. System Reduce Motion always wins over a saved motion preference.

The UI-test-only reduced-motion fixture injects the policy input in Debug; Apple’s environment value itself is read-only. It is not evidence of testing the actual iOS Settings toggle or physical VoiceOver. Ordinary UI regressions disable ambient motion through launch arguments for deterministic screenshots. No fixture or animation setting changes a personal library or cloud record.

Validation: the combined native run passed **51 model tests and 13 simulator UI tests**. A separate active solar-system play/pause/resume flow also passed, giving **14 distinct UI flows** across the final run and targeted playback test. Unit checks exercise all four motion gates and clock freeze/resume behavior. The simulator checks the reduced-motion message and disabled, still solar-system control. [Active solar-system screenshot](solar-system.png) and [visible reduced-motion control](reduced-motion.png) were inspected; the orbit disk sits on the existing web base artwork.

Unsigned generic-iPhone **Release 0.1.0 (5)** compilation passed. The Release executable was checked for all ISBN/import/reduced-motion fixture markers; none is present. Project plist lint, relative documentation links and `git diff --check` passed. GitHub’s web/database/Vercel checks are separate from these local Swift tests; the repository CI does not compile the native target.

Review/merge order: **#59 Apple II → #60 shelves → #61 reading/account tools → #62 imports/undo → this motion PR**. The complete source capability matrix now has implementations under review; live feature sync, external Files providers, physical camera/VoiceOver/hardware-keyboard acceptance and the pre-existing Apple II sprite checkerboard cleanup remain open. The source is prepared as **0.1.0 (5)**. No new TestFlight build has been uploaded in this implementation pass; build 4 remains the current tester release.

Apple references: [TimelineView](https://developer.apple.com/documentation/swiftui/timelineview) · [Reduce Motion](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion). **Hosted backup/recovery remains deferred.**
