'use client';

import { ThemeProvider as Provider, useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { useMounted } from '@/lib/use-mounted';

/** Light and dark themes as a class on <html>; the system preference is the default. */
export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  return (
    <Provider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </Provider>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <AnimatedThemeToggler
      className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      theme={dark ? 'dark' : 'light'}
      onThemeChange={setTheme}
      aria-label={dark ? 'Switch to the light theme' : 'Switch to the dark theme'}
      title="Switch appearance"
      duration={420}
    />
  );
}
