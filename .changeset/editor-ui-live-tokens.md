---
'@hlang-org/editor-ui': patch
---

- The live signal store notifies once per frame however many signals arrive in it. It used to notify synchronously on every signal once its frame loop was running, which cost a pass over every subscriber per message on a busy stream.
- `TokenName` names every token `tokens.css` declares: the glass, warning, activity, and cost tokens were missing, so `createTheme` could not override them.
