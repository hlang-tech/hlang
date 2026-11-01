/**
 * Per-type node icons. A small registry mapping a node `code` to a crisp
 * line-glyph (1.5px stroke, currentColor), with a kind fallback (R/T/W). Used
 * by the outline tree and the node chrome so every node reads by its ROLE, not
 * a generic letter — the difference between a tool and a spreadsheet.
 *
 * Icons are inline SVG (not emoji) for a premium, monochrome, scalable look;
 * they inherit `color` so callers tint them by kind or silver.
 */

import type { ReactElement } from 'react';
import type { NodeKind } from '@hlang-org/editor-core';

interface IconProps {
  readonly size?: number;
}

/** Common svg wrapper: currentColor stroke, no fill, round joins. */
function svg(size: number, children: ReactElement | readonly ReactElement[]): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Icon builders keyed by node code. */
const BY_CODE: Record<string, (s: number) => ReactElement> = {
  'image-source': s => svg(s, [
    <rect key="r" x="3" y="4" width="18" height="16" rx="2.5" />,
    <circle key="c" cx="8.5" cy="9" r="1.6" />,
    <path key="p" d="M4 17l5-5 4 4 3-2 4 4" />,
  ]),
  'text-source': s => svg(s, [<path key="p" d="M5 6h14M12 6v12M9 18h6" />]),
  'interval-source': s => svg(s, [
    <circle key="c" cx="12" cy="12" r="8" />,
    <path key="h" d="M12 8v4l3 2" />,
  ]),
  'range-source': s => svg(s, [
    <path key="l" d="M4 12h16" />,
    <circle key="a" cx="6" cy="12" r="2" />,
    <circle key="b" cx="18" cy="12" r="2" />,
  ]),
  'constant-source': s => svg(s, [<path key="p" d="M6 12h12M9 8l-3 4 3 4M15 8l3 4-3 4" />]),
  'map-scale': s => svg(s, [
    <path key="a" d="M4 20V8l8-4" />,
    <path key="b" d="M4 8l8 4 8-4M12 12v8" />,
  ]),
  uppercase: s => svg(s, [<path key="p" d="M5 18L9 6l4 12M6.5 14h5M15 10v8M15 10c3 0 3 4 0 4" />]),
  'filter-threshold': s => svg(s, [<path key="p" d="M4 5h16l-6 7v6l-4-2v-4z" />]),
  'scan-sum': s => svg(s, [<path key="p" d="M17 6H7l6 6-6 6h10" />]),
  delay: s => svg(s, [
    <circle key="c" cx="12" cy="13" r="7" />,
    <path key="h" d="M12 10v3l2 2M9 3h6" />,
  ]),
  merge: s => svg(s, [<path key="p" d="M6 5v4c0 3 3 3 6 3s6 0 6-3V5M12 12v7" />]),
  'console-sink': s => svg(s, [
    <rect key="r" x="4" y="5" width="16" height="12" rx="2" />,
    <path key="p" d="M8 10l2.5 2L8 14M13 14h3" />,
  ]),
  'collect-sink': s => svg(s, [
    <path key="p" d="M4 7h16M4 12h16M4 17h10" />,
  ]),
};

/** Fallback glyph per kind when a code has no specific icon. */
const BY_KIND: Record<NodeKind, (s: number) => ReactElement> = {
  R: s => svg(s, [<path key="p" d="M8 5l10 7-10 7z" />]), // source ▷ (play)
  T: s => svg(s, [<path key="p" d="M4 8h6l4 8h6M14 8h6M4 16h6" />]), // transform
  W: s => svg(s, [
    <path key="p" d="M5 4h11l3 3v13H5z" />,
    <path key="q" d="M9 4v5h6" />,
  ]), // sink (save)
};

export interface NodeIconProps extends IconProps {
  readonly code: string;
  readonly kind: NodeKind;
}

/** Render the icon for a node, by code (then kind fallback). */
export function NodeIcon({ code, kind, size = 15 }: NodeIconProps): ReactElement {
  const build = BY_CODE[code] ?? BY_KIND[kind];
  return build(size);
}

// ---------------------------------------------------------------------------
// Control glyphs — crisp line icons for the outline's visible/lock affordances.
// Kept in the same registry so every glyph shares one stroke language. Unlike
// emoji, these stay legible at small sizes and against dark/dim rows.
// ---------------------------------------------------------------------------

/** Open eye — layer visible. */
export function EyeIcon({ size = 14 }: IconProps): ReactElement {
  return svg(size, [
    <path key="p" d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />,
    <circle key="c" cx="12" cy="12" r="2.6" />,
  ]);
}

/** Eye with a slash — layer hidden. Always reads clearly, even on a dim row. */
export function EyeOffIcon({ size = 14 }: IconProps): ReactElement {
  return svg(size, [
    <path key="p" d="M2 12s3.5-6.5 10-6.5c1.7 0 3.2.45 4.5 1.1M22 12s-3.5 6.5-10 6.5c-1.7 0-3.2-.45-4.5-1.1" />,
    <path key="e" d="M9.9 9.9a2.6 2.6 0 003.7 3.7" />,
    <path key="s" d="M3 3l18 18" />,
  ]);
}

/** Open padlock — layer unlocked (editable). */
export function UnlockIcon({ size = 14 }: IconProps): ReactElement {
  return svg(size, [
    <rect key="r" x="5" y="11" width="14" height="9" rx="2" />,
    <path key="s" d="M8 11V7a4 4 0 017.9-1" />,
  ]);
}

/** Closed padlock — layer locked (pinned, not draggable). */
export function LockIcon({ size = 14 }: IconProps): ReactElement {
  return svg(size, [
    <rect key="r" x="5" y="11" width="14" height="9" rx="2" />,
    <path key="s" d="M8 11V7a4 4 0 018 0v4" />,
  ]);
}

/** Warning triangle — a predictive edit-time diagnostic. */
export function WarningIcon({ size = 13 }: IconProps): ReactElement {
  return svg(size, [
    <path key="t" d="M12 4l9 15H3z" />,
    <path key="b" d="M12 10v4" />,
    <path key="d" d="M12 17v.5" />,
  ]);
}

/** Error circle — a hard, runtime-fatal edit-time diagnostic. */
export function ErrorIcon({ size = 13 }: IconProps): ReactElement {
  return svg(size, [
    <circle key="c" cx="12" cy="12" r="9" />,
    <path key="b" d="M12 7v6" />,
    <path key="d" d="M12 16v.5" />,
  ]);
}
