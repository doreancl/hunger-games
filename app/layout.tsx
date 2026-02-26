import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ThemeHeader } from '@/app/components/theme-header';
import './theme.css';

export const metadata: Metadata = {
  title: 'Hunger Games Simulator',
  description: 'Web-based simulation MVP'
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const cloudflareAnalyticsToken =
    process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;

  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Script id="init-lobby-theme" strategy="beforeInteractive">
          {`(function(){try{const key='hg_lobby_theme';const raw=localStorage.getItem(key);const fallback='neon-future';const valid=['neon-future','retro-pixel','apple-bubbles','graphite-sport','forest-editorial'];const themeValue=valid.includes(raw)?raw:fallback;document.documentElement.setAttribute('data-lobby-theme',themeValue);}catch(_e){document.documentElement.setAttribute('data-lobby-theme','neon-future');}})();`}
        </Script>
        <ThemeHeader />
        {children}
        <Analytics />
        {cloudflareAnalyticsToken ? (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareAnalyticsToken })}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
