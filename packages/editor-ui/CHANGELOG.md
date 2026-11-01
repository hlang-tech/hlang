# @hlang-org/editor-ui

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
