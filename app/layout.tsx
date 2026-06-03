import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AgentationDevtools } from '@/app/components/agentation-devtools';
import { ThemeFooter, ThemeHeader } from '@/app/components/theme-header';
import { DEFAULT_LOBBY_THEME } from '@/lib/lobby-theme';
import './theme.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

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
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={inter.variable}
      data-lobby-theme={DEFAULT_LOBBY_THEME}
      style={{ backgroundColor: '#0c0e14', colorScheme: 'dark' }}
    >
      <body style={{ backgroundColor: '#0c0e14' }}>
        <Script id="init-lobby-theme" strategy="beforeInteractive">
          {`(function(){try{const key='hg_lobby_theme';const raw=localStorage.getItem(key);const fallback='eng-runbook';const valid=['neon-future','retro-pixel','apple-bubbles','graphite-sport','forest-editorial','eng-runbook'];const themeValue=valid.includes(raw)?raw:fallback;document.documentElement.setAttribute('data-lobby-theme',themeValue);}catch(_e){document.documentElement.setAttribute('data-lobby-theme','eng-runbook');}})();`}
        </Script>
        <ThemeHeader />
        {children}
        <ThemeFooter />
        <AgentationDevtools />
        <Analytics />
        {googleAnalyticsId ? (
          <>
            <Script
              id="ga4-script"
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}', { send_page_view: true });
              `}
            </Script>
          </>
        ) : null}
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
