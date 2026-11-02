---
"@hlang-org/editor-ui": minor
---

Moving data is now shown by light, not by a hue: `--hl-spark` is a silver-white (`#f7f9fc`), brighter than any resting silver, in place of the blue (`#a7c7ff`). Live edges, node glows and the live pulse follow it. Override `--hl-spark` (or use `createTheme`) to keep a coloured spark. The inspector's stylesheet now documents how to stack it in a larger scrolling column (`height: auto; overflow: visible`), so the column scrolls under the pointer.
