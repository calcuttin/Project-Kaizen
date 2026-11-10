# Native Apple II playground

Review ID: **REV-2026-11-10-IOS-APPLE-II** · Related: [#56](https://github.com/calcuttin/Project-Kaizen/issues/56).

Codex implemented this follow-up at the maintainer's request. The shelf computer now opens a native BASIC playground. A toolbar shortcut also makes it available when a library has no computer ornament. Decorative artwork stays hidden from accessibility; the computer is a labeled button with a native modal and Done action.

The playground supports the website's demo, HELP, BOOKS/CATALOG, LIST/RUN/NEW, HOME/CLEAR, numbered line editing, PRINT, variables, arithmetic, IF/GOTO and FOR/NEXT. Command recall works through labeled previous/next buttons. Dynamic Type, selectable output, keyboard submit and explicit Send are available. Programs are local to the open window; BOOKS is read-only and no command can mutate library data or execute host code.

Execution is bounded by 1,000 steps, 300 printed lines, 500 program lines, 128 expression tokens/variables, 32 nested loops and 4 KiB strings/output lines. Input is limited to 500 characters; transcript/history retain 400/50 lines. These bounds also stop exponential string growth and deeply nested expressions.

Validation: four BASIC model tests cover the demo, precedence, strings, variables, nested/descending/skipped loops, conditions, line edits, command history, catalog behavior, malformed input, infinite jumps and resource limits. The simulator UI test passed: open terminal, run demo, type/submit arithmetic, recall the command and close to Bookshelf. [Simulator screenshot](apple-ii.png). Project plist lint and `git diff --check` passed. The initial UI test selected a text view instead of SwiftUI’s text field; correcting that test selector passed without an app change.

This is an implementation PR, not a TestFlight release or a full Apple II emulator. Physical VoiceOver/hardware keyboard acceptance remains open in #56/#49. No account, backend schema, signing or hosted recovery changes. **Hosted backup/recovery remains deferred.**
