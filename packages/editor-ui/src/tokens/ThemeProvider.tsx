/**
 * `EditorUIThemeProvider` — applies a token override to its subtree by wrapping
 * children in an element carrying the inline custom properties from
 * `createTheme`. Import `@hlang-org/editor-ui/tokens.css` once at the app root
 * for the base tokens; use this provider only to override.
 */

import type { ReactElement, ReactNode, CSSProperties } from 'react';
import { createTheme } from './theme';
import type { ThemeOverride } from './theme';

export interface EditorUIThemeProviderProps {
  readonly theme?: ThemeOverride;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
}

export function EditorUIThemeProvider({
  theme,
  className,
  style,
  children,
}: EditorUIThemeProviderProps): ReactElement {
  const themeStyle = theme ? createTheme(theme) : undefined;
  return (
    <div className={className} style={{ ...themeStyle, ...style }}>
      {children}
    </div>
  );
}
