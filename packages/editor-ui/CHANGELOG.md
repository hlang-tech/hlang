# @hlang-org/editor-ui

## 0.3.0

### Minor Changes

- 75c24cb: - `NodeSearchTriggers` handlers declare only what they read (`PointerPosition`, `TouchPositions`, `ConnectionEnd`, exported), so React Flow's events fit them and they can be called with plain data. `connectableCandidates` takes any validator with `canLink`.
  - The outline thumbnail, the edge role label, and the node search are typed without assertions.

### Patch Changes

- 6576790: - The live signal store notifies once per frame however many signals arrive in it. It used to notify synchronously on every signal once its frame loop was running, which cost a pass over every subscriber per message on a busy stream.
  - `TokenName` names every token `tokens.css` declares: the glass, warning, activity, and cost tokens were missing, so `createTheme` could not override them.
- Updated dependencies [75c24cb]
- Updated dependencies [75c24cb]
- Updated dependencies [2088608]
  - @hlang-org/editor-core@0.2.0
  - @hlang-org/editor-react@0.1.2
  - @hlang-org/interpreter@2.0.0

## 0.2.2

### Patch Changes

- 5715ba8: The editor shell isolates its stacking context, so the editor's own layers (panels, dock, cheatsheet) never paint above the host page's layers, such as a sticky header the editor scrolls under.

## 0.2.1

### Patch Changes

- b0d4392: Overlays belong to the editor, not the page:
  
  - `Cheatsheet` is positioned against the canvas region instead of the window, so an editor embedded in a larger page covers only itself.
  - The `ToastProvider` stack is positioned against the provider's nearest positioned ancestor instead of the window. A full-window editor looks the same; an embedded editor shows its toasts inside itself.
  - `Cheatsheet` rows are keyed by their keys and label together, so two bindings for one action (such as the two ways to pan) no longer trigger React's duplicate-key warning.

## 0.2.0

### Minor Changes

- bfe9c97: `useEditorHotkeys` accepts an optional `scope`. When the editor is embedded in a
  larger page, pass a ref to the editor's root element: shortcuts then fire only
  for keystrokes from inside it, so copying page text or pressing Backspace in a
  page control is left to the page. Without `scope`, behavior is unchanged.
  
  The canvas dock adapts to the width of the canvas: on a narrow canvas (a phone,
  or an editor embedded in a page column) it uses tighter spacing, and below
  400px the zoom readout is its one fit-view control.
  
  A pill node can be selected and dragged by its name. The name covers most of
  the capsule, but it used to stop the click from reaching React Flow and opted
  out of dragging, so pressing on it neither selected nor moved the node.
  Double-clicking the name still renames the node.
  
  The tertiary text token `--hl-ink-3` is lighter (`#80858f`), so hints, counts
  and inactive tabs reach a 4.5:1 contrast ratio on every editor surface.

## 0.1.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/interpreter@1.0.1
  - @hlang-org/editor-core@0.1.1
  - @hlang-org/editor-react@0.1.1
