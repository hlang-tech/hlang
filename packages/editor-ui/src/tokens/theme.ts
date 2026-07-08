/**
 * Theming: a host overrides any subset of tokens by producing a CSS-variable
 * style object with `createTheme(...)` and applying it (via
 * `EditorUIThemeProvider` or directly on a wrapper element). Zero-runtime and
 * SSR-safe — it is just inline custom properties.
 */

import type { CSSProperties } from 'react';
import type { TokenName } from './tokens';

/**
 * A partial override map from token name to CSS value. Values may be
 * `undefined` (treated as "not overridden") so callers can pass conditional
 * overrides without pre-filtering.
 */
export type ThemeOverride = Partial<Record<TokenName, string | undefined>>;

/**
 * Build a style object that overrides the given tokens as inline custom
 * properties. Apply it to a wrapping element to re-theme everything beneath.
 *
 * ```ts
 * <div style={createTheme({ 'hl-silver': '#d8dce4' })}> … </div>
 * ```
 */
export function createTheme(overrides: ThemeOverride): CSSProperties {
  // CSS custom properties are typed via an index signature on CSSProperties,
  // so a plain string map of `--*` keys is structurally a CSSProperties.
  const style: CSSProperties & Record<`--${string}`, string> = {};
  for (const [name, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      style[`--${name}`] = value;
    }
  }
  return style;
}
