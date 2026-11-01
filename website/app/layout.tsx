import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { EnterObserver } from '@/components/EnterObserver';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SITE, siteUrl } from '@/lib/site';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `hlang — ${SITE.tagline}`, template: '%s · hlang' },
  description: `${SITE.tagline} ${SITE.taglineDetail}`,
  applicationName: 'hlang',
  openGraph: {
    type: 'website',
    siteName: 'hlang',
    title: `hlang — ${SITE.tagline}`,
    description: SITE.taglineDetail,
  },
  twitter: { card: 'summary_large_image', title: `hlang — ${SITE.tagline}`, description: SITE.taglineDetail },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#08090b' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="min-h-svh bg-ground text-ink">
        <ThemeProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <EnterObserver />
        </ThemeProvider>
      </body>
    </html>
  );
}
