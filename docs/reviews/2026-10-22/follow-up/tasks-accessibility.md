# Task states and accessibility — issues #4 and #8

AI-assisted follow-up, 2026-10-22, based on main `9545fe1`.

- Empty Tasks distinguishes a new workspace, an empty project/lens filter (with Clear filters), and completed work (with Show completed), in both List and Board.
- Board task cards are native buttons. Enter/Space opens the editor, whose labeled Status control provides a non-drag alternative. After moving a task between columns, closing the editor focuses its new card.
- Habit controls have full weekday/date labels, 40px targets, pressed state and a visible checkmark. They wrap at narrow widths. Existing project filter buttons retain selected-state semantics.
- Faint text and completed-habit text had measured contrast failures. Tokens now provide at least 4.5:1 for secondary text on the three opaque theme backgrounds and for completed-habit labels. This does not claim contrast compliance for every layered/transparent surface in the app.

## Verification

Four new Chromium regressions pass: empty/filter/completed/reopen flows across both views; keyboard board opening/status/focus; labeled habit toggling and 320px reflow; and dark/light contrast measurements. Seven existing task/project/review regressions also passed. Type check and production build pass (existing large-chunk warning remains).

The 320 CSS-pixel layout exercises reflow equivalent to a 1280px page at 400% zoom; it is not a physical-device touch or operating-system screen-reader session. Labels and states are asserted through the browser accessibility API. A full manual screen-reader audit remains outside this evidence. #4 is ready for acceptance; #8 has implementation and automated evidence with that manual verification boundary.
